// Store tunggal + persistensi localStorage (app-logic.md §1–2).
import { emit } from './events.js';
import { fnv1a } from './format.js';

const NS = 'scamurai.v1';
const SW_ACK = 'scamurai.v1.sw-ack';
const BACKUP_NS = 'scamurai.v1.backup';
export const SCHEMA_VERSION = 1;
export const STARTER_SALDO = 5_000_000;

let state = null;
let storageAvailable = true;
let persistTimer = null;
let storageNotice = null;
let writeProtected = false;

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
      reminder: { enabled: false, intervalDays: 7 },
    },
    dojo: { saldo: STARTER_SALDO, belt: 0 },
    progress: {},
    vn: { saves: [null, null] },
    dex: {},
    exam: { attempts: 0, best: 0, passed: false, lastPool: [], passScore: 80 },
    certificate: { name: '', code: '', date: '', score: 0 },
    wa: { bestExitTurn: null, reported: false },
    sekolah: {
      classLabel: '',
      packagesDone: [],
      quiz: { attempts: 0, best: 0, passed: false, lastPool: [] },
    },
    stats: { flagsTotal: 0, flagsCorrect: 0, scenariosCompleted: 0, playTimeMs: 0 },
    meta: { lastSeen: new Date().toISOString(), swVersion: 'v1.0.0' },
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function defaultScenarioProgress() {
  return {
    status: 'belum',
    bestEnding: null,
    bestRank: -1,
    endingsSeen: [],
    flags: { found: 0, missed: 0 },
    debriefDone: false,
    lastStep: 0,
    briefed: false,
    recovered: 0,
    loss: 0,
    updatedAt: null,
  };
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
  if (!isPlainObject(raw)) throw new Error('Data progres bukan objek.');
  let version = Number(raw.schemaVersion);
  if (!Number.isFinite(version) || version < 0) version = 0;
  const next = { ...raw };
  // Tempat migrasi berantai m0→m1→…; tidak boleh menghapus data pengguna.
  if (version < 1) {
    const wallet = isPlainObject(raw.wallet) ? raw.wallet : {};
    const dojo = isPlainObject(raw.dojo) ? raw.dojo : {};
    const walletSaldo = Number(wallet.saldo);
    const dojoSaldo = Number(dojo.saldo);
    next.dojo = {
      ...dojo,
      saldo: Number.isFinite(walletSaldo) ? walletSaldo : (Number.isFinite(dojoSaldo) ? dojoSaldo : STARTER_SALDO),
      belt: Number.isFinite(Number(dojo.belt)) ? Number(dojo.belt) : 0,
    };
    delete next.wallet;
    version = 1;
  }
  next.schemaVersion = version;
  return next;
}

function normalizeState(raw) {
  const base = defaultState();
  const migrated = migrate(raw);
  const next = merge(base, migrated);
  let repaired = false;

  for (const key of ['profile', 'settings', 'dojo', 'progress', 'vn', 'dex', 'exam', 'certificate', 'wa', 'sekolah', 'stats', 'meta']) {
    if (!isPlainObject(next[key])) {
      next[key] = base[key];
      repaired = true;
    }
  }

  if (!isPlainObject(next.settings.reminder)) {
    next.settings.reminder = { ...base.settings.reminder };
    repaired = true;
  } else {
    if (typeof next.settings.reminder.enabled !== 'boolean') {
      next.settings.reminder.enabled = base.settings.reminder.enabled;
      repaired = true;
    }
    const intervalDays = Number(next.settings.reminder.intervalDays);
    if (Number.isFinite(intervalDays) && intervalDays >= 1 && intervalDays <= 365) {
      next.settings.reminder.intervalDays = Math.round(intervalDays);
    } else {
      next.settings.reminder.intervalDays = base.settings.reminder.intervalDays;
      repaired = true;
    }
  }
  if (!Array.isArray(next.vn.saves)) {
    next.vn.saves = [...base.vn.saves];
    repaired = true;
  } else if (next.vn.saves.length < 2) {
    next.vn.saves = [...next.vn.saves, ...Array(2 - next.vn.saves.length).fill(null)];
  }
  if (!Array.isArray(next.exam.lastPool)) {
    next.exam.lastPool = [];
    repaired = true;
  }
  const passScore = Number(next.exam.passScore);
  if (Number.isFinite(passScore) && passScore > 0 && passScore <= 100) {
    next.exam.passScore = passScore;
  } else {
    next.exam.passScore = base.exam.passScore;
    repaired = true;
  }
  if (!Array.isArray(next.sekolah.packagesDone)) {
    next.sekolah.packagesDone = [];
    repaired = true;
  }
  if (!isPlainObject(next.sekolah.quiz)) {
    next.sekolah.quiz = { ...base.sekolah.quiz };
    repaired = true;
  } else if (!Array.isArray(next.sekolah.quiz.lastPool)) {
    next.sekolah.quiz.lastPool = [];
    repaired = true;
  }

  const saldo = Number(next.dojo.saldo);
  if (Number.isFinite(saldo)) next.dojo.saldo = saldo;
  else {
    next.dojo.saldo = base.dojo.saldo;
    repaired = true;
  }
  const belt = Number(next.dojo.belt);
  if (Number.isFinite(belt)) next.dojo.belt = belt;
  else {
    next.dojo.belt = base.dojo.belt;
    repaired = true;
  }

  const progress = {};
  for (const [id, entry] of Object.entries(next.progress)) {
    if (!isPlainObject(entry)) {
      progress[id] = defaultScenarioProgress();
      repaired = true;
      continue;
    }
    const item = merge(defaultScenarioProgress(), entry);
    if (!isPlainObject(item.flags)) {
      item.flags = { found: 0, missed: 0 };
      repaired = true;
    } else {
      item.flags = merge({ found: 0, missed: 0 }, item.flags);
    }
    if (!Array.isArray(item.endingsSeen)) {
      item.endingsSeen = [];
      repaired = true;
    }
    progress[id] = item;
  }
  next.progress = progress;

  return {
    state: next,
    repaired,
    migrated: Number(raw.schemaVersion) !== Number(next.schemaVersion),
  };
}

