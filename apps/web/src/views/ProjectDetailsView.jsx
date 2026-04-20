import React, { useState, useRef, useEffect } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
    attachTaskPhotoUrls,
    deleteTaskPhoto,
    fetchTaskPhotos,
    reorderTaskPhotos,
    updateTaskPhoto,
    uploadTaskPhotoSet,
} from '@siteweave/core-logic';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import TaskPhotosModal from '../components/TaskPhotosModal';
import ProjectSidebar from '../components/ProjectSidebar';
import ShareModal from '../components/ShareModal';
import SaveAsTemplateModal from '../components/SaveAsTemplateModal';
import ConfirmDialog from '../components/ConfirmDialog';
import TaskBulkActions from '../components/TaskBulkActions';
import FieldIssues from '../components/FieldIssues';
import Workflow from '../components/Workflow';
import Avatar from '../components/Avatar';
import PermissionGuard from '../components/PermissionGuard';
import ActivityHistoryPanel from '../components/ActivityHistoryPanel';
import WeatherImpactModal from '../components/WeatherImpactModal';
import { useTaskShortcuts } from '../hooks/useKeyboardShortcuts';
import { handleApiError, createOptimisticUpdate } from '../utils/errorHandling';
import { parseRecurrence } from '../utils/recurrenceService';
import { logTaskCreated, logTaskCompleted, logTaskUncompleted, logTaskUpdated, logTaskDeleted } from '../utils/activityLogger';
import { getCriticalPathTaskIds } from '../utils/criticalPath';
import { orderTasksForGantt } from '../utils/ganttOrdering';
import { buildTaskPhotoDraft, canManageTaskPhotos, revokeTaskPhotoDraftUrls, sortTaskPhotos } from '../utils/taskPhotoUtils';
import GanttChart from '../components/GanttChart';
import ProgressReportModal from '../components/ProgressReportModal';
import MsProjectImportModal from '../components/MsProjectImportModal';

