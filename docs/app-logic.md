# JavaScript State & Interaction Spec — Scamurai

> Spesifikasi logika aplikasi untuk implementasi **vanilla ES modules tanpa framework**. Setiap bagian memuat: model data, perilaku, dan pseudocode/kode nyata yang boleh langsung diadopsi. Pasangan dokumen ini: `structure.md` (file & komponen), `styles.md` (visual), `prd.md` (produk).

## 1. Pola Arsitektur

Tiga pola sederhana, dipilih karena tanpa framework:

1. **Store tunggal + pub/sub** — satu objek state aplikasi; perubahan hanya lewat `store.set(path, value)`; komponen berlangganan bagian state tertentu.
2. **Event bus** — mesin (sim/vn/wa) tidak pernah menyentuh DOM; ia *emit* event; layar yang mendengarkan lalu merender.
3. **Hash router** — perubahan `location.hash` memicu render modul layar; setiap layar punya `render()` dan `destroy()`.

```js
// js/core/events.js
export const EVENTS = {
  sim: ['sim:start','sim:step','sim:choice','sim:flag','sim:end'],
  vn:  ['vn:node','vn:choice','vn:chapter','vn:end'],
  wa:  ['wa:message','wa:turn','wa:end'],
  app: ['route:change','state:change','data:error','update:available'],
};
const listeners = new Map();
export function on(name, fn) { (listeners.get(name) ?? listeners.set(name, new Set()).get(name)).add(fn); return () => off(name, fn); }
export function off(name, fn) { listeners.get(name)?.delete(fn); }
export function emit(name, payload) { listeners.get(name)?.forEach(fn => fn(payload)); }
```

```js
// js/core/store.js — inti state
const NS = 'scamurai.v1';           // namespace + versi skema
const state = load() ?? initialState();

let timers = new Map();
export function get(path) { /* ambil via path 'progress.task-scam.status' */ }
export function set(path, value) {
  setDeep(state, path, value);
  emit('state:change', { path, value });
  debouncePersist(path);            // simpan 300ms setelah aksi terakhir per path
}
function debouncePersist(path) {
  clearTimeout(timers.get(path));
  timers.set(path, setTimeout(() => persist(), 300));
}
function persist() { localStorage.setItem(NS, JSON.stringify(state)); }
```

## 2. Model State & Skema localStorage

Satu kunci utama: `localStorage["scamurai.v1"]` (JSON penuh). Kunci bantu: `scamurai.v1.sw-ack` (ack banner versi SW) dan `scamurai.v1.backup` (payload mentah terakhir yang rusak/direparasi, beserta alasan dan waktu).

```js
{
  "schemaVersion": 1,
  "createdAt": "2026-11-05T10:00:00+07:00",
  "profile": {
    "name": "",                 // hanya untuk sertifikat; kosong = anonim
    "rhythm": "normal",         // "santai" | "normal" | "nyata"
    "onboarded": true
  },
  "settings": {
    "theme": "sumi",            // "sumi" | "washi"
    "fontScale": "normal",      // "normal" | "large" | "elder"
    "mode": "standar",          // "standar" | "lansia" | "sekolah"
    "sfx": true,
    "haptics": true,
    "kenjiTips": true           // stempel Kenji
  },
  "dojo": {
    "saldo": 5000000,           // Saldo Dojo (uang simulasi), integer Rupiah
    "belt": 0                   // 0..5 → putih..hitam (turunan, lihat §8.2)
  },
  "progress": {                 // kunci = scenarioId (STABIL, jangan di-rename)
    "task-scam": {
      "status": "selesai",      // "belum" | "berjalan" | "selesai"
      "bestEnding": "melapor",  // id ending terbaik yang pernah dicapai
      "endingsSeen": ["cair", "melapor"],
      "flags": { "found": 4, "missed": 1 },
      "debriefDone": true,
      "lastStep": 12,           // resume
      "updatedAt": "..."
    }
  },
  "vn": {                       // khusus love-scam
    "saves": [                  // 2 slot manual + autosave index 0
      { "node": "bab3-07", "vars": { "trust": 62, "awareness": 35 }, "chapter": 3, "savedAt": "..." },
      null
    ]
  },
  "dex": { "task-scam": { "variants": ["var-deepfake"] } },  // kartu terbuka + varian
  "exam": {
    "attempts": 2, "best": 85, "passed": true,
    "lastPool": ["q-041", ...]  // ids terpakai terakhir (hindari repeat penuh)
  },
  "certificate": { "name": "Rani", "code": "SCM-7F3A-2026", "date": "...", "score": 85 },
  "wa": { "bestExitTurn": 9, "reported": true },   // minigame grup
  "sekolah": { "classLabel": "IX-B", "packagesDone": [] },
  "stats": { "flagsTotal": 23, "flagsCorrect": 19, "scenariosCompleted": 5, "playTimeMs": 4021000 },
  "meta": { "lastSeen": "...", "swVersion": "v1.0.3" }
}
```

