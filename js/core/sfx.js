// Pemutar SFX ringan. File audio opsional: bila tidak ada, gagal senyap.
import { get } from './store.js';

const sounds = {
  tap: './assets/audio/tap.wav',
  success: './assets/audio/success.wav',
  danger: './assets/audio/danger.wav',
  badge: './assets/audio/badge.wav',
};

const cache = new Map();
let unlocked = false;

function enabled() {
  return get('settings.sfx', true) !== false;
}

export function unlockAudio() {
  unlocked = true;
}

/** Mainkan SFX; diabaikan bila setting mati atau file tidak tersedia. */
export function sfx(name) {
  if (!enabled() || !sounds[name]) return;
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(sounds[name]);
    audio.preload = 'auto';
    audio.volume = 0.35;
    cache.set(name, audio);
  }
  try {
    audio.currentTime = 0;
    const promise = audio.play();
    promise?.catch(() => { /* autoplay diblokir — abaikan */ });
  } catch { /* abaikan */ }
}

export function sfxReady() {
  return unlocked;
}
