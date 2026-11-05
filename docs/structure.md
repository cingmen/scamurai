# File Structure & Component Map — Scamurai

> Panduan struktur kode untuk implementasi **vanilla HTML/CSS/JS tanpa framework, tanpa bundler, tanpa build step**, siap di-deploy ke GitHub Pages. Prinsip: *buka file, edit, push, langsung jalan*.

## 1. Keputusan Arsitektur (alasan desain)

| Keputusan | Alasan |
|---|---|
| **SPA satu `index.html` + hash router (`#/path`)** | GitHub Pages project page memakai sub-path (`/scamurai/`); hash routing tidak butuh konfigurasi rewrite/`404.html` fallback sama sekali. Refresh di rute apa pun tetap masuk `index.html`. |
| **ES Modules native (`<script type="module">`)** | Browser modern semua mendukung; tidak perlu bundler. Satu-satunya perhatian: selalu import dengan path **relatif** (`./js/...`) supaya aman di sub-path. |
| **Konten = file JSON** (`data/`) | Menambah skenario/minigame/soal ujian tanpa menyentuh kode; format sama dengan kebiasaan konten PhisQuest (JSON + schema). |
| **CSS dipisah per lapisan** (`tokens → base → components → screens`) | Tanpa CSS-in-JS; urutan import tetap di `index.html` agar prediktabel. |
| **State tunggal + pub/sub** (`js/core/store.js`) | Satu sumber kebenaran, tersimpan ke `localStorage`; komponen berlangganan perubahan, tidak saling memanggil. Rinci di `app-logic.md`. |
| **Tanpa server, tanpa cookie, tanpa analitik** | Privasi (PRD §19) + nol biaya operasional. |
| **Aset mandiri (font/gambar di repo)** | Offline penuh via Service Worker; tidak bergantung CDN eksternal. |

## 2. Struktur Direktori Lengkap

