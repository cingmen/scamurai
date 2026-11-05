// Loader JSON: cache memori → jaringan → cache Service Worker (app-logic.md §12).
import { emit } from './events.js';

const memory = new Map();

export async function loadJSON(path) {
  if (memory.has(path)) return memory.get(path);
  const url = new URL(path, document.baseURI).href;

  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    memory.set(path, data);
    return data;
  } catch (err) {
    if ('caches' in window) {
      try {
        const cached = await caches.match(url);
        if (cached) {
          const data = await cached.json();
          memory.set(path, data);
          return data;
        }
      } catch { /* lanjut ke error */ }
    }
    emit('data:error', { url, reason: err.message });
    const friendly = new Error('Data Scamurai gagal dimuat. Periksa koneksi lalu coba lagi.');
    friendly.cause = err;
    throw friendly;
  }
}

export function clearLoaderCache() {
  memory.clear();
}
