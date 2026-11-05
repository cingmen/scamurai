// Peta tipe step → renderer DOM (app-logic.md §4.2).
import { h, clear, scrollToEnd } from '../core/dom.js';
import { chatBubble, dateDivider, typingBubble } from '../components/chat-bubble.js';
import { choiceList } from '../components/choice-list.js';
import { createFlagSurface, flagExplanation } from '../components/flag-tap.js';
import { createKeypad } from '../components/keypad.js';
import { openModal } from '../components/modal.js';
import { appUiView } from './app-views.js';
import { rupiah, wait } from '../core/format.js';
import { get, timerFactor, rhythm } from '../core/store.js';

function addContinue(ctx, label = 'Lanjut', delayMs = null) {
  const button = h('button', {
    type: 'button',
    class: 'c-btn c-btn--primary c-btn--block',
    onclick: () => {
      ctx.clearAuto();
      ctx.next();
    },
  }, `${label} ›`);

  ctx.setFoot(button);

  if (delayMs !== null && delayMs >= 0) {
    const factor = rhythm() === 'santai' ? 1.5 : rhythm() === 'nyata' ? 1 : 1.2;
    const delay = Math.max(900, Math.round(delayMs * factor));
    ctx.auto(() => ctx.next(), delay);
  }
}

function renderChat(step, ctx) {
  if (step.date) ctx.body.append(dateDivider(step.date));
  if (step.typing) {
    const typing = typingBubble();
    ctx.body.append(typing);
    scrollToEnd(ctx.body);
    ctx.after(async () => {
      typing.remove();
    }, Math.min(step.typingMs || 700, 1600));
  }

  const dir = step.dir || (step.from === 'me' ? 'out' : step.from === 'narator' ? 'narator' : step.from === 'system' ? 'system' : 'in');
  ctx.body.append(chatBubble({
    dir,
    text: step.text,
    time: step.time,
    sender: step.sender,
    attach: step.attach,
    label: step.label,
    check: dir === 'out' && step.check !== false,
  }));
  scrollToEnd(ctx.body);

  const length = String(step.text || '').length;
  const autoDelay = step.auto === false ? null : (step.delayMs ?? Math.min(4200, Math.max(1500, length * 32)));
  addContinue(ctx, step.continueLabel || 'Lanjut', autoDelay);
}

function renderSms(step, ctx) {
  const wrap = h('div', { class: 'c-sms-list' });
  const messages = step.messages || [{ sender: step.sender, text: step.text, time: step.time }];
  messages.forEach((message) => {
    wrap.append(h('div', { class: `c-sms${message.danger ? ' c-sms--danger' : ''}` },
      h('div', { class: 'c-sms__head' },
        h('span', null, message.sender || 'Pesan'),
        h('span', { class: 'c-sms__time' }, message.time || ''),
      ),
      h('div', { class: 'c-sms__body' }, message.text),
    ));
  });
  ctx.body.append(wrap);
  scrollToEnd(ctx.body);
  addContinue(ctx, step.continueLabel || 'Lanjut', step.auto === false ? null : 2400);
}

