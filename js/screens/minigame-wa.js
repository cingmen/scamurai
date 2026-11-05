// Grup Fabel Investasi (app-logic.md §7).
import { loadJSON } from '../core/loader.js';
import { get } from '../core/store.js';
import { on } from '../core/events.js';
import { h, clear, scrollToEnd } from '../core/dom.js';
import { createWAEngine } from '../engines/wa-engine.js';
import { createPhoneFrame } from '../components/phone-frame.js';
import { progressBar } from '../components/progress.js';
import { openModal, confirmModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { sfx } from '../core/sfx.js';

const ROLE_LABEL = { admin: 'admin', shill: 'anggota', 'victim-organic': 'anggota', skeptic: 'temanmu' };

export async function render(root) {
  const minigame = await loadJSON('./data/minigames/wa-grup.json');
  const engine = createWAEngine(minigame);
  const actorById = new Map(minigame.actors.map((actor) => [actor.id, actor]));

  clear(root);
  const phone = createPhoneFrame({
    app: 'wa',
    title: minigame.title,
    sub: '24 anggota · SIMULASI',
    onExit: askExit,
  });
  phone.body.style.padding = '0';

  const progress = progressBar({ value: 0, max: 100, label: 'Hari simulasi', showCount: false });
  const speedLabel = h('span', { class: 'u-small u-muted' }, '1×');
  let speed = 1;
  let lastDate = null;

  const group = h('div', { class: 'c-group', role: 'log', 'aria-live': 'polite', 'aria-label': 'Pesan grup' });
  const intro = h('div', { class: 'c-card', style: { margin: 'var(--s-sp-3)' } },
    h('h2', { style: { fontSize: 'var(--s-fs-600)' } }, minigame.title),
    h('p', { class: 'u-small u-muted u-mt-2' }, minigame.intro),
    h('p', { class: 'u-small u-mt-3' }, 'Kamu bergabung sebagai anggota baru. Kamu bisa diam, bertanya, keluar, atau melaporkan grup.'),
    h('button', {
      type: 'button',
      class: 'c-btn c-btn--primary c-btn--block u-mt-4',
      onclick: () => startGame(),
    }, 'Mulai observasi'),
  );
  phone.body.append(intro);

  const topbar = h('div', { class: 'c-sim-topbar' },
    h('a', { class: 'c-btn c-btn--quiet c-btn--sm', href: '#/' }, '← Dojo'),
    h('div', null,
      h('h1', { class: 'c-sim-topbar__title', style: { fontSize: 'var(--s-fs-400)' } }, 'Dojo latihan'),
      h('div', { class: 'c-sim-topbar__meta' }, 'Grup Fabel Investasi'),
    ),
    progress.el,
    h('div', { class: 'c-group__speed' },
      ...[1, 2, 4].map((value) => h('button', {
        type: 'button',
        'aria-pressed': value === speed ? 'true' : 'false',
        onclick: (event) => {
          speed = value;
          const row = event.currentTarget.parentElement;
          row.querySelectorAll('button').forEach((btn) => btn.setAttribute('aria-pressed', 'false'));
          event.currentTarget.setAttribute('aria-pressed', 'true');
          speedLabel.textContent = `${value}×`;
        },
      }, `${value}×`)),
    ),
  );

  root.append(h('div', { class: 'scr-minigame' }, topbar, phone.stage));

  function appendMessage(beat) {
    const actor = actorById.get(beat.actor) || { name: beat.actor, initials: '?', role: 'shill' };
    if (beat.date && beat.date !== lastDate) {
      lastDate = beat.date;
      group.append(h('div', { class: 'c-group__date' }, beat.date));
    }
    const row = h('div', { class: 'c-group__row' },
      h('div', { class: 'c-group__sender c-group__sender--' + (actor.role === 'victim-organic' ? 'victim' : actor.role) },
        actor.name,
        actor.role === 'admin' || actor.role === 'skeptic'
          ? h('span', { class: `c-group__role c-group__role--${actor.role === 'skeptic' ? 'skeptic' : 'admin'}` }, ROLE_LABEL[actor.role])
          : null,
      ),
      h('div', { class: 'c-group__bubble' }, beat.text),
    );
    group.append(row);
    scrollToEnd(phone.body);
  }

  function actionBar({ canReport, canLeave }) {
    const actions = h('div', { class: 'c-group__actions' },
      h('button', {
        type: 'button',
        class: 'c-group__action',
        onclick: () => {
          sfx('tap');
          engine.act('diam', speed);
          phone.setFoot(h('div', { class: 'c-group__hint' }, 'Kamu memilih diam dan mengamati…'));
        },
      }, 'Diam & amati'),
      h('button', {
        type: 'button',
        class: 'c-group__action',
        onclick: () => {
          sfx('tap');
          engine.act('bertanya', speed);
          phone.setFoot(h('div', { class: 'c-group__hint' }, 'Kamu bertanya. Perhatikan siapa yang menjawab…'));
        },
      }, 'Bertanya'),
      h('button', {
        type: 'button',
        class: 'c-group__action c-group__action--danger',
        disabled: !canReport,
        onclick: async () => {
          const ok = await confirmModal({
            title: 'Laporkan grup?',
            message: 'Kamu akan keluar dari grup dan menandai admin serta akun pemanas suasana sebagai penipuan.',
            confirmLabel: 'Laporkan',
            cancelLabel: 'Belum',
            danger: true,
          });
          if (ok) engine.act('melaporkan');
        },
      }, canReport ? 'Laporkan grup' : 'Laporkan (giliran 8+)'),
      h('button', {
        type: 'button',
        class: 'c-group__action c-group__action--quiet',
        disabled: !canLeave,
        onclick: async () => {
          const ok = await confirmModal({
            title: 'Keluar dari grup?',
            message: 'Kamu berhenti mengamati. Semakin awal keluar, semakin baik nilaimu.',
            confirmLabel: 'Keluar grup',
            cancelLabel: 'Tetap di grup',
          });
          if (ok) engine.act('keluar');
        },
      }, canLeave ? 'Keluar grup' : 'Keluar (giliran 10+)'),
    );
    phone.setFoot(h('div', { class: 'u-col' },
      h('div', { class: 'c-group__hint' }, 'Momen untuk memutuskan. Tidak ada jawaban yang dipaksa.'),
      actions,
    ));
  }

  function startGame() {
    intro.remove();
    phone.body.append(group);
    phone.setFoot(h('div', { class: 'c-group__hint' }, 'Pesan akan muncul otomatis. Amati pola, bukan satu pesan.'));
    engine.start(speed);
  }

  function showDebrief(result) {
    clear(phone.body);
    phone.setFoot(null);
    const actors = minigame.actors;
    phone.body.append(h('div', { class: 'u-col', style: { padding: 'var(--s-sp-3)' } },
      h('div', { class: 'c-card c-card--accent' },
        h('h2', { style: { fontSize: 'var(--s-fs-700)' } }, result.reported ? 'Grup dilaporkan' : (result.reason === 'keluar' ? 'Kamu keluar dari grup' : 'Sesi berakhir')),
        h('p', { class: 'u-small u-muted u-mt-2' },
          result.reported
            ? `Kamu melapor pada giliran ${result.turn}. Itu langkah terbaik: keluar dan memberi bukti.`
            : `Kamu bertahan sampai giliran ${result.turn}. Semakin awal keluar, semakin kecil paparanmu.`,
        ),
        h('p', { class: 'u-small u-mt-2' }, `Rekor keluar terbaikmu: giliran ${result.best ?? result.turn}.`),
      ),
      h('section', { class: 'c-card' },
        h('h3', { class: 'section-title', style: { fontSize: 'var(--s-fs-600)' } }, 'Peran tiap akun'),
        h('div', { class: 'c-actor-list' },
          ...actors.map((actor) => h('div', { class: 'c-actor' },
            h('div', { class: 'c-actor__avatar' }, actor.initials),
            h('div', null,
              h('div', { class: 'c-actor__name' }, actor.name),
              h('div', { class: 'c-actor__role' }, actor.role === 'admin' ? 'Admin / operator' : actor.role === 'shill' ? 'Akun pemanas suasana' : actor.role === 'skeptic' ? 'Suara skeptis' : 'Korban organik'),
              h('div', { class: 'c-actor__why' }, actor.why),
            ),
          )),
        ),
      ),
      h('section', { class: 'c-card' },
        h('h3', { class: 'section-title', style: { fontSize: 'var(--s-fs-600)' } }, 'Pola yang seharusnya terlihat'),
        h('ul', { class: 'c-dex-list' },
          ...minigame.debrief.signals.map((signal) => h('li', null, signal)),
        ),
        h('p', { class: 'u-small u-muted u-mt-3' }, minigame.debrief.closing),
      ),
      h('div', { class: 'u-col' },
        h('a', { class: 'c-btn c-btn--primary c-btn--block', href: '#/scamdex' }, 'Buka ScamDEX investasi'),
        h('a', { class: 'c-btn c-btn--ghost c-btn--block', href: '#/grup' }, 'Ulangi observasi'),
        h('a', { class: 'c-btn c-btn--quiet c-btn--block', href: '#/' }, 'Kembali ke beranda'),
      ),
    ));
    sfx('badge');
  }

  async function askExit() {
    const ok = await confirmModal({
      title: 'Keluar dari dojo grup?',
      message: 'Sesi observasi akan berhenti. Kamu bisa memulainya lagi kapan saja.',
      confirmLabel: 'Keluar',
      cancelLabel: 'Lanjut',
    });
    if (ok) window.location.hash = '#/';
  }

  const offMessage = on('wa:message', ({ beat }) => {
    appendMessage(beat);
    progress.update(engine.progress());
  });
  const offTurn = on('wa:turn', ({ canReport, canLeave }) => {
    actionBar({ canReport, canLeave });
  });
  const offEnd = on('wa:end', (result) => {
    showToast(result.reported ? 'Grup dilaporkan. Bukti tersimpan.' : 'Sesi observasi selesai.', { timeout: 3500 });
    showDebrief(result);
  });

  return () => {
    offMessage();
    offTurn();
    offEnd();
    engine.stop();
    phone.destroy();
  };
}
