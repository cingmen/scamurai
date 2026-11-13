// Pengingat latihan lokal: dihitung dari progres selesai, tanpa server/push.
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INTERVAL_DAYS = 7;

/**
 * Kembalikan pengingat bila sudah waktunya mengulang skenario.
 * Skor waktu memakai penyelesaian terbaru; skenario yang diusulkan adalah
 * skenario selesai paling lama agar latihan berputar, bukan menumpuk.
 */
export function practiceReminder(state = {}, now = Date.now()) {
  const setting = state?.settings?.reminder;
  if (!setting || setting.enabled !== true) return null;

  const requested = Number(setting.intervalDays);
  const intervalDays = Number.isFinite(requested) && requested >= 1 && requested <= 365
    ? Math.round(requested)
    : DEFAULT_INTERVAL_DAYS;
  const timestamp = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(timestamp)) return null;

  const completed = Object.entries(state?.progress || {})
    .filter(([, entry]) => entry?.status === 'selesai')
    .map(([id, entry]) => ({ id, at: Date.parse(entry.updatedAt || '') }))
    .filter((entry) => Number.isFinite(entry.at))
    .sort((a, b) => a.at - b.at);

  if (!completed.length) return null;
  const oldest = completed[0];
  const latest = completed[completed.length - 1];
  const dueAt = latest.at + intervalDays * DAY_MS;
  if (timestamp < dueAt) return null;

  return {
    scenarioId: oldest.id,
    intervalDays,
    dueAt,
    daysSince: Math.floor((timestamp - latest.at) / DAY_MS),
  };
}
