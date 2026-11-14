# Alur Review Lokalisasi Scamurai

Status saat ini: **`pending-native-review`**. Katalog `jv-ID` dan `en` adalah
draf mesin. Dokumen ini mengatur cara penutur asli dan editor memverifikasi
draf tersebut; dokumen ini bukan bukti bahwa review sudah dilakukan.

## Peran wajib

| Locale | Reviewer | Fokus |
| --- | --- | --- |
| `jv-ID` | Satu penutur asli Jawa (ngoko) | Kealamian, tingkat tutur, istilah sehari-hari, dan kesetiaan makna |
| `en` | Satu editor bahasa Inggris | Tata bahasa, istilah keamanan, nada, dan konsistensi |

Keduanya harus menyelesaikan checklist masing-masing. Satu reviewer tidak
boleh menandatangani locale yang bukan keahliannya. Jika tersedia, minta
seorang praktisi keamanan memeriksa istilah kritis; ini tambahan, bukan
pengganti dua peran wajib di atas.

## Prasyarat

```bash
npm run check                 # data, store, i18n, Studio, aset, prerender
npm run i18n:review           # status review dan 26 istilah keamanan
npm run test:i18n             # cakupan string data 13 skenario
python3 -m http.server 4173   # lalu buka http://localhost:4173/
```

Katalog yang direview:

- `i18n/id.json` — sumber Indonesia, bukan objek review.
- `i18n/jv-ID.json` — draf Jawa ngoko.
- `i18n/en.json` — draf Inggris.
- `i18n/security-glossary.json` — istilah kanonis yang tidak boleh ditafsirkan bebas.
- `i18n/review-status.json` — status, reviewer, tanggal, dan checklist.

## Langkah review

1. **Bekukan versi.** Catat `catalogVersion` dari `i18n/review-status.json`
   dan hash commit yang direview. Jika katalog berubah, review harus diulang.
2. **Pilih locale.** Buka `#/pengaturan`, pilih `Jawa (draf)` atau
   `English (draft)`. Pastikan halaman reload dan pilihan tetap setelah reload.
3. **Sapu UI.** Periksa header, navigasi, beranda, galeri skenario, pengantar,
   dialog, toast, pengaturan, pengingat, Pusat Bantuan, Tentang, ScamDEX,
   ujian, sertifikat, Mode Sekolah, lembar guru, dan Studio. Cari teks
   Indonesia yang tertinggal, teks terpotong, dan istilah yang berubah makna.
4. **Sapu 13 skenario.** Untuk setiap skenario, baca judul, deskripsi, semua
   langkah, pilihan, consequence, petunjuk red flag, ending, dan debrief:
   - `task-scam`
   - `bank-otp`
   - `pinjol`
   - `marketplace`
   - `kerja-luar-negeri`
   - `money-mule`
   - `love-scam`
   - `phishing`
   - `tiket-konser`
   - `qris-palsu`
   - `voice-clone`
   - `crypto-invest`
   - `menu-cloning`
5. **Sapu istilah keamanan.** Gunakan tabel di bawah. Periksa juga teks
   sekitar istilah: jangan sampai terjemahan membuat langkah berbahaya
   terdengar aman, atau menyarankan membagikan OTP/PIN/CVV/frasa pemulihan.
6. **Sapu alur non-skenario.** Ujian 20 soal, kuis kelas 10 soal, hasil dan
   penjelasan, sertifikat, pengingat, impor/ekspor SCR2, Studio, dan pesan
   error/validasi.
7. **Uji PWA/offline.** Dengan locale terpilih, jalankan:

   ```bash
   npm run verify:pwa -- http://localhost:4173/ bank-otp
   ```

   Uji juga `en` dan `jv-ID`; pastikan tidak ada layar kosong, `consoleErrors`
   kosong, dan pilihan bahasa tetap setelah reload. Skrip ini juga memindai
   rute utama serta setiap langkah dialog ketiga belas skenario, lalu gagal
   bila teks sumber Indonesia atau bocoran bahasa masih tampil di locale
   yang seharusnya sudah diterjemahkan.
8. **Catat temuan.** Temuan kritis (istilah keamanan salah, langkah berbahaya
   menjadi ambigu, atau teks Indonesia yang membingungkan) harus diperbaiki
   dan direview ulang sebelum sign-off.
