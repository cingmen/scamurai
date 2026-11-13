// Sertifikat edukasi (app-logic.md §9.2).
import { get, setMany } from '../core/store.js';
import { h, clear } from '../core/dom.js';
import { certCode, dateID } from '../core/format.js';
import { hasPassedFinalExam } from '../core/exam.js';
import { renderCertificate, shareCanvas, downloadCanvas } from '../components/share.js';
import { showToast } from '../components/toast.js';

export async function render(root) {
  const passed = hasPassedFinalExam(get('exam', {}));
  clear(root);

  if (!passed) {
    root.append(h('div', { class: 'scr-cert' },
      h('div', { class: 'c-empty' },
        h('h2', null, 'Sertifikat belum terbuka'),
        h('p', null, 'Lulus ujian akhir dengan nilai minimal 80 untuk membuat sertifikat edukasi.'),
        h('a', { class: 'c-btn c-btn--primary u-mt-4', href: '#/ujian' }, 'Buka ujian akhir'),
      ),
    ));
    return;
  }

  const stored = get('certificate', {}) || {};
  let name = stored.name ?? get('profile.name', '');
  let date = stored.date || new Date().toISOString();
  const score = Number(get('exam.best', stored.score || 0));
  let code = certCode(name || 'Murid Anonim', date, score);
  let canvas = await renderCertificate({ name, score, date, code });

  const canvasBox = h('div', { class: 'c-cert-preview', 'aria-label': 'Pratinjau sertifikat' }, canvas);
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Pratinjau sertifikat untuk ${name || 'Murid Anonim'}`);

  const codeLabel = h('span', { class: 'u-mono' }, code);
  const nameInput = h('input', {
    id: 'cert-name',
    type: 'text',
    maxlength: '40',
    value: name,
    placeholder: 'Nama untuk sertifikat',
    autocomplete: 'name',
  });

  async function regenerate() {
    name = nameInput.value.trim().slice(0, 40);
    code = certCode(name || 'Murid Anonim', date, score);
    canvas = await renderCertificate({ name, score, date, code });
    clear(canvasBox);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Pratinjau sertifikat untuk ${name || 'Murid Anonim'}`);
    canvasBox.append(canvas);
    codeLabel.textContent = code;
    setMany([
      ['certificate.name', name],
      ['certificate.code', code],
      ['certificate.date', date],
      ['certificate.score', score],
    ]);
    showToast('Sertifikat diperbarui. Kode verifikasi ikut berubah.', { timeout: 3000 });
  }

  const actions = h('div', { class: 'u-row' },
    h('button', {
      type: 'button',
      class: 'c-btn c-btn--primary',
      onclick: async () => {
        await regenerate();
        downloadCanvas(canvas, `scamurai-sertifikat-${code}.png`);
      },
    }, 'Unduh PNG'),
    h('button', {
      type: 'button',
      class: 'c-btn c-btn--ghost',
      onclick: async () => {
        await regenerate();
        const result = await shareCanvas(canvas, `scamurai-sertifikat-${code}.png`, 'Sertifikat edukasi Scamurai');
        if (result.shared) showToast('Sertifikat dibagikan.', { timeout: 2500 });
        else if (!result.aborted) showToast('Sertifikat diunduh sebagai PNG.', { timeout: 2500 });
      },
    }, 'Bagikan'),
  );

  root.append(h('div', { class: 'scr-cert' },
    h('a', { href: '#/ujian', class: 'u-small' }, '← Kembali ke ujian'),
    h('div', { class: 'scr-head' },
      h('p', { class: 'scr-head__eyebrow' }, 'Sertifikat edukasi'),
      h('h1', null, 'Namamu, hasil latihanmu'),
      h('p', null, 'Sertifikat digambar di perangkat ini dan tidak dikirim ke mana pun. Kode verifikasi deterministik, bukan kriptografi resmi.'),
    ),
    canvasBox,
    h('div', { class: 'c-card' },
      h('div', { class: 'c-cert-form' },
        h('div', { class: 'c-field' },
          h('label', { for: 'cert-name' }, 'Nama pada sertifikat'),
          nameInput,
          h('span', { class: 'c-field__hint' }, 'Boleh dikosongkan untuk tampil sebagai “Murid Anonim”. Mengubah nama mengubah kode verifikasi.'),
        ),
        h('div', { class: 'c-cert-meta' },
          h('div', { class: 'c-stat' },
            h('div', { class: 'c-stat__value' }, String(score)),
            h('div', { class: 'c-stat__label' }, 'Skor ujian'),
          ),
          h('div', { class: 'c-stat' },
            h('div', { class: 'c-stat__value' }, dateID(date)),
            h('div', { class: 'c-stat__label' }, 'Tanggal'),
          ),
          h('div', { class: 'c-stat' },
            h('div', { class: 'c-stat__value u-mono', style: { fontSize: 'var(--s-fs-400)' } }, codeLabel),
            h('div', { class: 'c-stat__label' }, 'Kode verifikasi'),
          ),
        ),
        h('p', { class: 'u-small u-faint' }, 'Kode dibuat dari nama, tanggal, skor, dan kata kunci Scamurai. Siapa pun bisa menghitung ulang; ini bukan tanda tangan digital.'),
        actions,
        h('p', { class: 'u-small u-muted' }, 'Sertifikat ini adalah bukti edukasi komunitas, bukan sertifikasi resmi pemerintah dan bukan lisensi profesional.'),
      ),
    ),
    h('div', { class: 'c-brief-actions' },
      h('a', { class: 'c-btn c-btn--ghost', href: '#/sekolah' }, 'Mode sekolah'),
      h('a', { class: 'c-btn c-btn--quiet', href: '#/' }, 'Kembali ke beranda'),
    ),
  ));

  setMany([
    ['certificate.name', name],
    ['certificate.code', code],
    ['certificate.date', date],
    ['certificate.score', score],
  ]);
}
