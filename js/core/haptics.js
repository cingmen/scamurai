// Getaran perangkat (opsional, gagal senyap).
import { get } from './store.js';

export function haptic(pattern = 12) {
  if (get('settings.haptics', true) === false) return;
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch { /* abaikan */ }
}
