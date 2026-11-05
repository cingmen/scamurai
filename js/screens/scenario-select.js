// Galeri 8 skenario (structure.md §3).
import { loadJSON } from '../core/loader.js';
import { get } from '../core/store.js';
import { h, clear } from '../core/dom.js';
import { scenarioCard, minigameCard } from '../components/scenario-card.js';
import { completedCount } from '../core/progress.js';

const FILTERS = [
  { id: 'semua', label: 'Semua' },
  { id: 'sim', label: 'Simulasi' },
  { id: 'vn', label: 'Visual novel' },
  { id: 'selesai', label: 'Selesai' },
  { id: 'belum', label: 'Belum selesai' },
];

export async function render(root) {
  const manifest = await loadJSON('./data/manifest.json');
  let active = 'semua';

  clear(root);
  const grid = h('div', { class: 'c-scn-grid' });
  const count = h('span', { class: 'u-small u-muted' });

  function filter(cardMeta) {
    const progress = get(`progress.${cardMeta.id}`, null);
    if (active === 'selesai') return progress?.status === 'selesai';
    if (active === 'belum') return progress?.status !== 'selesai';
    if (active === 'sim' || active === 'vn') return cardMeta.type === active;
    return true;
  }

  function renderGrid() {
    clear(grid);
    const list = manifest.scenarios.filter(filter);
    list.forEach((meta) => grid.append(scenarioCard(meta, get(`progress.${meta.id}`, null))));
    if (!list.length) {
      grid.append(h('p', { class: 'u-muted' }, 'Belum ada skenario di filter ini.'));
    }
    count.textContent = `${completedCount()} dari ${manifest.scenarios.length} skenario selesai`;
  }

  const filterRow = h('div', { class: 'c-filter-row', role: 'group', 'aria-label': 'Filter skenario' },
    ...FILTERS.map((item) => h('button', {
      type: 'button',
      class: 'c-filter',
      'aria-pressed': item.id === active ? 'true' : 'false',
      onclick: (event) => {
        active = item.id;
        filterRow.querySelectorAll('button').forEach((btn) => btn.setAttribute('aria-pressed', 'false'));
        event.currentTarget.setAttribute('aria-pressed', 'true');
        renderGrid();
      },
    }, item.label)),
  );

  renderGrid();

  root.append(h('div', { class: 'scr-home' },
    h('div', { class: 'scr-head' },
      h('p', { class: 'scr-head__eyebrow' }, 'Delapan modus, satu dojo'),
      h('h1', null, 'Pilih musuhmu'),
      h('p', null, 'Setiap skenario adalah satu penipuan utuh: dari pesan pertama sampai debrief yang membongkar naskah penipu. Semua bisa diulang tanpa biaya.'),
      h('p', { class: 'u-mt-2' }, count),
    ),
    filterRow,
    grid,
    h('section', { class: 'u-mt-6' },
      h('h2', { class: 'section-title' }, 'Dojo latihan', h('small', null, 'modul observasi')),
      h('div', { class: 'c-scn-grid' }, minigameCard(manifest.minigames[0])),
    ),
    h('section', { class: 'c-card u-mt-6' },
      h('div', { class: 'u-spread' },
        h('div', null,
          h('p', { class: 'scr-head__eyebrow' }, 'Produk saudara'),
          h('h2', { style: { fontSize: 'var(--s-fs-700)' } }, 'Sudah lancar? Uji kecepatan di PhisQuest'),
          h('p', { class: 'u-small u-muted' }, 'PhisQuest melatih pengenalan cepat lewat 40 skenario pesan. Scamurai melatih pengalaman utuh dan akibatnya. Keduanya saling melengkapi.'),
        ),
        h('a', {
          class: 'c-btn c-btn--ghost',
          href: 'https://cingmen.github.io/phisquest',
          target: '_blank',
          rel: 'noopener noreferrer',
        }, 'Buka PhisQuest ↗'),
      ),
    ),
    h('p', { class: 'u-small u-faint u-center' }, 'Tidak ada skenario terkunci. Kamu boleh mulai dari mana saja.'),
  ));
}
