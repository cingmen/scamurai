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

async function loadStore(seed) {
  const storage = makeStorage({ [NS]: seed });
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

function backupRaw(storage) {
  const raw = storage.getItem(BACKUP);
  return raw ? JSON.parse(raw) : null;
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
