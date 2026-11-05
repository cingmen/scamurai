// Host simulasi: bingkai ponsel + renderer step (structure.md §4.3).
import { loadJSON } from '../core/loader.js';
import { get } from '../core/store.js';
import { on } from '../core/events.js';
import { h, clear, scrollToEnd } from '../core/dom.js';
import { rupiah, wait } from '../core/format.js';
import { createPhoneFrame } from '../components/phone-frame.js';
import { createSimEngine } from '../engines/sim-engine.js';
import { renderStep } from '../engines/step-renderers.js';
import { progressBar } from '../components/progress.js';
import { openModal, confirmModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { sfx } from '../core/sfx.js';
import { haptic } from '../core/haptics.js';
import { addPlayTime } from '../core/progress.js';

const CLEAR_TYPES = new Set(['app-ui', 'browser', 'call', 'input-otp', 'permission', 'consequence']);
const RHYTHM_LABEL = { santai: 'Santai', normal: 'Normal', nyata: 'Nyata' };

export async function render(root, { params }) {
  const id = params[0];
  const [manifest, scenario] = await Promise.all([
    loadJSON('./data/manifest.json'),
    loadJSON(`./data/scenarios/${id}.json`),
  ]);

  if (scenario.type === 'vn') {
    window.location.hash = `#/vn/${id}`;
    return () => {};
  }

  const meta = manifest.scenarios.find((item) => item.id === id) || {
    title: scenario.title,
    modus: scenario.title,
  };

  clear(root);
  const startedAt = Date.now();
  const engine = createSimEngine(scenario);

  const flagPill = h('span', { class: 'c-sim-hud__pill c-sim-hud__pill--flag', 'aria-live': 'polite' }, '⚑ 0');
  const progress = progressBar({
    value: engine.index() + 1,
    max: engine.total,
    label: 'Progres',
    showCount: true,
  });
  const saldoPill = h('span', { class: 'c-sim-hud__pill' }, rupiah(get('dojo.saldo', 0)));

  const phone = createPhoneFrame({
    app: scenario.app,
    onExit: askExit,
  });

  const topbar = h('div', { class: 'c-sim-topbar' },
    h('a', { class: 'c-btn c-btn--quiet c-btn--sm', href: '#/skenario' }, '← Dojo'),
    h('div', null,
      h('div', { class: 'c-sim-topbar__title' }, meta.title),
      h('div', { class: 'c-sim-topbar__meta' }, `${meta.modus} · ${RHYTHM_LABEL[getRhythm()] || 'Normal'}`),
    ),
    progress.el,
    flagPill,
    saldoPill,
  );

  const screen = h('div', { class: 'scr-sim' }, topbar, phone.stage);
  root.append(screen);

  let currentApp = null;
  let cancelled = false;
  let kenjiShown = false;
  let autoTimer = null;
  const timers = new Set();
  const cleanupHooks = [];

  function getRhythm() {
    if (get('settings.mode', 'standar') === 'lansia') return 'santai';
    return get('profile.rhythm', 'normal');
  }

  function cancelStepTimers() {
    cancelled = true;
    timers.forEach((timer) => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    timers.clear();
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
    cleanupHooks.splice(0).forEach((fn) => {
      try { fn(); } catch (err) { console.warn('[sim] cleanup gagal:', err); }
    });
  }

  function updateHud() {
    flagPill.textContent = `⚑ ${engine.flagsFound().size}`;
    saldoPill.textContent = rupiah(get('dojo.saldo', 0));
  }

  async function askExit() {
    const ok = await confirmModal({
      title: 'Keluar dari skenario?',
      message: 'Kemajuan di skenario ini tersimpan. Kamu bisa melanjutkan dari langkah terakhir.',
      confirmLabel: 'Keluar',
      cancelLabel: 'Lanjut bermain',
    });
    if (ok) window.location.hash = '#/skenario';
  }

  function onStep({ index, step }) {
    cancelStepTimers();
    cancelled = false;

    const appKey = step.app || scenario.app;
    const shouldClear = CLEAR_TYPES.has(step.type) || step.clear === true || appKey !== currentApp;

    if (shouldClear) {
      clear(phone.body);
      phone.body.scrollTop = 0;
    }
    if (appKey !== currentApp) {
      currentApp = appKey;
      phone.setApp(appKey, step.header || {});
    } else if (step.header) {
      phone.setApp(appKey, step.header);
    }

    if (step.critical && !kenjiShown && get('settings.kenjiTips', true) && engine.flagsFound().size === 0
      && scenario.steps.some((item) => (item.hotspots || []).some((spot) => !spot.decoy))) {
      phone.body.append(h('div', { class: 'c-kenji-note' },
        h('img', { src: './assets/img/mascot/kenji.svg', alt: '', width: '46', height: '46' }),
        h('div', null,
          h('strong', null, 'Kenji: '),
          'Tunggu. Ada yang belum kamu periksa? Ketuk elemen yang mencurigakan dulu kalau sempat.',
        ),
      ));
      kenjiShown = true;
    }

    progress.update(index + 1);
    updateHud();

    const ctx = {
      body: phone.body,
      foot: phone.foot,
      phone,
      scenario,
      meta,
      engine,
      index,
      next: () => {
        cancelStepTimers();
        engine.next();
      },
      goto: (nextIndex) => {
        cancelStepTimers();
        engine.goTo(nextIndex);
      },
      choose: (optionId) => {
        cancelStepTimers();
        engine.choose(optionId);
      },
      flag: (spot, correct) => {
        const result = engine.flag(spot, correct);
        updateHud();
        haptic(correct ? 18 : 10);
        return result;
      },
      otp: () => { /* OTP tidak pernah disimpan */ },
      end: (endingId) => {
        const result = engine.finish(endingId);
        updateHud();
        if (result) {
          showToast(`Kartu ScamDEX terbuka. Saldo: ${rupiah(result.balance)}`, { timeout: 4000 });
        }
        return result;
      },
      setFoot: (node) => phone.setFoot(node),
      clearFoot: () => phone.setFoot(null),
      auto: (fn, delay) => {
        if (autoTimer) clearTimeout(autoTimer);
        autoTimer = setTimeout(() => {
          autoTimer = null;
          if (!cancelled) fn();
        }, delay);
      },
      clearAuto: () => {
        if (autoTimer) clearTimeout(autoTimer);
        autoTimer = null;
      },
      countdown: (seconds, onDone, onTick) => {
        let remaining = seconds;
        onTick?.(remaining);
        const id = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            clearInterval(id);
            timers.delete(id);
            if (!cancelled) onDone?.();
            return;
          }
          onTick?.(remaining);
        }, 1000);
        timers.add(id);
      },
      after: (fn, delay) => {
        const id = setTimeout(fn, delay);
        timers.add(id);
      },
      onCleanup: (fn) => cleanupHooks.push(fn),
      cancelled: () => cancelled,
      sfx,
      finish: () => {
        updateHud();
      },
    };

    try {
      renderStep(step, ctx);
    } catch (err) {
      console.error('[sim] render step gagal:', err, step);
      showToast('Langkah ini gagal dimuat. Lanjut ke langkah berikutnya.', { timeout: 3500 });
      phone.body.append(h('div', { class: 'c-panel c-panel--danger' },
        'Terjadi kesalahan pada langkah ini. Data skenario mungkin tidak lengkap.',
      ));
      ctx.setFoot(h('button', {
        class: 'c-btn c-btn--primary c-btn--block',
        onclick: () => ctx.next(),
      }, 'Lanjut ›'));
    }

    scrollToEnd(phone.body);
  }

  const offStep = on('sim:step', onStep);

  // Resume: beri penanda bila melanjutkan di tengah jalan.
  if (engine.index() > 0) {
    phone.body.append(h('div', { class: 'c-chat__date' }, 'Melanjutkan dari langkah terakhir'));
  }
  engine.start();
  updateHud();

  return () => {
    offStep();
    cancelStepTimers();
    phone.destroy();
    addPlayTime(Date.now() - startedAt);
  };
}
