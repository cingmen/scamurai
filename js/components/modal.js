// Modal dialog (role=dialog) dengan focus trap (styles.md §5.7).
import { h, trapFocus } from '../core/dom.js';

let active = null;

/**
 * Buka modal. Mengembalikan Promise berisi value aksi yang dipilih (atau null).
 * @param {{title:string, body?:Node|string, actions?:Array, hard?:boolean, onClose?:Function}} options
 */
export function openModal(options) {
  const {
    title,
    body = null,
    actions = [{ label: 'Tutup', value: null, variant: 'ghost' }],
    hard = false,
    onClose = null,
  } = options;

  closeModal({ silent: true });

  return new Promise((resolve) => {
    const modalRoot = document.getElementById('modal-root') || document.body;
    let releaseTrap = () => {};
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      releaseTrap();
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      active = null;
      onClose?.(value);
      resolve(value);
    };

    function onKeydown(event) {
      if (event.key === 'Escape' && !hard) {
        event.preventDefault();
        finish(null);
      }
    }

    const actionButtons = actions.map((action) => h('button', {
      type: 'button',
      class: `c-btn c-btn--${action.variant || 'ghost'}`,
      onclick: () => finish(action.value ?? null),
    }, action.label));

    const card = h('div', {
      class: 'c-modal__card',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'modal-title',
    },
      h('h2', { id: 'modal-title' }, title),
      body instanceof Node ? body : (body ? h('p', null, body) : null),
      h('div', { class: 'c-modal__actions' }, ...actionButtons),
    );

    const overlay = h('div', {
      class: 'c-modal',
      onclick: (event) => {
        if (event.target === overlay && !hard) finish(null);
      },
    }, card);

    modalRoot.appendChild(overlay);
    releaseTrap = trapFocus(card);
    document.addEventListener('keydown', onKeydown);
    active = { finish };
    setTimeout(() => actionButtons[actionButtons.length - 1]?.focus(), 30);
  });
}

export function closeModal({ silent = false } = {}) {
  if (!active) return;
  const instance = active;
  active = null;
  instance.finish(null);
  if (!silent) return;
}

export async function confirmModal({ title, message, confirmLabel = 'Lanjut', cancelLabel = 'Batal', danger = false }) {
  const value = await openModal({
    title,
    body: message,
    actions: [
      { label: cancelLabel, value: 'cancel', variant: 'ghost' },
      { label: confirmLabel, value: 'ok', variant: danger ? 'danger' : 'primary' },
    ],
  });
  return value === 'ok';
}

export function hasOpenModal() {
  return Boolean(active);
}
