# Scamurai

Dojo simulasi anti-penipuan berbahasa Indonesia. Kamu memainkan penipuan sungguhan di dalam ponsel tiruan — lengkap dengan konsekuensi, debrief di balik layar penipu, dan langkah pemulihan. Semua uang, nomor, rekening, dan merek adalah fiktif.

**Situs:** https://cingmen.github.io/scamurai/

## Isi

- **8 skenario:** Task Scam, Bank & OTP, Pinjol Ilegal, Marketplace, Kerja Luar Negeri, Money Mule, Love Scam (visual novel 5 bab), dan Phishing.
- **Dojo grup:** observasi 4 hari dalam grup investasi palsu (42 beat, 7 aktor).
- **ScamDEX:** 8 kartu modus + varian yang terbuka dari ending tertentu.
- **Ujian akhir:** pool 40 soal, 20 soal per percobaan, tiga tipe soal, lulus ≥ 80.
- **Sertifikat:** canvas 1200×850, kode deterministik, unduh/bagikan. Bukti edukasi komunitas, bukan sertifikasi resmi.
- **Mode Lansia & Sekolah:** teks besar tanpa timer, paket 45 menit, lembar guru siap cetak, kartu kemajuan siswa.
- **Pusat Bantuan:** alur "baru saja kena", kanal resmi, dan langkah pemulihan — bisa dibuka offline.
- **PWA:** service worker, cache data, dan progres lokal di `scamurai.v1`.

## Menjalankan lokal

Tidak ada build step dan tidak ada dependensi runtime.

```bash
python3 -m http.server 4173
# buka http://localhost:4173/
```

Semua path relatif, jadi aplikasi juga berjalan dari subfolder GitHub Pages (`/scamurai/`).

## Validasi

```bash
node scripts/validate-data.mjs   # konten: goto, flag, ending, debrief, soal ujian
node --check js/main.js          # sintaks modul (Node ≥ 20, package.json type=module)
```

CI menjalankan keduanya pada setiap push dan pull request (`.github/workflows/validate.yml`). Validator memeriksa:

- setiap `goto` menunjuk langkah yang ada dan setiap ending dapat dicapai dari langkah pertama;
- minimal 3 red flag non-decoy, 2 ending, dan 3 langkah pemulihan per skenario;
- struktur VN (node, choice, endingRules), minigame ≥ 40 beat, pool ujian ≥ 40 soal;
- tidak ada `TODO`/placeholder di data inti.

## Struktur

```text
index.html            shell + nav + header saldo/sabuk
css/                  tokens, base, components, 8 layar
js/core/              store, events, loader, format, progress, sfx, dom
js/engines/           sim, step-renderers, app-views, vn, wa
js/screens/           beranda, brief, pemain, debrief, scamdex, ujian, sertifikat, pengaturan, sekolah, bantuan
js/components/        phone frame, chat, flag-tap, keypad, modal, share, dll.
data/scenarios/       8 JSON skenario
data/exam/            pool ujian
data/minigames/       grup Fabel Investasi
scripts/              validator konten
```

## Privasi

Tidak ada backend, akun, cookie, atau analitik pihak ketiga. Font dan seluruh aset di-host sendiri. Progres hanya tersimpan di `localStorage` perangkat dan dapat diekspor sebagai kode `SCR1.…`, diimpor, atau dihapus dari Pengaturan.

## Menambah konten

1. Tambah skenario di `data/scenarios/<id>.json` dan daftarkan di `data/manifest.json`.
2. Gunakan tipe langkah yang sudah ada (`chat`, `sms`, `call`, `choice`, `flag-tap`, `browser`, `app-ui`, `permission`, `input-otp`, `consequence`, `lesson`).
3. Sertakan `brief`, minimal 3 flag, minimal 2 ending, `debrief.anatomi` + `aliran` + `pulihkan`.
4. Jalankan `node scripts/validate-data.mjs` sebelum commit.

Semua teks dari JSON dirender sebagai text node, bukan HTML mentah. Jangan menambahkan domain, nomor, atau merek nyata ke data simulasi.

## Kredit & lisensi

Dibuat untuk edukasi komunitas. Maskot Kenji, seluruh ilustrasi, dan naskah skenario dibuat untuk proyek ini. Produk saudara: [PhisQuest](https://cingmen.github.io/phisquest).

MIT — lihat [LICENSE](LICENSE). Sertifikat Scamurai bukan sertifikasi resmi pemerintah dan bukan lisensi profesional.
