#!/usr/bin/env node
// Verifikasi PWA tanpa dependensi: ukur metrik navigasi nyata, lalu matikan
// jaringan lewat CDP dan pastikan shell, rute inti, serta data tetap terbuka
// dari service worker.
//
// Pemakaian:
//   node scripts/verify-pwa.mjs [url] [scenario-id]
//   CHROME_PATH="/path/to/chrome" node scripts/verify-pwa.mjs https://cingmen.github.io/scamurai/
//
// Chrome dijalankan dengan profil sementara, jadi cache pengguna tidak tersentuh.

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PAGE_URL = process.argv[2] || 'http://localhost:4173/';
const SCENARIO_ID = process.argv[3] || 'bank-otp';
const CHROME_PATH = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SETTLE_MS = 1800;
const TIMEOUT_MS = 60_000;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.waiters = new Set();
    ws.addEventListener('message', (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, timer } = this.pending.get(msg.id);
        clearTimeout(timer);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else resolve(msg.result);
        return;
      }
      if (!msg.method) return;
      for (const waiter of [...this.waiters]) {
        if (waiter.method !== msg.method) continue;
        if (waiter.sessionId && waiter.sessionId !== msg.sessionId) continue;
        if (!waiter.predicate(msg.params)) continue;
        clearTimeout(waiter.timer);
        this.waiters.delete(waiter);
        waiter.resolve(msg.params);
      }
    });
  }

  send(method, params = {}, sessionId = undefined) {
    const id = ++this.nextId;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify(payload));
    });
  }

  wait(method, { sessionId, predicate = () => true, timeout = TIMEOUT_MS } = {}) {
    return new Promise((resolve, reject) => {
      const waiter = { method, sessionId, predicate, resolve, reject };
      waiter.timer = setTimeout(() => {
        this.waiters.delete(waiter);
        reject(new Error(`CDP event timeout: ${method}`));
      }, timeout);
      this.waiters.add(waiter);
    });
  }

  close() {
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(new Error('CDP ditutup'));
    }
    this.pending.clear();
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('CDP ditutup'));
    }
    this.waiters.clear();
    this.ws.close();
  }
}

async function launchChrome() {
  const profile = await mkdtemp(join(tmpdir(), 'scamurai-pwa-'));
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  chrome.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-6000); });

  const activePort = join(profile, 'DevToolsActivePort');
  let contents = null;
  for (let i = 0; i < 150; i += 1) {
    try {
      contents = await readFile(activePort, 'utf8');
      break;
    } catch {
      if (chrome.exitCode !== null) break;
      await sleep(100);
    }
  }
  if (!contents) {
    chrome.kill('SIGKILL');
    await rm(profile, { recursive: true, force: true });
    throw new Error(`Chrome gagal membuka port debug.\n${stderr}`);
  }

  const [port, path] = contents.trim().split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('WebSocket CDP gagal terhubung')), { once: true });
  });

  return {
    cdp: new Cdp(ws),
    chrome,
    profile,
    async dispose() {
      try { ws.close(); } catch { /* abaikan */ }
      if (chrome.exitCode === null) chrome.kill('SIGKILL');
      await sleep(200);
      await rm(profile, { recursive: true, force: true });
    },
  };
}

