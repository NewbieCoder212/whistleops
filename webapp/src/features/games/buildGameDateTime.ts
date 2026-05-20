/** Build ISO date_time for POST /api/games (matches bulk import format). */
export function buildGameDateTimeIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const timeParts = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeParts) return null;
  const isoStr = `${date}T${timeParts[1]!.padStart(2, "0")}:${timeParts[2]}:00.000Z`;
  if (Number.isNaN(Date.parse(isoStr))) return null;
  return isoStr;
}
