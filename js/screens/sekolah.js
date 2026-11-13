// Mode sekolah & lembar guru (app-logic.md §10).
import { loadJSON } from '../core/loader.js';
import { all, get, set } from '../core/store.js';
import { h, clear } from '../core/dom.js';
import { renderProgressCard, shareCanvas, downloadCanvas } from '../components/share.js';
import { showToast } from '../components/toast.js';

const DISCUSSIONS = [
  'Mengapa penipu membayar komisi kecil lebih dulu? Apa yang mereka beli dari korban?',
  'Di skenario Bank & OTP, pada detik mana keputusan bisa berubah? Tunjukkan kalimat pemicunya.',
  'Apa perbedaan “merasa aman” dan “sudah memverifikasi”? Beri contoh dari dua skenario.',
  'Siapa yang paling dirugikan ketika seseorang menyewakan rekening? Selain korban, apa akibatnya bagi pemilik rekening?',
  'Langkah pemulihan mana yang paling sering dilewatkan orang, dan mengapa itu berbahaya?',
];

function teacherSheet(manifest) {
  return h('div', { class: 'scr-sekolah' },
    h('div', { class: 'no-print u-spread' },
      h('a', { href: '#/sekolah', class: 'u-small' }, '← Mode sekolah'),
      h('button', {
        type: 'button',
        class: 'c-btn c-btn--primary c-btn--sm',
        onclick: () => window.print(),
      }, 'Cetak lembar guru'),
    ),
    h('article', { class: 'c-teacher-sheet' },
      h('p', { style: { fontSize: '.75rem', letterSpacing: '.12em', textTransform: 'uppercase', color: '#7B756A' } }, 'Scamurai · Lembar guru · SIMULASI'),
      h('h1', { style: { fontSize: '1.7rem', margin: '.2em 0' } }, 'Dojo anti-penipuan: 45 menit'),
      h('p', null, 'Kelas mengenali sebelas modus penipuan Indonesia lewat simulasi ponsel tiruan. Semua data, nomor, dan rekening fiktif; tidak ada akun atau server.'),
      h('h2', null, 'Tujuan pembelajaran'),
      h('ul', null,
        h('li', null, 'Siswa dapat menunjukkan red flag pada pesan, telepon, dan halaman palsu.'),
        h('li', null, 'Siswa memahami akibat keputusan dan langkah pemulihan, bukan hanya menghafal tips.'),
        h('li', null, 'Siswa tahu kanal pelaporan resmi dan kapan memakainya.'),
      ),
      h('h2', null, 'Susunan 45 menit'),
      h('table', null,
        h('thead', null, h('tr', null, h('th', null, 'Waktu'), h('th', null, 'Kegiatan'), h('th', null, 'Catatan guru'))),
        h('tbody', null,
          h('tr', null, h('td', null, '5 menit'), h('td', null, 'Pembukaan & aturan aman'), h('td', null, 'Tekankan: salah di simulasi tidak apa-apa, tidak ada data nyata.')),
          h('tr', null, h('td', null, '12 menit'), h('td', null, 'Skenario Task Scam'), h('td', null, 'Siswa bermain sendiri; guru tidak memberi jawaban di tengah.')),
          h('tr', null, h('td', null, '12 menit'), h('td', null, 'Skenario Bank & OTP'), h('td', null, 'Minta siswa mencatat satu kalimat yang membuat panik.')),
          h('tr', null, h('td', null, '10 menit'), h('td', null, 'Debrief berpasangan'), h('td', null, 'Bandingkan akhir yang berbeda dan langkah pemulihan.')),
          h('tr', null, h('td', null, '6 menit'), h('td', null, 'Diskusi kelas & penutup'), h('td', null, 'Gunakan pertanyaan di bawah; tutup dengan kanal Aduan Konten Komdigi dan OJK 157.')),
        ),
      ),
      h('h2', null, 'Pertanyaan diskusi'),
      h('ol', null, ...DISCUSSIONS.map((question) => h('li', null, question))),
      h('h2', null, 'Penilaian'),
      h('ul', null,
        h('li', null, 'Observasi: siswa menandai red flag sebelum mengambil keputusan.'),
        h('li', null, 'Debrief: siswa menyebut satu taktik penipu dan satu langkah pemulihan.'),
        h('li', null, 'Kuis kelas: 10 soal acak tanpa timer (nilai lulus 80).'),
        h('li', null, 'Tugas rumah: ujian akhir 20 soal (nilai lulus 80) dan sertifikat edukasi bila lulus.'),
      ),
      h('h2', null, 'Catatan etika'),
      h('p', null, 'Jangan meminta siswa membagikan data pribadi, nomor rekening, atau tangkapan layar percakapan nyata. Semua latihan memakai data fiktif. Sertifikat Scamurai bukan sertifikasi resmi pemerintah.'),
      h('p', { style: { marginTop: '1.2em', fontSize: '.8rem' } },
        `Tautan aplikasi: cingmen.github.io/scamurai · ${manifest.scenarios.length} skenario · versi ${manifest.version}`,
      ),
    ),
  );
}

