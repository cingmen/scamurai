// Inti lokalisasi tanpa DOM/network agar bisa diuji di Node.
export const SUPPORTED_LOCALES = [
  { id: 'id', label: 'Indonesia', draft: false },
  { id: 'jv-ID', label: 'Jawa (draf)', draft: true },
  { id: 'en', label: 'English (draft)', draft: true },
];

export const DEFAULT_LOCALE = 'id';

export const TRANSLATABLE_SKIP_KEYS = new Set([
  'id', 'type', 'app', 'view', 'dir', 'from', 'flagId', 'refDex', 'dexCard',
  'dexVariant', 'href', 'icon', 'cover', 'src', 'code', 'namespace', 'status',
  'tone', 'format', 'version', 'class', 'key', 'path', 'target', 'rel', 'lang',
  'locale', 'speaker', 'effects', 'effect', 'amount', 'x', 'y', 'correct',
  'answer', 'goto', 'next', 'set', 'add', 'subtract', 'flag', 'flags', 'save',
  'slot', 'date', 'time', 'deadline', 'timer', 'duration', 'delayMs', 'auto',
  'autoAccept', 'secure', 'decoy', 'critical', 'head', 'variant', 'category',
  'rarity', 'unlock', 'order', 'role', 'disabled', 'readOnly', 'onAction',
  'scenarioId', 'daysSince', 'enabled', 'intervalDays', 'srcset', 'poster',
  'actor', 'endingId', 'to', 'fromNode', 'toNode',
]);

export function normalizeLocale(value) {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_LOCALE;
  const lowered = raw.toLowerCase().replace('_', '-');
  if (lowered === 'id' || lowered.startsWith('id-')) return 'id';
  if (lowered === 'jv' || lowered === 'jv-id' || lowered.startsWith('jv-')) return 'jv-ID';
  if (lowered === 'en' || lowered.startsWith('en-')) return 'en';
  return DEFAULT_LOCALE;
}

export function localeInfo(value) {
  const id = normalizeLocale(value);
  return SUPPORTED_LOCALES.find((item) => item.id === id) || SUPPORTED_LOCALES[0];
}

function own(map, key) {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/**
 * Translator katalog datar: kunci adalah teks Indonesia asli.
 * Kunci yang tidak ada kembali ke teks sumber (fallback id → key string).
 */
export function createTranslator(catalog) {
  const strings = catalog && typeof catalog.strings === 'object' && catalog.strings
    ? catalog.strings
    : {};
  const patterns = catalog && typeof catalog.patterns === 'object' && catalog.patterns
    ? catalog.patterns
    : {};

  function text(value) {
    if (typeof value !== 'string' || !value) return value;
    if (own(strings, value) && strings[value]) return strings[value];
    // Template: kunci memakai {0}, {1}, … untuk potongan dinamis.
    for (const [source, translated] of Object.entries(patterns)) {
      const names = [...source.matchAll(/\{(\d+)\}/g)].map((match) => match[1]);
      if (!names.length) continue;
      const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\{(\d+)\\\}/g, '(.+?)');
      const match = new RegExp(`^${escaped}$`).exec(value);
      if (!match) continue;
      return String(translated).replace(/\{(\d+)\}/g, (all, index) => match[Number(index) + 1] ?? all);
    }
    return value;
  }

  function deep(value, key = '') {
    if (typeof value === 'string') return text(value);
    if (Array.isArray(value)) return value.map((item) => deep(item));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [childKey, child] of Object.entries(value)) {
        if (TRANSLATABLE_SKIP_KEYS.has(childKey)) out[childKey] = child;
        else out[childKey] = deep(child, childKey);
      }
      return out;
    }
    return value;
  }

  return { strings, patterns, text, deep };
}

export function localizeData(data, catalog) {
  return createTranslator(catalog).deep(data);
}

export function hasCatalogStrings(catalog) {
  return Boolean(catalog && catalog.strings && Object.keys(catalog.strings).length);
}
