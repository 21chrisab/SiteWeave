/**
 * Duration-weighted project % from phase rows (matches desktop app semantics).
 * Prefer stored phase.progress (DB task rollup or schedule); use schedule-derived % only when progress is null/undefined.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toUtcDate = (dateString) => {
  if (!dateString) return null;
  const parsed = new Date(`${dateString}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const phaseDurationDays = (startDate, endDate) => {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  if (!start || !end) return 1;
  const diffDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
  return Math.max(1, diffDays);
};

const scheduleProgressPct = (startDate, endDate, today) => {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  if (!start || !end) return null;
  if (today < start) return 0;
  if (today >= end) return 100;
  const totalDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
  if (totalDays <= 0) return 100;
  const elapsedDays = Math.floor((today.getTime() - start.getTime()) / MS_PER_DAY);
  return Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));
};

const attachFallbackPhaseDates = (phases, projectDueDate) => {
  if (!Array.isArray(phases) || phases.length === 0) return [];
  const hasAnyDate = phases.some((phase) => phase.start_date && phase.end_date);
  if (hasAnyDate) return phases;

  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const due = toUtcDate(projectDueDate);
  const fallbackEnd = due && due > start
    ? due
    : new Date(start.getTime() + phases.length * MS_PER_DAY);
  const totalDays = Math.max(1, Math.floor((fallbackEnd.getTime() - start.getTime()) / MS_PER_DAY));

  return phases.map((phase, index) => {
    const rangeStartOffset = Math.floor((index * totalDays) / phases.length);
    const rangeEndOffset = Math.floor(((index + 1) * totalDays) / phases.length);
    const phaseStart = new Date(start.getTime() + rangeStartOffset * MS_PER_DAY);
    const phaseEnd = new Date(start.getTime() + Math.max(rangeStartOffset + 1, rangeEndOffset) * MS_PER_DAY);
    return {
      ...phase,
      start_date: phase.start_date || phaseStart.toISOString().slice(0, 10),
      end_date: phase.end_date || phaseEnd.toISOString().slice(0, 10),
    };
  });
};

/**
 * @param {Array<{ progress?: number|null, start_date?: string|null, end_date?: string|null, order?: number }>} phases - ordered phases for one project
 * @param {string|null|undefined} projectDueDate
 * @returns {number} 0–100
 */
export function computeWeightedProjectProgressPercent(phases, projectDueDate) {
  if (!phases || phases.length === 0) return 0;

  const sorted = [...phases].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const normalizedPhases = attachFallbackPhaseDates(sorted, projectDueDate);
  const today = new Date();

  const totalDuration = normalizedPhases.reduce(
    (sum, phase) => sum + phaseDurationDays(phase.start_date, phase.end_date),
    0
  );
  if (totalDuration <= 0) return 0;

  const weighted = normalizedPhases.reduce((sum, phase) => {
    const duration = phaseDurationDays(phase.start_date, phase.end_date);
    const derivedProgress = scheduleProgressPct(phase.start_date, phase.end_date, today);
    const hasExplicitProgress = phase.progress !== null && phase.progress !== undefined;
    const progress = hasExplicitProgress
      ? Math.max(0, Math.min(100, phase.progress || 0))
      : (typeof derivedProgress === 'number' ? derivedProgress : 0);
    return sum + (progress * duration) / totalDuration;
  }, 0);

  return Math.round(weighted);
}

/**
 * Group phase rows from a batched query by project_id (sorted by order).
 * @param {Array<{ project_id: string, order?: number }>} rows
 * @returns {Record<string, Array>}
 */
export function groupPhasesByProjectId(rows) {
  const map = {};
  for (const row of rows || []) {
    const pid = row.project_id;
    if (!pid) continue;
    if (!map[pid]) map[pid] = [];
    map[pid].push(row);
  }
  for (const pid of Object.keys(map)) {
    map[pid].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return map;
}
