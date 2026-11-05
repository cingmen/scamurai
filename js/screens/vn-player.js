// Pemutar visual novel (structure.md §4.3).
import { loadJSON } from '../core/loader.js';
import { get } from '../core/store.js';
import { on } from '../core/events.js';
import { h, clear } from '../core/dom.js';
import { createVNEngine } from '../engines/vn-engine.js';
import { createPhoneFrame } from '../components/phone-frame.js';
import { openModal, confirmModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { progressBar } from '../components/progress.js';
import { sfx } from '../core/sfx.js';
import { addPlayTime } from '../core/progress.js';
import { rupiah, dateID } from '../core/format.js';

const SPEAKER_LABEL = {
  bagas: 'Bagas',
  kamu: 'Kamu',
  narator: 'Narasi',
  kenji: 'Kenji',
  mira: 'Mira',
};

const PORTRAIT = {
  bagas: './assets/img/scenarios/love-scam/bagas.svg',
  mira: null,
  narator: null,
  kamu: null,
};

export async function render(root, { params }) {
  const id = params[0];
  const [manifest, scenario] = await Promise.all([
    loadJSON('./data/manifest.json'),
    loadJSON(`./data/scenarios/${id}.json`),
  ]);
  const meta = manifest.scenarios.find((item) => item.id === id) || { title: scenario.title };
  const status = get(`progress.${id}.status`, 'belum');
  const engine = createVNEngine(scenario, { resume: status === 'berjalan' });

  clear(root);
  const startedAt = Date.now();

  const phone = createPhoneFrame({
    app: 'chatriang',
    onExit: askExit,
  });
  phone.appbar.hidden = true;
  phone.body.style.padding = '0';
  phone.body.style.overflow = 'hidden';

  const chapterPill = h('div', { class: 'c-vn-chapter' });
  const portrait = h('div', { class: 'c-vn-portrait is-hidden' });
  const speakerEl = h('div', { class: 'c-vn-speaker' });
  const textEl = h('div', { class: 'c-vn-text' });
  const timeEl = h('div', { class: 'c-vn-time' });
  const choicesEl = h('div', { class: 'c-vn-choices' });
  const hintEl = h('div', { class: 'c-vn-hint' }, 'Ketuk untuk melanjutkan');
  const dialogue = h('div', { class: 'c-vn-dialogue' },
    speakerEl,
    textEl,
    timeEl,
    choicesEl,
    hintEl,
  );

  const progress = progressBar({ value: 1, max: 5, label: 'Bab', showCount: true });
  const historyLayer = h('div', { class: 'c-vn-history', hidden: true });
  const stage = h('div', { class: 'c-vn-stage' },
    h('div', { class: 'c-vn-stage__sky' }),
    h('div', { class: 'c-vn-stage__city' }),
    chapterPill,
    portrait,
    dialogue,
    historyLayer,
  );
  phone.foot.hidden = false;
  phone.foot.style.background = 'transparent';
  phone.foot.style.border = '0';
  phone.foot.append(progress.el);
  phone.body.append(stage);
  root.append(h('div', { class: 'scr-vn' }, phone.stage));

  let typingTimer = null;
  let typingSkip = null;
  let lastNode = null;
  let ended = false;

  function clearTyping() {
    if (typingTimer) clearInterval(typingTimer);
    typingTimer = null;
    typingSkip = null;
  }

  function typeText(text, speed) {
    clearTyping();
    const elder = get('settings.mode', 'standar') === 'lansia';
    const faster = Number(get('settings.textSpeed', 1)) || 1;
    const interval = elder ? 0 : Math.max(8, 26 / faster);
    if (!interval) {
      textEl.textContent = text;
      hintEl.hidden = false;
      return;
    }
    let index = 0;
    textEl.textContent = '';
    hintEl.hidden = true;
    const tick = () => {
      index += Math.max(1, Math.round(interval / 12));
      textEl.textContent = text.slice(0, index);
      if (index >= text.length) {
        clearInterval(typingTimer);
        typingTimer = null;
        hintEl.hidden = false;
      }
    };
    typingTimer = setInterval(tick, interval);
    typingSkip = () => {
      clearTyping();
      textEl.textContent = text;
      hintEl.hidden = false;
    };
  }

  function renderChoices(node) {
    clear(choicesEl);
    const choices = engine.visibleChoices(node);
    hintEl.hidden = choices.length > 0;
    choices.forEach((choice) => {
      choicesEl.append(h('button', {
        type: 'button',
        class: 'c-vn-choice',
        onclick: (event) => {
          event.stopPropagation();
          sfx('tap');
          engine.choose(choice.id);
        },
      }, choice.label));
    });
  }

  function renderNode({ node, chapter }) {
    lastNode = node;
    chapterPill.textContent = `${chapter?.title || 'Bab'} · ${chapter?.subtitle || ''}`;
    progress.update((engine.chapters().findIndex((item) => item.id === chapter?.id) + 1) || 1);

    portrait.classList.toggle('is-hidden', !PORTRAIT[node.speaker]);
    if (PORTRAIT[node.speaker]) {
      clear(portrait);
      portrait.append(h('img', {
        src: PORTRAIT[node.speaker],
        alt: 'Potret abstrak Bagas, karakter fiktif',
        width: '128',
        height: '128',
      }));
    }

    speakerEl.textContent = SPEAKER_LABEL[node.speaker] || SPEAKER_LABEL.narator;
    speakerEl.className = `c-vn-speaker${node.speaker === 'kamu' ? ' c-vn-speaker--kamu' : ''}${node.speaker === 'narator' ? ' c-vn-speaker--narator' : ''}`;

    const text = node.text || '';
    if (node.attach?.type === 'image' && node.attach.src) {
      const old = dialogue.querySelector('.c-vn-attach');
      if (old) old.remove();
      const attach = h('div', { class: 'c-vn-attach' },
        h('img', {
          src: node.attach.src,
          alt: node.attach.alt || 'Lampiran gambar simulasi',
          width: '240',
          height: '300',
        }),
      );
      textEl.after(attach);
    } else {
      const old = dialogue.querySelector('.c-vn-attach');
      if (old) old.remove();
    }

    timeEl.textContent = node.time || '';
    clear(choicesEl);
    typeText(text, 1);

    if (node.type === 'videocall') {
      showVideocall(node);
      return;
    }

    if (node.type === 'ending') {
      clearTyping();
      textEl.textContent = text;
      showEnding();
      return;
    }

    if (engine.visibleChoices(node).length) {
      clearTyping();
      textEl.textContent = text;
      hintEl.hidden = true;
      renderChoices(node);
    }
  }

  function advance() {
    if (ended) return;
    if (typingSkip) {
      typingSkip();
      return;
    }
    const node = lastNode;
    if (!node) return;
    if (node.choices?.length) return;
    if (node.type === 'videocall') return;
    sfx('tap');
    engine.advance();
  }

  dialogue.addEventListener('click', advance);
  dialogue.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      advance();
    }
  });
  dialogue.tabIndex = 0;

  function showVideocall(node) {
    clearTyping();
    const box = h('div', { class: 'c-vn-videocall' },
      h('div', { class: 'c-vn-videocall__face', 'aria-hidden': 'true' }),
      h('div', { class: 'c-vn-videocall__name' }, 'Bagas · video call'),
      h('div', { class: 'c-vn-videocall__meta' }, 'Durasi 00:11 · kualitas rendah'),
      h('div', { class: 'c-vn-videocall__wave', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'), h('i')),
      h('p', { class: 'u-small', style: { maxWidth: '240px', color: 'rgba(255,255,255,.7)' } },
        'Wajahnya terlihat, tetapi gambar patah-patah. Suaranya terputus setiap beberapa kata.',
      ),
      h('button', {
        type: 'button',
        class: 'c-btn c-btn--danger',
        onclick: () => {
          box.remove();
          sfx('tap');
          engine.advance();
        },
      }, 'Akhiri panggilan'),
    );
    stage.append(box);
  }

  function showEnding() {
    if (ended) return;
    ended = true;
    const endingId = engine.ending();
    const ending = scenario.endings?.[endingId] || { label: 'Cerita selesai', rank: 1 };
    const vars = engine.vars();
    const tone = ending.tone || 'good';

    clear(choicesEl);
    hintEl.hidden = true;
    const panel = h('div', { class: 'c-ending', style: { padding: '0' } },
      h('div', { class: `c-ending__icon c-ending__icon--${tone}`, 'aria-hidden': 'true' },
        tone === 'bad' ? '✕' : tone === 'best' ? '★' : '!'),
      h('h2', null, ending.label),
      h('p', { class: 'u-small', style: { color: 'rgba(255,255,255,.78)' } },
        `Kepercayaan: ${vars.trust} · Kewaspadaan: ${vars.awareness} · Permintaan uang yang dikirim: ${vars.sentMoney}`,
      ),
      h('p', { class: 'u-small', style: { color: 'rgba(255,255,255,.78)' } },
        `Saldo Dojo sekarang: ${rupiah(get('dojo.saldo', 0))}. Kerugian skenario: ${rupiah(Math.abs(Number(get(`progress.${id}.loss`, 0))))}.`,
      ),
      h('div', { class: 'u-col u-mt-3', style: { width: '100%' } },
        h('a', { class: 'c-btn c-btn--primary c-btn--block', href: `#/debrief/${id}` }, 'Baca debrief lengkap ›'),
        h('a', { class: 'c-btn c-btn--ghost c-btn--block', href: '#/skenario' }, 'Kembali ke skenario'),
        h('button', {
          type: 'button',
          class: 'c-btn c-btn--quiet c-btn--block',
          onclick: () => {
            engine.reset();
            ended = false;
            panel.remove();
            textEl.textContent = '';
            clear(choicesEl);
            dialogue.hidden = false;
            stage.querySelector('.c-vn-stage__city')?.classList.remove('is-hidden');
          },
        }, 'Mulai dari bab 1'),
      ),
    );

    dialogue.hidden = true;
    stage.append(panel);
    sfx(tone === 'bad' ? 'danger' : 'success');
    showToast('Cerita selesai. Kartu ScamDEX terbuka.', { timeout: 4000 });
  }

  function openHistory() {
    clear(historyLayer);
    historyLayer.hidden = false;
    historyLayer.append(
      h('div', { class: 'c-vn-history__head' },
        h('strong', null, 'Riwayat dialog'),
        h('button', {
          type: 'button',
          class: 'c-btn c-btn--ghost c-btn--sm',
          onclick: () => { historyLayer.hidden = true; },
        }, 'Tutup'),
      ),
      h('div', { class: 'c-vn-history__list' },
        ...engine.history().map((item) => h('div', { class: 'c-vn-history__item' },
          h('b', null, `${SPEAKER_LABEL[item.speaker] || 'Narasi'}${item.time ? ` · ${item.time}` : ''}`),
          item.text,
        )),
      ),
    );
  }

  function openSaves() {
    const saves = get('vn.saves', [null, null]);
    const slots = [1, 2].map((slot) => {
      const saved = saves[slot];
      return h('div', { class: 'c-card', style: { padding: 'var(--s-sp-3)' } },
        h('strong', null, `Slot ${slot}`),
        h('p', { class: 'u-small u-muted' },
          saved ? `${saved.chapter || 'Bab'} · ${dateID(saved.savedAt)}` : 'Kosong',
        ),
        h('div', { class: 'u-row u-mt-2' },
          h('button', {
            type: 'button',
            class: 'c-btn c-btn--ghost c-btn--sm',
            onclick: () => {
              engine.saveTo(slot);
              showToast(`Tersimpan di slot ${slot}.`);
              openSaves();
            },
          }, 'Simpan'),
          h('button', {
            type: 'button',
            class: 'c-btn c-btn--quiet c-btn--sm',
            disabled: !saved,
            onclick: () => {
              if (engine.loadFrom(slot)) {
                showToast(`Slot ${slot} dimuat.`);
                closeModal();
                ended = false;
                dialogue.hidden = false;
                stage.querySelector('.c-ending')?.remove();
              }
            },
          }, 'Muat'),
        ),
      );
    });

    openModal({
      title: 'Simpan & muat cerita',
      body: h('div', { class: 'u-col' },
        h('p', { class: 'u-small u-muted' }, 'Autosave berjalan setiap simpul. Dua slot manual tersedia.'),
        ...slots,
      ),
      actions: [{ label: 'Tutup', value: null, variant: 'primary' }],
    });
  }

  function openChapters() {
    openModal({
      title: 'Lompat ke bab',
      body: h('div', { class: 'u-col' },
        ...engine.chapters().map((chapter) => h('button', {
          type: 'button',
          class: 'c-choice',
          onclick: () => {
            engine.jumpToChapter(chapter.id);
            closeModal();
            ended = false;
            dialogue.hidden = false;
            stage.querySelector('.c-ending')?.remove();
          },
        }, `${chapter.title} · ${chapter.subtitle}`)),
        h('p', { class: 'u-small u-faint' }, 'Melompat ke bab mengatur ulang variabel cerita.'),
      ),
      actions: [{ label: 'Tutup', value: null, variant: 'ghost' }],
    });
  }

  async function askExit() {
    const ok = await confirmModal({
      title: 'Keluar dari cerita?',
      message: 'Autosave menyimpan simpul terakhir. Kamu bisa melanjutkan kapan saja.',
      confirmLabel: 'Keluar',
      cancelLabel: 'Lanjut cerita',
    });
    if (ok) window.location.hash = '#/skenario';
  }

  const tools = h('div', { class: 'c-vn-tools' },
    h('button', { type: 'button', class: 'c-vn-tool', 'aria-label': 'Riwayat dialog', title: 'Riwayat', onclick: openHistory }, '☰'),
    h('button', { type: 'button', class: 'c-vn-tool', 'aria-label': 'Simpan atau muat', title: 'Simpan', onclick: openSaves }, '▣'),
    h('button', { type: 'button', class: 'c-vn-tool', 'aria-label': 'Pilih bab', title: 'Bab', onclick: openChapters }, '❖'),
  );
  stage.append(tools);

  const offNode = on('vn:node', renderNode);
  const offEnd = on('vn:end', () => {
    // showEnding dipicu oleh render node; listener ini menjaga bila ending
    // dipicu langsung oleh aturan.
    if (!ended) showEnding();
  });

  if (status === 'berjalan' && get('vn.saves.0.node', null)) {
    showToast('Melanjutkan cerita dari simpul terakhir.', { timeout: 3000 });
  }

  engine.start();

  return () => {
    offNode();
    offEnd();
    clearTyping();
    phone.destroy();
    if (!ended) addPlayTime(Date.now() - startedAt);
  };
}
