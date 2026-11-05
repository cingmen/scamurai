// Toast singkat, aria-live polite (styles.md §5.7).
import { h } from '../core/dom.js';

let current = null;
let timer = null;

export function showToast(message, options = {}) {
  const { actionLabel = null, onAction = null, timeout = 2600 } = options;
  const region = document.getElementById('toast-region');
  if (!region) return () => {};

  if (current) {
    current.remove();
    clearTimeout(timer);
  }

  const node = h('div', { class: 'c-toast' },
    h('span', null, message),
    actionLabel
      ? h('button', {
        type: 'button',
        onclick: () => {
          try { onAction?.(); } finally { dismiss(); }
        },
      }, actionLabel)
      : null,
  );

  region.appendChild(node);
  current = node;

  function dismiss() {
    if (node === current) current = null;
    node.remove();
    clearTimeout(timer);
  }

  if (timeout > 0) timer = setTimeout(dismiss, timeout);
  return dismiss;
}
