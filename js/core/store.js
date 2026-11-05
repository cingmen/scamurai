// Store tunggal + persistensi localStorage (app-logic.md §1–2).
import { emit } from './events.js';
import { fnv1a } from './format.js';

const NS = 'scamurai.v1';
const SW_ACK = 'scamurai.v1.sw-ack';
export const SCHEMA_VERSION = 1;
export const STARTER_SALDO = 5_000_000;

let state = null;
let storageAvailable = true;
let persistTimer = null;

export function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    profile: { name: '', rhythm: 'normal', onboarded: false },
    settings: {
      theme: 'sumi',
      fontScale: 'normal',
      mode: 'standar',
      sfx: true,
      haptics: true,
      kenjiTips: true,
      textSpeed: 1,
    },
    dojo: { saldo: STARTER_SALDO, belt: 0 },
    progress: {},
    vn: { saves: [null, null] },
    dex: {},
    exam: { attempts: 0, best: 0, passed: false, lastPool: [] },
    certificate: { name: '', code: '', date: '', score: 0 },
    wa: { bestExitTurn: null, reported: false },
    sekolah: { classLabel: '', packagesDone: [] },
    stats: { flagsTotal: 0, flagsCorrect: 0, scenariosCompleted: 0, playTimeMs: 0 },
    meta: { lastSeen: new Date().toISOString(), swVersion: 'v1.0.0' },
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Gabungkan nilai tersimpan dengan default (array diganti, bukan digabung). */
function merge(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch === undefined ? base : patch;
  const out = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    out[key] = isPlainObject(base[key]) && isPlainObject(value) ? merge(base[key], value) : value;
  }
  return out;
}

function migrate(raw) {
  const next = { ...raw };
  if (!next.schemaVersion) next.schemaVersion = 1;
  // Tempat migrasi berantai m0→m1→…; tidak boleh menghapus data pengguna.
  if (next.schemaVersion < 1) {
    next.dojo = { saldo: next.wallet?.saldo ?? STARTER_SALDO, belt: 0 };
    delete next.wallet;
    next.schemaVersion = 1;
  }
  return next;
}

function readStorage() {
  try {
    const raw = localStorage.getItem(NS);
    if (!raw) return null;
    return merge(defaultState(), migrate(JSON.parse(raw)));
  } catch (err) {
    console.warn('[store] gagal membaca localStorage:', err);
    return null;
  }
}

