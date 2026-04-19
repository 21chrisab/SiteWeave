import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import LoadingSpinner from './LoadingSpinner';
import DateDropdown from './DateDropdown';
import { validateRecurrence } from '../utils/recurrenceService';
import PermissionGuard from './PermissionGuard';
import TaskPhotoManager from './TaskPhotoManager';
import { buildTaskPhotoDraft, revokeTaskPhotoDraftUrls, canManageTaskPhotos } from '../utils/taskPhotoUtils';

function TaskModal({ project, projectPhases = [], onClose, onSave, isLoading = false, photoUploadProgress = null, allTasks = [] }) {
    const { state } = useAppContext();
    const [text, setText] = useState('');
    const [startDate, setStartDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [phaseId, setPhaseId] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    
    // Recurrence state
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

    // Get contacts assigned to this project
    const projectContacts = contacts.filter(contact =>
        contact.project_contacts && contact.project_contacts.some(pc => pc.project_id === project.id)
    );
    
    // Also include org admins even if not in project_contacts
    // This allows org admins to be assigned tasks on any project in their organization
    const orgAdmins = contacts.filter(contact =>
        contact.is_internal &&
        contact.organization_id === project.organization_id &&
        contact.role_name &&
        contact.role_name.toLowerCase() === 'org admin'
    );
    
    // Combine and deduplicate by contact id
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
        
        // Build recurrence JSON if recurring
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
        
        // Ensure assignee_id is either null or a valid UUID
        let validAssigneeId = null;
        if (assigneeId && assigneeId.trim() !== '') {
            // Validate it's a valid UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(assigneeId)) {
                // Verify the contact exists in assignable contacts (project contacts or org admins)
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


    return (
        <div className="fixed inset-0 backdrop-blur-[2px] bg-white/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl">
                <h2 className="text-2xl font-bold mb-6">Create New Task for {project.name}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
                        <div>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-1 text-gray-600">Task Description</label>
                                <input type="text" value={text} onChange={e => setText(e.target.value)} className="w-full p-2 border rounded-lg" required />
                            </div>
                            <DateDropdown 
                                value={startDate} 
                                onChange={setStartDate} 
                                label="Start Date"
                                className="mb-4"
                            />
                            <DateDropdown 
                                value={dueDate} 
                                onChange={setDueDate} 
                                label="End Date"
                                className="mb-4"
                            />
                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-1 text-gray-600">Priority</label>
                                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>
                            {projectPhases.length > 0 && (
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-1 text-gray-600">Phase</label>
                                    <select
                                        value={phaseId}
                                        onChange={(e) => setPhaseId(e.target.value)}
                                        className="w-full p-2 border rounded-lg bg-white"
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
                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-1 text-gray-600">Dependencies (Finish-to-Start)</label>
                                <select
                                    multiple
                                    value={selectedPredecessorTaskIds}
                                    onChange={(e) => {
                                        const values = Array.from(e.target.selectedOptions).map((option) => option.value);
                                        setSelectedPredecessorTaskIds(values);
                                    }}
                                    className="w-full p-2 border rounded-lg bg-white min-h-[96px]"
                                >
                                    {allTasks.map((task) => (
                                        <option key={task.id} value={task.id}>{task.text}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Selected tasks must finish before this new task can start.
                                </p>
                            </div>
                            <PermissionGuard permission="can_assign_tasks">
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold mb-1 text-gray-600">Assignee</label>
                                    <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
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
                                        <p className="text-xs text-gray-500 mt-1">
                                            Add team members to this project first using the "+ Add Team Member" button
                                        </p>
                                    )}
                                </div>
                            </PermissionGuard>
                        </div>

                        <div>
                            <TaskPhotoManager
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
                    
                    {/* Recurrence Section */}
                    <div className="mb-6 space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="isRecurringTask" 
                                checked={isRecurring} 
                                onChange={e => setIsRecurring(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="isRecurringTask" className="text-sm font-semibold text-gray-600">Repeat Task</label>
                        </div>

                        {isRecurring && (
                            <div className="ml-6 space-y-4 bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1 text-gray-600">Pattern</label>
                                        <select 
                                            value={recurrencePattern} 
                                            onChange={e => setRecurrencePattern(e.target.value)}
                                            className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                            <option value="weekdays">Weekdays (Mon-Fri)</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold mb-1 text-gray-600">Repeat Every</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={recurrenceInterval} 
                                                onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                                                className="w-20 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                        <label className="block text-sm font-semibold mb-2 text-gray-600">Days of Week</label>
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
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                        recurrenceDaysOfWeek.includes(day.value)
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {day.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-600">End</label>
                                    <select 
                                        value={recurrenceEndType} 
                                        onChange={e => setRecurrenceEndType(e.target.value)}
                                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 mb-2"
                                    >
                                        <option value="never">Never</option>
                                        <option value="until">Until date</option>
                                        <option value="after">After N occurrences</option>
                                    </select>

                                    {recurrenceEndType === 'until' && (
                                        <input 
                                            type="date" 
                                            value={recurrenceEndDate} 
                                            onChange={e => setRecurrenceEndDate(e.target.value)}
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    )}

                                    {recurrenceEndType === 'after' && (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={recurrenceOccurrences} 
                                                onChange={e => setRecurrenceOccurrences(parseInt(e.target.value) || 1)}
                                                className="w-24 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} disabled={isLoading} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isLoading || isPreparingPhotos} className="px-6 py-2 text-white bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-2">
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