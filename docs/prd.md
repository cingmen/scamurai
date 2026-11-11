# PRD — Scamurai
### Produk Edukasi Anti-Penipuan Interaktif Berbasis Web (GitHub Pages)

| Item | Keterangan |
|---|---|
| Nama produk | **Scamurai** |
| Tagline | "Asah intuisimu, tumpas penipuan." |
| Versi dokumen | 1.0 |
| Status | Siap diimplementasikan |
| Platform | Website statis mobile-first, di-hosting di GitHub Pages |
| Teknologi | HTML + CSS + JavaScript murni (vanilla), tanpa framework, tanpa build step |
| Dokumen terkait | `structure.md`, `styles.md`, `app-logic.md`, `ROADMAP.md` |
| Produk terkait | [PhisQuest](https://cingmen.github.io/phisquest) (produk saudara, lihat §11) |

---

## Daftar Isi

1. [Ikhtisar Produk](#1-ikhtisar-produk)
2. [Latar Belakang & Masalah](#2-latar-belakang--masalah)
3. [Tujuan Produk & Metrik](#3-tujuan-produk--metrik)
4. [Non-Goals (Di Luar Lingkup)](#4-non-goals-di-luar-lingkup)
5. [Target Pengguna & Persona](#5-target-pengguna--persona)
6. [Konsep Inti: Dojo Anti-Scam di Dalam HP](#6-konsep-inti-dojo-anti-scam-di-dalam-hp)
7. [Pengalaman Pengguna: Onboarding](#7-pengalaman-pengguna-onboarding)
8. [Modul Inti: 8 Skenario Simulasi](#8-modul-inti-8-skenario-simulasi)
9. [Love Scam: Visual Novel dengan Pilihan Cabang](#9-love-scam-visual-novel-dengan-pilihan-cabang)
10. [Phishing & Pembagian Tugas dengan PhisQuest](#10-phishing--pembagian-tugas-dengan-phisquest)
11. [Dojo Latihan: Grup Fabel Investasi](#11-dojo-latihan-grup-fabel-investasi)
12. [Sistem Progres: ScamDEX, Sabuk, dan Uang Simulasi](#12-sistem-progres-scamdex-sabuk-dan-uang-simulasi)
13. [Debrief "Di Balik Layar Penipu"](#13-debrief-di-balik-layar-penipu)
14. [Ujian Akhir & Sertifikat](#14-ujian-akhir--sertifikat)
15. [Mode Lansia & Mode Sekolah](#15-mode-lansia--mode-sekolah)
16. [Pusat Bantuan & Pelaporan](#16-pusat-bantuan--pelaporan)
17. [PWA, Offline & Penyimpanan Lokal](#17-pwa-offline--penyimpanan-lokal)
18. [Persyaratan Teknis](#18-persyaratan-teknis)
19. [Persyaratan Non-Fungsional](#19-persyaratan-non-fungsional)
20. [Metrik Keberhasilan & Evaluasi](#20-metrik-keberhasilan--evaluasi)
21. [Rencana Konten, Riset & Kepatuhan](#21-rencana-konten-riset--kepatuhan)
22. [Risiko & Mitigasi](#22-risiko--mitigasi)
23. [Peta Dokumen Teknis](#23-peta-dokumen-teknis)
24. [Glosarium](#24-glosarium)

---

## 1. Ikhtisar Produk

**Scamurai** adalah website edukasi anti-penipuan berbahasa Indonesia yang mengajarkan kewaspadaan digital melalui **simulasi pengalaman, bukan ceramah**. Alih-alih membaca tips "jangan asal klik link", pengguna memasuki sebuah dojo virtual: setiap pelajaran disajikan sebagai **layar ponsel tiruan (phone mockup)** yang bisa diinteraksi langsung — mengobrol di chat, membuka aplikasi palsu, memasukkan OTP, menekan tombol checkout, atau membalas pesan seseorang yang mendeklarasikan cinta.

Prinsip utama Scamurai: **biarkan pengguna "tertipu" dengan aman**. Kesalahan bukan dihukum, melainkan dijadikan momen belajar terkuat. Ketika pengguna menyerahkan OTP kepada "petugas bank" palsu atau mentransfer uang simulasinya kepada "calon pacar" yang ternyata penipu, ia mengalami sendiri mekanisme psikologis yang dipakai penipu sungguhan — urgensi, takut, serba cepat, rasa berutang budi — lalu mendapat pembongkaran lengkap (debrief) yang menjelaskan skrip penipu, aliran uang, dan cara melapor.

Produk ini berbentuk **Single Page Application (SPA) statis** yang sepenuhnya berjalan di browser tanpa backend: seluruh skenario tersimpan sebagai file JSON, seluruh progres tersimpan di `localStorage` perangkat, dan seluruh halaman dapat di-cache oleh Service Worker sehingga bisa dipakai offline. Penempatannya di GitHub Pages membuat biaya operasional nol, deployment hanya berupa `git push`, dan kode dapat dikontribusikan publik.

Scamurai dirancang saling melengkapi — bukan tumpang tindih — dengan produk saudara **PhisQuest** (https://cingmen.github.io/phisquest). PhisQuest adalah *pelatih pengenalan cepat* (kuis pesan phishing/jelas bukan, 40 skenario, mode Time Attack); Scamurai adalah *dojo simulasi mendalam* (pengalaman utuh satu penipuan dari awal sampai akhir beserta konsekuensinya). Pembagian peran ini dirinci di §10.

**Satu kalimat pitch:** *"Scamurai adalah tempat kamu boleh salah — sebelum salahnya mahal."*

---

## 2. Latar Belakang & Masalah

### 2.1 Konteks

Modus penipuan digital di Indonesia berkembang lebih cepat daripada literasinya. Setiap tahun otoritas menerima puluhan ribu aduan konten dan transaksi mencurigakan; korban bukan hanya kalangan kurang melek teknologi, tetapi juga mahasiswa, pekerja kantoran, hingga profesional yang sadar ada penipuan namun **tetap terjerat di detik kritis**. Penipuan modern tidak menyerang kebodohan — ia menyerang *emosi*: rasa takut (telepon "petugas" yang menyebut kasus pencucian uang), keserakahan (grup investasi dengan grafik profit naik), kasih sayang (kenalan daring yang akhirnya minta bantuan), dan kepincutan (pinjaman online yang cair dalam 5 menit).

### 2.2 Masalah yang diselesaikan

1. **Edukasi statis tidak mengubah perilaku.** Artikel dan infografis dikenali sebagai "tugas mengetahui", bukan keterampilan. Pengguna tahu OTP tidak boleh dibagikan, tetapi saat telepon datang dengan nada panik dan citra resmi, pengetahuan itu kalah oleh tekanan. Keterampilan hanya terbentuk lewat **latihan dalam kondisi menyerupai aslinya** — prinsip yang sama dengan drill pemadam kebakaran.
2. **Tidak ada tempat berlatih yang aman dan murah.** Simulasi sosial nyata (misalnya diserang penipu sungguhan) berisiko; pembelajaran dari kehilangan uang nyata mahal. Belum ada produk Indonesia yang membiarkan orang *mengalami seluruh alur penipuan* — dari pesan pertama sampai uang hilang — dalam lingkungan aman.
3. **Edukasi phishing sudah ada (PhisQuest), tetapi hanya mencakup lapisan pengenalan.** Pengguna bisa jago menilai "pesan ini phishing atau bukan", namun belum pernah *merasakan* apa yang terjadi setelah data diketik di halaman palsu, bagaimana penipu melanjutkan serangan dengan kredensial yang dicuri, dan bagaimana langkah pemulihan dilakukan.
4. **Segmen rentan terlupakan.** Lansia butuh font besar, bahasa sederhana, dan ritme lambat; guru/siswa butuh mode kelas dengan pelaporan sederhana. Produk edukasi eksisting jarang merancang khusus untuk mereka.

### 2.3 Pernyataan masalah

> Orang Indonesia — remaja, orang dewasa produktif, hingga lansia — membutuhkan cara berlatih mengenali dan **menolak** penipuan digital dalam kondisi realistis, aman, gratis, berbahasa Indonesia, dan dapat diakses dari ponsel kelas menengah-bawah tanpa instalasi aplikasi.

---

## 3. Tujuan Produk & Metrik

### 3.1 Tujuan

| # | Tujuan | Cara diukur |
|---|---|---|
| T1 | Pengguna mampu menyebutkan dan **menunjukkan** red flags dari minimal 8 modus penipuan utama | Skor Ujian Akhir ≥ 80, jumlah red flag yang ter-tap benar |
| T2 | Pengguna mengalami konsekuensi kesalahan dalam simulasi dan memahami langkah pemulihan/ pelaporan | Persentase pengguna yang menyelesaikan debrief & membuka Pusat Bantuan |
| T3 | Produk dapat dipakai guru/fasilitator komunitas sebagai alat ajar berdurasi 30–45 menit | Mode Sekolah digunakan; sertifikat dibagikan ulang |
| T4 | Produk berjalan di ponsel kelas bawah, juga offline | Performa Lighthouse ≥ 90; sesi offline terekam lokal |

### 3.2 Metrik yang diukur tanpa server

Karena Scamurai tidak memiliki backend, metrik kuantitatif server-side tidak tersedia dan **tidak boleh dikumpulkan secara diam-diam** (prinsip privasi, lihat §19). Pengukuran dilakukan dengan tiga cara:

1. **Metrik sesi lokal** — ditampilkan di halaman profil pengguna sendiri (jumlah skenario selesai, akurasi red flag, streak ujian). Pengguna dapat mengekspor "kartu kemajuan" sebagai gambar untuk keperluan tugas kelas.
2. **Umpan balik sukarela** — tautan "beri masukan" yang membuka formulir eksternal (Google Forms atau GitHub Issues) dengan persetujuan eksplisit.
3. **Sinyal publik** — jumlah bintang/fork repo, laporan guru komunitas, dan jumlah pengunduhan sertifikat (dari jumlah unduhan aset statis pada rilis tertentu, jika diaktifkan).

---

## 4. Non-Goals (Di Luar Lingkup)

- **Bukan forum pengaduan resmi.** Scamurai mengarahkan ke kanal resmi (cekrekening.id, lapor.go.id, Aduan Konten Komdigi), tidak mengelola aduan.
- **Bukan simulator penipuan aktif.** Tidak ada konten yang dapat disalahgunakan sebagai panduan menipu; skrip penipu di dalam debrief disajikan sebagai anatomi, bukan resep siap pakai.
- **Bukan aplikasi native / Play Store.** Web PWA saja.
- **Bukan platform multi-pemain.** Semua interaksi adalah pengguna vs. simulasi.
- **Tidak ada akun/server pada v1.0.** Progres hanya di perangkat. Sinkronisasi antar perangkat = backlog v1.1+.
- **Tidak menggantikan PhisQuest.** Melengkapi; kuis pengenalan cepat tetap di PhisQuest dan Scamurai menautkannya.

---

## 5. Target Pengguna & Persona

### Persona 1 — Rani, 19, Mahasiswa (segmen utama)
Aktif di marketplace dan media sosial, sering melihat tawaran "kerja like & komisi". Percaya diri tapi belum pernah mengalami penipuan. **Kebutuhan:** simulasi cepat, bahasa gaul, statistik sosial ("mayoritas pemain usiamu salah di langkah ini"), papan skor teman. **Nilai utama:** Task Scam, Marketplace, Love Scam.

### Persona 2 — Bapak Hendra, 47, Kepala Keluarga (segmen rentan finansial)
Punya tabungan, sering menerima SMS "paket tertahan" dan telepon "petugas bank". Skeptis pada aplikasi baru → **tidak boleh ada instalasi**. **Kebutuhan:** alur jelas, font sedang, tombol besar, penjelasan formal. **Nilai utama:** Bank & OTP, Pinjol, Money Mule, Pusat Bantuan.

### Persona 3 — Ibu Sri, 63, Lansia (mode khusus)
Pakai ponsel layar besar untuk keluarga, tahu WhatsApp tapi belum paham URL. Target utama penipuan berkedok telepon keluarga/m Bank. **Kebutuhan:** Mode Lansia — font ekstra besar, teks disederhanakan, satu aksi per layar, tanpa batas waktu, audio penjelasan opsional. **Nilai utama:** Bank & OTP versi sederhana, Pusat Bantuan.

### Persona 4 — Pak Danu, 34, Guru BK / Fasilitator Komunitas
Butuh materi siap pakai 1 sesi 45 menit, dengan hasil yang bisa dinilai. **Kebutuhan:** Mode Sekolah — sesi terpandu, skor kelas (diisi manual/gambar), tautan PhisQuest untuk drill tambahan, materi debrief yang bisa dibaca nyaring. **Nilai utama:** Mode Sekolah, Ujian Akhir + Sertifikat, Debrief.

---

## 6. Konsep Inti: Dojo Anti-Scam di Dalam HP

### 6.1 Metafora

Scamurai memakai metafora **dojo bela diri**: pengguna adalah murid yang mengasah "tebasan intuisi" melawan gerakan penipu. Ini mewarnai seluruh UI (lihat `styles.md`): maskot samurai bernama **Kenji si Kucing Tebas** sebagai pemandu, level kemajuan berbentuk **sabuk** (Putih → Hitam), dan perpustakaan modus penipuan berbentuk **ScamDEX** ("kartu musuh" gaya ensiklopedia).

### 6.2 Layar ponsel tiruan sebagai panggung

Seluruh simulasi berlangsung **di dalam bingkai ponsel** yang dirender di tengah layar (mobile: mengisi layar; desktop/tablet: ponsel dengan latar ruang dojo). Bingkai ini adalah komponen tunggal `PhoneFrame` yang membungkus beragam "aplikasi tiruan":

| Aplikasi tiruan di dalam bingkai | Dipakai di skenario |
|---|---|
| **ChatRiang** (klon chat sejagat: bubble, centang biru, stiker) | Task Scam, Money Mule, Kerja Luar Negeri, Love Scam (VN) |
| **SMS & Telepon** (layar panggilan, daftar SMS, indikator memanggil) | Bank & OTP |
| **Bank Jayakarta** (aplikasi bank tiruan: saldo, transfer, input OTP) | Bank & OTP, Money Mule |
| **LakuPasar** (marketplace tiruan: listing, chat penjual, checkout) | Marketplace |
| **CairDuit** (aplikasi pinjol tiruan: slider pinjaman, izin kontak) | Pinjol |
| **BrowserMini** (peramban tiruan dengan address bar yang bisa diinspeksi) | Phishing |
| **WA Grup** (grup multi-peserta dengan pesan berjadwal) | Grup Fabel Investasi |

Setiap aplikasi tiruan **wajib menampilkan disclaimer SIMULASI** yang tidak mengganggu (watermark sudut + badge di header) agar tidak ada risiko penyalahgunaan tangkapan layar (lihat §21.4).

### 6.3 Mekanik transversal (muncul di semua skenario)

1. **Tap Red Flag.** Di setiap layar simulasi, elemen berbahaya (nomor rekening asing, tautan aneh, tekanan waktu, permintaan OTP, janji profit) dapat ditandai pengguna dengan mengetuknya sebelum aksi kritis. Benar → +Skor Flag dan bubble penjelasan singkat; salah menandai elemen normal → penjelasan kenapa itu wajar. Mekanik ini **menanam refleks pemeriksaan** tanpa berubah menjadi kuis terpisah.
2. **Uang simulasi ("Saldo Dojo").** Pengguna mulai dengan Rp 5.000.000 saldo fiktif yang jelas dilabeli SIMULASI. Kesalahan mengurangi saldo; keputusan tepat dipertahankan; saldo adalah skor emosional yang paling terasa.
3. **Sabar/Tegas meter.** Beberapa cabang memunculkan dua tarikan: "ikut instruksi" vs "menolak & verifikasi". Meter ini bukan penilaian moral, melainkan menampilkan konsekuensi jalur yang dipilih.
4. **Stempel Kenji.** Maskot muncul setiap aksi kritis dengan komentar pendek ("Tunggu! Kenapa dia buru-buru?"). Bisa dimatikan di pengaturan (dipakai untuk Mode Lansia yang butuh sedikit distraksi, atau Mode Dewasa yang butuh imersi).

---

## 7. Pengalaman Pengguna: Onboarding

1. **Landing (tanpa login).** Logo Scamurai, tagline, dua tombol: **"Mulai Latihan"** dan **"Aku Sedang Kena Scam"** (langsung ke Pusat Bantuan — prioritas korban aktif di atas edukasi).
2. **Intro 3 layar (skippable):** (a) dojo & Kenji menyapa; (b) "di sini semua uang palsu, semua nomor palsu, tidak ada data dikirim ke mana pun"; (c) cara main: ketuk red flag, baca baik-baik, jangan buru-buru.
3. **Kalibrasi kecepatan:** pengguna memilih ritme — *Santai* (tanpa timer), *Normal* (timer longgar), *Nyata* (timer menekan). Dapat diubah kapan pun.
4. **Skenario pertama dipandu (Task Scam)** dengan highlight sentuhan pertama-tama, lalu independen.
5. **Simpan otomatis:** progres ditulis ke `localStorage` setiap perubahan penting; tidak ada pendaftaran.

---

## 8. Modul Inti: 8 Skenario Simulasi

Setiap skenario memiliki struktur tetap: **Pengantar (brief) → Simulasi di dalam bingkai ponsel → Debrief → Kartu ScamDEX**. Di bawah ini ringkasan per skenario; alur langkah-per-langkah dan skema datanya ada di `app-logic.md`.

### 8.1 Task Scam — "Pesanan yang Menggugah"
- **Premis:** ChatRiang menerima pesan admin "media sosial X" menawarkan komisi per like/komentar. Nilai kecil dibayar dulu (kepercayaan), lalu tugas "paket beruntun" menuntut deposit.
- **Alur:** 3 tugas gratis terscai → "paket beruntun Rp 250.000" → grafik komisi naik → "sistem error, transfer 1x lagi untuk cair" → eskalasi 2x.
- **Mekanik:** chat dengan pilihan balasan; tap red flag pada "gratis? deposit dulu", "AKUN ERROR", jadwal transfer mendesak; Slider Dojo "ikut" vs "cabut".
- **Akhir:** *Cair* (jalur naif: saldo habis + debrief siklus "Deposit → Error → Deposit"), *Cabut Tepat* (jalur waspada), *Melapor* (jalur terbaik: tangkapan layar → kanal lapor).
- **Pelajaran inti:** pola *free → deposit → error → deposit lagi*; tak ada komisi untuk pekerjaan seperti ini.

### 8.2 Bank & OTP — "Kode yang Tak Boleh Dibagikan"
- **Premis:** Telepon dari "petugas Bank Jayakarta" (atau "pihak OJK"/"polisi siber") menyebut transaksi mencurigakan atas nama pengguna, lalu meminta OTP "untuk pembatalan".
- **Alur:** SMS asli-ish → telepon masuk dengan skrip menekan (kasus pencucian uang, ancaman akun dibekukan) → muncul input OTP palsu → opsional: pindah ke "halaman resmi" (BrowserMini) yang alamatnya mirip.
- **Mekanik:** UI telepon tiruan (layar memanggil, timer); pengguna bisa memilih *menutup telepon dan menelpon nomor resmi di aplikasi bank* — jalur benar; mengetik OTP → konsekuensi dramatis (saldo keluar per detik).
- **Akhir:** *Tegas & verifikasi ulang*, *Kena (OTP dibagikan)* dengan debrief animasi aliran uang, *Hampir kena*.
- **Pelajaran inti:** bank **tidak pernah** meminta OTP; verifikasi memakai kanal resmi; Aduan Konten Komdigi/OJK 157 sebagai jalur aman.

### 8.3 Pinjol Ilegal — "Cepat Cair, Selamanya Merunduk"
- **Premis:** Butuh uang cepat; iklan "cair 5 menit tanpa jaminan". Aplikasi CairDuit meminta izin kontak, foto KTP, saldo, lalu mencairkan jumlah lebih kecil dari yang dijanjikan dengan tenor pendek.
- **Alur:** landing pinjol (bunga "0%" besar, syarat kecil) → form & izin (red flag: akses kontak/kamera) → pencairan kurang → jatuh tempo → pesan teror ke daftar kontak (ditampilkan di layar ChatRiang palsu sebagai "dampak") → opsi pelaporan.
- **Mekanik:** layar perizinan berupa **daftar centang** — pengguna dapat mencoba menolak izin dan melihat alur macet/mencair; meter "tekanan" naik dengan pesan beruntun.
- **Akhir:** *Terjebak*, *Batal sebelum izin* (terbaik), *Terjerat lalu melapor* (OJK 157, kanal aduan).
- **Pelajaran inti:** cek legalitas via OJK; izin kontak = alat teror; cicilan ganda & rollover.

### 8.4 Marketplace — "Harga di Bawah Pasar"
- **Premis:** LakuPasar menampilkan barang laris dengan harga 40% di bawah pasar, penjual mendesak pindah ke WhatsApp dan mengirim **tautan checkout palsu**.
- **Alur:** browsing listing → chat penjual (dibuat serba cepat) → tautan "laku-pasar-pay.xz" → halaman checkout palsu di BrowserMini (address bar bisa diperiksa, sertifikat "aman" palsu) → pembayaran via transfer pribadi.
- **Mekanik:** Tap Red Flag di halaman palsu (domain typo, logo murahan, rekening pribadi bukan "PT"); pilihan "bayar di aplikasi resmi" vs "ikuti tautan".
- **Akhir:** *Checkout resmi & escrow*, *Kena transfer langsung*, *Batal + blokir + lapor*.
- **Pelajaran inti:** penjual mendesak keluar platform = tanda bahaya; cek riwayat & metode escrow; domain.

### 8.5 Kerja Luar Negeri — "Gaji Seribu Dollar"
- **Premis:** ChatRiang ditawari kerja di luar negeri gaji fantastis tanpa wawancara; diminta bayar biaya visa/pelatihan, data paspor difoto.
- **Alur:** pesan rekruter → "surat penawaran" (PDF tiruan penuh typo & logo) → form data pribadi → minta biaya → cabang: bayar / tanyakan nomor resmi perusahaan / periksa di kanal resmi.
- **Mekanik:** penampil dokumen tiruan (dokumen bisa "diperbesar" dan red flag terlihat — email domain publik, nomor rekening pribadi, nama perusahaan mencurigakan).
- **Akhir:** *Bayar & hilang kontak*, *Verifikasi & kabur dari umpan*, *Dilindungi data*.
- **Pelajaran inti:** perusahaan sah tidak memungut biaya rekrutmen; cek legalitas via kanal resmi ketenagakerjaan.

### 8.6 Money Mule — "Rekening Sewa"
- **Premis:** Ditawari "gaji mingguan" hanya dengan **menyewakan rekening/ATM/akun e-wallet** — pintu masuk menjadi pelaku pencucian uang.
- **Alur:** chat rapi & sopan → penjelasan "tugas admin keuangan" → rekening menerima aliran asing → uang diminta diteruskan → dampak: rekening diblokir, panggilan dari penyidik (simulasi), status hukum.
- **Mekanik:** aplikasi bank tiruan menampilkan mutasi asing; pengguna memilih meneruskan / menolak / menutup rekening & lapor.
- **Akhir:** *Jadi tersangka*, *Menutup sebelum terlambat*, *Menolak sejak awal*.
- **Pelajaran inti:** menyewakan rekening = kriminal; cekrekening.id untuk memeriksa rekening asing.

### 8.7 Love Scam — "Cinta di Balik Layar" (Visual Novel)
Rinci di §9.

### 8.8 Phishing — "Tautan Terlarang"
Rinci di §10 (dengan penyesuaian terhadap PhisQuest).

---

## 9. Love Scam: Visual Novel dengan Pilihan Cabang

### 9.1 Mengapa visual novel

Love scam adalah penipuan yang berjalan **berminggu-minggu** dan bertumpu pada *hubungan*, bukan satu pesan. Format kuis tidak sanggup menghadirkan pelecehan emosi bertahap itu; format visual novel dengan pilihan percakapan membuat pengguna **merasa ikut jatuh** — lalu menyadari tanda-tanda yang ia abaikan.

### 9.2 Struktur cerita

- **Protagonis simulasi:** profil pengguna netral (tanpa nama asli; panggilan "Kamu"). 
- **Tokoh penipu:** "Bagas" — profil dipinjam dari foto pencurian identitas; karakter memakai naskah klasik love scam (petrochemical engineer/pekerja lepas di luar negeri, cerita sakit keluarga, janji menemui).
- **Panjang:** 5 bab (Perkenalan → Pemanasan → Krisis palsu → Permintaan pertama → Eskalasi & akhir), tiap bab 8–15 simpul dialog.
- **Ketukan waktu:** antar bab terdapat "skip waktu" 2 minggu — mencontohkan pacaran daring yang buru-buru menaikkan intensitas.

### 9.3 Mekanik

1. **Pilihan balasan** (2–4 opsi tiap simpul) dengan dua sumbu tersembunyi: **Kepercayaan** dan **Kewaspadaan**. Tidak ada opsi "salah" di awal; semua opsi membangun rasa relasi — sama seperti penipu sungguhan.
2. **Twist AI/deepfake:** di Bab 3, penipu mengirim "video call singkat" (di simulasi: wajah halus-artifisial, video 10 detik, audio patah "sinyal buruk"). Pengguna dapat menandai red flag: permintaan panggil selalu singkat, penolakan panggil panjang.
3. **Moments bercabang** dengan penanda:

| Cabang | Syarat | Isi |
|---|---|---|
| **Hubungan hangat** | Kepercayaan tinggi | Permintaan uang untuk "bea pengeluaran" |
| **Hubungan meragukan** | Kewaspadaan menengah | Penipu menekan dengan rasa bersalah |
| **Hubungan berakhir tepat** | Kewaspadaan tinggi | Pengguna memverifikasi foto via pencarian gambar terbalik (simulasi hasil) |

4. **Ending matrix:** 4 ending utama (*Kena total* / *Kena sebagian* / *Selamat dengan luka* / *Mencegah sejak awal*) + epilog debrief yang menampilkan **naskah manipulasi penipu per bab** (love bombing, grooming, urgency, isolation).
5. **Fasilitas VN:** riwayat dialog (scroll back), penanda bab, kecepatan teks, skip baca ulang, simpan otomatis per bab, dua simpan manual.

### 9.4 Kepekaan konten

Tidak ada gambar romantis eksplisit; relasi digambarkan lewat teks dan emoji netral. Ending debrief menekankan: korban love scam **bukan bodoh atau bodoh bercinta** — penipu profesional yang menjalani skrip; bahasa tanpa menstigma (lihat §21).

---

## 10. Phishing & Pembagian Tugas dengan PhisQuest

### 10.1 Hasil analisis tumpang tindih

PhisQuest (v1.6.x) telah menyediakan, dengan kualitas baik:
- 40 skenario pesan phishing/legitimate dalam 4 paket (E-Wallet & Bank, Kehidupan Kantor, Belanja & Kurir, Kampus & Pemerintahan);
- tiga tipe soal: **tentukan phishing/jelas bukan**, **pilih tindakan terbaik**, dan **tandai red flag**;
- gamifikasi XP, streak, level, lencana; mode **Time Attack**; leaderboard lokal; editor skenario berbasis JSON;
- arsitektur statis tanpa framework di GitHub Pages.

Maka tiga rancangan awal Scamurai **dinilai redundan** dan telah diubah:

| Rancangan awal | Status | Keputusan |
|---|---|---|
| Mini-game mandiri "Scam atau Bukan" (soal cepat pesan phishing/jelas bukan, combo, timer) | **Redundan** | Dihapus dari Scamurai; diganti tautan langsung ke PhisQuest di menu **Dojo Latihan** |
| Mini-game mandiri "Cari Red Flag" pada pesan statis | **Redundan** (sama dengan tipe soal red flag PhisQuest) | Dihapus sebagai modul mandiri; mekaniknya **ditanam ke dalam simulasi** sebagai *Tap Red Flag* pada layar hidup (bukan pesan statis) |
| Skenario phishing berbasis pengenalan SMS/email | **Sebagian redundan** | Ditulis ulang menjadi **perjalanan mendalam satu serangan** (lihat 10.2), bukan kumpulan soal pengenalan |

### 10.2 Skenario phishing Scamurai yang baru: "Tautan Terlarang"

Tujuannya **pengalaman akibat**, bukan pengenalan — pengenalan sudah dilayani PhisQuest.

- **Premis:** SMS "paket Anda tertahan — lunasi Rp 25.000" dengan tautan; pengguna membukanya di BrowserMini tiruan.
- **Alur:** SMS → tautan → halaman "KurirNasional" palsu (form kartu/OTP "verifikasi pengiriman") → pengguna **masuk ke dalam** dan mengamati apa yang terjadi → layar "T+3 hari" (simulasi) menunjukkan akibat beruntun: penyalahgunaan kartu, percobaan pinjol atas nama, telepon penipu lanjutan yang **memakai data yang barusan diketik** untuk memperkuat kepercayaan (social engineering berlapis) → debrief pemulihan: blokir kartu, ubah kata sandi, aktifkan 2FA, lapor.
- **Mekanik khas:** address bar BrowserMini dapat diinspeksi kapan saja (zoom domain, tampilkan sertifikat palsu); tombol "periksa tautan" membuka layar perbandingan domain-asli vs domain-umpan (kreatif buatan, bukan domain nyata); **tidak ada batas waktu** agar fokus ke inspeksi.
- **Akhir:** *Kena & pulih* (jalur edukatif penuh), *Tertahan di halaman palsu* (menolak mengisi), *Tidak klik* (terbaik: cek status di aplikasi kurir resmi).
- **Hubungan PhisQuest:** setelah debrief, kartu tautan "Asah kecepatanmu → latihan 40 skenario di PhisQuest".

### 10.3 Prinsip pembagian peran produk

| | PhisQuest | Scamurai |
|---|---|---|
| Bentuk | Kuis pesan (statis) | Simulasi hidup dalam bingkai ponsel |
| Tujuan | Kecepatan & akurasi mengenali umpan | Memahami **alur, tekanan psikologis, dan akibat** |
| Durasi sesi | 3–10 menit, repetitif | 10–25 menit per skenario, naratif |
| Kedalaman | Banyak kasus, lebar | Satu kasus, dalam sampai akibat |
| Fitur khas | Time Attack, editor skenario, leaderboard lokal | VN love scam, debrief naskah penipu, ScamDEX, Mode Lansia/Sekolah, sertifikat, Pusat Bantuan |

Integrasi teknis: tautan keluar biasa (`target="_blank" rel="noopener"`) dua arah di menu Dojo Latihan; tidak ada dependensi kode.

---

## 11. Dojo Latihan: Grup Fabel Investasi

Satu-satunya modul "main mandiri" yang dipertahankan (karena tidak ada di PhisQuest): **simulasi grup WhatsApp investasi multi-peserta**.

- **Premis:** Pengguna "diundang" ke grup "Fabel Trading VIP" oleh kenalan. Selama 4 hari simulasi (dipercepat), grup hidup: testimoni profit, admin posting grafik, **akun-akun bandar (shill)** saling memuji, dan satu suara skeptis yang dibungkam.
- **Mekanik:** pesan berjadwal muncul per interval; pengguna bisa diam, bertanya, atau "melaporkan grup". Bertanya memicu balasan manipulasi klasik (FOMO, gaslighting, bukti palsu). Modul mengajarkan pola **grup-organik-palsu** yang tidak bisa ditangkap oleh kuis satu-pesan.
- **Akhir:** tak ada "menang absolut"; pengguna dinilai dari **kapan ia keluar/melaporkan** dan debrief membedah peran tiap akun bandar.

---

## 12. Sistem Progres: ScamDEX, Sabuk, dan Uang Simulasi

### 12.1 ScamDEX

Ensiklopedia "kartu musuh" gaya Pokédex: 1 kartu per modus penipuan (8 kartu rilis pertama + kartu varian yang terbuka dari jalur akhir tertentu, mis. "Love Scam — Varian Deepfake"). Kartu berisi: nama modus, ikon, tingkat keparahan, psikologi yang dieksploitasi, red flags utama, langkah verifikasi, kanal pelaporan. **Terbuka permanen** setelah skenario selesai (kecuali ending terbaik yang membuka varian bonus).

### 12.2 Sabuk murid

Kemajuan keseluruhan dinyatakan sebagai sabuk dojo: Putih (mulai) → Kuning (2 skenario) → Hijau (4) → Biru (6 + debrief lengkap) → Merah (7 + ujian dicoba) → **Hitam** (8 + ujian ≥ 80). Sabuk memengaruhi latar halaman beranda (semi halus) untuk rasa kemajuan.

### 12.3 Saldo Dojo

Uang simulasi (lihat §6.3) bersifat lintas skenario: penipuan yang "berhasil" pada satu skenario mengurangi saldo yang sama, memperkuat koneksi emosional antar modul ("dolar dojo" bukan skor terpisah). Saldo tidak bisa "dipulihkan" kecuali menyelesaikan debrief penuh (mencontohkan pemulihan yang menyakitkan namun mungkin).

---

## 13. Debrief "Di Balik Layar Penipu"

Setiap skenario diakhiri debrief 3 bagian:

1. **Anatomi serangan** — timeline visual langkah demi langkah dengan naskah penipu (apa tujuan tiap pesan).
2. **Aliran uang** — diagram mule → penadah → luar negeri (statis, ilustratif, tanpa detail operasional).
3. **Jika ini terjadi sungguhan** — langkah pemulihan bernomor + tautan kanal resmi (cekrekening.id, lapor.go.id, Aduan Konten Komdigi, OJK 157).

Debrief Mode Lansia menampilkan versi teks besar 5 langkah tanpa diagram.

---

## 14. Ujian Akhir & Sertifikat

- **Ujian:** 20 soal yang **mengambil dari konteks skenario** (bukan soal umum): "pada skenario Bank & OTP, tindakan benar saat diminta OTP adalah…", identifikasi red flag pada tangkapan layar simulasi (gambar statis dari skenario), dan urutan langkah pemulihan. Diambil acak dari pool ±40 soal. Batas waktu opsional sesuai ritme; nilai lulus ≥ 80.
- **Gagal boleh ulang** setelah membaca ulang ScamDEX (soal diacak ulang); tidak ada shaming — pesan gagal menonjolkan yang benar.
- **Sertifikat:** nama (diketik sendiri, disimpan lokal), sabuk, skor, tanggal, kode verifikasi (hash deterministik dari nama+tanggal+versi, bukan kriptografi resmi — dinyatakan demikian). Dirender ke `<canvas>` → PNG; bagikan via Web Share API / unduh. Teks jelas: **sertifikat edukasi komunitas, bukan sertifikasi resmi pemerintah**.
- **Mode Sekolah:** guru dapat meminta siswa mengekspor kartu kemajuan + sertifikat sebagai bukti tugas.

---

## 15. Mode Lansia & Mode Sekolah

### 15.1 Mode Lansia
- Font dasar 18px→ skala 1.25–1.5×; kontras dinaikkan; **satu keputusan per layar** (pilihan maksimal 2); tanpa timer; Stempel Kenji default aktif (membimbing); ilustrasi besar; pilihan "bacakan layar" via Web Speech API (offline jika browser mendukung, fallback tanpa audio).
- Skenario disarankan: Bank & OTP (versi disederhanakan), Pinjol versi sederhana, Pusat Bantuan.

### 15.2 Mode Sekolah
- Profil "kelas" lokal: guru memilih paket skenario + durasi; siswa progres di perangkat masing-masing.
- Paket sesi 45 menit: 2 skenario + debrief diskusi + ujian 10 soal.
- Lembar guru (halaman cetak-friendly): tujuan, poin diskusi per skenario, tautan PhisQuest untuk drill.
- Tidak ada server kelas; hasil diekspor sebagai gambar/PDF-print.

---

## 16. Pusat Bantuan & Pelaporan

Halaman satu-akses untuk korban aktif (dapat dibuka langsung dari landing):

1. **Yang baru terjadi padamu?** — alur bantu: (a) uang sudah terkirim → langkah darurat (hubungi bank, blokir, lapor Aduan Konten Komdigi); (b) data pribadi bocor → amankan akun; (c) belum kirim apa pun → tutup kontak & simpan bukti.
2. **Cek rekening/akun** — tautan dan penjelasan cekrekening.id (cara pakai).
3. **Lapor** — kanal resmi: lapor.go.id, Aduan Konten Komdigi, OJK 157 (pinjol/investasi) — masing-masing dengan "kapan pakai yang mana" dalam tabel sederhana.
4. **Bantuan psikologis** — pesan destigmatizing + arahan menghubungi orang terpercaya; tanpa nama layanan yang tak terverifikasi.
- Konten halaman ini dikelola sebagai `data/bantuan.json` agar mudah diperbarui; **nomor dan tautan wajib diverifikasi ulang sebelum setiap rilis** (lihat §21.5).

---

## 17. PWA, Offline & Penyimpanan Lokal

- **Manifest PWA:** ikon, tema warna dojo, mode standalone; pengguna dapat "Add to Home Screen".
- **Service Worker:** pre-cache app shell (HTML/CSS/JS/fonts) + seluruh `data/*.json` + aset gambar penting; strategi *cache-first* untuk aset, *stale-while-revalidate* untuk konten data; halaman offline fallback; banner "versi baru tersedia — muat ulang".
- **Storage:** satu namespace `scamurai.v1.*` di `localStorage` (skema lengkap di `app-logic.md`); tombol "Hapus semua data saya" di Pengaturan; tidak ada cookie, tidak ada analitik pihak ketiga.
- **Batas GitHub Pages:** hanya statis → tidak ada penulisan server; semua logika klien; sertifikat digambar lokal; tidak ada layanan pihak ketiga wajib (font di-host sendiri untuk offline penuh).

---

## 18. Persyaratan Teknis

1. **Stack:** HTML5 + CSS3 + JavaScript (ES modules), **tanpa framework, tanpa bundler, tanpa build step**. `index.html` tunggal + hash router (`#/...`) sehingga GitHub Pages tidak butuh konfigurasi rewrite.
2. **Data-driven:** seluruh skenario, minigame grup, pool soal, ScamDEX, dan direktori bantuan berupa file JSON dengan schema validasi (lihat `app-logic.md` §5). Menambah skenario = menambah JSON, tanpa menyentuh kode.
3. **Kompatibilitas:** Chrome/Edge/Firefox/Samsung Internet/Safari iOS 2 versi terakhir; ponsel Android kelas bawah (1.5–2 GB RAM) tetap lancar — tanpa dependensi berat, gambar WebP, lazy load.
4. **Hosting:** GitHub Pages (project page → jalur dasar `/scamurai/`), semua path **relatif** agar portabel; HTTPS otomatis.
5. **Font:** self-hosted `.woff2` subset (Plus Jakarta Sans + monospace untuk SMS/OTP) di `assets/fonts/` — tanpa CDN eksternal agar offline & privasi.
6. **Struktur & konvensi:** rinci di `structure.md`; logika status di `app-logic.md`; sistem visual di `styles.md`.

---

## 19. Persyaratan Non-Fungsional

1. **Privasi:** nol pengumpulan data; tidak ada cookie; tidak ada permintaan izin browser; localStorage dapat dihapus dari UI. Pernyataan privasi ringkas di beranda & footer.
2. **Aksesibilitas:** kontras teks ≥ 4.5:1; target sentuh ≥ 48px; fokus keyboard terlihat; navigasi seluruh aplikasi tanpa mouse; `prefers-reduced-motion` dihormati; ARIA pada komponen kunci (role="dialog", aria-live untuk pesan chat).
3. **Performa:** LCP < 2.5 detik di jaringan 3G cepat; bundle JS inti < 150 KB (gzip) sebelum data; gambar WebP/AVIF.
4. **Etika konten:** tidak ada data pribadi sungguhan; semua merek/nomor/foto fiktif dengan watermark SIMULASI; tidak meniru logo asli persis; skrip penipu disajikan sebagai anatomi pendidikan.
5. **Keandalan offline:** semua alur inti berfungsi tanpa jaringan setelah cache penuh; gagal memuat JSON → tampil pesan ramah + coba cache lama.
6. **Keamanan klien:** tautan eksternal `rel="noopener noreferrer"`; tidak ada `eval`; sanitasi rendering konten JSON (teks di-render sebagai teks, bukan HTML mentah).

---

## 20. Metrik Keberhasilan & Evaluasi

- **Bulanan (manual, dari umpan balik sukarela + sinyal publik):** jumlah pengguna menyelesaikan ≥ 3 skenario (laporan guru), rata-rata penilaian sesi (form 3 pertanyaan), temuan bug.
- **Kualitatif:** uji kegunaan dengan 5 lansia & 5 remaja tiap rilis mayor; checklist guru: "mampu menjelaskan kembali 3 red flags setelah sesi?".
- **Indikator konten:** setiap skenario memiliki ≥ 3 red flags ter-tap dan 1 jalur pemulihan yang dapat dicontoh.

---

## 21. Rencana Konten, Riset & Kepatuhan

### 21.1 Sumber konten
Naskah skenario disusun dari pola kasus publik (laporan media, infografis otoritas, pola umum yang didokumentasikan komunitas keamanan Indonesia). Setiap statistik yang ditampilkan di dalam aplikasi (mis. persentase pengguna yang "tertipu" di langkah tertentu) **wajib menyimpan sumber & tanggal di `data/stats-sosial.json`**; angka tanpa sumber tidak boleh ditampilkan. Sebelum rilis, konten direview oleh minimal satu praktisi keamanan/komunitas.

### 21.2 Gaya bahasa
Bahasa Indonesia santai-formal; istilah teknis dijelaskan pada kemunculan pertama (glosarium §24); tanpa menstigmatiskan korban; humor ringan via Kenji.

### 21.3 Standar penulisan skenario JSON
Tiap skenario menyertakan: tujuan pembelajaran, ≥3 red flags interaktif, ≥2 jalur akhir, debrief lengkap, dan kata-kata pemicu yang dihindari (trauma). Template & schema di `app-logic.md` §5.

### 21.4 Etika simulasi
Watermark "SIMULASI — semua data fiktif" di setiap layar tiruan; logo tiruan dibuat berbeda nyata; tidak ada teknik yang dapat langsung disalin untuk menipu (tanpa kit serangan).

### 21.5 Pembaruan informasi kanal resmi
Nomor/URL kanal resmi direview tiap rilis; halaman Pusat Bantuan menampilkan tanggal terakhir diverifikasi.

---

## 22. Risiko & Mitigasi

| # | Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|---|
| R1 | Tangkapan layar aplikasi tiruan disalahgunakan untuk menipu | Rendah | Tinggi | Watermark permanen, desain logo beda, disclaimert di header |
| R2 | Konten memicu trauma korban lama | Sedang | Sedang | Bahasa tanpa stigma, tombol keluar cepat ke Pusat Bantuan, skip cerita |
| R3 | localStorage terhapus → progres hilang | Sedang | Rendah | Ekspor kode progres (string serial) di Pengaturan; impor kembali |
| R4 | GitHub Pages subpath merusak path aset | Sedang | Sedang | Semua path relatif `./`, uji di `/scamurai/` sejak awal |
| R5 | Nomor kanal resmi berubah | Sedang | Tinggi | Data terpisah `bantuan.json` + checklist verifikasi rilis |
| R6 | Tumpang tindih fitur dengan PhisQuest berkembang | Sedang | Rendah | §10.3 sebagai kontrak produk; review tiap rilis |
| R7 | Safari iOS tua gagal ES modules | Rendah | Sedang | Target Safari ≥ 15; uji perangkat lama sebelum rilis |

---

## 23. Peta Dokumen Teknis

| Dokumen | Isi | Pengguna utama |
|---|---|---|
| `prd.md` (ini) | Produk: what & why | Semua |
| `structure.md` | Struktur file, peta komponen, konvensi | Developer |
| `styles.md` | Token desain, komponen visual, tema dojo | Developer & desainer |
| `app-logic.md` | Status, engine, skema JSON, penyimpanan | Developer |
| `ROADMAP.md` | Fase 0% → 100%, kriteria selesai | PM & developer |

---

## 24. Glosarium

- **Red flag** — tanda bahaya pada pesan/halaman/percakapan yang menandakan penipuan.
- **Phishing** — penipuan menggiring korban membuka tautan palsu dan menyerahkan data/kredensial.
- **Task scam** — penipuan "pekerjaan sederhana berkomisi" yang berujung permintaan deposit.
- **Money mule** — orang yang rekeningnya dipakai meneruskan uang hasil kejahatan.
- **Pinjol ilegal** — layanan pinjaman daring tak berizin, sering disertai teror kontak.
- **Love scam** — penipuan romantis daring jangka panjang berujung permintaan uang.
- **Shill** — akun tiruan di grup yang memanaskan suasana (bukti palsu sosial).
- **ScamDEX** — ensiklopedia modus penipuan dalam Scamurai (kartu koleksi).
- **Debrief** — pembongkaran pasca-simulasi: anatomi serangan, aliran uang, langkah pemulihan.
- **Saldo Dojo** — uang simulasi lintas skenario Scamurai.
- **Tap Red Flag** — mekanik menandai elemen berbahaya di dalam layar simulasi hidup.
- **Phone mockup / Bingkai Ponsel** — komponen UI utama Scamurai yang menampung aplikasi tiruan.
