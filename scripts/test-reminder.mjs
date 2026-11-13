import assert from 'node:assert/strict';
import { practiceReminder } from '../js/core/reminder.js';

const day = 24 * 60 * 60 * 1000;
const at = (iso) => Date.parse(iso);
const state = (reminder, progress) => ({ settings: { reminder }, progress });
const done = (iso) => ({ status: 'selesai', updatedAt: iso });

assert.equal(practiceReminder(state({ enabled: false, intervalDays: 3 }, {
  'task-scam': done('2026-11-01T00:00:00.000Z'),
}), at('2026-11-13T00:00:00.000Z')), null, 'pengingat mati harus null');

assert.equal(practiceReminder(state({ enabled: true, intervalDays: 3 }, {
  'task-scam': done('2026-11-12T00:00:00.000Z'),
}), at('2026-11-13T00:00:00.000Z')), null, 'belum jatuh tempo harus null');

assert.equal(practiceReminder(state({ enabled: true, intervalDays: 3 }, {
  'task-scam': done('2026-10-01T00:00:00.000Z'),
  'bank-otp': done('2026-11-12T00:00:00.000Z'),
}), at('2026-11-13T00:00:00.000Z')), null, 'penyelesaian terbaru menunda pengingat');

const due = practiceReminder(state({ enabled: true, intervalDays: 3 }, {
  'task-scam': done('2026-11-01T00:00:00.000Z'),
  'bank-otp': done('2026-11-02T00:00:00.000Z'),
}), at('2026-11-13T00:00:00.000Z'));
assert.ok(due, 'pengingat jatuh tempo harus ada');
assert.equal(due.scenarioId, 'task-scam', 'skenario paling lama yang diusulkan');
assert.equal(due.intervalDays, 3);
assert.equal(due.daysSince, 11);
assert.equal(due.dueAt, at('2026-11-05T00:00:00.000Z'));

const fallback = practiceReminder(state({ enabled: true, intervalDays: 999 }, {
  'task-scam': done('2026-11-01T00:00:00.000Z'),
}), at('2026-11-13T00:00:00.000Z'));
assert.equal(fallback.intervalDays, 7, 'interval rusak memakai 7 hari');
assert.ok(fallback);

assert.equal(practiceReminder(state({ enabled: true, intervalDays: 3 }, {
  'task-scam': { status: 'berjalan', updatedAt: '2026-11-01T00:00:00.000Z' },
  'bank-otp': done('bukan tanggal'),
}), at('2026-11-13T00:00:00.000Z')), null, 'tanpa tanggal selesai valid harus null');

assert.equal(practiceReminder(state({ enabled: true, intervalDays: 3 }, {}), at('2026-11-13')), null, 'tanpa progres harus null');
assert.equal(practiceReminder(state({ enabled: true, intervalDays: 3 }, {
  'task-scam': done('2026-11-01T00:00:00.000Z'),
}), 'rusak'), null, 'waktu rusak harus null');

const exact = practiceReminder(state({ enabled: true, intervalDays: 1 }, {
  'task-scam': done('2026-11-12T00:00:00.000Z'),
}), at('2026-11-13T00:00:00.000Z'));
assert.ok(exact, 'tepat satu interval harus jatuh tempo');
assert.equal(exact.dueAt, at('2026-11-13T00:00:00.000Z'));
assert.equal(Math.round((exact.dueAt - at('2026-11-12T00:00:00.000Z')) / day), 1);

console.log('✓ pengingat latihan: mati, belum jatuh tempo, jatuh tempo, interval rusak, dan data tidak valid lulus.');
