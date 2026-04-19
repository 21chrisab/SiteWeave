const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(dateValue) {
    if (!dateValue) return null;
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function toDateString(date) {
    if (!date) return null;
    return date.toISOString().split('T')[0];
}

export function addDays(dateString, days) {
    const base = parseDate(dateString);
    if (!base) return null;
    const next = new Date(base);
    next.setDate(next.getDate() + days);
    return toDateString(next);
}

/**
 * Shift task start/due dates by N calendar days (for weather / manual schedule impacts).
 * @param {object} task
 * @param {number} daysLost positive integer
 */
export function shiftTaskDatesByDays(task, daysLost) {
    if (!task || !Number.isFinite(daysLost) || daysLost === 0) return { ...task };
    const next = { ...task };
    if (next.start_date) next.start_date = addDays(next.start_date, daysLost);
    if (next.due_date) next.due_date = addDays(next.due_date, daysLost);
    return next;
}

/**
 * Shift phase start/end dates by N calendar days.
 */
export function shiftPhaseDatesByDays(phase, daysLost) {
    if (!phase || !Number.isFinite(daysLost) || daysLost === 0) return { ...phase };
    const next = { ...phase };
    if (next.start_date) next.start_date = addDays(next.start_date, daysLost);
    if (next.end_date) next.end_date = addDays(next.end_date, daysLost);
    return next;
}

/**
 * Compute direct task/phase date shifts and optional downstream cascade (FS deps) for schedule impacts.
 * Cascade runs only when dependencyMode === 'auto' and cascade is true.
 *
 * @param {object} params
 * @param {Array} params.tasks
 * @param {Array} params.dependencies
 * @param {Array} [params.phases]
 * @param {string[]} [params.selectedTaskIds]
 * @param {string[]} [params.selectedPhaseIds]
 * @param {number} params.daysLost
 * @param {boolean} [params.cascade]
 * @param {'auto'|'manual'} [params.dependencyMode]
 * @returns {{ directTaskUpdates: Array, directPhaseUpdates: Array, cascadeTaskUpdates: Array }}
 */
export function applyScheduleImpact({
    tasks,
    dependencies,
    phases = [],
    selectedTaskIds = [],
    selectedPhaseIds = [],
    daysLost,
    cascade = false,
    dependencyMode = 'auto',
}) {
    const taskIdSet = new Set((selectedTaskIds || []).filter(Boolean));
    const phaseIdSet = new Set((selectedPhaseIds || []).filter(Boolean));
    const directTaskUpdates = [];
    const directPhaseUpdates = [];

    const taskMap = new Map((tasks || []).map((t) => [t.id, { ...t }]));

    taskIdSet.forEach((id) => {
        const t = taskMap.get(id);
        if (!t) return;
        const shifted = shiftTaskDatesByDays(t, daysLost);
        const payload = {};
        if (shifted.start_date !== t.start_date) payload.start_date = shifted.start_date;
        if (shifted.due_date !== t.due_date) payload.due_date = shifted.due_date;
        if (Object.keys(payload).length === 0) return;
        taskMap.set(id, { ...t, ...payload });
        directTaskUpdates.push({ taskId: id, ...payload });
    });

    const phaseMap = new Map((phases || []).map((p) => [p.id, { ...p }]));
    phaseIdSet.forEach((id) => {
        const p = phaseMap.get(id);
        if (!p) return;
        const shifted = shiftPhaseDatesByDays(p, daysLost);
        const payload = {};
        if (shifted.start_date !== p.start_date) payload.start_date = shifted.start_date;
        if (shifted.end_date !== p.end_date) payload.end_date = shifted.end_date;
        if (Object.keys(payload).length === 0) return;
        phaseMap.set(id, { ...p, ...payload });
        directPhaseUpdates.push({ phaseId: id, ...payload });
    });

    let cascadeTaskUpdates = [];
    const shouldCascade = Boolean(cascade && dependencyMode === 'auto' && taskIdSet.size > 0);
    if (shouldCascade) {
        const graphTasks = Array.from(taskMap.values());
        cascadeTaskUpdates = calculateAutoShiftUpdates(graphTasks, dependencies, [...taskIdSet]);
    }

    return {
        directTaskUpdates,
        directPhaseUpdates,
        cascadeTaskUpdates,
    };
}

function clampImpactWindow(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start && !end) return { start: null, end: null };
    if (!start && end) return { start: new Date(end), end };
    if (start && !end) return { start, end: new Date(start) };
    return start <= end ? { start, end } : { start: end, end: start };
}

