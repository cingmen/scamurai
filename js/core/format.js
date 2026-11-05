// Utilitas format & angka.
const rupiahFmt = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function rupiah(value) {
  return rupiahFmt.format(Number(value) || 0);
}

export function rupiahShort(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')} jt`;
  if (Math.abs(n) >= 1_000) return `Rp ${Math.round(n / 1_000)} rb`;
  return rupiah(n);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function timeNow() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function dateID(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function dateTimeID(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isoNow() {
  return new Date().toISOString();
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/** Fisher–Yates; mengembalikan array baru. */
export function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** FNV-1a 32-bit → string heksadesimal. */
export function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function certCode(name, isoDate, score) {
  const hash = fnv1a(`${name}|${isoDate}|${score}|scamurai`);
  const year = new Date(isoDate).getFullYear();
  return `SCM-${hash.toString(16).toUpperCase().padStart(8, '0').slice(0, 4)}-${year}`;
}

export function plural(n, singular, pluralForm = `${singular}-${singular}`) {
  return n === 1 ? singular : pluralForm;
}
