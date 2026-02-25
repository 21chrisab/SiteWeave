/**
 * Orders tasks for Gantt: flat list with parents then children (by start_date/due_date).
 * Used so left table and chart rows stay in sync.
 *
 * @param {Array<{ id: string, parent_task_id?: string|null, start_date?: string|null, due_date?: string|null }>} tasks
 * @returns {Array} Same task objects in display order (top-level first, then children under each parent, sorted by start then due)
 */
export function orderTasksForGantt(tasks) {
  if (!tasks || !tasks.length) return [];
  const list = [...tasks];
  const byId = new Map(list.map((t) => [t.id, t]));

  function getSortKey(task) {
    const start = task.start_date || task.due_date || '';
    const due = task.due_date || task.start_date || '';
    return [start, due].join('|');
  }

  function compare(a, b) {
    const keyA = getSortKey(a);
    const keyB = getSortKey(b);
    return keyA.localeCompare(keyB);
  }

  const roots = list.filter((t) => !t.parent_task_id || !byId.has(t.parent_task_id));
  const childrenByParent = new Map();
  list.forEach((t) => {
    const pid = t.parent_task_id;
    if (pid && byId.has(pid)) {
      if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
      childrenByParent.get(pid).push(t);
    }
  });

  roots.sort(compare);
  childrenByParent.forEach((children) => children.sort(compare));

  const out = [];
  function append(task) {
    out.push(task);
    (childrenByParent.get(task.id) || []).forEach(append);
  }
  roots.forEach(append);
  return out;
}