function renderCall(step, ctx) {
  const screen = h('div', { class: 'c-call' });
  const status = h('div', { class: 'c-call__status' }, step.autoAccept ? 'tersambung' : 'memanggil…');
  const beatsBox = h('div', { class: 'c-call__beats' });
  const actions = h('div', { class: 'c-call__actions' });

  screen.append(
    h('div', { class: 'c-call__avatar', 'aria-hidden': 'true' }, '☎'),
    h('div', { class: 'c-call__name' }, step.caller || 'Nomor tidak dikenal'),
    h('div', { class: 'c-call__status' }, step.number || ''),
    status,
    beatsBox,
    actions,
  );
  ctx.body.append(screen);

  let elapsed = 0;
  const timer = h('div', { class: 'c-call__status' }, '00:00');
  screen.insertBefore(timer, beatsBox);
  const interval = setInterval(() => {
    elapsed += 1;
    timer.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  }, 1000);
  ctx.onCleanup(() => clearInterval(interval));

  async function playBeats() {
    status.textContent = 'tersambung';
    for (const beat of step.beats || []) {
      if (ctx.cancelled()) return;
      beatsBox.append(h('div', { class: 'c-call__beat' },
        h('strong', null, beat.speaker || step.caller || 'Penelepon'),
        beat.text,
      ));
      scrollToEnd(ctx.body);
      await wait(beat.delayMs ?? 1400);
    }
    if (ctx.cancelled()) return;
    renderChoices();
  }

  function renderChoices() {
    clear(actions);
    if (step.choices?.length) {
      const list = choiceList({
        options: step.choices,
        onPick: (id) => {
          const option = step.choices.find((o) => o.id === id);
          ctx.clearFoot();
          if (option?.goto !== undefined) ctx.goto(option.goto);
          else ctx.next();
        },
      });
      const foot = h('div', { class: 'c-sim-choices' }, list);
      ctx.setFoot(foot);
    } else {
      addContinue(ctx, 'Lanjut', 1600);
    }
  }

  function accept() {
    clear(actions);
    playBeats();
  }

  function decline() {
    clearInterval(interval);
    status.textContent = 'panggilan ditolak';
    ctx.clearAuto();
    if (step.declineGoto !== undefined) ctx.goto(step.declineGoto);
    else ctx.next();
  }

  if (step.autoAccept) {
    playBeats();
  } else {
    actions.append(
      h('button', { type: 'button', class: 'c-call__round c-call__round--decline', 'aria-label': 'Tolak panggilan', onclick: decline }, '✕'),
      h('button', { type: 'button', class: 'c-call__round c-call__round--accept', 'aria-label': 'Terima panggilan', onclick: accept }, '☎'),
    );
    if (step.timerS && timerFactor() > 0) {
      const seconds = Math.round(step.timerS * timerFactor());
      ctx.countdown(seconds, decline);
    }
  }
}

function renderChoice(step, ctx, { timed = false } = {}) {
  const options = step.options || [];
  if (step.prompt) ctx.body.append(h('p', { class: 'c-sim-prompt' }, step.prompt));

  const list = choiceList({
    options,
    onPick: (id) => {
      ctx.clearAuto();
      ctx.choose(id);
    },
  });
  const foot = h('div', { class: 'c-sim-choices' }, list);

  if (timed && timerFactor() > 0 && step.durS) {
    const seconds = Math.round(step.durS * timerFactor());
    const bar = h('div', { class: 'c-sim-timer__bar', style: { width: '100%' } });
    const label = h('span', null, `${seconds} dtk`);
    foot.prepend(h('div', { class: 'c-sim-timer' }, label, bar));
    ctx.countdown(seconds, () => {
      ctx.choose(step.defaultOption || options[options.length - 1]?.id);
    }, (remaining) => {
      label.textContent = `${remaining} dtk`;
      bar.style.width = `${Math.max(0, (remaining / seconds) * 100)}%`;
    });
  }

  ctx.setFoot(foot);
}

function renderFlagTap(step, ctx) {
  const found = ctx.engine.flagsFound();
  const result = h('div', { class: 'c-flag-result' });
  const score = h('div', { class: 'c-flag-score' },
    h('span', null, `Ditemukan: ${found.size}`),
    h('span', null, 'Ketuk elemen yang mencurigakan'),
  );

  const surface = createFlagSurface({
    blocks: step.blocks || [],
    hotspots: step.hotspots || [],
    found,
    hint: step.hint || 'Ketuk elemen yang menurutmu berbahaya sebelum lanjut.',
    onFlag: (spot, correct) => {
      const res = ctx.flag(spot, correct);
      if (!res.first) return;
      clear(result);
      result.append(flagExplanation(spot, correct));
      score.firstElementChild.textContent = `Ditemukan: ${ctx.engine.flagsFound().size}`;
      ctx.sfx(correct ? 'success' : 'tap');
      scrollToEnd(ctx.body);
    },
  });

  const wrap = h('div', { class: 'u-col', style: { gap: '0' } }, surface.el, result, score);
  ctx.body.append(wrap);
  scrollToEnd(ctx.body);

  const skip = h('button', {
    type: 'button',
    class: 'c-btn c-btn--primary c-btn--block',
    onclick: () => ctx.next(),
  }, step.button?.label || 'Lanjut');
  ctx.setFoot(skip);
}