**Aturan:**
- Semua penulisan lewat `store.set`; **dilarang** menulis localStorage langsung dari komponen.
- `schemaVersion` berbeda → jalankan `migrate()` sebelum dipakai; migrasi harus fungsi berantai `m1→m2→...` yang tidak pernah menghapus data pengguna. Data tanpa versi diperlakukan sebagai m0, sehingga `wallet.saldo` lama dipindahkan ke `dojo.saldo` tanpa menimpa saldo yang sudah ada.
- Data yang tidak bisa diparse atau strukturnya rusak tidak boleh langsung ditimpa: payload mentah dicadangkan ke `scamurai.v1.backup`, state dinormalkan ke default yang aman, dan boot menampilkan notifikasi pemulihan. Field progres yang hilang diisi default tanpa menghapus nilai valid.
- Payload dengan `schemaVersion` **lebih besar** dari `SCHEMA_VERSION` tidak dinormalisasi dan tidak pernah ditulis ulang. `readStorage()` menyimpan cadangan `future`, menyalakan proteksi tulis, lalu boot memakai state aman sambil memberi tahu pengguna. Semua `set()`/`persist()` berikutnya tidak menyentuh kunci utama sampai pengguna memilih restore backup yang kompatibel atau reset eksplisit.
- `scamurai.v1.backup` sekarang berupa riwayat `{items:[...]}`; record lama berbentuk satu objek tetap dibaca. Backup tidak dihapus otomatis dan hanya dibersihkan oleh `resetAll()` eksplisit. UI Pengaturan menampilkan alasan/waktu, mengunduh raw JSON, dan memulihkan lewat konfirmasi. Restore memvalidasi JSON, versi, dan struktur sebelum mengganti state; backup korup/future ditolak tanpa menyentuh state aktif.
- **Ekspor/impor progres:** string `JSON.stringify(state)` di-encode base64 (dengan checksum sederhana) → tampil sebagai kode yang bisa disalin; impor memvalidasi `schemaVersion` ≤ versi jalan.
- Reset: modal konfirmasi + pilihan "hapus semuanya" / "hapus hanya kemajuan" (settings tetap).

```js
function migrate(raw) {
  let s = raw;
  if (s.schemaVersion === 0) { s = m0to1(s); }   // contoh: pindahkan wallet → dojo.saldo
  if (s.schemaVersion === 1) { /* sudah terkini */ }
  return s;
}
```

## 3. Hash Router

```js
// js/router.js
const routes = [
  { pattern: /^\/?$/,                          screen: () => import('./screens/home.js') },
  { pattern: /^\/skenario$/,                   screen: () => import('./screens/scenario-select.js') },
  { pattern: /^\/skenario\/([\w-]+)$/,         screen: () => import('./screens/scenario-brief.js') },
  { pattern: /^\/main\/([\w-]+)$/,             screen: () => import('./screens/sim-player.js'),
    guard: ({m, s}) => s.progress[m[1]]?.status !== undefined || manifestSudahBrief(m[1]) },
  { pattern: /^\/vn\/([\w-]+)$/,               screen: () => import('./screens/vn-player.js') },
  { pattern: /^\/grup$/,                       screen: () => import('./screens/minigame-wa.js') },
  { pattern: /^\/debrief\/([\w-]+)$/,          screen: () => import('./screens/debrief.js') },
  { pattern: /^\/scamdex$/,                    screen: () => import('./screens/scamdex.js') },
  { pattern: /^\/ujian$/,                      screen: () => import('./screens/exam.js'),
    guard: ({s}) => Object.values(s.progress).filter(p => p.status === 'selesai').length >= 4 },
  { pattern: /^\/sertifikat$/,                 screen: () => import('./screens/certificate.js'),
    guard: ({s}) => s.exam.passed },
  { pattern: /^\/bantuan$/,                    screen: () => import('./screens/bantuan.js') },  // selalu bisa
  { pattern: /^\/pengaturan$/,                 screen: () => import('./screens/settings.js') },
  { pattern: /^\/sekolah$/,                    screen: () => import('./screens/sekolah.js') },
];
```

