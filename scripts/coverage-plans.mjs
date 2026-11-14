// Rencana jalur untuk uji UI: setiap opsi pilihan disentuh, setiap ending dicapai.
// Perencana ini murni membaca data skenario; eksekusinya tetap lewat UI.

function enumerateSimPaths(scenario) {
  const steps = scenario.steps || [];
  const paths = [];
  const maxPaths = 50000;
  const maxActions = 80;

  const nextIndex = (step, index) => (
    Number.isInteger(step?.goto) ? step.goto : index + 1
  );

  const actionsFor = (step, index) => {
    const actions = [];
    if (step?.type === 'choice' || step?.type === 'timer-choice') {
      (step.options || []).forEach((option, optionIndex) => {
        actions.push({
          kind: 'choice',
          choice: optionIndex,
          choiceId: option.id || '',
          step: index,
          goto: Number.isInteger(option.goto) ? option.goto : index + 1,
        });
      });
      return actions;
    }
    if (step?.type === 'call') {
      if (step.choices?.length) {
        step.choices.forEach((choice, choiceIndex) => {
          actions.push({
            kind: 'call-choice',
            choice: choiceIndex,
            choiceId: choice.id || '',
            step: index,
            goto: Number.isInteger(choice.goto) ? choice.goto : index + 1,
          });
        });
        return actions;
      }
      actions.push({ kind: 'call-accept', step: index, goto: index + 1 });
      actions.push({
        kind: 'call-decline',
        step: index,
        goto: Number.isInteger(step.declineGoto) ? step.declineGoto : index + 1,
      });
      return actions;
    }
    if (step?.type === 'input-otp') {
      actions.push({
        kind: 'otp-submit',
        step: index,
        goto: Number.isInteger(step.submitGoto) ? step.submitGoto : index + 1,
      });
      actions.push({
        kind: 'otp-reject',
        step: index,
        goto: Number.isInteger(step.rejectGoto) ? step.rejectGoto : index + 1,
      });
      return actions;
    }
    if (step?.type === 'browser') {
      actions.push({
        kind: 'browser-primary',
        step: index,
        goto: Number.isInteger(step.button?.goto) ? step.button.goto : index + 1,
      });
      actions.push({ kind: 'browser-close', step: index, goto: index + 1 });
      return actions;
    }
    if (step?.type === 'app-ui') {
      actions.push({
        kind: 'app-ui',
        step: index,
        goto: Number.isInteger(step.button?.goto) ? step.button.goto : index + 1,
      });
      return actions;
    }
    if (step?.type === 'flag-tap') {
      actions.push({ kind: 'flag-skip', step: index, goto: nextIndex(step, index) });
      return actions;
    }
    if (step?.type === 'permission') {
      actions.push({ kind: 'permission-continue', step: index, goto: nextIndex(step, index) });
      return actions;
    }
    actions.push({ kind: 'continue', step: index, goto: nextIndex(step, index) });
    return actions;
  };

  const walk = (index, actions, used) => {
    if (paths.length >= maxPaths || actions.length > maxActions) return;
    if (!Number.isInteger(index) || index < 0 || index >= steps.length) return;
    const step = steps[index];
    if (step?.type === 'consequence') {
      paths.push({
        type: 'sim',
        actions,
        endingId: step.endingId || '',
        endingLabel: step.title || '',
        steps: actions.map((action) => action.step),
      });
      return;
    }
    for (const action of actionsFor(step, index)) {
      const key = `${action.kind}:${action.step}:${action.choice ?? ''}`;
      if (used.has(key)) continue;
      walk(action.goto, [...actions, action], new Set([...used, key]));
    }
  };

  walk(0, [], new Set());
  return { paths, actionsFor };
}

