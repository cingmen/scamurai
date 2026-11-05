// Event bus aplikasi (app-logic.md §1, §14).
export const EVENTS = {
  sim: ['sim:start', 'sim:step', 'sim:choice', 'sim:flag', 'sim:end'],
  vn: ['vn:node', 'vn:choice', 'vn:chapter', 'vn:end'],
  wa: ['wa:message', 'wa:turn', 'wa:end'],
  app: ['route:change', 'state:change', 'data:error', 'update:available', 'storage:blocked'],
};

const listeners = new Map();

/** Daftarkan listener; mengembalikan fungsi untuk melepasnya. */
export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  return () => off(name, fn);
}

export function off(name, fn) {
  listeners.get(name)?.delete(fn);
}

/** Kirim event ke semua listener; error satu listener tidak menghentikan yang lain. */
export function emit(name, payload) {
  listeners.get(name)?.forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      console.error(`[events] listener ${name} gagal:`, err);
    }
  });
}
