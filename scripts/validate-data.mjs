#!/usr/bin/env node
// Validator konten Scamurai (ROADMAP F0/F5/F6 DoD).
// Tanpa dependensi eksternal: `node scripts/validate-data.mjs`.

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const errors = [];
const warnings = [];
let checks = 0;

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

function warn(file, message) {
  warnings.push(`${file}: ${message}`);
}

async function readJSON(rel) {
  const text = await readFile(join(root, rel), 'utf8');
  try {
    return JSON.parse(text);
  } catch (err) {
    fail(rel, `JSON tidak valid — ${err.message}`);
    return null;
  }
}

const VALID_STEP_TYPES = new Set([
  'chat', 'sms', 'call', 'choice', 'timer-choice', 'flag-tap', 'input-otp',
  'browser', 'permission', 'app-ui', 'consequence', 'lesson',
]);

function checkGoto(file, label, value, length) {
  checks += 1;
  if (value === undefined || value === null) return;
  if (!Number.isInteger(value) || value < 0 || value >= length) {
    fail(file, `${label} menunjuk indeks ${value}, padahal jumlah langkah ${length}`);
  }
}

function checkFlagSpots(file, label, spots) {
  if (!Array.isArray(spots) || spots.length < 2) {
    fail(file, `${label}: butuh minimal 2 hotspot`);
    return;
  }
  spots.forEach((spot, i) => {
    if (!spot.flagId) fail(file, `${label} hotspot ${i}: flagId wajib`);
    if (typeof spot.x !== 'number' || typeof spot.y !== 'number') {
      fail(file, `${label} hotspot ${i}: x/y wajib angka`);
    }
    if (!spot.title || !spot.why) fail(file, `${label} hotspot ${i}: title/why wajib`);
  });
}

function checkDebrief(file, debrief) {
  if (!Array.isArray(debrief?.anatomi) || debrief.anatomi.length < 3) {
    fail(file, 'debrief.anatomi minimal 3 tahap');
  }
  if (!Array.isArray(debrief?.pulihkan) || debrief.pulihkan.length < 3) {
    fail(file, 'debrief.pulihkan minimal 3 langkah');
  }
  const flow = debrief?.aliran;
  if (!flow?.nodes?.length || !flow?.edges?.length) fail(file, 'debrief.aliran butuh nodes dan edges');
}

