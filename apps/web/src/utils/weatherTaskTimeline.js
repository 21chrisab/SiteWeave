/**
 * Merge weather impact markers into an ordered task list (by due/start date).
 * Each impact appears once, before the first task whose schedule key is strictly after impact.start_date.
 *
 * @param {Array<{ id: string, due_date?: string|null, start_date?: string|null }>} sortedTasks
 * @param {Array<{ id: string, start_date?: string|null, title?: string, days_lost?: number }>} impacts
 * @returns {Array<{ kind: 'weather', impact: object } | { kind: 'task', task: object }>}
 */
export function mergeWeatherAndTasks(sortedTasks, impacts) {
    const weather = [...(impacts || [])]
        .filter((w) => w?.start_date)
        .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
    const rows = [];
    let wi = 0;
    const taskKey = (t) => t?.due_date || t?.start_date || '9999-12-31';
    for (const task of sortedTasks) {
        const k = taskKey(task);
        while (wi < weather.length && String(weather[wi].start_date) < k) {
            rows.push({ kind: 'weather', impact: weather[wi] });
            wi += 1;
        }
        rows.push({ kind: 'task', task });
    }
    while (wi < weather.length) {
        rows.push({ kind: 'weather', impact: weather[wi] });
        wi += 1;
    }
    return rows;
}

function toComparableDate(value) {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function phaseTaskWindow(phaseTasks) {
    let min = null;
    let max = null;
    for (const task of phaseTasks || []) {
        const start = toComparableDate(task?.start_date || task?.due_date);
        const end = toComparableDate(task?.due_date || task?.start_date);
        if (start && (!min || start < min)) min = start;
        if (end && (!max || end > max)) max = end;
    }
    return { min, max };
}

function normalizeImpactDateRange(impact) {
    const start = toComparableDate(impact?.start_date);
    const end = toComparableDate(impact?.end_date || impact?.start_date);
    if (!start) return null;
    if (!end || end < start) return { start, end: start };
    return { start, end };
}

function businessDaysInInclusiveRange(start, end) {
    const days = [];
    const cursor = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    while (cursor <= endDate) {
        const day = cursor.getDay();
        if (day !== 0 && day !== 6) {
            days.push(cursor.toISOString().slice(0, 10));
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return days;
}

function consolidateOverlappingImpacts(impacts) {
    const normalized = (impacts || [])
        .map((impact) => {
            const range = normalizeImpactDateRange(impact);
            if (!range) return null;
            return { impact, ...range };
        })
        .filter(Boolean)
        .sort((a, b) => {
            if (a.start !== b.start) return a.start.localeCompare(b.start);
            return a.end.localeCompare(b.end);
        });

    if (normalized.length === 0) return [];

    const groups = [];
    let current = {
        start: normalized[0].start,
        end: normalized[0].end,
        items: [normalized[0].impact],
    };

    for (let i = 1; i < normalized.length; i += 1) {
        const next = normalized[i];
        if (next.start <= current.end) {
            current.end = next.end > current.end ? next.end : current.end;
            current.items.push(next.impact);
        } else {
            groups.push(current);
            current = { start: next.start, end: next.end, items: [next.impact] };
        }
    }
    groups.push(current);

    return groups.map((group) => {
        if (group.items.length === 1) {
            return group.items[0];
        }
        const uniqueBusinessDays = new Set();
        group.items.forEach((impact) => {
            const range = normalizeImpactDateRange(impact);
            if (!range) return;
            businessDaysInInclusiveRange(range.start, range.end).forEach((day) => uniqueBusinessDays.add(day));
        });
        const titles = group.items
            .map((impact) => String(impact.title || '').trim())
            .filter(Boolean);
        const combinedTitle = titles.length > 0 ? titles.join(', ') : `${group.items.length} overlapping weather delays`;
        return {
            ...group.items[0],
            id: `weather-group-${group.start}-${group.end}-${group.items.length}`,
            title: combinedTitle,
            start_date: group.start,
            end_date: group.end,
            days_lost: uniqueBusinessDays.size,
            is_grouped: true,
            grouped_count: group.items.length,
            source_impacts: group.items,
        };
    });
}

/**
 * Interleave weather rows into a phase's tasks.
 * A weather impact is shown in each phase where impact.start_date falls inside that phase's task window.
 *
 * @param {Array} phaseTasks — tasks in this phase, in display order
 * @param {Array} impacts — project weather impacts
 */
export function mergeWeatherIntoPhaseTasks(phaseTasks, impacts) {
    const rows = [];
    const { min: phaseStart, max: phaseEnd } = phaseTaskWindow(phaseTasks);
    const weatherInPhaseWindow =
        phaseStart && phaseEnd
            ? (impacts || []).filter((w) => {
                  const date = toComparableDate(w?.start_date);
                  return Boolean(date && date >= phaseStart && date <= phaseEnd);
              })
            : [];
    const weather = consolidateOverlappingImpacts(weatherInPhaseWindow).sort((a, b) =>
        String(a.start_date).localeCompare(String(b.start_date))
    );
    let wi = 0;
    const taskKey = (t) => t?.due_date || t?.start_date || '9999-12-31';

    for (let i = 0; i < phaseTasks.length; i += 1) {
        const task = phaseTasks[i];
        const k = taskKey(task);
        while (wi < weather.length && String(weather[wi].start_date) < k) {
            const imp = weather[wi];
            wi += 1;
            rows.push({ kind: 'weather', impact: imp });
        }
        rows.push({ kind: 'task', task });
    }
    while (wi < weather.length) {
        const imp = weather[wi];
        wi += 1;
        rows.push({ kind: 'weather', impact: imp });
    }
    return rows;
}
