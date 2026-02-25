/**
 * Critical Path Method (CPM) – standard algorithm only.
 * Given tasks and dependencies, returns task IDs that have zero slack (critical path).
 * No AI; deterministic forward/backward pass.
 *
 * @param {Array<{ id: string, start_date?: string|null, due_date?: string|null, duration_days?: number|null, is_milestone?: boolean }>} tasks
 * @param {Array<{ task_id: string, successor_task_id: string, dependency_type?: string, lag_days?: number }>} dependencies
 * @returns {string[]} Task IDs with zero slack (critical path)
 */
export function getCriticalPathTaskIds(tasks, dependencies) {
  if (!tasks?.length) return [];

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const depList = Array.isArray(dependencies) ? dependencies : [];

  function getDuration(task) {
    if (task.is_milestone) return 0;
    if (task.duration_days != null && task.duration_days >= 0) return task.duration_days;
    if (task.start_date && task.due_date) {
      const start = new Date(task.start_date);
      const end = new Date(task.due_date);
      const days = Math.max(0, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
      return days;
    }
    return 1;
  }

  const duration = new Map();
  tasks.forEach((t) => duration.set(t.id, getDuration(t)));

  const predecessors = new Map();
  const successors = new Map();
  depList.forEach((d) => {
    if (!taskMap.has(d.task_id) || !taskMap.has(d.successor_task_id)) return;
    if (!successors.has(d.task_id)) successors.set(d.task_id, []);
    successors.get(d.task_id).push({ id: d.successor_task_id, type: d.dependency_type || 'finish_to_start', lag: d.lag_days || 0 });
    if (!predecessors.has(d.successor_task_id)) predecessors.set(d.successor_task_id, []);
    predecessors.get(d.successor_task_id).push({ id: d.task_id, type: d.dependency_type || 'finish_to_start', lag: d.lag_days || 0 });
  });

  const ids = tasks.map((t) => t.id);
  const inDegree = new Map(ids.map((id) => [id, (predecessors.get(id) || []).length]));
  const queue = ids.filter((id) => inDegree.get(id) === 0);
  const order = [];
  while (queue.length) {
    const u = queue.shift();
    order.push(u);
    (successors.get(u) || []).forEach(({ id: v }) => {
      inDegree.set(v, inDegree.get(v) - 1);
      if (inDegree.get(v) === 0) queue.push(v);
    });
  }

  const es = new Map();
  const ef = new Map();
  order.forEach((id) => {
    const preds = predecessors.get(id) || [];
    let start = 0;
    preds.forEach(({ id: p, type, lag }) => {
      const pef = ef.get(p) ?? 0;
      const pes = es.get(p) ?? 0;
      const d = duration.get(p) ?? 0;
      let val;
      if (type === 'finish_to_start') val = pef + lag;
      else if (type === 'start_to_start') val = pes + lag;
      else if (type === 'finish_to_finish') val = pef + lag - (duration.get(id) ?? 0);
      else val = pes + lag - (duration.get(id) ?? 0);
      if (val > start) start = val;
    });
    es.set(id, start);
    ef.set(id, start + (duration.get(id) ?? 0));
  });

  const projectEnd = Math.max(...ids.map((id) => ef.get(id) ?? 0), 0);
  const ls = new Map();
  const lf = new Map();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const d = duration.get(id) ?? 0;
    const succs = successors.get(id) || [];
    let lfVal = projectEnd;
    if (succs.length > 0) {
      lfVal = Infinity;
      succs.forEach(({ id: v, type, lag }) => {
        const vls = ls.get(v) ?? projectEnd;
        const vlf = lf.get(v) ?? projectEnd;
        let val;
        if (type === 'finish_to_start') val = vls - lag;
        else if (type === 'start_to_start') val = vls - lag;
        else if (type === 'finish_to_finish') val = vlf - lag;
        else val = vlf - lag;
        if (val < lfVal) lfVal = val;
      });
      if (lfVal === Infinity) lfVal = projectEnd;
    } else {
      lfVal = projectEnd;
    }
    lf.set(id, lfVal);
    ls.set(id, lfVal - d);
  }

  const zeroSlack = ids.filter((id) => {
    const slack = (ls.get(id) ?? 0) - (es.get(id) ?? 0);
    return slack <= 0;
  });

  return zeroSlack;
}
