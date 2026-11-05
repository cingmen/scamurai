// Render canvas sertifikat & kartu kemajuan, lalu bagikan/unduh (app-logic.md §9).
import { all, BELTS, beltInfo } from '../core/store.js';
import { certCode, dateID } from '../core/format.js';

const FONT = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

export async function ensureCanvasFonts() {
  if (!document.fonts) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('700 48px "Plus Jakarta Sans"'),
        document.fonts.load('400 20px "Plus Jakarta Sans"'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]);
  } catch { /* pakai fallback */ }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Render sertifikat 1200×850. */
export async function renderCertificate({ name, score, date, code }) {
  await ensureCanvasFonts();
  const belt = beltInfo();
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 850;
  const ctx = canvas.getContext('2d');

  // Latar washi
  ctx.fillStyle = '#F6F2E8';
  ctx.fillRect(0, 0, 1200, 850);
  ctx.strokeStyle = 'rgba(164, 116, 27, .16)';
  ctx.lineWidth = 1;
  for (let i = -850; i < 1200; i += 34) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 850, 850);
    ctx.stroke();
  }

  // Bingkai emas ganda
  ctx.strokeStyle = '#A4741B';
  ctx.lineWidth = 6;
  roundRect(ctx, 34, 34, 1132, 782, 18);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  roundRect(ctx, 52, 52, 1096, 746, 12);
  ctx.stroke();

  // Wordmark
  ctx.textAlign = 'center';
  ctx.font = `800 40px ${FONT}`;
  const scamW = ctx.measureText('Scam').width;
  ctx.font = `800 40px ${FONT}`;
  const uraiW = ctx.measureText('urai').width;
  const startX = (1200 - (scamW + uraiW)) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#B32E2E';
  ctx.fillText('Scam', startX, 130);
  ctx.fillStyle = '#201C26';
  ctx.fillText('urai', startX + scamW, 130);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#7B756A';
  ctx.font = `600 15px ${FONT}`;
  ctx.fillText('ASOSIASI DOJO ANTI-PENIPUAN  ·  SERTIFIKAT EDUKASI', 600, 168);

  ctx.fillStyle = '#201C26';
  ctx.font = `800 54px ${FONT}`;
  ctx.fillText('SERTIFIKAT LULUS DOJO', 600, 260);

  ctx.fillStyle = '#55503F';
  ctx.font = `400 20px ${FONT}`;
  ctx.fillText('Diberikan kepada murid yang telah menyelesaikan ujian akhir Scamurai', 600, 300);

  ctx.fillStyle = '#201C26';
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText(name || 'Murid Anonim', 600, 400);

  ctx.strokeStyle = '#D8D0BF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(300, 428);
  ctx.lineTo(900, 428);
  ctx.stroke();

  // Sabuk
  const beltY = 480;
  ctx.fillStyle = '#7B756A';
  ctx.font = `600 14px ${FONT}`;
  ctx.fillText('SABUK DOJO', 600, beltY - 16);
  ctx.fillStyle = belt.color;
  roundRect(ctx, 470, beltY, 260, 26, 13);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.18)';
  ctx.stroke();
  ctx.fillStyle = belt.ink;
  ctx.font = `700 14px ${FONT}`;
  ctx.fillText(`SABUK ${belt.name.toUpperCase()}`, 600, beltY + 18);

  // Skor & tanggal
  ctx.fillStyle = '#55503F';
  ctx.font = `400 15px ${FONT}`;
  ctx.fillText('SKOR UJIAN', 420, 570);
  ctx.fillText('TANGGAL', 780, 570);
  ctx.fillStyle = '#201C26';
  ctx.font = `800 30px ${MONO}`;
  ctx.fillText(`${score} / 100`, 420, 606);
  ctx.font = `600 17px ${FONT}`;
  ctx.fillText(dateID(date), 780, 604);

  // Kode verifikasi
  ctx.fillStyle = '#7B756A';
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('KODE VERIFIKASI (DETERMINISTIK, BUKAN KRIPTOGRAFI RESMI)', 600, 660);
  ctx.fillStyle = '#201C26';
  ctx.font = `700 18px ${MONO}`;
  ctx.fillText(code || certCode(name || 'Murid Anonim', date, score), 600, 686);

  // Tanda tangan Kenji
  ctx.fillStyle = '#201C26';
  ctx.font = `600 15px ${FONT}`;
  ctx.fillText('Kenji si Kucing Tebas', 900, 740);
  ctx.fillStyle = '#7B756A';
  ctx.font = `400 12px ${FONT}`;
  ctx.fillText('Pemandu Dojo', 900, 760);
  ctx.strokeStyle = '#201C26';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(830, 752);
  ctx.quadraticCurveTo(870, 730, 960, 745);
  ctx.stroke();

  // Disclaimer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7B756A';
  ctx.font = `400 12px ${FONT}`;
  ctx.fillText('Sertifikat edukasi komunitas Scamurai — bukan sertifikasi resmi pemerintah.', 600, 790);
  ctx.fillText('Tidak ada data pribadi yang dikirim. Semua skenario adalah fiktif.', 600, 808);

  return canvas;
}

