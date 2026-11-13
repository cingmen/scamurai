// Pengaturan & data lokal (structure.md §3).
import {
  all, get, set, resetProgress, resetAll, exportCode, importCode, storageOk, persist,
  getBackups, restoreBackup, storageWriteProtected,
} from '../core/store.js';
import { h, clear } from '../core/dom.js';
import { showToast } from '../components/toast.js';
import { confirmModal } from '../components/modal.js';
import { dateTimeID } from '../core/format.js';

const BACKUP_REASONS = {
  parse: 'JSON tidak bisa dibaca',
  shape: 'Struktur data tidak dikenali',
  normalize: 'Data dinormalkan',
  migration: 'Data lama dimigrasikan',
  future: 'Dibuat versi lebih baru',
};

function backupReason(reason) {
  return BACKUP_REASONS[reason] || 'Data dicadangkan otomatis';
}

function downloadBackupPayload(backup, index) {
  const blob = new Blob([backup.raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = String(backup.savedAt || '').replace(/[^0-9]/g, '').slice(0, 14) || 'backup';
  anchor.href = url;
  anchor.download = `scamurai-backup-${index + 1}-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function seg(options, current, onPick, { disabled = false } = {}) {
  const wrap = h('div', { class: 'c-seg', role: 'group' });
  options.forEach((option) => {
    const button = h('button', {
      type: 'button',
      'aria-pressed': option.value === current ? 'true' : 'false',
      disabled,
      onclick: () => {
        wrap.querySelectorAll('button').forEach((node) => node.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        onPick(option.value);
      },
    }, option.label);
    wrap.append(button);
  });
  return wrap;
}

function row(title, sub, control) {
  return h('div', { class: 'c-setting' },
    h('div', null,
      h('div', { class: 'c-setting__title' }, title),
      sub ? h('div', { class: 'c-setting__sub' }, sub) : null,
    ),
    control,
  );
}

function toggleSwitch(key, label, onChange = null) {
  const button = h('button', {
    type: 'button',
    class: 'c-switch',
    'aria-pressed': get(key, true) ? 'true' : 'false',
    'aria-label': label,
    onclick: () => {
      const next = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', next ? 'true' : 'false');
      set(key, next);
      persist();
      if (onChange) onChange(next);
    },
  });
  return button;
}

export async function render(root) {
  const state = all();
  const settings = state.settings;
  const elder = settings.mode === 'lansia';
  const reminder = settings.reminder;

  clear(root);

  const appearance = h('section', { class: 'c-card' },
    h('h2', { class: 'section-title' }, 'Tampilan'),
    row('Tema', 'Sumi gelap untuk malam, Washi terang untuk siang.', seg([
      { value: 'sumi', label: 'Sumi' },
      { value: 'washi', label: 'Washi' },
    ], settings.theme, (value) => set('settings.theme', value), { disabled: elder })),
    row('Ukuran teks', 'Skala font berlaku di seluruh layar.', seg([
      { value: 'normal', label: 'Normal' },
      { value: 'large', label: 'Besar' },
      { value: 'elder', label: 'Ekstra' },
    ], settings.fontScale, (value) => set('settings.fontScale', value), { disabled: elder })),
    elder
      ? h('p', { class: 'u-small u-muted' }, 'Mode Lansia mengunci tema Washi dan teks ekstra besar. Matikan mode untuk mengubahnya.')
      : null,
  );

  const rhythm = h('section', { class: 'c-card' },
    h('h2', { class: 'section-title' }, 'Ritme latihan'),
    row('Kecepatan waktu', 'Timer hanya ada di skenario yang memang punya batas waktu.', seg([
      { value: 'santai', label: 'Santai' },
      { value: 'normal', label: 'Normal' },
      { value: 'nyata', label: 'Nyata' },
    ], state.profile.rhythm, (value) => {
      set('profile.rhythm', value);
      persist();
    }, { disabled: elder })),
    elder ? h('p', { class: 'u-small u-muted' }, 'Mode Lansia selalu tanpa timer.') : null,
  );

  const mode = h('section', { class: 'c-card' },
    h('h2', { class: 'section-title' }, 'Mode khusus'),
    row('Mode standar', 'Pengalaman penuh dengan semua pilihan dan timer sesuai ritme.', seg([
      { value: 'standar', label: 'Standar' },
      { value: 'lansia', label: 'Lansia' },
      { value: 'sekolah', label: 'Sekolah' },
    ], settings.mode, async (value) => {
      if (value === 'lansia') {
        const ok = await confirmModal({
          title: 'Aktifkan Mode Lansia?',
          message: 'Teks diperbesar, tema menjadi terang, Kenji selalu memberi petunjuk, timer dimatikan, dan pilihan dibatasi dua per layar.',
          confirmLabel: 'Aktifkan',
          cancelLabel: 'Batal',
        });
        if (!ok) {
          render(root);
          return;
        }
        set('settings.mode', 'lansia');
        set('settings.theme', 'washi');
        set('settings.fontScale', 'elder');
        set('settings.kenjiTips', true);
      } else {
        set('settings.mode', value);
      }
      persist();
      render(root);
    })),
    h('p', { class: 'u-small u-muted' }, 'Mode Lansia: teks 125%, tanpa timer, dua pilihan per layar. Mode Sekolah membuka paket 45 menit dan lembar guru.'),
    h('div', { class: 'u-row u-mt-3' },
      h('a', { class: 'c-btn c-btn--ghost c-btn--sm', href: '#/sekolah' }, 'Buka Mode Sekolah'),
    ),
  );

  const feedback = h('section', { class: 'c-card' },
    h('h2', { class: 'section-title' }, 'Umpan balik & bantuan'),
    row('Efek suara', 'Bunyi pendek saat mengetuk dan menyelesaikan langkah.', toggleSwitch('settings.sfx', 'Efek suara')),
    row('Getaran', 'Hanya di perangkat yang mendukung.', toggleSwitch('settings.haptics', 'Getaran')),
    row('Petunjuk Kenji', 'Pengingat sebelum aksi kritis, muncul sekali per skenario.', toggleSwitch('settings.kenjiTips', 'Petunjuk Kenji')),
  );

  const schedule = h('section', { class: 'c-card' },
    h('h2', { class: 'section-title' }, 'Jadwal latihan'),
    row('Pengingat ulang', 'Tampil di beranda saat aplikasi dibuka setelah jeda latihan. Tidak mengirim notifikasi keluar.', toggleSwitch('settings.reminder.enabled', 'Pengingat latihan', () => render(root))),
    row('Jarak ulang', 'Pilih seberapa sering kamu ingin diingatkan untuk mengulang.', seg([
      { value: 3, label: '3 hari' },
      { value: 7, label: '7 hari' },
      { value: 14, label: '14 hari' },
    ], reminder.intervalDays, (value) => {
      set('settings.reminder.intervalDays', Number(value));
      persist();
    }, { disabled: !reminder.enabled })),
    h('p', { class: 'u-small u-muted' }, 'Pengingat dihitung dari skenario terakhir yang selesai. Semua data tetap lokal; tidak ada push atau akun.'),
  );

  const codeBox = h('textarea', {
    class: 'c-code',
    readOnly: true,
    rows: '3',
    'data-sync-code': '1',
    placeholder: 'Tekan “Buat kode” untuk menampilkan kode progres.',
    'aria-label': 'Kode progres',
  });
  const importBox = h('textarea', {
    class: 'c-code',
    rows: '3',
    placeholder: 'Tempel kode SCR2.… di sini',
    'aria-label': 'Kode progres untuk diimpor',
  });

  const backups = getBackups();
  const recovery = h('section', { class: 'c-card' },
    h('h2', { class: 'section-title' }, 'Pemulihan data'),
    h('p', { class: 'u-small u-muted' }, 'Cadangan dibuat otomatis saat data lama rusak, dinormalkan, atau berasal dari versi yang lebih baru. Backup tidak dihapus saat restore.'),
    storageWriteProtected()
      ? h('p', { class: 'u-small u-muted' }, 'Penyimpanan utama dilindungi karena berisi skema yang lebih baru. Data asli tidak diubah; unduh backup untuk diamankan, atau pulihkan backup lama di bawah ini.')
      : null,
    backups.length
      ? h('div', { class: 'u-col', style: { gap: '8px' } }, backups.map((item, index) => h('div', {
        class: 'c-setting',
        'data-backup-index': String(index),
      },
      h('div', null,
        h('div', { class: 'c-setting__title' }, backupReason(item.reason)),
        h('div', { class: 'c-setting__sub' }, `${dateTimeID(item.savedAt)} · ${item.raw.length} karakter`),
      ),
      h('div', { class: 'u-row' },
        h('button', {
          type: 'button',
          class: 'c-btn c-btn--ghost c-btn--sm',
          'data-backup-download': String(index),
          onclick: () => downloadBackupPayload(item, index),
        }, 'Unduh JSON'),
        h('button', {
          type: 'button',
          class: 'c-btn c-btn--danger c-btn--sm',
          'data-backup-restore': String(index),
          onclick: async () => {
            const ok = await confirmModal({
              title: 'Pulihkan backup ini?',
              message: `Progres saat ini akan diganti oleh backup ${dateTimeID(item.savedAt)}. Backup tetap disimpan; tindakan ini tidak bisa dibatalkan.`,
              confirmLabel: 'Pulihkan',
              cancelLabel: 'Batal',
              danger: true,
            });
            if (!ok) return;
            try {
              restoreBackup(item);
              showToast('Backup berhasil dipulihkan. Memuat ulang…', { timeout: 3000 });
              setTimeout(() => window.location.reload(), 800);
            } catch (err) {
              showToast(err?.message || 'Backup tidak dapat dipulihkan.', { timeout: 5000 });
            }
          },
        }, 'Pulihkan'),
      ),
    )))
      : h('p', { class: 'u-small u-faint' }, 'Belum ada backup otomatis di perangkat ini.'),
  );

  const backup = h('section', { class: 'c-card' },
    h('h2', { class: 'section-title' }, 'Cadangan progres'),
    h('p', { class: 'u-small u-muted' }, 'Kode SCR2 berisi seluruh progres dan metadata ekspor. Simpan di tempat aman; siapa pun yang memilikinya bisa memakainya. Tidak dikirim ke mana pun.'),
    h('div', { class: 'u-row u-mt-3' },
      h('button', {
        type: 'button',
        class: 'c-btn c-btn--primary c-btn--sm',
        onclick: async () => {
          codeBox.value = exportCode();
          try {
            await navigator.clipboard.writeText(codeBox.value);
            showToast('Kode progres disalin.', { timeout: 2500 });
          } catch {
            codeBox.focus();
            codeBox.select();
            showToast('Kode dibuat. Salin manual dari kotak.', { timeout: 3000 });
          }
        },
      }, 'Buat & salin kode'),
      h('button', {
        type: 'button',
        class: 'c-btn c-btn--ghost c-btn--sm',
        onclick: () => {
          if (!codeBox.value) codeBox.value = exportCode();
          codeBox.focus();
          codeBox.select();
        },
      }, 'Tampilkan kode'),
    ),
    codeBox,
    h('h3', { class: 'u-mt-4', style: { fontSize: 'var(--s-fs-500)' } }, 'Pulihkan dari kode'),
    importBox,
    h('div', { class: 'u-row u-mt-3' },
      h('button', {
        type: 'button',
        class: 'c-btn c-btn--danger c-btn--sm',
        onclick: async () => {
          const ok = await confirmModal({
            title: 'Timpa progres dengan kode ini?',
            message: 'Progres saat ini akan diganti seluruhnya oleh isi kode. Tindakan ini tidak bisa dibatalkan.',
            confirmLabel: 'Impor & timpa',
            cancelLabel: 'Batal',
            danger: true,
          });
          if (!ok) return;
          try {
            importCode(importBox.value);
            showToast('Progres berhasil dipulihkan. Memuat ulang…', { timeout: 3000 });
            setTimeout(() => window.location.reload(), 800);
          } catch (err) {
            showToast(err?.message || 'Kode tidak valid.', { timeout: 4000 });
          }
        },
      }, 'Impor kode'),
      h('button', {
        type: 'button',
        class: 'c-btn c-btn--ghost c-btn--sm',
        'data-sync-merge': '1',
        onclick: async () => {
          const ok = await confirmModal({
            title: 'Gabungkan kode ini?',
            message: 'Progres lokal dan progres dari kode akan digabung. Skenario dan ScamDEX yang sudah selesai tidak hilang; saldo dan pengaturan lokal dipertahankan.',
            confirmLabel: 'Gabungkan',
            cancelLabel: 'Batal',
            danger: false,
          });
          if (!ok) return;
          try {
            importCode(importBox.value, { merge: true });
            showToast('Progres digabung. Memuat ulang…', { timeout: 3000 });
            setTimeout(() => window.location.reload(), 800);
          } catch (err) {
            showToast(err?.message || 'Kode tidak valid.', { timeout: 4000 });
          }
        },
      }, 'Gabungkan kode'),
    ),
    h('p', { class: 'u-small u-faint u-mt-2' }, storageOk()
      ? 'Penyimpanan lokal aktif. Data hanya ada di perangkat ini.'
      : 'Penyimpanan diblokir (mode privat?). Progres tidak akan bertahan setelah tab ditutup.'),
  );

  const about = h('section', { class: 'c-card' },
    h('h2', { class: 'section-title' }, 'Tentang data & privasi'),
    h('ul', { class: 'c-dex-list' },
      h('li', null, 'Tidak ada akun, server, cookie, atau analitik pihak ketiga.'),
      h('li', null, 'Semua nama, nomor, rekening, dan aplikasi dalam simulasi adalah fiktif.'),
      h('li', null, 'Sertifikat adalah bukti edukasi komunitas, bukan sertifikasi resmi pemerintah.'),
      h('li', null, 'Font dan aset dimuat dari domain ini sendiri, sehingga bisa dipakai offline.'),
    ),
    h('p', { class: 'u-small u-muted u-mt-2' }, `Namespace penyimpanan: scamurai.v1 · Skema ${state.schemaVersion} · ${state.stats.scenariosCompleted} skenario selesai.`),
  );

  const danger = h('section', { class: 'c-card c-danger-zone' },
    h('h2', { class: 'section-title' }, 'Hapus data'),
    row('Reset progres', 'Menghapus skenario, ScamDEX, ujian, dan sertifikat. Pengaturan tetap.', h('button', {
      type: 'button',
      class: 'c-btn c-btn--danger c-btn--sm',
      onclick: async () => {
        const ok = await confirmModal({
          title: 'Reset semua progres?',
          message: 'Skenario, ScamDEX, saldo Dojo, ujian, dan sertifikat akan dihapus. Tindakan ini tidak bisa dibatalkan.',
          confirmLabel: 'Reset progres',
          cancelLabel: 'Batal',
          danger: true,
        });
        if (!ok) return;
        resetProgress();
        showToast('Progres direset. Memuat ulang…', { timeout: 3000 });
        setTimeout(() => window.location.reload(), 700);
      },
    }, 'Reset progres')),
    row('Hapus semua data', 'Termasuk pengaturan dan nama. Kembali seperti pertama kali membuka.', h('button', {
      type: 'button',
      class: 'c-btn c-btn--danger c-btn--sm',
      onclick: async () => {
        const ok = await confirmModal({
          title: 'Hapus seluruh data Scamurai?',
          message: 'Semua progres, pengaturan, dan nama di perangkat ini akan dihapus permanen. Tidak ada salinan di server.',
          confirmLabel: 'Hapus semua',
          cancelLabel: 'Batal',
          danger: true,
        });
        if (!ok) return;
        resetAll();
        showToast('Semua data dihapus. Memuat ulang…', { timeout: 3000 });
        setTimeout(() => window.location.reload(), 700);
      },
    }, 'Hapus semua')),
  );

  root.append(h('div', { class: 'scr-settings' },
    h('div', { class: 'scr-head' },
      h('p', { class: 'scr-head__eyebrow' }, 'Pengaturan'),
      h('h1', null, 'Atur dojo sesuai caramu'),
      h('p', null, 'Semua perubahan tersimpan di perangkat ini saja. Tidak ada yang dikirim ke server.'),
    ),
    appearance,
    rhythm,
    mode,
    feedback,
    schedule,
    recovery,
    backup,
    about,
    danger,
    h('div', { class: 'c-brief-actions' },
      h('a', { class: 'c-btn c-btn--ghost', href: '#/bantuan' }, 'Pusat Bantuan'),
      h('a', { class: 'c-btn c-btn--quiet', href: '#/' }, 'Kembali ke beranda'),
    ),
  ));
}
