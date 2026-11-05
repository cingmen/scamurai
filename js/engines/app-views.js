// Tampilan aplikasi tiruan (bank, marketplace, pinjol, dokumen).
// Murni DOM; teks selalu masuk sebagai text node.
import { h } from '../core/dom.js';
import { get } from '../core/store.js';
import { rupiah } from '../core/format.js';

function bankCard({ saldo, rekening = '8820 1145 7790', holder = 'KAMU' }) {
  return h('div', { class: 'c-bank__card' },
    h('div', { class: 'c-bank__label' }, 'Saldo tersedia · SIMULASI'),
    h('div', { class: 'c-bank__saldo' }, rupiah(saldo)),
    h('div', { class: 'c-bank__rek' }, `${holder} · ${rekening}`),
  );
}

function bankActions() {
  return h('div', { class: 'c-bank__actions' },
    ...[['⇄', 'Transfer'], ['▤', 'Mutasi'], ['＋', 'Top up'], ['⋯', 'Lainnya']].map(([icon, label]) =>
      h('div', { class: 'c-bank__action' }, h('span', { 'aria-hidden': 'true' }, icon), h('span', null, label)),
    ),
  );
}

function mutationRows(entries = []) {
  return h('div', { class: 'c-mutasi' },
    ...entries.map((entry) => h('div', { class: 'c-mutasi__row' },
      h('div', null,
        h('div', { class: 'c-mutasi__name' }, entry.name),
        h('div', { class: 'c-mutasi__date' }, `${entry.date || ''}${entry.detail ? ` · ${entry.detail}` : ''}`),
      ),
      h('div', { class: `c-mutasi__nominal ${entry.amount < 0 ? 'c-mutasi__nominal--out' : 'c-mutasi__nominal--in'}` },
        `${entry.amount < 0 ? '−' : '+'} ${rupiah(Math.abs(entry.amount))}`),
    )),
  );
}

export function bankView(step, ctx) {
  const data = step.data || {};
  const view = step.view || data.view || 'balance';
  const saldo = Number(data.saldo ?? get('dojo.saldo', 0));
  const wrap = h('div', { class: 'c-bank' });
  wrap.append(bankCard({ saldo, rekening: data.rekening, holder: data.holder }));
  wrap.append(bankActions());

  if (view === 'transfer') {
    const fields = h('div', { class: 'c-bank__field' },
      h('label', null, 'Rekening tujuan'),
      h('div', { class: 'c-browser__input' }, `${data.recipient || '—'} · ${data.account || '—'}`),
    );
    const amountField = h('div', { class: 'c-bank__field' },
      h('label', null, 'Nominal'),
      h('div', { class: 'c-browser__input' }, rupiah(data.amount || 0)),
    );
    const review = h('div', { class: 'c-bank__review' },
      h('div', null, 'Berita transfer: ', h('b', null, data.note || '-')),
      h('div', null, 'Biaya: ', h('b', null, rupiah(data.fee || 0))),
      h('div', null, 'Total: ', h('b', null, rupiah((Number(data.amount) || 0) + (Number(data.fee) || 0)))),
    );
    const button = h('button', {
      type: 'button',
      class: 'c-btn c-btn--primary c-btn--block',
      onclick: () => {
        button.disabled = true;
        ctx.goto(step.button?.goto ?? ctx.index + 1);
      },
    }, step.button?.label || 'Transfer sekarang');

    wrap.append(h('div', { class: 'c-bank__section' },
      h('h3', null, data.title || 'Transfer baru'),
      fields,
      amountField,
      review,
      data.warning ? h('p', { class: 'c-bank__warning' }, data.warning) : null,
    ), button);
  } else if (view === 'mutasi') {
    wrap.append(h('div', { class: 'c-bank__section' },
      h('h3', null, data.title || 'Mutasi terakhir'),
      mutationRows(data.entries || []),
    ));
    if (step.button) {
      wrap.append(h('button', {
        type: 'button',
        class: 'c-btn c-btn--primary c-btn--block',
        onclick: () => ctx.goto(step.button.goto ?? ctx.index + 1),
      }, step.button.label || 'Lanjut'));
    } else {
      wrap.append(h('button', {
        type: 'button',
        class: 'c-btn c-btn--ghost c-btn--block',
        onclick: () => ctx.next(),
      }, 'Tutup'));
    }
  } else if (view === 'balance') {
    wrap.append(h('div', { class: 'c-bank__section' },
      h('h3', null, data.title || 'Ringkasan'),
      mutationRows(data.entries || []),
    ));
    wrap.append(h('button', {
      type: 'button',
      class: 'c-btn c-btn--primary c-btn--block',
      onclick: () => (step.button ? ctx.goto(step.button.goto ?? ctx.index + 1) : ctx.next()),
    }, step.button?.label || 'Lanjut'));
  } else if (view === 'blocked') {
    wrap.append(h('div', { class: 'c-bank__section' },
      h('h3', null, 'Rekening dibekukan'),
      h('p', { class: 'u-small u-muted' }, data.message || 'Ada aktivitas mencurigakan. Hubungi call center resmi.'),
    ));
    wrap.append(h('button', {
      type: 'button',
      class: 'c-btn c-btn--primary c-btn--block',
      onclick: () => (step.button ? ctx.goto(step.button.goto ?? ctx.index + 1) : ctx.next()),
    }, step.button?.label || 'Lanjut'));
  }

  return wrap;
}