function isBackupRecord(value) {
  return isPlainObject(value)
    && typeof value.raw === 'string'
    && typeof value.reason === 'string'
    && typeof value.savedAt === 'string';
}

function readBackupItems() {
  try {
    const raw = localStorage.getItem(BACKUP_NS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.items)) return parsed.items.filter(isBackupRecord);
    if (isBackupRecord(parsed)) return [parsed];
  } catch (err) {
    console.warn('[store] gagal membaca cadangan:', err);
  }
  return [];
}

function backupRaw(raw, reason) {
  const record = { raw: String(raw), reason, savedAt: new Date().toISOString() };
  try {
    const items = readBackupItems();
    const duplicate = items.findIndex((item) => item.raw === record.raw && item.reason === reason);
    if (duplicate === -1) items.unshift(record);
    else items[duplicate] = record;
    localStorage.setItem(BACKUP_NS, JSON.stringify({ items }));
    return record;
  } catch (err) {
    console.warn('[store] gagal mencadangkan data lama:', err);
    return null;
  }
}

export function getBackups() {
  return readBackupItems();
}

export function storageWriteProtected() {
  return writeProtected;
}

function readStorage() {
  let raw;
  try {
    raw = localStorage.getItem(NS);
  } catch (err) {
    console.warn('[store] gagal mengakses localStorage:', err);
    return null;
  }
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const backup = backupRaw(raw, 'parse');
    storageNotice = { kind: 'corrupt', reason: 'parse', backupSaved: Boolean(backup) };
    console.warn('[store] data lama rusak; cadangan mentah disimpan:', err);
    return null;
  }

  const storedVersion = Number(parsed?.schemaVersion);
  if (Number.isFinite(storedVersion) && storedVersion > SCHEMA_VERSION) {
    const backup = backupRaw(raw, 'future');
    writeProtected = true;
    storageNotice = { kind: 'future', version: storedVersion, backupSaved: Boolean(backup) };
    console.warn(`[store] data skema ${storedVersion} lebih baru dari ${SCHEMA_VERSION}; penyimpanan dilindungi.`);
    return null;
  }

  try {
    const result = normalizeState(parsed);
    if (result.repaired) {
      const backup = backupRaw(raw, 'normalize');
      storageNotice = { kind: 'repaired', reason: 'normalize', backupSaved: Boolean(backup) };
    } else if (result.migrated) {
      backupRaw(raw, 'migration');
    }
    return result.state;
  } catch (err) {
    const backup = backupRaw(raw, 'shape');
    storageNotice = { kind: 'corrupt', reason: 'shape', backupSaved: Boolean(backup) };
    console.warn('[store] struktur data lama tidak dikenali; cadangan mentah disimpan:', err);
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
  if (!storageAvailable || writeProtected) return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 300);
}

