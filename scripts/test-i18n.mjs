#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_LOCALE, normalizeLocale, createTranslator, localizeData,
  TRANSLATABLE_SKIP_KEYS,
} from '../js/core/i18n-core.js';

const catalog = {
  locale: 'en',
  draft: true,
  strings: {
    'Pilih musuhmu': 'Choose your enemy',
    'Pesanan yang Menggugah': 'The Tempting Order',
    'Apa yang kamu lakukan?': 'What do you do?',
  },
  patterns: {
    '{0} dari {1} skenario selesai': '{0} of {1} scenarios complete',
  },
};

assert.equal(normalizeLocale('id'), 'id');
assert.equal(normalizeLocale('id-ID'), 'id');
assert.equal(normalizeLocale('jv'), 'jv-ID');
assert.equal(normalizeLocale('jv-ID'), 'jv-ID');
assert.equal(normalizeLocale('en-US'), 'en');
assert.equal(normalizeLocale('fr'), DEFAULT_LOCALE);
assert.equal(normalizeLocale(null), DEFAULT_LOCALE);

const tr = createTranslator(catalog);
assert.equal(tr.text('Pilih musuhmu'), 'Choose your enemy');
assert.equal(tr.text('Teks yang belum diterjemahkan'), 'Teks yang belum diterjemahkan');
assert.equal(tr.text(''), '');
assert.equal(tr.text(null), null);
assert.equal(tr.text('3 dari 13 skenario selesai'), '3 of 13 scenarios complete');

const source = {
  id: 'task-scam',
  title: 'Pesanan yang Menggugah',
  app: 'chatriang',
  steps: [
    { type: 'choice', prompt: 'Apa yang kamu lakukan?', goto: 4 },
    { type: 'chat', text: 'Teks yang belum diterjemahkan', sender: 'Admin' },
  ],
};
const localized = localizeData(source, catalog);
assert.equal(localized.id, 'task-scam');
assert.equal(localized.app, 'chatriang');
assert.equal(localized.title, 'The Tempting Order');
assert.equal(localized.steps[0].prompt, 'What do you do?');
assert.equal(localized.steps[0].goto, 4);
assert.equal(localized.steps[1].text, 'Teks yang belum diterjemahkan');
assert.equal(localized.steps[1].sender, 'Admin');

const untouched = localizeData(source, null);
assert.deepEqual(untouched, source);
assert.equal(TRANSLATABLE_SKIP_KEYS.has('id'), true);
assert.equal(TRANSLATABLE_SKIP_KEYS.has('title'), false);

function walkJson(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkJson(path, out);
    else if (name.endsWith('.json')) out.push(path);
  }
  return out;
}

function collect(value, out) {
  if (typeof value === 'string') {
    const text = value.trim();
    const identifier = /^(https?:\/\/|\/|[a-z0-9-]+$|[a-z0-9.-]+\.[a-z]{2,}|[A-Z]{2,5}$)/i.test(text);
    if (text.length > 3 && /[A-Za-z]/.test(text) && !identifier) out.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collect(item, out));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (!TRANSLATABLE_SKIP_KEYS.has(key)) collect(child, out);
    }
  }
}

const dataStrings = new Set();
for (const file of walkJson('data')) collect(JSON.parse(readFileSync(file, 'utf8')), dataStrings);
for (const locale of ['en', 'jv-ID']) {
  const catalog = JSON.parse(readFileSync(join('i18n', `${locale}.json`), 'utf8'));
  assert.equal(catalog.draft, true);
  assert.equal(catalog.reviewStatus, 'pending-native-review');
  const missing = [...dataStrings].filter((text) => !(text in catalog.strings));
  assert.deepEqual(missing, [], `${locale}: konten data belum lengkap (${missing.length})`);
}
const idCatalog = JSON.parse(readFileSync('i18n/id.json', 'utf8'));
assert.equal(idCatalog.locale, 'id');
assert.equal(idCatalog.draft, false);
assert.ok(Object.keys(idCatalog.strings).length > 1000);

console.log('✓ i18n: pemilihan locale, fallback id→key, pola, dan data bersarang lulus.');