function checkSim(file, scenario, steps) {
  if (steps.length < 14) fail(file, `langkah terlalu sedikit (${steps.length}), minimal 14`);

  steps.forEach((step, index) => {
    checks += 1;
    if (!VALID_STEP_TYPES.has(step.type)) fail(file, `langkah ${index}: tipe "${step.type}" tidak dikenal`);
    if (step.type === 'choice' || step.type === 'timer-choice') {
      if (!Array.isArray(step.options) || step.options.length < 2) {
        fail(file, `langkah ${index}: pilihan minimal 2`);
      }
      (step.options || []).forEach((opt, i) => {
        if (!opt.id) fail(file, `langkah ${index} opsi ${i}: id wajib`);
        checkGoto(file, `langkah ${index} opsi "${opt.id}"`, opt.goto, steps.length);
      });
    }
    if (step.type === 'flag-tap') checkFlagSpots(file, `langkah ${index}`, step.hotspots);
    if (step.type === 'consequence') {
      if (!step.endingId) fail(file, `langkah ${index}: consequence tanpa endingId`);
      else if (!scenario.endings?.[step.endingId]) {
        fail(file, `langkah ${index}: ending "${step.endingId}" tidak ada di endings`);
      }
    }
    if (step.button?.goto !== undefined) checkGoto(file, `langkah ${index} button`, step.button.goto, steps.length);
    if (step.goto !== undefined) checkGoto(file, `langkah ${index} goto`, step.goto, steps.length);
    if (step.type === 'input-otp') {
      checkGoto(file, `langkah ${index} submitGoto`, step.submitGoto, steps.length);
      checkGoto(file, `langkah ${index} rejectGoto`, step.rejectGoto, steps.length);
    }
    if (step.type === 'call') {
      (step.choices || []).forEach((opt) => checkGoto(file, `langkah ${index} telepon "${opt.id}"`, opt.goto, steps.length));
      checkGoto(file, `langkah ${index} declineGoto`, step.declineGoto, steps.length);
    }
  });

  const flags = new Set();
  steps.forEach((step) => (step.hotspots || []).forEach((spot) => {
    if (!spot.decoy && spot.flagId) flags.add(spot.flagId);
  }));
  if (flags.size < 3) fail(file, `red flag hanya ${flags.size}, minimal 3`);

  const endings = Object.keys(scenario.endings || {});
  if (endings.length < 2) fail(file, `ending hanya ${endings.length}, minimal 2`);
  endings.forEach((id) => {
    const ending = scenario.endings[id];
    if (!ending.label) fail(file, `ending "${id}" tanpa label`);
    if (!Number.isInteger(ending.rank)) fail(file, `ending "${id}" tanpa rank`);
    if (typeof ending.saldoDelta !== 'number') warn(file, `ending "${id}" tanpa saldoDelta`);
  });
  const reached = new Set(steps.filter((step) => step.type === 'consequence').map((step) => step.endingId));
  const reachable = reachableEndings(steps);
  endings.forEach((id) => {
    if (!reached.has(id)) fail(file, `ending "${id}" tidak punya langkah consequence`);
    else if (!reachable.has(id)) fail(file, `ending "${id}" tidak dapat dicapai dari langkah pertama`);
  });

  checkLansiaVariant(file, scenario);
}

/** Varian Mode Lansia: subset langkah, maksimal dua opsi, ending tetap terjangkau. */
function checkLansiaVariant(file, scenario) {
  if (scenario.simplify !== true) return;
  const steps = scenario.lansiaSteps;
  checks += 1;
  if (!Array.isArray(steps) || steps.length < 6) {
    fail(file, 'simplify: true tetapi lansiaSteps tidak ada atau kurang dari 6 langkah');
    return;
  }

  steps.forEach((step, index) => {
    checks += 1;
    if (!VALID_STEP_TYPES.has(step.type)) fail(file, `langkah lansia ${index}: tipe "${step.type}" tidak dikenal`);
    checkGoto(file, `langkah lansia ${index}`, step.goto, steps.length);
    if (step.button) checkGoto(file, `langkah lansia ${index} button`, step.button.goto, steps.length);
    if (step.submitGoto !== undefined) checkGoto(file, `langkah lansia ${index} submitGoto`, step.submitGoto, steps.length);
    if (step.rejectGoto !== undefined) checkGoto(file, `langkah lansia ${index} rejectGoto`, step.rejectGoto, steps.length);

    if (step.type === 'choice' || step.type === 'timer-choice') {
      if (!Array.isArray(step.options) || step.options.length < 2) {
        fail(file, `langkah lansia ${index}: pilihan minimal 2`);
      } else if (step.options.length > 2) {
        fail(file, `langkah lansia ${index}: maksimal 2 pilihan, ditemukan ${step.options.length}`);
      }
      (step.options || []).forEach((option) => {
        checkGoto(file, `langkah lansia ${index} opsi "${option.id}"`, option.goto, steps.length);
      });
    }
    if (step.type === 'call') {
      (step.choices || []).forEach((choice) => {
        checkGoto(file, `langkah lansia ${index} panggilan "${choice.id}"`, choice.goto, steps.length);
      });
    }
    if (step.type === 'flag-tap') checkFlagSpots(file, `langkah lansia ${index}`, step.hotspots);
    if (step.type === 'consequence' && !scenario.endings?.[step.endingId]) {
      fail(file, `langkah lansia ${index}: ending "${step.endingId}" tidak ada di endings`);
    }
  });

  const endings = new Set(steps.filter((step) => step.type === 'consequence').map((step) => step.endingId));
  if (endings.size < 2) fail(file, `varian lansia hanya punya ${endings.size} ending, minimal 2`);
  const reachable = reachableEndings(steps);
  endings.forEach((id) => {
    if (!reachable.has(id)) fail(file, `ending lansia "${id}" tidak dapat dicapai dari langkah pertama`);
  });
}