```text
scamurai/                       ← root repo (di-deploy via GitHub Pages)
├── index.html                  ← satu-satunya HTML; memuat CSS + <div id="app"> + <script type="module" src="./js/main.js">
├── manifest.webmanifest        ← manifest PWA (nama, ikon, tema, display standalone)
├── sw.js                       ← Service Worker: precache app shell + data; strategi cache (app-logic.md §9)
├── 404.html                    ← halaman 404 ramah + tombol ke beranda (opsional tapi disarankan)
├── favicon.svg                 ← ikon tab browser (topi/kena samurai Kenji)
├── robots.txt                  ← izinkan indeks, tampilkan sitemap (opsional)
├── README.md                   ← cara jalan lokal (python http.server / npx serve), struktur, kontribusi
│
├── assets/
│   ├── css/
│   │   ├── tokens.css          ← CSS custom properties: warna, spacing, radius, font, motion (styles.md §3)
│   │   ├── base.css            ← reset ringan, tipografi dasar, aksesibilitas (focus, sr-only)
│   │   ├── components.css      ← semua kelas komponen reusable (.c-btn, .c-chat, .c-phone, dst.)
│   │   └── screens/            ← CSS spesifik layar (lazy: hanya diimpor jika perlu via <link> dinamis atau semua digabung)
│   │       ├── home.css
│   │       ├── sim.css         ← layar simulasi (chat, bank, marketplace, pinjol, browser)
│   │       ├── vn.css          ← visual novel
│   │       ├── minigame.css    ← Grup Fabel Investasi
│   │       ├── scamdex.css
│   │       ├── exam.css
│   │       └── bantuan.css
│   ├── fonts/
│   │   ├── PlusJakartaSans-Regular.woff2
│   │   ├── PlusJakartaSans-Medium.woff2
│   │   ├── PlusJakartaSans-Bold.woff2
│   │   └── MonoNama.woff2      ← font monospace untuk SMS/OTP/domain (subset)
│   ├── img/
│   │   ├── mascot/             ← Kenji: pose normal/bahaya/menang (SVG)
│   │   ├── icons/              ← set ikon garis 2px (SVG sprite: sprite.svg)
│   │   ├── scenarios/          ← cover tiap skenario + gambar untuk debrief (WebP)
│   │   ├── scamdex/            ← ikon kartu per modus penipuan (SVG/WebP)
│   │   └── og-image.png        ← preview share media sosial
│   └── audio/
│       ├── tap.mp3, success.mp3, danger.mp3, badge.mp3   ← SFX kecil (<20KB each)
│
├── data/
│   ├── manifest.json           ← registry skenario: id, judul, ikon, kesulitan, syarat buka, urutan
│   ├── scenarios/
│   │   ├── task-scam.json
│   │   ├── bank-otp.json
│   │   ├── pinjol.json
│   │   ├── marketplace.json
│   │   ├── kerja-luar-negeri.json
│   │   ├── money-mule.json
│   │   ├── love-scam.json      ← graph VN (schema berbeda, app-logic.md §6)
│   │   └── phishing.json
│   ├── minigames/
│   │   └── wa-grup.json        ← naskah Grup Fabel Investasi (pesan berjadwal + role shill)
│   ├── exam/
│   │   └── final-exam.json     ← pool ≥40 soal dengan tag skenario
│   ├── scamdex.json            ← definisi kartu (nama, ikon, psikologi, red flags, verifikasi)
│   ├── bantuan.json            ← direktori bantuan (tautan kanal resmi + tanggal verifikasi)
│   └── stats-sosial.json       ← statistik yang boleh ditampilkan + sumber & tanggal (PRD §21.1)
│
└── js/
    ├── main.js                 ← bootstrap: load manifest → init store → init router → render
    ├── router.js               ← hash router: rute → screen module; guard (mis. love-scam butuh unlock)
    ├── core/
    │   ├── store.js            ← state global + persistensi localStorage + pub/sub (app-logic.md §2)
    │   ├── events.js           ← event bus aplikasi (EVENTS enum + on/off/emit)
    │   ├── loader.js           ← fetch JSON dengan cache in-memory + fallback cache SW + pesan error
    │   ├── sfx.js              ← pemutar SFX (mute ikut settings, unlock audio gesture pertama)
    │   ├── haptics.js          ← navigator.vibrate wrapper (abaikan bila tak didukung)
    │   └── format.js           ← format Rupiah, tanggal, waktu relatif ("2 minggu kemudian")
    ├── engines/
    │   ├── sim-engine.js       ← mesin skenario generik: jalankan step JSON → emit tampilan (app-logic.md §4)
    │   ├── step-renderers.js   ← peta tipe step → renderer DOM (chat, sms, call, app-ui, browser, input-otp, flag-tap, choice, consequence)
    │   ├── vn-engine.js        ← mesin visual novel: node graph, variabel, cabang, ending (app-logic.md §6)
    │   └── wa-engine.js        ← mesin grup WA: jadwal pesan, balasan dinamis, deteksi "keluar/lapor"
    ├── screens/                ← satu modul per layar; ekspor fungsi render(container, params) → cleanup
    │   ├── home.js             ← beranda dojo: sabuk, lanjut bermain, daftar cepat
    │   ├── scenario-select.js  ← galeri 8 skenario + status selesai
    │   ├── scenario-brief.js   ← pengantar skenario (tujuan, aturan, mulai)
    │   ├── sim-player.js       ← host PhoneFrame + jalankan sim-engine untuk skenario non-VN
    │   ├── vn-player.js        ← host PhoneFrame + jalankan vn-engine (love scam)
    │   ├── minigame-wa.js      ← Grup Fabel Investasi
    │   ├── debrief.js          ← anatomi serangan + aliran uang + langkah pemulihan
    │   ├── scamdex.js          ← grid kartu + detail kartu
    │   ├── exam.js             ← ujian akhir (sampling pool, timer opsional)
    │   ├── certificate.js      ← render canvas sertifikat + share/download
    │   ├── bantuan.js          ← pusat bantuan & pelaporan
    │   ├── settings.js         ← ritme, mode lansia/sekolah, suara, hapus data, ekspor kode progres
    │   └── sekolah.js          ← mode sekolah: paket sesi + lembar guru (print-friendly)
    └── components/             ← fungsi DOM murni (bukan class UI framework); semua menerima teks, bukan HTML mentah
        ├── phone-frame.js      ← bingkai ponsel + status bar + watermark SIMULASI + notch
        ├── statusbar.js        ← jam/baterai/sinyal palsu di dalam PhoneFrame
        ├── chat-bubble.js      ← bubble chat masuk/keluar + centang + stempel Kenji
        ├── choice-list.js      ← daftar pilihan balasan/aksi (maks 4, gaya chips)
        ├── flag-tap.js         ← overlay mekanik Tap Red Flag (mark hotspot pada layar hidup)
        ├── meter.js            ← meter kepercayaan/tekanan/saldo dojo
        ├── keypad.js           ← keypad input OTP 6 digit
        ├── modal.js            ← dialog konfirmasi (role="dialog", fokus terjebak)
        ├── toast.js            ← notifikasi singkat (aria-live="polite")
        ├── progress.js         ← bar progres skenario/bab
        ├── badge-card.js       ← kartu ScamDEX/sabuk
        ├── timeline.js         ← timeline debrief (anatomi serangan)
        ├── flow-diagram.js     ← diagram aliran uang debrief (SVG statis berparameter)
        └── share.js            ← Web Share API + fallback unduh PNG (sertifikat/kartu kemajuan)
```

