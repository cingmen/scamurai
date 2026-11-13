// Uji validator dan ekspor paket Studio skenario.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPackage, packageFilename, validateScenario, reachableEndings } from '../js/core/scenario-package.js';

const template = JSON.parse(readFileSync('data/studio/template.json', 'utf8'));
const clone = () => JSON.parse(JSON.stringify(template));

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('template contoh lolos validasi dan semua ending terjangkau', () => {
  const result = validateScenario(template);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(template.steps.length, 14);
  assert.equal(Object.keys(template.endings).length, 5);
  assert.deepEqual(
    [...reachableEndings(template.steps)].sort(),
    Object.keys(template.endings).sort(),
  );
});

test('paket ekspor memakai format dan metadata yang benar', () => {
  const result = buildPackage(template, '2026-11-13T12:00:00.000Z');
  assert.equal(result.ok, true);
  assert.equal(result.package.format, 'scamurai-scenario-package');
  assert.equal(result.package.version, 1);
  assert.equal(result.package.exportedAt, '2026-11-13T12:00:00.000Z');
  assert.equal(result.package.scenario.id, template.id);
  const parsed = JSON.parse(result.text);
  assert.equal(parsed.scenario.title, template.title);
  assert.equal(packageFilename(template), 'scamurai-contoh-undangan.scenario.json');
});

test('goto di luar indeks ditolak dengan pesan yang jelas', () => {
  const scenario = clone();
  scenario.steps[4].options[0].goto = 99;
  const result = validateScenario(scenario);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('menunjuk indeks 99')));
});

test('ending yang tidak dapat dicapai ditolak', () => {
  const scenario = clone();
  scenario.steps[4].options.forEach((option) => { option.goto = 5; });
  const result = validateScenario(scenario);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('tidak dapat dicapai')));
});

test('ending tanpa langkah consequence ditolak', () => {
  const scenario = clone();
  scenario.steps = scenario.steps.filter((step) => step.endingId !== 'kena');
  const result = validateScenario(scenario);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('kena') && error.includes('consequence')));
});

test('tipe langkah dan tipe paket salah tidak menghasilkan ekspor', () => {
  const scenario = clone();
  scenario.steps[1].type = 'video-call';
  const result = validateScenario(scenario);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('tidak dikenal')));
  const empty = buildPackage(null);
  assert.equal(empty.ok, false);
  assert.equal(empty.text, '');
});

test('red flag kurang dari tiga ditolak', () => {
  const scenario = clone();
  scenario.steps.forEach((step) => {
    if (step.hotspots) step.hotspots = step.hotspots.slice(0, 1);
  });
  const result = validateScenario(scenario);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('red flag')));
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} uji studio lulus.`);
process.exit(failed ? 1 : 0);
