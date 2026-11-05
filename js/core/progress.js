// Progres, ScamDEX, sabuk & Saldo Dojo (app-logic.md §8).
import { all, get, set, setMany, beltInfo } from './store.js';
import { isoNow } from './format.js';

export const MAX_RECOVERY = 1_000_000;

export function scenarioProgress(id) {
  return get(`progress.${id}`, null);
}

export function completedIds() {
  return Object.entries(all().progress || {})
    .filter(([, p]) => p.status === 'selesai')
    .map(([id]) => id);
}

export function completedCount() {
  return completedIds().length;
}

export function ensureScenario(id) {
  if (!scenarioProgress(id)) {
    set(`progress.${id}`, {
      status: 'belum',
      bestEnding: null,
      bestRank: -1,
      endingsSeen: [],
      flags: { found: 0, missed: 0 },
      debriefDone: false,
      lastStep: 0,
      briefed: false,
      recovered: 0,
      loss: 0,
      updatedAt: isoNow(),
    });
  }
  return scenarioProgress(id);
}

export function markBriefed(id) {
  ensureScenario(id);
  setMany([
    [`progress.${id}.briefed`, true],
    [`progress.${id}.status`, get(`progress.${id}.status`) === 'selesai' ? 'selesai' : 'berjalan'],
    [`progress.${id}.updatedAt`, isoNow()],
  ]);
}

export function saveStep(id, stepIndex) {
  ensureScenario(id);
  set(`progress.${id}.lastStep`, Number(stepIndex) || 0);
}

export function recordFlag(id, ok) {
  ensureScenario(id);
  const found = Number(get(`progress.${id}.flags.found`, 0));
  const missed = Number(get(`progress.${id}.flags.missed`, 0));
  const total = Number(get('stats.flagsTotal', 0));
  const correct = Number(get('stats.flagsCorrect', 0));
  setMany([
    [`progress.${id}.flags.${ok ? 'found' : 'missed'}`, (ok ? found : missed) + 1],
    ['stats.flagsTotal', total + 1],
    ['stats.flagsCorrect', correct + (ok ? 1 : 0)],
  ]);
}

/**
 * Selesaikan skenario: terapkan saldo, simpan ending terbaik, buka kartu DEX.
 * @returns {{recovered:number,newBalance:number}}
 */
export function finishScenario(id, { endingId, ending, foundFlags = 0, missedFlags = 0 }) {
  ensureScenario(id);
  const saldo = Number(get('dojo.saldo', 0));
  const delta = Number(ending?.saldoDelta) || 0;
  const newBalance = saldo + delta;
  const previous = scenarioProgress(id) || {};
  const endingsSeen = new Set(previous.endingsSeen || []);
  endingsSeen.add(endingId);
  const rank = Number(ending?.rank ?? 0);
  const bestRank = Number(previous.bestRank ?? -1);
  const bestEnding = rank >= bestRank ? endingId : previous.bestEnding;
  const wasCompleted = previous.status === 'selesai';
  const loss = Math.max(Number(previous.loss) || 0, Math.max(0, -delta));

  setMany([
    ['dojo.saldo', newBalance],
    [`progress.${id}.status`, 'selesai'],
    [`progress.${id}.bestEnding`, bestEnding],
    [`progress.${id}.bestRank`, Math.max(rank, bestRank)],
    [`progress.${id}.endingsSeen`, [...endingsSeen]],
    [`progress.${id}.flags.found`, Math.max(foundFlags, Number(previous.flags?.found) || 0)],
    [`progress.${id}.flags.missed`, Math.max(missedFlags, Number(previous.flags?.missed) || 0)],
    [`progress.${id}.lastStep`, 0],
    [`progress.${id}.loss`, loss],
    [`progress.${id}.updatedAt`, isoNow()],
    ['stats.scenariosCompleted', completedCount()],
    ['dojo.belt', beltInfo().level],
  ]);

  if (!wasCompleted) {
    set('stats.scenariosCompleted', completedCount());
  }

  const cardId = ending?.dexCard || id;
  unlockDex(cardId);
  if (ending?.dexVariant) unlockVariant(cardId, ending.dexVariant);

  return { recovered: 0, newBalance, loss };
}

export function unlockDex(cardId, variantId = null) {
  const current = get(`dex.${cardId}`, null) || { unlocked: false, variants: [] };
  const variants = new Set(current.variants || []);
  if (variantId) variants.add(variantId);
  set(`dex.${cardId}`, { unlocked: true, variants: [...variants], unlockedAt: current.unlockedAt || isoNow() });
}

export function unlockVariant(cardId, variantId) {
  if (!variantId) return;
  unlockDex(cardId, variantId);
}

export function isDexUnlocked(cardId) {
  return Boolean(get(`dex.${cardId}.unlocked`));
}

export function dexVariants(cardId) {
  return get(`dex.${cardId}.variants`, []) || [];
}

/** Pemulihan 25% saat debrief penuh, dibatasi kumulatif Rp 1.000.000. */
export function completeDebrief(id) {
  ensureScenario(id);
  if (get(`progress.${id}.debriefDone`, false)) return 0;
  const loss = Math.max(0, Number(get(`progress.${id}.loss`, 0)) || 0);
  const recoveredTotal = Object.values(all().progress || {}).reduce(
    (sum, p) => sum + (Number(p.recovered) || 0), 0,
  );
  const room = Math.max(0, MAX_RECOVERY - recoveredTotal);
  const recovery = Math.min(Math.round(loss * 0.25), room);
  const saldo = Number(get('dojo.saldo', 0));
  setMany([
    [`progress.${id}.debriefDone`, true],
    [`progress.${id}.recovered`, (Number(get(`progress.${id}.recovered`, 0)) || 0) + recovery],
    ['dojo.saldo', saldo + recovery],
    ['dojo.belt', beltInfo().level],
  ]);
  return recovery;
}

export function canTakeExam() {
  return completedCount() >= 4;
}

export function canRetryExam() {
  return true;
}

export function bestEndingOf(id) {
  return get(`progress.${id}.bestEnding`, null);
}

export function totalRecovered() {
  return Object.values(all().progress || {}).reduce((sum, p) => sum + (Number(p.recovered) || 0), 0);
}

export function addPlayTime(ms) {
  if (!ms || ms < 0) return;
  set('stats.playTimeMs', Number(get('stats.playTimeMs', 0)) + ms);
  set('meta.lastSeen', isoNow());
}
