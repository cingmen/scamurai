// Validasi skenario komunitas + ekspor paket (tanpa DOM/Node API).
export const PACKAGE_FORMAT = 'scamurai-scenario-package';
export const PACKAGE_VERSION = 1;
export const MIN_STEPS = 14;
export const VALID_STEP_TYPES = new Set([
  'chat', 'sms', 'call', 'choice', 'timer-choice', 'flag-tap', 'input-otp',
  'browser', 'permission', 'app-ui', 'consequence', 'lesson',
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkGoto(errors, label, value, length) {
  if (value === undefined || value === null) return;
  if (!Number.isInteger(value) || value < 0 || value >= length) {
    errors.push(`${label} menunjuk indeks ${JSON.stringify(value)}, jumlah langkah ${length}.`);
  }
}

export function reachableEndings(steps) {
  const seen = new Set();
  const endings = new Set();
  const queue = [0];
  while (queue.length) {
    const index = queue.shift();
    if (seen.has(index) || index < 0 || index >= steps.length) continue;
    seen.add(index);
    const step = steps[index];
    if (step?.type === 'consequence') {
      if (step.endingId) endings.add(step.endingId);
      continue;
    }
    const targets = [];
    if (Number.isInteger(step?.goto)) targets.push(step.goto);
    if (Number.isInteger(step?.button?.goto)) targets.push(step.button.goto);
    if (Number.isInteger(step?.submitGoto)) targets.push(step.submitGoto);
    if (Number.isInteger(step?.rejectGoto)) targets.push(step.rejectGoto);
    (step?.options || []).forEach((option) => { if (Number.isInteger(option?.goto)) targets.push(option.goto); });
    (step?.choices || []).forEach((choice) => { if (Number.isInteger(choice?.goto)) targets.push(choice.goto); });
    if (['browser', 'flag-tap', 'permission'].includes(step?.type)) targets.push(index + 1);
    if (step?.type === 'call' && !step.choices?.length) targets.push(index + 1);
    if (step?.type === 'input-otp') {
      if (!Number.isInteger(step.submitGoto)) targets.push(index + 1);
      if (!Number.isInteger(step.rejectGoto)) targets.push(index + 1);
    }
    if (!targets.length) targets.push(index + 1);
    targets.forEach((target) => {
      if (Number.isInteger(target) && target >= 0 && target < steps.length) queue.push(target);
    });
  }
  return endings;
}

export function validateScenario(scenario) {
  const errors = [];
  if (!isObject(scenario)) return { ok: false, errors: ['Isi paket harus berupa objek JSON.'] };
  if (typeof scenario.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(scenario.id)) {
    errors.push('id wajib memakai huruf kecil, angka, dan tanda hubung.');
  }
  if (typeof scenario.title !== 'string' || !scenario.title.trim()) errors.push('title wajib diisi.');
  if (typeof scenario.modus !== 'string' || !scenario.modus.trim()) errors.push('modus wajib diisi.');
  if (!isObject(scenario.brief) || typeof scenario.brief.goal !== 'string' || !scenario.brief.goal.trim()) {
    errors.push('brief.goal wajib diisi.');
  }
  if (!Array.isArray(scenario.brief?.rules) || scenario.brief.rules.length < 2) {
    errors.push('brief.rules minimal 2 aturan.');
  }
  if (!Array.isArray(scenario.steps)) {
    return { ok: false, errors: [...errors, 'steps wajib berupa array.'] };
  }
  const steps = scenario.steps;
  if (steps.length < MIN_STEPS) errors.push(`langkah terlalu sedikit (${steps.length}), minimal ${MIN_STEPS}.`);
  steps.forEach((step, index) => {
    if (!isObject(step) || !VALID_STEP_TYPES.has(step.type)) {
      errors.push(`langkah ${index}: tipe "${step?.type}" tidak dikenal.`);
      return;
    }
    if (step.type === 'choice' || step.type === 'timer-choice') {
      if (!Array.isArray(step.options) || step.options.length < 2) {
        errors.push(`langkah ${index}: pilihan minimal 2.`);
      }
      (step.options || []).forEach((option, optionIndex) => {
        if (!option?.id) errors.push(`langkah ${index} opsi ${optionIndex}: id wajib.`);
        checkGoto(errors, `langkah ${index} opsi "${option?.id || optionIndex}"`, option?.goto, steps.length);
      });
    }
    if (step.type === 'call') {
      (step.choices || []).forEach((choice, choiceIndex) => {
        if (!choice?.id) errors.push(`langkah ${index} telepon pilihan ${choiceIndex}: id wajib.`);
        checkGoto(errors, `langkah ${index} telepon "${choice?.id || choiceIndex}"`, choice?.goto, steps.length);
      });
      checkGoto(errors, `langkah ${index} declineGoto`, step.declineGoto, steps.length);
    }
    if (step.type === 'consequence') {
      if (!step.endingId) errors.push(`langkah ${index}: consequence tanpa endingId.`);
      else if (!scenario.endings?.[step.endingId]) errors.push(`langkah ${index}: ending "${step.endingId}" tidak ada di endings.`);
    }
    checkGoto(errors, `langkah ${index} goto`, step.goto, steps.length);
    checkGoto(errors, `langkah ${index} button`, step.button?.goto, steps.length);
    checkGoto(errors, `langkah ${index} submitGoto`, step.submitGoto, steps.length);
    checkGoto(errors, `langkah ${index} rejectGoto`, step.rejectGoto, steps.length);
    if ((step.type === 'browser' || step.type === 'flag-tap') && step.hotspots !== undefined) {
      if (!Array.isArray(step.hotspots) || step.hotspots.length < 2) {
        errors.push(`langkah ${index}: hotspots minimal 2.`);
      }
      (step.hotspots || []).forEach((spot, spotIndex) => {
        if (!spot?.flagId) errors.push(`langkah ${index} hotspot ${spotIndex}: flagId wajib.`);
        if (!Number.isFinite(Number(spot?.x)) || !Number.isFinite(Number(spot?.y))) {
          errors.push(`langkah ${index} hotspot ${spotIndex}: x/y wajib angka.`);
        }
        if (!spot?.title || !spot?.why) errors.push(`langkah ${index} hotspot ${spotIndex}: title/why wajib.`);
      });
    }
  });

  const flags = new Set();
  steps.forEach((step) => (step.hotspots || []).forEach((spot) => {
    if (!spot.decoy && spot.flagId) flags.add(spot.flagId);
  }));
  if (flags.size < 3) errors.push(`red flag hanya ${flags.size}, minimal 3.`);

  const endings = isObject(scenario.endings) ? Object.keys(scenario.endings) : [];
  if (endings.length < 2) errors.push(`ending hanya ${endings.length}, minimal 2.`);
  endings.forEach((id) => {
    const ending = scenario.endings[id];
    if (!isObject(ending) || !ending.label) errors.push(`ending "${id}" tanpa label.`);
    if (!Number.isInteger(ending?.rank)) errors.push(`ending "${id}" tanpa rank.`);
    if (typeof ending?.saldoDelta !== 'number') errors.push(`ending "${id}" tanpa saldoDelta.`);
  });

  const reached = new Set(steps.filter((step) => step?.type === 'consequence').map((step) => step.endingId));
  const reachable = reachableEndings(steps);
  endings.forEach((id) => {
    if (!reached.has(id)) errors.push(`ending "${id}" tidak punya langkah consequence.`);
    else if (!reachable.has(id)) errors.push(`ending "${id}" tidak dapat dicapai dari langkah pertama.`);
  });

  const debrief = scenario.debrief;
  if (!isObject(debrief)) errors.push('debrief wajib ada.');
  if (!Array.isArray(debrief?.anatomi) || debrief.anatomi.length < 3) errors.push('debrief.anatomi minimal 3 tahap.');
  if (!Array.isArray(debrief?.pulihkan) || debrief.pulihkan.length < 3) errors.push('debrief.pulihkan minimal 3 langkah.');
  if (!Array.isArray(debrief?.aliran?.nodes) || !debrief.aliran.nodes.length) errors.push('debrief.aliran.nodes wajib ada.');
  if (!Array.isArray(debrief?.aliran?.edges) || !debrief.aliran.edges.length) errors.push('debrief.aliran.edges wajib ada.');

  return { ok: errors.length === 0, errors };
}

export function buildPackage(scenario, exportedAt = new Date().toISOString()) {
  const result = validateScenario(scenario);
  if (!result.ok) return { ok: false, errors: result.errors, package: null, text: '' };
  const payload = {
    format: PACKAGE_FORMAT,
    version: PACKAGE_VERSION,
    exportedAt,
    scenario,
  };
  return { ok: true, errors: [], package: payload, text: JSON.stringify(payload, null, 2) };
}

export function packageFilename(scenario) {
  return `scamurai-${scenario?.id || 'skenario'}.scenario.json`;
}
