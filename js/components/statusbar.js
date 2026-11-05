// Status bar palsu di dalam PhoneFrame (styles.md §4).
import { h } from '../core/dom.js';

export function createStatusBar() {
  const clock = h('span', null, new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  const bar = h('div', { class: 'c-statusbar' },
    clock,
    h('span', { class: 'c-statusbar__icons', 'aria-hidden': 'true' },
      h('span', null, '▮▮▯'),
      h('span', null, '68%'),
      h('span', { class: 'c-statusbar__bar' }),
    ),
  );

  const tick = setInterval(() => {
    clock.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }, 30_000);

  const stop = () => clearInterval(tick);
  return { el: bar, stop };
}
