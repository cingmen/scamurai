# UI / Style Guide — Scamurai

> Sistem visual tema **dojo samurai** untuk website vanilla (CSS murni, tanpa framework). Semua nilai di sini diimplementasikan sebagai CSS custom properties di `assets/css/tokens.css`. Referensi keputusan produk: PRD §6.

## 1. Identitas Brand

| Elemen | Spesifikasi |
|---|---|
| Nama | **Scamurai** (wordmark: "Scam" merah + "urai" krem, huruf tebal ber-aksen katana) |
| Tagline | "Asah intuisimu, tumpas penipuan." |
| Maskot | **Kenji si Kucing Tebas** — kucing samurai berbaju hitsuzan; pose: (a) menenangkan, (b) siap menebas (red flag), (c) tepuk tangan (menang). Digambar garis 2px, ekspresi ramah, bukan agresif. |
| Nuansa | Dojo malam: tinta gelap yang hangat + aksen merah kalm & emas tua. Teras "tenang, disiplin, ramah" — **bukan** horor/hacker gelap. |
| Prinsip visual utama | 1) Bingkai ponsel adalah panggung; 2) merah hanya untuk bahaya/red flag (tidak boleh untuk tombol sekunder); 3) setiap layar tiruan membawa watermark SIMULASI; 4) teks > dekorasi. |

## 2. Tema & Mode

- **Tema default: `sumi` (tinta gelap)** — latar dojo malam, bingkai ponsel terang.
- **Tema alternatif: `washi` (kertas terang)** — untuk Mode Lansia & Mode Sekolah (kontras maksimal di layar proyektor).
- Switch tema via Pengaturan; keduanya dibangun dari token yang sama (lihat §3).
- `prefers-color-scheme` **tidak** dipakai otomatis (pengguna edu kecil lebih ramah dengan tema tetap; lansia selalu terang).

## 3. Design Tokens

### 3.1 Warna (tema `sumi` / default)

```css
:root[data-theme="sumi"] {
  /* Latar dojo */
  --s-bg:            #17141B;   /* latar halaman, tinta gelap keunguan hangat */
  --s-bg-soft:       #201C26;   /* kartu & panel */
  --s-bg-inset:      #2A2530;   /* kolom input, bayangan dalam */
  --s-bg-dojo:       #131018;   /* area di luar bingkai ponsel (desktop) */

  /* Teks */
  --s-ink:           #F2EEE7;   /* teks utama (washi putih hangat) */
  --s-ink-soft:      #C9C2B6;   /* teks sekunder */
  --s-ink-faint:     #8D867C;   /* teks tersier/disabled */
  --s-ink-inverse:   #1B1820;   /* teks di atas permukaan terang */

  /* Aksen brand */
  --s-accent:        #C93A3A;   /* merah kalm — KHUSUS bahaya/red flag & wordmark "Scam" */
  --s-accent-soft:   #3A2024;   /* latar chip bahaya */
  --s-gold:          #D9A441;   /* emas tua — sabuk, badge, skenario aktif */
  --s-gold-soft:     #3A2F1B;   /* latar chip emas */

  /* Status */
  --s-success:       #4FA97F;   /* keputusan tepat, flag benar */
  --s-success-soft:  #1E322A;
  --s-info:          #6C93C4;   /* penjelasan, tip Kenji */
  --s-info-soft:     #1C2A38;
  --s-warn:          #D97E2B;   /* peringatan menengah (urgensi, mendesak) */
  --s-warn-soft:     #382A18;

  /* Dalam aplikasi tiruan (chat, bank, dst.) */
  --s-app-bg:        #F4F1EA;   /* layar aplikasi tiruan selalu terang */
  --s-app-ink:       #22201E;
  --s-app-ink-soft:  #6B675F;
  --s-app-surface:   #FFFFFF;
  --s-app-line:      #E3DFD6;
  --s-bubble-in:     #FFFFFF;   /* bubble pesan masuk */
  --s-bubble-out:    #D6E7D4;   /* bubble pengguna (hijau pudar) */
  --s-app-danger:    #B33939;   /* elemen berbahaya di dalam sim */

  /* Garis & efek */
  --s-line:          #352F3B;   /* garis pembatas di UI dojo */
  --s-shadow:        0 10px 30px rgba(0,0,0,.45);
  --s-shadow-soft:   0 4px 14px rgba(0,0,0,.30);
  --s-focus:         #D9A441;   /* outline fokus keyboard */

  /* Watermark simulasi */
  --s-wm:            rgba(201,58,58,.10);
}
```

