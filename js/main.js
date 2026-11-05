// Bootstrap aplikasi (structure.md §2).
import { get, all, beltInfo, set, getSwAck, swAck, persist } from './core/store.js';
import { on } from './core/events.js';
import { startRouter } from './router.js';
import { showToast } from './components/toast.js';
import { unlockAudio } from './core/sfx.js';
import { rupiah } from './core/format.js';

const root = document.documentElement;

function enforceMode(settings) {
  if (settings.mode === 'lansia') {
    return { theme: 'washi', fontScale: 'elder', kenjiTips: true, rhythm: 'santai' };
  }
  return {
    theme: settings.theme,
    fontScale: settings.fontScale,
    kenjiTips: settings.kenjiTips,
    rhythm: get('profile.rhythm', 'normal'),
  };
}

function applyAppearance() {
  const settings = all().settings;
  const eff = enforceMode(settings);
  root.dataset.theme = eff.theme;
  root.dataset.fontscale = eff.fontScale;
  root.dataset.mode = settings.mode;
  document.body.dataset.mode = settings.mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', eff.theme === 'washi' ? '#F6F2E8' : '#17141B');
}

function updateHeader() {
  const saldoEl = document.getElementById('header-saldo');
  const beltEl = document.getElementById('header-belt');
  if (saldoEl) saldoEl.textContent = rupiah(get('dojo.saldo', 0));
  if (beltEl) {
    const info = beltInfo();
    beltEl.textContent = `Sabuk ${info.name}`;
    beltEl.style.background = info.color;
    beltEl.style.color = info.ink;
  }
}

function initAudioUnlock() {
  const unlock = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            const version = `v1.0.${Date.now()}`;
            if (getSwAck() === version) return;
            showToast('Versi baru tersedia.', {
              actionLabel: 'Muat ulang',
              timeout: 12000,
              onAction: () => {
                swAck(version);
                window.location.reload();
              },
            });
          }
        });
      });
    } catch (err) {
      console.warn('[sw] registrasi gagal:', err);
    }
  });
}

async function maybeOnboard() {
  if (get('profile.onboarded', false)) return;
  try {
    const { showOnboarding } = await import('./components/onboarding.js');
    await showOnboarding();
  } catch (err) {
    console.warn('[onboarding] dilewati:', err);
    set('profile.onboarded', true);
  }
}

async function boot() {
  applyAppearance();
  updateHeader();
  initAudioUnlock();
  initServiceWorker();

  on('state:change', (payload) => {
    if (!payload?.path || payload.path.startsWith('settings.') || payload.path.startsWith('profile.')) {
      applyAppearance();
    }
    updateHeader();
  });

  on('storage:blocked', () => {
    showToast('Progres tidak akan tersimpan di browser ini (mode privat?).', { timeout: 6000 });
  });

  on('data:error', () => {
    showToast('Data gagal dimuat. Periksa koneksi lalu coba lagi.', { timeout: 4000 });
  });

  await startRouter();
  document.body.classList.add('is-booted');
  await maybeOnboard();

  window.addEventListener('pagehide', persist);
}

boot().catch((err) => {
  console.error('[main] fatal:', err);
  const app = document.getElementById('app');
  if (app) {
    app.textContent = 'Scamurai gagal dimuat. Muat ulang halaman atau buka Pusat Bantuan.';
  }
});
