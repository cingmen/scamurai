// Debrief "Di Balik Layar Penipu" (PRD §13).
import { loadJSON } from '../core/loader.js';
import { get, all } from '../core/store.js';
import { h, clear } from '../core/dom.js';
import { timeline } from '../components/timeline.js';
import { flowDiagram } from '../components/flow-diagram.js';
import { dexCard } from '../components/badge-card.js';
import { completeDebrief, isDexUnlocked, dexVariants } from '../core/progress.js';
import { showToast } from '../components/toast.js';
import { rupiah, dateID } from '../core/format.js';

export async function render(root, { params }) {
  const id = params[0];
  const [manifest, scenario, scamdex, bantuan] = await Promise.all([
    loadJSON('./data/manifest.json'),
    loadJSON(`./data/scenarios/${id}.json`),
    loadJSON('./data/scamdex.json'),
    loadJSON('./data/bantuan.json'),
  ]);

  const meta = manifest.scenarios.find((item) => item.id === id) || { title: scenario.title };
  const progress = get(`progress.${id}`, null);
  const debrief = scenario.debrief || {};
  const endingId = progress?.bestEnding;
  const ending = endingId ? scenario.endings?.[endingId] : null;
  const card = scamdex.cards.find((item) => item.id === id);
  const variantIds = dexVariants(id);
  const hotTitles = [];
  scenario.steps.forEach((step) => {
    (step.hotspots || []).forEach((spot) => {
      if (!spot.decoy) hotTitles.push(spot.title);
    });
  });

  clear(root);
  const completionPanel = h('div', { class: 'c-card c-card--accent u-mt-4' });

  function renderCompletion() {
    clear(completionPanel);
    const done = get(`progress.${id}.debriefDone`, false);
    const recovered = Number(get(`progress.${id}.recovered`, 0)) || 0;
    if (done) {
      completionPanel.append(
        h('div', { class: 'u-spread' },
          h('div', null,
            h('strong', null, 'Debrief tuntas.'),
            h('p', { class: 'u-small u-muted' }, recovered > 0
              ? `Saldo Dojo pulih ${rupiah(recovered)} dari kerugian skenario ini. Pemulihan selalu lebih kecil daripada kerugian.`
              : 'Tidak ada saldo yang bisa dipulihkan dari skenario ini.'),
          ),
          h('span', { class: 'c-chip c-chip--success' }, '✓ Selesai'),
        ),
      );
      return;
    }
    completionPanel.append(
      h('div', { class: 'u-spread' },
        h('div', null,
          h('strong', null, 'Sudah membaca semuanya?'),
          h('p', { class: 'u-small u-muted' }, 'Menandai debrief selesai memulihkan 25% saldo yang hilang di skenario ini (maksimal Rp 1.000.000 kumulatif).'),
        ),
        h('button', {
          type: 'button',
          class: 'c-btn c-btn--primary',
          onclick: () => {
            const amount = completeDebrief(id);
            showToast(amount > 0 ? `Debrief tuntas. Saldo pulih ${rupiah(amount)}.` : 'Debrief tuntas.', { timeout: 4000 });
            renderCompletion();
          },
        }, 'Tandai debrief selesai'),
      ),
    );
  }

  if (!progress || progress.status !== 'selesai') {
    root.append(h('div', { class: 'scr-brief' },
      h('div', { class: 'c-empty' },
        h('h3', null, 'Debrief belum tersedia'),
        h('p', null, 'Selesaikan skenario ini dulu untuk membuka anatomi serangan dan langkah pemulihannya.'),
        h('a', { class: 'c-btn c-btn--primary u-mt-4', href: `#/skenario/${id}` }, 'Buka pengantar skenario'),
      ),
    ));
    return;
  }

  renderCompletion();

  root.append(h('div', { class: 'scr-brief' },
    h('a', { href: '#/skenario', class: 'u-small' }, '← Semua skenario'),
    h('header', { class: 'scr-head' },
      h('p', { class: 'scr-head__eyebrow' }, 'Debrief · di balik layar penipu'),
      h('h1', null, meta.title),
      h('p', null, `Akhir yang kamu capai: ${ending?.label || '—'}${progress?.bestEnding && endingId !== progress.bestEnding ? ` · terbaik: ${scenario.endings?.[progress.bestEnding]?.label}` : ''}`),
    ),
    h('div', { class: 'c-stat-row' },
      h('div', { class: 'c-stat' }, h('div', { class: 'c-stat__value' }, String(progress.flags?.found || 0)), h('div', { class: 'c-stat__label' }, 'Red flag ditemukan')),
      h('div', { class: 'c-stat' }, h('div', { class: 'c-stat__value' }, String(progress.flags?.missed || 0)), h('div', { class: 'c-stat__label' }, 'Terlewat / salah tap')),
      h('div', { class: 'c-stat' }, h('div', { class: 'c-stat__value' }, String(progress.endingsSeen?.length || 0)), h('div', { class: 'c-stat__label' }, 'Akhir yang pernah dicapai')),
      h('div', { class: 'c-stat' }, h('div', { class: 'c-stat__value' }, rupiah(progress.loss || 0)), h('div', { class: 'c-stat__label' }, 'Kerugian skenario')),
    ),
    completionPanel,
    h('section', { class: 'c-card u-mt-4' },
      h('h2', { class: 'section-title' }, '1. Anatomi serangan'),
      h('p', { class: 'u-small u-muted u-mb-4' }, 'Naskah penipu dibongkar langkah demi langkah. Perhatikan tujuan di balik setiap kalimat.'),
      timeline(debrief.anatomi || []),
    ),
    debrief.manipulasi?.length
      ? h('section', { class: 'c-card u-mt-4' },
        h('h2', { class: 'section-title' }, 'Naskah manipulasi per bab'),
        h('p', { class: 'u-small u-muted u-mb-4' }, 'Taktik yang dipakai penipu di setiap bab, terlepas dari pilihan yang kamu ambil.'),
        h('div', { class: 'c-table-wrap' },
          h('table', { class: 'c-table' },
            h('thead', null, h('tr', null, h('th', null, 'Bab'), h('th', null, 'Taktik'), h('th', null, 'Cara kerjanya'))),
            h('tbody', null,
              ...debrief.manipulasi.map((item) => h('tr', null,
                h('td', null, h('strong', null, item.chapter)),
                h('td', null, item.taktik),
                h('td', null, item.penjelasan),
              )),
            ),
          ),
        ),
      )
      : null,
    h('section', { class: 'c-card u-mt-4' },
      h('h2', { class: 'section-title' }, '2. Aliran uang'),
      h('p', { class: 'u-small u-muted u-mb-4' }, 'Uang tidak berhenti di rekening penerima. Ia dipecah dan dipindahkan cepat agar sulit dilacak.'),
      flowDiagram(debrief.aliran || {}),
    ),
    h('section', { class: 'c-card u-mt-4' },
      h('h2', { class: 'section-title' }, '3. Jika ini terjadi sungguhan'),
      h('ol', { class: 'c-brief-list' },
        ...(debrief.pulihkan || []).map((step) => h('li', null, step)),
      ),
      h('div', { class: 'u-row u-mt-4' },
        h('a', { class: 'c-btn c-btn--danger', href: '#/bantuan' }, 'Buka Pusat Bantuan'),
        h('a', {
          class: 'c-btn c-btn--ghost',
          href: 'https://cekrekening.id/',
          target: '_blank',
          rel: 'noopener noreferrer',
        }, 'Cek rekening ↗'),
      ),
    ),
    h('section', { class: 'c-card u-mt-4' },
      h('h2', { class: 'section-title' }, 'Red flag di skenario ini'),
      h('ul', { class: 'c-dex-list' },
        ...hotTitles.map((title) => h('li', null, title)),
      ),
    ),
    card
      ? h('section', { class: 'u-mt-4' },
        h('h2', { class: 'section-title' }, 'Kartu ScamDEX'),
        h('p', { class: 'u-small u-muted u-mb-4' }, isDexUnlocked(id)
          ? 'Kartu ini terbuka permanen di ScamDEX.'
          : 'Kartu akan terbuka saat skenario selesai.'),
        h('div', { class: 'c-dex-grid' },
          dexCard(card, { unlocked: isDexUnlocked(id) }),
          ...(card.variants || [])
            .filter((variant) => variantIds.includes(variant.id))
            .map((variant) => dexCard({ ...card, variantName: variant.name }, { unlocked: true, variant: true })),
        ),
      )
      : null,
    debrief.linkPhisquest
      ? h('section', { class: 'c-card c-card--accent u-mt-4' },
        h('div', { class: 'u-spread' },
          h('div', null,
            h('strong', null, 'Asah kecepatanmu'),
            h('p', { class: 'u-small u-muted' }, 'Pengenalan cepat ada di PhisQuest: 40 skenario pesan dan mode Time Attack.'),
          ),
          h('a', {
            class: 'c-btn c-btn--primary',
            href: 'https://cingmen.github.io/phisquest',
            target: '_blank',
            rel: 'noopener noreferrer',
          }, 'Latihan di PhisQuest ↗'),
        ),
      )
      : null,
    h('div', { class: 'c-brief-actions u-mt-5' },
      h('a', { class: 'c-btn c-btn--primary', href: '#/skenario' }, 'Pilih skenario lain'),
      h('a', { class: 'c-btn c-btn--ghost', href: '#/scamdex' }, 'Buka ScamDEX'),
      h('a', { class: 'c-btn c-btn--quiet', href: `#/skenario/${id}` }, 'Ulangi skenario'),
    ),
    h('p', { class: 'u-small u-faint u-center' }, `Data kanal resmi terakhir diverifikasi ${dateID(bantuan.verifiedAt)}.`),
  ));
}
