import React, { useState, memo } from 'react';
import Icon from './Icon';
import DateDropdown from './DateDropdown';
import PermissionGuard from './PermissionGuard';
import { addDaysIso, localDateIso } from '../utils/dateHelpers';
import Avatar from './Avatar';

const TaskItem = memo(function TaskItem({ task, onToggle, onEdit, onDelete, isSelected, onSelect, onOpenPhotos = null }) {
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

    if (isEditing) {
        return (
            <li className="p-3 rounded-xl bg-blue-50/90 border border-blue-200">
                <div className="space-y-3">
                    <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                        placeholder="Task description"
                    />
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                const t = localDateIso();
                                setEditStartDate(t);
                                setEditDueDate(t);
                            }}
                            className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
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
                            className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
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
                            className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                            +2 weeks
                        </button>
                    </div>
                    <div className="flex gap-3 items-end flex-wrap">
                        <div className="flex-1 min-w-[120px]">
                            <DateDropdown 
                                compact
                                value={editStartDate} 
                                onChange={setEditStartDate}
                                label="Start Date"
                            />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                            <DateDropdown 
                                compact
                                value={editDueDate} 
                                onChange={setEditDueDate}
                                label="End Date"
                            />
                        </div>
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
                isSelected ? 'bg-blue-50 border border-blue-200' : task.completed ? '' : 'border border-slate-100 bg-white/80 hover:bg-slate-50'
            } ${task.completed ? 'bg-emerald-50/40 hover:bg-emerald-50/60 border-l-4 border-l-emerald-500' : ''}`}
            role="listitem"
            aria-label={`Task: ${task.text}, Priority: ${task.priority}, Start: ${formatDate(task.start_date)}, End: ${formatDate(task.due_date)}`}
        >
            <div className="flex items-center gap-4">
                {/* Always show completion checkbox that directly toggles task completion */}
                <div className="relative">
                    <input 
                        type="checkbox" 
                        checked={task.completed} 
                        onChange={() => onToggle(task.id, task.completed)}
                        className={`h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all ${
                            task.completed ? 'hover:scale-105 hover:shadow-xs' : ''
                        }`}
                        title={task.completed ? 'Click to uncomplete task' : 'Click to complete task'}
                        aria-label={task.completed ? `Mark task as incomplete: ${task.text}` : `Mark task as complete: ${task.text}`}
                    />
                    {task.completed && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <p className={`font-semibold transition-all ${task.completed ? 'line-through text-gray-400' : ''}`}>
                        {task.text}
                    </p>
                    <p className={`text-sm transition-all ${task.completed ? 'text-gray-400' : 'text-gray-500'}`}>
                        {task.start_date && <span>Start: {formatDate(task.start_date)}</span>}
                        {task.start_date && task.due_date && ' · '}
                        {task.due_date && <span>End: {formatDate(task.due_date)}</span>}
                        {!task.start_date && !task.due_date && 'No dates'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-4">
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