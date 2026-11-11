// Halaman Tentang: kredit, lisensi, sumber, dan disclaimer (ROADMAP F7).
import { all } from '../core/store.js';
import { loadJSON } from '../core/loader.js';
import { h, clear } from '../core/dom.js';
import { dateID } from '../core/format.js';

export async function render(root) {
  const state = all();
  const bantuan = await loadJSON('./data/bantuan.json');
  const bantuanDate = bantuan.verifiedAt || state.meta?.lastSeen || new Date().toISOString();
  clear(root);

  root.append(h('div', { class: 'scr-home' },
    h('a', { href: '#/', class: 'u-small' }, '← Beranda'),
    h('header', { class: 'scr-head' },
      h('p', { class: 'scr-head__eyebrow' }, 'Tentang Scamurai'),
      h('h1', null, 'Dibuat agar penipuan terasa membosankan'),
      h('p', null, 'Scamurai adalah dojo simulasi anti-penipuan berbahasa Indonesia. Kamu mengalami alur penipuan di ponsel tiruan, melihat akibat keputusan, lalu membaca naskah penipu di baliknya.'),
      h('p', { class: 'u-small u-muted u-mt-2' }, `Versi ${state.meta?.swVersion || 'v1.0.0'} · skema data ${state.schemaVersion} · ${state.stats?.scenariosCompleted || 0} skenario selesai di perangkat ini.`),
    ),
    h('section', { class: 'c-card' },
      h('h2', { class: 'section-title' }, 'Yang sengaja tidak kami lakukan'),
      h('ul', { class: 'c-dex-list' },
        h('li', null, 'Tidak ada server, akun, cookie, atau analitik pihak ketiga. Progres hanya ada di perangkatmu.'),
        h('li', null, 'Tidak ada merek, bank, nomor, atau rekening nyata di dalam simulasi.'),
        h('li', null, 'Tidak menampilkan statistik sosial yang tidak bisa kami tunjukkan sumbernya.'),
        h('li', null, 'Tidak menjual sertifikat sebagai lisensi profesional atau sertifikasi pemerintah.'),
      ),
    ),
    h('section', { class: 'c-card u-mt-4' },
      h('h2', { class: 'section-title' }, 'Kredit'),
      h('ul', { class: 'c-dex-list' },
        h('li', null, h('strong', null, 'Maskot & ilustrasi: '), 'Kenji si Kucing Tebas dan seluruh sampul skenario dibuat khusus untuk proyek ini.'),
        h('li', null, h('strong', null, 'Naskah & riset pola: '), 'disusun dari pola penipuan yang umum dilaporkan publik, tanpa menyalin identitas korban atau pelaku.'),
        h('li', null, h('strong', null, 'Produk saudara: '), h('a', { href: 'https://cingmen.github.io/phisquest', target: '_blank', rel: 'noopener noreferrer' }, 'PhisQuest'), ' — latihan pengenalan cepat 40 skenario pesan.'),
        h('li', null, h('strong', null, 'Font: '), 'Plus Jakarta Sans dan JetBrains Mono, di-host sendiri di repositori ini.'),
      ),
    ),
    h('section', { class: 'c-card u-mt-4' },
      h('h2', { class: 'section-title' }, 'Lisensi & sumber'),
      h('p', null, 'Kode dan materi Scamurai dirilis dengan lisensi MIT. Kamu boleh memakai, mengubah, dan membagikannya dengan tetap menyertakan lisensi.'),
      h('div', { class: 'u-row u-mt-3' },
        h('a', {
          class: 'c-btn c-btn--ghost c-btn--sm',
          href: 'https://github.com/cingmen/scamurai/blob/main/LICENSE',
          target: '_blank',
          rel: 'noopener noreferrer',
        }, 'Baca lisensi MIT ↗'),
        h('a', {
          class: 'c-btn c-btn--ghost c-btn--sm',
          href: 'https://github.com/cingmen/scamurai',
          target: '_blank',
          rel: 'noopener noreferrer',
        }, 'Repositori GitHub ↗'),
      ),
      h('p', { class: 'u-small u-muted u-mt-3' },
        'Kanal resmi di Pusat Bantuan dicek dan diberi tanggal verifikasi. Data statistik sosial sengaja dikosongkan sampai ada sumber yang dapat diperiksa. ',
        `Tanggal verifikasi kanal resmi: ${dateID(bantuanDate)}.`,
      ),
    ),
    h('section', { class: 'c-card c-card--accent u-mt-4' },
      h('h2', { class: 'section-title' }, 'Disclaimer'),
      h('p', null, 'Scamurai adalah alat edukasi komunitas, bukan nasihat hukum, keuangan, atau psikologis. Sertifikatnya bukan sertifikasi resmi. Jika kamu sedang mengalami penipuan, prioritaskan menyelamatkan uang dan data, lalu gunakan kanal resmi di Pusat Bantuan.'),
      h('div', { class: 'u-row u-mt-3' },
        h('a', { class: 'c-btn c-btn--danger', href: '#/bantuan' }, 'Pusat Bantuan'),
        h('a', { class: 'c-btn c-btn--ghost', href: '#/pengaturan' }, 'Kelola data saya'),
      ),
    ),
    h('div', { class: 'c-brief-actions' },
      h('a', { class: 'c-btn c-btn--primary', href: '#/skenario' }, 'Mulai latihan'),
      h('a', { class: 'c-btn c-btn--quiet', href: '#/' }, 'Kembali ke beranda'),
    ),
  ));
}