function renderOtp(step, ctx) {
  const wrap = h('div', { class: 'u-col' });
  if (step.prompt) wrap.append(h('p', { class: 'c-sim-prompt' }, step.prompt));
  const keypad = createKeypad({
    digits: step.digits || 6,
    submitLabel: step.submitLabel || 'Kirim kode',
    onSubmit: (value) => {
      ctx.otp(value);
      ctx.clearFoot();
      if (step.submitGoto !== undefined) ctx.goto(step.submitGoto);
      else ctx.next();
    },
  });
  wrap.append(keypad.el);
  ctx.body.append(wrap);
  scrollToEnd(ctx.body);

  const reject = h('button', {
    type: 'button',
    class: 'c-btn c-btn--danger c-btn--block',
    onclick: () => {
      keypad.lock();
      if (step.rejectGoto !== undefined) ctx.goto(step.rejectGoto);
      else ctx.next();
    },
  }, step.rejectLabel || 'Tolak & tutup telepon');
  ctx.setFoot(reject);
}

function renderBrowser(step, ctx) {
  const bar = h('div', { class: 'c-browser__bar' },
    h('span', { class: 'c-browser__lock', 'aria-hidden': 'true' }, step.secure ? '🔒' : '⚠'),
    h('span', { class: 'c-browser__url' }, step.url || 'https://contoh.xyz'),
  );
  const inspectBtn = h('button', {
    type: 'button',
    class: 'c-btn c-btn--ghost c-btn--sm',
    onclick: async () => {
      const info = step.inspect || {};
      await openModal({
        title: 'Periksa alamat',
        body: h('div', { class: 'u-col' },
          h('p', null, h('strong', null, 'Alamat saat ini: '), h('span', { class: 'u-mono' }, step.url || '-')),
          h('p', null, h('strong', null, 'Alamat resmi: '), h('span', { class: 'u-mono' }, info.real || '-')),
          ...(info.notes || []).map((note) => h('p', null, note)),
        ),
        actions: [{ label: 'Mengerti', value: 'ok', variant: 'primary' }],
      });
    },
  }, 'Periksa alamat');

  const page = h('div', { class: 'c-browser__page' });
  if (step.page?.logo) page.append(h('div', { class: 'c-browser__hero' },
    h('div', { class: 'c-browser__logo' }, step.page.logo),
    ...(step.page.lines || []).map((line) => h('p', { class: 'u-small' }, line)),
    step.page.countdown ? h('div', { class: 'c-browser__countdown' }, step.page.countdown) : null,
  ));

  if (step.page?.form) {
    const form = h('div', { class: 'c-browser__form' },
      ...step.page.form.map((field) => h('input', {
        class: 'c-browser__input',
        type: field.type || 'text',
        placeholder: field.placeholder || '',
        'aria-label': field.label || field.placeholder || 'Isian formulir',
        autocomplete: 'off',
      })),
    );
    page.append(h('div', { class: 'c-browser__hero' }, form));
  }

  if (step.page?.foot) page.append(h('p', { class: 'c-browser__foot' }, step.page.foot));

  const pageWrap = h('div', null, bar, page);

  if (step.hotspots?.length) {
    const found = ctx.engine.flagsFound();
    const result = h('div', { class: 'c-flag-result' });
    const blocks = [
      { text: `${step.page?.logo || ''}`, head: true },
      ...(step.page?.lines || []).map((text) => ({ text })),
      ...((step.page?.form || []).map((field) => ({ text: `Isian: ${field.placeholder || field.label || ''}` }))),
    ];
    const surface = createFlagSurface({
      blocks,
      hotspots: step.hotspots,
      found,
      hint: step.hint || 'Periksa halaman ini. Ketuk elemen yang mencurigakan.',
      onFlag: (spot, correct) => {
        const res = ctx.flag(spot, correct);
        if (!res.first) return;
        clear(result);
        result.append(flagExplanation(spot, correct));
        ctx.sfx(correct ? 'success' : 'tap');
      },
    });
    ctx.body.append(pageWrap, inspectBtn, surface.el, result);
  } else {
    ctx.body.append(pageWrap, inspectBtn);
  }

  scrollToEnd(ctx.body);

  if (step.button) {
    const button = h('button', {
      type: 'button',
      class: 'c-btn c-btn--primary c-btn--block',
      onclick: () => ctx.goto(step.button.goto ?? ctx.index + 1),
    }, step.button.label || 'Lanjut');
    ctx.setFoot(h('div', { class: 'c-sim-choices' }, button, h('button', {
      type: 'button',
      class: 'c-btn c-btn--ghost c-btn--block',
      onclick: () => ctx.next(),
    }, 'Tutup halaman')));
  } else {
    addContinue(ctx, 'Lanjut', null);
  }
}