function ProjectDetailsView({ routeTab = 'tasks', onTabChange = null }) {
    const { state, dispatch } = useAppContext();
    const { addToast } = useToast();
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [taskFilter, setTaskFilter] = useState('all'); // all, completed, pending
    const [taskSort, setTaskSort] = useState('due_date'); // due_date, priority
    const [activeTab, setActiveTab] = useState('tasks'); // tasks, gantt, fieldIssues, activity
    const [showShare, setShowShare] = useState(false);
    const [showProgressReportModal, setShowProgressReportModal] = useState(false);
    const [showMsProjectImportModal, setShowMsProjectImportModal] = useState(false);
    const [showWeatherImpactModal, setShowWeatherImpactModal] = useState(false);
    const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false);
    const [fieldIssuesCount, setFieldIssuesCount] = useState(0);
    const [photoModalTaskId, setPhotoModalTaskId] = useState(null);
    const [photoActionTaskIds, setPhotoActionTaskIds] = useState({});
    const [taskPhotoUploadProgress, setTaskPhotoUploadProgress] = useState(null);
    const [ganttTasks, setGanttTasks] = useState([]);
    const [ganttDependencies, setGanttDependencies] = useState([]);
    const [ganttCriticalCount, setGanttCriticalCount] = useState(0);
    const [ganttCriticalIds, setGanttCriticalIds] = useState([]);
    const [showCriticalPath, setShowCriticalPath] = useState(true);

    const routeToTabMap = {
        tasks: 'tasks',
        gantt: 'gantt',
        'field-issues': 'fieldIssues',
        fieldIssues: 'fieldIssues',
        activity: 'activity'
    };
    const tabToRouteMap = {
        tasks: 'tasks',
        gantt: 'gantt',
        fieldIssues: 'field-issues',
        activity: 'activity'
    };
    const setTabAndRoute = (nextTab) => {
        setActiveTab(nextTab);
        if (onTabChange) {
            const nextRouteTab = tabToRouteMap[nextTab] || 'tasks';
            onTabChange(nextRouteTab);
        }
    };

    useEffect(() => {
        const mapped = routeToTabMap[routeTab] || 'tasks';
        setActiveTab(mapped);
    }, [routeTab]);

    // Keyboard shortcuts
    useTaskShortcuts({
        createTask: () => setShowTaskModal(true),
        saveTask: () => {}, // Will be handled by individual task saves
        cancelEdit: () => setSelectedTasks([]),
        focusSearch: () => {
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) searchInput.focus();
        },
        filterTasks: (filter) => setTaskFilter(filter)
    });

    // Local list so nothing can overwrite it; keep in sync with fetch and add/edit/delete
    const [projectTasksList, setProjectTasksList] = useState([]);
    // Fetch project tasks and field issues count in parallel (avoids waterfall)
    useEffect(() => {
        if (!state.selectedProjectId) {
            setProjectTasksList([]);
            setFieldIssuesCount(0);
            return;
        }
        setProjectTasksList([]);
        const ac = new AbortController();
        (async () => {
            try {
                const [tasksResult, fieldIssuesResult] = await Promise.all([
                    supabaseClient
                        .from('tasks')
                        .select('*, contacts!fk_tasks_assignee_id(name, avatar_url), task_photos(*)')
                        .eq('project_id', state.selectedProjectId)
                        .order('due_date', { ascending: true, nullsFirst: false })
                        .order('id', { ascending: true }),
                    supabaseClient
                        .from('project_issues')
                        .select('id', { count: 'exact', head: true })
                        .eq('project_id', state.selectedProjectId)
                ]);
                if (ac.signal.aborted) return;
                const { data: tasks, error } = tasksResult;
                if (error) {
                    console.error('Error loading project tasks:', error);
                    return;
                }
                const list = tasks || [];
                if (!ac.signal.aborted) {
                    setProjectTasksList(list);
                    setFieldIssuesCount(fieldIssuesResult.count ?? 0);
                }
                const otherTasks = (state.tasks || []).filter(t => t.project_id !== state.selectedProjectId);
                dispatch({ type: 'SET_TASKS', payload: [...otherTasks, ...list] });
            } catch (e) {
                if (!ac.signal.aborted) console.error('Error loading project tasks:', e);
            }
        })();
        return () => ac.abort();
    }, [state.selectedProjectId]);

    // Gantt tab: fetch tasks and dependencies in parallel (no waterfall)
    useEffect(() => {
        if (activeTab !== 'gantt' || !state.selectedProjectId) return;
        const ac = new AbortController();
        (async () => {
            try {
                const projectId = state.selectedProjectId;
                const [tasksResult, depsResult] = await Promise.all([
                    supabaseClient
                        .from('tasks')
                        .select('id, text, start_date, due_date, duration_days, is_milestone, project_id, completed, parent_task_id, assignee_id, contacts!fk_tasks_assignee_id(name)')
                        .eq('project_id', projectId)
                        .order('start_date', { ascending: true, nullsFirst: true }),
                    supabaseClient
                        .from('task_dependencies_by_project')
                        .select('id, task_id, successor_task_id, dependency_type, lag_days')
                        .eq('project_id', projectId)
                ]);
                if (ac.signal.aborted) return;
                const { data: taskRows, error: taskErr } = tasksResult;
                const { data: depRows, error: depErr } = depsResult;
                if (taskErr) {
                    console.error('Gantt: tasks fetch error', taskErr);
                    setGanttTasks([]);
                    setGanttDependencies([]);
                    setGanttCriticalCount(0);
                    setGanttCriticalIds([]);
                    return;
                }
                if (depErr) {
                    console.error('Gantt: task_dependencies fetch error', depErr);
                    setGanttDependencies([]);
                }
                const tasks = taskRows || [];
                const deps = depRows || [];
                if (!ac.signal.aborted) {
                    const ordered = orderTasksForGantt(tasks);
                    setGanttTasks(ordered);
                    setGanttDependencies(deps);
                    const criticalIds = getCriticalPathTaskIds(tasks, deps);
                    setGanttCriticalCount(criticalIds.length);
                    setGanttCriticalIds(criticalIds);
                }
            } catch (e) {
                if (!ac.signal.aborted) console.error('Gantt fetch error', e);
            }
        })();
        return () => ac.abort();
    }, [activeTab, state.selectedProjectId]);

    const project = state.projects.find(p => p.id === state.selectedProjectId);
    const allTasksFromState = (state.tasks || []).filter(t => t.project_id === state.selectedProjectId);
    const allTasks = projectTasksList.length > 0 ? projectTasksList : allTasksFromState;
    
    // Get all project crew members (any contact linked to this project)
    const projectCrewMembers = state.contacts.filter(contact => 
        contact.project_contacts && contact.project_contacts.some(pc => pc.project_id === project?.id)
    );
    
    // Ensure owner is always included in crew members
    const ownerContactId = project?.created_by_user_id
        ? (state.profiles?.find(p => p.id === project.created_by_user_id)?.contact_id || null)
        : null;
    
    const ownerContact = ownerContactId
        ? state.contacts.find(c => c.id === ownerContactId)
        : null;
    
    // Combine project crew with owner (if owner not already included)
    const crewMembers = ownerContact && !projectCrewMembers.some(c => c.id === ownerContact.id)
        ? [ownerContact, ...projectCrewMembers]
        : projectCrewMembers;
    
    // Filter and sort tasks
    const filteredTasks = allTasks.filter(task => {
        if (taskFilter === 'completed') return task.completed;
        if (taskFilter === 'pending') return !task.completed;
        return true; // 'all'
    });
    
    // Sort tasks based on selected sort option
    const tasks = filteredTasks.sort((a, b) => {
        switch (taskSort) {
            case 'priority':
                const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            case 'due_date':
            default:
                if (!a.due_date && !b.due_date) return 0;
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date) - new Date(b.due_date);
        }
    });

    const projectActivity = (state.activityLog || []).filter((activity) => {
        const sameProject = activity.project_id && String(activity.project_id) === String(project?.id);
        const metadataProject = activity.metadata?.project_id && String(activity.metadata.project_id) === String(project?.id);
        return sameProject || metadataProject;
    }).slice(0, 30);
    
    if (!project) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No Project Selected</h2>
                    <p className="text-gray-500 mb-4">Please select a project from the dashboard to view its details.</p>
                    <button 
                        onClick={() => dispatch({ type: 'SET_VIEW', payload: 'Dashboard' })}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const handleAddTask = async (taskData) => {
        setIsCreatingTask(true);
        
        try {
            // Ensure assignee_id is valid before inserting
            if (taskData.assignee_id) {
                // Verify the contact exists
                const { data: contact, error: contactError } = await supabaseClient
                    .from('contacts')
                    .select('id')
                    .eq('id', taskData.assignee_id)
                    .single();
                
                if (contactError || !contact) {
                    console.warn('Assignee contact not found, setting to null');
                    taskData.assignee_id = null;
                }
            }
            
            // Parse workflow_steps if it's a string (for JSONB storage)
            if (taskData.workflow_steps && typeof taskData.workflow_steps === 'string') {
                try {
                    taskData.workflow_steps = JSON.parse(taskData.workflow_steps);
                } catch (e) {
                    console.error('Error parsing workflow_steps:', e);
                    taskData.workflow_steps = null;
                }
            }
            
            const { data, error } = await supabaseClient.from('tasks').insert(taskData).select().single();
            if (error) {
                // Provide more specific error message for foreign key violations
                if (error.message?.includes('foreign key constraint')) {
                    addToast('Cannot assign task: Selected assignee is not valid. Task created without assignee.', 'warning');
                    // Retry without assignee
                    const taskDataWithoutAssignee = { ...taskData, assignee_id: null };
                    const { data: retryData, error: retryError } = await supabaseClient
                        .from('tasks')
                        .insert(taskDataWithoutAssignee)
                        .select()
                        .single();
                    if (!retryError && retryData) {
                        dispatch({ type: 'ADD_TASK', payload: retryData });
                        setProjectTasksList(prev => [...prev, retryData]);
                        addToast('Task added successfully (without assignee)', 'success');
                        setShowTaskModal(false);
                        logTaskCreated(retryData, state.user, project.id);
                        return;
                    }
                }
                throw error;
            }
            
            dispatch({ type: 'ADD_TASK', payload: data });
            setProjectTasksList(prev => [...prev, data]);
            addToast('Task added successfully!', 'success');
            setShowTaskModal(false);
            
            // Log activity
            logTaskCreated(data, state.user, project.id);
        } catch (error) {
            addToast(handleApiError(error, 'Could not add task'), 'error');
        } finally {
            setIsCreatingTask(false);
        }
    };
    
    const handleToggleTask = async (taskId, currentStatus) => {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;

        // If completing a task and it's recurring (not an instance), generate next instance
        const isCompleting = !currentStatus;
        const isRecurringParent = isCompleting && task.recurrence && !task.is_recurring_instance;
        
        // Optimistic update
        const optimisticUpdate = createOptimisticUpdate(
            () => {
                const updatedTask = { ...task, completed: !currentStatus };
                dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
                addToast('Task updated successfully!', 'success');
            },
            () => {
                // Rollback
                dispatch({ type: 'UPDATE_TASK', payload: task });
                addToast('Failed to update task', 'error');
            }
        );

        // Apply optimistic update
        optimisticUpdate.optimistic();

        try {
            const { error } = await supabaseClient.from('tasks').update({ completed: !currentStatus }).eq('id', taskId);
            if (error) {
                throw error;
            }

            // Log activity
            if (!currentStatus) {
                // Task was completed
                logTaskCompleted(task, state.user, task.project_id);
            } else {
                // Task was uncompleted
                logTaskUncompleted(task, state.user, task.project_id);
            }

            // Generate next instance if this is a recurring parent task being completed (not uncompleted)
            if (isRecurringParent && !currentStatus) {
                try {
                    const recurrence = parseRecurrence(task.recurrence);
                    if (recurrence) {
                        // Calculate next due date based on pattern
                        const currentDueDate = task.due_date ? new Date(task.due_date) : new Date();
                        const nextDueDate = calculateNextTaskDueDate(currentDueDate, recurrence);
                        
                        // Create next instance
                        const nextInstance = {
                            project_id: task.project_id,
                            text: task.text,
                            due_date: nextDueDate.toISOString().split('T')[0],
                            priority: task.priority,
                            assignee_id: task.assignee_id,
                            recurrence: task.recurrence,
                            parent_task_id: task.id,
                            is_recurring_instance: true,
                            completed: false
                        };

                        const { data: newInstance, error: instanceError } = await supabaseClient
                            .from('tasks')
                            .insert(nextInstance)
                            .select()
                            .single();

                        if (!instanceError && newInstance) {
                            dispatch({ type: 'ADD_TASK', payload: newInstance });
                            addToast('Next task instance created!', 'success');
                        }
                    }
                } catch (recurError) {
                    console.error('Error generating next task instance:', recurError);
                    // Don't fail the task completion if instance generation fails
                }
            }
        } catch (error) {
            optimisticUpdate.rollback();
            addToast(handleApiError(error, 'Error updating task'), 'error');
        }
    };
    
    // Helper function to calculate next due date for recurring tasks
    const calculateNextTaskDueDate = (currentDate, recurrence) => {
        const nextDate = new Date(currentDate);
        const interval = recurrence.interval || 1;

        switch (recurrence.pattern) {
            case 'daily':
            case 'weekdays':
                nextDate.setDate(nextDate.getDate() + interval);
                break;
            case 'weekly':
                if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
                    // Find next matching weekday
                    let daysAdded = 1;
                    while (daysAdded < 14) {
                        if (recurrence.daysOfWeek.includes(nextDate.getDay())) {
                            break;
                        }
                        nextDate.setDate(nextDate.getDate() + 1);
                        daysAdded++;
                    }
                } else {
                    nextDate.setDate(nextDate.getDate() + (7 * interval));
                }
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + interval);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + interval);
                break;
            default:
                nextDate.setDate(nextDate.getDate() + interval);
        }

        return nextDate;
    };

    const handleEditTask = async (taskId, updatedData) => {
        const prev = allTasks.find((x) => x.id === taskId);
        const { error } = await supabaseClient.from('tasks').update(updatedData).eq('id', taskId);
        if (error) {
            addToast('Error updating task: ' + error.message, 'error');
        } else {
            const updatedTask = { ...state.tasks.find(t => t.id === taskId), ...updatedData };
            dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
            setProjectTasksList(prev => prev.map(t => t.id === taskId ? { ...t, ...updatedData } : t));
            addToast('Task updated successfully!', 'success');
            if (prev && project && state.user) {
                const changes = {};
                Object.keys(updatedData).forEach((key) => {
                    if (prev[key] !== updatedData[key]) changes[key] = updatedData[key];
                });
                if (Object.keys(changes).length > 0) {
                    logTaskUpdated(
                        { ...prev, ...updatedData, organization_id: prev.organization_id ?? project.organization_id },
                        state.user,
                        project.id,
                        changes
                    );
                }
            }
        }
    };

    const handleDeleteTask = async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        setTaskToDelete({ id: taskId, text: task?.text || 'this task' });
        setShowDeleteConfirm(true);
    };

    const confirmDeleteTask = async () => {
        if (!taskToDelete) {
            setShowDeleteConfirm(false);
            setTaskToDelete(null);
            return;
        }

        try {
            // First, find all child tasks (subtasks) that reference this task as parent
            const { data: childTasks, error: fetchError } = await supabaseClient
                .from('tasks')
                .select('id')
                .eq('parent_task_id', taskToDelete.id);

            if (fetchError) {
                addToast('Error checking for subtasks: ' + fetchError.message, 'error');
                setShowDeleteConfirm(false);
                setTaskToDelete(null);
                return;
            }

            // If there are child tasks, set their parent_task_id to null first
            if (childTasks && childTasks.length > 0) {
                const { error: updateError } = await supabaseClient
                    .from('tasks')
                    .update({ parent_task_id: null })
                    .eq('parent_task_id', taskToDelete.id);

                if (updateError) {
                    addToast('Error updating subtasks: ' + updateError.message, 'error');
                    setShowDeleteConfirm(false);
                    setTaskToDelete(null);
                    return;
                }

                // Update child tasks in state
                childTasks.forEach(childTask => {
                    const updatedTask = { ...state.tasks.find(t => t.id === childTask.id), parent_task_id: null };
                    dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
                });
            }

            // Now delete the parent task
            const { error } = await supabaseClient.from('tasks').delete().eq('id', taskToDelete.id);
            
            if (error) {
                addToast('Error deleting task: ' + error.message, 'error');
            } else {
                const deletedRow =
                    allTasks.find((x) => x.id === taskToDelete.id) ||
                    state.tasks.find((x) => x.id === taskToDelete.id);
                if (deletedRow && project && state.user) {
                    logTaskDeleted(
                        { ...deletedRow, organization_id: deletedRow.organization_id ?? project.organization_id },
                        state.user,
                        project.id
                    );
                }
                dispatch({ type: 'DELETE_TASK', payload: taskToDelete.id });
                setProjectTasksList(prev => prev.filter(t => t.id !== taskToDelete.id));
                const childCount = childTasks?.length || 0;
                if (childCount > 0) {
                    addToast(`Task deleted successfully! ${childCount} subtask${childCount > 1 ? 's' : ''} converted to top-level tasks.`, 'success');
                } else {
                    addToast('Task deleted successfully!', 'success');
                }
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            addToast('Error deleting task: ' + error.message, 'error');
        } finally {
            setShowDeleteConfirm(false);
            setTaskToDelete(null);
        }
    };

    const handleTaskSelect = (taskId) => {
        setSelectedTasks(prev => 
            prev.includes(taskId) 
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    };

    const handleBulkComplete = async (taskIds) => {
        const { error } = await supabaseClient.from('tasks').update({ completed: true }).in('id', taskIds);
        if (error) {
            addToast('Error completing tasks: ' + error.message, 'error');
        } else {
            // Update each task in the state
            taskIds.forEach(taskId => {
                const updatedTask = { ...state.tasks.find(t => t.id === taskId), completed: true };
                dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
            });
            if (project && state.user) {
                taskIds.forEach((taskId) => {
                    const row = allTasks.find((x) => x.id === taskId) || state.tasks.find((x) => x.id === taskId);
                    if (row) {
                        logTaskCompleted(
                            { ...row, completed: true, organization_id: row.organization_id ?? project.organization_id },
                            state.user,
                            project.id
                        );
                    }
                });
            }
            addToast(`${taskIds.length} tasks completed successfully!`, 'success');
            setSelectedTasks([]);
        }
    };

    const handleBulkDelete = async (taskIds) => {
        try {
            // First, find all child tasks that reference any of these tasks as parent
            const { data: childTasks, error: fetchError } = await supabaseClient
                .from('tasks')
                .select('id, parent_task_id')
                .in('parent_task_id', taskIds);

            if (fetchError) {
                addToast('Error checking for subtasks: ' + fetchError.message, 'error');
                return;
            }

            // If there are child tasks, set their parent_task_id to null first
            if (childTasks && childTasks.length > 0) {
                const { error: updateError } = await supabaseClient
                    .from('tasks')
                    .update({ parent_task_id: null })
                    .in('parent_task_id', taskIds);

                if (updateError) {
                    addToast('Error updating subtasks: ' + updateError.message, 'error');
                    return;
                }

                // Update child tasks in state
                childTasks.forEach(childTask => {
                    const updatedTask = { ...state.tasks.find(t => t.id === childTask.id), parent_task_id: null };
                    dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
                });
            }

            // Now delete the selected tasks
            const { error } = await supabaseClient.from('tasks').delete().in('id', taskIds);
            
            if (error) {
                addToast('Error deleting tasks: ' + error.message, 'error');
            } else {
                if (project && state.user) {
                    taskIds.forEach((taskId) => {
                        const row = allTasks.find((x) => x.id === taskId) || state.tasks.find((x) => x.id === taskId);
                        if (row) {
                            logTaskDeleted(
                                { ...row, organization_id: row.organization_id ?? project.organization_id },
                                state.user,
                                project.id
                            );
                        }
                    });
                }
                // Remove each task from the state
                taskIds.forEach(taskId => {
                    dispatch({ type: 'DELETE_TASK', payload: taskId });
                });
                const childCount = childTasks?.length || 0;
                if (childCount > 0) {
                    addToast(`${taskIds.length} task${taskIds.length > 1 ? 's' : ''} deleted successfully! ${childCount} subtask${childCount > 1 ? 's' : ''} converted to top-level tasks.`, 'success');
                } else {
                    addToast(`${taskIds.length} task${taskIds.length > 1 ? 's' : ''} deleted successfully!`, 'success');
                }
                setSelectedTasks([]);
            }
        } catch (error) {
            console.error('Error in bulk delete:', error);
            addToast('Error deleting tasks: ' + error.message, 'error');
        }
    };

    const setTaskPhotoBusy = (taskId, busy) => {
        setPhotoActionTaskIds((prev) => {
            const next = { ...prev };
            if (busy) next[taskId] = true;
            else delete next[taskId];
            return next;
        });
    };

    const replaceTaskRow = (taskId, nextTask) => {
        dispatch({ type: 'UPDATE_TASK', payload: nextTask });
        setProjectTasksList((prev) => prev.map((task) => (task.id === taskId ? nextTask : task)));
    };

    const hydratePhotoRows = async (rows = []) => {
        if (!rows.length) return [];
        const hydrated = await attachTaskPhotoUrls(supabaseClient, sortTaskPhotos(rows));
        return sortTaskPhotos(hydrated);
    };

    const handleOpenTaskPhotos = async (taskId) => {
        const task = allTasks.find((row) => row.id === taskId) || state.tasks.find((row) => row.id === taskId);
        if (!task) return;
        setPhotoModalTaskId(taskId);
        try {
            const rows = await fetchTaskPhotos(supabaseClient, taskId);
            const hydrated = await hydratePhotoRows(rows || []);
            replaceTaskRow(taskId, { ...task, task_photos: hydrated });
        } catch (error) {
            addToast(error.message || 'Could not load task photos.', 'error');
        }
    };

    const handleAddTaskPhotos = async (taskId, files) => {
        const task = allTasks.find((row) => row.id === taskId) || state.tasks.find((row) => row.id === taskId);
        if (!task || !project) return;

        setTaskPhotoBusy(taskId, true);
        let preparedPhotos = [];
        try {
            preparedPhotos = await Promise.all(
                files.map((file, index) => buildTaskPhotoDraft(file, (task.task_photos?.length || 0) + index))
            );
            const uploadedPhotos = [];
            for (let index = 0; index < preparedPhotos.length; index++) {
                const photo = preparedPhotos[index];
                setTaskPhotoUploadProgress({ taskId, current: index + 1, total: preparedPhotos.length });
                const row = await uploadTaskPhotoSet(supabaseClient, {
                    taskId,
                    organizationId: project.organization_id,
                    projectId: project.id,
                    originalFile: photo.originalFile,
                    thumbnailFile: photo.thumbnailFile,
                    caption: photo.caption,
                    isCompletionPhoto: photo.is_completion_photo,
                    uploadedByUserId: state.user?.id,
                    sortOrder: (task.task_photos?.length || 0) + index,
                    capturedAt: photo.captured_at || null,
                });
                uploadedPhotos.push(row);
            }
            const hydratedUploadedPhotos = await hydratePhotoRows(uploadedPhotos);
            replaceTaskRow(taskId, {
                ...task,
                task_photos: sortTaskPhotos([...(task.task_photos || []), ...hydratedUploadedPhotos]),
            });
            addToast('Task photos uploaded.', 'success');
        } catch (error) {
            addToast(error.message || 'Could not upload task photos.', 'error');
        } finally {
            revokeTaskPhotoDraftUrls(preparedPhotos);
            setTaskPhotoUploadProgress(null);
            setTaskPhotoBusy(taskId, false);
        }
    };

    const handleUpdateTaskPhoto = async (taskId, photoId, updates) => {
        const task = allTasks.find((row) => row.id === taskId) || state.tasks.find((row) => row.id === taskId);
        if (!task) return;
        const targetPhoto = (task.task_photos || []).find((photo) => photo.id === photoId || photo.local_id === photoId);
        if (!targetPhoto?.id) return;
        setTaskPhotoBusy(taskId, true);
        try {
            const updatedPhoto = await updateTaskPhoto(supabaseClient, targetPhoto.id, updates);
            const hydratedPhoto = (await hydratePhotoRows([updatedPhoto]))[0];
            replaceTaskRow(taskId, {
                ...task,
                task_photos: sortTaskPhotos((task.task_photos || []).map((photo) => photo.id === targetPhoto.id ? { ...photo, ...hydratedPhoto } : photo)),
            });
        } catch (error) {
            addToast(error.message || 'Could not update task photo.', 'error');
        } finally {
            setTaskPhotoBusy(taskId, false);
        }
    };

    const handleDeleteTaskPhoto = async (taskId, photoId) => {
        const task = allTasks.find((row) => row.id === taskId) || state.tasks.find((row) => row.id === taskId);
        if (!task) return;
        const targetPhoto = (task.task_photos || []).find((photo) => photo.id === photoId || photo.local_id === photoId);
        if (!targetPhoto?.id) return;
        setTaskPhotoBusy(taskId, true);
        try {
            await deleteTaskPhoto(supabaseClient, targetPhoto);
            const remainingPhotos = sortTaskPhotos((task.task_photos || []).filter((photo) => photo.id !== targetPhoto.id));
            if (remainingPhotos.length > 0) {
                await reorderTaskPhotos(supabaseClient, taskId, remainingPhotos.map((photo) => photo.id));
                remainingPhotos.forEach((photo, index) => { photo.sort_order = index; });
            }
            replaceTaskRow(taskId, { ...task, task_photos: remainingPhotos });
            addToast('Task photo removed.', 'success');
        } catch (error) {
            addToast(error.message || 'Could not delete task photo.', 'error');
        } finally {
            setTaskPhotoBusy(taskId, false);
        }
    };

    const handleMoveTaskPhoto = async (taskId, photoId, direction) => {
        const task = allTasks.find((row) => row.id === taskId) || state.tasks.find((row) => row.id === taskId);
        if (!task) return;
        const currentPhotos = sortTaskPhotos(task.task_photos || []);
        const currentIndex = currentPhotos.findIndex((photo) => photo.id === photoId || photo.local_id === photoId);
        const nextIndex = currentIndex + direction;
        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentPhotos.length) return;
        const reorderedPhotos = [...currentPhotos];
        const [movedPhoto] = reorderedPhotos.splice(currentIndex, 1);
        reorderedPhotos.splice(nextIndex, 0, movedPhoto);
        setTaskPhotoBusy(taskId, true);
        try {
            await reorderTaskPhotos(supabaseClient, taskId, reorderedPhotos.map((photo) => photo.id));
            replaceTaskRow(taskId, {
                ...task,
                task_photos: reorderedPhotos.map((photo, index) => ({ ...photo, sort_order: index })),
            });
        } catch (error) {
            addToast(error.message || 'Could not reorder task photos.', 'error');
        } finally {
            setTaskPhotoBusy(taskId, false);
        }
    };


    return (
        <div>
            <header className="flex items-center justify-between mb-6 app-card p-5" data-onboarding="project-header">
                <div>
                    <h1 className="app-section-title">{project.name}</h1>
                    <p className="app-section-subtitle">{project.address}</p>
                </div>
                <div className="flex items-center gap-4">
                    <PermissionGuard 
                        permission="can_edit_projects"
                        fallback={
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                project.status?.toLowerCase() === 'planning' ? 'bg-blue-100 text-blue-800' :
                                project.status?.toLowerCase() === 'in progress' ? 'bg-green-100 text-green-800' :
                                project.status?.toLowerCase() === 'on hold' ? 'bg-yellow-100 text-yellow-900' :
                                project.status?.toLowerCase() === 'completed' ? 'bg-gray-100 text-gray-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {project.status || 'Planning'}
                            </span>
                        }
                    >
                        <select
                            value={project.status || ''}
                            onChange={async (e) => {
                            const newStatus = e.target.value;
                            try {
                                const { error } = await supabaseClient
                                    .from('projects')
                                    .update({ 
                                        status: newStatus,
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', project.id);

                                if (error) {
                                    addToast('Error updating project status: ' + error.message, 'error');
                                } else {
                                    dispatch({
                                        type: 'UPDATE_PROJECT',
                                        payload: { ...project, status: newStatus }
                                    });
                                    addToast('Project status updated successfully!', 'success');
                                }
                            } catch (error) {
                                addToast('Error updating project status: ' + error.message, 'error');
                            }
                        }}
                        className={`px-3 py-1 text-sm font-semibold rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-hidden appearance-none pr-8 ${
                            project.status?.toLowerCase() === 'planning' ? 'bg-blue-100 text-blue-800' :
                            project.status?.toLowerCase() === 'in progress' ? 'bg-green-100 text-green-800' :
                            project.status?.toLowerCase() === 'on hold' ? 'bg-yellow-100 text-yellow-900' :
                            project.status?.toLowerCase() === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-gray-100 text-gray-800'
                        }`}
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            backgroundSize: '1em 1em',
                            paddingRight: '2rem'
                        }}
                    >
                        <option value="Planning">Planning</option>
                        <option value="In Progress">In Progress</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Completed">Completed</option>
                    </select>
                    </PermissionGuard>
                    {crewMembers.length > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {crewMembers.slice(0, 5).map(member => (
                                    member.avatar_url ? (
                                        <img key={member.id} src={member.avatar_url} title={member.name} className="w-8 h-8 rounded-full" />
                                    ) : (
                                        <Avatar key={member.id} name={member.name} size="sm" />
                                    )
                                ))}
                            </div>
                            {crewMembers.length > 5 && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 -ml-2">
                                    +{crewMembers.length - 5}
                                </div>
                            )}
                        </div>
                    )}
                    <button 
                        onClick={() => setShowShare(true)}
                        className="px-4 py-2 text-sm font-semibold rounded-lg shadow-xs transition-colors app-action-primary"
                        title="Assign crew members from organization directory or invite guests"
                    >
                        + Manage Crew
                    </button>
                    <PermissionGuard permission="can_create_projects">
                        <button 
                            onClick={() => setShowSaveAsTemplateModal(true)}
                            className="px-4 py-2 text-sm font-semibold rounded-lg shadow-xs transition-colors app-action-secondary"
                            title="Save this project structure as a reusable template"
                        >
                            Save as template
                        </button>
                    </PermissionGuard>
                    <PermissionGuard permission="can_manage_progress_reports">
                        <button
                            type="button"
                            onClick={() => setShowProgressReportModal(true)}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg shadow-xs hover:bg-emerald-700 transition-colors flex items-center gap-2"
                            title="Schedule and manage progress reports"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Progress reports
                        </button>
                    </PermissionGuard>
                    <PermissionGuard permission="can_create_projects">
                        <button
                            type="button"
                            onClick={() => setShowMsProjectImportModal(true)}
                            className="px-4 py-2 text-sm font-semibold rounded-lg shadow-xs transition-colors bg-slate-700 text-white hover:bg-slate-800"
                            title="Import tasks and schedule from Microsoft Project XML"
                        >
                            Import MS Project XML
                        </button>
                    </PermissionGuard>
                    <PermissionGuard permission="can_edit_tasks">
                        <button
                            type="button"
                            onClick={() => setShowWeatherImpactModal(true)}
                            className="px-4 py-2 text-sm font-semibold rounded-lg shadow-xs transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
                            title="Log weather impacts and delays"
                        >
                            Weather impacts
                        </button>
                    </PermissionGuard>
                </div>
            </header>

            {showShare && (
                <ShareModal projectId={project.id} onClose={() => setShowShare(false)} />
            )}

            {showSaveAsTemplateModal && (
                <SaveAsTemplateModal 
                    projectId={project.id} 
                    projectName={project.name} 
                    onClose={() => setShowSaveAsTemplateModal(false)} 
                />
            )}

            {showProgressReportModal && project && (
                <ProgressReportModal projectId={project.id} onClose={() => setShowProgressReportModal(false)} />
            )}

            {showMsProjectImportModal && project && (
                <MsProjectImportModal
                    context="existing"
                    projectId={project.id}
                    projectName={project.name}
                    onClose={() => setShowMsProjectImportModal(false)}
                    onSuccess={() => setShowMsProjectImportModal(false)}
                />
            )}
            {showWeatherImpactModal && project && (
                <WeatherImpactModal
                    project={project}
                    onClose={() => setShowWeatherImpactModal(false)}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Main content — full width on Gantt (sidebar hidden) */}
                <div className={activeTab === 'gantt' ? 'lg:col-span-5' : 'lg:col-span-3'}>
                    {/* Tab Navigation */}
                    <div className="border-b border-slate-200 mb-6 app-card-soft px-4">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setTabAndRoute('tasks')}
                                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'tasks'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Tasks ({Math.max(allTasks.length, ganttTasks.length)})
                            </button>
                            <button
                                onClick={() => setTabAndRoute('gantt')}
                                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'gantt'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Gantt
                            </button>
                            <button
                                onClick={() => setTabAndRoute('fieldIssues')}
                                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'fieldIssues'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Field Issues ({fieldIssuesCount})
                            </button>
                            <button
                                onClick={() => setTabAndRoute('activity')}
                                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'activity'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Activity
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-96">
                        {activeTab === 'gantt' && (
                            <div className="app-card flex flex-col" data-onboarding="gantt-section" style={{ height: 'max(72vh, 520px)', maxHeight: '90vh' }}>
                                <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-3 flex-shrink-0">
                                    <h2 className="text-xl font-bold">Gantt</h2>
                                    <div className="flex items-center gap-4">
                                        <span className="text-gray-500 text-xs">
                                            {ganttTasks.length} tasks &middot; {ganttDependencies.length} deps &middot; {ganttCriticalCount} critical
                                        </span>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showCriticalPath}
                                                onChange={(e) => setShowCriticalPath(e.target.checked)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">Show critical path</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 flex flex-col px-4 pb-4">
                                    <GanttChart
                                        tasks={ganttTasks}
                                        dependencies={ganttDependencies}
                                        criticalPathIds={ganttCriticalIds}
                                        showCriticalPath={showCriticalPath}
                                    />
                                </div>
                            </div>
                        )}
                        {activeTab === 'tasks' && (
                            <div className="p-6 app-card" data-onboarding="tasks-section">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-xl font-bold">Tasks ({Math.max(allTasks.length, ganttTasks.length)})</h2>
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-medium text-gray-700">Filter:</label>
                                            <select 
                                                value={taskFilter} 
                                                onChange={(e) => setTaskFilter(e.target.value)}
                                                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="all">All Tasks</option>
                                                <option value="pending">Pending</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-medium text-gray-700">Sort by:</label>
                                            <select 
                                                value={taskSort} 
                                                onChange={(e) => setTaskSort(e.target.value)}
                                                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="due_date">Due Date</option>
                                                <option value="priority">Priority</option>
                                            </select>
                                        </div>
                                    </div>
                                    <PermissionGuard permission="can_create_tasks">
                                        <button onClick={() => setShowTaskModal(true)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-xs hover:bg-blue-700">+ New Task</button>
                                    </PermissionGuard>
                                </div>
                                <TaskBulkActions
                                    selectedTasks={selectedTasks}
                                    onBulkComplete={handleBulkComplete}
                                    onBulkDelete={handleBulkDelete}
                                    onClearSelection={() => setSelectedTasks([])}
                                />
                                {tasks.length > 0 ? (
                                    <ul className={`space-y-2 ${tasks.length > 7 ? 'max-h-[500px] overflow-y-auto pr-2' : ''}`}>
                                        {tasks.map((task) => (
                                            <TaskItem 
                                                key={task.id} 
                                                task={task}
                                                onToggle={handleToggleTask} 
                                                onEdit={handleEditTask} 
                                                onDelete={handleDeleteTask}
                                                isSelected={selectedTasks.includes(task.id)}
                                                onSelect={handleTaskSelect}
                                                onOpenPhotos={handleOpenTaskPhotos}
                                            />
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks yet</h3>
                                        <p className="text-gray-500 mb-4">Break down your project into manageable tasks to track progress.</p>
                                        <button 
                                            onClick={() => setShowTaskModal(true)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                        >
                                            Add Your First Task
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'fieldIssues' && (
                            <FieldIssues projectId={project.id} />
                        )}

                        {activeTab === 'activity' && (
                            <div className="p-6 app-card">
                                <ActivityHistoryPanel
                                    mode="project"
                                    organizationId={project.organization_id || state.currentOrganization?.id}
                                    projectId={project.id}
                                    title="Project activity"
                                />
                            </div>
                        )}

                        {/* Workflow Section - Always visible under Tasks */}
                        {activeTab === 'tasks' && (
                            <div className="mt-6">
                                <Workflow projectId={project.id} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar hidden on Gantt for full-width chart (phases + recent activity on other tabs) */}
                <div className={activeTab === 'gantt' ? 'hidden' : 'lg:col-span-2'}>
                    <ProjectSidebar project={project} showProjectPhases={activeTab !== 'gantt'} />
                </div>
            </div>
            {showTaskModal && <TaskModal project={project} onClose={() => setShowTaskModal(false)} onSave={handleAddTask} isLoading={isCreatingTask} />}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDeleteTask}
                title="Delete Task"
                message={`Are you sure you want to delete "${taskToDelete?.text}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
            />
            {photoModalTaskId && (
                <TaskPhotosModal
                    task={allTasks.find((task) => task.id === photoModalTaskId)}
                    onClose={() => setPhotoModalTaskId(null)}
                    onAddPhotos={handleAddTaskPhotos}
                    onUpdatePhoto={handleUpdateTaskPhoto}
                    onDeletePhoto={handleDeleteTaskPhoto}
                    onMovePhoto={handleMoveTaskPhoto}
                    canManagePhotos={canManageTaskPhotos({
                        project,
                        userId: state.user?.id,
                        userContactId: state.userContactId,
                        userRoleName: state.userRole?.name,
                        canEditTasks: state.userRole?.permissions?.can_edit_tasks === true,
                        task: allTasks.find((task) => task.id === photoModalTaskId),
                    })}
                    photoActionBusy={Boolean(photoActionTaskIds[photoModalTaskId])}
                    photoUploadProgress={taskPhotoUploadProgress?.taskId === photoModalTaskId ? taskPhotoUploadProgress : null}
                />
            )}
        </div>
    );
}
export default ProjectDetailsView;