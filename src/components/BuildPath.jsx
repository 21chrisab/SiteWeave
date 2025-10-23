import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

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
    const { dispatch } = useAppContext();
    const { addToast } = useToast();
    const [phases, setPhases] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingPhase, setEditingPhase] = useState(null);
    const [showPhaseModal, setShowPhaseModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingValues, setEditingValues] = useState({});

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
    }, [project?.id]);

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


    const handlePhaseUpdate = async (phaseId, updates) => {
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
    };

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
            await handlePhaseUpdate(phaseId, updates);
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
                <h3 className="font-bold text-lg">BuildPath</h3>
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
                <div className="text-xs text-gray-600">
                    {formatCurrency(calculateSpentAmount())} of {formatCurrency(calculateTotalBudget())} spent
                </div>
            </div>

            {/* Phases List - Fixed height with scroll */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {phases.map((phase, index) => (
                    <div key={phase.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <h4 className="font-semibold text-sm">{phase.name}</h4>
                            </div>
                            {isEditing && (
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            setEditingPhase(phase);
                                            setShowPhaseModal(true);
                                        }}
                                        className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeletePhase(phase.id)}
                                        className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-600">Progress</span>
                                <span className="text-xs font-semibold">
                                    {editingValues[`${phase.id}_progress`] !== undefined ? editingValues[`${phase.id}_progress`] : phase.progress}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${editingValues[`${phase.id}_progress`] !== undefined ? editingValues[`${phase.id}_progress`] : phase.progress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Progress Controls */}
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={editingValues[`${phase.id}_progress`] !== undefined ? editingValues[`${phase.id}_progress`] : phase.progress}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    handleInputChange(phase.id, 'progress', value);
                                    debouncedUpdate(phase.id, 'progress', value);
                                }}
                                className="flex-1"
                                disabled={isLoading}
                            />
                            <span className="text-xs text-gray-500 w-12 text-right">
                                {editingValues[`${phase.id}_progress`] !== undefined ? editingValues[`${phase.id}_progress`] : phase.progress}%
                            </span>
                        </div>

                        {/* Budget Input - Only show when editing */}
                        {isEditing && (
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
                        )}
                    </div>
                ))}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
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