### 3.2 Warna (tema `washi` / terang — Mode Lansia & Sekolah)

```css
:root[data-theme="washi"] {
  --s-bg: #F6F2E8;  --s-bg-soft: #FFFFFF;  --s-bg-inset: #EFE9DB;  --s-bg-dojo: #E9E2D2;
  --s-ink: #201C26; --s-ink-soft: #55503F; --s-ink-faint: #7B756A;  --s-ink-inverse: #F6F2E8;
  --s-accent: #B32E2E; --s-accent-soft: #F3DDDD;
  --s-gold: #A4741B;   --s-gold-soft: #F1E4C6;
  --s-success: #2F7D57; --s-success-soft: #DDF0E6;
  --s-info: #2E5E8F;   --s-info-soft: #DFEAF5;
  --s-warn: #A85E14;   --s-warn-soft: #F7E7D2;
  --s-line: #D8D0BF;   --s-focus: #1B4F9C;
  --s-shadow: 0 8px 24px rgba(32,28,38,.14);
  /* --s-app-* identik dengan sumi (aplikasi tiruan selalu terang) */
}
```

**Aturan penggunaan warna:**
- Merah `--s-accent` hanya untuk: red flag, elemen penipuan di dalam sim, badge "berbahaya", wordmark. Tombol utama DOJO memakai emas/tinta, bukan merah.
- `*-soft` dipakai sebagai latar chip/panel berwarna agar teks tetap berkontras.
- Kontras minimal: teks utama 7:1, sekunder 4.5:1, di atas `--s-bg` dan `--s-app-bg`. Setiap warna baru wajib dicek dengan alat kontras sebelum masuk token.

### 3.3 Tipografi

| Token | Nilai | Pakai |
|---|---|---|
| `--s-font-ui` | `"Plus Jakarta Sans", system-ui, sans-serif` | seluruh UI dojo |
| `--s-font-mono` | `"JetBrains Mono", ui-monospace, monospace` | SMS, OTP, domain/URL, nomor rekening |
| `--s-font-story` | `"Plus Jakarta Sans"` italic-weight 500 | narasi VN |

Skala (mobile-first):

```css
--s-fs-900: 2rem;    /* judul layar (32px) */
--s-fs-800: 1.5rem;  /* judul section (24px) */
--s-fs-700: 1.25rem; /* judul kartu (20px) */
--s-fs-600: 1.0625rem; /* teks penting (17px) */
--s-fs-500: 1rem;    /* teks dasar (16px) */
--s-fs-400: .875rem; /* teks sekunder (14px) */
--s-fs-300: .75rem;  /* label, watermark (12px) */
```

- Skala Mode Lansia: `html[data-fontscale="elder"] { font-size: 125%; }` → semua ukuran rem naik proporsional (ada juga `large` = 112.5%).
- Tinggi baris: 1.5 (dasar), 1.65 untuk paragraf panjang/VN; maksimal 60 karakter per baris untuk blok narasi.
- Font di-host sendiri (`assets/fonts/*.woff2`), `font-display: swap`, subset latin.

### 3.4 Spasi, Radius, Border

```css
--s-sp-1: 4px;  --s-sp-2: 8px;  --s-sp-3: 12px; --s-sp-4: 16px;
--s-sp-5: 24px; --s-sp-6: 32px; --s-sp-7: 48px;
--s-radius-s: 8px;   /* chip, input */
--s-radius-m: 14px;  /* kartu, bubble */
--s-radius-l: 28px;  /* bingkai ponsel */
--s-border-w: 1px;
```

Aturan: padding halaman mobile 16px; jarak antar kartu 16px; jarak dalam kartu 12px; **target sentuh minimal 48×48px** (tombol 48px tinggi).

### 3.5 Motion

```css
--s-dur-fast: 120ms;  --s-dur-base: 200ms;  --s-dur-slow: 360ms;
--s-ease: cubic-bezier(.2,.8,.2,1);
```

- Transisi default: opacity + transform 8px (naik). Tanpa animasi memantul.
- Bubble chat baru: fade-slide 200ms dari bawah; VN: typewriter 24ms/karakter (bisa dilewati dengan tap).
- Alarm/urgensi di dalam sim: **bukan** animasi flash agresif; pakai pulsasi lembut pada border chip (1.2s, 2 siklus) + warna `--s-warn`.
- Wajib hormati: `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition-duration: 0ms !important; } }`.