## 3. Peta Rute (hash router)

| Rute | Screen module | Data yang dimuat | Guard |
|---|---|---|---|
| `#/` | `home.js` | `manifest.json` + state | — |
| `#/skenario` | `scenario-select.js` | `manifest.json` | — |
| `#/skenario/:id` | `scenario-brief.js` | `scenarios/:id.json` (meta saja) | id harus ada di manifest |
| `#/main/:id` | `sim-player.js` | `scenarios/:id.json` penuh | selesai brief |
| `#/vn/:id` | `vn-player.js` | `scenarios/:id.json` (VN graph) | id ∈ {love-scam} |
| `#/grup` | `minigame-wa.js` | `minigames/wa-grup.json` | — |
| `#/debrief/:id` | `debrief.js` | bagian debrief skenario | skenario pernah dimainkan |
| `#/scamdex` | `scamdex.js` | `scamdex.json` + state | — |
| `#/ujian` | `exam.js` | `exam/final-exam.json` | ≥ 4 skenario selesai (lewat guard `canTakeExam`) |
| `#/sertifikat` | `certificate.js` | state + input nama | ujian lulus |
| `#/bantuan` | `bantuan.js` | `bantuan.json` | — (selalu bisa diakses, termasuk offline) |
| `#/pengaturan` | `settings.js` | state | — |
| `#/sekolah` | `sekolah.js` | `manifest.json` + `exam` | — |
| `#/latihan` | (redirect eksternal) | — | membuka PhisQuest di tab baru |

Rute tidak dikenal → fallback ke `#/` + toast "Halaman tidak ditemukan".

## 4. Peta Komponen (Component Map)

### 4.1 Komponen tampilan

| Komponen | File | Tanggung jawab | Dipakai oleh | Data yang dibaca |
|---|---|---|---|---|
| PhoneFrame | `components/phone-frame.js` | Bingkai ponsel, notch, watermark SIMULASI, slot konten | sim-player, vn-player, minigame-wa, exam (preview) | settings (tema, skala font) |
| StatusBar | `components/statusbar.js` | Jam/baterai/sinyal palsu di dalam bingkai | PhoneFrame (internal) | format.js |
| ChatBubble | `components/chat-bubble.js` | Bubble masuk/keluar, centang baca, lampiran (foto/pdf tiruan), label shill | sim-player (step chat), vn-player, minigame-wa | step JSON |
| ChoiceList | `components/choice-list.js` | Pilihan aksi/balasan; menonaktifkan pilihan sesuai kondisi | sim-engine, vn-engine | step.options |
| FlagTap | `components/flag-tap.js` | Menandai hotspot red flag pada layar hidup; hitung benar/salah; tampilkan penjelasan | step-renderers (tipe `flag-tap`), debrief (rekap) | step.hotspots |
| Meter | `components/meter.js` | Meter kepercayaan/tekanan + saldo dojo | sim-player, vn-player | state.sesi |
| Keypad | `components/keypad.js` | Input OTP 6 digit palsu (fokus, hapus) | step-renderers (tipe `input-otp`) | step |
| Modal | `components/modal.js` | Konfirmasi ("keluar skenario?"), detail kartu | semua layar | — |
| Toast | `components/toast.js` | Notifikasi singkat, error load | semua layar | — |
| ProgressBar | `components/progress.js` | Progres skenario/bab/ujian | sim-player, vn-player, exam | state.sesi |
| BadgeCard | `components/badge-card.js` | Kartu ScamDEX terkunci/terbuka, kartu sabuk | scamdex, home | scamdex.json, state |
| Timeline | `components/timeline.js` | Langkah serangan di debrief | debrief | scenario.debrief.anatomi |
| FlowDiagram | `components/flow-diagram.js` | Diagram aliran uang (SVG statis berparameter) | debrief | scenario.debrief.aliran |
| Share | `components/share.js` | Web Share API / unduh PNG; render canvas sertifikat & kartu kemajuan | certificate, sekolah, home | state, config sertifikat |

### 4.2 Mesin (logika tanpa DOM)

