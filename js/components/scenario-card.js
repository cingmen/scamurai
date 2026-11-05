// Kartu skenario (styles.md §5.4).
import { h } from '../core/dom.js';

export function katana(difficulty = 1) {
  return h('span', { class: 'c-katana', 'aria-label': `Kesulitan ${difficulty} dari 3` },
    ...[1, 2, 3].map((n) => h('span', { class: n <= difficulty ? 'is-on' : '' })),
  );
}

export function scenarioCard(meta, progress = null) {
  const status = progress?.status;
  let statusLabel = 'Baru';
  let statusClass = 'is-new';
  if (status === 'selesai' && !progress.debriefDone) {
    statusLabel = 'Selesai · debrief belum dibaca';
    statusClass = 'is-debrief';
  } else if (status === 'selesai') {
    statusLabel = 'Selesai · kartu ScamDEX terbuka';
    statusClass = 'is-done';
  } else if (status === 'berjalan' || progress?.briefed) {
    statusLabel = 'Berlangsung · lanjutkan';
    statusClass = 'is-progress';
  }

  return h('a', { class: 'c-card-scn', href: `#/skenario/${meta.id}` },
    h('div', { class: 'c-card-scn__cover' },
      h('img', {
        src: meta.cover,
        alt: `Ilustrasi skenario ${meta.title}`,
        loading: 'lazy',
        decoding: 'async',
        width: '480',
        height: '270',
      }),
    ),
    h('div', { class: 'c-card-scn__body' },
      h('div', { class: 'c-card-scn__meta' },
        h('span', { class: 'c-chip c-chip--gold', style: { fontSize: '10px' } }, meta.modus || 'Simulasi'),
        katana(meta.difficulty),
        h('span', null, `${meta.minutes || 10} menit`),
        meta.type === 'vn' ? h('span', { class: 'c-chip', style: { fontSize: '10px' } }, 'Visual novel') : null,
      ),
      h('div', { class: 'c-card-scn__title' }, meta.title),
      h('p', { class: 'c-card-scn__desc' }, meta.summary),
      h('span', { class: `c-card-scn__status ${statusClass}` }, statusLabel),
    ),
  );
}

export function minigameCard(meta) {
  return h('a', { class: 'c-card-scn', href: '#/grup' },
    h('div', { class: 'c-card-scn__cover' },
      h('img', { src: meta.cover, alt: `Ilustrasi ${meta.title}`, loading: 'lazy', decoding: 'async', width: '480', height: '270' }),
    ),
    h('div', { class: 'c-card-scn__body' },
      h('div', { class: 'c-card-scn__meta' },
        h('span', { class: 'c-chip c-chip--gold', style: { fontSize: '10px' } }, 'Dojo latihan'),
        h('span', null, `${meta.minutes} menit`),
      ),
      h('div', { class: 'c-card-scn__title' }, meta.title),
      h('p', { class: 'c-card-scn__desc' }, meta.summary),
      h('span', { class: 'c-card-scn__status is-new' }, 'Observasi grup · tanpa saldo'),
    ),
  );
}
