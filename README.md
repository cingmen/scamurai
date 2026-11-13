# Scamurai

Dojo simulasi anti-penipuan dengan teks asli Indonesia. Kamu memainkan penipuan sungguhan di dalam ponsel tiruan — lengkap dengan konsekuensi, debrief di balik layar penipu, dan langkah pemulihan. Semua uang, nomor, rekening, dan merek adalah fiktif.

**Situs:** https://cingmen.github.io/scamurai/

## Isi

- **Studio skenario:** editor JSON komunitas dengan validasi 14 langkah, consequence, ketercapaian ending, dan ekspor paket `.scenario.json`.
- **13 skenario:** Task Scam, Bank & OTP, Pinjol Ilegal, Marketplace, Kerja Luar Negeri, Money Mule, Love Scam (visual novel 5 bab), Phishing, Tiket Konser, QRIS Palsu, Voice Clone, Investasi Crypto, dan Menu Cloning.
- **Dojo grup:** observasi 4 hari dalam grup investasi palsu (42 beat, 7 aktor).
- **ScamDEX:** 13 kartu modus + varian yang terbuka dari ending tertentu.
- **Ujian akhir:** pool 40 soal, 20 soal per percobaan, tiga tipe soal, lulus ≥ 80.
- **Sertifikat:** canvas 1200×850, kode deterministik, unduh/bagikan. Bukti edukasi komunitas, bukan sertifikasi resmi.
- **Mode Lansia & Sekolah:** teks besar tanpa timer, varian Bank & OTP 8 langkah dengan maksimal dua pilihan per layar, paket 45 menit, kuis kelas 10 soal tanpa timer, lembar guru siap cetak, kartu kemajuan siswa.
- **Pusat Bantuan:** alur "baru saja kena", kanal resmi (lapor.go.id, cekrekening.id, Aduan Konten Komdigi, OJK 157), tanggal verifikasi, dan langkah pemulihan — bisa dibuka offline.
- **PWA:** service worker, cache data, dan progres lokal di `scamurai.v1`.
- **Bahasa:** katalog `id`, `jv-ID` (Jawa ngoko), dan `en`; pemilih bahasa persisten di Pengaturan dengan fallback locale → Indonesia → teks sumber. `jv-ID` dan `en` masih **draf mesin** dan menunggu review penutur asli.

## Menjalankan lokal

Tidak ada build step dan tidak ada dependensi runtime.

```bash
python3 -m http.server 4173
# buka http://localhost:4173/
```

Semua path relatif, jadi aplikasi juga berjalan dari subfolder GitHub Pages (`/scamurai/`).

## Validasi

```bash
npm run check                    # data + uji store + audit aset + sinkronisasi shell beranda + sintaks inti
npm run test:store               # migrasi data lama, data korup, dan normalisasi state
npm run test:i18n                # pemilihan locale, fallback, dan cakupan data
npm run i18n:review              # status reviewer dan 26 istilah keamanan
npm run test:exam                # pool 10/20 soal, anti-repetisi, dan penilaian ujian
npm run audit:assets             # anggaran audio, gambar, dan bundle aplikasi
npm run prerender:home           # tulis ulang shell index.html setelah mengubah home.js
npm run verify:pwa -- http://localhost:4173/ bank-otp   # offline + metrik (Chrome/CDP)
```

`npm run check` juga memastikan blok `.scr-home` dengan `data-prerendered-home="1"` di `index.html` persis sama dengan hasil render `js/screens/home.js`. Jika markup beranda berubah, jalankan `npm run prerender:home`; check akan gagal sampai shell diperbarui.

### Anggaran aset

`npm run audit:assets` menjaga aset runtime tetap ringan: audio maksimal 20 KB/berkas, gambar raster maksimal 300 KB, SVG maksimal 100 KB, dan seluruh JS + CSS + `index.html` maksimal 150 KB gzip. Audit 13 November 2026: 4 audio (terbesar 19,0 KB), 20 gambar (19 SVG, 1 raster; raster terbesar 273,1 KB), dan 65 berkas aplikasi (114,8 KB gzip). Semua berada di bawah anggaran.

