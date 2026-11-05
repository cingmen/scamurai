// Ujian akhir 20 soal dari pool 40 (app-logic.md §9.1).
import { loadJSON } from '../core/loader.js';
import { get, setMany, rhythm } from '../core/store.js';
import { h, clear, scrollToEnd } from '../core/dom.js';
import { shuffle } from '../core/format.js';
import { progressBar } from '../components/progress.js';
import { showToast } from '../components/toast.js';

const PASS = 80;
const POOL_SIZE = 20;
const TYPE_LABEL = { pilihan: 'Pilihan ganda', urutan: 'Urutan langkah', 'flag-gambar': 'Red flag' };

function formatTime(seconds) {
  const m = Math.max(0, Math.floor(seconds / 60));
  const s = Math.max(0, seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function isCorrect(question, answer) {
  if (question.type === 'pilihan') return answer === question.answer;
  if (question.type === 'urutan') {
    return Array.isArray(answer)
      && answer.length === question.items.length
      && answer.every((value, index) => value === index);
  }
  return Boolean(question.hotspots?.[answer]?.correct);
}

function answerLabel(question, answer) {
  if (answer === null || answer === undefined) return 'Tidak dijawab';
  if (question.type === 'pilihan') return question.options[answer] ?? '—';
  if (question.type === 'urutan') {
    return Array.isArray(answer) ? answer.map((i) => question.items[i]).join(' → ') : '—';
  }
  return question.hotspots?.[answer]?.label || '—';
}

function correctLabel(question) {
  if (question.type === 'pilihan') return question.options[question.answer];
  if (question.type === 'urutan') return question.items.join(' → ');
  return question.hotspots.filter((spot) => spot.correct).map((spot) => spot.label).join(' / ');
}

export async function render(root) {
  const data = await loadJSON('./data/exam/final-exam.json');
  clear(root);
  const shell = h('div', { class: 'scr-exam' });
  root.append(shell);

  let pool = [];
  let answers = [];
  let shuffleMap = new Map();
  let index = 0;
  let finished = false;
  let timerId = null;
  let timerEl = null;
  let remaining = (data.minutes || 20) * 60;

  function makePool() {
    const seen = new Set(get('exam.lastPool', []));
    const fresh = data.questions.filter((question) => !seen.has(question.id));
    const source = fresh.length >= POOL_SIZE ? fresh : data.questions;
    return shuffle(source).slice(0, POOL_SIZE);
  }

  function start() {
    pool = makePool();
    answers = new Array(pool.length).fill(null);
    shuffleMap = new Map();
    pool.forEach((question) => {
      if (question.type === 'urutan') {
        shuffleMap.set(question.id, shuffle(question.items.map((_, i) => i)));
      }
    });
    index = 0;
    finished = false;
    remaining = (data.minutes || 20) * 60;
    clearInterval(timerId);
    timerId = null;
    renderQuestion();
    if (rhythm() === 'nyata') startTimer();
  }

  function startTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => {
      remaining -= 1;
      if (timerEl) timerEl.textContent = formatTime(remaining);
      if (remaining <= 0) {
        clearInterval(timerId);
        timerId = null;
        if (!finished) {
          showToast('Waktu ujian habis. Jawaban dinilai otomatis.', { timeout: 4000 });
          finish(true);
        }
      }
    }, 1000);
  }

  function header(bar) {
    const timer = rhythm() === 'nyata' ? h('span', { class: 'c-exam-timer' }, formatTime(remaining)) : null;
    timerEl = timer;
    return h('div', null,
      h('div', { class: 'u-spread' },
        h('div', null,
          h('p', { class: 'scr-head__eyebrow' }, 'Ujian akhir'),
          h('h1', { style: { fontSize: 'var(--s-fs-800)' } }, 'Uji pemahamanmu'),
        ),
        timer,
      ),
      h('p', { class: 'u-small u-muted' }, `Lulus dengan skor ≥ ${PASS}. Jawaban benar akan dijelaskan di akhir.`),
      bar.el,
    );
  }

  function nextButton() {
    const last = index === pool.length - 1;
    const button = h('button', {
      type: 'button',
      class: 'c-btn c-btn--primary',
      onclick: () => {
        if (button.disabled) return;
        if (last) finish(false);
        else {
          index += 1;
          renderQuestion();
        }
      },
    }, last ? 'Selesai & nilai' : 'Lanjut');
    button.disabled = !answered();
    return button;
  }

  function answered() {
    const answer = answers[index];
    const question = pool[index];
    if (question.type === 'urutan') return Array.isArray(answer) && answer.length === question.items.length;
    return answer !== null && answer !== undefined;
  }

  function renderQuestion() {
    const question = pool[index];
    clear(shell);
    const bar = progressBar({ value: index, max: pool.length, label: 'Progres ujian', showCount: true });
    shell.append(header(bar));

    const card = h('div', { class: 'c-exam-card' },
      h('div', { class: 'c-exam-tag' },
        h('span', { class: 'c-chip c-chip--gold' }, TYPE_LABEL[question.type] || 'Soal'),
        h('span', { class: 'c-chip c-chip--info' }, question.tag || 'Umum'),
      ),
      h('h2', { class: 'c-exam-q' }, question.prompt),
    );

    if (question.type === 'pilihan') {
      const options = h('div', { class: 'c-exam-options', role: 'group', 'aria-label': 'Pilihan jawaban' });
      question.options.forEach((option, i) => {
        const button = h('button', {
          type: 'button',
          class: `c-exam-option${answers[index] === i ? ' is-picked' : ''}`,
          onclick: () => {
            answers[index] = i;
            options.querySelectorAll('button').forEach((node) => node.classList.remove('is-picked'));
            button.classList.add('is-picked');
            next.disabled = !answered();
          },
        },
          h('span', { class: 'c-exam-option__key', 'aria-hidden': 'true' }, String.fromCharCode(65 + i)),
          h('span', null, option),
        );
        options.append(button);
      });
      card.append(options);
    }

    if (question.type === 'urutan') {
      const intro = h('p', { class: 'u-small u-muted' }, 'Ketuk langkah sesuai urutan yang benar. Ketuk angka untuk membatalkan.');
      const chosenBox = h('div', { class: 'c-exam-order', 'aria-label': 'Urutan pilihanmu' });
      const poolBox = h('div', { class: 'c-exam-options', role: 'group', 'aria-label': 'Langkah yang bisa dipilih' });
      const reset = h('button', {
        type: 'button',
        class: 'c-btn c-btn--quiet c-btn--sm',
        onclick: () => {
          answers[index] = [];
          draw();
          next.disabled = !answered();
        },
      }, 'Ulangi urutan');

      const draw = () => {
        const chosen = answers[index] || [];
        clear(chosenBox);
        clear(poolBox);
        chosen.forEach((itemIndex, position) => {
          chosenBox.append(h('button', {
            type: 'button',
            class: 'c-exam-order__item c-exam-order__picked',
            'aria-label': `Langkah ${position + 1}: ${question.items[itemIndex]}. Ketuk untuk membatalkan.`,
            onclick: () => {
              answers[index] = chosen.filter((_, i) => i !== position);
              draw();
              next.disabled = !answered();
            },
          },
            h('span', { class: 'c-exam-order__num' }, String(position + 1)),
            h('span', null, question.items[itemIndex]),
          ));
        });
        if (!chosen.length) {
          chosenBox.append(h('p', { class: 'u-small u-faint' }, 'Belum ada langkah dipilih.'));
        }
        (shuffleMap.get(question.id) || []).filter((i) => !chosen.includes(i)).forEach((itemIndex) => {
          poolBox.append(h('button', {
            type: 'button',
            class: 'c-exam-option',
            onclick: () => {
              answers[index] = [...(answers[index] || []), itemIndex];
              draw();
              next.disabled = !answered();
            },
          },
            h('span', { class: 'c-exam-option__key', 'aria-hidden': 'true' }, '+'),
            h('span', null, question.items[itemIndex]),
          ));
        });
        if (chosen.length === question.items.length) reset.hidden = false;
        else reset.hidden = true;
      };

      card.append(intro, chosenBox, poolBox, reset);
      draw();
    }

    if (question.type === 'flag-gambar') {
      const shot = h('div', { class: 'c-exam-shot' },
        h('div', { class: 'c-exam-shot__title' }, question.surface?.title || 'SIMULASI'),
        ...(question.surface?.lines || []).map((line) => h('div', { class: 'c-exam-shot__line' }, line)),
      );
      question.hotspots.forEach((spot, i) => {
        const button = h('button', {
          type: 'button',
          class: `c-exam-hotspot-area${answers[index] === i ? ' is-picked' : ''}`,
          style: { left: `${spot.x}%`, top: `${spot.y}%` },
          'aria-label': spot.label,
          title: spot.label,
          onclick: () => {
            answers[index] = i;
            shot.querySelectorAll('button').forEach((node) => node.classList.remove('is-picked'));
            button.classList.add('is-picked');
            next.disabled = !answered();
          },
        });
        shot.append(button);
      });
      card.append(h('p', { class: 'u-small u-muted' }, 'Ketuk satu area pada tangkapan layar simulasi.'), shot);
    }

    const next = nextButton();
    shell.append(card, h('div', { class: 'u-row', style: { justifyContent: 'flex-end' } }, next));
    scrollToEnd(shell);
  }

  function finish(auto = false) {
    if (finished) return;
    finished = true;
    clearInterval(timerId);
    timerId = null;
    const correct = pool.filter((question, i) => isCorrect(question, answers[i])).length;
    const score = Math.round((correct / pool.length) * 100);
    const passed = score >= PASS;
    const attempts = Number(get('exam.attempts', 0)) + 1;
    setMany([
      ['exam.attempts', attempts],
      ['exam.best', Math.max(Number(get('exam.best', 0)), score)],
      ['exam.passed', Boolean(get('exam.passed', false)) || passed],
      ['exam.lastPool', pool.map((question) => question.id)],
    ]);
    renderResult({ score, correct, passed, auto });
  }

  function renderResult({ score, correct, passed, auto }) {
    clear(shell);
    const alreadyPassed = Boolean(get('exam.passed', false));
    shell.append(
      h('div', { class: 'c-exam-result' },
        h('p', { class: 'scr-head__eyebrow' }, auto ? 'Waktu habis' : 'Ujian selesai'),
        h('div', { class: `c-exam-result__score ${passed ? 'is-pass' : 'is-fail'}` }, String(score)),
        h('p', { class: 'u-muted' }, `Benar ${correct} dari ${pool.length} soal. Nilai lulus ${PASS}.`),
        h('div', { class: 'c-chip c-chip--lg ' + (passed ? 'c-chip--success' : 'c-chip--warn') },
          passed ? '✓ Lulus ujian' : 'Belum lulus — tidak ada hukuman, coba lagi'),
        h('p', { class: 'u-small u-muted', style: { maxWidth: '54ch' } },
          passed
            ? 'Sertifikat edukasi bisa kamu buat dengan namamu. Bukan sertifikasi resmi pemerintah.'
            : 'Baca ulang bagian yang salah di bawah, lalu ulangi. Soal akan diacak lagi dari pool yang sama.',
        ),
        h('div', { class: 'u-row' },
          passed
            ? h('a', { class: 'c-btn c-btn--primary', href: '#/sertifikat' }, 'Buat sertifikat')
            : h('button', { type: 'button', class: 'c-btn c-btn--primary', onclick: start }, 'Ulangi ujian'),
          passed
            ? h('button', { type: 'button', class: 'c-btn c-btn--ghost', onclick: start }, 'Ulangi untuk skor lebih baik')
            : h('a', { class: 'c-btn c-btn--ghost', href: '#/scamdex' }, 'Baca ulang ScamDEX'),
          h('a', { class: 'c-btn c-btn--quiet', href: '#/skenario' }, 'Kembali ke skenario'),
        ),
        !passed && alreadyPassed
          ? h('p', { class: 'u-small u-muted' }, 'Kamu tetap tercatat pernah lulus. Skor terbaikmu tidak turun.')
          : null,
      ),
      h('section', { class: 'c-exam-review', 'aria-label': 'Pembahasan jawaban' },
        h('h2', { class: 'section-title' }, 'Pembahasan'),
        ...pool.map((question, i) => {
          const right = isCorrect(question, answers[i]);
          return h('div', { class: `c-exam-review__item ${right ? 'is-right' : 'is-wrong'}` },
            h('div', { class: 'u-spread' },
              h('strong', null, `${i + 1}. ${question.prompt}`),
              h('span', { class: 'c-chip ' + (right ? 'c-chip--success' : 'c-chip--danger') }, right ? 'Benar' : 'Salah'),
            ),
            h('p', { class: 'u-small u-mt-2' }, h('strong', null, 'Jawabanmu: '), answerLabel(question, answers[i])),
            h('p', { class: 'u-small' }, h('strong', null, 'Jawaban benar: '), correctLabel(question)),
            h('p', { class: 'u-small u-muted u-mt-2' }, question.explain),
          );
        }),
      ),
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderIntro() {
    clear(shell);
    shell.append(
      h('div', { class: 'scr-head' },
        h('p', { class: 'scr-head__eyebrow' }, 'Ujian akhir dojo'),
        h('h1', null, 'Dua puluh soal dari pengalaman nyata'),
        h('p', null, `Soal diambil dari konteks skenario yang sudah kamu mainkan. Nilai lulus ${PASS}; salah tidak menghapus progres.`),
      ),
      h('div', { class: 'c-card' },
        h('div', { class: 'c-stat-row' },
          h('div', { class: 'c-stat' }, h('div', { class: 'c-stat__value' }, String(get('exam.attempts', 0))), h('div', { class: 'c-stat__label' }, 'Percobaan')),
          h('div', { class: 'c-stat' }, h('div', { class: 'c-stat__value' }, String(get('exam.best', 0))), h('div', { class: 'c-stat__label' }, 'Skor terbaik')),
          h('div', { class: 'c-stat' }, h('div', { class: 'c-stat__value' }, get('exam.passed', false) ? 'Lulus' : 'Belum'), h('div', { class: 'c-stat__label' }, 'Status')),
        ),
        h('ul', { class: 'c-brief-list u-mt-4' },
          h('li', null, '20 soal acak dari pool 40; soal yang baru kamu kerjakan dihindari pada percobaan berikutnya.'),
          h('li', null, 'Tiga tipe: pilihan ganda, urutan langkah pemulihan, dan menandai red flag pada tangkapan layar.'),
          h('li', null, 'Timer 20 menit hanya aktif pada ritme “Nyata”. Ritme lain tanpa timer.'),
          h('li', null, `Nilai lulus ${PASS}. Gagal boleh diulang kapan saja tanpa hukuman.`),
        ),
        h('div', { class: 'u-row u-mt-4' },
          h('button', { type: 'button', class: 'c-btn c-btn--primary', onclick: start }, 'Mulai ujian'),
          h('a', { class: 'c-btn c-btn--ghost', href: '#/scamdex' }, 'Baca ScamDEX dulu'),
          h('a', { class: 'c-btn c-btn--quiet', href: '#/skenario' }, 'Kembali'),
        ),
      ),
      h('p', { class: 'u-small u-faint u-center' }, 'Sertifikat adalah bukti edukasi komunitas, bukan sertifikasi resmi.'),
    );
  }

  renderIntro();

  return () => {
    clearInterval(timerId);
    timerId = null;
  };
}
