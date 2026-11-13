#!/usr/bin/env node
// Uji logika ujian: pool 10/20, anti-repetisi, dan penilaian tiga tipe soal.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildExamPool, isAnswerCorrect, gradeExam, hasPassedFinalExam } from '../js/core/exam.js';

const root = new URL('..', import.meta.url);
const data = JSON.parse(await readFile(new URL('data/exam/final-exam.json', root), 'utf8'));
const questions = data.questions;
const id = (question) => question.id;
const lastPool = questions.slice(0, 10).map(id);
const pool = buildExamPool(questions, { size: 10, lastPool });

assert.equal(questions.length, 40, 'pool soal harus 40');
assert.equal(data.school?.poolSize, 10, 'kuis kelas harus 10 soal');
assert.equal(data.school?.passScore, 80, 'nilai lulus kuis kelas harus 80');
assert.equal(new Set(questions.map(id)).size, questions.length, 'id soal harus unik');

assert.equal(pool.length, 10, 'kuis kelas harus memilih 10 soal');
assert.equal(new Set(pool.map(id)).size, 10, 'soal dalam pool tidak boleh duplikat');
assert.equal(pool.some((question) => lastPool.includes(question.id)), false,
  'soal dari sesi sebelumnya harus dihindari bila stok baru cukup');

const answers = pool.map((question) => {
  if (question.type === 'pilihan') return question.answer;
  if (question.type === 'urutan') return question.items.map((_, index) => index);
  return question.hotspots.findIndex((spot) => spot.correct);
});
const result = gradeExam(pool, answers);
assert.equal(result.correct, 10);
assert.equal(result.score, 100);

const wrong = gradeExam(pool, new Array(pool.length).fill(-1));
assert.equal(wrong.correct, 0);
assert.equal(wrong.score, 0);
assert.equal(isAnswerCorrect(pool[0], answers[0]), true);
assert.equal(isAnswerCorrect(pool[0], -1), false);

const fullPool = buildExamPool(questions, { size: 20, lastPool: [] });
assert.equal(fullPool.length, 20, 'ujian akhir harus memilih 20 soal');
assert.equal(new Set(fullPool.map(id)).size, 20, '20 soal ujian harus unik');

const nearlyExhausted = buildExamPool(questions, {
  size: 10,
  lastPool: questions.slice(0, 35).map(id),
});
assert.equal(nearlyExhausted.length, 10, 'pool harus tetap 10 saat stok baru tinggal 5');
assert.equal(new Set(nearlyExhausted.map(id)).size, 10, 'pool cadangan tetap unik');

assert.equal(hasPassedFinalExam({ passed: true, best: 80, attempts: 1, passScore: 80 }), true);
assert.equal(hasPassedFinalExam({ passed: true, best: 79, attempts: 1, passScore: 80 }), false);
assert.equal(hasPassedFinalExam({ passed: true, best: 90, attempts: 0, passScore: 80 }), false);
assert.equal(hasPassedFinalExam({ passed: false, best: 100, attempts: 1, passScore: 80 }), false);
assert.equal(hasPassedFinalExam({ passed: true, best: 90, attempts: 2 }), true);

console.log('✓ pool 10/20 soal, anti-repetisi, penilaian tiga tipe, dan kelayakan sertifikat lulus.');
