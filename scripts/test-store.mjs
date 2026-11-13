// Uji persistensi: migrasi data lama, data korup, dan normalisasi field.
import assert from 'node:assert/strict';

const NS = 'scamurai.v1';
const BACKUP = 'scamurai.v1.backup';
let seq = 0;

function makeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
    clear() { data.clear(); },
  };
}

async function importStore(storage) {
  globalThis.localStorage = storage;
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
  };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const store = await import(`../js/core/store.js?case=${seq++}`);
    return { store, storage };
  } finally {
    console.warn = originalWarn;
  }
}

async function loadStore(seed) {
  return importStore(makeStorage({ [NS]: seed }));
}

function backupItems(storage) {
  const raw = storage.getItem(BACKUP);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed?.items)) return parsed.items;
  return parsed?.raw ? [parsed] : [];
}

function backupRaw(storage) {
  return backupItems(storage)[0] || null;
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('migrasi wallet tanpa schemaVersion mempertahankan saldo', async () => {
  const raw = JSON.stringify({ profile: { name: 'Lama' }, wallet: { saldo: 1_234_567 } });
  const { store, storage } = await loadStore(raw);
  assert.equal(store.all().schemaVersion, 1);
  assert.equal(store.all().dojo.saldo, 1_234_567);
  assert.equal('wallet' in store.all(), false);
  assert.equal(store.all().profile.name, 'Lama');
  const backup = backupRaw(storage);
  assert.ok(backup, 'payload migrasi harus dicadangkan sebelum diubah');
  assert.match(backup.raw, /wallet/);
});

test('JSON rusak dicadangkan dan aplikasi memakai state aman', async () => {
  const raw = '{"profile":{"name":"Rani"';
  const { store, storage } = await loadStore(raw);
  assert.equal(store.all().schemaVersion, 1);
  assert.equal(store.all().dojo.saldo, 5_000_000);
  const backup = backupRaw(storage);
  assert.ok(backup, 'payload rusak harus dicadangkan');
  assert.equal(backup.raw, raw);
  assert.equal(typeof store.consumeStorageNotice, 'function');
  assert.ok(store.consumeStorageNotice());
});

test('tipe field rusak dinormalkan tanpa menghapus progres valid', async () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    profile: { name: 'Budi', rhythm: 'normal' },
    settings: null,
    progress: { 'task-scam': { status: 'selesai', debriefDone: true } },
    vn: { saves: null },
    dojo: { saldo: 'rusak' },
  });
  const { store, storage } = await loadStore(raw);
  const state = store.all();
  assert.equal(typeof state.settings, 'object');
  assert.equal(state.settings.mode, 'standar');
  assert.equal(state.progress['task-scam'].status, 'selesai');
  assert.equal(state.progress['task-scam'].debriefDone, true);
  assert.deepEqual(state.vn.saves, [null, null]);
  assert.equal(state.dojo.saldo, 5_000_000);
  assert.ok(backupRaw(storage), 'data yang direparasi harus dicadangkan');
});

test('entri progres lama yang kehilangan field dilengkapi', async () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    progress: { 'bank-otp': { status: 'selesai' } },
  });
  const { store } = await loadStore(raw);
  const entry = store.all().progress['bank-otp'];
  assert.equal(entry.status, 'selesai');
  assert.equal(entry.debriefDone, false);
  assert.equal(entry.lastStep, 0);
  assert.deepEqual(entry.endingsSeen, []);
  assert.deepEqual(entry.flags, { found: 0, missed: 0 });
});

test('state parsial yang valid tidak memicu cadangan', async () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    profile: { name: 'Sari' },
    progress: { 'task-scam': { status: 'selesai', debriefDone: true } },
  });
  const { store, storage } = await loadStore(raw);
  assert.equal(store.all().profile.name, 'Sari');
  assert.equal(store.all().settings.mode, 'standar');
  assert.equal(store.all().progress['task-scam'].status, 'selesai');
  assert.equal(storage.getItem(BACKUP), null);
});

test('skema lebih baru dilindungi dan payload asli tidak pernah ditimpa', async () => {
  const raw = JSON.stringify({
    schemaVersion: 2,
    futureOnly: { keep: true },
    profile: { name: 'Masa Depan', onboarded: true },
    dojo: { saldo: 999 },
  });
  const { store, storage } = await loadStore(raw);
  assert.equal(store.storageWriteProtected(), true);
  assert.equal(store.all().schemaVersion, 1);
  const notice = store.consumeStorageNotice();
  assert.equal(notice.kind, 'future');
  assert.equal(notice.version, 2);
  const backups = store.getBackups();
  assert.equal(backups[0].reason, 'future');
  assert.equal(backups[0].raw, raw);
  store.set('profile.onboarded', true);
  assert.equal(store.persist(), false);
  assert.equal(storage.getItem(NS), raw, 'payload skema baru tidak boleh ditimpa');

  const second = await importStore(storage);
  assert.equal(second.store.storageWriteProtected(), true);
  assert.equal(storage.getItem(NS), raw);
  assert.equal(second.store.getBackups().filter((item) => item.reason === 'future').length, 1);
});

