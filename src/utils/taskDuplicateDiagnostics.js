/**
 * Dev helpers: duplicate task *ids* in an array vs rows that *look* identical but have different ids.
 */

/** Normalize to YYYY-MM-DD so "2026-04-22" and "2026-04-22T00:00:00.000Z" dedupe together. */
export function normalizeCalendarDateKey(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  const ymd = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (ymd) return ymd[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Same title + phase + start date → treat as one task for reports (ignores task id). */
export function scheduledTaskDuplicateKey(t) {
  return [
    String(t?.project_id ?? ''),
    normalizeCalendarDateKey(t?.start_date),
    String(t?.project_phase_id ?? ''),
    String(t?.text ?? '').trim(),
  ].join('\u0001');
}

/** @deprecated use scheduledTaskDuplicateKey */
export const weeklyPlanDisplayKey = scheduledTaskDuplicateKey;

/** Key for “same line in last-week completed” — project + phase + completion day + title. */
export function lastWeekDoneDisplayKey(t) {
  const day = normalizeCalendarDateKey(t?.completed_at || t?.updated_at || t?.created_at);
  return [
    String(t?.project_id ?? ''),
    day,
    String(t?.project_phase_id ?? ''),
    String(t?.text ?? '').trim(),
  ].join('\u0001');
}

/**
 * Keep first row per (project, start_date, phase, title). Drops clone/duplicate DB rows.
 * Call once on the project-scoped task list (after dedupeTasksById).
 */
export function dedupeTasksByNamePhaseStartDate(tasks) {
  if (!Array.isArray(tasks)) return tasks;
  const seen = new Set();
  const out = [];
  for (const t of tasks) {
    const k = scheduledTaskDuplicateKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** @deprecated use dedupeTasksByNamePhaseStartDate */
export const dedupeTasksForWeeklyPlanWindow = dedupeTasksByNamePhaseStartDate;

/**
 * Final pass on mapped weekly rows (resolved phase *name*, normalized start in key).
 * Catches duplicate-looking lines when phase ids differ but labels match, or date strings differ.
 */
export function dedupeWeeklyPlanRowsByDisplay(rows) {
  if (!Array.isArray(rows)) return rows;
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const k = [
      String(r?.project_id ?? ''),
      String(r?.text ?? '').trim(),
      String(r?.phase_name ?? '').trim(),
      normalizeCalendarDateKey(r?.start_date),
    ].join('\u0001');
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export function dedupeLastWeekDoneRowsByDisplay(rows) {
  if (!Array.isArray(rows)) return rows;
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const k = [
      String(r?.project_id ?? ''),
      String(r?.text ?? '').trim(),
      String(r?.phase_name ?? '').trim(),
      normalizeCalendarDateKey(r?.completed_at),
    ].join('\u0001');
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export function dedupeTasksForLastWeekDone(tasks) {
  if (!Array.isArray(tasks)) return tasks;
  const seen = new Set();
  const out = [];
  for (const t of tasks) {
    const k = lastWeekDoneDisplayKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Groups tasks that share the same weekly display key but have different ids (clone / import duplicates).
 * @param {string} [projectId] — if set, only tasks for this project
 */
export function analyzeSemanticTaskDuplicates(tasks, projectId) {
  const list = (Array.isArray(tasks) ? tasks : []).filter((t) => {
    if (projectId == null) return true;
    return String(t?.project_id ?? '') === String(projectId);
  });

  const byKey = new Map();
  list.forEach((t, index) => {
    const id = t?.id;
    if (id == null) return;
    const k = scheduledTaskDuplicateKey(t);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push({
      index,
      id: String(id),
      text: t?.text,
      start_date: t?.start_date,
      project_phase_id: t?.project_phase_id,
    });
  });

  const groups = [];
  for (const [key, rows] of byKey) {
    const uniqueIds = new Set(rows.map((r) => r.id));
    if (uniqueIds.size > 1) {
      groups.push({ displayKey: key, differentIds: uniqueIds.size, rows });
    }
  }

  return {
    projectScoped: projectId != null,
    totalTasks: list.length,
    semanticDuplicateGroups: groups,
  };
}

export function logSemanticTaskDuplicateReport(tasks, projectId, label = 'tasks') {
  const report = analyzeSemanticTaskDuplicates(tasks, projectId);

  const total = (tasks || []).length;
  if (projectId != null && report.totalTasks === 0 && total > 0) {
    console.warn(
      `[semantic task dupes] ${label}: 0 tasks for project_id=${projectId} — check the UUID, or call with no args to use the app’s selected project / scan all tasks.`,
    );
  }

  if (report.semanticDuplicateGroups.length === 0) {
    console.log(
      `[semantic task dupes] ${label}: none — no pairs of different ids with same title + phase id + normalized start_date. (Report UI also merges same title + phase name + date after resolving labels.)`,
    );
    return report;
  }

  console.warn(
    `[semantic task dupes] ${label}: ${report.semanticDuplicateGroups.length} group(s) — same weekly line, different task ids (not caught by inspectTaskDuplicates).`,
  );
  for (const g of report.semanticDuplicateGroups) {
    console.groupCollapsed(`  ${g.differentIds} ids for “${g.rows[0]?.text ?? ''}” @ ${g.rows[0]?.start_date ?? ''}`);
    console.table(g.rows);
    console.groupEnd();
  }
  console.log(
    'Tip: Board may show one row if the list is filtered; progress report scans all tasks for the project.',
  );
  return report;
}

/**
 * Dev helpers to see if `state.tasks` contains the same task id more than once and where.
 */

/**
 * @returns {{
 *   totalTasks: number,
 *   tasksWithId: number,
 *   uniqueIds: number,
 *   duplicateGroups: Array<{ id: string, count: number, occurrences: Array<{ index: number, text?: string, project_id?: unknown, updated_at?: string }> }>
 * }}
 */
export function analyzeTaskDuplicates(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  const byId = new Map();

  list.forEach((t, index) => {
    const id = t?.id;
    if (id == null) return;
    const key = String(id);
    if (!byId.has(key)) byId.set(key, []);
    byId.get(key).push({
      index,
      text: t?.text,
      project_id: t?.project_id,
      updated_at: t?.updated_at,
    });
  });

  const duplicateGroups = [];
  for (const [id, occurrences] of byId) {
    if (occurrences.length > 1) {
      duplicateGroups.push({ id, count: occurrences.length, occurrences });
    }
  }

  const tasksWithId = list.filter((t) => t?.id != null).length;

  return {
    totalTasks: list.length,
    tasksWithId,
    uniqueIds: byId.size,
    duplicateGroups,
  };
}

/**
 * Pretty-print duplicate analysis (dev console).
 * @param {string} [label]
 * @returns {ReturnType<typeof analyzeTaskDuplicates>}
 */
export function logTaskDuplicateReport(tasks, label = 'tasks') {
  const report = analyzeTaskDuplicates(tasks);

  if (report.duplicateGroups.length === 0) {
    console.log(
      `[task duplicates] ${label}: none — ${report.totalTasks} row(s), ${report.uniqueIds} unique id(s). (Same-looking lines with *different* ids: use inspectSemanticTaskDuplicates.)`,
    );
    return report;
  }

  console.warn(
    `[task duplicates] ${label}: ${report.duplicateGroups.length} id(s) appear more than once (${report.totalTasks} rows, ${report.uniqueIds} unique ids).`,
  );

  for (const g of report.duplicateGroups) {
    console.groupCollapsed(`  id ${g.id} × ${g.count}`);
    console.table(
      g.occurrences.map((o) => ({
        arrayIndex: o.index,
        text: o.text,
        project_id: o.project_id,
        updated_at: o.updated_at,
      })),
    );
    console.log(
      'Likely causes: (1) ADD_TASK/realtime INSERT after the same row was already loaded; (2) merge bug if two rows share an id but project_id filtering failed (type mismatch).',
    );
    console.groupEnd();
  }

  return report;
}
