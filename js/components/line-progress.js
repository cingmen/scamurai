// Progres garis ringan untuk banner & kartu.
import { h } from '../core/dom.js';

export function lineProgress({ value = 0, max = 100, label = '' } = {}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return h('div', { class: 'u-col', style: { gap: '4px' } },
    label ? h('div', { class: 'c-belt-banner__meta' }, h('span', null, label), h('span', null, `${value}/${max}`)) : null,
    h('div', { class: 'c-belt' }, h('div', { class: 'c-belt__fill', style: { width: `${percent}%` } })),
  );
}
