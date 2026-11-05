// Keypad OTP tiruan (styles.md §5).
import { h, clear } from '../core/dom.js';

export function createKeypad({ digits = 6, submitLabel = 'Kirim kode', onSubmit } = {}) {
  let value = '';
  let locked = false;

  const cells = h('div', { class: 'c-otp', 'aria-hidden': 'true' });
  const display = h('div', { class: 'c-otp__cell is-filled', style: { width: 'auto', minWidth: '120px', padding: '0 8px', fontSize: '13px' }, 'aria-live': 'polite' }, 'Kode rahasia');
  const error = h('p', { class: 'u-small', style: { color: '#B33939', minHeight: '16px' }, role: 'status' }, '');
  const submit = h('button', {
    type: 'button',
    class: 'c-btn c-btn--primary c-btn--block',
    disabled: true,
    onclick: () => {
      if (locked || value.length !== digits) return;
      locked = true;
      onSubmit?.(value);
    },
  }, submitLabel);

  function render() {
    clear(cells);
    for (let i = 0; i < digits; i += 1) {
      cells.append(h('div', { class: `c-otp__cell${value[i] ? ' is-filled' : ''}` }, value[i] || ''));
    }
    submit.disabled = locked || value.length !== digits;
    display.textContent = value ? value.replace(/.(?=.)/g, '•') : 'Kode rahasia';
  }

  function push(digit) {
    if (locked || value.length >= digits) return;
    value += digit;
    error.textContent = '';
    render();
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'hapus', '0', 'ok'];
  const pad = h('div', { class: 'c-keypad' },
    ...keys.map((key) => {
      if (key === 'hapus') {
        return h('button', {
          type: 'button',
          'aria-label': 'Hapus digit',
          onclick: () => {
            if (locked) return;
            value = value.slice(0, -1);
            render();
          },
        }, '⌫');
      }
      if (key === 'ok') {
        return h('button', {
          type: 'button',
          'aria-label': 'Kirim kode',
          onclick: () => {
            if (locked || value.length !== digits) {
              error.textContent = `Isi ${digits} digit dulu.`;
              return;
            }
            locked = true;
            onSubmit?.(value);
          },
        }, '✓');
      }
      return h('button', { type: 'button', onclick: () => push(key) }, key);
    }),
  );

  render();

  const el = h('div', { class: 'u-col' },
    h('p', { class: 'u-small u-muted u-center' }, 'Masukkan 6 digit kode yang dikirim ke ponselmu.'),
    cells,
    display,
    pad,
    error,
    submit,
  );

  return {
    el,
    value: () => value,
    reset() {
      value = '';
      locked = false;
      render();
    },
    lock() {
      locked = true;
      submit.disabled = true;
    },
  };
}