### Pemulihan data

Data dengan `schemaVersion` lebih baru dari kode yang berjalan tidak pernah ditimpa. Payload asli dibiarkan utuh, aplikasi memberi tahu bahwa versi lebih baru diperlukan, dan payload dicadangkan ke `scamurai.v1.backup`. Di **Pengaturan → Pemulihan data**, backup menampilkan alasan, waktu, tombol **Unduh JSON**, dan **Pulihkan** dengan konfirmasi. Restore memvalidasi payload terlebih dahulu; backup korup atau dari schema lebih baru ditolak tanpa mengubah state aktif. `resetAll()` tetap menghapus backup hanya setelah pengguna memilih hapus semua data.

CI menjalankan `npm run check` dan mem-parse semua modul pada setiap push dan pull request (`.github/workflows/validate.yml`). Validator memeriksa:

- setiap `goto` menunjuk langkah yang ada dan setiap ending dapat dicapai dari langkah pertama;
- setiap skenario simulasi versi penuh minimal 14 langkah, dengan minimal 3 red flag non-decoy, 2 ending, dan 3 langkah pemulihan;
- varian Mode Lansia memakai 8 langkah, maksimal dua pilihan per layar, dan semua ending-nya dapat dicapai;
- struktur VN (node, choice, endingRules), minigame ≥ 40 beat, pool ujian ≥ 40 soal;
- tidak ada `TODO`/placeholder di data inti.

## Lokalisasi

Katalog ada di `i18n/id.json`, `i18n/jv-ID.json`, dan `i18n/en.json`. Katalog memakai teks Indonesia sebagai kunci; kunci yang belum ada kembali ke teks Indonesia, lalu ke kunci asli. Pilihan bahasa disimpan di `settings.locale` dan dipertahankan setelah reload. UI memakai katalog lewat helper DOM, sedangkan data skenario, ScamDEX, ujian, bantuan, sekolah, dan Studio dilokalkan di loader JSON.

`jv-ID` dan `en` adalah **draf mesin**, bukan terjemahan tervalidasi. Keduanya belum diverifikasi oleh penutur asli; jangan menganggap lokalisasi selesai sebelum ada review satu penutur asli Jawa dan satu editor bahasa Inggris. Tes `npm run test:i18n` memeriksa pemilihan/fallback serta memastikan seluruh string data 13 skenario ada di kedua katalog. `verify:pwa` juga memindai rute utama dan menolak string sumber Indonesia yang masih tampil di locale `en` atau `jv-ID`. Prosedur review, sign-off, dan daftar periksa 26 istilah keamanan ada di [`docs/I18N-REVIEW.md`](docs/I18N-REVIEW.md); manifest statusnya ada di `i18n/review-status.json`.

## Verifikasi PWA & performa

`scripts/verify-pwa.mjs` menjalankan Chrome headless lewat Chrome DevTools Protocol tanpa dependensi. Skrip mengisi cache service worker, mengukur navigasi, mematikan jaringan, lalu memuat ulang shell dan rute inti. Permintaan lintas-origin dipakai sebagai bukti jaringan benar-benar mati.

```bash
npm run verify:pwa -- http://localhost:4173/ bank-otp
CHROME_PATH="/path/to/chrome" npm run verify:pwa -- https://cingmen.github.io/scamurai/ bank-otp
```

Hasil 5 November 2026 pada https://cingmen.github.io/scamurai/ (Chrome 150, Lighthouse 13.6.0, emulasi mobile bawaan Lighthouse):

| Metrik | Nilai |
| --- | --- |
| Performance | 89 |
| Accessibility | 96 |
| Best Practices | 100 |
| SEO | 100 |
| First Contentful Paint | 1,2 s |
| Largest Contentful Paint | 1,8 s |
| Total Blocking Time | 400 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 3,4 s |
| Time to Interactive | 1,8 s |
| TTFB | 340 ms |
| Total transfer | 165 KiB |

