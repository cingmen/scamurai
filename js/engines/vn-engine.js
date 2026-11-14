// Mesin visual novel (app-logic.md §6). Tanpa DOM, tanpa eval.
import { emit } from '../core/events.js';
import { get, set } from '../core/store.js';
import { finishScenario, unlockVariant } from '../core/progress.js';
import { isoNow, clamp } from '../core/format.js';

/* ——— Evaluator kondisi aman ——— */
function evaluate(expression, vars) {
  if (!expression) return true;
  const tokens = String(expression).match(/\d+|[a-zA-Z_][\w]*|>=|<=|==|!=|&&|\|\||[()<>!]/g) || [];
  let pos = 0;

  const peek = () => tokens[pos];
  const eat = (token) => {
    if (tokens[pos] === token) {
      pos += 1;
      return true;
    }
    return false;
  };

  function primary() {
    if (eat('(')) {
      const value = orExpr();
      eat(')');
      return value;
    }
    if (eat('!')) return primary() ? 0 : 1;
    const token = peek();
    if (token === undefined) throw new Error('Ekspresi tidak lengkap');
    if (/^\d+$/.test(token)) {
      pos += 1;
      return Number(token);
    }
    if (/^[a-zA-Z_]/.test(token)) {
      pos += 1;
      return Number(vars[token] ?? 0);
    }
    throw new Error(`Token tak dikenal: ${token}`);
  }

  function comparison() {
    let left = primary();
    while (['>=', '<=', '==', '!=', '>', '<'].includes(peek())) {
      const op = tokens[pos];
      pos += 1;
      const right = primary();
      let result = false;
      if (op === '>=') result = left >= right;
      else if (op === '<=') result = left <= right;
      else if (op === '>') result = left > right;
      else if (op === '<') result = left < right;
      else if (op === '==') result = left === right;
      else if (op === '!=') result = left !== right;
      left = result ? 1 : 0;
    }
    return left;
  }

  function andExpr() {
    let value = comparison();
    while (eat('&&')) {
      const right = comparison();
      value = value && right ? 1 : 0;
    }
    return value;
  }

  function orExpr() {
    let value = andExpr();
    while (eat('||')) {
      const right = andExpr();
      value = value || right ? 1 : 0;
    }
    return value;
  }

  try {
    return Boolean(orExpr());
  } catch (err) {
    console.warn('[vn] kondisi gagal dievaluasi:', expression, err.message);
    return false;
  }
}

