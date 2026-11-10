# ROADMAP — Scamurai (0% → 100%)

> Rencana kerja dari nol sampai rilis penuh untuk implementasi vanilla HTML/CSS/JS di GitHub Pages (tanpa framework, tanpa build step). Setiap fase punya: tujuan, daftar tugas, file yang dibuat/ubah, kriteria selesai (Definition of Done), dan target persentase kemajuan total. Estimasi durasi mengasumsikan **1 developer** dengan ritme santai (±2–4 jam/hari); kalikan/dibagi sesuai jumlah orang.

> **Status implementasi 10 November 2026.** F0–F6 sudah diimplementasikan dan ter-deploy. F7 sudah mencakup PWA offline, precache 100 entri, README/About/404, CI, dan GitHub Pages; setelah prerender shell beranda, Lighthouse live **median 95/100/100/100** (target performa ≥90 tercapai). Review praktisi, uji kegunaan 5 lansia/5 remaja, dan uji perangkat fisik belum dijalankan, sehingga F7 sengaja belum dicentang penuh.

## 0. Cara Membaca Roadmap

- **Persentase** = kemajuan total proyek v1.0 yang bisa didemokan, bukan jumlah baris kode. Fase hanya dianggap selesai bila seluruh **DoD**-nya lolos.
- **Aturan kekal:** setiap fase menghasilkan versi yang *selalu bisa dibuka* di GitHub Pages (deploy dari branch `main` setiap akhir fase). Tidak ada fase yang "merusak demo sebelumnya".
- Angka fase: **F0 → F7** (8 fase). Setelah F7, proyek v1.0 = **100%**; backlog v1.1+ dicatat di §10.

| Fase | Nama | % Kumulatif | Durasi kasar |
|---|---|---|---|
| F0 | Fondasi & kerangka | 0 → 10% | 3–5 hari |
| F1 | Core loop + skenario pertama (Task Scam) | 10 → 25% | 6–8 hari |
| F2 | VN engine + Love Scam | 25 → 38% | 7–9 hari |
| F3 | Mesin grup WA (Grup Fabel Investasi) + Tap Red Flag polos | 38 → 48% | 4–6 hari |
| F4 | Progres: ScamDEX, sabuk, Saldo Dojo lintas skenario | 48 → 58% | 4–5 hari |
| F5 | 5 skenario tersisa (Bank&OTP, Pinjol, Marketplace, Kerja LN, Money Mule, Phishing*) | 58 → 82% | 12–15 hari |
| F6 | Ujian akhir, sertifikat, Mode Lansia & Sekolah, Pusat Bantuan | 82 → 92% | 6–8 hari |
| F7 | PWA/offline, QA, konten review, rilis v1.0 | 92 → 100% | 5–7 hari |

\* Phishing masuk F5 dengan konten "Tautan Terlarang" hasil penyesuaian terhadap PhisQuest (PRD §10).

## F0 — Fondasi & Kerangka (0 → 10%)

**Tujuan:** repo hidup di GitHub Pages dengan kerangka aplikasi, bingkai ponsel, router, dan store — tanpa konten skenario.

**Tugas:**
- [ ] Buat repo `scamurai`, struktur folder persis `structure.md` §2; `.github/workflows/validate.yml` (jalankan `validate-data.mjs`).
- [ ] `index.html` + `js/main.js` bootstrap; hash router dengan rute kosong (placeholder tiap layar); guard dasar.
- [ ] `tokens.css` + `base.css` dari `styles.md` §3 (dua tema + 3 skala font).
- [ ] Komponen `PhoneFrame` + `StatusBar` + watermark SIMULASI; latar dojo desktop.
- [ ] `store.js` + `events.js` + `loader.js` (fetch JSON + cache); `format.js`.
- [ ] `manifest.json` registry (8 skenario, status "segera") + layar beranda statis pertama.
- [ ] Deploy GitHub Pages (project page), uji path relatif di `/scamurai/`.

**DoD:**
1. Buka URL Pages → beranda tampil, tema sumi/washi bisa ganti, skala font 3 tingkat bekerja.
2. Navigasi hash antar rute placeholder tanpa error console; refresh di rute mana pun tetap jalan.
3. Tidak ada aset eksternal (font lokal); ukuran total < 500 KB.
4. CI hijau (validator jalan, belum ada data skenario → melewati).

## F1 — Core Loop + Skenario Pertama "Task Scam" (10 → 25%)

**Tujuan:** satu skenario lengkap end-to-end membuktikan seluruh pola (data → engine → render → state → debrief) sebelum mass-producing konten.