function renderPermission(step, ctx) {
  const wrap = h('div', { class: 'c-pinjol' });
  const list = h('div', { class: 'c-perm' });
  (step.items || []).forEach((perm) => {
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
    list.append(item);
  });

  wrap.append(
    h('div', { class: 'c-bank__section' },
      h('h3', null, step.title || 'Izin aplikasi'),
      step.note ? h('p', { class: 'u-small u-muted' }, step.note) : null,
      list,
    ),
  );
  ctx.body.append(wrap);
  scrollToEnd(ctx.body);
  addContinue(ctx, step.button?.label || 'Lanjut', null);
}

function renderConsequence(step, ctx) {
  const result = ctx.end(step.endingId);
  const ending = result?.ending || {};
  const tone = ending.tone || (Number(ending.rank) >= 3 ? 'best' : Number(ending.rank) === 0 ? 'bad' : 'good');
  const icon = tone === 'bad' ? '✕' : tone === 'best' ? '★' : '!';
  const delta = Number(result?.saldoDelta ?? ending.saldoDelta ?? 0);

  ctx.body.append(h('div', { class: 'c-ending' },
    h('div', { class: `c-ending__icon c-ending__icon--${tone}`, 'aria-hidden': 'true' }, icon),
    h('h2', null, step.title || ending.label || 'Skenario selesai'),
    h('p', null, step.text || ''),
    delta !== 0 ? h('div', { class: `c-ending__saldo${delta < 0 ? ' c-ending__saldo--loss' : ''}` },
      `${delta < 0 ? 'Saldo berkurang ' : 'Saldo bertambah '}${rupiah(Math.abs(delta))}`,
    ) : null,
    h('p', { class: 'u-small u-muted' }, `Red flag ditemukan: ${result?.flagsFound ?? 0} · terlewat: ${result?.flagsMissed ?? 0}`),
    h('p', { class: 'u-small u-muted' }, `Saldo Dojo sekarang: ${rupiah(result?.balance ?? get('dojo.saldo', 0))}`),
  ));
  scrollToEnd(ctx.body);

  const foot = h('div', { class: 'c-sim-choices' },
    h('a', {
      class: 'c-btn c-btn--primary c-btn--block',
      href: `#/debrief/${ctx.scenario.id}`,
    }, 'Baca debrief ›'),
    h('button', {
      type: 'button',
      class: 'c-btn c-btn--ghost c-btn--block',
      onclick: () => {
        window.location.hash = `#/skenario/${ctx.scenario.id}`;
      },
    }, 'Ulangi skenario'),
  );
  ctx.setFoot(foot);
  ctx.sfx(tone === 'bad' ? 'danger' : 'success');
  ctx.finish();
}

function renderLesson(step, ctx) {
  ctx.body.append(h('div', { class: 'c-lesson' },
    h('h3', null, step.title || 'Catatan dari Kenji'),
    h('p', null, step.body || ''),
    step.refDex ? h('div', { class: 'c-lesson__ref' }, `↳ Buka ScamDEX: ${step.refDex}`) : null,
  ));
  scrollToEnd(ctx.body);
  addContinue(ctx, step.button?.label || 'Mengerti', null);
}

export function renderStep(step, ctx) {
  if (!step || !step.type) {
    console.warn('[step-renderers] step tanpa tipe:', step);
    ctx.next();
    return;
  }
  switch (step.type) {
    case 'chat': return renderChat(step, ctx);
    case 'sms': return renderSms(step, ctx);
    case 'call': return renderCall(step, ctx);
    case 'choice': return renderChoice(step, ctx);
    case 'timer-choice': return renderChoice(step, ctx, { timed: true });
    case 'flag-tap': return renderFlagTap(step, ctx);
    case 'input-otp': return renderOtp(step, ctx);
    case 'browser': return renderBrowser(step, ctx);
    case 'permission': return renderPermission(step, ctx);
    case 'app-ui': {
      ctx.body.append(appUiView(step, ctx));
      scrollToEnd(ctx.body);
      return;
    }
    case 'consequence': return renderConsequence(step, ctx);
    case 'lesson': return renderLesson(step, ctx);
    default:
      console.warn('[step-renderers] tipe step tidak dikenal:', step.type);
      ctx.next();
  }
}
