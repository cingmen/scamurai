// Pengantar skenario (structure.md §3).
import { loadJSON } from '../core/loader.js';
import { get } from '../core/store.js';
import { h, clear } from '../core/dom.js';
import { katana } from '../components/scenario-card.js';
import { markBriefed } from '../core/progress.js';

export async function render(root, { params }) {
  const id = params[0];
  const [manifest, scenario] = await Promise.all([
    loadJSON('./data/manifest.json'),
    loadJSON(`./data/scenarios/${id}.json`),
  ]);
  const meta = manifest.scenarios.find((item) => item.id === id);
  if (!meta) {
    window.location.hash = '#/skenario';
    return;
  }

  const progress = get(`progress.${id}`, null);
  const isVn = scenario.type === 'vn';
  const hasProgress = progress && (progress.status === 'berjalan' || progress.status === 'selesai');
  const rules = scenario.brief?.rules || meta.learning || [];
  const lansia = get('settings.mode', 'standar') === 'lansia' && scenario.simplify === true;

  clear(root);

  const start = () => {
    markBriefed(id);
    window.location.hash = isVn ? `#/vn/${id}` : `#/main/${id}`;
  };

  const primaryLabel = hasProgress && progress.status === 'berjalan' ? 'Lanjutkan skenario' : (progress?.status === 'selesai' ? 'Mainkan lagi' : 'Mulai simulasi');

  root.append(h('div', { class: 'scr-brief' },
    h('a', { href: '#/skenario', class: 'u-small' }, '← Semua skenario'),
    h('article', { class: 'c-brief-hero' },
      h('img', { src: meta.cover, alt: `Ilustrasi ${meta.title}`, width: '960', height: '420' }),
      h('div', { class: 'c-brief-hero__body' },
        h('div', { class: 'u-row' },
          h('span', { class: 'c-chip c-chip--gold' }, meta.modus),
          katana(meta.difficulty),
          h('span', { class: 'c-chip' }, `${meta.minutes} menit`),
          isVn ? h('span', { class: 'c-chip c-chip--info' }, 'Visual novel') : null,
          progress?.status === 'selesai' ? h('span', { class: 'c-chip c-chip--success' }, 'Pernah selesai') : null,
        ),
        h('h1', null, meta.title),
        h('p', { class: 'u-muted' }, meta.summary),
        h('div', { class: 'c-panel c-panel--info u-mt-4' },
          h('strong', null, 'Misi kamu'),
          h('p', { class: 'u-small u-mt-2' }, scenario.brief?.goal || 'Kenali red flag dan pilih langkah terbaik.'),
        ),
        lansia ? h('div', { class: 'c-panel c-panel--warn u-mt-3' },
          h('strong', null, 'Mode Lansia aktif'),
          h('p', { class: 'u-small u-mt-2' },
            `Versi sederhana: ${scenario.lansiaSteps?.length || 0} langkah, maksimal dua pilihan per layar, tanpa timer.`,
          ),
        ) : null,
      ),
    ),
    h('section', { class: 'c-card' },
      h('h2', { class: 'section-title' }, 'Aturan dojo'),
      h('ul', { class: 'c-brief-list' },
        ...rules.map((rule) => h('li', null, rule)),
      ),
    ),
    h('section', { class: 'c-grid u-row', style: { gap: 'var(--s-sp-4)', alignItems: 'stretch', flexWrap: 'wrap' } },
      h('div', { class: 'c-card', style: { flex: '1 1 240px' } },
        h('h3', { style: { fontSize: 'var(--s-fs-500)' } }, 'Yang akan kamu latih'),
        h('ul', { class: 'c-brief-list u-mt-2' },
          ...(meta.learning || []).map((item) => h('li', null, item)),
        ),
      ),
      h('div', { class: 'c-card', style: { flex: '1 1 240px' } },
        h('h3', { style: { fontSize: 'var(--s-fs-500)' } }, 'Saldo Dojo'),
        h('p', { class: 'u-small u-muted u-mt-2' },
          'Uang simulasi lintas skenario. Kesalahan mengurangi saldo; keputusan tepat menjaganya. Saldo tidak nyata dan tidak bisa diuangkan.',
        ),
        h('p', { class: 'u-mono u-mt-2' }, get('dojo.saldo', 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })),
      ),
    ),
    h('div', { class: 'c-brief-actions' },
      h('button', { type: 'button', class: 'c-btn c-btn--primary', onclick: start }, primaryLabel),
      h('a', { class: 'c-btn c-btn--ghost', href: '#/skenario' }, 'Batal'),
      h('a', { class: 'c-btn c-btn--quiet', href: '#/bantuan' }, 'Aku sedang kena scam'),
    ),
    h('p', { class: 'u-small u-faint' },
      'Semua merek, aplikasi, nomor, dan rekening di skenario ini fiktif dan dibuat khusus untuk edukasi. Screenshot tidak bisa dipakai untuk menipu orang lain.',
    ),
  ));
}
