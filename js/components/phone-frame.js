// Bingkai ponsel: panggung seluruh simulasi (styles.md §4).
import { h, clear } from '../core/dom.js';
import { createStatusBar } from './statusbar.js';

const APP_META = {
  chatriang: { title: 'ChatRiang', sub: 'terakhir dilihat baru saja', avatar: 'CR' },
  wa: { title: 'Grup', sub: '24 anggota', avatar: 'FG' },
  bank: { title: 'Bank Jayakarta', sub: 'Aman & terpercaya', avatar: 'BJ' },
  marketplace: { title: 'LakuPasar', sub: 'Belanja hemat', avatar: 'LP' },
  pinjol: { title: 'CairDuit', sub: 'Cair dalam 5 menit', avatar: 'CD' },
  browser: { title: 'BrowserMini', sub: 'Penjelajah aman', avatar: 'BM' },
  sms: { title: 'Pesan', sub: 'SMS', avatar: '✉' },
  call: { title: 'Telepon', sub: 'Panggilan masuk', avatar: '☎' },
  doc: { title: 'Dokumen', sub: 'PDF · 1 halaman', avatar: 'PDF' },
};

export function createPhoneFrame({ app = 'chatriang', title, sub, onExit = null, exitLabel = 'Keluar' } = {}) {
  const status = createStatusBar();
  const appbar = h('div', { class: 'c-appbar', dataset: { app } });
  const body = h('div', { class: 'c-phone__body' });
  const foot = h('div', { class: 'c-phone__foot' });
  foot.hidden = true;

  const exitBtn = h('button', {
    type: 'button',
    class: 'c-phone__exit',
    'aria-label': exitLabel,
    title: exitLabel,
    onclick: () => onExit?.(),
  }, '✕');

  const screen = h('div', { class: 'c-phone__screen' }, appbar, body, foot);
  const phone = h('div', { class: 'c-phone' }, h('div', { class: 'c-phone__notch' }), exitBtn, screen);
  const stage = h('div', { class: 'c-phone-stage' }, phone);

  function setApp(nextApp = app, extra = {}) {
    const meta = APP_META[nextApp] || APP_META.chatriang;
    appbar.dataset.app = nextApp;
    clear(appbar);
    appbar.append(
      h('div', { class: 'c-appbar__avatar', 'aria-hidden': 'true' }, meta.avatar),
      h('div', null,
        h('div', { class: 'c-appbar__title' }, extra.title || title || meta.title),
        h('div', { class: 'c-appbar__sub' }, extra.sub || sub || meta.sub),
      ),
      h('span', { class: 'c-appbar__sim' }, 'SIMULASI'),
    );
  }

  function setFoot(node) {
    clear(foot);
    if (!node) {
      foot.hidden = true;
      return;
    }
    foot.hidden = false;
    foot.append(node);
  }

  function destroy() {
    status.stop();
  }

  setApp(app, { title, sub });

  return {
    stage,
    phone,
    screen,
    body,
    foot,
    appbar,
    setApp,
    setFoot,
    setTitle: (newTitle, newSub) => setApp(appbar.dataset.app, { title: newTitle, sub: newSub }),
    destroy,
  };
}