Perilaku:
- `window.addEventListener('hashchange', navigate)`; `navigate()` = cocokkan hash → guard → `destroy()` layar lama → `render()` layar baru ke `#app` → `emit('route:change')`.
- Guard gagal → redirect ke rute sebelumnya yang valid + toast alasan ("Selesaikan 4 skenario dulu").
- **Guard `#/bantuan` tidak ada** — korban aktif harus selalu bisa masuk, juga dari landing.
- Dynamic `import()` memecah file per layar secara alami (native ESM, tanpa bundler).
- Scroll posisi: selalu scroll top saat pindah rute; layar sim menyimpan `lastStep` agar bisa resume.

## 4. SimEngine (mesin skenario generik)

### 4.1 Skema JSON skenario

```js
{
  "id": "task-scam",            // = nama file, stabil selamanya
  "title": "Pesanan yang Menggugah",
  "type": "sim",                // "sim" | "vn"
  "difficulty": 1,              // 1..3 (ikon katana)
  "app": "chatriang",           // aplikasi tiruan default
  "brief": { "goal": "...", "rules": ["..."], "saldoAwal": 5000000 },
  "steps": [ /* lihat 4.2 */ ],
  "endings": {                  // map id → metrik dampak
    "cair":    { "label": "Saldo habis",   "saldoDelta": -2500000, "dexVariant": null },
    "cabut":   { "label": "Cabut tepat",   "saldoDelta": -250000,  "dexVariant": null },
    "melapor": { "label": "Melapor",       "saldoDelta": 0,        "dexVariant": null }
  },
  "debrief": {
    "anatomi": [ { "t": "08.15", "judul": "Umpan pertama", "naskah": "...", "tujuanPenipu": "..." } ],
    "aliran": { "nodes": [...], "edges": [...] },     // untuk FlowDiagram (SVG statis)
    "pulihkan": [ "Blokir nomor penipu", "Lapor di lapor.go.id", "..." ],
    "linkPhisquest": true          // kartu rujukan PhisQuest (skenario phishing/task scam)
  }
}
```

### 4.2 Tipe step (renderer di `step-renderers.js`)

| Tipe | Field kunci | Interaksi pengguna |
|---|---|---|
| `chat` | `from`, `text`, `delayMs`, `typingMs`, `attach?` | baca; auto-continue |
| `sms` | `sender`, `text`, `time` | baca (font mono) |
| `call` | `caller`, `script[]`, `timerS` | layar panggilan; pilihan `terima`/`tolak`; skrip maju per beat |
| `choice` | `prompt`, `options[{id,label,cond?,effects,flagNote?}]` | pilih 1 |
| `flag-tap` | `hotspots[{x,y,r,flagId,title,why,do}]`, `durS?` | tap elemen berbahaya pada layar hidup |
| `input-otp` | `digits:6`, `prompts[]`, `correctAction: "tolak"` | isi keypad ATAU tolak |
| `app-ui` | `app`, `view`, `data` | render layar aplikasi tiruan (saldo/transfer/listing/form) |
| `browser` | `url`, `pageJson`, `inspectable: true` | halaman BrowserMini; address bar bisa diinspeksi |
| `permission` | `items[{id,label,risk}]` | centang izin (pinjol) — tolak memicu cabang |
| `timer-choice` | `options`, `durS` (per ritme) | pilihan dengan batas waktu; timeout = pilihan default penipu |
| `consequence` | `endingId`, `text`, `saldoDelta` | akhir jalur |
| `lesson` | `title`, `body`, `refDex` | kartu pelajaran singkat (pre-debrief) |

