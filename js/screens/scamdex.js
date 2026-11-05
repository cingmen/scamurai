// ScamDEX: ensiklopedia kartu modus penipuan (PRD §12.1).
import { loadJSON } from '../core/loader.js';
import { get, beltInfo } from '../core/store.js';
import { h, clear } from '../core/dom.js';
import { dexCard, beltLadder } from '../components/badge-card.js';
import { openModal } from '../components/modal.js';

export async function render(root) {
  const scamdex = await loadJSON('./data/scamdex.json');
  const unlockedCount = scamdex.cards.filter((card) => get(`dex.${card.id}.unlocked`, false)).length;
  const belt = beltInfo();

  clear(root);

  function openDetail(card) {
    const variants = get(`dex.${card.id}.variants`, []) || [];
    openModal({
      title: card.name,
      body: h('div', { class: 'u-col' },
        h('p', { class: 'u-small u-muted' }, card.alias),
        h('div', { class: 'u-row' },
          h('span', { class: 'c-chip c-chip--danger' }, `Keparahan ${card.severity}/3`),
          h('span', { class: 'c-chip' }, `Dibuka: ${unlockedCount}/${scamdex.cards.length}`),
        ),
        h('section', { class: 'c-dex-section' },
          h('h2', null, 'Psikologi yang dieksploitasi'),
          h('p', null, card.psychology),
        ),
        h('section', { class: 'c-dex-section' },
          h('h2', null, 'Red flag utama'),
          h('ul', { class: 'c-dex-list' }, ...card.flags.map((flag) => h('li', null, flag))),
        ),
        h('section', { class: 'c-dex-section' },
          h('h2', null, 'Cara memverifikasi'),
          h('ul', { class: 'c-dex-list' }, ...card.verify.map((item) => h('li', null, item))),
        ),
        h('section', { class: 'c-dex-section' },
          h('h2', null, 'Kanal pelaporan'),
          h('ul', { class: 'c-dex-list' }, ...card.report.map((item) => h('li', null, item))),
        ),
        (card.variants || []).length
          ? h('section', { class: 'c-dex-section' },
            h('h2', null, 'Varian bonus'),
            h('div', { class: 'c-dex-variants' },
              ...card.variants.map((variant) => {
                const open = variants.includes(variant.id);
                return h('span', { class: `c-chip ${open ? 'c-chip--gold' : ''}` },
                  open ? `★ ${variant.name}` : `🔒 ${variant.name}`,
                );
              }),
            ),
            h('p', { class: 'u-small u-muted u-mt-2' },
              ...card.variants.map((variant) => `${variant.name}: ${variant.desc}`),
            ),
          )
          : null,
      ),
      actions: [{ label: 'Tutup', value: null, variant: 'primary' }],
    });
  }

  const grid = h('div', { class: 'c-dex-grid' },
    ...scamdex.cards.map((card) => {
      const unlocked = Boolean(get(`dex.${card.id}.unlocked`, false));
      return dexCard(card, {
        unlocked,
        onClick: (item) => openDetail(item),
      });
    }),
  );

  root.append(h('div', { class: 'scr-dex' },
    h('div', { class: 'scr-head' },
      h('p', { class: 'scr-head__eyebrow' }, 'Ensiklopedia musuh'),
      h('h1', null, 'ScamDEX'),
      h('p', null, 'Satu kartu per modus penipuan. Kartu terbuka permanen setelah skenario selesai; ending tertentu membuka varian bonus.'),
      h('div', { class: 'c-dex-progress u-mt-3' },
        h('b', null, `${unlockedCount} / ${scamdex.cards.length}`),
        h('span', null, 'kartu terbuka'),
        h('span', { class: 'c-chip c-chip--gold' }, `Sabuk ${belt.name}`),
      ),
    ),
    beltLadder(belt.level),
    grid,
    h('section', { class: 'c-card u-mt-6' },
      h('h2', { class: 'section-title' }, 'Cara membaca kartu'),
      h('p', { class: 'u-small u-muted' }, 'Tingkat keparahan menunjukkan besar kerugian dan sulitnya pemulihan, bukan seberapa sering modus itu terjadi. Setiap kartu memuat red flag, langkah verifikasi, dan kanal pelaporan yang bisa dipakai hari ini.'),
    ),
    h('p', { class: 'u-small u-faint u-center' }, 'Belum ada kartu terbuka? Selesaikan skenario pertamamu.'),
  ));
}
