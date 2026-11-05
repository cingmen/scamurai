// Mesin skenario generik (app-logic.md §4). Tidak menyentuh DOM.
import { emit } from '../core/events.js';
import { get, set } from '../core/store.js';
import { recordFlag, saveStep, finishScenario } from '../core/progress.js';

/**
 * @param {object} scenario JSON skenario
 * @returns objek mesin untuk sim-player
 */
export function createSimEngine(scenario) {
  const steps = Array.isArray(scenario.steps) ? scenario.steps : [];
  const saved = Number(get(`progress.${scenario.id}.lastStep`, 0)) || 0;
  let index = saved >= 0 && saved < steps.length ? saved : 0;

  const ctx = {
    saldo: Number(get('dojo.saldo', 0)) || 0,
    flagsFound: new Set(),
    flagsMissed: new Set(),
    path: [],
    ended: false,
    result: null,
  };

  function current() {
    return steps[index];
  }

  function emitStep() {
    emit('sim:step', { index, step: current() });
  }

  function start() {
    emit('sim:start', { scenarioId: scenario.id });
    emitStep();
  }

  function validIndex(value) {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 && n < steps.length ? n : null;
  }

  function goTo(nextIndex) {
    const safe = validIndex(nextIndex);
    if (safe === null) {
      finish('selesai');
      return;
    }
    index = safe;
    saveStep(scenario.id, index);
    emitStep();
  }

  function next() {
    const step = current();
    if (step && step.goto !== undefined && step.goto !== null) {
      goTo(step.goto);
      return;
    }
    goTo(index + 1);
  }

  function applySaldo(delta) {
    const amount = Number(delta) || 0;
    if (!amount) return;
    ctx.saldo += amount;
    set('dojo.saldo', ctx.saldo);
  }

  function choose(optionId) {
    const step = current();
    const option = step?.options?.find((o) => o.id === optionId);
    if (!option) return;

    applySaldo(option.effects?.saldoDelta);
    ctx.path.push({ index, choice: optionId });
    emit('sim:choice', { index, optionId });

    if (option.effects?.end) {
      finish(option.effects.end);
      return;
    }
    if (option.goto !== undefined && option.goto !== null) goTo(option.goto);
    else next();
  }

  /** Tap red flag: benar → +1 flag & bonus saldo kecil (sekali per hotspot). */
  function flag(spot, correct) {
    if (!spot?.flagId) return { first: false, correct: Boolean(correct) };
    const bucket = correct ? ctx.flagsFound : ctx.flagsMissed;
    if (ctx.flagsFound.has(spot.flagId) || ctx.flagsMissed.has(spot.flagId)) {
      return { first: false, correct: Boolean(correct) };
    }
    bucket.add(spot.flagId);
    recordFlag(scenario.id, Boolean(correct));
    if (correct) applySaldo(25_000);
    emit('sim:flag', { hotspotId: spot.flagId, ok: Boolean(correct), stepIndex: index });
    return { first: true, correct: Boolean(correct) };
  }

  function collectRedFlagIds() {
    const ids = new Set();
    steps.forEach((step) => {
      (step.hotspots || []).forEach((spot) => {
        if (!spot.decoy && spot.flagId) ids.add(spot.flagId);
      });
    });
    return ids;
  }

  function finish(endingId) {
    if (ctx.ended) return ctx.result;
    const ending = scenario.endings?.[endingId] || {
      label: 'Skenario selesai',
      saldoDelta: 0,
      rank: 1,
    };
    ctx.ended = true;

    const redFlagIds = collectRedFlagIds();
    const missed = [...redFlagIds].filter((id) => !ctx.flagsFound.has(id)).length;
    const result = finishScenario(scenario.id, {
      endingId,
      ending,
      foundFlags: ctx.flagsFound.size,
      missedFlags: missed,
    });

    saveStep(scenario.id, 0);
    ctx.result = {
      endingId,
      ending,
      saldoDelta: Number(ending.saldoDelta) || 0,
      flagsFound: ctx.flagsFound.size,
      flagsMissed: missed,
      balance: Number(get('dojo.saldo', 0)),
      ...result,
    };
    emit('sim:end', { endingId, flags: [...ctx.flagsFound], result: ctx.result });
    return ctx.result;
  }

  return {
    start,
    current,
    index: () => index,
    total: steps.length,
    choose,
    flag,
    next,
    goTo,
    finish,
    flagsFound: () => ctx.flagsFound,
    flagsMissed: () => ctx.flagsMissed,
    saldo: () => ctx.saldo,
    ended: () => ctx.ended,
  };
}
