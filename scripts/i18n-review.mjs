#!/usr/bin/env node
// Penjaga alur review lokalisasi. Bukan bukti review: status pending tetap
// valid, tetapi status approved tidak boleh ada tanpa reviewer dan checklist.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

const status = read('i18n/review-status.json');
const glossary = read('i18n/security-glossary.json');
const catalogs = {
  id: read('i18n/id.json'),
  'jv-ID': read('i18n/jv-ID.json'),
  en: read('i18n/en.json'),
};
const locales = ['jv-ID', 'en'];
const errors = [];
const notes = [];

const allowedStatus = new Set(['pending-native-review', 'in-review', 'approved']);
if (!allowedStatus.has(status.status)) errors.push(`status global tidak dikenal: ${status.status}`);
if (!status.requiredRoles?.['jv-ID'] || !status.requiredRoles?.en) {
  errors.push('requiredRoles harus menyebut reviewer Jawa dan Inggris');
}
if (status.catalogVersion !== 1) errors.push('catalogVersion review harus 1');

for (const locale of locales) {
  const catalog = catalogs[locale];
  const entry = status.locales?.[locale];
  if (!entry) {
    errors.push(`${locale}: entri review-status tidak ada`);
    continue;
  }
  if (catalog.locale !== locale) errors.push(`${locale}: locale katalog salah`);
  if (catalog.draft !== true) errors.push(`${locale}: katalog harus tetap draft sebelum review`);
  if (catalog.reviewStatus !== 'pending-native-review') {
    errors.push(`${locale}: reviewStatus katalog harus pending-native-review`);
  }
  if (!allowedStatus.has(entry.status)) errors.push(`${locale}: status review tidak dikenal`);
  if (entry.catalogVersion !== catalog.version) {
    errors.push(`${locale}: review harus menunjuk catalogVersion ${catalog.version}`);
  }

  if (entry.status === 'approved') {
    if (!entry.reviewer?.trim()) errors.push(`${locale}: approved tanpa nama reviewer`);
    if (!entry.reviewedAt?.trim()) errors.push(`${locale}: approved tanpa tanggal review`);
    const passed = Object.values(entry.checklist || {});
    if (!passed.length || passed.some((value) => value !== 'passed')) {
      errors.push(`${locale}: approved tanpa seluruh checklist lulus`);
    }
    if (catalog.draft !== false) errors.push(`${locale}: approved tetapi katalog masih draft`);
    if (catalog.reviewStatus !== 'reviewed') {
      errors.push(`${locale}: approved tetapi reviewStatus katalog bukan reviewed`);
    }
  } else {
    if (catalog.draft !== true) errors.push(`${locale}: status belum approved tetapi draft=false`);
    if (catalog.reviewStatus !== 'pending-native-review') {
      errors.push(`${locale}: status belum approved tetapi reviewStatus katalog berubah`);
    }
    if (entry.checklist && Object.values(entry.checklist).every((value) => value === 'passed')) {
      notes.push(`${locale}: checklist lengkap tetapi status masih ${entry.status}; belum boleh dianggap selesai`);
    }
  }
}

for (const term of glossary.terms || []) {
  for (const locale of ['id', ...locales]) {
    const value = catalogs[locale].strings?.[term.id];
    const expected = locale === 'id' ? term.id : (locale === 'jv-ID' ? term.jv : term.en);
    if (value !== expected) {
      errors.push(`${locale}: istilah ${JSON.stringify(term.id)} = ${JSON.stringify(value)}, harus ${JSON.stringify(expected)}`);
    }
  }
}

const summary = {
  status: status.status,
  catalogVersion: status.catalogVersion,
  requiredRoles: status.requiredRoles,
  locales: Object.fromEntries(locales.map((locale) => {
    const entry = status.locales?.[locale] || {};
    return [locale, {
      status: entry.status,
      reviewer: entry.reviewer || '(belum ditugaskan)',
      reviewedAt: entry.reviewedAt || '(belum ada)',
      checklist: entry.checklist || {},
      strings: Object.keys(catalogs[locale].strings || {}).length,
    }];
  })),
  securityTerms: (glossary.terms || []).length,
  notes,
  errors,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('\nReview lokalisasi Scamurai');
  console.log(`  status       : ${summary.status}`);
  console.log(`  versi katalog: ${summary.catalogVersion}`);
  console.log(`  istilah kunci: ${summary.securityTerms} diperiksa`);
  for (const [locale, entry] of Object.entries(summary.locales)) {
    const checklist = Object.values(entry.checklist).join(' / ');
    console.log(`  ${locale.padEnd(6)}: ${entry.status} · ${entry.strings} string · ${checklist}`);
    console.log(`           reviewer: ${entry.reviewer}; tanggal: ${entry.reviewedAt}`);
  }
  for (const note of notes) console.log(`  catatan    : ${note}`);
  if (errors.length) {
    console.log('\nError:');
    errors.forEach((message) => console.log(`  ✕ ${message}`));
  } else {
    console.log('\n✓ Struktur review valid; status belum berarti terjemahan sudah diverifikasi.');
  }
}

if (errors.length) process.exit(1);