Angka di atas adalah baseline 5 November 2026. Setelah itu beranda diprerender ke `index.html`: live 9 November 2026 memberi performance **88/97/91/97/95 (median 95)**, Accessibility/Best Practices/SEO **100/100/100**, dan CLS **0**; tiga run lokal setelah generator shell memberi **85/94/95 (median 94)**, dengan TBT 0 ms pada dua run terakhir. Target roadmap ≥90 sudah tercapai. Audit aset final juga sudah otomatis lewat `npm run audit:assets`: audio terbesar 19,0 KB, raster terbesar 273,0 KB, dan aplikasi 102,1 KB gzip—di bawah batas 20 KB/300 KB/150 KB. Trace baseline lama menunjukkan satu long task 381 ms dan layout pertama 173 ms untuk 330 objek; percobaan CSS lazy, penundaan precache service worker, dan `content-visibility` pada grid yang menghasilkan live 80/88 sudah direvert. F7 belum dapat ditandai 100% karena review praktisi, uji kegunaan 5 lansia/5 remaja, dan uji perangkat fisik belum dijalankan. Tag `v1.0.0` yang sudah ada di repo menunjuk commit lama `c0ab2c1`; tag publik itu tidak dipindahkan karena gerbang rilis belum terpenuhi dan memindahkannya bersifat destruktif.

Perintah Lighthouse yang dipakai (jalur Chrome disesuaikan dengan sistem):

```bash
npx --yes lighthouse https://cingmen.github.io/scamurai/ \
  --chrome-path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless=new --no-sandbox" \
  --output=json --output-path=/tmp/scamurai-lighthouse.json
```

Uji offline pada origin live: cache `scamurai-v1.3.3` berisi 100 entri; permintaan lintas-origin gagal, tetapi `#/`, pengantar skenario 15 langkah, `#/bantuan`, data JSON, dan CSS tetap termuat tanpa error console.

## Struktur

```text
index.html            shell + nav + header saldo/sabuk
css/                  tokens, base, components, 8 layar
js/core/              store, events, loader, format, progress, sfx, dom
js/engines/           sim, step-renderers, app-views, vn, wa
js/screens/           beranda, brief, pemain, debrief, scamdex, ujian, sertifikat, pengaturan, sekolah, latihan, bantuan
js/components/        phone frame, chat, flag-tap, keypad, modal, share, dll.
data/scenarios/       8 JSON skenario
data/exam/            pool ujian
data/minigames/       grup Fabel Investasi
scripts/              validator konten + generator/check shell beranda
```

## Privasi

Tidak ada backend, akun, cookie, atau analitik pihak ketiga. Font dan seluruh aset di-host sendiri. Progres hanya tersimpan di `localStorage` perangkat dan dapat diekspor sebagai kode `SCR2.…` (termasuk metadata ekspor), diimpor, digabung dengan perangkat lain, atau dihapus dari Pengaturan.

## Menambah konten

1. Tambah skenario di `data/scenarios/<id>.json` dan daftarkan di `data/manifest.json`.
2. Gunakan tipe langkah yang sudah ada (`chat`, `sms`, `call`, `choice`, `flag-tap`, `browser`, `app-ui`, `permission`, `input-otp`, `consequence`, `lesson`).
3. Sertakan `brief`, minimal 3 flag, minimal 2 ending, `debrief.anatomi` + `aliran` + `pulihkan`.
4. Jalankan `npm run check` sebelum commit.

Semua teks dari JSON dirender sebagai text node, bukan HTML mentah. Jangan menambahkan domain, nomor, atau merek nyata ke data simulasi.

## Kredit & lisensi

Dibuat untuk edukasi komunitas. Maskot Kenji, seluruh ilustrasi, dan naskah skenario dibuat untuk proyek ini. Produk saudara: [PhisQuest](https://cingmen.github.io/phisquest).

MIT — lihat [LICENSE](LICENSE). Sertifikat Scamurai bukan sertifikasi resmi pemerintah dan bukan lisensi profesional.
