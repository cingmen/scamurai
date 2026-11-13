// Beranda dojo (structure.md §4.3).
import { loadJSON } from '../core/loader.js';
import { all, get, beltInfo, BELTS } from '../core/store.js';
import { h, clear } from '../core/dom.js';
import { rupiah } from '../core/format.js';
import { scenarioCard, minigameCard, katana } from '../components/scenario-card.js';
import { lineProgress } from '../components/line-progress.js';
import { completedCount } from '../core/progress.js';
import { practiceReminder } from '../core/reminder.js';

export async function render(root) {
  const manifest = await loadJSON('./data/manifest.json');
  const state = all();
  const belt = beltInfo();
  const done = completedCount();
  const total = manifest.scenarios.length;
  const nextBelt = BELTS[Math.min(belt.level + 1, BELTS.length - 1)];
  const accuracy = state.stats.flagsTotal ? Math.round((state.stats.flagsCorrect / state.stats.flagsTotal) * 100) : 0;
  const inProgress = manifest.scenarios.find((item) => {
    const p = state.progress?.[item.id];
    return p && (p.status === 'berjalan' || (p.status === 'selesai' && !p.debriefDone));
  });

  clear(root);

  const hero = h('section', { class: 'c-hero' },
    h('div', null,
      h('span', { class: 'c-hero__eyebrow' }, '◆ Dojo anti-penipuan'),
      h('h1', null, 'Tempat kamu boleh ', h('em', null, 'salah'), ' — sebelum salahnya mahal.'),
      h('p', { class: 'c-hero__lead' },
        'Latih instingmu melawan penipuan di dalam ponsel tiruan. Semua uang palsu, semua nomor palsu, tidak ada data yang dikirim ke mana pun.',
      ),
      h('div', { class: 'c-hero__actions' },
        h('a', { class: 'c-btn c-btn--primary', href: '#/skenario' }, 'Mulai latihan'),
        h('a', { class: 'c-btn c-btn--danger', href: '#/bantuan' }, 'Aku sedang kena scam'),
      ),
      h('p', { class: 'c-hero__fine' },
        'Gratis, tanpa akun, bisa offline. Progres hanya tersimpan di perangkatmu. ',
        'Sertifikat edukasi komunitas — bukan sertifikasi resmi.',
      ),
    ),
    h('div', { class: 'c-hero__art' },
      h('img', { src: './assets/img/mascot/kenji.svg', alt: 'Kenji si Kucing Tebas, pemandu dojo', width: '240', height: '240' }),
    ),
  );

  const beltBanner = h('section', { class: 'c-belt-banner' },
    h('div', { class: 'c-belt-banner__icon', style: { background: belt.color, color: belt.ink }, 'aria-hidden': 'true' }, '／'),
    h('div', null,
      h('div', { class: 'c-belt-banner__title' }, `Sabuk ${belt.name}`),
      h('div', { class: 'c-belt-banner__sub' },
        `${done} dari ${total} skenario selesai · ${state.exam?.passed ? `ujian lulus (${state.exam.best})` : 'ujian belum lulus'}`,
      ),
    ),
    h('div', { class: 'c-belt-banner__progress' },
      lineProgress({ value: done, max: total, label: belt.level < 5 ? `Menuju sabuk ${nextBelt.name}` : 'Sabuk tertinggi' }),
      h('div', { class: 'c-belt-banner__meta' },
        h('span', null, `Saldo Dojo ${rupiah(get('dojo.saldo', 0))}`),
        h('a', { href: '#/scamdex' }, 'Buka ScamDEX'),
      ),
    ),
  );

  const stats = h('section', { class: 'c-stat-row' },
    h('div', { class: 'c-stat' }, h('div', { class: 'c-stat__value' }, String(done)), h('div', { class: 'c-stat__label' }, 'Skenario selesai')),
    h('div', { class: 'c-stat' }, h('div', { class: 'c-stat__value' }, `${accuracy}%`), h('div', { class: 'c-stat__label' }, 'Akurasi red flag')),
    h('div', { class: 'c-stat' }, h('div', { class: 'c-stat__value' }, String(state.exam?.best || 0)), h('div', { class: 'c-stat__label' }, 'Skor ujian terbaik')),
    h('div', { class: 'c-stat' }, h('div', { class: 'c-stat__value' }, rupiah(get('dojo.saldo', 0))), h('div', { class: 'c-stat__label' }, 'Saldo Dojo')),
  );

  const continueCard = inProgress
    ? h('section', { class: 'c-card c-card--accent' },
      h('div', { class: 'u-spread' },
        h('div', null,
          h('p', { class: 'scr-head__eyebrow' }, inProgress.type === 'vn' ? 'Cerita berjalan' : 'Skenario berjalan'),
          h('h2', { style: { fontSize: 'var(--s-fs-700)' } }, inProgress.title),
          h('p', { class: 'u-small u-muted' }, inProgress.summary),
        ),
        h('a', {
          class: 'c-btn c-btn--primary',
          href: inProgress.type === 'vn' ? '#/vn/love-scam' : `#/main/${inProgress.id}`,
        }, 'Lanjutkan'),
      ),
    )
    : null;

  const reminder = !inProgress ? practiceReminder(state) : null;
  const reminderScenario = reminder
    ? manifest.scenarios.find((item) => item.id === reminder.scenarioId)
    : null;

  const continueDebrief = !inProgress
    ? manifest.scenarios
      .map((item) => ({ item, p: state.progress?.[item.id] }))
      .find(({ p }) => p?.status === 'selesai' && !p.debriefDone)
    : null;

  const scenarioSection = h('section', null,
    h('div', { class: 'u-spread u-mb-4' },
      h('h2', { class: 'section-title' }, 'Pilih latihanmu'),
      h('a', { href: '#/skenario', class: 'u-small' }, `Lihat semua ${total} skenario →`),
    ),
    h('div', { class: 'c-scn-grid' },
      ...manifest.scenarios.slice(0, 4).map((item) => scenarioCard(item, state.progress?.[item.id])),
      minigameCard(manifest.minigames[0]),
    ),
  );

  const reminderCard = reminder && reminderScenario
    ? h('section', { class: 'c-card c-card--accent', 'data-practice-reminder': reminder.scenarioId },
      h('div', { class: 'u-spread' },
        h('div', null,
          h('p', { class: 'scr-head__eyebrow' }, 'Latihan terjadwal'),
          h('h2', { style: { fontSize: 'var(--s-fs-700)' } }, `Saatnya mengulang ${reminderScenario.title}`),
          h('p', { class: 'u-small u-muted' }, `Latihan terakhir ${reminder.daysSince === 0 ? 'hari ini' : `${reminder.daysSince} hari lalu`}. Ulangi satu skenario agar instingmu tetap tajam.`),
        ),
        h('a', { class: 'c-btn c-btn--primary', href: `#/skenario/${reminder.scenarioId}` }, 'Ulangi sekarang'),
      ),
    )
    : null;

  const quickGrid = h('section', { class: 'c-quick-grid' },
    h('a', { class: 'c-quick', href: '#/scamdex' },
      h('span', { class: 'c-quick__icon', 'aria-hidden': 'true' }, '▤'),
      h('span', null, h('span', { class: 'c-quick__title' }, 'ScamDEX'), h('span', { class: 'c-quick__sub' }, '11 kartu modus + varian')),
    ),
    h('a', { class: 'c-quick', href: '#/ujian' },
      h('span', { class: 'c-quick__icon', 'aria-hidden': 'true' }, '✎'),
      h('span', null, h('span', { class: 'c-quick__title' }, 'Ujian akhir'), h('span', { class: 'c-quick__sub' }, '20 soal dari konteks skenario')),
    ),
    h('a', { class: 'c-quick', href: '#/sekolah' },
      h('span', { class: 'c-quick__icon', 'aria-hidden': 'true' }, '⌂'),
      h('span', null, h('span', { class: 'c-quick__title' }, 'Mode sekolah'), h('span', { class: 'c-quick__sub' }, 'Paket 45 menit + lembar guru')),
    ),
    h('a', { class: 'c-quick', href: '#/latihan' },
      h('span', { class: 'c-quick__icon', 'aria-hidden': 'true' }, '↗'),
      h('span', null, h('span', { class: 'c-quick__title' }, 'PhisQuest'), h('span', { class: 'c-quick__sub' }, '40 skenario kuis cepat')),
    ),
  );

  const kenjiNote = h('section', { class: 'c-kenji-note' },
    h('img', { src: './assets/img/mascot/kenji.svg', alt: '', width: '46', height: '46' }),
    h('div', null,
      h('strong', null, 'Kenji: '),
      'Kalau kamu sedang benar-benar tertipu sekarang, jangan latihan dulu. ',
      h('a', { href: '#/bantuan', style: { textDecoration: 'underline' } }, 'Buka Pusat Bantuan'),
      ' — langkah daruratnya ada di sana.',
    ),
  );

  const glossary = h('section', { class: 'c-card' },
    h('h2', { class: 'section-title' }, 'Glosarium singkat'),
    h('p', { class: 'u-small u-muted u-mb-4' }, 'Istilah yang muncul di skenario, dalam bahasa sehari-hari.'),
    h('div', { class: 'c-glossary' },
      ...[['Phishing', 'Pesan atau halaman yang menyamar sebagai pihak resmi untuk mengambil data atau uang.'],
        ['OTP', 'Kode sekali pakai yang menyelesaikan transaksi. Tidak pernah dibagikan, termasuk kepada “petugas bank”.'],
        ['Escrow', 'Dana ditahan platform sampai barang diterima. Transaksi di luar platform kehilangan perlindungan ini.'],
        ['Money mule', 'Orang yang meminjamkan rekening untuk menerima dan meneruskan uang kejahatan.'],
        ['Pinjol ilegal', 'Pinjaman online tanpa izin OJK, sering meminta akses kontak dan meneror saat penagihan.'],
        ['Red flag', 'Tanda bahaya dalam pesan atau situasi yang sebaiknya diperiksa sebelum bertindak.']]
        .map(([term, definition]) => h('div', { class: 'c-glossary__item' },
          h('strong', null, term),
          h('p', null, definition),
        )),
    ),
  );

  const privacy = h('section', { class: 'c-privacy' },
    h('span', { 'aria-hidden': 'true', style: { fontSize: '20px' } }, '⛨'),
    h('div', null,
      h('strong', null, 'Privasi sejak desain. '),
      'Scamurai tidak punya server, tidak memakai cookie, dan tidak mengirim progres ke mana pun. Semua tersimpan di localStorage perangkat ini dan bisa dihapus dari Pengaturan.',
    ),
  );

  root.append(h('div', { class: 'scr-home' },
    hero,
    beltBanner,
    continueCard,
    continueDebrief && !inProgress
      ? h('section', { class: 'c-card c-card--accent' },
        h('div', { class: 'u-spread' },
          h('div', null,
            h('p', { class: 'scr-head__eyebrow' }, 'Debrief belum dibaca'),
            h('h2', { style: { fontSize: 'var(--s-fs-700)' } }, continueDebrief.item.title),
            h('p', { class: 'u-small u-muted' }, 'Baca anatomi serangan dan langkah pemulihan untuk mengembalikan 25% saldo yang hilang.'),
          ),
          h('a', { class: 'c-btn c-btn--primary', href: `#/debrief/${continueDebrief.item.id}` }, 'Buka debrief'),
        ),
      )
      : null,
    stats,
    reminderCard,
    scenarioSection,
    quickGrid,
    glossary,
    kenjiNote,
    privacy,
  ));
}