export function marketView(step, ctx) {
  const data = step.data || {};
  const wrap = h('div', { class: 'c-market' });

  if (data.search) wrap.append(h('div', { class: 'c-market__search' }, `⌕ ${data.search}`));
  if (data.promo) wrap.append(h('div', { class: 'c-market__promo' }, data.promo));

  if (step.view === 'product' || data.products) {
    wrap.append(h('div', { class: 'c-market__grid' },
      ...(data.products || []).map((product) => h('div', { class: 'c-product' },
        h('div', { class: 'c-product__art', 'aria-hidden': 'true' }, product.glyph || '▣'),
        h('div', { class: 'c-product__body' },
          h('div', { class: 'c-product__name' }, product.name),
          h('div', { class: 'c-product__price' }, rupiah(product.price)),
          h('div', { class: 'c-product__badge' }, product.badge || ''),
          h('div', { class: 'c-product__seller' }, product.seller || ''),
        ),
      )),
    ));
  }

  if (data.detail) {
    wrap.append(h('div', { class: 'c-bank__section' },
      h('h3', null, data.detail.title || 'Detail'),
      ...(data.detail.lines || []).map((line) => h('div', { class: 'c-checkout__row' }, line)),
      data.detail.seller ? h('p', { class: 'u-small u-muted' }, data.detail.seller) : null,
    ));
  }

  wrap.append(h('button', {
    type: 'button',
    class: 'c-btn c-btn--primary c-btn--block',
    onclick: () => (step.button ? ctx.goto(step.button.goto ?? ctx.index + 1) : ctx.next()),
  }, step.button?.label || 'Lanjut'));

  return wrap;
}

