// Daftar pilihan balasan/aksi (styles.md §5.1).
import { h } from '../core/dom.js';
import { get } from '../core/store.js';

/**
 * @param {{prompt?:string, options:Array<{id:string,label:string,hint?:string,danger?:boolean,quiet?:boolean}>,
 * onPick:(id:string)=>void, elder?:boolean}} opts
 */
export function choiceList(opts) {
  const { prompt, options = [], onPick } = opts;
  const elder = opts.elder ?? get('settings.mode', 'standar') === 'lansia';
  const wrap = h('div', { class: 'c-choice-list' });
  if (prompt) wrap.append(h('p', { class: 'c-choice-list__prompt' }, prompt));

  let revealed = !elder;
  const visible = () => (revealed ? options : options.slice(0, 2));

  function render() {
    while (wrap.children.length > (prompt ? 1 : 0)) wrap.lastChild.remove();
    visible().forEach((option) => {
      const button = h('button', {
        type: 'button',
        class: `c-choice${option.danger ? ' c-choice--danger' : ''}${option.quiet ? ' c-choice--quiet' : ''}`,
        onclick: () => {
          if (button.disabled) return;
          wrap.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          onPick?.(option.id);
        },
      },
        h('span', null, option.label),
        option.hint ? h('span', { class: 'c-choice__hint' }, option.hint) : null,
      );
      wrap.append(button);
    });

    if (!revealed && options.length > 2) {
      wrap.append(h('button', {
        type: 'button',
        class: 'c-choice c-choice--quiet',
        onclick: () => {
          revealed = true;
          render();
        },
      }, `Tampilkan ${options.length - 2} pilihan lain`));
    }
  }

  render();
  return wrap;
}
