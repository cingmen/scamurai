// Timeline anatomi serangan untuk debrief (styles.md §5).
import { h } from '../core/dom.js';

export function timeline(items = []) {
  const list = h('ol', { class: 'c-timeline' });
  items.forEach((item) => {
    list.append(h('li', { class: 'c-timeline__item' },
      h('span', { class: 'c-timeline__t' }, item.t || ''),
      h('span', { class: 'c-timeline__rail' }, h('span', { class: 'c-timeline__dot' })),
      h('div', { class: 'c-timeline__card' },
        h('h3', null, item.judul || ''),
        item.naskah ? h('p', { class: 'c-timeline__script' }, `“${item.naskah}”`) : null,
        item.tujuanPenipu ? h('p', { class: 'c-timeline__goal' }, `Tujuan penipu: ${item.tujuanPenipu}`) : null,
        item.efek ? h('p', null, item.efek) : null,
      ),
    ));
  });
  return list;
}