## 4. Bingkai Ponsel (PhoneFrame) — spesifikasi visual

| Bagian | Spesifikasi |
|---|---|
| Ukuran | Mobile: penuh layar (bingkai disembunyikan, konten = layar). ≥768px: bingkai 390×780px, radius `--s-radius-l`, border 8px `--s-bg-inset`, bayangan `--s-shadow`, di tengah latar dojo dengan pola garis lembut. |
| Notch | "Punch-hole" kecil di atas (SVG), bukan Dynamic Island persis. |
| StatusBar | Jam (mengikuti jam nyata), baterai 68%, sinyal 3 bar — memberi rasa hidup tanpa data nyata. |
| Watermark SIMULASI | Teks diagonal `SIMULASI` 12px `--s-wm` berulang (background SVG) + badge merah kecil "SIMULASI" di kanan atas setiap header aplikasi tiruan. Wajib, tidak bisa dimatikan. |
| Konten di dalam | Selalu tema terang `--s-app-*`, font UI, tab bar palsu bila aplikasinya memerlukan (bank: 4 tab; marketplace: 5 tab) — tab palsu nonaktif kecuali yang relevan skenario. |
| Keluar skenario | Tombol ✕ kecil di pojok kiri atas bingkai → modal konfirmasi ("Kemajuan di skenario ini tersimpan."). |

## 5. Spesifikasi Komponen Utama

### 5.1 Tombol (`.c-btn`)
- **Utama** `.c-btn--primary`: latar `--s-gold`, teks `--s-ink-inverse`, radius `--s-radius-s`, tinggi 48px, weight 700. 
- **Sekunder** `.c-btn--ghost`: border `--s-line`, teks `--s-ink`.
- **Bahaya** `.c-btn--danger`: latar `--s-accent-soft`, teks `--s-accent` (dipakai untuk "blokir nomor", "lapor" di dalam sim).
- **Chip pilihan chat** `.c-choice`: bubble pill border 1px, latar `--s-bg-soft`; hover/active naik 1px; disabled 40%.
- Semua tombol: `:focus-visible` outline 2px `--s-focus` offset 2px; active scale(.98).

### 5.2 Bubble chat (`.c-chat`)
- Masuk: latar `--s-bubble-in`, teks `--s-app-ink`, radius 14px dengan ekor kiri; keluar: `--s-bubble-out` ekor kanan.
- Lampiran tiruan (foto profil penipu, "bukti transfer"): kartu 160px dengan ikon jenis file + label; tap → modal pratinjau.
- Label pesan shill (minigame WA): chip kecil `--s-warn-soft` "anggota grup".
- Stempel Kenji: avatar 40px + bubble `--s-info-soft` muncul saat aksi kritis; maksimal 1 stempel aktif, auto-fade 4s.

### 5.3 Red flag (`.c-flag`)
- Hotspot: outline dashed 2px `--s-accent` + glow lembut; tap benar → chip hijau "Red flag! +1" + panel penjelasan (judul, "kenapa berbahaya", "apa yang benar dilakukan").
- Rekap di debrief: daftar flag yang terlewat dengan potongan layar (screenshot dari state, bukan aset nyata).

### 5.4 Kartu skenario (`.c-card-scn`)
Cover 16:9 (`assets/img/scenarios/*.webp`), title 700, chip kesulitan (1–3 katana), status: "Baru" / "Berlangsung" / "Selesai" / "Perlu debrief". Terkunci: ikon gembok + syarat ("Selesaikan Bank & OTP").

### 5.5 Kartu ScamDEX (`.c-card-dex`)
Rasio 3:4; terkunci: siluet + tanda tanya; terbuka: ikon modus + nama + tingkat keparahan (1–3 bendera merah). Varian bonus diberi sudut emas.

### 5.6 Meter (`.c-meter`)
Tinggi 10px radius penuh; kepercayaan = emas, tekanan = merah, saldo dojo = hijau; selalu disertai label teks + angka (tidak hanya warna).

### 5.7 Dialog & toast
- Modal: overlay rgba(0,0,0,.5), kartu `--s-bg-soft` radius-l, role="dialog", tombol utama di kanan; ESC & tap luar menutup (kecuali di tengah aksi kritis sim — modal "keras").
- Toast: bawah layar, `aria-live="polite"`, 2.5s, maksimal 1.

## 6. Layar Aplikasi Tiruan (di dalam bingkai)