export async function render(root, { params, path } = {}) {
  const manifest = await loadJSON('./data/manifest.json');
  const teacher = params?.[0] === 'guru' || String(path || '').endsWith('/guru');
  const state = all();
  const quiz = state.sekolah.quiz || {};
  clear(root);

  if (teacher) {
    root.append(teacherSheet(manifest));
    return;
  }

  const classLabel = get('sekolah.classLabel', '');
  const done = (get('sekolah.packagesDone', []) || []).includes('paket-45m');
  const canvas = await renderProgressCard();
  const preview = h('div', { class: 'c-progress-card-preview' }, canvas);

  const classInput = h('input', {
    type: 'text',
    maxlength: '20',
    value: classLabel,
    placeholder: 'Contoh: IX-B',
    'aria-label': 'Nama kelas',
    onchange: (event) => {
      set('sekolah.classLabel', event.currentTarget.value.trim().slice(0, 20));
      showToast('Nama kelas disimpan di perangkat ini.', { timeout: 2200 });
    },
  });

  const packageBox = h('div', { class: 'c-card' },
    h('div', { class: 'u-spread' },
      h('h2', { class: 'section-title' }, 'Paket 45 menit'),
      done ? h('span', { class: 'c-chip c-chip--success' }, '✓ Ditandai selesai') : h('span', { class: 'c-chip c-chip--gold' }, 'Siap dipakai'),
    ),
    h('p', { class: 'u-small u-muted' }, 'Urutan yang sudah diuji untuk kelas: dua skenario inti, debrief berpasangan, kuis kelas, lalu diskusi. Ujian akhir bisa menjadi tugas rumah.'),
    h('p', { class: 'u-small u-muted' }, `Kuis kelas: ${quiz.passed ? `lulus (${quiz.best})` : quiz.attempts ? `skor terbaik ${quiz.best}` : 'belum dicoba'} · 10 soal · tanpa timer.`),
    h('ol', { class: 'c-brief-list u-mt-3' },
      h('li', null, h('a', { href: '#/skenario/task-scam' }, 'Task Scam'), ' — 12 menit, pola komisi dan deposit.'),
      h('li', null, h('a', { href: '#/skenario/bank-otp' }, 'Bank & OTP'), ' — 12 menit, tekanan telepon dan kode rahasia.'),
      h('li', null, 'Debrief berpasangan — 10 menit, bandingkan anatomi serangan.'),
      h('li', null, 'Diskusi kelas — 6 menit, gunakan pertanyaan di lembar guru.'),
      h('li', null, h('a', { href: '#/sekolah/ujian' }, 'Kuis kelas 10 soal'), ' — penilaian cepat tanpa timer, lulus ≥ 80.'),
      h('li', null, h('a', { href: '#/ujian' }, 'Ujian akhir'), ' — tugas rumah, 20 soal, lulus ≥ 80.'),
    ),
    h('div', { class: 'u-row u-mt-4' },
      h('button', {
        type: 'button',
        class: done ? 'c-btn c-btn--ghost' : 'c-btn c-btn--primary',
        onclick: () => {
          const current = new Set(get('sekolah.packagesDone', []) || []);
          if (current.has('paket-45m')) current.delete('paket-45m');
          else current.add('paket-45m');
          set('sekolah.packagesDone', [...current]);
          render(root, { params: [], path: '/sekolah' });
        },
      }, done ? 'Batalkan tanda selesai' : 'Tandai paket selesai'),
      h('a', { class: 'c-btn c-btn--ghost', href: '#/sekolah/guru' }, 'Lembar guru'),
      h('a', { class: 'c-btn c-btn--quiet', href: '#/ujian' }, 'Buka ujian'),
    ),
  );

  root.append(h('div', { class: 'scr-sekolah' },
    h('div', { class: 'scr-head' },
      h('p', { class: 'scr-head__eyebrow' }, 'Mode sekolah'),
      h('h1', null, 'Satu kelas, satu dojo'),
      h('p', null, 'Paket siap pakai untuk guru dan fasilitator komunitas. Tidak perlu akun siswa; progres tetap di perangkat masing-masing.'),
    ),
    h('div', { class: 'c-card' },
      h('div', { class: 'c-setting' },
        h('div', null,
          h('div', { class: 'c-setting__title' }, 'Nama kelas (opsional)'),
          h('div', { class: 'c-setting__sub' }, 'Hanya untuk kartu kemajuan. Tidak dikirim ke server.'),
        ),
        h('div', { class: 'c-field', style: { minWidth: '200px' } }, classInput),
      ),
      h('div', { class: 'u-row u-mt-3' },
        h('a', { class: 'c-btn c-btn--ghost c-btn--sm', href: '#/pengaturan' }, 'Pengaturan mode'),
        h('span', { class: 'u-small u-muted' }, `Mode aktif: ${state.settings.mode}`),
      ),
    ),
    h('div', { class: 'c-package' },
      packageBox,
      h('div', { class: 'c-card' },
        h('h2', { class: 'section-title' }, 'Kartu kemajuan siswa'),
        h('p', { class: 'u-small u-muted' }, 'Bagikan sebagai bukti tugas. Berisi sabuk, jumlah skenario, akurasi red flag, dan skor ujian — tanpa data pribadi selain nama opsional.'),
        preview,
        h('div', { class: 'u-row u-mt-3' },
          h('button', {
            type: 'button',
            class: 'c-btn c-btn--primary c-btn--sm',
            onclick: () => {
              downloadCanvas(canvas, 'scamurai-kartu-kemajuan.png');
            },
          }, 'Unduh kartu'),
          h('button', {
            type: 'button',
            class: 'c-btn c-btn--ghost c-btn--sm',
            onclick: async () => {
              const result = await shareCanvas(canvas, 'scamurai-kartu-kemajuan.png', 'Kartu kemajuan Scamurai');
              if (!result.shared && !result.aborted) showToast('Kartu diunduh sebagai PNG.', { timeout: 2500 });
            },
          }, 'Bagikan'),
        ),
      ),
    ),
    h('div', { class: 'c-card c-card--accent' },
      h('h2', { class: 'section-title' }, 'Untuk guru'),
      h('p', null, 'Lembar guru berisi tujuan pembelajaran, susunan 45 menit, pertanyaan diskusi, rubrik, dan catatan etika. Sudah dioptimalkan untuk dicetak tanpa bingkai ponsel.'),
      h('div', { class: 'u-row u-mt-3' },
        h('a', { class: 'c-btn c-btn--primary', href: '#/sekolah/guru' }, 'Buka lembar guru'),
        h('a', { class: 'c-btn c-btn--ghost', href: '#/skenario' }, 'Lihat semua skenario'),
      ),
    ),
    h('p', { class: 'u-small u-faint u-center' }, 'Sertifikat Scamurai adalah bukti edukasi komunitas, bukan sertifikasi resmi pemerintah.'),
  ));
}