function evaluate(expression, vars) {
  if (!expression) return true;
  const tokens = String(expression).match(/\d+|[a-zA-Z_][\w]*|>=|<=|==|!=|&&|\|\||[()<>!]/g) || [];
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (token) => {
    if (tokens[pos] !== token) return false;
    pos += 1;
    return true;
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
      if (op === '>=') left = left >= right ? 1 : 0;
      else if (op === '<=') left = left <= right ? 1 : 0;
      else if (op === '>') left = left > right ? 1 : 0;
      else if (op === '<') left = left < right ? 1 : 0;
      else if (op === '==') left = left === right ? 1 : 0;
      else left = left !== right ? 1 : 0;
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
  return Boolean(orExpr());
}

function planVN(scenario) {
  const nodes = new Map();
  const order = [];
  (scenario.chapters || []).forEach((chapter) => {
    (chapter.nodes || []).forEach((node) => {
      nodes.set(node.id, node);
      order.push(node.id);
    });
  });
  if (!order.length) return { paths: [], missingChoices: [], missingEndings: [] };

  const defaultVars = { ...(scenario.vars || {}) };
  const nextNodeId = (node) => {
    if (node?.next) return node.next;
    return order[order.indexOf(node.id) + 1] || null;
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const resolveEnding = (node, vars) => {
    if (node?.ending) return node.ending;
    for (const rule of scenario.endingRules || []) {
      if (!rule.when || evaluate(rule.when, vars)) return rule.ending;
    }
    return Object.keys(scenario.endings || {})[0] || 'selesai';
  };

  const random = (() => {
    let seed = 0x5ca3b1;
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
  })();

  const pool = [];
  const poolSize = 60000;
  for (let attempt = 0; attempt < poolSize; attempt += 1) {
    let nodeId = order[0];
    let vars = { ...defaultVars };
    const actions = [];
    const used = new Set();
    let endingId = '';
    for (let depth = 0; depth < 70; depth += 1) {
      const node = nodes.get(nodeId);
      if (!node) break;
      if (node.type === 'ending') {
        endingId = resolveEnding(node, vars);
        break;
      }
      const choices = (node.choices || []).filter((choice) => !choice.cond || evaluate(choice.cond, vars));
      if (choices.length) {
        const choiceIndex = Math.floor(random() * choices.length);
        const choice = choices[choiceIndex];
        const actionKey = `${node.id}:${choice.id || choiceIndex}`;
        if (used.has(actionKey)) break;
        used.add(actionKey);
        actions.push({
          kind: 'vn-choice',
          nodeId: node.id,
          choiceId: choice.id || '',
          choiceIndex,
        });
        const effects = choice.effects || {};
        if (effects.trustDelta) vars.trust = clamp(Number(vars.trust || 0) + Number(effects.trustDelta), 0, 100);
        if (effects.awarenessDelta) vars.awareness = clamp(Number(vars.awareness || 0) + Number(effects.awarenessDelta), 0, 100);
        if (effects.sentMoneyDelta) vars.sentMoney = Number(vars.sentMoney || 0) + Number(effects.sentMoneyDelta);
        if (effects.verified) vars.verified = 1;
        if (effects.deepfakeSeen) vars.deepfakeSeen = 1;
        if (effects.vars) Object.assign(vars, effects.vars);
        if (choice.ending) {
          endingId = choice.ending;
          break;
        }
        nodeId = choice.goto || nextNodeId(node);
      } else {
        nodeId = nextNodeId(node);
      }
      if (!nodeId) break;
    }
    if (endingId && actions.length) {
      pool.push({ type: 'vn', actions, endingId });
    }
  }

  // Jalur acak bisa melewatkan ending yang menuntut variabel tetap rendah
  // (mis. selamat-luka). Cari jalur bertarget agar setiap ending pasti punya
  // rencana, tanpa mengubah aturan cerita.
  const targetedPath = (target) => {
    for (let attempt = 0; attempt < 6000; attempt += 1) {
      let nodeId = order[0];
      let vars = { ...defaultVars };
      const actions = [];
      const used = new Set();
      let endingId = '';
      for (let depth = 0; depth < 70; depth += 1) {
        const node = nodes.get(nodeId);
        if (!node) break;
        if (node.type === 'ending') {
          endingId = resolveEnding(node, vars);
          break;
        }
        const choices = (node.choices || []).filter((choice) => !choice.cond || evaluate(choice.cond, vars));
        if (!choices.length) {
          nodeId = nextNodeId(node);
          if (!nodeId) break;
          continue;
        }
        const scored = choices.map((choice, index) => {
          const effects = choice.effects || {};
          let score = 0;
          if (target === 'selamat-luka') {
            score = -(Number(effects.awarenessDelta) || 0)
              - 1000 * (Number(effects.sentMoneyDelta) || 0)
              - (effects.verified ? 1000 : 0)
              - (effects.deepfakeSeen ? 20 : 0);
          } else if (target === 'cegah-awal') {
            score = (Number(effects.awarenessDelta) || 0) + (effects.verified ? 1000 : 0);
          } else if (target === 'kena-total') {
            score = 1000 * (Number(effects.sentMoneyDelta) || 0) + (Number(effects.awarenessDelta) || 0);
          } else {
            score = (Number(effects.sentMoneyDelta) || 0) * (target === 'kena-sebagian' ? 10 : 1)
              + (effects.verified ? -50 : 0);
          }
          return { choice, index, score, jitter: random() };
        }).sort((a, b) => b.score - a.score || b.jitter - a.jitter);
        const pick = scored[Math.floor(random() * Math.min(scored.length, attempt < 1000 ? 1 : 2))];
        const choice = pick.choice;
        const actionKey = `${node.id}:${choice.id || pick.index}`;
        if (used.has(actionKey)) break;
        used.add(actionKey);
        actions.push({
          kind: 'vn-choice',
          nodeId: node.id,
          choiceId: choice.id || '',
          choiceIndex: pick.index,
        });
        const effects = choice.effects || {};
        if (effects.trustDelta) vars.trust = clamp(Number(vars.trust || 0) + Number(effects.trustDelta), 0, 100);
        if (effects.awarenessDelta) vars.awareness = clamp(Number(vars.awareness || 0) + Number(effects.awarenessDelta), 0, 100);
        if (effects.sentMoneyDelta) vars.sentMoney = Number(vars.sentMoney || 0) + Number(effects.sentMoneyDelta);
        if (effects.verified) vars.verified = 1;
        if (effects.deepfakeSeen) vars.deepfakeSeen = 1;
        if (effects.vars) Object.assign(vars, effects.vars);
        if (choice.ending) {
          endingId = choice.ending;
          break;
        }
        nodeId = choice.goto || nextNodeId(node);
      }
      if (endingId === target && actions.length) return { type: 'vn', actions, endingId };
    }
    return null;
  };

  for (const target of Object.keys(scenario.endings || {})) {
    if (pool.some((path) => path.endingId === target)) continue;
    const path = targetedPath(target);
    if (path) pool.push(path);
  }

  const allChoices = new Set();
  (scenario.chapters || []).forEach((chapter) => {
    (chapter.nodes || []).forEach((node) => {
      (node.choices || []).forEach((choice, index) => {
        allChoices.add(`${node.id}:${choice.id || index}`);
      });
    });
  });
  const allEndings = new Set(Object.keys(scenario.endings || {}));
  const coveredChoices = new Set();
  const coveredEndings = new Set();
  const selected = [];
  while (coveredChoices.size < allChoices.size || coveredEndings.size < allEndings.size) {
    let best = null;
    let bestScore = -1;
    for (const path of pool) {
      const newChoices = path.actions.filter((action) => {
        const key = `${action.nodeId}:${action.choiceId}`;
        return !coveredChoices.has(key);
      }).length;
      const newEnding = !coveredEndings.has(path.endingId) ? 1 : 0;
      const score = newChoices * 10 + newEnding;
      if (score > bestScore) {
        best = path;
        bestScore = score;
      }
    }
    if (!best || bestScore <= 0) break;
    selected.push(best);
    best.actions.forEach((action) => coveredChoices.add(`${action.nodeId}:${action.choiceId}`));
    coveredEndings.add(best.endingId);
  }

  return {
    paths: selected.map((path) => ({
      ...path,
      endingLabel: scenario.endings?.[path.endingId]?.label || '',
    })),
    missingChoices: [...allChoices].filter((key) => !coveredChoices.has(key)),
    missingEndings: [...allEndings].filter((key) => !coveredEndings.has(key)),
  };
}

function selectSimPaths(scenario) {
  const { paths } = enumerateSimPaths(scenario);
  const allChoices = new Set();
  (scenario.steps || []).forEach((step, index) => {
    if (step?.type === 'choice' || step?.type === 'timer-choice') {
      (step.options || []).forEach((option, optionIndex) => {
        allChoices.add(`${index}:${option.id || optionIndex}`);
      });
    }
  });
  const allEndings = new Set(Object.keys(scenario.endings || {}));
  const coveredChoices = new Set();
  const coveredEndings = new Set();
  const selected = [];
  while (coveredChoices.size < allChoices.size || coveredEndings.size < allEndings.size) {
    let best = null;
    let bestScore = -1;
    for (const path of paths) {
      const newChoices = path.actions.filter((action) => (
        action.kind === 'choice' && !coveredChoices.has(`${action.step}:${action.choiceId}`)
      )).length;
      const newEnding = !coveredEndings.has(path.endingId) ? 1 : 0;
      const score = newChoices * 10 + newEnding;
      if (score > bestScore) {
        best = path;
        bestScore = score;
      }
    }
    if (!best || bestScore <= 0) break;
    selected.push(best);
    best.actions.forEach((action) => {
      if (action.kind === 'choice') coveredChoices.add(`${action.step}:${action.choiceId}`);
    });
    coveredEndings.add(best.endingId);
  }
  return {
    paths: selected,
    missingChoices: [...allChoices].filter((key) => !coveredChoices.has(key)),
    missingEndings: [...allEndings].filter((key) => !coveredEndings.has(key)),
    totalPaths: paths.length,
    totalChoices: allChoices.size,
    totalEndings: allEndings.size,
  };
}

export function buildCoveragePlans(manifest, scenarios) {
  const plans = [];
  for (const meta of manifest.scenarios || []) {
    const raw = scenarios[meta.id];
    if (!raw) continue;
    const result = raw.type === 'vn' || raw.chapters ? planVN(raw) : selectSimPaths(raw);
    plans.push({
      scenario: meta.id,
      type: raw.chapters ? 'vn' : 'sim',
      ...result,
    });
  }
  return plans;
}
