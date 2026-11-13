// Runtime lokalisasi: katalog dimuat sekali, pilihan disimpan di settings.locale.
import { get, set, persist } from './store.js';
import {
  createTranslator, normalizeLocale, localeInfo,
  DEFAULT_LOCALE,
} from './i18n-core.js';

const cache = new Map();
let translator = createTranslator(null);
let loadedLocale = DEFAULT_LOCALE;
let catalogLoadedFor = null;
let loading = null;

function selectedLocale() {
  return normalizeLocale(get('settings.locale', DEFAULT_LOCALE));
}

async function fetchCatalog(locale) {
  if (cache.has(locale)) return cache.get(locale);
  if (locale === DEFAULT_LOCALE) {
    // id adalah sumber teks; katalog tetap ada sebagai dokumentasi/rujukan.
    const fallback = { locale, draft: false, strings: {}, patterns: {} };
    cache.set(locale, fallback);
    return fallback;
  }
  const url = new URL(`../../i18n/${locale}.json`, import.meta.url).href;
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    const safe = catalog && typeof catalog === 'object' ? catalog : {};
    safe.strings = safe.strings && typeof safe.strings === 'object' ? safe.strings : {};
    safe.patterns = safe.patterns && typeof safe.patterns === 'object' ? safe.patterns : {};
    cache.set(locale, safe);
    return safe;
  } catch (err) {
    console.warn('[i18n] katalog gagal dimuat; memakai teks Indonesia:', err);
    const fallback = { locale: DEFAULT_LOCALE, draft: false, strings: {}, patterns: {} };
    cache.set(locale, fallback);
    return fallback;
  }
}

export async function ensureI18n(locale = selectedLocale()) {
  const next = normalizeLocale(locale);
  if (next === loadedLocale && catalogLoadedFor === next) {
    return loadedLocale;
  }
  if (loading) await loading;
  loading = (async () => {
    const catalog = await fetchCatalog(next);
    translator = createTranslator(catalog);
    loadedLocale = next;
    catalogLoadedFor = next;
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = next;
      document.documentElement.dataset.locale = next;
    }
  })();
  try {
    await loading;
  } finally {
    loading = null;
  }
  return loadedLocale;
}

export function currentLocale() {
  return loadedLocale;
}

export function isDraftLocale() {
  return Boolean(localeInfo(loadedLocale).draft);
}

export function t(value) {
  return translator.text(value);
}

export function localize(value) {
  return loadedLocale === DEFAULT_LOCALE ? value : translator.deep(value);
}

export function localizeText(value) {
  return translator.text(value);
}

function translateNodeValue(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return raw;
  const leading = raw.match(/^\s*/)?.[0] || '';
  const trailing = raw.match(/\s*$/)?.[0] || '';
  const core = raw.trim();
  const out = translator.text(core);
  return out === core ? raw : `${leading}${out}${trailing}`;
}

const ATTRS = ['title', 'aria-label', 'placeholder', 'alt', 'content'];

export function localizeDom(root = document.body) {
  if (!root || loadedLocale === DEFAULT_LOCALE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-i18n-skip]')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const next = translateNodeValue(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }
  const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
  for (const element of elements) {
    if (element.closest('[data-i18n-skip]')) continue;
    for (const attr of ATTRS) {
      if (!element.hasAttribute(attr)) continue;
      const raw = element.getAttribute(attr);
      const next = translateNodeValue(raw);
      if (next !== raw) element.setAttribute(attr, next);
    }
  }
}

export function localizeDocument() {
  if (loadedLocale === DEFAULT_LOCALE) return;
  if (typeof document === 'undefined' || !document.documentElement) return;
  document.documentElement.lang = loadedLocale;
  document.documentElement.dataset.locale = loadedLocale;
  document.title = translator.text(document.title);
  document.querySelectorAll('meta[name], meta[property]').forEach((meta) => {
    if (!meta.hasAttribute('content')) return;
    const next = translator.text(meta.getAttribute('content'));
    if (next !== meta.getAttribute('content')) meta.setAttribute('content', next);
  });
}

let observer = null;

export function startDomLocalization() {
  if (observer || loadedLocale === DEFAULT_LOCALE || typeof MutationObserver === 'undefined') return;
  localizeDocument();
  localizeDom(document.body);
  observer = new MutationObserver(() => localizeDom(document.body));
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
}

export function setLocale(value) {
  const next = normalizeLocale(value);
  set('settings.locale', next);
  persist();
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = next;
    document.documentElement.dataset.locale = next;
  }
  return next;
}

export function clearI18nCache() {
  cache.clear();
  translator = createTranslator(null);
  loadedLocale = DEFAULT_LOCALE;
  catalogLoadedFor = null;
}