**Tugas:**
- [ ] `sim-engine.js` + `step-renderers.js` untuk tipe: `chat`, `sms`, `choice`, `consequence`, `lesson` (tipe lain menyusul).
- [ ] Komponen `ChatBubble`, `ChoiceList`, `Toast`, `Modal`, `ProgressBar`.
- [ ] `data/scenarios/task-scam.json` lengkap: brief, ≥14 langkah, 3 ending, debrief anatomi + pulihkan (aliran uang menyusul F4).
- [ ] Layar `scenario-brief` + `sim-player` + `debrief` (versi pertama: teks + timeline).
- [ ] Saldo Dojo awal + efek `saldoDelta`; resume `lastStep`; keluar-tengah-jalan dengan konfirmasi.
- [ ] Onboarding 3 layar + kalibrasi ritme (`santai/normal/nyata`).
- [ ] SFX dasar (`tap`, `success`, `danger`) + `sfx.js`/`haptics.js`.

**DoD:**
1. Main Task Scam dari brief → simulasi → ending → debrief tanpa jalan buntu; 3 ending bisa dicapai.
2. Refresh di tengah skenario → resume benar; saldo tersimpan.
3. Ritme santai menghapus semua timer.
4. Lighthouse mobile: performa ≥ 85, a11y ≥ 90.

## F2 — VN Engine + Love Scam (25 → 38%)

**Tujuan:** mesin visual novel berfungsi penuh dan skenario love scam jadi flagship.

**Tugas:**
- [ ] `vn-engine.js`: graph traversal, variabel `trust/awareness`, evaluator kondisi aman (tanpa `eval`), ending matrix.
- [ ] Komponen VN: bubble narasi, typewriter + skip, riwayat scroll-back, autosave + 2 slot manual, pilih bab.
- [ ] `data/scenarios/love-scam.json`: 5 bab × 8–15 node; cabang sesuai PRD §9.3.
- [ ] Aset: foto profil & foto tiruan (WebP), video "deepfake" 8–10 detik buatan (atau animasi CSS fallback tanpa video).
- [ ] Mekanik videocall node; flag "panggilan selalu singkat".
- [ ] Debrief VN: naskah manipulasi per bab dipasangkan dengan pilihan pengguna.

**DoD:**
1. Keempat ending tercapai dengan kombinasi pilihan berbeda (diuji manual + tabel jalur).
2. Autosave/restore bab benar; riwayat tidak menampilkan node yang belum dicapai.
3. Bahasa tanpa stigma; tombol "keluar cerita" tersedia di semua bab (kesehatan pengguna).
4. Ukuran aset bab ≤ 1,5 MB (lazy load per bab).

## F3 — Grup Fabel Investasi + Tap Red Flag (38 → 48%)

**Tujuan:** minigame observasi grup multi-peserta dan mekanik red flag pada layar hidup.

**Tugas:**
- [ ] `wa-engine.js` (beat berjadwal, percepat 4×, jeda pilihan pengguna, respons dinamis `bertanya`).
- [ ] `data/minigames/wa-grup.json`: ≥ 40 beat, 6 aktor (admin, 4 shill, 1 skeptis), respons manipulasi klasik.
- [ ] Komponen label shill; layar `minigame-wa` + debrief peran tiap aktor.
- [ ] Tipe step `flag-tap` + `app-ui` di `step-renderers`; komponen `FlagTap` (hotspot koordinat + `data-flag` DOM); integrasi ke task-scam (retrofit 4 hotspot).
- [ ] Statistik flag (`stats.flagsTotal/Correct`) + rekap di debrief.

**DoD:**
1. Sesi grup 10–15 menit bisa selesai; keluar/lapor dicatat; debrief menampilkan peran shill.
2. Hotspot flag bekerja di 2 tema × 3 skala font (posisi tak melenceng).
3. Kenji reminder "ada yang belum diperiksa" muncul tepat sekali sebelum aksi kritis.

## F4 — Sistem Progres: ScamDEX, Sabuk, Saldo (48 → 58%)

**Tujuan:** lapisan meta yang mengikat skenario-skenario menjadi satu perjalanan dojo.

**Tugas:**
- [ ] `data/scamdex.json` (8 kartu + varian) + layar `scamdex` (grid, detail, ikon terkunci).
- [ ] Logika buka kartu per ending + varian (app-logic §8.1).
- [ ] `hitungSabuk()` + penerapan di beranda (banner sabuk) & sertifikat.
- [ ] Saldo lintas skenario + "pemulihan 25% saat debrief penuh" (app-logic §8.3).
- [ ] `components/badge-card.js`, `flow-diagram.js` (aliran uang debrief), lengkapi debrief task-scam & love-scam dengan diagram.
- [ ] Pengaturan lengkap: tema, font, ritme, sfx, haptics, Kenji tips, reset, **ekspor/impor kode progres**.

