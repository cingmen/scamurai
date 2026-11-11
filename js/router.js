// Hash router (app-logic.md §3). Setiap layar mengekspor render(root, params)
// dan boleh mengembalikan fungsi cleanup.
import { emit } from './core/events.js';
import { get, all } from './core/store.js';
import { showToast } from './components/toast.js';
import { closeModal } from './components/modal.js';
import { h, replace } from './core/dom.js';

const ROUTES = [
  { name: 'home', pattern: /^\/?$/, load: () => import('./screens/home.js') },
  { name: 'skenario', pattern: /^\/skenario\/?$/, load: () => import('./screens/scenario-select.js') },
  { name: 'brief', pattern: /^\/skenario\/([\w-]+)\/?$/, load: () => import('./screens/scenario-brief.js') },
  {
    name: 'main',
    pattern: /^\/main\/([\w-]+)\/?$/,
    load: () => import('./screens/sim-player.js'),
    guard: ({ params }) => {
      const id = params[0];
      const p = get(`progress.${id}`);
      return Boolean(p?.briefed || p?.status);
    },
    guardFail: { to: '#/skenario', message: 'Buka pengantar skenario dulu, ya.' },
  },
  {
    name: 'vn',
    pattern: /^\/vn\/([\w-]+)\/?$/,
    load: () => import('./screens/vn-player.js'),
    guard: ({ params }) => params[0] === 'love-scam',
    guardFail: { to: '#/skenario', message: 'Cerita itu belum tersedia.' },
  },
  { name: 'grup', pattern: /^\/grup\/?$/, load: () => import('./screens/minigame-wa.js') },
  {
    name: 'debrief',
    pattern: /^\/debrief\/([\w-]+)\/?$/,
    load: () => import('./screens/debrief.js'),
    guard: ({ params }) => Boolean(get(`progress.${params[0]}`)),
    guardFail: { to: '#/skenario', message: 'Mainkan skenarionya dulu untuk membuka debrief.' },
  },
  { name: 'scamdex', pattern: /^\/scamdex\/?$/, load: () => import('./screens/scamdex.js') },
  {
    name: 'ujian',
    pattern: /^\/ujian\/?$/,
    load: () => import('./screens/exam.js'),
    guard: () => completedCount() >= 4,
    guardFail: { to: '#/skenario', message: 'Selesaikan 4 skenario dulu untuk membuka ujian.' },
  },
  {
    name: 'sertifikat',
    pattern: /^\/sertifikat\/?$/,
    load: () => import('./screens/certificate.js'),
    guard: () => Boolean(get('exam.passed')),
    guardFail: { to: '#/ujian', message: 'Lulus ujian akhir dulu untuk membuat sertifikat.' },
  },
  { name: 'bantuan', pattern: /^\/bantuan\/?$/, load: () => import('./screens/bantuan.js') },
  { name: 'tentang', pattern: /^\/tentang\/?$/, load: () => import('./screens/about.js') },
  { name: 'pengaturan', pattern: /^\/pengaturan\/?$/, load: () => import('./screens/settings.js') },
  { name: 'sekolah', pattern: /^\/sekolah\/?$/, load: () => import('./screens/sekolah.js') },
  { name: 'guru', pattern: /^\/sekolah\/guru\/?$/, load: () => import('./screens/sekolah.js'), params: ['guru'] },
  { name: 'latihan', pattern: /^\/latihan\/?$/, load: () => import('./screens/latihan.js') },
];

const IMMERSIVE = new Set(['main', 'vn', 'grup']);
const NAV_MAP = {
  home: '#/',
  skenario: '#/skenario',
  brief: '#/skenario',
  main: '#/skenario',
  vn: '#/skenario',
  debrief: '#/skenario',
  scamdex: '#/scamdex',
  grup: '#/grup',
  ujian: '#/ujian',
  sertifikat: '#/ujian',
  bantuan: '#/bantuan',
  tentang: '#/tentang',
  pengaturan: '#/pengaturan',
  sekolah: '#/pengaturan',
  guru: '#/pengaturan',
};

