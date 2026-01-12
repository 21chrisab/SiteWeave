import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import PermissionGuard from './PermissionGuard';
import { hasPermission } from '../utils/permissions';

// Simple debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function BuildPath({ project }) {
    const { dispatch, state } = useAppContext();
    const { addToast } = useToast();
    const [phases, setPhases] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingPhase, setEditingPhase] = useState(null);
    const [showPhaseModal, setShowPhaseModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingValues, setEditingValues] = useState({});
    const [canEditProjects, setCanEditProjects] = useState(false);
    const [draggedPhase, setDraggedPhase] = useState(null);
    const [dragOverPhase, setDragOverPhase] = useState(null);
    const [dragOverPosition, setDragOverPosition] = useState(null);
    const [editingProgressPhaseId, setEditingProgressPhaseId] = useState(null);
    const [editingNamePhaseId, setEditingNamePhaseId] = useState(null);
    const handlePhaseUpdateRef = useRef(null);

    // Default phases for construction projects
    const defaultPhases = [
        { name: 'Mobilize', progress: 0, budget: 0, order: 1 },
        { name: 'Clear and Grub', progress: 0, budget: 0, order: 2 },
        { name: 'Demo', progress: 0, budget: 0, order: 3 },
        { name: 'Rough Cut', progress: 0, budget: 0, order: 4 },
        { name: 'BP', progress: 0, budget: 0, order: 5 },
        { name: 'Final Grade', progress: 0, budget: 0, order: 6 }
    ];

    useEffect(() => {
        if (!project?.id) return;
        loadPhases();
        checkPermissions();
    }, [project?.id, state.user?.id, state.currentOrganization?.id]);

    const checkPermissions = async () => {
        if (!state.user?.id || !state.currentOrganization?.id) {
            setCanEditProjects(false);
            return;
        }
        try {
            const hasEditPermission = await hasPermission(
                supabaseClient,
                state.user.id,
                'can_edit_projects',
                state.currentOrganization.id
            );
            setCanEditProjects(hasEditPermission);
        } catch (error) {
            console.error('Error checking permissions:', error);
            setCanEditProjects(false);
        }
    };

    const isAuthorized = () => {
        return canEditProjects;
    };

    const loadPhases = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('project_phases')
                .select('*')
                .eq('project_id', project.id)
                .order('order');

            if (error) {
                console.error('Error loading phases:', error);
                // If no phases exist, initialize with defaults
                if (error.code === 'PGRST116') {
                    await initializeDefaultPhases();
                }
            } else {
                setPhases(data || []);
            }
        } catch (error) {
            console.error('Error loading phases:', error);
            await initializeDefaultPhases();
        }
    };

    const initializeDefaultPhases = async () => {
        try {
            if (!project?.id) return;
            const phasesWithProjectId = defaultPhases.map(phase => ({
                ...phase,
                project_id: project.id
            }));

            const { error } = await supabaseClient
                .from('project_phases')
                .insert(phasesWithProjectId);

            if (error) {
                console.error('Error initializing phases:', error);
            } else {
                setPhases(phasesWithProjectId);
            }
        } catch (error) {
            console.error('Error initializing phases:', error);
        }
    };


    const handlePhaseUpdate = useCallback(async (phaseId, updates) => {
        setIsLoading(true);
        try {
            const { error } = await supabaseClient
                .from('project_phases')
                .update(updates)
                .eq('id', phaseId);

            if (error) {
                addToast('Error updating phase: ' + error.message, 'error');
            } else {
                setPhases(prev => prev.map(phase => 
                    phase.id === phaseId ? { ...phase, ...updates } : phase
                ));
                addToast('Phase updated successfully!', 'success');
            }
        } catch (error) {
            addToast('Error updating phase: ' + error.message, 'error');
        }
        setIsLoading(false);
    }, [addToast]);

    // Keep ref updated with latest function
    useEffect(() => {
        handlePhaseUpdateRef.current = handlePhaseUpdate;
    }, [handlePhaseUpdate]);

    // Handle input changes with local state (no immediate DB update)
    const handleInputChange = (phaseId, field, value) => {
        setEditingValues(prev => ({
            ...prev,
            [`${phaseId}_${field}`]: value
        }));
    };

    // Debounced update to database
    const debouncedUpdate = React.useCallback(
        debounce(async (phaseId, field, value) => {
            const updates = { [field]: value };
            if (handlePhaseUpdateRef.current) {
                await handlePhaseUpdateRef.current(phaseId, updates);
            }
        }, 1000),
        []
    );

    // Handle input blur (save immediately when user leaves field)
    const handleInputBlur = async (phaseId, field) => {
        const key = `${phaseId}_${field}`;
        const value = editingValues[key];
        
        if (value !== undefined) {
            const updates = { [field]: value };
            await handlePhaseUpdate(phaseId, updates);
            // Clear the editing value
            setEditingValues(prev => {
                const newValues = { ...prev };
                delete newValues[key];
                return newValues;
            });
        }
    };

    const handleAddPhase = async (phaseData) => {
        setIsLoading(true);
        try {
            const newPhase = {
                ...phaseData,
                project_id: project.id,
                order: phases.length + 1
            };

            const { data, error } = await supabaseClient
                .from('project_phases')
                .insert(newPhase)
                .select()
                .single();

            if (error) {
                addToast('Error adding phase: ' + error.message, 'error');
            } else {
                setPhases(prev => [...prev, data]);
                addToast('Phase added successfully!', 'success');
            }
        } catch (error) {
            addToast('Error adding phase: ' + error.message, 'error');
        }
        setIsLoading(false);
    };

    const handleDeletePhase = async (phaseId) => {
        setIsLoading(true);
        try {
            const { error } = await supabaseClient
                .from('project_phases')
                .delete()
                .eq('id', phaseId);

            if (error) {
                addToast('Error deleting phase: ' + error.message, 'error');
            } else {
                setPhases(prev => prev.filter(phase => phase.id !== phaseId));
                addToast('Phase deleted successfully!', 'success');
            }
        } catch (error) {
            addToast('Error deleting phase: ' + error.message, 'error');
        }
        setIsLoading(false);
    };

    const resetDragState = () => {
        setDraggedPhase(null);
        setDragOverPhase(null);
        setDragOverPosition(null);
    };

    const handleDragStart = (e, phaseId) => {
        setDraggedPhase(phaseId);
        setDragOverPhase(null);
        setDragOverPosition(null);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target);
    };

    const handleDragEnd = () => {
        resetDragState();
    };

    const handleDragOver = (e, phaseId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const rect = e.currentTarget.getBoundingClientRect();
        const offset = e.clientY - rect.top;
        const position = offset < rect.height / 2 ? 'top' : 'bottom';

        if (dragOverPhase !== phaseId || dragOverPosition !== position) {
            setDragOverPhase(phaseId);
            setDragOverPosition(position);
        }
    };

    const handleDragLeave = () => {
        setDragOverPhase(null);
        setDragOverPosition(null);
    };

    const handleDrop = async (e, targetPhaseId) => {
        e.preventDefault();
        if (!draggedPhase || draggedPhase === targetPhaseId) {
            resetDragState();
            return;
        }

        const draggedIndex = phases.findIndex(p => p.id === draggedPhase);
        const targetIndex = phases.findIndex(p => p.id === targetPhaseId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedPhase(null);
            return;
        }

        // Create new array with reordered phases
        const newPhases = [...phases];
        const [draggedPhaseData] = newPhases.splice(draggedIndex, 1);

        let insertIndex = newPhases.findIndex(p => p.id === targetPhaseId);
        if (insertIndex === -1) {
            resetDragState();
            return;
        }
        if ((dragOverPosition || 'bottom') === 'bottom') {
            insertIndex += 1;
        }

        newPhases.splice(insertIndex, 0, draggedPhaseData);

        // Update order values for all phases
        const updatedPhases = newPhases.map((phase, index) => ({
            ...phase,
            order: index + 1
        }));

        setPhases(updatedPhases);

        // Update all phases in the database
        setIsLoading(true);
        try {
            const updates = updatedPhases.map(phase => ({
                id: phase.id,
                order: phase.order
            }));

            const updatePromises = updates.map(update =>
                supabaseClient
                    .from('project_phases')
                    .update({ order: update.order })
                    .eq('id', update.id)
            );

            const results = await Promise.all(updatePromises);
            const hasError = results.some(result => result.error);

            if (hasError) {
                const errorMessages = results
                    .filter(r => r.error)
                    .map(r => r.error.message)
                    .join(', ');
                addToast('Error reordering phases: ' + errorMessages, 'error');
                // Reload phases on error
                loadPhases();
            } else {
                addToast('Phases reordered successfully!', 'success');
            }
        } catch (error) {
            addToast('Error reordering phases: ' + error.message, 'error');
            loadPhases();
        } finally {
            setIsLoading(false);
            resetDragState();
        }
    };

    const calculateOverallProgress = () => {
        if (phases.length === 0) return 0;
        
        const totalBudget = phases.reduce((sum, phase) => sum + (phase.budget || 0), 0);
        if (totalBudget === 0) return 0;
        
        const totalWeightedProgress = phases.reduce((sum, phase) => {
            const phaseWeight = (phase.budget || 0) / totalBudget;
            return sum + (phase.progress * phaseWeight);
        }, 0);

        return Math.round(totalWeightedProgress);
    };

    const calculateTotalBudget = () => {
        return phases.reduce((sum, phase) => sum + (phase.budget || 0), 0);
    };

    const calculateSpentAmount = () => {
        return phases.reduce((sum, phase) => {
            return sum + ((phase.budget || 0) * (phase.progress / 100));
        }, 0);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Progress Status</h3>
                {isAuthorized() && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowPhaseModal(true)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            + Add Phase
                        </button>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                            {isEditing ? 'Done' : 'Edit'}
                        </button>
                    </div>
                )}
            </div>

            {/* Overall Progress Summary */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">Overall Progress</span>
                    <span className="text-sm font-bold">{calculateOverallProgress()}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${calculateOverallProgress()}%` }}
                    ></div>
                </div>
                <PermissionGuard permission="can_view_financials">
                    <div className="text-xs text-gray-600">
                        {formatCurrency(calculateSpentAmount())} of {formatCurrency(calculateTotalBudget())} spent
                    </div>
                </PermissionGuard>
            </div>

            {/* Phases List - Fixed height with scroll */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {phases.map((phase) => {
                    const isDragTarget = dragOverPhase === phase.id;
                    return (
                    <div key={phase.id}>
                        {isDragTarget && dragOverPosition === 'top' && (
                            <div className="h-2 -mb-1 rounded border-2 border-dashed border-blue-400 bg-blue-50"></div>
                        )}
                        <div 
                        className={`relative border border-gray-200 rounded-lg p-3 transition-all duration-150 ${draggedPhase === phase.id ? 'opacity-50' : ''} ${draggedPhase ? 'cursor-move' : ''} ${isDragTarget ? 'ring-2 ring-blue-400 bg-blue-50/40' : ''}`}
                        draggable={!isLoading}
                        onDragStart={(e) => handleDragStart(e, phase.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, phase.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, phase.id)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400 cursor-move" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                                {editingNamePhaseId === phase.id && isAuthorized() ? (
                                    <input
                                        type="text"
                                        value={editingValues[`${phase.id}_name`] !== undefined ? editingValues[`${phase.id}_name`] : phase.name}
                                        onChange={(e) => {
                                            handleInputChange(phase.id, 'name', e.target.value);
                                        }}
                                        onBlur={() => {
                                            const value = editingValues[`${phase.id}_name`] !== undefined 
                                                ? editingValues[`${phase.id}_name`] 
                                                : phase.name;
                                            if (value.trim()) {
                                                debouncedUpdate(phase.id, 'name', value.trim());
                                            }
                                            setEditingNamePhaseId(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.target.blur();
                                            } else if (e.key === 'Escape') {
                                                setEditingValues(prev => {
                                                    const newValues = { ...prev };
                                                    delete newValues[`${phase.id}_name`];
                                                    return newValues;
                                                });
                                                setEditingNamePhaseId(null);
                                            }
                                        }}
                                        className="flex-1 px-2 py-1 text-sm font-semibold border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        autoFocus
                                        disabled={isLoading}
                                    />
                                ) : (
                                    <h4 
                                        className={`font-semibold text-sm flex items-center gap-1 ${isAuthorized() ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                                        onClick={isAuthorized() ? () => setEditingNamePhaseId(phase.id) : undefined}
                                        title={isAuthorized() ? "Click to edit" : undefined}
                                    >
                                        {editingValues[`${phase.id}_name`] !== undefined ? editingValues[`${phase.id}_name`] : phase.name}
                                        {isAuthorized() && (
                                            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        )}
                                    </h4>
                                )}
                            </div>
                            {isEditing && isAuthorized() && (
                                <button
                                    onClick={() => handleDeletePhase(phase.id)}
                                    className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                                >
                                    Delete
                                </button>
                            )}
                        </div>

                        {/* Progress */}
                        <div className="mb-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-600">Progress</span>
                                {editingProgressPhaseId === phase.id && isAuthorized() ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={editingValues[`${phase.id}_progress`] !== undefined ? editingValues[`${phase.id}_progress`] : phase.progress}
                                            onChange={(e) => {
                                                const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                handleInputChange(phase.id, 'progress', value);
                                            }}
                                            onBlur={() => {
                                                const value = editingValues[`${phase.id}_progress`] !== undefined 
                                                    ? editingValues[`${phase.id}_progress`] 
                                                    : phase.progress;
                                                debouncedUpdate(phase.id, 'progress', value);
                                                setEditingProgressPhaseId(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.target.blur();
                                                } else if (e.key === 'Escape') {
                                                    setEditingValues(prev => {
                                                        const newValues = { ...prev };
                                                        delete newValues[`${phase.id}_progress`];
                                                        return newValues;
                                                    });
                                                    setEditingProgressPhaseId(null);
                                                }
                                            }}
                                            className="w-16 px-2 py-1 text-xs font-semibold border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            autoFocus
                                            disabled={isLoading}
                                        />
                                        <span className="text-xs font-semibold">%</span>
                                    </div>
                                ) : (
                                    <span 
                                        className={`text-xs font-semibold flex items-center gap-1 ${isAuthorized() ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                                        onClick={isAuthorized() ? () => setEditingProgressPhaseId(phase.id) : undefined}
                                        title={isAuthorized() ? "Click to edit" : undefined}
                                    >
                                        {editingValues[`${phase.id}_progress`] !== undefined ? editingValues[`${phase.id}_progress`] : phase.progress}%
                                        {isAuthorized() && (
                                            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        )}
                                    </span>
                                )}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${editingValues[`${phase.id}_progress`] !== undefined ? editingValues[`${phase.id}_progress`] : phase.progress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Budget Input - Only show when editing and user has edit permission */}
                        {isEditing && (
                            <PermissionGuard permission="can_edit_projects">
                            <div className="mt-3">
                                <label className="text-xs text-gray-600 block mb-1">Budget</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">$</span>
                                    <input
                                        type="number"
                                        value={editingValues[`${phase.id}_budget`] !== undefined ? editingValues[`${phase.id}_budget`] : (phase.budget || '')}
                                        onChange={(e) => handleInputChange(phase.id, 'budget', parseFloat(e.target.value) || 0)}
                                        onBlur={() => handleInputBlur(phase.id, 'budget')}
                                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                        placeholder="0"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            </PermissionGuard>
                        )}
                    </div>
                        {isDragTarget && dragOverPosition === 'bottom' && (
                            <div className="h-2 mt-1 rounded border-2 border-dashed border-blue-400 bg-blue-50"></div>
                        )}
                    </div>
                )})}
            </div>

            {/* Phase Modal */}
            {showPhaseModal && (
                <PhaseModal
                    phase={editingPhase}
                    onClose={() => {
                        setShowPhaseModal(false);
                        setEditingPhase(null);
                    }}
                    onSave={editingPhase ? 
                        (data) => handlePhaseUpdate(editingPhase.id, data) :
                        handleAddPhase
                    }
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}

// Phase Modal Component
function PhaseModal({ phase, onClose, onSave, isLoading }) {
    const [formData, setFormData] = useState({
        name: phase?.name || '',
        budget: phase?.budget || 0,
        progress: phase?.progress || 0
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 backdrop-blur-[2px] bg-white/20 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">
                    {phase ? 'Edit Phase' : 'Add New Phase'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phase Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Budget ($)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={formData.budget}
                            onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Initial Progress (%)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.progress}
                            onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {isLoading ? 'Saving...' : (phase ? 'Update' : 'Add')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default BuildPath;
