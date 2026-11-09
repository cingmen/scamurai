// Service Worker — offline penuh (app-logic.md §11).
// Naikkan CACHE_VERSION setiap rilis agar cache lama tergantikan.
const CACHE_VERSION = 'scamurai-v1.4.0';

const SHELL = [
  './',
  './index.html',
  './404.html',
  './manifest.webmanifest',
  './favicon.svg',
  './assets/fonts/fonts.css',
  './assets/fonts/PlusJakartaSans-400-latin.woff2',
  './assets/fonts/PlusJakartaSans-500-latin.woff2',
  './assets/fonts/PlusJakartaSans-700-latin.woff2',
  './assets/fonts/PlusJakartaSans-800-latin.woff2',
  './assets/fonts/JetBrainsMono-400-latin.woff2',
  './assets/fonts/JetBrainsMono-700-latin.woff2',
  './assets/css/tokens.css',
  './assets/css/base.css',
  './assets/css/components.css',
  './assets/css/screens/home.css',
  './assets/css/screens/sim.css',
  './assets/css/screens/vn.css',
  './assets/css/screens/minigame.css',
  './assets/css/screens/scamdex.css',
  './assets/css/screens/exam.css',
  './assets/css/screens/bantuan.css',
  './assets/css/screens/sekolah.css',
  './assets/img/mascot/kenji.svg',
  './assets/img/icons/icon-192.svg',
  './assets/img/icons/icon-512.svg',
  './assets/img/og-image.svg',
  './assets/img/scenarios/task-scam.svg',
  './assets/img/scenarios/bank-otp.svg',
  './assets/img/scenarios/pinjol.svg',
  './assets/img/scenarios/marketplace.svg',
  './assets/img/scenarios/kerja-luar-negeri.svg',
  './assets/img/scenarios/money-mule.svg',
  './assets/img/scenarios/love-scam.svg',
  './assets/img/scenarios/phishing.svg',
  './assets/img/scenarios/wa-grup.svg',
  './assets/audio/tap.wav',
  './assets/audio/success.wav',
  './assets/audio/danger.wav',
  './assets/audio/badge.wav',
  './data/manifest.json',
  './data/scamdex.json',
  './data/bantuan.json',
  './data/stats-sosial.json',
  './data/exam/final-exam.json',
  './data/minigames/wa-grup.json',
  './data/scenarios/task-scam.json',
  './data/scenarios/bank-otp.json',
  './data/scenarios/pinjol.json',
  './data/scenarios/marketplace.json',
  './data/scenarios/kerja-luar-negeri.json',
  './data/scenarios/money-mule.json',
  './data/scenarios/love-scam.json',
  './data/scenarios/phishing.json',
  './js/main.js',
  './js/router.js',
  './js/core/events.js',
  './js/core/store.js',
  './js/core/loader.js',
  './js/core/sfx.js',
  './js/core/haptics.js',
  './js/core/format.js',
  './js/core/dom.js',
  './js/core/progress.js',
  './js/engines/sim-engine.js',
  './js/engines/step-renderers.js',
  './js/engines/app-views.js',
  './js/engines/vn-engine.js',
  './js/engines/wa-engine.js',
  './js/screens/home.js',
  './js/screens/scenario-select.js',
  './js/screens/scenario-brief.js',
  './js/screens/sim-player.js',
  './js/screens/vn-player.js',
  './js/screens/minigame-wa.js',
  './js/screens/debrief.js',
  './js/screens/scamdex.js',
  './js/screens/exam.js',
  './js/screens/certificate.js',
  './js/screens/bantuan.js',
  './js/screens/about.js',
  './js/screens/settings.js',
  './js/screens/sekolah.js',
  './js/components/phone-frame.js',
  './js/components/statusbar.js',
  './js/components/chat-bubble.js',
  './js/components/choice-list.js',
  './js/components/flag-tap.js',
  './js/components/meter.js',
  './js/components/keypad.js',
  './js/components/modal.js',
  './js/components/toast.js',
  './js/components/progress.js',
  './js/components/badge-card.js',
  './js/components/timeline.js',
  './js/components/flow-diagram.js',
  './js/components/share.js',
  './js/components/onboarding.js',
  './js/components/scenario-card.js',
  './js/components/line-progress.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // Cache toleran: satu aset gagal tidak membatalkan instalasi.
    await Promise.allSettled(SHELL.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) await cache.put(url, response);
      } catch { /* aset opsional */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isData(url) {
  return url.pathname.includes('/data/');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/sw.js')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match('./index.html');
      if (cached) {
        // Segarkan index di latar belakang.
        event.waitUntil(fetch(request).then((res) => {
          if (res.ok) cache.put('./index.html', res.clone());
        }).catch(() => {}));
        return cached;
      }
      try {
        return await fetch(request);
      } catch {
        return (await cache.match('./404.html')) || Response.error();
      }
    })());
    return;
  }

  if (isData(url)) {
    // stale-while-revalidate
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request);
      const network = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => null);
      return cached || (await network) || new Response('{"error":"offline"}', {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    })());
    return;
  }

  // cache-first untuk aset
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    } catch {
      return new Response('', { status: 504 });
    }
  })());
});
