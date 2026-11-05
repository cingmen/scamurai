// Pusat Bantuan & Pelaporan (PRD §16) — selalu dapat diakses, juga offline.
import { loadJSON } from '../core/loader.js';
import { h, clear } from '../core/dom.js';
import { dateID } from '../core/format.js';

export async function render(root) {
  const data = await loadJSON('./data/bantuan.json');
  let activeBranch = data.branches[0]?.id || null;
  clear(root);

  const flow = h('div', { class: 'c-help-flow' });
  const branches = h('div', { class: 'c-help-branches' });

  function renderFlow() {
    clear(flow);
    const branch = data.branches.find((item) => item.id === activeBranch);
    if (!branch) return;
    flow.append(h('h2', { class: 'section-title' }, branch.title));
    branch.steps.forEach((step, index) => {
      flow.append(h('div', { class: 'c-help-step' },
        h('div', { class: 'c-help-step__num', 'aria-hidden': 'true' }, String(index + 1)),
        h('div', null,
          h('h3', null, step.title),
          h('p', null, step.body),
        ),
      ));
    });
    flow.append(h('div', { class: 'u-row u-mt-4' },
      h('a', { class: 'c-btn c-btn--danger', href: 'tel:122' }, 'Telepon 122'),
      h('a', {
        class: 'c-btn c-btn--ghost',
        href: 'https://lapor.go.id',
        target: '_blank',
        rel: 'noopener noreferrer',
      }, 'Buka lapor.go.id ↗'),
      h('a', { class: 'c-btn c-btn--quiet', href: '#/pengaturan' }, 'Kelola data saya'),
    ));
  }

  data.branches.forEach((branch) => {
    branches.append(h('button', {
      type: 'button',
      class: `c-help-branch${branch.id === activeBranch ? ' is-active' : ''}`,
      'aria-pressed': branch.id === activeBranch ? 'true' : 'false',
      onclick: () => {
        activeBranch = branch.id;
        branches.querySelectorAll('button').forEach((btn) => btn.setAttribute('aria-pressed', 'false'));
        branches.querySelectorAll('button').forEach((btn) => btn.classList.remove('is-active'));
        const current = [...branches.children].find((btn) => btn.textContent.includes(branch.title));
        current?.setAttribute('aria-pressed', 'true');
        current?.classList.add('is-active');
        renderFlow();
        flow.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    },
      h('h2', null, branch.title),
      h('p', null, branch.summary),
      h('span', { class: 'c-btn c-btn--ghost c-btn--sm' }, 'Lihat langkah'),
    ));
  });

  renderFlow();

  root.append(h('div', { class: 'scr-bantuan' },
    h('section', { class: 'c-help-emergency' },
      h('p', { class: 'scr-head__eyebrow', style: { color: 'var(--s-accent)' } }, 'Jika ini sedang terjadi'),
      h('h1', null, 'Tenang. Fokus ke langkah berikutnya.'),
      h('p', null, data.intro),
      h('p', { class: 'u-small u-mt-3' }, 'Scamurai tidak meminta data pribadi dan tidak mengelola pengaduan. Halaman ini bisa dibuka tanpa jaringan setelah kunjungan pertama.'),
    ),
    h('section', null,
      h('h2', { class: 'section-title' }, 'Apa yang baru terjadi?'),
      branches,
    ),
    h('section', { class: 'c-card' },
      h('h2', { class: 'section-title' }, 'Langkah berdasarkan situasimu'),
      flow,
    ),
    h('section', null,
      h('h2', { class: 'section-title' }, 'Cek rekening atau akun'),
      h('div', { class: 'c-card' },
        h('p', null, 'Sebelum bertransaksi, periksa nomor rekening penerima di cekrekening.id. Situs ini dikelola untuk menerima laporan rekening yang diduga dipakai penipuan.'),
        h('ol', { class: 'c-brief-list u-mt-3' },
          h('li', null, 'Buka cekrekening.id dari browser, bukan dari tautan yang dikirim orang lain.'),
          h('li', null, 'Masukkan nomor rekening dan pilih bank penerbit.'),
          h('li', null, 'Bila muncul laporan, jangan transfer. Bila belum ada, tetap waspada: rekening baru bisa dipakai besok.'),
          h('li', null, 'Laporkan rekening penipu beserta bukti transfer dan tangkapan layar.'),
        ),
        h('a', {
          class: 'c-btn c-btn--primary u-mt-4',
          href: 'https://cekrekening.id',
          target: '_blank',
          rel: 'noopener noreferrer',
        }, 'Buka cekrekening.id ↗'),
      ),
    ),
    h('section', null,
      h('h2', { class: 'section-title' }, 'Kanal resmi & kapan memakainya'),
      h('div', { class: 'c-table-wrap' },
        h('table', { class: 'c-table' },
          h('thead', null, h('tr', null,
            h('th', null, 'Kanal'), h('th', null, 'Fungsi'), h('th', null, 'Kapan dipakai'), h('th', null, 'Kontak'),
          )),
          h('tbody', null,
            ...data.channels.map((channel) => h('tr', null,
              h('td', null, h('strong', null, channel.name)),
              h('td', null, channel.what),
              h('td', null, channel.when),
              h('td', null,
                channel.url
                  ? h('a', { href: channel.url, target: '_blank', rel: 'noopener noreferrer' }, channel.url.replace(/^https?:\/\//, ''))
                  : channel.phone,
                channel.phone && channel.url ? h('div', { class: 'u-small' }, channel.phone) : null,
              ),
            )),
          ),
        ),
      ),
      h('p', { class: 'c-verified u-mt-2' },
        h('span', null, '✓'),
        `Terakhir diverifikasi: ${dateID(data.verifiedAt)}. Nomor dan tautan dapat berubah — periksa kembali sebelum digunakan.`,
      ),
    ),
    h('section', { class: 'c-card' },
      h('h2', { class: 'section-title' }, data.psychology.title),
      h('p', null, data.psychology.body),
      h('p', { class: 'u-small u-muted u-mt-3' },
        'Bila kamu butuh bicara dengan seseorang sekarang, hubungi orang terpercaya atau layanan kesehatan jiwa setempat. Kamu tidak perlu menghadapi ini sendirian.',
      ),
    ),
    h('div', { class: 'c-brief-actions' },
      h('a', { class: 'c-btn c-btn--ghost', href: '#/' }, 'Kembali ke beranda'),
      h('a', { class: 'c-btn c-btn--quiet', href: '#/skenario' }, 'Latihan setelah aman'),
    ),
  ));
}
