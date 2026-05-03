/**
 * Keep first row per task id. Use when merging fetches with realtime or combining project slices.
 */
export function dedupeTasksById(tasks) {
  if (!Array.isArray(tasks)) return tasks;
  const seen = new Set();
  const out = [];
  for (const t of tasks) {
    const id = t?.id;
    if (id == null) {
      out.push(t);
      continue;
    }
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
