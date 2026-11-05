// Kartu ScamDEX & sabuk (styles.md §5.5).
import { h } from '../core/dom.js';
import { BELTS, beltInfo } from '../core/store.js';

export function dexCard(card, { unlocked = false, variant = false, onClick = null } = {}) {
  const severity = Number(card.severity) || 1;
  const tag = variant ? h('span', { class: 'c-card-dex__tag' }, 'VARIAN') : null;

  const inner = [
    tag,
    h('div', { class: 'c-card-dex__art' },
      unlocked
        ? h('img', { src: card.icon, alt: '', loading: 'lazy', width: '120', height: '120' })
        : h('span', { style: { fontSize: '2rem', opacity: '.5' }, 'aria-hidden': 'true' }, '?'),
    ),
    h('div', { class: 'c-card-dex__name' }, unlocked ? (variant ? card.variantName || card.name : card.name) : 'Kartu terkunci'),
    h('div', { class: 'c-card-dex__sev', 'aria-label': `Keparahan ${severity} dari 3` },
      ...[1, 2, 3].map((n) => h('i', { class: n <= severity ? 'is-on' : '' })),
    ),
  ];

  if (!unlocked) inner.push(h('span', { class: 'c-card-dex__lock', 'aria-hidden': 'true' }, '🔒'));

  const tagName = onClick && unlocked ? 'button' : 'div';
  const attrs = {
    class: `c-card-dex${unlocked ? '' : ' is-locked'}${variant ? ' c-card-dex--variant' : ''}`,
  };
  if (tagName === 'button') {
    attrs.type = 'button';
    attrs.onclick = () => onClick(card);
    attrs['aria-label'] = `${card.name} — buka detail`;
  }
  return h(tagName, attrs, ...inner);
}

export function beltBadge({ compact = false } = {}) {
  const info = beltInfo();
  return h('span', { class: `c-chip ${compact ? '' : 'c-chip--lg'}`, style: { background: info.color, color: info.ink, borderColor: 'transparent' } },
    h('span', { 'aria-hidden': 'true' }, '／'),
    `Sabuk ${info.name}`,
  );
}

export function beltLadder(level) {
  return h('ol', { class: 'u-row', style: { listStyle: 'none', padding: '0', gap: '6px' }, 'aria-label': 'Tangga sabuk' },
    ...BELTS.map((belt, index) => h('li', {
      class: 'c-chip',
      style: {
        background: index <= level ? belt.color : 'transparent',
        color: index <= level ? belt.ink : 'var(--s-ink-faint)',
        borderColor: index <= level ? 'transparent' : 'var(--s-line)',
        opacity: index <= level ? '1' : '.7',
      },
      title: index <= level ? `Sabuk ${belt.name} tercapai` : `Sabuk ${belt.name}`,
    }, belt.name)),
  );
}