### 4.3 Loop mesin

```js
export function createSimEngine(scenario, store) {
  let i = store.get(`progress.${scenario.id}.lastStep`) ?? 0;   // resume
  const ctx = { flags: new Set(), saldo: store.get('dojo.saldo'), path: [] };

  function step() {
    const s = scenario.steps[i];
    if (!s) return end('timeout');                              // defensive
    emit('sim:step', { index: i, step: s });
  }
  function onChoice(optionId) {
    const s = scenario.steps[i];
    const opt = s.options.find(o => o.id === optionId);
    applyEffects(opt.effects, ctx);                             // saldo/vars/cabang
    ctx.path.push({ i, choice: optionId });
    if (opt.goto !== undefined) { i = opt.goto; }
    else i++;
    persistProgress(); step();
  }
  function onFlag(hotspotId, ok) {
    emit('sim:flag', { hotspotId, ok, stepIndex: i });
    updateStats(store, ok);                                     // stats.flagsTotal/Correct
    if (ok) ctx.flags.add(hotspotId);
  }
  function end(endingId) {
    const e = scenario.endings[endingId];
    store.set(`dojo.saldo`, ctx.saldo + e.saldoDelta);
    saveEnding(scenario.id, endingId, ctx);                     // progress + dex + belt recalc
    emit('sim:end', { endingId, flags: [...ctx.flags] });
  }
  return { start: step, onChoice, onFlag, onOtp, resume: step };
}
```

**Aturan efek (`effects`):**
```js
{ "saldoDelta": -250000, "trustDelta": +10,        // dipakai sim & vn
  "setFlag": "flag-otp", "goto": 14,               // cabang manual
  "end": "cair" }                                  // pemicu ending langsung
```

**Ritme (pengaturan `profile.rhythm`):** `durS` pada `timer-choice` dikali faktor: santai → tanpa timer; normal → ×1.5; nyata → ×1. Menyimpan `flags.found/missed` per skenario untuk rekap debrief.

## 5. Tap Red Flag (mekanik transversal)

- Hotspot didefinisikan relatif ke konten layar (persen, bukan piksel) agar aman terhadap skala font/tema: `{ "x": 42, "y": 68, "r": 9 }` (persen lebar/tinggi, radius tap 9% → minimal 48px di 390px frame).
- Pada layar `browser` dan `app-ui`, hotspot menempel ke elemen nyata via `data-flag="flag-id"` di DOM tiruan (lebih akurat daripada koordinat); koordinat hanya untuk `chat`/`sms`.
- Skor: benar `+1 flag` & Saldo Dojo bonus kecil `+25.000` (maks 1× per hotspot); salah menandai elemen wajar → penjelasan, tanpa penalti saldo (tidak menghukum rasa ingin tahu).
- Sebelum aksi kritis (`choice` berlabel `critical: true`), jika masih ada hotspot yang tidak ditandai → Kenji muncul sekali: "Ada yang belum kamu periksa?" (bisa dimatikan di settings).

## 6. VNEngine (Love Scam — "Cinta di Balik Layar")

### 6.1 Skema graph

```js
{
  "id": "love-scam", "type": "vn",
  "chapters": [ { "id": "bab1", "title": "Perkenalan", "nodes": [...] } ],
  "vars": { "trust": 20, "awareness": 20 },          // 0..100, default awal
  "endings": ["kena-total", "kena-sebagian", "selamat-luka", "cegah-awal"]
}
// node:
{
  "id": "bab1-03",
  "speaker": "bagas",            // "bagas" | "kamu" | "narator" | "kenji"
  "text": "Sudah makan belum? Di sini baru pulang shift.",
  "time": "23.47", "attach": { "type": "photo", "src": "./assets/img/scenarios/love-scam/f1.webp" },
  "choices": [
    { "id": "a", "label": "Balas hangat", "effects": { "trustDelta": +8 },
      "cond": null, "goto": "bab1-04" },
    { "id": "b", "label": "Balas, tapi tanyakan pekerjaannya",
      "effects": { "awarenessDelta": +5, "trustDelta": +4 }, "goto": "bab1-05" }
  ],
  "autosave": true
}
```