let appEl = null;
let cleanup = null;
let currentName = null;
let navigationQueue = Promise.resolve();

function completedCount() {
  return Object.values(all().progress || {}).filter((p) => p.status === 'selesai').length;
}

function staticHomeUsable() {
  if (!appEl?.querySelector('[data-prerendered-home]')) return false;
  const state = all();
  return Object.keys(state.progress || {}).length === 0
    && Object.keys(state.dex || {}).length === 0
    && !state.exam?.passed
    && Number(state.dojo?.saldo) === 5_000_000;
}

function currentPath() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function updateNav(name) {
  const target = NAV_MAP[name];
  document.querySelectorAll('#main-nav a').forEach((link) => {
    if (target && link.getAttribute('href') === target) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function setImmersive(name) {
  document.body.classList.toggle('is-immersive', IMMERSIVE.has(name));
}

function renderFatal(error) {
  replace(
    appEl,
    h('div', { class: 'c-error' },
      h('h2', null, 'Dojo sedang tidak bisa dibuka'),
      h('p', { class: 'u-muted' }, error?.message || 'Terjadi kesalahan tak terduga.'),
      h('p', { class: 'u-mt-4 u-row', style: { justifyContent: 'center' } },
        h('button', { class: 'c-btn c-btn--primary', onclick: () => navigate(true) }, 'Coba lagi'),
        h('a', { class: 'c-btn c-btn--ghost', href: '#/bantuan' }, 'Pusat Bantuan'),
      ),
    ),
  );
}

// Serialkan navigasi agar render awal saat boot tidak berlomba dengan klik/hash
// berikutnya. Navigasi terbaru tetap menjadi layar terakhir.
function navigate(force = false) {
  const run = () => performNavigate(force);
  navigationQueue = navigationQueue.then(run, run);
  return navigationQueue;
}

async function performNavigate(force = false) {
  const path = currentPath();
  const matched = ROUTES.find((route) => route.pattern.test(path));

  if (!matched) {
    showToast('Halaman tidak ditemukan.');
    if (window.location.hash !== '#/') window.location.hash = '#/';
    return;
  }

  const exec = matched.pattern.exec(path);
  const params = matched.params || (exec ? exec.slice(1) : []);

  if (matched.guard && !matched.guard({ params, state: all() })) {
    const fail = matched.guardFail || { to: '#/', message: 'Halaman belum terbuka.' };
    showToast(fail.message);
    if (window.location.hash !== fail.to) window.location.hash = fail.to;
    return;
  }

  if (!force && matched.name === currentName && !matched.allowRepeat) {
    // hashchange dengan rute sama tetap dirender ulang bila data berubah,
    // kecuali sedang di layar yang menangani sendiri.
  }

  if (matched.name === 'home' && !force && (currentName === null || currentName === 'home') && staticHomeUsable()) {
    currentName = 'home';
    setImmersive(false);
    updateNav('home');
    emit('route:change', { from: null, to: 'home', path });
    return;
  }

  closeModal({ silent: true });

  try {
    if (typeof cleanup === 'function') cleanup();
  } catch (err) {
    console.warn('[router] cleanup gagal:', err);
  }
  cleanup = null;

  const previous = currentName;
  currentName = matched.name;
  setImmersive(matched.name);
  updateNav(matched.name);
  window.scrollTo({ top: 0, behavior: 'auto' });

  try {
    const module = await matched.load();
    const result = await module.render(appEl, { params, path });
    cleanup = typeof result === 'function' ? result : null;
    emit('route:change', { from: previous, to: matched.name, path });
  } catch (err) {
    console.error('[router] layar gagal dimuat:', err);
    renderFatal(err);
  }
}

export function startRouter() {
  appEl = document.getElementById('app');
  if (!appEl) throw new Error('Elemen #app tidak ditemukan.');
  if (!window.location.hash) window.location.replace('#/');
  window.addEventListener('hashchange', () => navigate());
  return navigate();
}

export function go(path) {
  window.location.hash = path;
}

export function currentRoute() {
  return currentName;
}
