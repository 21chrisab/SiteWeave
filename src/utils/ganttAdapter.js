/**
 * Maps project tasks + task_dependencies to frappe-gantt task format.
 * Uses same date/duration logic as CPM (start_date, duration_days, due_date, is_milestone).
 * Accepts pre-ordered tasks so left table and chart rows stay in sync.
 *
 * @param {Array<{ id: string, text: string, start_date?: string|null, due_date?: string|null, duration_days?: number|null, is_milestone?: boolean, completed?: boolean, progress_percent?: number }>} tasks
 * @param {Array<{ task_id: string, successor_task_id: string }>} dependencies
 * @param {Set<string>|string[]} criticalPathIds - task IDs on critical path (for custom_class)
 * @returns {Array<{ id: string, name: string, start: string, end: string, progress: number, dependencies: string, custom_class?: string }>}
 */
export function toFrappeGanttTasks(tasks, dependencies, criticalPathIds = []) {
  const criticalSet = new Set(Array.isArray(criticalPathIds) ? criticalPathIds : []);
  const depList = Array.isArray(dependencies) ? dependencies : [];

  function getStartEnd(task) {
    if (!task || typeof task !== 'object') return { start: null, end: null };
    const startStr = task.start_date || task.due_date;
    if (!startStr) return { start: null, end: null };
    const start = new Date(startStr);
    if (Number.isNaN(start.getTime())) return { start: null, end: null };
    let end;
    if (task.is_milestone) {
      end = new Date(start);
      end.setDate(end.getDate() + 1); // 1-day bar for visibility
    } else if (task.duration_days != null && task.duration_days >= 0) {
      end = new Date(start);
      end.setDate(end.getDate() + Math.max(1, task.duration_days));
    } else if (task.due_date) {
      end = new Date(task.due_date);
    } else {
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    }
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  const predecessorBySuccessor = new Map();
  depList.forEach((d) => {
    if (!predecessorBySuccessor.has(d.successor_task_id)) predecessorBySuccessor.set(d.successor_task_id, []);
    predecessorBySuccessor.get(d.successor_task_id).push(d.task_id);
  });

  return (tasks || [])
    .map((task) => {
      const { start, end } = getStartEnd(task);
      if (!start || !end) return null;
      const preds = predecessorBySuccessor.get(task.id) || [];
      const dependenciesStr = preds.join(',');
      const progress = task.progress_percent != null ? Math.min(100, Math.max(0, task.progress_percent)) : (task.completed ? 100 : 0);
      const base = {
        id: String(task.id),
        name: task.text || 'Task',
        start,
        end,
        progress,
        dependencies: dependenciesStr
      };
      // Single token only: frappe-gantt uses classList.add(custom_class); spaces are invalid
      const status = criticalSet.has(task.id) ? 'critical' : (task.completed ? 'complete' : 'todo');
      const suffix = task.is_milestone ? '-milestone' : '';
      base.custom_class = 'gantt-' + status + suffix;
      return base;
    })
    .filter(Boolean);
}
