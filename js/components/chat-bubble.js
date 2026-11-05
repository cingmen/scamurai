// Bubble chat tiruan (styles.md §5.2).
import { h } from '../core/dom.js';

function attachmentNode(attach) {
  if (!attach) return null;
  if (attach.type === 'image') {
    return h('div', { class: 'c-chat__attach c-chat__attach--img' },
      h('img', {
        src: attach.src,
        alt: attach.alt || 'Lampiran gambar simulasi',
        loading: 'lazy',
        width: '200',
        height: '110',
      }),
    );
  }
  return h('div', { class: 'c-chat__attach' },
    h('span', { class: 'c-chat__attach-icon', 'aria-hidden': 'true' }, attach.type === 'pdf' ? '▤' : '▣'),
    h('span', null,
      h('span', { style: { display: 'block' } }, attach.label || 'Lampiran'),
      h('span', { style: { fontWeight: '400', opacity: '.75' } }, attach.meta || 'SIMULASI · tidak nyata'),
    ),
  );
}

/**
 * @param {{dir?:'in'|'out'|'narator'|'system', text:string, time?:string,
 * sender?:string, attach?:object, label?:string, check?:boolean}} opts
 */
export function chatBubble(opts) {
  const { dir = 'in', text, time = '', sender, attach, label, check = false } = opts;
  const row = h('div', {
    class: `c-chat__row${dir === 'out' ? ' c-chat__row--out' : ''}${dir === 'narator' ? ' c-chat__row--narator' : ''}${dir === 'system' ? ' c-chat__row--system' : ''}`,
  });

  if (sender) row.append(h('span', { class: 'c-chat__sender' }, sender));
  const bubble = h('div', { class: 'c-chat__bubble' }, text);
  if (attach) bubble.append(attachmentNode(attach));
  row.append(bubble);

  const metaBits = [];
  if (label) metaBits.push(h('span', { class: 'c-chip c-chip--warn', style: { padding: '1px 5px', fontSize: '9px' } }, label));
  if (time) metaBits.push(h('span', null, time));
  if (check) metaBits.push(h('span', { class: 'c-chat__check', 'aria-label': 'dibaca' }, '✓✓'));
  if (metaBits.length) row.append(h('div', { class: 'c-chat__meta' }, ...metaBits));

  return row;
}

export function typingBubble() {
  return h('div', { class: 'c-chat__row' },
    h('div', { class: 'c-chat__bubble c-typing', 'aria-label': 'sedang menulis' },
      h('i'), h('i'), h('i'),
    ),
  );
}

export function dateDivider(text) {
  return h('div', { class: 'c-chat__date' }, text);
}