/** Kartu kemajuan siswa 1000×700. */
export async function renderProgressCard() {
  await ensureCanvasFonts();
  const state = all();
  const belt = beltInfo();
  const completed = Object.values(state.progress || {}).filter((p) => p.status === 'selesai').length;
  const debriefs = Object.values(state.progress || {}).filter((p) => p.debriefDone).length;
  const flags = state.stats?.flagsTotal ? Math.round((state.stats.flagsCorrect / state.stats.flagsTotal) * 100) : 0;

  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#F6F2E8';
  ctx.fillRect(0, 0, 1000, 700);
  ctx.strokeStyle = '#A4741B';
  ctx.lineWidth = 4;
  roundRect(ctx, 24, 24, 952, 652, 16);
  ctx.stroke();

  ctx.fillStyle = '#B32E2E';
  ctx.font = `800 34px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('Scam', 60, 90);
  const scamW = ctx.measureText('Scam').width;
  ctx.fillStyle = '#201C26';
  ctx.fillText('urai', 60 + scamW, 90);

  ctx.fillStyle = '#55503F';
  ctx.font = `600 15px ${FONT}`;
  ctx.fillText('KARTU KEMAJUAN DOJO', 60, 122);

  ctx.fillStyle = '#201C26';
  ctx.font = `800 42px ${FONT}`;
  ctx.fillText(state.profile?.name || 'Murid Anonim', 60, 190);
  ctx.fillStyle = belt.color;
  roundRect(ctx, 60, 210, 210, 26, 13);
  ctx.fill();
  ctx.fillStyle = belt.ink;
  ctx.font = `700 14px ${FONT}`;
  ctx.fillText(`SABUK ${belt.name.toUpperCase()}`, 78, 228);

  const stats = [
    ['Skenario selesai', `${completed} / 8`],
    ['Debrief tuntas', `${debriefs} / 8`],
    ['Akurasi red flag', `${flags}%`],
    ['Skor ujian terbaik', state.exam?.passed ? `${state.exam.best}` : '—'],
    ['Ujian lulus', state.exam?.passed ? 'Ya' : 'Belum'],
    ['Tanggal', dateID(new Date().toISOString())],
  ];

  stats.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 60 + col * 290;
    const y = 300 + row * 88;
    ctx.fillStyle = '#7B756A';
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(label.toUpperCase(), x, y);
    ctx.fillStyle = '#201C26';
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText(value, x, y + 30);
  });

  ctx.fillStyle = '#7B756A';
  ctx.font = `400 12px ${FONT}`;
  ctx.fillText('Kartu ini dihasilkan lokal di perangkat. Bukan sertifikasi resmi.', 60, 620);
  ctx.fillText('Scamurai — asah intuisi, tumpas penipuan.', 60, 642);

  return canvas;
}

export async function shareCanvas(canvas, filename, text = 'Kartu Scamurai') {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return { shared: false };
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: 'Scamurai', text });
      return { shared: true };
    } catch (err) {
      if (err?.name === 'AbortError') return { shared: false, aborted: true };
    }
  }
  downloadBlob(blob, filename);
  return { shared: false, downloaded: true };
}

export function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, 'image/png');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export { BELTS };