function taskOverlapsWindow(task, windowStart, windowEnd) {
    const start = parseDate(task?.start_date);
    const end = parseDate(task?.due_date || task?.start_date);
    if (!start && !end) return false;
    const normalizedStart = start || end;
    const normalizedEnd = end || start;
    return normalizedStart <= windowEnd && normalizedEnd >= windowStart;
}

function phaseOverlapsWindow(phase, windowStart, windowEnd) {
    const start = parseDate(phase?.start_date);
    const end = parseDate(phase?.end_date || phase?.start_date);
    if (!start && !end) return false;
    const normalizedStart = start || end;
    const normalizedEnd = end || start;
    return normalizedStart <= windowEnd && normalizedEnd >= windowStart;
}

/**
 * Auto-select impacted tasks/phases from a weather date window.
 */
export function suggestScheduleImpactSelection({
    tasks = [],
    phases = [],
    startDate,
    endDate,
}) {
    const { start, end } = clampImpactWindow(startDate, endDate);
    if (!start || !end) {
        return {
            selectedTaskIds: [],
            selectedPhaseIds: [],
        };
    }
    const selectedTaskIds = tasks
        .filter((task) => taskOverlapsWindow(task, start, end))
        .map((task) => task.id);
    const selectedPhaseIds = phases
        .filter((phase) => phaseOverlapsWindow(phase, start, end))
        .map((phase) => phase.id);
    return {
        selectedTaskIds,
        selectedPhaseIds,
    };
}

function diffDays(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end) return 0;
    return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

export function getTaskEndDate(task) {
    if (task?.due_date) return task.due_date;
    if (!task?.start_date) return null;
    const duration = Number.isFinite(Number(task.duration_days)) ? Math.max(1, Number(task.duration_days)) : 1;
    return addDays(task.start_date, duration - 1);
}

function getTaskById(tasks) {
    return new Map((tasks || []).map((task) => [task.id, task]));
}

function getIncomingDependencyMap(dependencies) {
    const incoming = new Map();
    (dependencies || []).forEach((dep) => {
        if (!incoming.has(dep.successor_task_id)) incoming.set(dep.successor_task_id, []);
        incoming.get(dep.successor_task_id).push(dep);
    });
    return incoming;
}

export function getEarliestAllowedStartDate(taskId, tasks, dependencies) {
    const taskMap = getTaskById(tasks);
    const incoming = getIncomingDependencyMap(dependencies);
    const predecessors = incoming.get(taskId) || [];
    let maxRequiredStart = null;

    predecessors.forEach((dep) => {
        if (dep.dependency_type && dep.dependency_type !== 'finish_to_start') return;
        const predecessor = taskMap.get(dep.task_id);
        if (!predecessor) return;
        const predecessorEnd = getTaskEndDate(predecessor);
        if (!predecessorEnd) return;
        const lagDays = Number.isFinite(Number(dep.lag_days)) ? Number(dep.lag_days) : 0;
        const requiredStart = addDays(predecessorEnd, lagDays + 1);
        if (!requiredStart) return;
        if (!maxRequiredStart || parseDate(requiredStart) > parseDate(maxRequiredStart)) {
            maxRequiredStart = requiredStart;
        }
    });

    return maxRequiredStart;
}