9. **Sign-off.** Hanya setelah seluruh checklist locale lulus, isi
   `i18n/review-status.json`:

   ```json
   {
     "status": "approved",
     "reviewer": "Nama reviewer",
     "reviewedAt": "2026-11-30",
     "catalogVersion": 1,
     "checklist": {
       "ui": "passed",
       "scenarios": "passed",
       "securityTerms": "passed",
       "pwa": "passed"
     }
   }
   ```

   Setelah **kedua** locale approved, ubah katalog terkait menjadi
   `draft: false` dan `reviewStatus: "reviewed"`, lalu perbarui ROADMAP.
   Jangan mengubah status sebelum review benar-benar terjadi.
10. **Re-review wajib** jika ada perubahan string, skenario baru, perubahan
    istilah keamanan, atau `catalogVersion` naik.

## Checklist istilah keamanan

Nilai ini harus sama persis dengan `i18n/security-glossary.json`. Istilah
kanonis tidak boleh diterjemahkan menjadi sinonim yang mengaburkan risiko.

| Istilah (id) | English | Jawa (ngoko) | Level | Aturan |
| --- | --- | --- | --- | --- |
| OTP | OTP | OTP | kritis | Jangan diganti menjadi “kode biasa” |
| PIN | PIN | PIN | kritis | Jangan disamakan dengan password |
| CVV | CVV | CVV | kritis | Jangan diterjemahkan menjadi “kode rahasia kartu” |
| Phishing | Phishing | Phishing | kritis | Ejaan `Phishing`, bukan `Phising` |
| Rekening | Account | Rekening | tinggi | Dalam konteks bank, bukan akun media sosial |
| Rekening penerima | Recipient account | Rekening panampa | kritis | Harus jelas pihak penerima |
| Transfer | Transfer | Transfer | kritis | Jangan memakai “kirim hadiah” |
| Transfer bank | Bank transfer | Transfer bank | kritis | Bedakan dari dompet digital |
| Escrow | Escrow | Escrow | tinggi | Pertahankan atau jelaskan dana ditahan platform |
| Money mule | Money mule | Money mule | kritis | Jangan memakai “kurir uang” |
| Pinjol ilegal | Illegal online loan | Pinjol ilegal | kritis | Harus menyebut ilegal/tidak berizin OJK |
| Red flag | Red flag | Tanda bahaya | tinggi | Harus bermakna tanda bahaya yang bisa diperiksa |
| Deepfake | Deepfake | Deepfake | kritis | Pertahankan istilahnya |
| Recovery phrase | Recovery phrase | Frasa pemulihan | kritis | Jangan pernah menyarankan membagikannya |
| Seed phrase | Seed phrase | Frasa seed | kritis | Rahasia dompet kripto |
| QRIS | QRIS | QRIS | tinggi | Nama sistem pembayaran, jangan diterjemahkan |
| Merchant | Merchant | Merchant | tinggi | Jangan disamakan dengan rekening pribadi |
| OJK | OJK | OJK | kritis | Nama otoritas, jangan diterjemahkan |
| lapor.go.id | lapor.go.id | lapor.go.id | kritis | Alamat kanal resmi harus persis |
| cekrekening.id | cekrekening.id | cekrekening.id | kritis | Alamat kanal resmi harus persis |
| Komdigi | Komdigi | Komdigi | kritis | Nama kanal resmi, jangan diterjemahkan |
| SIM swap | SIM swap | SIM swap | tinggi | Jelaskan pengambilalihan nomor |
| Remote access | Remote access | Akses jarak jauh | kritis | Harus jelas orang lain dapat mengendalikan perangkat |
| APK | APK | APK | tinggi | Jangan menyebutnya aplikasi biasa tanpa peringatan |
| Kode OTP | OTP code | Kode OTP | kritis | Jangan disamarkan menjadi kode verifikasi umum |
| Kode verifikasi | Verification code | Kode verifikasi | kritis | Boleh untuk non-OTP, jangan menyamarkan OTP |

## Sign-off per locale

Salin blok ini ke issue/PR review dan isi hanya setelah pemeriksaan selesai.

```text
Locale: jv-ID / en
Reviewer:
Tanggal:
Commit:
catalogVersion:
[ ] UI dan dialog
[ ] 13 skenario (judul, langkah, pilihan, consequence, lesson, debrief)
[ ] Ujian, sekolah, sertifikat, bantuan, Studio
[ ] Istilah keamanan (26/26)
[ ] PWA/offline dan persistensi bahasa
[ ] Tidak ada temuan kritis yang belum diselesaikan
```

## Status dan larangan klaim

`npm run i18n:review` akan menolak status `approved` yang tidak memiliki
reviewer, tanggal, versi katalog yang cocok, dan checklist yang lulus. Status
sekarang tetap **pending**; jangan menyebut lokalisasi “selesai” atau
“diverifikasi penutur asli” sebelum dua sign-off di atas ada.
