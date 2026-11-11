// Kartu integrasi PhisQuest (ROADMAP F6).
import { h, clear } from '../core/dom.js';

const PHISQUEST_URL = 'https://cingmen.github.io/phisquest';

export async function render(root) {
  clear(root);

  root.append(h('div', { class: 'scr-home' },
    h('a', { href: '#/', class: 'u-small' }, '← Beranda'),
    h('header', { class: 'scr-head' },
      h('p', { class: 'scr-head__eyebrow' }, 'Latihan tambahan'),
      h('h1', null, 'Latihan kilat di PhisQuest'),
      h('p', null, 'Scamurai melatih pengalaman penipuan secara utuh: pesan pertama, keputusan, akibat, dan pemulihan. PhisQuest melatih pengenalan cepat lewat 40 skenario pesan. Keduanya saling melengkapi.'),
    ),
    h('section', { class: 'c-card c-card--accent' },
      h('h2', { class: 'section-title' }, 'Kapan memakai PhisQuest?'),
      h('ul', { class: 'c-brief-list u-mt-3' },
        h('li', null, 'Saat ingin pemanasan singkat sebelum masuk skenario panjang di Scamurai.'),
        h('li', null, 'Saat ingin mengulang pola pesan mencurigakan dengan tempo cepat.'),
        h('li', null, 'Saat ingin latihan tambahan setelah menyelesaikan debrief Scamurai.'),
      ),
      h('div', { class: 'u-row u-mt-4' },
        h('a', {
          class: 'c-btn c-btn--primary',
          href: PHISQUEST_URL,
          target: '_blank',
          rel: 'noopener noreferrer',
          'data-phisquest-link': 'true',
        }, 'Buka PhisQuest ↗'),
        h('a', { class: 'c-btn c-btn--ghost', href: '#/skenario' }, 'Pilih skenario Scamurai'),
      ),
      h('p', { class: 'u-small u-faint u-mt-3' }, 'PhisQuest terbuka di tab baru. Scamurai tidak mengirim progres atau data perangkat ke sana.'),
    ),
    h('section', { class: 'c-card u-mt-4' },
      h('h2', { class: 'section-title' }, 'Dua cara berlatih'),
      h('div', { class: 'c-stat-row' },
        h('div', { class: 'c-stat' },
          h('div', { class: 'c-stat__value' }, 'Utuh'),
          h('div', { class: 'c-stat__label' }, 'Scamurai: alur & debrief'),
        ),
        h('div', { class: 'c-stat' },
          h('div', { class: 'c-stat__value' }, 'Cepat'),
          h('div', { class: 'c-stat__label' }, 'PhisQuest: 40 pesan'),
        ),
      ),
    ),
    h('div', { class: 'c-brief-actions' },
      h('a', { class: 'c-btn c-btn--quiet', href: '#/' }, 'Kembali ke beranda'),
      h('a', { class: 'c-btn c-btn--ghost', href: '#/bantuan' }, 'Aku sedang kena scam'),
    ),
  ));
}