export function getDependencyWarnings(tasks, dependencies) {
    const incoming = getIncomingDependencyMap(dependencies);
    const taskMap = getTaskById(tasks);
    const warnings = {};

    (tasks || []).forEach((task) => {
        const predecessors = incoming.get(task.id) || [];
        if (predecessors.length === 0) return;

        const unmetPredecessors = predecessors
            .filter((dep) => (dep.dependency_type || 'finish_to_start') === 'finish_to_start')
            .map((dep) => taskMap.get(dep.task_id))
            .filter(Boolean)
            .filter((pred) => !pred.completed)
            .map((pred) => ({ id: pred.id, text: pred.text }));

        const earliestAllowedStart = getEarliestAllowedStartDate(task.id, tasks, dependencies);
        const startDateConflict = Boolean(
            earliestAllowedStart &&
            task.start_date &&
            parseDate(task.start_date) < parseDate(earliestAllowedStart)
        );

        if (unmetPredecessors.length > 0 || startDateConflict) {
            warnings[task.id] = {
                unmetPredecessors,
                startDateConflict,
                earliestAllowedStart,
            };
        }
    });

    return warnings;
}

function buildOutgoingMap(dependencies) {
    const outgoing = new Map();
    (dependencies || []).forEach((dep) => {
        if ((dep.dependency_type || 'finish_to_start') !== 'finish_to_start') return;
        if (!outgoing.has(dep.task_id)) outgoing.set(dep.task_id, []);
        outgoing.get(dep.task_id).push(dep);
    });
    return outgoing;
}

export function calculateAutoShiftUpdates(tasks, dependencies, changedTaskIds = []) {
    const taskMap = getTaskById(tasks);
    const outgoing = buildOutgoingMap(dependencies);
    const updates = new Map();
    const queue = [...new Set(changedTaskIds)].filter(Boolean);
    const visited = new Set();

    while (queue.length > 0) {
        const currentTaskId = queue.shift();
        if (visited.has(currentTaskId)) continue;
        visited.add(currentTaskId);

        const successors = outgoing.get(currentTaskId) || [];
        successors.forEach((dep) => {
            const successor = taskMap.get(dep.successor_task_id);
            if (!successor) return;
            const earliestStart = getEarliestAllowedStartDate(successor.id, Array.from(taskMap.values()), dependencies);
            if (!earliestStart) return;

            const currentStart = successor.start_date || earliestStart;
            if (parseDate(currentStart) >= parseDate(earliestStart)) return;

            const shiftByDays = diffDays(currentStart, earliestStart);
            const nextStartDate = earliestStart;
            const nextDueDate = successor.due_date
                ? addDays(successor.due_date, shiftByDays)
                : (successor.duration_days ? addDays(nextStartDate, Math.max(1, Number(successor.duration_days)) - 1) : successor.due_date);

            const nextTask = {
                ...successor,
                start_date: nextStartDate,
                due_date: nextDueDate,
            };
            taskMap.set(nextTask.id, nextTask);

            updates.set(nextTask.id, {
                start_date: nextStartDate,
                due_date: nextDueDate,
            });
            queue.push(nextTask.id);
        });
    }

    return Array.from(updates.entries()).map(([taskId, data]) => ({ taskId, ...data }));
}

export function wouldCreateDependencyCycle(tasks, dependencies, predecessorTaskId, successorTaskId) {
    if (!predecessorTaskId || !successorTaskId) return false;
    if (predecessorTaskId === successorTaskId) return true;

    const adjacency = new Map();
    (tasks || []).forEach((task) => adjacency.set(task.id, []));
    (dependencies || []).forEach((dep) => {
        if (!adjacency.has(dep.task_id)) adjacency.set(dep.task_id, []);
        adjacency.get(dep.task_id).push(dep.successor_task_id);
    });

    // Adding predecessor -> successor creates a cycle only if successor can
    // already reach predecessor in the current graph.
    const stack = [successorTaskId];
    const seen = new Set();
    while (stack.length > 0) {
        const node = stack.pop();
        if (!node || seen.has(node)) continue;
        if (node === predecessorTaskId) return true;
        seen.add(node);
        const nextNodes = adjacency.get(node) || [];
        nextNodes.forEach((next) => stack.push(next));
    }
    return false;
}
