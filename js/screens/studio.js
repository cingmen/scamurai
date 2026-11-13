// Studio skenario komunitas: edit JSON, validasi, dan ekspor paket.
import { loadJSON } from '../core/loader.js';
import { h, clear } from '../core/dom.js';
import { buildPackage, packageFilename, validateScenario } from '../core/scenario-package.js';
import { showToast } from '../components/toast.js';

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function render(root) {
  const template = await loadJSON('./data/studio/template.json');
  clear(root);

  const jsonBox = h('textarea', {
    class: 'c-code',
    rows: '20',
    spellcheck: 'false',
    'data-studio-json': '1',
    'aria-label': 'JSON skenario komunitas',
  });
  jsonBox.value = JSON.stringify(template, null, 2);

  const status = h('div', {
    class: 'c-card',
    'data-studio-status': '1',
    'aria-live': 'polite',
    style: { marginTop: '12px' },
  });

  function showStatus(result, scenario) {
    clear(status);
    status.removeAttribute('data-state');
    if (!result) {
      status.append(h('p', { class: 'u-small u-muted' }, 'Tempel atau muat JSON, lalu tekan Validasi.'));
      return;
    }
    if (result.ok) {
      status.setAttribute('data-state', 'ok');
      const endings = Object.keys(scenario.endings || {}).length;
      const flags = new Set((scenario.steps || []).flatMap((step) => (step.hotspots || [])
        .filter((spot) => !spot.decoy && spot.flagId)
        .map((spot) => spot.flagId))).size;
      status.append(
        h('p', { style: { fontWeight: '700', color: 'var(--c-success, #4C8B63)' } },
          `Paket valid · ${scenario.steps.length} langkah · ${endings} ending · ${flags} red flag.`),
        h('p', { class: 'u-small u-muted' }, 'Semua consequence dan ending bisa dicapai dari langkah pertama.'),
      );
      return;
    }
    status.setAttribute('data-state', 'error');
    status.append(
      h('p', { style: { fontWeight: '700', color: 'var(--c-danger, #B23A2E)' } },
        `Belum bisa diekspor · ${result.errors.length} masalah.`),
      h('ul', { class: 'u-small', style: { margin: '8px 0 0 18px' } },
        ...result.errors.slice(0, 8).map((error) => h('li', null, error)),
        result.errors.length > 8 ? h('li', null, `…dan ${result.errors.length - 8} masalah lain.`) : null,
      ),
    );
  }

  function readScenario() {
    try {
      const scenario = JSON.parse(jsonBox.value);
      return { scenario, errors: [] };
    } catch (err) {
      return { scenario: null, errors: [`JSON tidak valid: ${err.message}`] };
    }
  }

  function validate() {
    const parsed = readScenario();
    if (!parsed.scenario) {
      const result = { ok: false, errors: parsed.errors };
      showStatus(result, null);
      return result;
    }
    const result = validateScenario(parsed.scenario);
    showStatus(result, parsed.scenario);
    return result;
  }

  const templateButton = h('button', {
    type: 'button',
    class: 'c-btn c-btn--ghost c-btn--sm',
    'data-studio-template': '1',
    onclick: () => {
      jsonBox.value = JSON.stringify(template, null, 2);
      validate();
      showToast('Contoh skenario dimuat.', { timeout: 2000 });
    },
  }, 'Muat contoh');

  const validateButton = h('button', {
    type: 'button',
    class: 'c-btn c-btn--primary c-btn--sm',
    'data-studio-validate': '1',
    onclick: validate,
  }, 'Validasi');

  const exportButton = h('button', {
    type: 'button',
    class: 'c-btn c-btn--ghost c-btn--sm',
    'data-studio-export': '1',
    onclick: () => {
      const parsed = readScenario();
      if (!parsed.scenario) {
        showStatus({ ok: false, errors: parsed.errors }, null);
        return;
      }
      const result = buildPackage(parsed.scenario);
      if (!result.ok) {
        showStatus(result, parsed.scenario);
        showToast('Perbaiki masalah validasi sebelum mengekspor.', { timeout: 3000 });
        return;
      }
      downloadText(packageFilename(parsed.scenario), result.text);
      showStatus({ ok: true, errors: [] }, parsed.scenario);
      showToast('Paket skenario diunduh.', { timeout: 2500 });
    },
  }, 'Unduh paket');

  const fileInput = h('input', {
    type: 'file',
    accept: 'application/json,.json',
    'data-studio-file': '1',
    style: { display: 'none' },
    onchange: async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      jsonBox.value = await file.text();
      validate();
      fileInput.value = '';
    },
  });

  const importButton = h('button', {
    type: 'button',
    class: 'c-btn c-btn--quiet c-btn--sm',
    'data-studio-open-file': '1',
    onclick: () => fileInput.click(),
  }, 'Impor berkas');

  const screen = h('div', { class: 'scr-studio' },
    h('div', { class: 'scr-head' },
      h('p', { class: 'scr-head__eyebrow' }, 'Komunitas'),
      h('h1', null, 'Studio skenario'),
      h('p', null, 'Buat skenario dalam format JSON Scamurai. Validator memeriksa langkah, consequence, red flag, dan ketercapaian setiap ending sebelum paket diunduh.'),
    ),
    h('section', { class: 'c-card' },
      h('h2', { class: 'section-title' }, 'Mulai dari contoh'),
      h('p', { class: 'u-small u-muted' }, 'Paket berisi skenario lengkap tanpa cover. Setelah divalidasi, unduh berkas .scenario.json dan ajukan ke pengelola komunitas.'),
      h('div', { class: 'u-row u-mt-3' },
        templateButton,
        validateButton,
        exportButton,
        importButton,
        fileInput,
      ),
      status,
      h('label', { class: 'u-small u-mt-4', for: 'studio-json', style: { display: 'block', fontWeight: '700' } }, 'JSON skenario'),
      jsonBox,
    ),
    h('section', { class: 'c-card' },
      h('h2', { class: 'section-title' }, 'Apa yang diperiksa'),
      h('ul', { class: 'c-dex-list' },
        h('li', null, 'Minimal 14 langkah dan 2 ending dengan consequence masing-masing.'),
        h('li', null, 'Semua goto menunjuk langkah yang ada; minimal 3 red flag non-decoy.'),
        h('li', null, 'Setiap ending dapat dicapai dari langkah pertama.'),
        h('li', null, 'Debrief memiliki anatomi, aliran, dan langkah pemulihan.'),
      ),
    ),
    h('div', { class: 'c-brief-actions' },
      h('a', { class: 'c-btn c-btn--ghost', href: '#/pengaturan' }, 'Kembali ke Pengaturan'),
      h('a', { class: 'c-btn c-btn--quiet', href: '#/skenario' }, 'Lihat skenario'),
    ),
  );

  jsonBox.id = 'studio-json';
  jsonBox.addEventListener('input', () => showStatus(null, null));
  showStatus(null, null);
  root.append(screen);
}
