/**
 * Local calendar date as YYYY-MM-DD (avoids UTC midnight shifting the day).
 * @param {Date} [d]
 * @returns {string}
 */
export function localDateIso(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Add N calendar days to an ISO date string (YYYY-MM-DD).
 * @param {string} iso
 * @param {number} days
 * @returns {string|null}
 */
export function addDaysIso(iso, days) {
  if (!iso || !Number.isFinite(days)) return null;
  const parts = iso.split('-').map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, mo, d] = parts;
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setDate(dt.getDate() + days);
  return localDateIso(dt);
}