/** Telusuri graf langkah dari indeks 0; kumpulkan ending yang bisa dicapai. */
function reachableEndings(steps) {
  const seen = new Set();
  const endings = new Set();
  const queue = [0];
  while (queue.length) {
    const index = queue.shift();
    if (seen.has(index) || index < 0 || index >= steps.length) continue;
    seen.add(index);
    const step = steps[index];
    if (step.type === 'consequence' && step.endingId) endings.add(step.endingId);

    const targets = [];
    if (Number.isInteger(step.goto)) targets.push(step.goto);
    if (Number.isInteger(step.button?.goto)) targets.push(step.button.goto);
    if (Number.isInteger(step.submitGoto)) targets.push(step.submitGoto);
    if (Number.isInteger(step.rejectGoto)) targets.push(step.rejectGoto);
    (step.options || []).forEach((option) => { if (Number.isInteger(option.goto)) targets.push(option.goto); });
    (step.choices || []).forEach((choice) => { if (Number.isInteger(choice.goto)) targets.push(choice.goto); });
    // Langkah yang punya tombol “tutup/lewati” tetap bisa maju tanpa goto.
    if (step.type === 'browser' || step.type === 'flag-tap' || step.type === 'permission') {
      targets.push(index + 1);
    }
    if (step.type === 'call' && !step.choices?.length) targets.push(index + 1);
    if (step.type === 'input-otp') {
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

function checkVN(file, scenario) {
  const chapters = scenario.chapters;
  if (!Array.isArray(chapters) || chapters.length < 5) {
    fail(file, `bab hanya ${chapters?.length || 0}, target 5`);
    return;
  }
  const allIds = new Set();
  const chapterIds = new Set();
  let nodeCount = 0;

  chapters.forEach((chapter, ci) => {
    if (!chapter.id) fail(file, `bab ${ci}: id wajib`);
    if (chapterIds.has(chapter.id)) fail(file, `bab ${ci}: id "${chapter.id}" duplikat`);
    chapterIds.add(chapter.id);
    const nodes = chapter.nodes || [];
    if (nodes.length < 6) fail(file, `${chapter.id}: node terlalu sedikit (${nodes.length})`);
    nodes.forEach((node, ni) => {
      nodeCount += 1;
      if (!node.id) fail(file, `${chapter.id} node ${ni}: id wajib`);
      else if (allIds.has(node.id)) fail(file, `${chapter.id} node ${ni}: id "${node.id}" duplikat`);
      allIds.add(node.id);
      if (!node.text) fail(file, `${chapter.id} node ${ni}: teks kosong`);
      (node.choices || []).forEach((choice, oi) => {
        if (!choice.id || !choice.label) fail(file, `${chapter.id}/${node.id} opsi ${oi}: id/label wajib`);
        if (typeof choice.goto !== 'string') fail(file, `${chapter.id}/${node.id} opsi ${oi}: goto harus id node`);
      });
    });
  });

  // goto VN harus menunjuk node yang benar-benar ada.
  chapters.forEach((chapter) => (chapter.nodes || []).forEach((node) => {
    (node.choices || []).forEach((choice) => {
      if (typeof choice.goto === 'string' && !allIds.has(choice.goto)) {
        fail(file, `${node.id}: goto "${choice.goto}" tidak ditemukan`);
      }
    });
  }));

  if (nodeCount < 30) warn(file, `total node ${nodeCount}; target 5 bab × 8–15`);
  if (!Array.isArray(scenario.endingRules) || scenario.endingRules.length < 2) {
    fail(file, 'VN tanpa endingRules');
  }
  (scenario.endingRules || []).forEach((rule, i) => {
    if (!rule.ending) fail(file, `endingRules ${i}: ending wajib (when boleh kosong untuk default)`);
    if (!scenario.endings?.[rule.ending]) fail(file, `endingRules ${i}: ending "${rule.ending}" tidak ada`);
  });
  Object.keys(scenario.endings || {}).forEach((id) => {
    if (!scenario.endings[id].label) fail(file, `ending "${id}" tanpa label`);
  });
  if (!Array.isArray(scenario.debrief?.manipulasi) || scenario.debrief.manipulasi.length < 3) {
    fail(file, 'debrief.manipulasi minimal 3 taktik');
  }
}

async function checkScenario(file, scenario, manifest) {
  if (!scenario.id) fail(file, 'id wajib ada');
  if (file !== `data/scenarios/${scenario.id}.json`) fail(file, `nama file tidak cocok dengan id "${scenario.id}"`);
  if (!scenario.title) fail(file, 'title wajib ada');
  if (!scenario.brief?.goal) fail(file, 'brief.goal wajib ada');
  if (!Array.isArray(scenario.brief?.rules) || scenario.brief.rules.length < 2) {
    fail(file, 'brief.rules minimal 2 butir');
  }

  if (scenario.type === 'vn') checkVN(file, scenario);
  else checkSim(file, scenario, Array.isArray(scenario.steps) ? scenario.steps : []);

  checkDebrief(file, scenario.debrief || {});
  if (!manifest.scenarios.some((item) => item.id === scenario.id)) {
    fail(file, 'tidak terdaftar di manifest.scenarios');
  }
}

const manifest = await readJSON('data/manifest.json');
if (manifest) {
  const scenarioIds = new Set(manifest.scenarios.map((item) => item.id));
  const files = (await readdir(join(root, 'data/scenarios'))).filter((f) => f.endsWith('.json'));
  checks += 1;
  if (files.length !== scenarioIds.size) {
    fail('data/manifest.json', `${files.length} berkas skenario tetapi ${scenarioIds.size} entri manifest`);
  }
  for (const file of files) {
    const scenario = await readJSON(`data/scenarios/${file}`);
    if (scenario) await checkScenario(`data/scenarios/${file}`, scenario, manifest);
  }
  for (const id of scenarioIds) {
    if (!files.includes(`${id}.json`)) fail('data/manifest.json', `skenario "${id}" tidak punya berkas JSON`);
  }
  if (!manifest.minigames?.length) fail('data/manifest.json', 'minigames kosong');
}

const minigame = await readJSON('data/minigames/wa-grup.json');
if (minigame) {
  checks += 1;
  if (!Array.isArray(minigame.beats) || minigame.beats.length < 40) {
    fail('data/minigames/wa-grup.json', `beat hanya ${minigame.beats?.length || 0}, minimal 40`);
  }
  const actors = new Set((minigame.actors || []).map((actor) => actor.id));
  if (actors.size < 6) fail('data/minigames/wa-grup.json', 'aktor minimal 6');
  (minigame.beats || []).forEach((beat, i) => {
    if (!actors.has(beat.actor)) fail('data/minigames/wa-grup.json', `beat ${i}: aktor "${beat.actor}" tidak dikenal`);
    if (!beat.text) fail('data/minigames/wa-grup.json', `beat ${i}: teks kosong`);
  });
  if (!minigame.debrief?.signals?.length) fail('data/minigames/wa-grup.json', 'debrief.signals kosong');
}

for (const rel of ['data/scamdex.json', 'data/bantuan.json', 'data/stats-sosial.json']) {
  const data = await readJSON(rel);
  checks += 1;
  if (!data) continue;
  if (rel === 'data/scamdex.json' && (!Array.isArray(data.cards) || data.cards.length < 8)) {
    fail(rel, 'kartu ScamDEX kurang dari 8');
  }
  if (rel === 'data/bantuan.json') {
    if (!Array.isArray(data.channels) || data.channels.length < 4) fail(rel, 'kanal resmi kurang dari 4');
    if (!data.verifiedAt) fail(rel, 'verifiedAt wajib ada');
  }
}

// Ujian (F6) — hanya divalidasi bila sudah ada.
try {
  const exam = await readJSON('data/exam/final-exam.json');
  if (exam) {
    checks += 1;
    if (!Array.isArray(exam.questions) || exam.questions.length < 40) {
      fail('data/exam/final-exam.json', `soal hanya ${exam.questions?.length || 0}, minimal 40`);
    }
    const ids = new Set();
    (exam.questions || []).forEach((q, i) => {
      if (!q.id) fail('data/exam/final-exam.json', `soal ${i}: id wajib`);
      if (ids.has(q.id)) fail('data/exam/final-exam.json', `soal ${i}: id "${q.id}" duplikat`);
      ids.add(q.id);
      if (!['pilihan', 'urutan', 'flag-gambar'].includes(q.type)) {
        fail('data/exam/final-exam.json', `soal ${i}: tipe "${q.type}" tidak dikenal`);
      }
      if (!q.prompt) fail('data/exam/final-exam.json', `soal ${i}: prompt kosong`);
      if (!q.explain) fail('data/exam/final-exam.json', `soal ${i}: explain kosong`);
      if (!q.tag) fail('data/exam/final-exam.json', `soal ${i}: tag skenario wajib`);
      if (q.type === 'pilihan') {
        if (!Array.isArray(q.options) || q.options.length < 2) fail('data/exam/final-exam.json', `soal ${i}: opsi kurang`);
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options?.length || 0)) {
          fail('data/exam/final-exam.json', `soal ${i}: answer di luar jangkauan`);
        }
      }
      if (q.type === 'urutan' && (!Array.isArray(q.items) || q.items.length < 3)) {
        fail('data/exam/final-exam.json', `soal ${i}: urutan butuh minimal 3 item`);
      }
      if (q.type === 'flag-gambar' && (!Array.isArray(q.hotspots) || !q.hotspots.length)) {
        fail('data/exam/final-exam.json', `soal ${i}: flag-gambar butuh hotspots`);
      }
    });
    if (!exam.school || !Number.isInteger(exam.school.poolSize) || exam.school.poolSize < 5) {
      fail('data/exam/final-exam.json', 'school.poolSize wajib minimal 5');
    }
    if (!Number.isFinite(Number(exam.school?.passScore)) || Number(exam.school.passScore) < 1 || Number(exam.school.passScore) > 100) {
      fail('data/exam/final-exam.json', 'school.passScore wajib 1–100');
    }
  }
} catch {
  warn('data/exam/final-exam.json', 'belum ada (F6)');
}

for (const rel of ['data/manifest.json', 'data/scamdex.json', 'data/bantuan.json']) {
  const text = await readFile(join(root, rel), 'utf8');
  if (/TODO|FIXME|lorem ipsum/i.test(text)) fail(rel, 'mengandung TODO/FIXME/placeholder');
}

console.log('\nScamurai data validator');
console.log(`  pemeriksaan : ${checks}`);
console.log(`  error       : ${errors.length}`);
console.log(`  peringatan  : ${warnings.length}`);
if (warnings.length) {
  console.log('\nPeringatan:');
  warnings.forEach((message) => console.log(`  ! ${message}`));
}
if (errors.length) {
  console.log('\nError:');
  errors.forEach((message) => console.log(`  ✕ ${message}`));
  process.exit(1);
}
console.log('\n✓ Semua data valid.\n');