**DoD:**
1. Kartu terbuka permanen; varian bonus terbuka sesuai ending (uji 3 varian).
2. Sabuk naik sesuai tabel (uji setiap ambang).
3. Ekspor→hapus→impor mengembalikan progres identik (checksum lolos).
4. Semua state tersimpan hanya di `scamurai.v1` (audit kunci localStorage).

## F5 — Lima Skenario Tersisa (58 → 82%)

**Tujuan:** mass-produksi konten dengan pola yang sudah terbukti di F1–F3. Urutan pengerjaan satu per satu, **deploy tiap skenario selesai**.

**Urutan & fokus mekanik baru per skenario:**

| # | Skenario | Mekanik baru yang dibangun bersama konten | % tambah |
|---|---|---|---|
| 1 | Bank & OTP ("Kode yang Tak Boleh Dibagikan") | `call` (layar panggilan + skrip beat), `input-otp` (keypad), aplikasi Bank Jayakarta, varian "OJK palsu" | 58 → 65% |
| 2 | Phishing ("Tautan Terlarang") | `browser` (BrowserMini + address bar inspeksi), halaman palsu ber-`data-flag`, kartu rujukan PhisQuest | 65 → 71% |
| 3 | Marketplace ("Harga di Bawah Pasar") | aplikasi LakuPasar (listing, chat penjual, checkout), timer-choice urgency | 71 → 76% |
| 4 | Pinjol ("Cepat Cair, Selamanya Merunduk") | `permission` (centang izin), CairDuit UI, meter tekanan | 76 → 79% |
| 5 | Kerja LN + Money Mule ("Gaji Seribu Dollar" / "Rekening Sewa") | penampil dokumen tiruan, aplikasi bank mutasi asing; dua skenario ringan berbagi aset | 79 → 82% |

**DoD (per skenario):**
1. Validator konten lolos: ≥3 flag, ≥2 ending, `goto` valid, tanpa domain nyata, debrief ≥3 langkah pulihkan.
2. Semua ending dicapai dalam uji jalur; saldoDelta masuk akal (tidak negatif besar tanpa alasan).
3. Resume, ritme, tema, skala font aman di skenario baru.
4. Debrief lengkap: anatomi + aliran uang + pulihkan + (bila relevan) kartu PhisQuest.

**DoD (fase):** 8 skenario + grup WA tampil di galeri dengan status benar; total repo < 30 MB.

## F6 — Ujian, Sertifikat, Mode Khusus, Bantuan (82 → 92%)

**Tugas:**
- [ ] `data/exam/final-exam.json` ≥ 40 soal (3 tipe) + tag skenario; layar `exam` (sampling anti-repetisi, timer nyata-only).
- [ ] Sertifikat: input nama, kode deterministik (app-logic §9.2), render canvas 1200×850, share/unduh; disclaimer "bukan sertifikasi resmi".
- [x] Mode Lansia: aturan paksaan settings (app-logic §10), versi disederhanakan Bank & OTP (subset JSON `simplify: true`), tanpa timer, 2-oppsi.
- [ ] Mode Sekolah: paket 45 menit, layar `#/sekolah`, lembar guru print-friendly, kartu kemajuan siswa (canvas).
- [ ] `data/bantuan.json` + layar `bantuan` (alur "baru saja kena", tabel kanal resmi: cekrekening.id, lapor.go.id, 122, OJK 157 + tanggal verifikasi).
- [ ] Route `#/latihan` → kartu integrasi PhisQuest (tautan dua arah sudah diminta ke repo PhisQuest via issue/PR README).

**DoD:**
1. Lulus ujian ≥ 80 → sertifikat bisa dibuat & dibagikan; gagal → ulang mulus.
2. Mode lansia: alur Bank & OTP selesai tanpa timer dan teks 125% terbaca pada layar 5".
3. Lembar guru tercetak rapi (preview print tanpa bingkai ponsel).
4. Setiap tautan kanal resmi dicek manual + `verifiedAt` terisi.

## F7 — PWA, QA, Review Konten, Rilis (92 → 100%)