### 6.2 Perilaku mesin

1. **Traversi:** node tanpa `choices` → auto-next (`next` atau node id berurutan); node dengan `choices` → tunggu input. `cond` = string kecil seperti `"awareness>=40"` dievaluasi oleh evaluator aman (parser sederhana, **bukan `eval`**).
2. **Variabel:** `trust` naik lewat kehangatan; `awareness` naik ketika pengguna menandai kejanggalan. Tidak pernah ditampilkan sebagai angka di layar — hanya memicu cabang (jaga imersi).
3. **Video call deepfake (Bab 3):** node khusus `type: "videocall"` → fullscreen dalam bingkai, video 8–10s loop (aset buatan, wajah artifisial), tombol "akhiri panggilan", lalu choices termasuk flag "panggilan selalu singkat".
4. **Ending matrix:**

| Ending | Syarat (evaluasi di simpul akhir bab 5) |
|---|---|
| `cegah-awal` | `awareness ≥ 70` **atau** pengguna memilih "verifikasi foto" di Bab 2 |
| `selamat-luka` | `trust 40–69` dan menolak permintaan pertama |
| `kena-sebagian` | `trust ≥ 70`, mengirim sebagian, berhenti sebelum eskalasi |
| `kena-total` | `trust ≥ 70` dan mengikuti semua permintaan |

5. **QoL:** riwayat (scroll-back ≤ 100 node), typewriter dengan skip (tap = tampilkan penuh), kecepatan teks 3 level, autosave tiap node `autosave:true`, 2 slot manual, tombol "ulang dari bab" per bab.
6. **Debrief VN:** naskah manipulasi per bab (love bombing → grooming → crisis → urgency → isolation) ditampilkan berpasangan dengan pesan nyata di jalur pengguna (`ctx.path`).

## 7. WAEngine — Grup Fabel Investasi

- Naskah `wa-grup.json`: array beat `{ "turn": 1, "actor": "admin", "text": "...", "delay": 4000, "role": "admin|shill|victim-organic|skeptic" }`.
- Loop: pesan muncul berurutan dengan delay (dapat dipercepat 4× dengan tombol); setiap ~6 beat mesin **jeda** dan memberi 3 tindakan pengguna: `diam` / `bertanya` / `melaporkan` (sejak turn ≥ 8) / `keluar grup` (sejak turn ≥ 10).
- `bertanya` memicu beat respons dinamis: pilih dari `responses` actor terkait (FOMO/gaslighting). `keluar`/`lapor` mengakhiri dengan skor: **turn keluar** (makin awal makin baik) → kartu debrief membuka peran tiap shill.
- Simpan `wa.bestExitTurn` + `wa.reported`; tidak mengubah saldo dojo (modul ini tentang pengamatan, bukan uang).

## 8. Progres, ScamDEX & Sabuk

### 8.1 Pembukaan kartu
- Selesai skenario (ending apa pun) → kartu dasar modus terbuka di ScamDEX.
- Ending spesifik membuka varian: mis. love-scam `kena-total` dengan pengguna pernah menerima videocall → varian `var-deepfake`; bank-otp `hampir-kena` → varian `var-ojk-palsu`. Varian didefinisikan di `scamdex.json` dengan `unlockEnding` map.

### 8.2 Sabuk (turunan, bukan disimpan)
```js
function hitungSabuk(state) {
  const done = Object.values(state.progress).filter(p => p.status === 'selesai');
  const debrief = done.filter(p => p.debriefDone).length;
  const n = done.length;
  if (n >= 8 && state.exam.passed && debrief >= 8) return 5; // hitam
  if (n >= 7 && state.exam.attempts > 0)             return 4; // merah
  if (n >= 6 && debrief >= 4)                        return 3; // biru
  if (n >= 4)                                        return 2; // hijau
  if (n >= 2)                                        return 1; // kuning
  return 0;                                                    // putih
}
```
Dihitung ulang tiap `state:change` pada `progress.*` / `exam.*`; hasil dipakai beranda & sertifikat.

