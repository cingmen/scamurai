// Bar progres skenario/bab/ujian (styles.md §5.6).
import { h } from '../core/dom.js';
import { clamp } from '../core/format.js';

export function progressBar({ value = 0, max = 100, label = '', showCount = true } = {}) {
  const percent = max > 0 ? clamp(Math.round((value / max) * 100), 0, 100) : 0;
  const fill = h('div', { class: 'c-progress__fill', style: { width: `${percent}%` } });
  const head = h('div', { class: 'c-progress__head' },
    h('span', null, label),
    showCount ? h('span', null, `${Math.round(value)}/${max}`) : null,
  );
  const el = h('div', {
    class: 'c-progress',
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': String(max),
    'aria-valuenow': String(value),
    'aria-label': label || 'Progres',
  }, head, h('div', { class: 'c-progress__track' }, fill));

  return {
    el,
    update(nextValue) {
      const nextPercent = max > 0 ? clamp(Math.round((nextValue / max) * 100), 0, 100) : 0;
      fill.style.width = `${nextPercent}%`;
      el.setAttribute('aria-valuenow', String(nextValue));
      if (showCount) head.lastElementChild.textContent = `${Math.round(nextValue)}/${max}`;
    },
  };
}
