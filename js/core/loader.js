// Loader JSON: cache memori → jaringan → cache Service Worker (app-logic.md §12).
import { emit } from './events.js';
import { ensureI18n, currentLocale, localize } from './i18n.js';

const memory = new Map();

export async function loadJSON(path) {
  const locale = await ensureI18n();
  const key = `${locale}:${path}`;
  if (memory.has(key)) return memory.get(key);

  const url = new URL(path, document.baseURI).href;

  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.json();
    const data = localize(raw);
    memory.set(key, data);
    return data;
  } catch (err) {
    if ('caches' in window) {
      try {
        const cached = await caches.match(url);
        if (cached) {
          const raw = await cached.json();
          const data = localize(raw);
          memory.set(key, data);
          return data;
        }
      } catch { /* lanjut ke error */ }
    }
    emit('data:error', { url, reason: err.message, locale: currentLocale() });
    const friendly = new Error('Data Scamurai gagal dimuat. Periksa koneksi lalu coba lagi.');
    friendly.cause = err;
    throw friendly;
  }
}

export function clearLoaderCache() {
  memory.clear();
}