### 8.3 Saldo Dojo lintas skenario
- Deklarasi awal `brief.saldoAwal` hanya berlaku jika pengguna belum punya saldo (pengguna baru) — saldo adalah satu nilai global, skenario hanya membaca/mengubahnya.
- "Pemulihan": menyelesaikan debrief penuh (semua bagian dibuka) mengembalikan **25%** dari saldo yang hilang pada skenario itu (batas maksimal kumulatif 1.000.000) — mencontohkan pemulihan yang menyakitkan namun nyata. Angka ini disimpan di `progress.<id>.recovered`.

## 9. Ujian Akhir & Sertifikat

### 9.1 Sampling & penilaian
```js
function buildPool(examData, state) {
  const seen = new Set(state.exam.lastPool);
  const fresh = examData.questions.filter(q => !seen.has(q.id));
  const pick = shuffle(fresh.length >= 20 ? fresh : examData.questions).slice(0, 20);
  return pick;   // 20 soal; pool ≥ 40; hindari repetisi penuh soal
}
function grade(answers, pool) {
  const correct = answers.filter((a, i) => a === pool[i].key).length;
  return Math.round((correct / pool.length) * 100);
}
```
- Lulus `score ≥ 80` → `exam.passed = true`; gagal → boleh ulang kapan saja (tanpa hukuman; counter attempts tetap dicatat).
- Tipe soal: `pilihan` (4 opsi), `urutan` (susun langkah pemulihan — tekan urutan tombol), `flag-gambar` (tandai area pada gambar statis tangkapan layar simulasi).
- Timer hanya di ritme `nyata` (20 menit total). Ritme lain tanpa timer.

### 9.2 Kode sertifikat (deterministik, non-kriptografis)
```js
// hash sederhana FNV-1a 32-bit → format SCM-XXXX-TAHUN
function certCode(name, isoDate, score) {
  const h = fnv1a(`${name}|${isoDate}|${score}|scamurai`);
  return `SCM-${h.toString(16).toUpperCase().padStart(8, '0').slice(0, 4)}-${new Date(isoDate).getFullYear()}`;
}
```
- Sertifikat dirender ke `<canvas>` 1200×850 (styles.md §10) → `toBlob('image/png')` → `navigator.share({files:[...]})` bila didukung, else unduh.
- Nama diinput terakhir setelah lulus; disimpan lokal; bisa diubah (kode ikut berubah — dinyatakan di UI).

## 10. Mode Lansia & Mode Sekolah (logika)

- **Lansia** (`settings.mode = "lansia"`): paksa `fontScale=elder`, `theme=washi`, `kenjiTips=true`, tanpa `timer-choice` (semua `durS` diabaikan), `choice` membatasi tampilan 2 opsi pertama (opsi lain masuk "tampilkan lagi 2 pilihan"), UI VN tanpa efek typewriter (teks langsung penuh).
- **Sekolah** (`mode = "sekolah"`): layar `#/sekolah` memilih paket (`paket-45m`: task-scam + bank-otp + ujian 10 soal); progres disimpan di `sekolah.packagesDone`; lembar guru = route `#/sekolah/guru` dengan `@media print` khusus (tanpa bingkai, daftar diskusi); kartu kemajuan siswa = render canvas (share.js) berisi sabuk, skenario selesai, skor ujian — **tanpa** data pribadi selain nama opsional.

## 11. Service Worker & Offline

```js
// sw.js (ringkas)
const VERSION = 'v1.0.3';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './assets/css/tokens.css', './assets/css/base.css', './assets/css/components.css',
  /* ...screen css, fonts, audio, img utama */
];
// data/*.json & scenarios/*.json → precache juga (kecil, penting agar offline penuh)
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(cleanupOld(VERSION)));
// fetch: same-origin GET →
//   /data/*.json : stale-while-revalidate
//   assets       : cache-first
//   navigasi     : cache-first → fallback index.html
```
- Banner "versi baru tersedia — muat ulang": deteksi `sw:updatefound` + versi baru aktif → `emit('update:available')` → toast dengan tombol reload (simpan ack di `scamurai.v1.sw-ack` agar tidak mengganggu).
- Gagal memuat JSON (offline pertama kali sebelum cache penuh) → `loader.js` menampilkan layar ramah dengan tombol "coba lagi" + tautan `#/bantuan` tetap berfungsi (bantuan.json termasuk precache).