| Aplikasi | Warna identitas (di dalam sim) | Catatan gaya |
|---|---|---|
| ChatRiang | header hijau-teal `#128C7E`-ish namun dibedakan → `#0F8A6B` + nama "ChatRiang" | bubble sesuai §5.2; centang biru ganda |
| SMS & Telepon | header abu `--s-app-surface` | font mono untuk isi SMS; layar panggilan: lingkaran avatar besar, timer panggil |
| Bank Jayakarta | header biru tua `#1B3A6B` + logo geometris (bukan logo bank nyata) | saldo besar mono; tombol transfer primary |
| LakuPasar | header oranye `#C2571A` | grid produk 2 kolom; badge "Resmi" vs tanpa badge |
| CairDuit | header ungu `#5B3A8F` | slider pinjaman besar; daftar izin centang |
| BrowserMini | address bar abu terang + ikon gembok (boleh dibeda: gembok abu-abu = "tak terverifikasi") | URL dalam mono; halaman palsu punya tanda halus (logo blur, footer tanpa alamat) |
| Grup WA | sama dengan ChatRiang, header grup | nama grup + "24 anggota" |

Aturan wajib: semua logo/brand tiruan **dibuat dari nol** (bukan modifikasi logo asli), dan header aplikasi memuat badge "SIMULASI".

## 7. Penamaan Kelas CSS & Struktur

```
.c-*        komponen reusable      (c-btn, c-chat, c-phone, c-meter)
.scr-*      blok layar             (scr-home, scr-sim, scr-vn)
.u-*        utilitas               (u-row, u-center, u-mt-4, u-sr-only)
.is-*       state                  (is-active, is-locked, is-danger)
[data-*]    variasi                ([data-theme="washi"], [data-fontscale="elder"])
```

- Satu komponen = satu blok BEM ringan (`.c-chat__bubble--out`).
- Dilarang: styling inline di JS (kecuali nilai dinamis seperti `width` meter), `!important` (kecuali util a11y), selector lebih dari 3 tingkat.

## 8. Ikon, Ilustrasi, Gambar

- Ikon: SVG stroke 2px, radius nyambung, 24×24 grid, sprite `assets/img/icons/sprite.svg` (dipakai via `<use href="./assets/img/icons/sprite.svg#i-flag">`).
- Ilustrasi skenario: flat dengan 2–3 warna token + garis tinta; tanpa foto orang nyata; wajah penipu dibuat abstrak (siluet) untuk menghindari identitas.
- Format: ilustrasi SVG; foto-atmosfer WebP; selalu ada `alt` deskriptif; gambar dekoratif `alt=""` + `aria-hidden`.

## 9. Aksesibilitas Visual (ringkas implementasi)

1. Kontras: cek semua kombinasi token saat mengubah warna (WCAG AA).
2. Skala font 3 tingkat: `normal (100%) / large (112.5%) / elder (125%)` via atribut html; uji tiap layar pada ketiganya.
3. Fokus keyboard: urutan tab logis; outline emas; bingkai ponsel bukan penghalang fokus (konten dalam bingkai tetap focusable normal).
4. Status tidak hanya warna: red flag punya ikon + teks; meter punya label angka; ending punya judul teks.
5. Tanpa timer di Mode Lansia/Santai; timer yang ada menampilkan angka, bukan hanya bar.

## 10. Kanvas Sertifikat (gaya)

Latar washi + bingkai emas garis ganda, wordmark atas, judul "SERTIFIKAT LULUS DOJO", nama (font 900), sabuk (ikon + warna), skor, tanggal, kode verifikasi mono, tanda tangan Kenji (SVG), footer: "Sertifikat edukasi komunitas Scamurai — bukan sertifikasi resmi pemerintah." Ukuran render 1200×850 (PNG).

## 11. Checklist Gaya Saat PR Baru

- [ ] Semua nilai warna/spacing dari token, bukan hardcode.
- [ ] Merah hanya di konteks bahaya.
- [ ] Cek kontras 2 tema × 3 skala font.
- [ ] Target sentuh ≥ 48px; fokus keyboard terlihat.
- [ ] Watermark SIMULASI tampil di setiap layar tiruan baru.
- [ ] `prefers-reduced-motion` diuji (animasi mati).
- [ ] Tanpa gambar > 150KB; ikon baru masuk sprite.
- [ ] Teks di-render sebagai teks (bukan gambar) supaya bisa dibaca screen reader & diterjemahkan.