export function persist() {
  if (!storageAvailable || writeProtected) return false;
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

/** Ambil sekali peringatan pemulihan data saat boot; kosong setelah dibaca. */
export function consumeStorageNotice() {
  const notice = storageNotice;
  storageNotice = null;
  return notice;
}

/** Ganti seluruh state (impor) dengan validasi ringan. */
export function replace(nextState) {
  if (!isPlainObject(nextState)) throw new Error('State tidak valid.');
  if (Number(nextState.schemaVersion) > SCHEMA_VERSION) {
    throw new Error('Kode progres dari versi Scamurai yang lebih baru.');
  }
  const result = normalizeState(nextState);
  state = result.state;
  writeProtected = false;
  emit('state:change', { path: '*', value: state });
  schedulePersist();
  return state;
}

export function resetProgress() {
  const fresh = defaultState();
  writeProtected = false;
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
  storageNotice = null;
  writeProtected = false;
  try {
    localStorage.removeItem(BACKUP_NS);
  } catch { /* penyimpanan mungkin diblokir */ }
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

function checksum(payload) {
  return fnv1a(payload).toString(16).padStart(8, '0');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function timeValue(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function moreProgress(a, b) {
  const rank = (value) => (value?.status === 'selesai' ? 3 : value?.status === 'mulai' ? 2 : 1);
  const score = (value) => [
    rank(value),
    value?.debriefDone ? 1 : 0,
    Array.isArray(value?.endingsSeen) ? value.endingsSeen.length : 0,
    Number(value?.bestRank) || -1,
    Number(value?.flags?.found) || 0,
    Number(value?.lastStep) || 0,
    timeValue(value?.updatedAt),
  ];
  const left = score(a);
  const right = score(b);
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? a : b;
  }
  return a;
}

function mergeProgress(left = {}, right = {}) {
  const a = isPlainObject(left) ? left : {};
  const b = isPlainObject(right) ? right : {};
  const winner = moreProgress(a, b);
  const status = (a.status === 'selesai' || b.status === 'selesai')
    ? 'selesai'
    : (a.status === 'mulai' || b.status === 'mulai' ? 'mulai' : 'belum');
  const endings = [...new Set([
    ...(Array.isArray(a.endingsSeen) ? a.endingsSeen : []),
    ...(Array.isArray(b.endingsSeen) ? b.endingsSeen : []),
  ])];
  return {
    ...clone(winner),
    status,
    debriefDone: Boolean(a.debriefDone || b.debriefDone),
    endingsSeen: endings,
    flags: {
      found: Math.max(Number(a.flags?.found) || 0, Number(b.flags?.found) || 0),
      missed: Math.max(Number(a.flags?.missed) || 0, Number(b.flags?.missed) || 0),
    },
    bestRank: Math.max(Number(a.bestRank) || -1, Number(b.bestRank) || -1),
    lastStep: Math.max(Number(a.lastStep) || 0, Number(b.lastStep) || 0),
    updatedAt: timeValue(a.updatedAt) >= timeValue(b.updatedAt) ? a.updatedAt : b.updatedAt,
  };
}

function mergeDex(left = {}, right = {}) {
  const a = isPlainObject(left) ? left : {};
  const b = isPlainObject(right) ? right : {};
  const out = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const first = a[id] || {};
    const second = b[id] || {};
    out[id] = {
      ...first,
      ...second,
      unlocked: Boolean(first.unlocked || second.unlocked),
      variants: [...new Set([
        ...(Array.isArray(first.variants) ? first.variants : []),
        ...(Array.isArray(second.variants) ? second.variants : []),
      ])],
    };
  }
  return out;
}

function mergeQuiz(left = {}, right = {}) {
  const a = isPlainObject(left) ? left : {};
  const b = isPlainObject(right) ? right : {};
  const better = (Number(b.best) || 0) > (Number(a.best) || 0) ? b : a;
  return {
    ...a,
    attempts: Math.max(Number(a.attempts) || 0, Number(b.attempts) || 0),
    best: Math.max(Number(a.best) || 0, Number(b.best) || 0),
    passed: Boolean(a.passed || b.passed),
    lastPool: Array.isArray(better.lastPool) ? [...better.lastPool] : [],
  };
}

function mergeStates(current, incoming) {
  const local = clone(current);
  const remote = isPlainObject(incoming) ? incoming : {};
  const progress = {};
  for (const id of new Set([...Object.keys(local.progress || {}), ...Object.keys(remote.progress || {})])) {
    progress[id] = mergeProgress(local.progress?.[id], remote.progress?.[id]);
  }
  const localBest = Number(local.exam?.best) || 0;
  const remoteBest = Number(remote.exam?.best) || 0;
  const examWinner = remoteBest > localBest ? remote.exam : local.exam;
  const localCertScore = Number(local.certificate?.score) || 0;
  const remoteCertScore = Number(remote.certificate?.score) || 0;
  const preferRemoteCertificate = remoteCertScore > localCertScore
    || (!local.certificate?.code && Boolean(remote.certificate?.code));
  const certificate = preferRemoteCertificate
    ? { ...local.certificate, ...remote.certificate }
    : { ...remote.certificate, ...local.certificate };
  return {
    ...local,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timeValue(local.createdAt) && timeValue(remote.createdAt)
      ? (timeValue(remote.createdAt) < timeValue(local.createdAt) ? remote.createdAt : local.createdAt)
      : local.createdAt || remote.createdAt,
    profile: {
      ...local.profile,
      name: local.profile?.name || remote.profile?.name || '',
      onboarded: Boolean(local.profile?.onboarded || remote.profile?.onboarded),
    },
    progress,
    dex: mergeDex(local.dex, remote.dex),
    exam: {
      ...local.exam,
      attempts: Math.max(Number(local.exam?.attempts) || 0, Number(remote.exam?.attempts) || 0),
      best: Math.max(localBest, remoteBest),
      passed: Boolean(local.exam?.passed || remote.exam?.passed),
      lastPool: Array.isArray(examWinner?.lastPool) ? [...examWinner.lastPool] : [],
    },
    certificate,
    sekolah: {
      ...local.sekolah,
      classLabel: local.sekolah?.classLabel || remote.sekolah?.classLabel || '',
      packagesDone: [...new Set([
        ...(Array.isArray(local.sekolah?.packagesDone) ? local.sekolah.packagesDone : []),
        ...(Array.isArray(remote.sekolah?.packagesDone) ? remote.sekolah.packagesDone : []),
      ])],
      quiz: mergeQuiz(local.sekolah?.quiz, remote.sekolah?.quiz),
    },
    stats: {
      flagsTotal: Math.max(Number(local.stats?.flagsTotal) || 0, Number(remote.stats?.flagsTotal) || 0),
      flagsCorrect: Math.max(Number(local.stats?.flagsCorrect) || 0, Number(remote.stats?.flagsCorrect) || 0),
      scenariosCompleted: Math.max(Number(local.stats?.scenariosCompleted) || 0, Number(remote.stats?.scenariosCompleted) || 0),
      playTimeMs: Math.max(Number(local.stats?.playTimeMs) || 0, Number(remote.stats?.playTimeMs) || 0),
    },
    meta: {
      ...local.meta,
      lastSeen: timeValue(remote.meta?.lastSeen) > timeValue(local.meta?.lastSeen)
        ? remote.meta.lastSeen
        : local.meta?.lastSeen,
    },
  };
}

export function exportCode({ legacy = false } = {}) {
  if (legacy) {
    const payload = toBase64(JSON.stringify(state));
    return `SCR1.${checksum(payload)}.${payload}`;
  }
  const envelope = {
    format: 'scamurai-progress',
    version: 2,
    exportedAt: new Date().toISOString(),
    schemaVersion: state.schemaVersion,
    state,
  };
  const payload = toBase64(JSON.stringify(envelope));
  return `SCR2.${checksum(payload)}.${payload}`;
}

function decodeCode(code) {
  const cleaned = String(code || '').replace(/\s+/g, '');
  const parts = cleaned.split('.');
  if (parts.length !== 3 || !['SCR1', 'SCR2'].includes(parts[0])) {
    throw new Error('Format kode progres tidak dikenali.');
  }
  const [, sum, payload] = parts;
  if (checksum(payload) !== sum) {
    throw new Error('Kode progres rusak (checksum tidak cocok).');
  }
  let parsed;
  try {
    parsed = JSON.parse(fromBase64(payload));
  } catch {
    throw new Error('Kode progres rusak: isi tidak bisa dibaca.');
  }
  if (parts[0] === 'SCR1') return { state: parsed, legacy: true };
  if (!isPlainObject(parsed) || parsed.format !== 'scamurai-progress' || parsed.version !== 2 || !isPlainObject(parsed.state)) {
    throw new Error('Kode SCR2 tidak dikenali.');
  }
  return { state: parsed.state, legacy: false, exportedAt: parsed.exportedAt };
}

export function importCode(code, { merge = false } = {}) {
  const parsed = decodeCode(code);
  replace(merge ? mergeStates(state, parsed.state) : parsed.state);
  persist();
  return state;
}

/** Pulihkan satu record backup; validasi selesai sebelum state disentuh. */
export function restoreBackup(backup) {
  if (!isBackupRecord(backup)) throw new Error('Backup tidak valid.');
  let parsed;
  try {
    parsed = JSON.parse(backup.raw);
  } catch {
    throw new Error('Backup rusak: JSON tidak bisa dibaca.');
  }
  if (!isPlainObject(parsed)) throw new Error('Backup rusak: payload bukan objek.');
  const version = Number(parsed.schemaVersion);
  if (Number.isFinite(version) && version > SCHEMA_VERSION) {
    throw new Error('Backup dibuat oleh Scamurai versi lebih baru; unduh dan buka dengan versi tersebut.');
  }

  let result;
  try {
    result = normalizeState(parsed);
  } catch {
    throw new Error('Backup rusak: struktur data tidak valid.');
  }
  if (result.repaired) throw new Error('Backup berisi data yang perlu diperbaiki; state aktif tidak diubah.');

  state = result.state;
  writeProtected = false;
  emit('state:change', { path: '*', value: state });
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