| Mesin | File | Input | Output (event) | Keterangan |
|---|---|---|---|---|
| SimEngine | `engines/sim-engine.js` | scenario JSON + state | `sim:step`, `sim:choice`, `sim:flag`, `sim:end` | Mesin status langkah; semua skenario non-VN |
| StepRenderers | `engines/step-renderers.js` | step JSON | DOM di dalam PhoneFrame | Peta tipe step → renderer; satu-satunya yang menyentuh DOM |
| VNEngine | `engines/vn-engine.js` | VN graph + variabel | `vn:node`, `vn:choice`, `vn:chapter`, `vn:end` | Variabel kepercayaan/kewaspadaan, ending matrix |
| WAEngine | `engines/wa-engine.js` | wa-grup.json + keputusan pengguna | `wa:message`, `wa:turn`, `wa:end` | Jadwal pesan, respons dinamis, skor waktu keluar/lapor |

### 4.3 Layar → dependensi

| Screen | Komponen yang dipakai | Mesin | Simpan ke store |
|---|---|---|---|
| home | BadgeCard, Toast, Share | — | `lastSeen` |
| scenario-select | BadgeCard | — | — |
| scenario-brief | Modal, Toast | — | — |
| sim-player | PhoneFrame, ChatBubble, ChoiceList, FlagTap, Keypad, Meter, ProgressBar, Modal | SimEngine | `progress.<id>`, `dojo.saldo`, `flags` |
| vn-player | PhoneFrame, ChatBubble, ChoiceList, Meter, ProgressBar, Modal | VNEngine | `progress.love-scam`, `vn.saves` |
| minigame-wa | PhoneFrame, ChatBubble, ChoiceList, ProgressBar | WAEngine | `progress.wa-grup` |
| debrief | Timeline, FlowDiagram, BadgeCard | — | `progress.<id>.debrief`, buka kartu ScamDEX |
| scamdex | BadgeCard, Modal | — | — |
| exam | ProgressBar, Modal | (lokal) | `exam.attempts`, `exam.best` |
| certificate | Share, Modal | canvas | `certificate.{name,code,date}` |
| bantuan | Toast | — | `lastVerified` (tampil) |
| settings | Modal, Toast | — | `settings.*`, reset/impor |

## 5. Konvensi Penamaan & Gaya Kode

- **File/direktori:** kebab-case (`scenario-select.js`, `flag-tap.js`).
- **Kelas CSS:** awalan per lapisan — token (`--s-*` custom props), komponen `.c-*`, layar `.scr-*`, utilitas `.u-*` (styles.md §7).
- **JS:** fungsi murni + modul; **tanpa** class hierarki UI; setiap screen module ekspor `{ render, destroy }` agar router bisa cleanup listener.
- **ID data skenario:** kebab-case stabil (`task-scam`) — dipakai sebagai kunci state & nama file; **jangan pernah rename** setelah rilis (rusak progres tersimpan).
- **JSON:** semua teks pengguna-facing dalam satu bahasa (id); kunci tetap Inggris (`title`, `steps`, `options`).
- **Komentar:** wajib di atas setiap fungsi mesin (input/output/side-effect).
- **Batas ukuran:** satu file JS ≤ ~400 baris; pecah jika lebih (`step-renderers` boleh pecah per tipe).

## 6. Catatan Khusus GitHub Pages

1. **Path relatif selalu** — `./js/main.js`, `./data/...`; hindari `/js/...` absolut yang rusak di sub-path `/scamurai/`.
2. **SW scope:** daftarkan `navigator.serviceWorker.register('./sw.js')` — scope otomatis mengikuti lokasi; tidak ada opsi header khusus (SW hanya bisa cache, tanpa server push).
3. **Cache busting:** SW memakai versi string di `sw.js` (`CACHE_VERSION = 'v1.0.3'`); naikkan di setiap rilis agar cache lama tergantikan; data JSON di-*revalidate* saat online (stale-while-revalidate).
4. **Tidak ada `.htaccess`/server config:** semua perilaku (mime, redirect) diserahkan ke GitHub; jangan andalkan rewrite.
5. **Ukuran repo:** gambar WebP/SVG, audio pendek; target repo < 30 MB agar clone cepat.
6. **Custom domain (opsional):** cukup file `CNAME`; kode tidak berubah karena path relatif.

## 7. Alur Data Ringkas

```text
data/*.json ──fetch──▶ loader.js (cache memori + SW)
                                │
                                ▼
                        engines (sim/vn/wa) ──emit──▶ events.js ──▶ screens (render DOM di PhoneFrame)
                                                                    │
                            store.js ◀── aksi pengguna (pilih, tap flag, isi OTP) ─┘
                                │
                                ▼ persist (debounce 300ms)
                        localStorage["scamurai.v1.*"]  (skema di app-logic.md §2)
```

Satu arah alur: **data → mesin → tampilan → aksi pengguna → store**; komponen tidak boleh memodifikasi `data/` atau memanggil mesin lain secara langsung.
