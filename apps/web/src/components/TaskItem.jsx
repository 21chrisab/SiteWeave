import React, { useState, memo, useMemo, useCallback, useEffect, useRef } from 'react';
import Icon from './Icon';
import DateRangePicker from './DateRangePicker';
import PermissionGuard from './PermissionGuard';
import { addDaysIso, localDateIso } from '../utils/dateHelpers';
import Avatar from './Avatar';

const PERCENT_PRESETS = [0, 25, 50, 75, 100];

const percentFieldClass =
  'w-16 select-text rounded border border-gray-200 bg-white px-2 py-0.5 text-xs tabular-nums text-gray-700 [-moz-appearance:textfield] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

const TaskItem = memo(function TaskItem({
    task,
    onEdit,
    onDelete,
    isSelected,
    onSelect,
    onOpenPhotos = null,
    onPingAssignee = null,
    pingingTaskId = null,
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(task.text);
    const [editStartDate, setEditStartDate] = useState(task.start_date || '');
    const [editDueDate, setEditDueDate] = useState(task.due_date || '');
    const [editPriority, setEditPriority] = useState(task.priority);
    
    
    const priorityClasses = {
        High: 'bg-red-100 text-red-700', 
        Medium: 'bg-yellow-100 text-yellow-700', 
        Low: 'bg-blue-100 text-blue-700'
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return 'No due date';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };
    const progressPercent = Math.max(0, Math.min(100, Number(task.percent_complete ?? (task.completed ? 100 : 0)) || 0));
    const isComplete = task.completed || progressPercent >= 100;

    /** null = show committed value from task; string = in-progress edit */
    const [percentDraft, setPercentDraft] = useState(null);
    const skipPercentBlurCommitRef = useRef(false);

    const commitPercentDraft = useCallback(() => {
        const raw = percentDraft !== null ? percentDraft : String(progressPercent);
        const n = Math.max(0, Math.min(100, parseInt(String(raw).trim(), 10) || 0));
        if (n !== progressPercent) {
            onEdit(task.id, {
                percent_complete: n,
                completed: n >= 100,
            });
        }
        setPercentDraft(null);
    }, [percentDraft, progressPercent, task.id, onEdit]);

    const cancelPercentDraft = useCallback(() => {
        setPercentDraft(null);
    }, []);

    useEffect(() => {
        setPercentDraft(null);
    }, [task.id]);

    const handleSaveEdit = () => {
        onEdit(task.id, {
            text: editText,
            start_date: editStartDate || null,
            due_date: editDueDate || null,
            priority: editPriority
        });
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditText(task.text);
        setEditStartDate(task.start_date || '');
        setEditDueDate(task.due_date || '');
        setEditPriority(task.priority);
        setIsEditing(false);
    };

    const dateRangePresets = useMemo(
        () => (
            <>
                <button
                    type="button"
                    onClick={() => {
                        const t = localDateIso();
                        setEditStartDate(t);
                        setEditDueDate(t);
                    }}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-100"
                >
                    Today
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const t = localDateIso();
                        setEditStartDate((s) => s || t);
                        setEditDueDate(addDaysIso(t, 7) || t);
                    }}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-100"
                >
                    +1 week
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const t = localDateIso();
                        setEditStartDate((s) => s || t);
                        setEditDueDate(addDaysIso(t, 14) || t);
                    }}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-100"
                >
                    +2 weeks
                </button>
            </>
        ),
        []
    );

    if (isEditing) {
        return (
            <li className="p-3 rounded-xl bg-blue-50/90 border border-blue-200 overflow-visible">
                <div className="space-y-3">
                    <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                        placeholder="Task description"
                    />
                    <div className="overflow-visible">
                        <DateRangePicker
                            size="sm"
                            compact
                            label="Schedule"
                            startValue={editStartDate}
                            endValue={editDueDate}
                            onChange={({ start, end }) => {
                                setEditStartDate(start);
                                setEditDueDate(end);
                            }}
                            presets={dateRangePresets}
                        />
                    </div>
                    <div className="flex gap-3 items-end flex-wrap">
                        <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value)}
                            className="p-2 border rounded-lg bg-white h-[42px]"
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                            Save
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </li>
        );
    }

    return (
        <li 
            className={`flex items-center justify-between p-3 rounded-xl group transition-all animate-slide-in ${
                isSelected ? 'bg-blue-50 border border-blue-200' : isComplete ? '' : 'border border-slate-100 bg-white/80 hover:bg-slate-50'
            } ${isComplete ? 'bg-emerald-50/40 hover:bg-emerald-50/60 border-l-4 border-l-emerald-500' : ''}`}
            role="listitem"
            aria-label={`Task: ${task.text}, ${progressPercent}% complete, Priority: ${task.priority}, Start: ${formatDate(task.start_date)}, End: ${formatDate(task.due_date)}`}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <PermissionGuard
                    permission="can_edit_tasks"
                    fallback={
                        <span className="shrink-0 tabular-nums text-xs font-semibold text-gray-600 w-12 text-right" title="Percent complete">
                            {progressPercent}%
                        </span>
                    }
                >
                    <div className="flex shrink-0 flex-col gap-1" title="Percent complete (100% marks task done)">
                        <label className="flex items-center gap-1 text-xs text-gray-500">
                            <input
                                type="text"
                                draggable={false}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="off"
                                value={percentDraft !== null ? percentDraft : String(progressPercent)}
                                onFocus={() => setPercentDraft(String(progressPercent))}
                                onChange={(e) => {
                                    const next = e.target.value;
                                    if (next !== '' && !/^\d+$/.test(next)) return;
                                    if (next.length > 3) return;
                                    if (next !== '' && Number(next) > 100) return;
                                    setPercentDraft(next);
                                }}
                                onBlur={() => {
                                    if (skipPercentBlurCommitRef.current) {
                                        skipPercentBlurCommitRef.current = false;
                                        return;
                                    }
                                    commitPercentDraft();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        commitPercentDraft();
                                        e.currentTarget.blur();
                                    } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        skipPercentBlurCommitRef.current = true;
                                        cancelPercentDraft();
                                        e.currentTarget.blur();
                                    }
                                }}
                                className={percentFieldClass}
                                aria-label={`Percent complete for ${task.text}`}
                            />
                            <span className="text-gray-400">%</span>
                        </label>
                        <div className="flex max-w-[7.5rem] flex-nowrap gap-0.5 overflow-x-auto">
                            {PERCENT_PRESETS.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onMouseDown={(ev) => ev.preventDefault()}
                                    onClick={(ev) => {
                                        ev.stopPropagation();
                                        onEdit(task.id, {
                                            percent_complete: p,
                                            completed: p >= 100,
                                        });
                                        setPercentDraft(null);
                                    }}
                                    className={`rounded px-1 py-0.5 text-[10px] font-medium tabular-nums transition-colors ${
                                        progressPercent === p
                                            ? 'bg-blue-600 text-white'
                                            : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </PermissionGuard>
                <div className="flex-1 min-w-0">
                    <p className={`font-semibold transition-all ${isComplete ? 'line-through text-gray-400' : ''}`}>
                        {task.text}
                    </p>
                    <p className={`text-sm transition-all ${isComplete ? 'text-gray-400' : 'text-gray-500'}`}>
                        {task.start_date && <span>Start: {formatDate(task.start_date)}</span>}
                        {task.start_date && task.due_date && ' · '}
                        {task.due_date && <span>End: {formatDate(task.due_date)}</span>}
                        {!task.start_date && !task.due_date && 'No dates'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${priorityClasses[task.priority]}`}>{task.priority}</span>
                {task.contacts && (
                    task.contacts.avatar_url ? (
                        <img
                            src={task.contacts.avatar_url}
                            alt=""
                            title={task.contacts.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                    ) : (
                        <span title={task.contacts.name}>
                            <Avatar name={task.contacts.name} size="md" />
                        </span>
                    )
                )}
                {onPingAssignee &&
                    task.assignee_id &&
                    task.contacts?.email &&
                    String(task.contacts.email).includes('@') && (
                        <PermissionGuard permission="can_assign_tasks">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPingAssignee(task);
                                }}
                                disabled={pingingTaskId === task.id}
                                className="shrink-0 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 shadow-xs transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Email a reminder to the assignee now"
                                aria-label={`Ping assignee for task: ${task.text}`}
                            >
                                <Icon
                                    path="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405z"
                                    className="h-4 w-4"
                                />
                            </button>
                        </PermissionGuard>
                    )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" role="group" aria-label="Task actions">
                    {onOpenPhotos && (
                        <button
                            onClick={() => onOpenPhotos(task.id)}
                            className="p-1 text-gray-500 hover:text-indigo-600"
                            title="Manage task photos"
                            aria-label={`Manage photos for task: ${task.text}`}
                        >
                            <Icon path="M3 16.5V7.5A1.5 1.5 0 014.5 6h3.879a1.5 1.5 0 001.06-.44l1.122-1.12A1.5 1.5 0 0111.621 4H19.5A1.5 1.5 0 0121 5.5v11A1.5 1.5 0 0119.5 18h-15A1.5 1.5 0 013 16.5zM8.25 12.75l1.5 1.5 2.5-2.5 3 3" className="w-4 h-4" />
                        </button>
                    )}
                    <PermissionGuard permission="can_edit_tasks">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-1 text-gray-500 hover:text-blue-600"
                            title="Edit task"
                            aria-label={`Edit task: ${task.text}`}
                        >
                            <Icon path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" className="w-4 h-4" />
                        </button>
                    </PermissionGuard>
                    <PermissionGuard permission="can_delete_tasks">
                        <button
                            onClick={() => onDelete(task.id)}
                            className="p-1 text-gray-500 hover:text-red-600"
                            title="Delete task"
                            aria-label={`Delete task: ${task.text}`}
                        >
                            <Icon path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" className="w-4 h-4" />
                        </button>
                    </PermissionGuard>
                </div>
            </div>
        </li>
    );
});

export default TaskItem;