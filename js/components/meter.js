// Meter berlabel: warna tidak pernah satu-satunya penanda (styles.md §5.6).
import { h } from '../core/dom.js';
import { clamp } from '../core/format.js';

export function meter({ label = 'Meter', value = 0, max = 100, tone = 'gold', display = null } = {}) {
  const percent = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  const fill = h('div', { class: 'c-meter__fill', style: { width: `${percent}%` } });
  const valueEl = h('span', null, display ?? `${Math.round(value)}%`);
  const el = h('div', {
    class: `c-meter${tone === 'danger' ? ' c-meter--danger' : ''}${tone === 'success' ? ' c-meter--success' : ''}`,
    role: 'meter',
    'aria-valuemin': '0',
    'aria-valuemax': String(max),
    'aria-valuenow': String(value),
    'aria-label': `${label}: ${display ?? Math.round(value)}`,
  },
    h('div', { class: 'c-meter__head' }, h('span', null, label), valueEl),
    h('div', { class: 'c-meter__track' }, fill),
  );

  return {
    el,
    update(next, nextDisplay) {
      const nextPercent = max > 0 ? clamp((next / max) * 100, 0, 100) : 0;
      fill.style.width = `${nextPercent}%`;
      el.setAttribute('aria-valuenow', String(next));
      if (nextDisplay !== undefined) valueEl.textContent = nextDisplay;
    },
  };
}
