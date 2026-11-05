// Tap Red Flag pada layar hidup (app-logic.md §5).
import { h } from '../core/dom.js';

/**
 * @param {{blocks:Array<{text:string,head?:boolean}>, hotspots:Array,
 * found?:Set<string>, hint?:string, onFlag:(hotspot:object, correct:boolean)=>void}} opts
 */
export function createFlagSurface(opts) {
  const { blocks = [], hotspots = [], found = new Set(), hint, onFlag } = opts;
  const surface = h('div', { class: 'c-flag-surface' });

  if (hint) {
    surface.append(h('div', { class: 'c-flag-surface__hint' }, h('span', { 'aria-hidden': 'true' }, '🔍'), h('span', null, hint)));
  }

  const content = h('div', { class: 'c-flag-surface__blocks' },
    ...blocks.map((block) => h('div', {
      class: `c-flag-surface__line${block.head ? ' c-flag-surface__line--head' : ''}`,
    }, block.text)),
  );
  surface.append(content);

  // Beri ruang vertikal agar hotspot di bagian bawah bisa ditampilkan.
  surface.style.minHeight = '300px';

  hotspots.forEach((spot) => {
    const isDecoy = Boolean(spot.decoy);
    const already = found.has(spot.flagId);
    const button = h('button', {
      type: 'button',
      class: 'c-flag-hotspot',
      style: { left: `${spot.x}%`, top: `${spot.y}%` },
      'aria-label': spot.title || 'Periksa elemen ini',
      title: 'Periksa elemen ini',
      dataset: { flag: spot.flagId },
      onclick: () => {
        if (button.classList.contains('is-correct')) return;
        if (isDecoy) {
          button.classList.add('is-wrong');
          onFlag?.(spot, false);
          return;
        }
        button.classList.add('is-correct');
        button.disabled = true;
        found.add(spot.flagId);
        onFlag?.(spot, true);
      },
    });
    if (already) {
      button.classList.add('is-correct');
      button.disabled = true;
    }
    surface.append(button);
  });

  return { el: surface };
}

/** Panel penjelasan hasil tap (benar/salah). */
export function flagExplanation(spot, correct) {
  return h('div', { class: `c-flag-result__panel${correct ? '' : ' c-flag-result__panel--wrong'}`, role: 'status' },
    h('h4', null, correct ? `✓ Red flag: ${spot.title}` : `Bukan red flag: ${spot.title}`),
    h('dl', { style: { margin: '0' } },
      h('dt', null, correct ? 'Kenapa berbahaya' : 'Kenapa ini wajar'),
      h('dd', null, spot.why || ''),
      h('dt', null, correct ? 'Yang benar dilakukan' : 'Yang perlu diingat'),
      h('dd', null, spot.do || ''),
    ),
  );
}
