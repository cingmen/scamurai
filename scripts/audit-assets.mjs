#!/usr/bin/env node
// Audit anggaran aset runtime (ROADMAP F7).
// Batas:
//   - audio: 20 KB per berkas
//   - gambar: 300 KB per berkas raster, 100 KB per SVG
//   - aplikasi: 150 KB gzip untuk seluruh JS + CSS + index.html
// Tanpa dependensi eksternal: `node scripts/audit-assets.mjs`.

import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, relative, sep } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const KB = 1024;

const BUDGETS = {
  audioFile: 20 * KB,
  rasterImage: 300 * KB,
  svgImage: 100 * KB,
  appGzip: 150 * KB,
};

const AUDIO_EXT = /\.(mp3|ogg|wav|m4a)$/i;
const RASTER_EXT = /\.(png|jpe?g|webp|avif)$/i;
const SVG_EXT = /\.svg$/i;

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, out);
    else out.push(path);
  }
  return out;
}

function rel(path) {
  return relative(root, path).split(sep).join('/');
}

function kb(bytes) {
  return `${(bytes / KB).toFixed(1)} KB`;
}

const errors = [];

function checkFile(path, maxBytes, label) {
  return readFile(path).then((buffer) => {
    if (buffer.length > maxBytes) {
      errors.push(`${rel(path)}: ${label} ${kb(buffer.length)} > batas ${kb(maxBytes)}`);
    }
    return { path, bytes: buffer.length };
  });
}

const audioFiles = (await walk(join(root, 'assets/audio'))).filter((path) => AUDIO_EXT.test(path));
const audio = await Promise.all(audioFiles.map((path) => checkFile(path, BUDGETS.audioFile, 'audio')));
const largestAudio = audio.sort((a, b) => b.bytes - a.bytes)[0] || { bytes: 0 };

const imageFiles = (await walk(join(root, 'assets/img'))).filter((path) => RASTER_EXT.test(path) || SVG_EXT.test(path));
const images = await Promise.all(imageFiles.map((path) => {
  const isRaster = RASTER_EXT.test(path);
  return checkFile(path, isRaster ? BUDGETS.rasterImage : BUDGETS.svgImage, isRaster ? 'gambar raster' : 'SVG');
}));
const largestRaster = images.filter((item) => RASTER_EXT.test(item.path)).sort((a, b) => b.bytes - a.bytes)[0] || { bytes: 0 };
const largestSvg = images.filter((item) => SVG_EXT.test(item.path)).sort((a, b) => b.bytes - a.bytes)[0] || { bytes: 0 };

const appFiles = [
  ...(await walk(join(root, 'js'))).filter((path) => path.endsWith('.js')),
  ...(await walk(join(root, 'assets/css'))).filter((path) => path.endsWith('.css')),
  join(root, 'index.html'),
];
let appGzip = 0;
for (const path of appFiles) {
  appGzip += gzipSync(await readFile(path)).length;
}
if (appGzip > BUDGETS.appGzip) {
  errors.push(`aplikasi: ${kb(appGzip)} gzip > batas ${kb(BUDGETS.appGzip)}`);
}

console.log('\nScamurai asset audit');
console.log(`  audio       : ${audio.length} berkas, terbesar ${kb(largestAudio.bytes)} / ${kb(BUDGETS.audioFile)}`);
console.log(`  gambar      : ${images.length} berkas (${images.length - images.filter((item) => RASTER_EXT.test(item.path)).length} SVG, ${images.filter((item) => RASTER_EXT.test(item.path)).length} raster)`);
console.log(`                raster terbesar ${kb(largestRaster.bytes)} / ${kb(BUDGETS.rasterImage)}; SVG terbesar ${kb(largestSvg.bytes)} / ${kb(BUDGETS.svgImage)}`);
console.log(`  aplikasi    : ${appFiles.length} berkas, ${kb(appGzip)} gzip / ${kb(BUDGETS.appGzip)}`);

if (errors.length) {
  console.log('\nError:');
  errors.forEach((message) => console.log(`  ✕ ${message}`));
  process.exit(1);
}
console.log('\n✓ Anggaran aset terpenuhi.\n');
