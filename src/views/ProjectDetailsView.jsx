import React, { useState, useRef } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import FileItem from '../components/FileItem';
import ProjectSidebar from '../components/ProjectSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import TaskBulkActions from '../components/TaskBulkActions';
import FieldIssues from '../components/FieldIssues';
import { useTaskShortcuts } from '../hooks/useKeyboardShortcuts';
import { handleApiError, createOptimisticUpdate } from '../utils/errorHandling';
import dropboxStorage from '../utils/dropboxStorage';
import { parseRecurrence } from '../utils/recurrenceService';
import { logTaskCreated, logTaskCompleted, logTaskUncompleted, logTaskUpdated, logTaskDeleted } from '../utils/activityLogger';

function ProjectDetailsView() {
    const { state, dispatch } = useAppContext();
    const { addToast } = useToast();
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [taskFilter, setTaskFilter] = useState('all'); // all, completed, pending
    const [taskSort, setTaskSort] = useState('due_date'); // due_date, priority
    const [activeTab, setActiveTab] = useState('tasks'); // tasks, fieldIssues, files
    const fileInputRef = useRef(null);

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

    const project = state.projects.find(p => p.id === state.selectedProjectId);
    const allTasks = state.tasks.filter(t => t.project_id === state.selectedProjectId);
    const files = state.files.filter(f => f.project_id === state.selectedProjectId);
    
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
            const { data, error } = await supabaseClient.from('tasks').insert(taskData).select().single();
            if (error) {
                throw error;
            }
            
            dispatch({ type: 'ADD_TASK', payload: data });
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
        const { error } = await supabaseClient.from('tasks').update(updatedData).eq('id', taskId);
        if (error) {
            addToast('Error updating task: ' + error.message, 'error');
        } else {
            const updatedTask = { ...state.tasks.find(t => t.id === taskId), ...updatedData };
            dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
            addToast('Task updated successfully!', 'success');
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
                dispatch({ type: 'DELETE_TASK', payload: taskToDelete.id });
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

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Check if Dropbox is connected
        if (!state.dropboxConnected) {
            addToast('Please connect to Dropbox in Settings to upload files', 'error');
            return;
        }

        setIsUploading(true);
        
        try {
            // Upload to Dropbox
            const uploadResult = await dropboxStorage.uploadFile(file, `/${project.id}`, file.name);
            
            // Insert record into 'files' table with Dropbox URL
            const { error: insertError } = await supabaseClient.from('files').insert({
                project_id: project.id,
                name: file.name,
                file_url: uploadResult.sharedUrl,
                size_kb: Math.round(file.size / 1024),
                type: file.type.startsWith('image') ? 'image' : (file.type === 'application/pdf' ? 'pdf' : 'file')
            });

            if (insertError) {
                addToast('Error saving file record: ' + insertError.message, 'error');
            } else {
                addToast('File uploaded successfully to Dropbox!', 'success');
            }
        } catch (error) {
            console.error('File upload error:', error);
            addToast('Error uploading file: ' + error.message, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div>
            <header className="flex items-center justify-between mb-8" data-onboarding="project-header">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                    <p className="text-gray-500">{project.address}</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${project.status_color === 'green' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>{project.status}</span>
                    <button 
                        onClick={() => dispatch({ type: 'SET_VIEW', payload: 'Contacts' })}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                    >
                        + Add Team Member
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Main Content Area with Tabs */}
                <div className="lg:col-span-3">
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'tasks'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Tasks ({allTasks.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('fieldIssues')}
                                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'fieldIssues'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Field Issues
                            </button>
                            <button
                                onClick={() => setActiveTab('files')}
                                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'files'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Files ({files.length})
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-96">
                        {activeTab === 'tasks' && (
                            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200" data-onboarding="tasks-section">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-xl font-bold">Tasks ({allTasks.length})</h2>
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
                                    <button onClick={() => setShowTaskModal(true)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">+ New Task</button>
                                </div>
                                <TaskBulkActions
                                    selectedTasks={selectedTasks}
                                    onBulkComplete={handleBulkComplete}
                                    onBulkDelete={handleBulkDelete}
                                    onClearSelection={() => setSelectedTasks([])}
                                />
                                {tasks.length > 0 ? (
                                    <ul className="space-y-3">
                                        {tasks.map((task) => (
                                            <TaskItem 
                                                key={task.id} 
                                                task={task}
                                                onToggle={handleToggleTask} 
                                                onEdit={handleEditTask} 
                                                onDelete={handleDeleteTask}
                                                isSelected={selectedTasks.includes(task.id)}
                                                onSelect={handleTaskSelect}
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

                        {activeTab === 'files' && (
                            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold">Files</h2>
                                    <div className="flex gap-2">
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                        <button onClick={() => fileInputRef.current.click()} disabled={isUploading} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-gray-400">
                                            {isUploading ? 'Uploading...' : 'Upload Files'}
                                        </button>
                                    </div>
                                </div>
                                {files.length > 0 ? (
                                    <ul className="space-y-3">{files.map(file => <FileItem key={file.id} file={file} />)}</ul>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No files uploaded</h3>
                                        <p className="text-gray-500 mb-4">Upload project documents, photos, and other files to keep everything organized.</p>
                                        <button 
                                            onClick={() => fileInputRef.current.click()}
                                            disabled={isUploading}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
                                        >
                                            {isUploading ? 'Uploading...' : 'Upload Files'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Project Sidebar */}
                <div className="lg:col-span-2">
                    <ProjectSidebar project={project} />
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
        </div>
    );
}
export default ProjectDetailsView;