test('backup valid bisa dipulihkan; backup korup/future ditolak tanpa mengubah state', async () => {
  const activeRaw = JSON.stringify({
    schemaVersion: 1,
    profile: { name: 'Aktif', onboarded: true },
    dojo: { saldo: 1000 },
    progress: { 'task-scam': { status: 'selesai' } },
  });
  const validBackupRaw = JSON.stringify({
    schemaVersion: 1,
    profile: { name: 'Pulih', onboarded: true },
    dojo: { saldo: 777000 },
    progress: { 'task-scam': { status: 'selesai', debriefDone: true } },
  });
  const storage = makeStorage({
    [NS]: activeRaw,
    [BACKUP]: JSON.stringify({ items: [{
      raw: validBackupRaw,
      reason: 'normalize',
      savedAt: '2026-11-10T10:00:00.000Z',
    }] }),
  });
  const { store } = await importStore(storage);
  assert.equal(store.all().profile.name, 'Aktif');
  const [backup] = store.getBackups();
  const before = JSON.stringify(store.all());
  assert.throws(() => store.restoreBackup({ ...backup, raw: '{"profile":' }), /JSON/);
  assert.equal(JSON.stringify(store.all()), before);
  assert.throws(
    () => store.restoreBackup({ ...backup, raw: JSON.stringify({ schemaVersion: 2 }) }),
    /lebih baru/,
  );
  assert.equal(JSON.stringify(store.all()), before);

  store.restoreBackup(backup);
  assert.equal(store.all().profile.name, 'Pulih');
  assert.equal(store.all().dojo.saldo, 777000);
  assert.equal(store.storageWriteProtected(), false);
  assert.equal(JSON.parse(storage.getItem(NS)).profile.name, 'Pulih');
});

test('state sertifikat lama dimigrasikan dengan passScore dan tetap terpisah', async () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    exam: { passed: true, best: 90, attempts: 1 },
    certificate: { name: 'Rani', code: 'SCM-ABCD-2026', date: '2026-11-13T00:00:00.000Z', score: 90 },
  });
  const { store, storage } = await loadStore(raw);
  const state = store.all();
  assert.equal(state.exam.passScore, 80);
  assert.equal(state.exam.passed, true);
  assert.equal(state.certificate.name, 'Rani');
  assert.equal(state.certificate.code, 'SCM-ABCD-2026');
  assert.equal(state.certificate.score, 90);
  assert.equal(storage.getItem(BACKUP), null, 'migrasi field default tidak perlu dicadangkan');
});

test('passScore rusak tidak bisa membuka sertifikat palsu', async () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    exam: { passed: true, best: 100, attempts: 1, passScore: 999 },
  });
  const { store, storage } = await loadStore(raw);
  assert.equal(store.all().exam.passScore, 80);
  assert.ok(backupRaw(storage), 'field rusak harus dinormalkan dan dicadangkan');
});

test('state sekolah lama mendapat kuis kelas tanpa kehilangan nama kelas', async () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    sekolah: { classLabel: 'IX-B' },
  });
  const { store, storage } = await loadStore(raw);
  const quiz = store.all().sekolah.quiz;
  assert.equal(store.all().sekolah.classLabel, 'IX-B');
  assert.deepEqual(quiz, { attempts: 0, best: 0, passed: false, lastPool: [] });
  assert.equal(storage.getItem(BACKUP), null, 'state parsial valid tidak perlu dicadangkan');
});

test('resetAll eksplisit membersihkan backup dan membuka proteksi tulis', async () => {
  const storage = makeStorage({
    [NS]: JSON.stringify({ schemaVersion: 2 }),
    [BACKUP]: JSON.stringify({ items: [{
      raw: '{"profile":',
      reason: 'parse',
      savedAt: '2026-11-10T10:00:00.000Z',
    }] }),
  });
  const { store } = await importStore(storage);
  assert.equal(store.storageWriteProtected(), true);
  store.resetAll();
  assert.equal(store.storageWriteProtected(), false);
  assert.equal(store.getBackups().length, 0);
  assert.equal(storage.getItem(BACKUP), null);
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} uji store lulus.`);
process.exit(failed ? 1 : 0);