function detectStorage() {
  try {
    const probe = `${NS}.probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

state = readStorage() ?? defaultState();
storageAvailable = detectStorage();
if (!storageAvailable) emit('storage:blocked', {});

function getPath(path) {
  return String(path).split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), state);
}

function setPath(path, value) {
  const keys = String(path).split('.');
  let node = state;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (!isPlainObject(node[key])) node[key] = {};
    node = node[key];
  }
  node[keys[keys.length - 1]] = value;
}

/** Ambil nilai state lewat path bertitik ('progress.task-scam.status'). */
export function get(path, fallback = undefined) {
  const value = getPath(path);
  return value === undefined ? fallback : value;
}

export function all() {
  return state;
}

/** Ubah satu nilai; emit state:change lalu simpan (debounce 300ms). */
export function set(path, value) {
  setPath(path, value);
  emit('state:change', { path, value });
  schedulePersist();
  return value;
}

/** Ubah beberapa nilai sekaligus (satu emit per path). */
export function setMany(entries) {
  for (const [path, value] of entries) {
    setPath(path, value);
    emit('state:change', { path, value });
  }
  schedulePersist();
}

/** Ubah state lewat fungsi, untuk perubahan berlapis. */
export function update(path, updater) {
  const current = get(path);
  return set(path, updater(current));
}

function schedulePersist() {
  if (!storageAvailable) return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 300);
}

export function persist() {
  if (!storageAvailable) return false;
  clearTimeout(persistTimer);
  try {
    localStorage.setItem(NS, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('[store] gagal menyimpan:', err);
    storageAvailable = false;
    emit('storage:blocked', { reason: err.message });
    return false;
  }
}

export function storageOk() {
  return storageAvailable;
}

/** Ganti seluruh state (impor) dengan validasi ringan. */
export function replace(nextState) {
  if (!isPlainObject(nextState)) throw new Error('State tidak valid.');
  if (Number(nextState.schemaVersion) > SCHEMA_VERSION) {
    throw new Error('Kode progres dari versi Scamurai yang lebih baru.');
  }
  state = merge(defaultState(), migrate(nextState));
  emit('state:change', { path: '*', value: state });
  schedulePersist();
  return state;
}

export function resetProgress() {
  const fresh = defaultState();
  state.progress = {};
  state.dex = {};
  state.exam = fresh.exam;
  state.certificate = fresh.certificate;
  state.wa = fresh.wa;
  state.vn = fresh.vn;
  state.sekolah = fresh.sekolah;
  state.dojo = fresh.dojo;
  state.stats = fresh.stats;
  emit('state:change', { path: '*', value: state });
  persist();
}

export function resetAll() {
  state = defaultState();
  emit('state:change', { path: '*', value: state });
  persist();
}

/* ——— Ekspor / impor kode progres ——— */

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function fromBase64(code) {
  const binary = atob(code);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function exportCode() {
  const payload = toBase64(JSON.stringify(state));
  const sum = fnv1a(payload).toString(16).padStart(8, '0');
  return `SCR1.${sum}.${payload}`;
}

export function importCode(code) {
  const cleaned = String(code || '').replace(/\s+/g, '');
  const parts = cleaned.split('.');
  if (parts.length !== 3 || parts[0] !== 'SCR1') throw new Error('Format kode progres tidak dikenali.');
  const [, sum, payload] = parts;
  if (fnv1a(payload).toString(16).padStart(8, '0') !== sum) {
    throw new Error('Kode progres rusak (checksum tidak cocok).');
  }
  const parsed = JSON.parse(fromBase64(payload));
  replace(parsed);
  persist();
  return state;
}

/* ——— Turunan: sabuk & ringkasan ——— */

export function belt() {
  const done = Object.values(state.progress).filter((p) => p.status === 'selesai');
  const debrief = done.filter((p) => p.debriefDone).length;
  const n = done.length;
  if (n >= 8 && state.exam.passed && debrief >= 8) return 5;
  if (n >= 7 && state.exam.attempts > 0) return 4;
  if (n >= 6 && debrief >= 4) return 3;
  if (n >= 4) return 2;
  if (n >= 2) return 1;
  return 0;
}

export const BELTS = [
  { id: 'putih', name: 'Putih', color: '#F2EEE7', ink: '#1B1820' },
  { id: 'kuning', name: 'Kuning', color: '#D9A441', ink: '#1B1820' },
  { id: 'hijau', name: 'Hijau', color: '#4FA97F', ink: '#101A15' },
  { id: 'biru', name: 'Biru', color: '#6C93C4', ink: '#101722' },
  { id: 'merah', name: 'Merah', color: '#C93A3A', ink: '#FFF5EE' },
  { id: 'hitam', name: 'Hitam', color: '#221E27', ink: '#F2EEE7' },
];

export function beltInfo() {
  const level = belt();
  return { level, ...BELTS[level] };
}

/** Ritme efektif: Mode Lansia selalu tanpa timer. */
export function rhythm() {
  if (get('settings.mode', 'standar') === 'lansia') return 'santai';
  return get('profile.rhythm', 'normal');
}

export function timerFactor() {
  const mode = rhythm();
  if (mode === 'santai') return 0;
  if (mode === 'nyata') return 1;
  return 1.5;
}

export function swAck(version) {
  try {
    localStorage.setItem(SW_ACK, version);
  } catch { /* abaikan */ }
}

export function getSwAck() {
  try {
    return localStorage.getItem(SW_ACK);
  } catch {
    return null;
  }
}

// Simpan saat halaman ditutup.
window.addEventListener('pagehide', persist);
