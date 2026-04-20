import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
    createWeatherImpact,
    listWeatherImpactsForProject,
    updateWeatherImpact,
} from '@siteweave/core-logic';
import { applyScheduleImpact, suggestScheduleImpactSelection } from '../utils/taskDependencyService';
import { logWeatherImpactRecorded, logWeatherImpactScheduleApplied } from '../utils/activityLogger';
import LoadingSpinner from './LoadingSpinner';
import DateDropdown from './DateDropdown';

/**
 * Modal: log weather / schedule impact, optionally shift task & phase dates with dependency cascade.
 */
function WeatherImpactModal({
    project,
    allTasks,
    projectPhases,
    taskDependencies,
    projectDependencyMode,
    onClose,
    onApplied,
}) {
    const { state } = useAppContext();
    const { addToast } = useToast();
    const user = state.user;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [impacts, setImpacts] = useState([]);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [daysLost, setDaysLost] = useState(1);
    const [applyScheduleShift, setApplyScheduleShift] = useState(false);
    const [applyCascade, setApplyCascade] = useState(false);

    const orgId = project?.organization_id;

    const loadImpacts = useCallback(async () => {
        if (!project?.id) return;
        setLoading(true);
        try {
            const rows = await listWeatherImpactsForProject(supabaseClient, project.id);
            setImpacts(rows);
        } catch (e) {
            console.error(e);
            addToast(e.message || 'Failed to load impacts', 'error');
        } finally {
            setLoading(false);
        }
    }, [project?.id, addToast]);

    useEffect(() => {
        loadImpacts();
    }, [loadImpacts]);

    const suggestedSelection = useMemo(
        () =>
            suggestScheduleImpactSelection({
                tasks: allTasks,
                phases: projectPhases,
                startDate,
                endDate,
            }),
        [allTasks, projectPhases, startDate, endDate]
    );

    const preview = useMemo(() => {
        const dl = Math.max(1, parseInt(String(daysLost), 10) || 1);
        const cascadeEffective = applyCascade && projectDependencyMode === 'auto';
        const { directTaskUpdates, directPhaseUpdates, cascadeTaskUpdates } = applyScheduleImpact({
            tasks: allTasks,
            dependencies: taskDependencies,
            phases: projectPhases,
            selectedTaskIds: suggestedSelection.selectedTaskIds,
            selectedPhaseIds: suggestedSelection.selectedPhaseIds,
            daysLost: dl,
            cascade: cascadeEffective,
            dependencyMode: projectDependencyMode,
        });
        const taskById = new Map(allTasks.map((task) => [task.id, task]));
        const phaseById = new Map(projectPhases.map((phase) => [phase.id, phase]));
        const previewRows = [
            ...directTaskUpdates.slice(0, 3).map((row) => ({
                id: row.taskId,
                label: taskById.get(row.taskId)?.text || 'Task',
                before: `${taskById.get(row.taskId)?.start_date || '—'} to ${taskById.get(row.taskId)?.due_date || '—'}`,
                after: `${row.start_date || taskById.get(row.taskId)?.start_date || '—'} to ${row.due_date || taskById.get(row.taskId)?.due_date || '—'}`,
            })),
            ...directPhaseUpdates.slice(0, 2).map((row) => ({
                id: row.phaseId,
                label: `Phase: ${phaseById.get(row.phaseId)?.name || 'Phase'}`,
                before: `${phaseById.get(row.phaseId)?.start_date || '—'} to ${phaseById.get(row.phaseId)?.end_date || '—'}`,
                after: `${row.start_date || phaseById.get(row.phaseId)?.start_date || '—'} to ${row.end_date || phaseById.get(row.phaseId)?.end_date || '—'}`,
            })),
        ];
        return {
            directTasks: directTaskUpdates.length,
            directPhases: directPhaseUpdates.length,
            cascadeTasks: cascadeTaskUpdates.length,
            previewRows,
        };
    }, [
        allTasks,
        taskDependencies,
        projectPhases,
        suggestedSelection.selectedTaskIds,
        suggestedSelection.selectedPhaseIds,
        daysLost,
        applyCascade,
        projectDependencyMode,
    ]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const dl = Math.max(1, parseInt(String(daysLost), 10) || 1);
        if (!title.trim()) {
            addToast('Please enter a title.', 'warning');
            return;
        }
        if (applyScheduleShift && !startDate && !endDate) {
            addToast('Provide a start or end date so affected tasks and phases can be suggested.', 'warning');
            return;
        }
        if (
            applyScheduleShift &&
            suggestedSelection.selectedTaskIds.length === 0 &&
            suggestedSelection.selectedPhaseIds.length === 0
        ) {
            addToast('No tasks or phases overlap this weather window. Adjust dates or log without schedule shift.', 'warning');
            return;
        }

        const affectedTaskIds = [...suggestedSelection.selectedTaskIds];
        const affectedPhaseIds = [...suggestedSelection.selectedPhaseIds];
        const cascadeEffective = applyCascade && projectDependencyMode === 'auto';

        setSaving(true);
        try {
            const row = await createWeatherImpact(supabaseClient, {
                organization_id: orgId,
                project_id: project.id,
                impact_type: 'weather',
                title: title.trim(),
                description: description.trim() || null,
                start_date: startDate || null,
                end_date: endDate || null,
                days_lost: dl,
                affected_task_ids: affectedTaskIds,
                affected_phase_ids: affectedPhaseIds,
                apply_cascade: cascadeEffective,
                schedule_shift_applied: false,
                created_by_user_id: user?.id || null,
            });

            await logWeatherImpactRecorded(row, user, project.id, orgId);

            if (applyScheduleShift) {
                const { directTaskUpdates, directPhaseUpdates, cascadeTaskUpdates } = applyScheduleImpact({
                    tasks: allTasks,
                    dependencies: taskDependencies,
                    phases: projectPhases,
                    selectedTaskIds: affectedTaskIds,
                    selectedPhaseIds: affectedPhaseIds,
                    daysLost: dl,
                    cascade: cascadeEffective,
                    dependencyMode: projectDependencyMode,
                });

                for (const u of directTaskUpdates) {
                    const payload = {};
                    if (u.start_date !== undefined) payload.start_date = u.start_date;
                    if (u.due_date !== undefined) payload.due_date = u.due_date;
                    const { error } = await supabaseClient.from('tasks').update(payload).eq('id', u.taskId);
                    if (error) throw error;
                }
                for (const u of cascadeTaskUpdates) {
                    const payload = {
                        start_date: u.start_date || null,
                        due_date: u.due_date || null,
                    };
                    const { error } = await supabaseClient.from('tasks').update(payload).eq('id', u.taskId);
                    if (error) throw error;
                }
                for (const u of directPhaseUpdates) {
                    const payload = {};
                    if (u.start_date !== undefined) payload.start_date = u.start_date;
                    if (u.end_date !== undefined) payload.end_date = u.end_date;
                    const { error } = await supabaseClient.from('project_phases').update(payload).eq('id', u.phaseId);
                    if (error) throw error;
                }

                const nowIso = new Date().toISOString();
                await updateWeatherImpact(supabaseClient, row.id, {
                    schedule_shift_applied: true,
                    applied_at: nowIso,
                });

                await logWeatherImpactScheduleApplied(
                    { ...row, schedule_shift_applied: true },
                    user,
                    project.id,
                    orgId,
                    {
                        tasks_direct: directTaskUpdates.length,
                        tasks_cascade: cascadeTaskUpdates.length,
                        phases: directPhaseUpdates.length,
                    }
                );

                addToast(
                    `Schedule updated: ${directTaskUpdates.length} task(s)${cascadeEffective ? `, ${cascadeTaskUpdates.length} dependent task(s)` : ''}, ${directPhaseUpdates.length} phase(s).`,
                    'success'
                );
            } else {
                addToast('Weather impact logged.', 'success');
            }

            onApplied?.();

            setTitle('');
            setDescription('');
            setStartDate('');
            setEndDate('');
            setDaysLost(1);
            setApplyScheduleShift(false);
            setApplyCascade(false);
            await loadImpacts();
            onClose?.();
        } catch (err) {
            console.error(err);
            addToast(err.message || 'Failed to save impact', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Weather / schedule impact</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(ev) => setTitle(ev.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        placeholder="e.g. Heavy rain — site closed"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Details (optional)</label>
                                    <textarea
                                        value={description}
                                        onChange={(ev) => setDescription(ev.target.value)}
                                        rows={3}
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        placeholder="What was affected and how…"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <DateDropdown
                                        label="Start date"
                                        value={startDate}
                                        onChange={setStartDate}
                                        className="mt-1"
                                    />
                                    <DateDropdown
                                        label="End date"
                                        value={endDate}
                                        onChange={setEndDate}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Calendar days lost</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={daysLost}
                                        onChange={(ev) => setDaysLost(parseInt(ev.target.value, 10) || 1)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>

                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                                        <input
                                            type="checkbox"
                                            checked={applyScheduleShift}
                                            onChange={(ev) => setApplyScheduleShift(ev.target.checked)}
                                        />
                                        Apply schedule shift now (auto-select impacted dates)
                                    </label>
                                    {applyScheduleShift && (
                                        <p className="mt-2 text-xs text-gray-600">
                                            Dependency mode: <strong>{projectDependencyMode}</strong>
                                            {projectDependencyMode === 'manual' && (
                                                <span> — downstream cascade is disabled. Fix dates manually or switch to Auto-shift in task settings.</span>
                                            )}
                                        </p>
                                    )}
                                </div>

                                {applyScheduleShift && (
                                    <>
                                        <p className="rounded border border-blue-100 bg-blue-50 p-2 text-xs text-blue-800">
                                            Suggested automatically from the weather date window:
                                            {' '}
                                            {suggestedSelection.selectedTaskIds.length}
                                            {' '}
                                            task(s),
                                            {' '}
                                            {suggestedSelection.selectedPhaseIds.length}
                                            {' '}
                                            phase(s).
                                        </p>
                                        <label className="flex items-center gap-2 text-sm text-gray-800">
                                            <input
                                                type="checkbox"
                                                checked={applyCascade}
                                                disabled={projectDependencyMode !== 'auto'}
                                                onChange={(ev) => setApplyCascade(ev.target.checked)}
                                            />
                                            Cascade to dependent tasks (finish-to-start)
                                        </label>
                                        <p className="text-xs text-gray-600">
                                            Preview: {preview.directTasks} task date row(s), {preview.directPhases} phase row(s)
                                            {projectDependencyMode === 'auto' && applyCascade
                                                ? `, up to ${preview.cascadeTasks} dependent task(s)`
                                                : ''}
                                            .
                                        </p>
                                        {preview.previewRows.length > 0 && (
                                            <div className="rounded border border-gray-200 bg-white p-2">
                                                <p className="mb-1 text-xs font-medium text-gray-700">Date preview</p>
                                                <ul className="space-y-1 text-xs text-gray-600">
                                                    {preview.previewRows.map((row) => (
                                                        <li key={row.id}>
                                                            <span className="font-medium text-gray-800">{row.label}</span>
                                                            {': '}
                                                            {row.before}
                                                            {' -> '}
                                                            {row.after}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {saving ? 'Saving…' : 'Save impact'}
                                    </button>
                                </div>
                            </form>

                            <div className="border-t border-gray-200 pt-4">
                                <h3 className="text-sm font-semibold text-gray-800 mb-2">Recent impacts</h3>
                                {impacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">None yet.</p>
                                ) : (
                                    <ul className="space-y-2 max-h-40 overflow-y-auto text-sm">
                                        {impacts.map((im) => (
                                            <li
                                                key={im.id}
                                                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                                            >
                                                <div className="font-medium text-gray-900">{im.title}</div>
                                                <div className="text-xs text-gray-600">
                                                    {im.days_lost} day(s) lost
                                                    {im.schedule_shift_applied ? ' · Schedule updated' : ' · Logged only'}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default WeatherImpactModal;
