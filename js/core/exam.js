// Logika murni ujian: pemilihan soal dan penilaian (app-logic.md §9).
import { shuffle } from './format.js';

/** Pilih `size` soal unik, dahulukan soal yang belum muncul di sesi sebelumnya. */
export function buildExamPool(questions, { size, lastPool = [] } = {}) {
  const list = Array.isArray(questions) ? questions : [];
  const limit = Math.max(1, Math.min(Number(size) || list.length, list.length));
  const seen = new Set(Array.isArray(lastPool) ? lastPool : []);
  const fresh = list.filter((question) => !seen.has(question.id));
  const source = fresh.length >= limit
    ? fresh
    : [...fresh, ...list.filter((question) => seen.has(question.id))];
  return shuffle(source).slice(0, limit);
}

export function isAnswerCorrect(question, answer) {
  if (question.type === 'pilihan') return answer === question.answer;
  if (question.type === 'urutan') {
    return Array.isArray(answer)
      && answer.length === question.items.length
      && answer.every((value, index) => value === index);
  }
  return Boolean(question.hotspots?.[answer]?.correct);
}

export function gradeExam(pool, answers) {
  const correct = pool.filter((question, index) => isAnswerCorrect(question, answers[index])).length;
  return {
    correct,
    score: Math.round((correct / pool.length) * 100),
  };
}