async function main() {
  const { cdp, dispose } = await launchChrome();
  const consoleErrors = [];
  const pageFailures = [];

  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const session = { sessionId };

    await Promise.all([
      cdp.send('Page.enable', {}, sessionId),
      cdp.send('Runtime.enable', {}, sessionId),
      cdp.send('Network.enable', {}, sessionId),
    ]);

    cdp.waiters.add({
      method: 'Runtime.consoleAPICalled',
      sessionId,
      predicate: (params) => params.type === 'error',
      resolve: (params) => {
        consoleErrors.push((params.args || []).map((arg) => arg.value || arg.description || '').join(' '));
      },
      reject: () => {},
      timer: null,
    });
    cdp.waiters.add({
      method: 'Runtime.exceptionThrown',
      sessionId,
      predicate: () => true,
      resolve: (params) => {
        consoleErrors.push(params.exceptionDetails?.exception?.description
          || params.exceptionDetails?.text || 'Uncaught exception');
      },
      reject: () => {},
      timer: null,
    });
    cdp.waiters.add({
      method: 'Network.loadingFailed',
      sessionId,
      predicate: () => true,
      resolve: (params) => {
        if (!params.canceled) pageFailures.push(params.errorText || 'loadingFailed');
      },
      reject: () => {},
      timer: null,
    });

    // Lewati onboarding dan pasang observer LCP/CLS sebelum skrip aplikasi.
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        try {
          const key = 'scamurai.v1';
          const saved = JSON.parse(localStorage.getItem(key) || '{}');
          saved.schemaVersion = 1;
          saved.profile = { ...(saved.profile || {}), onboarded: true, rhythm: 'normal' };
          saved.progress = {
            ...(saved.progress || {}),
            'task-scam': { ...(saved.progress?.['task-scam'] || {}), status: 'selesai', debriefDone: true, updatedAt: '2026-10-01T00:00:00.000Z' },
            'bank-otp': { ...(saved.progress?.['bank-otp'] || {}), status: 'selesai', debriefDone: true, updatedAt: '2026-10-02T00:00:00.000Z' },
            'marketplace': { ...(saved.progress?.['marketplace'] || {}), status: 'selesai', debriefDone: true, updatedAt: '2026-10-03T00:00:00.000Z' },
            'phishing': { ...(saved.progress?.['phishing'] || {}), status: 'selesai', debriefDone: true, updatedAt: '2026-10-04T00:00:00.000Z' },
          };
          localStorage.setItem(key, JSON.stringify(saved));
        } catch {}
        window.__scamuraiPerf = { lcp: 0, cls: 0 };
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) window.__scamuraiPerf.lcp = entry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) window.__scamuraiPerf.cls += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
        } catch {}
      `,
    }, sessionId);

    const evalValue = async (expression) => {
      const result = await cdp.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      }, sessionId);
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description
          || result.exceptionDetails.text || 'Runtime.evaluate gagal');
      }
      return result.result.value;
    };

    const waitFor = async (expression, predicate, label, timeout = TIMEOUT_MS) => {
      const deadline = Date.now() + timeout;
      let last;
      while (Date.now() < deadline) {
        last = await evalValue(expression).catch(() => undefined);
        if (predicate(last)) return last;
        await sleep(150);
      }
      throw new Error(`Timeout menunggu ${label}; nilai terakhir: ${JSON.stringify(last)}`);
    };

    const loadPage = async (url, reload = false) => {
      const loaded = cdp.wait('Page.loadEventFired', session);
      if (reload) await cdp.send('Page.reload', { ignoreCache: false }, sessionId);
      else await cdp.send('Page.navigate', { url }, sessionId);
      await loaded;
      await waitFor(
        `document.querySelector('#app h1')?.textContent?.trim() || ''`,
        (value) => Boolean(value),
        'heading aplikasi',
      );
      await waitFor(
        `Boolean(document.body.classList.contains('is-booted'))`,
        Boolean,
        'boot aplikasi selesai',
      );
    };

    await loadPage(PAGE_URL);
    await evalValue(`(async () => {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 60000)),
      ]);
      return Boolean(registration.active);
    })()`);
    await waitFor(
      `Boolean(navigator.serviceWorker.controller)`,
      Boolean,
      'service worker mengendalikan halaman',
    );

    const cacheInfo = await waitFor(
      `(async () => {
        const rows = [];
        for (const name of await caches.keys()) {
          const cache = await caches.open(name);
          rows.push({ name, entries: (await cache.keys()).length });
        }
        return rows.sort((a, b) => b.entries - a.entries);
      })()`,
      (rows) => Array.isArray(rows) && rows[0]?.entries >= 90,
      'cache service worker terisi',
    );

    // Muat ulang dari cache agar metrik mewakili kunjungan PWA, bukan unduhan pertama.
    await loadPage(PAGE_URL, true);
    await sleep(SETTLE_MS);

    const perf = await evalValue(`(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const resources = performance.getEntriesByType('resource');
      const transferred = resources.reduce((sum, entry) => sum + (entry.transferSize || 0), nav.transferSize || 0);
      return {
        ttfbMs: Math.round(nav.responseStart || 0),
        domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd || 0),
        loadMs: Math.round(nav.loadEventEnd || 0),
        lcpMs: Math.round(window.__scamuraiPerf?.lcp || 0),
        cls: Number((window.__scamuraiPerf?.cls || 0).toFixed(4)),
        transferKb: Math.round(transferred / 1024),
        resources: resources.length,
        jsHeapMb: performance.memory ? Number((performance.memory.usedJSHeapSize / 1048576).toFixed(1)) : null,
      };
    })()`);

    const onlineErrors = [...consoleErrors];
    if (onlineErrors.length) {
      throw new Error(`Error console saat online:\n${onlineErrors.join('\n')}`);
    }

    const scenarioTitle = await evalValue(`fetch('./data/scenarios/${SCENARIO_ID}.json')
      .then((response) => response.json())
      .then((body) => body.title)`);

    await cdp.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    }, sessionId);

    // navigator.onLine tidak selalu berubah di Chrome headless. Bukti yang
    // menentukan: permintaan lintas-origin harus gagal, sedangkan aset lokal
    // tetap tersedia lewat service worker.
    const networkBlocked = await evalValue(`fetch('https://example.com/favicon.ico', {
      mode: 'no-cors', cache: 'no-store'
    }).then(() => false).catch(() => true)`);

    await loadPage(PAGE_URL, true);
    const offlineShell = await evalValue(`({
      onLine: navigator.onLine,
      controlled: Boolean(navigator.serviceWorker.controller),
      title: document.title,
      heading: document.querySelector('#app h1')?.textContent?.trim() || '',
      background: getComputedStyle(document.body).backgroundColor,
    })`);

    await evalValue(`location.hash = '#/skenario/${SCENARIO_ID}'`);
    const scenario = await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes(scenarioTitle),
      `layar pengantar skenario offline (${scenarioTitle})`,
    );

    await evalValue(`location.hash = '#/bantuan'`);
    const help = await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('JIKA INI SEDANG TERJADI') && text.includes('Hubungi bank sekarang'),
      'Pusat Bantuan offline',
    );

    await evalValue(`location.hash = '#/latihan'`);
    const latihan = await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('Latihan kilat di PhisQuest') && text.includes('40 skenario pesan'),
      'kartu integrasi PhisQuest offline',
    );
    const latihanHref = await evalValue(`document.querySelector('[data-phisquest-link]')?.getAttribute('href') || ''`);

    await evalValue(`location.hash = '#/sekolah/ujian'`);
    const schoolQuizIntro = await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('Kuis kelas') && text.includes('10 soal'),
      'pengantar kuis kelas 10 soal offline',
    );
    const startedQuiz = await evalValue(`(() => {
      const button = [...document.querySelectorAll('#app button')]
        .find((node) => node.textContent.trim() === 'Mulai kuis');
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!startedQuiz) throw new Error('Tombol Mulai kuis tidak ditemukan.');
    const schoolQuiz = await waitFor(
      `(() => ({
        text: document.querySelector('#app')?.innerText || '',
        question: document.querySelector('.c-exam-q')?.textContent?.trim() || '',
        timer: Boolean(document.querySelector('.c-exam-timer')),
      }))()`,
      (value) => Boolean(value?.question)
        && value.text.toLowerCase().includes('kuis kelas')
        && value.timer === false,
      'soal pertama kuis kelas tanpa timer',
    );

    await evalValue(`location.hash = '#/sertifikat'`);
    const certificateRejected = await waitFor(
      `({ hash: location.hash, text: document.querySelector('#app')?.innerText || '' })`,
      (value) => value.hash === '#/ujian' && value.text.toLowerCase().includes('ujian akhir'),
      'sertifikat ditolak sebelum lulus',
    );

    await evalValue(`location.hash = '#/ujian'`);
    const finalExamIntro = await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.toLowerCase().includes('ujian akhir') && text.includes('20 soal'),
      'pengantar ujian akhir 20 soal',
    );
    const startedFinalExam = await evalValue(`(() => {
      const button = [...document.querySelectorAll('#app button')]
        .find((node) => node.textContent.trim() === 'Mulai ujian');
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!startedFinalExam) throw new Error('Tombol Mulai ujian tidak ditemukan.');
    const finalExamRun = await evalValue(`(async () => {
      const norm = (text) => String(text || '').trim();
      const data = await fetch('./data/exam/final-exam.json').then((response) => response.json());
      for (let i = 0; i < 20; i += 1) {
        const prompt = norm(document.querySelector('.c-exam-q')?.textContent);
        const question = data.questions.find((item) => norm(item.prompt) === prompt);
        if (!question) throw new Error('Soal ujian tidak cocok dengan data: ' + prompt);
        if (question.type === 'pilihan') {
          const options = [...document.querySelectorAll('.c-exam-option')];
          options[question.answer]?.click();
        } else if (question.type === 'urutan') {
          for (const item of question.items) {
            const pool = [...document.querySelectorAll('.c-exam-option')];
            const label = (node) => {
              const text = norm(node.textContent);
              return text.startsWith('+') ? text.slice(1).trim() : text;
            };
            const button = pool.find((node) => label(node) === norm(item));
            if (!button) throw new Error('Item urutan tidak ditemukan: ' + item);
            button.click();
          }
        } else {
          const spots = [...document.querySelectorAll('.c-exam-hotspot-area')];
          const correct = question.hotspots.findIndex((spot) => spot.correct);
          spots[correct]?.click();
        }
        const next = [...document.querySelectorAll('#app button')]
          .find((node) => /^(Lanjut|Selesai & nilai)$/.test(norm(node.textContent)));
        if (!next) throw new Error('Tombol lanjut ujian tidak ditemukan. q=' + prompt + ' buttons=' + [...document.querySelectorAll('#app button')].map((node) => norm(node.textContent)).join('|'));
        next.click();
      }
      return {
        score: document.querySelector('.c-exam-result__score')?.textContent?.trim() || '',
        result: document.querySelector('.c-exam-result')?.innerText || '',
      };
    })()`);
    await waitFor(
      `document.querySelector('.c-exam-result__score')?.textContent?.trim() || ''`,
      (value) => value === '100',
      'skor ujian 100 setelah 20 jawaban',
    );
    await evalValue(`new Promise((resolve) => setTimeout(resolve, 400))`);
    const finalExamState = await evalValue(`JSON.parse(localStorage.getItem('scamurai.v1') || '{}').exam || {}`);

    await evalValue(`location.hash = '#/sertifikat'`);
    const certificateRoute = await waitFor(
      `(() => ({
        hash: location.hash,
        heading: document.querySelector('#app h1')?.textContent?.trim() || '',
        canvas: Boolean(document.querySelector('.c-cert-preview canvas')),
        width: document.querySelector('.c-cert-preview canvas')?.width || 0,
        height: document.querySelector('.c-cert-preview canvas')?.height || 0,
      }))()`,
      (value) => value.hash === '#/sertifikat'
        && value.canvas
        && value.width === 1200
        && value.height === 850,
      'sertifikat setelah lulus',
    );
    const certificateAction = await evalValue(`(async () => {
      const input = document.querySelector('#cert-name');
      if (!input) return { clicked: false, code: '' };
      input.value = 'Rani Uji';
      const button = [...document.querySelectorAll('#app button')]
        .find((node) => node.textContent.trim() === 'Unduh PNG');
      if (!button) return { clicked: false, code: '' };
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 700));
      return {
        clicked: true,
        code: document.querySelector('.c-cert-meta .u-mono')?.textContent?.trim() || '',
      };
    })()`);
    const certificateState = await evalValue(`JSON.parse(localStorage.getItem('scamurai.v1') || '{}').certificate || {}`);

    await evalValue(`location.hash = '#/pengaturan'`);
    await waitFor(
      `Boolean(document.querySelector('button[aria-label="Pengingat latihan"]'))`,
      Boolean,
      'pengaturan pengingat latihan',
    );
    await evalValue(`document.querySelector('button[aria-label="Pengingat latihan"]').click()`);
    await waitFor(
      `document.querySelector('button[aria-label="Pengingat latihan"]')?.getAttribute('aria-pressed') === 'true'`,
      Boolean,
      'pengingat latihan aktif',
    );
    await evalValue(`(() => {
      const button = [...document.querySelectorAll('#app button')]
        .find((node) => node.textContent.trim() === '3 hari');
      button?.click();
      return Boolean(button);
    })()`);
    await evalValue(`new Promise((resolve) => setTimeout(resolve, 400))`);
    const reminderSettings = await evalValue(`JSON.parse(localStorage.getItem('scamurai.v1') || '{}').settings?.reminder || {}`);
    await evalValue(`location.hash = '#/'`);
    const practiceReminder = await waitFor(
      `(() => {
        const card = document.querySelector('[data-practice-reminder]');
        return {
          found: Boolean(card),
          scenario: card?.getAttribute('data-practice-reminder') || '',
          href: card?.querySelector('a')?.getAttribute('href') || '',
          text: card?.innerText || '',
        };
      })()`,
      (value) => value?.found === true
        && value.scenario.length > 0
        && value.href.startsWith('#/skenario/'),
      'kartu pengingat latihan di beranda',
    );

    await evalValue(`location.hash = '#/skenario/tiket-konser'`);
    const newScenarioIntro = await waitFor(
      `(() => ({
        hash: location.hash,
        title: document.querySelector('#app h1')?.textContent?.trim() || '',
        cover: document.querySelector('#app img')?.getAttribute('src') || '',
        text: document.querySelector('#app')?.innerText || '',
      }))()`,
      (value) => value?.hash === '#/skenario/tiket-konser'
        && value.title.includes('Tiket yang Tak Pernah Ada')
        && value.cover.includes('tiket-konser.svg'),
      'pengantar skenario tiket konser',
    );
    const startedNewScenario = await evalValue(`(() => {
      const button = [...document.querySelectorAll('#app button')]
        .find((node) => node.textContent.trim() === 'Mulai simulasi');
      if (!button) return false;
      button.click();
      return true;
    })()`);
    const newScenarioFirstStep = await waitFor(
      `({ hash: location.hash, text: document.querySelector('#app')?.innerText || '' })`,
      (value) => value?.hash === '#/main/tiket-konser' && value.text.includes('Sabtu, 19.04'),
      'langkah pertama skenario tiket konser',
    );
    const clickNewScenarioButton = async (needle, label) => {
      const clicked = await evalValue(`(() => {
        const button = [...document.querySelectorAll('#app button')]
          .find((node) => node.textContent.includes(${JSON.stringify(needle)}));
        if (!button) return false;
        button.click();
        return true;
      })()`);
      if (!clicked) throw new Error(`Tombol ${label} tidak ditemukan.`);
    };
    await waitFor(
      `document.querySelector('.c-lesson')?.innerText || ''`,
      (text) => text.includes('Tiket resmi selalu bisa dilacak'),
      'pelajaran tiket konser',
    );
    await clickNewScenarioButton('Mengerti', 'pelajaran tiket');
    await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('Rani_Tiket') && text.includes('Rp 750.000'),
      'tawaran tiket konser',
    );
    await clickNewScenarioButton('Lanjut', 'chat tiket');
    await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('Periksa tawaran ini'),
      'red flag tiket konser',
    );
    await clickNewScenarioButton('Lanjut', 'red flag tiket');
    await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('Rani menunggu jawabanmu'),
      'pilihan tiket konser',
    );
    await clickNewScenarioButton('Minta e-tiket', 'pilihan cek tiket');
    await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('link e-tiket'),
      'chat link e-tiket',
    );
    await clickNewScenarioButton('Lanjut', 'chat link e-tiket');
    await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('TixKita') && text.includes('CVV'),
      'halaman e-tiket palsu',
    );
    await clickNewScenarioButton('Isi data dan bayar', 'halaman e-tiket');
    await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('Halaman meminta data kartu'),
      'pilihan e-tiket',
    );
    await clickNewScenarioButton('Tutup halaman', 'pilihan tutup e-tiket');
    const newScenarioEnding = await waitFor(
      `document.querySelector('.c-ending')?.innerText || ''`,
      (text) => text.includes('Kamu memilih jalur resmi'),
      'ending aman tiket konser',
    );

    await evalValue(`location.hash = '#/skenario/qris-palsu'`);
    const qrisIntro = await waitFor(
      `(() => ({
        hash: location.hash,
        title: document.querySelector('#app h1')?.textContent?.trim() || '',
        cover: document.querySelector('#app img')?.getAttribute('src') || '',
      }))()`,
      (value) => value?.hash === '#/skenario/qris-palsu'
        && value.title.includes('QRIS yang Berpindah Tangan')
        && value.cover.includes('qris-palsu.svg'),
      'pengantar QRIS palsu',
    );
    const startedQris = await evalValue(`(() => {
      const button = [...document.querySelectorAll('#app button')]
        .find((node) => node.textContent.trim() === 'Mulai simulasi');
      if (!button) return false;
      button.click();
      return true;
    })()`);
    await waitFor(
      `document.querySelector('.c-lesson')?.innerText || ''`,
      (text) => text.includes('QRIS punya nama merchant'),
      'pelajaran QRIS',
    );
    await clickNewScenarioButton('Mengerti', 'pelajaran QRIS');
    await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('Dapur Bu Rani') && text.includes('Rp 350.000'),
      'tawaran QRIS',
    );
    await clickNewScenarioButton('Lanjut', 'chat QRIS');
    await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('Periksa pesan dan nama penerima'),
      'red flag QRIS',
    );
    await clickNewScenarioButton('Lanjut', 'red flag QRIS');
    await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('Dapur Bu Rani menunggu bukti transfer'),
      'pilihan QRIS',
    );
    await clickNewScenarioButton('Minta QRIS atas nama toko', 'pilihan cek QRIS');
    await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('QRIS tadi salah'),
      'chat konfirmasi QRIS',
    );
    await clickNewScenarioButton('Lanjut', 'chat konfirmasi QRIS');
    await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('QRIS DapurPay') && text.includes('PIN'),
      'halaman konfirmasi QRIS',
    );
    await clickNewScenarioButton('Konfirmasi pembayaran', 'halaman QRIS');
    await waitFor(
      `document.querySelector('#app')?.innerText || ''`,
      (text) => text.includes('Halaman meminta PIN dan OTP'),
      'pilihan konfirmasi QRIS',
    );
    await clickNewScenarioButton('Tutup halaman dan cek pembayaran', 'pilihan tutup QRIS');
    const qrisEnding = await waitFor(
      `document.querySelector('.c-ending')?.innerText || ''`,
      (text) => text.includes('Kamu memeriksa merchant'),
      'ending aman QRIS',
    );

    const offlineData = await evalValue(`(async () => {
      const response = await fetch('./data/scenarios/${SCENARIO_ID}.json');
      const body = await response.json();
      const css = await fetch('./assets/css/base.css');
      return {
        status: response.status,
        steps: body.steps?.length || 0,
        title: body.title || '',
        cssStatus: css.status,
      };
    })()`);

    const pass = networkBlocked === true
      && offlineShell.controlled
      && offlineShell.heading.length > 0
      && scenario.length > 0
      && help.length > 0
      && latihan.length > 0
      && latihanHref === 'https://cingmen.github.io/phisquest'
      && schoolQuizIntro.length > 0
      && schoolQuiz.question.length > 0
      && schoolQuiz.timer === false
      && finalExamIntro.length > 0
      && finalExamRun.score === '100'
      && finalExamState.passed === true
      && finalExamState.best === 100
      && certificateRejected.hash === '#/ujian'
      && certificateRoute.width === 1200
      && certificateRoute.height === 850
      && certificateAction.clicked === true
      && certificateAction.code.startsWith('SCM-')
      && certificateState.name === 'Rani Uji'
      && certificateState.score === 100
      && certificateState.code === certificateAction.code
      && reminderSettings.enabled === true
      && reminderSettings.intervalDays === 3
      && practiceReminder.found === true
      && practiceReminder.href.includes(practiceReminder.scenario)
      && newScenarioIntro.title.includes('Tiket yang Tak Pernah Ada')
      && startedNewScenario === true
      && newScenarioFirstStep.hash === '#/main/tiket-konser'
      && newScenarioEnding.includes('Kamu memilih jalur resmi')
      && qrisIntro.title.includes('QRIS yang Berpindah Tangan')
      && startedQris === true
      && qrisEnding.includes('Kamu memeriksa merchant')
      && offlineData.status === 200
      && offlineData.cssStatus === 200
      && offlineData.steps >= 14;

    const report = {
      url: PAGE_URL,
      cache: cacheInfo[0],
      perf,
      offline: {
        ...offlineShell,
        networkBlocked,
        scenarioTitle,
        scenarioHeadingFound: scenario.includes(scenarioTitle),
        helpFound: help.length > 0,
        latihanFound: latihan.includes('Latihan kilat di PhisQuest'),
        latihanHref,
        schoolQuizFound: schoolQuizIntro.includes('Kuis kelas') && schoolQuizIntro.includes('10 soal'),
        schoolQuizQuestionFound: schoolQuiz.question.length > 0,
        schoolQuizTimer: schoolQuiz.timer,
        finalExamFound: finalExamIntro.toLowerCase().includes('ujian akhir') && finalExamIntro.includes('20 soal'),
        finalExamScore: finalExamRun.score,
        finalExamPassed: finalExamState.passed === true,
        finalExamBest: finalExamState.best,
        certificateRejected: certificateRejected.hash === '#/ujian',
        certificateCanvas: certificateRoute.canvas ? `${certificateRoute.width}x${certificateRoute.height}` : null,
        certificateIssued: certificateAction.clicked === true && certificateAction.code.startsWith('SCM-'),
        certificateState: { name: certificateState.name, score: certificateState.score, code: certificateState.code },
        reminderSettings,
        practiceReminder,
        newScenarioFound: newScenarioIntro.title.includes('Tiket yang Tak Pernah Ada'),
        newScenarioCover: newScenarioIntro.cover,
        newScenarioStarted: startedNewScenario === true,
        newScenarioFirstStep: newScenarioFirstStep.text.includes('Sabtu, 19.04'),
        newScenarioEnding: newScenarioEnding.includes('Kamu memilih jalur resmi'),
        qrisScenarioFound: qrisIntro.title.includes('QRIS yang Berpindah Tangan'),
        qrisScenarioStarted: startedQris === true,
        qrisScenarioEnding: qrisEnding.includes('Kamu memeriksa merchant'),
        data: offlineData,
        networkFailures: pageFailures.length,
      },
      consoleErrors,
    };
    console.log(JSON.stringify(report, null, 2));

    if (!pass) throw new Error('Verifikasi offline gagal: shell, rute, data, atau aset tidak lengkap.');
    console.log(`\nPWA OK — ${PAGE_URL} memuat shell, skenario ${SCENARIO_ID} (${offlineData.steps} langkah), Pusat Bantuan, kartu PhisQuest, kuis kelas 10 soal, dan ujian akhir 20 soal saat offline.`);
  } finally {
    await dispose();
  }
}

main().catch((error) => {
  console.error(`\nGAGAL: ${error.message}`);
  process.exitCode = 1;
});