## 12. Penanganan Error & Ketahanan

| Kasus | Perilaku |
|---|---|
| `fetch` JSON gagal | cache in-memory → cache SW → layar error ramah (`data:error`); tidak pernah blank screen |
| JSON gagal validasi (dev) | validator `scripts/validate-data.mjs` (Node) menjalankan cek schema + aturan konten saat CI; di runtime, step tanpa field wajib di-skip dengan log console.warn |
| localStorage penuh/blocked (private mode) | store mem-fallback ke memori + banner "progres tidak akan tersimpan di browser ini" |
| Route tak dikenal | redirect `#/` + toast |
| Ongoing sim saat pindah rute | `destroy()` menghentikan timer; `lastStep` tersimpan → resume |

## 13. Validator Data (mirror gaya PhisQuest)

`scripts/validate-data.mjs` (Node, dijalankan CI GitHub Actions):
1. Semua `data/**/*.json` lolos schema (bisa pakai AJV dari devDependency **hanya untuk validasi**, tidak pernah dijalankan di web).
2. Aturan konten: setiap skenario punya ≥ 3 `flagId` unik, ≥ 2 ending, debrief `pulihkan` ≥ 3 langkah, tidak ada URL domain nyata (whitelist domain fiktif), semua `endingId` terdefinisi, semua `goto` menunjuk node/step yang ada.
3. `stats-sosial.json`: setiap entri wajib punya `source` (URL) + `checkedAt` (tanggal); tanpa sumber → CI gagal (PRD §21.1).
4. `bantuan.json`: `verifiedAt` ≤ 90 hari dari tanggal rilis → CI memberi peringatan kadaluarsa.

## 14. Daftar Event Lengkap (kontrak lintas modul)

| Event | Payload | Emit oleh | Konsumen |
|---|---|---|---|
| `sim:start` | `{scenarioId}` | sim-player | stats |
| `sim:step` | `{index, step}` | SimEngine | step-renderers, progress bar |
| `sim:choice` | `{index, optionId}` | ChoiceList | SimEngine |
| `sim:flag` | `{hotspotId, ok, stepIndex}` | FlagTap | stats, debrief rekap |
| `sim:end` | `{endingId, flags}` | SimEngine | debrief, dex, belt |
| `vn:node` / `vn:choice` | node/choice | VNEngine | vn-player |
| `vn:end` | `{endingId, vars}` | VNEngine | debrief, dex |
| `wa:message` / `wa:end` | beat / hasil | WAEngine | minigame-wa |
| `state:change` | `{path, value}` | store | layar yang berlangganan |
| `route:change` | `{from, to}` | router | home (belt refresh), analytics lokal |
| `data:error` | `{url, reason}` | loader | toast/layar error |
| `update:available` | `{version}` | SW | toast reload |

## 15. Checklist QA Interaksi (per rilis)

- [ ] Resume skenario dari `lastStep` benar setelah refresh di tengah sim.
- [ ] Saldo Dojo konsisten lintas skenario (uji: kalah di task-scam → buka bank-otp, saldo turun).
- [ ] Ketiga ritme mengubah/mematikan timer dengan benar.
- [ ] Mode lansia: semua layar utama terbaca 125%, tanpa timer, 2 opsi.
- [ ] Ujian: pool tidak mengulang penuh 20 soal terakhir; lulus/ulang alur benar; sertifikat ter-render & bisa dibagikan.
- [ ] Offline penuh (SW precache) → semua skenario & bantuan jalan tanpa jaringan.
- [ ] Impor/ekspor kode progres round-trip tanpa kehilangan data.
- [ ] Semua hotspot flag bisa dicapai keyboard (tab + enter) di desktop.
- [ ] Tidak ada `eval`/HTML mentah dari JSON (uji dengan teks berisi `<script>` pada field skenario).