/* ——— Engine ——— */
export function createVNEngine(scenario, { resume = true } = {}) {
  const nodes = new Map();
  const order = [];
  const chapterOf = new Map();
  (scenario.chapters || []).forEach((chapter) => {
    (chapter.nodes || []).forEach((node) => {
      nodes.set(node.id, node);
      order.push(node.id);
      chapterOf.set(node.id, chapter);
    });
  });

  const defaults = { ...(scenario.vars || {}) };
  let vars = { ...defaults };
  let nodeId = order[0] || null;
  let currentChapter = null;
  let saldoSpent = 0;
  let ended = false;
  const history = [];

  if (resume) {
    const saved = get('vn.saves.0', null);
    if (saved?.node && nodes.has(saved.node) && saved.vars) {
      nodeId = saved.node;
      vars = { ...defaults, ...saved.vars };
    }
  }

  function currentNode() {
    return nodeId ? nodes.get(nodeId) : null;
  }

  function chapterInfo(id = nodeId) {
    return chapterOf.get(id) || null;
  }

  function autosave() {
    set('vn.saves.0', {
      node: nodeId,
      vars: { ...vars },
      chapter: chapterInfo()?.id || null,
      savedAt: isoNow(),
      auto: true,
    });
  }

  function pushHistory(node) {
    if (!node?.text) return;
    history.push({ speaker: node.speaker || 'narator', text: node.text, id: node.id, time: node.time || '' });
    if (history.length > 100) history.shift();
  }

  function emitNode() {
    const node = currentNode();
    if (!chapterInfo() || currentChapter !== chapterInfo().id) {
      currentChapter = chapterInfo()?.id || null;
      if (currentChapter) emit('vn:chapter', { chapter: currentChapter, title: chapterInfo()?.title });
    }
    emit('vn:node', { node, vars: { ...vars }, chapter: chapterInfo() });
  }

  function resolveEnding(node) {
    if (node?.ending) return node.ending;
    for (const rule of scenario.endingRules || []) {
      if (!rule.when || evaluate(rule.when, vars)) return rule.ending;
    }
    return (scenario.endings && Object.keys(scenario.endings)[0]) || 'selesai';
  }

  function finish(node) {
    if (ended) return null;
    ended = true;
    const endingId = resolveEnding(node || {});
    const base = scenario.endings?.[endingId] || { label: 'Cerita selesai', rank: 1 };
    const ending = { ...base, saldoDelta: -saldoSpent };
    const result = finishScenario(scenario.id, {
      endingId,
      ending,
      foundFlags: 0,
      missedFlags: 0,
    });

    (scenario.variantRules || []).forEach((rule) => {
      if (rule.when && evaluate(rule.when, vars)) unlockVariant(scenario.id, rule.variant);
    });

    emit('vn:end', { endingId, ending, vars: { ...vars }, result });
    return { endingId, ending, result, vars: { ...vars } };
  }

  function gotoNode(id) {
    if (!id || !nodes.has(id)) {
      const current = currentNode();
      return finish(current);
    }
    nodeId = id;
    const node = currentNode();
    pushHistory(node);
    autosave();
    if (node.type === 'ending') {
      emitNode();
      return finish(node);
    }
    emitNode();
    return null;
  }

  function start() {
    const node = currentNode();
    if (!node) return null;
    pushHistory(node);
    emitNode();
    return null;
  }

  function nextNodeId(node) {
    if (!node) return null;
    if (node.next) return node.next;
    const index = order.indexOf(node.id);
    return order[index + 1] || null;
  }

  function advance() {
    const node = currentNode();
    if (!node) return finish(null);
    if (node.type === 'ending') return finish(node);
    return gotoNode(nextNodeId(node));
  }

  function visibleChoices(node) {
    return (node?.choices || []).filter((choice) => !choice.cond || evaluate(choice.cond, vars));
  }

  function choose(choiceId) {
    const node = currentNode();
    const choice = visibleChoices(node).find((item) => item.id === choiceId);
    if (!choice) return null;

    const effects = choice.effects || {};
    if (effects.trustDelta) vars.trust = clamp(Number(vars.trust || 0) + Number(effects.trustDelta), 0, 100);
    if (effects.awarenessDelta) vars.awareness = clamp(Number(vars.awareness || 0) + Number(effects.awarenessDelta), 0, 100);
    if (effects.sentMoneyDelta) vars.sentMoney = Number(vars.sentMoney || 0) + Number(effects.sentMoneyDelta);
    if (effects.verified) vars.verified = 1;
    if (effects.deepfakeSeen) vars.deepfakeSeen = 1;
    if (effects.saldoDelta) saldoSpent += Math.max(0, -Number(effects.saldoDelta));
    if (effects.vars) Object.assign(vars, effects.vars);

    emit('vn:choice', { nodeId: node.id, choiceId, vars: { ...vars } });

    if (choice.ending) {
      return finish({ ending: choice.ending });
    }
    return gotoNode(choice.goto || nextNodeId(node));
  }

  function saveTo(slot) {
    const index = Math.max(1, Number(slot) || 1);
    set(`vn.saves.${index}`, {
      node: nodeId,
      vars: { ...vars },
      chapter: chapterInfo()?.id || null,
      savedAt: isoNow(),
      auto: false,
    });
    return index;
  }

  function loadFrom(slot) {
    const index = Math.max(1, Number(slot) || 1);
    const saved = get(`vn.saves.${index}`, null);
    if (!saved?.node || !nodes.has(saved.node)) return false;
    nodeId = saved.node;
    vars = { ...defaults, ...saved.vars };
    ended = false;
    saldoSpent = 0;
    history.length = 0;
    pushHistory(currentNode());
    emitNode();
    return true;
  }

  function reset() {
    nodeId = order[0];
    vars = { ...defaults };
    ended = false;
    saldoSpent = 0;
    history.length = 0;
    pushHistory(currentNode());
    emitNode();
  }

  function jumpToChapter(chapterId) {
    const chapter = (scenario.chapters || []).find((item) => item.id === chapterId);
    const first = chapter?.nodes?.[0]?.id;
    if (!first) return false;
    nodeId = first;
    ended = false;
    saldoSpent = 0;
    history.length = 0;
    pushHistory(currentNode());
    emitNode();
    return true;
  }

  return {
    start,
    advance,
    choose,
    visibleChoices,
    currentNode,
    currentChapter: () => chapterInfo(),
    chapters: () => scenario.chapters || [],
    history: () => [...history],
    vars: () => ({ ...vars }),
    saveTo,
    loadFrom,
    reset,
    jumpToChapter,
    isEnded: () => ended,
    // Pemutar VN memanggil ending() saat node ending dirender, sebelum
    // finish() sempat menandai ended. Node ending tetap harus menghasilkan
    // ID ending yang sama agar label tidak jatuh ke "Cerita selesai".
    ending: () => (ended || currentNode()?.type === 'ending'
      ? resolveEnding(currentNode() || {})
      : null),
  };
}

export { evaluate };