export function pinjolView(step, ctx) {
  const data = step.data || {};
  const wrap = h('div', { class: 'c-pinjol' });

  if (step.view === 'permission' || data.permissions) {
    wrap.append(h('div', { class: 'c-bank__section' },
      h('h3', null, data.title || 'Izin yang diminta aplikasi'),
      h('div', { class: 'c-perm' },
        ...(data.permissions || []).map((perm) => {
          const item = h('div', {
            class: `c-perm__item${perm.on !== false ? ' is-on' : ''}${perm.risk ? ' is-risk' : ''}`,
            role: 'checkbox',
            'aria-checked': perm.on !== false ? 'true' : 'false',
            tabindex: '0',
          },
            h('span', { class: 'c-perm__check', 'aria-hidden': 'true' }, '✓'),
            h('div', null,
              h('div', { class: 'c-perm__label' }, perm.label),
              h('div', { class: 'c-perm__risk' }, perm.risk || ''),
            ),
          );
          const toggle = () => {
            const on = item.classList.toggle('is-on');
            item.setAttribute('aria-checked', on ? 'true' : 'false');
          };
          item.addEventListener('click', toggle);
          item.addEventListener('keydown', (event) => {
            if (event.key === ' ' || event.key === 'Enter') {
              event.preventDefault();
              toggle();
            }
          });
          return item;
        }),
      ),
    ));
  } else {
    wrap.append(h('div', { class: 'c-pinjol__hero' },
      h('div', { class: 'c-pinjol__sub' }, data.tagline || 'Butuh dana cepat?'),
      h('div', { class: 'c-pinjol__big' }, rupiah(data.amount || 3_000_000)),
      h('div', { class: 'c-pinjol__sub' }, data.tenor || 'Tenor 14 hari · bunga 0%'),
      h('span', { class: 'c-pinjol__badge' }, data.badge || 'TANPA JAMINAN'),
    ));

    if (data.stats) {
      wrap.append(h('div', { class: 'c-pinjol__stats' },
        ...data.stats.map((stat) => h('div', { class: 'c-pinjol__stat' },
          h('b', null, stat.value), stat.label,
        )),
      ));
    }
    if (data.note) {
      wrap.append(h('p', { class: 'u-small u-muted' }, data.note));
    }
  }

  wrap.append(h('button', {
    type: 'button',
    class: 'c-btn c-btn--primary c-btn--block',
    onclick: () => (step.button ? ctx.goto(step.button.goto ?? ctx.index + 1) : ctx.next()),
  }, step.button?.label || 'Lanjut'));

  return wrap;
}

export function docView(step, ctx) {
  const data = step.data || {};
  const wrap = h('div', { class: 'u-col' });
  wrap.append(h('div', { class: 'c-doc' },
    h('div', { class: 'c-doc__logo' }, data.logo || 'PT. MITRA GLOBAL SEJAHTERA'),
    h('div', { class: 'c-doc__title' }, data.title || 'Surat Penawaran Kerja'),
    h('div', { class: 'c-doc__meta' }, data.meta || 'No. 014/MGS/XI/2026 · SIMULASI'),
    h('hr', { class: 'c-doc__hr' }),
    ...(data.paragraphs || []).map((paragraph) => h('p', { class: 'c-doc__p' }, paragraph)),
    h('hr', { class: 'c-doc__hr' }),
    h('div', { class: 'c-doc__sign' }, data.signature || 'Hormat kami, Bagian Rekrutmen'),
  ));
  wrap.append(h('button', {
    type: 'button',
    class: 'c-btn c-btn--primary c-btn--block',
    onclick: () => (step.button ? ctx.goto(step.button.goto ?? ctx.index + 1) : ctx.next()),
  }, step.button?.label || 'Tutup dokumen'));
  return wrap;
}

export function appUiView(step, ctx) {
  const app = step.app || step.data?.app;
  if (app === 'bank') return bankView(step, ctx);
  if (app === 'marketplace') return marketView(step, ctx);
  if (app === 'pinjol') return pinjolView(step, ctx);
  if (app === 'doc') return docView(step, ctx);
  // Fallback generik
  return h('div', { class: 'u-col' },
    h('div', { class: 'c-bank__section' },
      h('h3', null, step.data?.title || 'Aplikasi'),
      h('p', { class: 'u-small' }, step.data?.text || ''),
    ),
    h('button', {
      type: 'button',
      class: 'c-btn c-btn--primary c-btn--block',
      onclick: () => (step.button ? ctx.goto(step.button.goto ?? ctx.index + 1) : ctx.next()),
    }, step.button?.label || 'Lanjut'),
  );
}