**Tugas:**
- [x] `sw.js` precache penuh (shell + data + aset kunci), strategi per jenis (app-logic §11), banner "versi baru tersedia".
- [ ] Audit performa: gambar WebP/AVIF final, audio < 20 KB/berkas, bundle inti < 150 KB gzip; Lighthouse ≥ 90/95/95/100 (perf/a11y/best-practice/seo) di halaman utama. **Catatan 10 Nov 2026: target Lighthouse tercapai (live median 95/100/100/100; CLS 0), tetapi audit aset final belum ditutup.**
- [ ] QA penuh checklist `app-logic.md` §15 + uji perangkat: Android kelas bawah, iOS Safari ≥ 15, desktop 2 browser.
- [ ] Review konten oleh 1 praktisi keamanan/komunitas + uji kegunaan 5 lansia & 5 remaja; catat & perbaiki temuan kritis.
- [x] Konten final: glosarium beranda, README (cara kontribusi, disclaimer etika), halaman Tentang (kredit, lisensi MIT, sumber statistik), `404.html`.
- [ ] Rilis v1.0.0: tag git + catatan rilis; umumkan ke komunitas (termasuk PhisQuest cross-link balik). **Ditahan: F7 belum 100% (review/uji manusia dan audit aset final belum). Tag `v1.0.0` lama sudah ada di `c0ab2c1`; tag publik itu tidak dipindahkan karena memindahkannya destruktif, dan catatan rilis/pengumuman belum dibuat.**

**Catatan audit performa 5 November 2026 (baseline `923c80e`):**
- Lighthouse live bersih: **89/96/100/100**, FCP 1,2 s, LCP 1,8 s, TBT 400 ms, CLS 0.
- Trace: long task **381 ms**; layout pertama **173 ms untuk 330 objek**; paint 27 ms.
- Percobaan yang diuji dan direvert karena memperburuk metrik: CSS lazy + penundaan SW → live **80** (TBT 700 ms); `content-visibility` grid → live **88** (TBT 440 ms).
- **Pembaruan 9 November 2026:** prerender shell beranda menghasilkan live 5 run **88/97/91/97/95 (median 95)** dengan A11y/BP/SEO 100 dan CLS 0; tiga run lokal **85/94/95 (median 94)**, TBT 0 ms pada dua run terakhir. Target performa ≥90 tercapai; F7 tetap terbuka untuk review/QA manusia dan audit aset final.

**DoD rilis:**
1. Semua checklist QA & gaya (styles.md §11) lolos.
2. Offline penuh: buka tanpa jaringan setelah kunjungan kedua → semua skenario + bantuan jalan.
3. Tanpa placeholder tersisa (`grep -r "TODO\|FIXME\|placeholder"` di `data/` kosong).
4. Temuan uji kegunaan kritis = 0.

## 9. Ringkasan Cek Progress (copy ke issue tracking)

```text
[x] F0  Fondasi & kerangka                      (10%)
[x] F1  Core loop + Task Scam                   (25%)
[x] F2  VN + Love Scam                          (38%)
[x] F3  Grup WA + Tap Red Flag                  (48%)
[x] F4  ScamDEX, sabuk, saldo, pengaturan       (58%)
[x] F5a Bank & OTP                              (65%)
[x] F5b Phishing + link PhisQuest               (71%)
[x] F5c Marketplace                             (76%)
[x] F5d Pinjol                                  (79%)
[x] F5e Kerja LN + Money Mule                   (82%)
[x] F6  Ujian, sertifikat, lansia, sekolah, bantuan (92%)
[ ] F7  PWA, QA, review, rilis v1.0             (belum: review & uji pengguna; audit aset final belum)
```

## 10. Backlog Pasca-v1.0 (di luar 100% roadmap ini)

1. Sinkronisasi progres antar perangkat (opsional via kode ekspor yang lebih kaya).
2. Statistik agregat anonim opsional (opt-in, self-host sederhana atau GitHub Issues bot) untuk angka "63% pemain salah di sini" yang hidup.
3. Skenario tambahan: QRIS/menu cloning, penipuan tiket konser, "telepon keluarga palsu (voice clone)", penipuan investasi crypto lanjutan.
4. Editor skenario komunitas (belajar dari PhisQuest: validasi + ekspor paket).
5. Lokalisasi bahasa daerah & Inggris (`i18n/id.json` sudah siap struktur).
6. Integrasi "latihan terjadwal" (spaced repetition: pengingat PWA lokal).

## 11. Prinsip Anti-Gojek Selama Pengerjaan

- **Konten terakhir yang mahal:** mesin dan komponen dulu (F0–F4); konten skenario setelah pola stabil (F5) — ini yang membuat F5 cepat.
- **Satu skenario = satu PR:** mudah direview, mudah di-rollback.
- **Deploy tiap akhir fase:** demo hidup mencegah "dokumen fantasi".
- **Jangan tulis backend:** jika tergoda menambah server (leaderboard global dsb.), pindahkan ke backlog §10 — PRD menetapkan v1.0 statis.
