import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import LoadingSpinner from './LoadingSpinner';
import DateDropdown from './DateDropdown';
import DateRangePicker from './DateRangePicker';
import TaskDependencyCombobox from './TaskDependencyCombobox';
import { validateRecurrence } from '../utils/recurrenceService';
import { addDaysIso, localDateIso } from '../utils/dateHelpers';
import PermissionGuard from './PermissionGuard';
import TaskPhotoManager from './TaskPhotoManager';
import { buildTaskPhotoDraft, revokeTaskPhotoDraftUrls, canManageTaskPhotos } from '../utils/taskPhotoUtils';

const fieldClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-xs transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const labelClass = 'block text-xs font-medium text-gray-600 mb-1.5';
const selectClass = `${fieldClass} cursor-pointer appearance-none bg-white`;
const chipClass =
    'rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

function TaskModal({ project, projectPhases = [], onClose, onSave, isLoading = false, photoUploadProgress = null, allTasks = [] }) {
    const { state } = useAppContext();
    const [text, setText] = useState('');
    const [startDate, setStartDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [phaseId, setPhaseId] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrencePattern, setRecurrencePattern] = useState('weekly');
    const [recurrenceInterval, setRecurrenceInterval] = useState(1);
    const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState([1, 3, 5]);
    const [recurrenceEndType, setRecurrenceEndType] = useState('never');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
    const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(10);
    const [pendingPhotos, setPendingPhotos] = useState([]);
    const [isPreparingPhotos, setIsPreparingPhotos] = useState(false);
    const [selectedPredecessorTaskIds, setSelectedPredecessorTaskIds] = useState([]);
    const pendingPhotosRef = useRef([]);

    const contacts = state.contacts || [];

    const canManagePhotos = canManageTaskPhotos({
        project,
        userId: state.user?.id,
        userContactId: state.userContactId,
        userRoleName: state.userRole?.name,
        canEditTasks: state.userRole?.permissions?.can_edit_tasks === true,
        assigneeContactId: assigneeId || null,
    });

    const projectContacts = contacts.filter(contact =>
        contact.project_contacts && contact.project_contacts.some(pc => pc.project_id === project.id)
    );
    
    const orgAdmins = contacts.filter(contact =>
        contact.is_internal &&
        contact.organization_id === project.organization_id &&
        contact.role_name &&
        contact.role_name.toLowerCase() === 'org admin'
    );
    
    const allAssignableContacts = [
        ...projectContacts,
        ...orgAdmins.filter(admin => !projectContacts.some(pc => pc.id === admin.id))
    ];

    useEffect(() => {
        pendingPhotosRef.current = pendingPhotos;
    }, [pendingPhotos]);

    useEffect(() => () => revokeTaskPhotoDraftUrls(pendingPhotosRef.current), []);

    const handleAddPhotos = async (files) => {
        setIsPreparingPhotos(true);
        try {
            const nextPhotos = await Promise.all(files.map((file, index) =>
                buildTaskPhotoDraft(file, pendingPhotos.length + index)
            ));
            setPendingPhotos((prev) => [...prev, ...nextPhotos]);
        } catch (error) {
            alert(error.message || 'Could not prepare one or more task photos.');
        } finally {
            setIsPreparingPhotos(false);
        }
    };

    const handleUpdatePendingPhoto = (photoId, updates) => {
        setPendingPhotos((prev) => prev.map((photo) =>
            photo.local_id === photoId ? { ...photo, ...updates } : photo
        ));
    };

    const handleDeletePendingPhoto = (photoId) => {
        setPendingPhotos((prev) => {
            const target = prev.find((photo) => photo.local_id === photoId);
            if (target) {
                revokeTaskPhotoDraftUrls([target]);
            }
            return prev.filter((photo) => photo.local_id !== photoId)
                .map((photo, index) => ({ ...photo, sort_order: index }));
        });
    };

    const handleMovePendingPhoto = (photoId, direction) => {
        setPendingPhotos((prev) => {
            const currentIndex = prev.findIndex((photo) => photo.local_id === photoId);
            const nextIndex = currentIndex + direction;
            if (currentIndex < 0 || nextIndex < 0 || nextIndex >= prev.length) {
                return prev;
            }
            const nextPhotos = [...prev];
            const [moved] = nextPhotos.splice(currentIndex, 1);
            nextPhotos.splice(nextIndex, 0, moved);
            return nextPhotos.map((photo, index) => ({ ...photo, sort_order: index }));
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        let recurrenceJson = null;
        if (isRecurring) {
            const recurrence = {
                pattern: recurrencePattern,
                interval: recurrenceInterval,
                daysOfWeek: recurrencePattern === 'weekly' ? recurrenceDaysOfWeek : undefined,
                endType: recurrenceEndType,
                endDate: recurrenceEndType === 'until' ? recurrenceEndDate : undefined,
                occurrences: recurrenceEndType === 'after' ? recurrenceOccurrences : undefined
            };
            
            const validation = validateRecurrence(recurrence);
            if (!validation.valid) {
                alert(validation.error);
                return;
            }
            
            recurrenceJson = JSON.stringify(recurrence);
        }
        
        let validAssigneeId = null;
        if (assigneeId && assigneeId.trim() !== '') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(assigneeId)) {
                const contactExists = allAssignableContacts.some(c => c.id === assigneeId);
                if (contactExists) {
                    validAssigneeId = assigneeId;
                } else {
                    console.warn('Selected assignee not found in project contacts, setting to null');
                }
            }
        }
        
        onSave({
            project_id: project.id,
            text,
            start_date: startDate || null,
            due_date: dueDate || null,
            priority,
            project_phase_id: phaseId || null,
            percent_complete: 0,
            assignee_id: validAssigneeId,
            recurrence: recurrenceJson,
            completed: false,
            pending_photos: pendingPhotos.map((photo, index) => ({
                ...photo,
                sort_order: index,
            })),
            predecessor_task_ids: selectedPredecessorTaskIds,
        });
    };

    const datePresets = (
        <>
            <button
                type="button"
                onClick={() => {
                    const t = localDateIso();
                    setStartDate(t);
                    setDueDate(t);
                }}
                className={chipClass}
            >
                Today
            </button>
            <button
                type="button"
                onClick={() => {
                    const t = localDateIso();
                    setStartDate((s) => s || t);
                    setDueDate(addDaysIso(t, 7) || t);
                }}
                className={chipClass}
            >
                +1 week
            </button>
            <button
                type="button"
                onClick={() => {
                    const t = localDateIso();
                    setStartDate((s) => s || t);
                    setDueDate(addDaysIso(t, 14) || t);
                }}
                className={chipClass}
            >
                +2 weeks
            </button>
        </>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4 backdrop-blur-[2px]">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl sm:p-8">
                <h2 className="mb-6 text-xl font-semibold tracking-tight text-gray-900">
                    Create New Task for {project.name}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-8 lg:grid-cols-[1fr,minmax(280px,340px)]">
                        <div className="min-w-0 space-y-5">
                            <div>
                                <label className={labelClass} htmlFor="task-modal-description">Task Description</label>
                                <input
                                    id="task-modal-description"
                                    type="text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    className={fieldClass}
                                    required
                                />
                            </div>

                            <DateRangePicker
                                label="Schedule"
                                startValue={startDate}
                                endValue={dueDate}
                                onChange={({ start, end }) => {
                                    setStartDate(start);
                                    setDueDate(end);
                                }}
                                presets={datePresets}
                            />

                            <div>
                                <p className={labelClass}>Task photos</p>
                                <TaskPhotoManager
                                    className="!mt-0"
                                    photos={pendingPhotos}
                                    editable={canManagePhotos}
                                    isBusy={isPreparingPhotos || isLoading}
                                    uploadProgress={photoUploadProgress}
                                    onAddFiles={handleAddPhotos}
                                    onUpdatePhoto={handleUpdatePendingPhoto}
                                    onDeletePhoto={handleDeletePendingPhoto}
                                    onMovePhoto={handleMovePendingPhoto}
                                    emptyMessage="Add field photos now or later."
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    Photos are optimized on upload. Mark any that should count as completion evidence.
                                </p>
                            </div>
                        </div>

                        <aside className="h-fit space-y-4 rounded-xl border border-gray-200 bg-gray-50/90 p-5 lg:sticky lg:top-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Details</p>

                            <PermissionGuard permission="can_assign_tasks">
                                <div>
                                    <label className={labelClass} htmlFor="task-modal-assignee">Assignee</label>
                                    <select
                                        id="task-modal-assignee"
                                        value={assigneeId}
                                        onChange={(e) => setAssigneeId(e.target.value)}
                                        className={selectClass}
                                    >
                                        <option value="">Unassigned</option>
                                        {allAssignableContacts.length > 0 ? (
                                            allAssignableContacts.map(contact => (
                                                <option key={contact.id} value={contact.id}>
                                                    {contact.name}
                                                    {orgAdmins.some(admin => admin.id === contact.id) && !projectContacts.some(pc => pc.id === contact.id) && ' (Admin)'}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="" disabled>No team members assigned to this project</option>
                                        )}
                                    </select>
                                    {allAssignableContacts.length === 0 && (
                                        <p className="mt-1.5 text-xs text-gray-500">
                                            Add team members to this project first using the &quot;+ Add Team Member&quot; button
                                        </p>
                                    )}
                                </div>
                            </PermissionGuard>

                            {projectPhases.length > 0 && (
                                <div>
                                    <label className={labelClass} htmlFor="task-modal-phase">Phase</label>
                                    <select
                                        id="task-modal-phase"
                                        value={phaseId}
                                        onChange={(e) => setPhaseId(e.target.value)}
                                        className={selectClass}
                                    >
                                        <option value="">Unassigned</option>
                                        {projectPhases.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className={labelClass} htmlFor="task-modal-priority">Priority</label>
                                <select
                                    id="task-modal-priority"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className={selectClass}
                                >
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>

                            <TaskDependencyCombobox
                                allTasks={allTasks}
                                selectedIds={selectedPredecessorTaskIds}
                                onChange={setSelectedPredecessorTaskIds}
                                inputClassName={fieldClass}
                            />
                        </aside>
                    </div>
                    
                    <div className="mt-8 space-y-4 border-t border-gray-200 pt-6">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="isRecurringTask" 
                                checked={isRecurring} 
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="isRecurringTask" className="text-sm font-medium text-gray-600">Repeat Task</label>
                        </div>

                        {isRecurring && (
                            <div className="ml-0 space-y-4 rounded-lg border border-gray-200 bg-gray-50/80 p-4 sm:ml-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass}>Pattern</label>
                                        <select 
                                            value={recurrencePattern} 
                                            onChange={(e) => setRecurrencePattern(e.target.value)}
                                            className={selectClass}
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                            <option value="weekdays">Weekdays (Mon-Fri)</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className={labelClass}>Repeat Every</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={recurrenceInterval} 
                                                onChange={(e) => setRecurrenceInterval(parseInt(e.target.value, 10) || 1)}
                                                className={`${fieldClass} w-20`}
                                            />
                                            <span className="text-sm text-gray-600">
                                                {recurrencePattern === 'daily' ? 'day(s)' : 
                                                 recurrencePattern === 'weekly' ? 'week(s)' :
                                                 recurrencePattern === 'monthly' ? 'month(s)' :
                                                 recurrencePattern === 'yearly' ? 'year(s)' : 'time(s)'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {recurrencePattern === 'weekly' && (
                                    <div>
                                        <label className={`${labelClass} mb-2`}>Days of Week</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { value: 0, label: 'Sun' },
                                                { value: 1, label: 'Mon' },
                                                { value: 2, label: 'Tue' },
                                                { value: 3, label: 'Wed' },
                                                { value: 4, label: 'Thu' },
                                                { value: 5, label: 'Fri' },
                                                { value: 6, label: 'Sat' }
                                            ].map(day => (
                                                <button
                                                    key={day.value}
                                                    type="button"
                                                    onClick={() => {
                                                        if (recurrenceDaysOfWeek.includes(day.value)) {
                                                            setRecurrenceDaysOfWeek(recurrenceDaysOfWeek.filter(d => d !== day.value));
                                                        } else {
                                                            setRecurrenceDaysOfWeek([...recurrenceDaysOfWeek, day.value].sort());
                                                        }
                                                    }}
                                                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                                                        recurrenceDaysOfWeek.includes(day.value)
                                                            ? 'bg-blue-600 text-white'
                                                            : 'border border-gray-200 bg-white text-gray-700 shadow-xs hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {day.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className={labelClass}>End</label>
                                    <select 
                                        value={recurrenceEndType} 
                                        onChange={(e) => setRecurrenceEndType(e.target.value)}
                                        className={`${selectClass} mb-2`}
                                    >
                                        <option value="never">Never</option>
                                        <option value="until">Until date</option>
                                        <option value="after">After N occurrences</option>
                                    </select>

                                    {recurrenceEndType === 'until' && (
                                        <DateDropdown
                                            value={recurrenceEndDate}
                                            onChange={setRecurrenceEndDate}
                                            label="Until date"
                                            className="mt-1"
                                            compact
                                        />
                                    )}

                                    {recurrenceEndType === 'after' && (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={recurrenceOccurrences} 
                                                onChange={(e) => setRecurrenceOccurrences(parseInt(e.target.value, 10) || 1)}
                                                className={`${fieldClass} w-24`}
                                                required
                                            />
                                            <span className="text-sm text-gray-600">occurrences</span>
                                        </div>
                                    )}
                                </div>
                                
                                <p className="text-xs text-gray-500">
                                    When this task is completed, a new instance will be automatically created.
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-8 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || isPreparingPhotos}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-xs transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner size="sm" text="" />
                                    Adding...
                                </>
                            ) : isPreparingPhotos ? (
                                <>
                                    <LoadingSpinner size="sm" text="" />
                                    Preparing Photos...
                                </>
                            ) : (
                                'Add Task'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TaskModal;
