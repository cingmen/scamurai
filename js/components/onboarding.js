// Intro 3 layar + kalibrasi ritme (PRD §7).
import { h, replace } from '../core/dom.js';
import { set } from '../core/store.js';

const STEPS = [
  {
    title: 'Selamat datang di dojo',
    body: 'Aku Kenji, pemandu dojo ini. Di sini kamu berlatih mengenali penipuan — bukan dengan membaca tips, tapi dengan mengalaminya sendiri di dalam ponsel tiruan.',
    art: 'kenji',
  },
  {
    title: 'Semua di sini palsu',
    body: 'Semua uang, nomor rekening, nama, dan aplikasi adalah fiktif. Tidak ada data yang dikirim ke mana pun. Progres hanya tersimpan di perangkatmu dan bisa kamu hapus kapan saja.',
    art: 'shield',
  },
  {
    title: 'Cara bermain',
    body: 'Baca pesan dengan tenang. Ketuk elemen yang mencurigakan (red flag) sebelum mengambil keputusan. Kalau kamu tertipu, tidak apa-apa — justru di situ pelajarannya. Pilih ritmemu:',
    art: 'flag',
  },
];

export function showOnboarding() {
  if (document.querySelector('[data-onboarding]')) return Promise.resolve();

  return new Promise((resolve) => {
    let step = 0;
    const card = h('div', { class: 'c-modal__card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'onb-title' });
    const overlay = h('div', { class: 'c-modal', dataset: { onboarding: '1' } }, card);
    document.getElementById('modal-root').appendChild(overlay);

    function finish(rhythm) {
      set('profile.rhythm', rhythm);
      set('profile.onboarded', true);
      overlay.remove();
      resolve(true);
    }

    function render() {
      const current = STEPS[step];
      const isLast = step === STEPS.length - 1;
      replace(card,
        h('div', { class: 'u-center' },
          h('img', {
            src: './assets/img/mascot/kenji.svg',
            alt: '',
            width: '112',
            height: '112',
            style: { margin: '0 auto 8px' },
          }),
        ),
        h('p', { class: 'c-hero__eyebrow', style: { display: 'block', textAlign: 'center' } }, `Langkah ${step + 1} dari ${STEPS.length}`),
        h('h2', { id: 'onb-title', class: 'u-center u-mt-2' }, current.title),
        h('p', { class: 'u-mt-3' }, current.body),
        isLast
          ? h('div', { class: 'u-col u-mt-4' },
            h('button', { class: 'c-btn c-btn--primary c-btn--block', onclick: () => finish('normal') }, 'Normal — timer longgar'),
            h('button', { class: 'c-btn c-btn--ghost c-btn--block', onclick: () => finish('santai') }, 'Santai — tanpa timer'),
            h('button', { class: 'c-btn c-btn--ghost c-btn--block', onclick: () => finish('nyata') }, 'Nyata — timer menekan'),
            h('p', { class: 'u-small u-faint u-center' }, 'Bisa diubah kapan saja di Pengaturan.'),
          )
          : h('div', { class: 'u-row u-mt-5', style: { justifyContent: 'space-between' } },
            h('button', { class: 'c-btn c-btn--quiet', onclick: () => finish('normal') }, 'Lewati'),
            h('button', { class: 'c-btn c-btn--primary', onclick: () => { step += 1; render(); } }, 'Lanjut'),
          ),
      );
      card.querySelector('button')?.focus();
    }

    render();
  });
}
