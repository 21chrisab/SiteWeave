import React, { useState, useEffect } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import PermissionGuard from './PermissionGuard';

function ProjectProgressCard({ project }) {
    const { dispatch } = useAppContext();
    const { addToast } = useToast();
    const [phases, setPhases] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!project?.id) return;
        loadPhases();
    }, [project?.id]);

    const loadPhases = async () => {
        try {
            if (!project?.id) {
                setPhases([]);
                return;
            }
            const { data, error } = await supabaseClient
                .from('project_phases')
                .select('*')
                .eq('project_id', project.id)
                .order('order');

            if (error) {
                console.error('Error loading phases:', error);
                setPhases([]);
            } else {
                setPhases(data || []);
            }
        } catch (error) {
            console.error('Error loading phases:', error);
            setPhases([]);
        } finally {
            setIsLoading(false);
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


    const getProgressColor = (progress) => {
        return 'bg-blue-500';
    };

    if (isLoading) {
        return (
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    const overallProgress = calculateOverallProgress();
    const totalBudget = calculateTotalBudget();
    const spentAmount = calculateSpentAmount();

    return (
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-sm text-gray-700">Progress Status</h3>
                <span className="text-sm font-bold text-gray-900">{overallProgress}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
                <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(overallProgress)}`}
                    style={{ 
                        width: `${Math.max(0, Math.min(100, overallProgress))}%`,
                        minWidth: overallProgress > 0 ? '2px' : '0px'
                    }}
                ></div>
            </div>

            {/* Budget Information - Only visible to users with can_view_financials permission */}
            <PermissionGuard permission="can_view_financials">
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>Total Budget</span>
                        <span className="font-medium">{formatCurrency(totalBudget)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>Spent</span>
                        <span className="font-medium">{formatCurrency(spentAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>Remaining</span>
                        <span className="font-medium">{formatCurrency(totalBudget - spentAmount)}</span>
                    </div>
                </div>
            </PermissionGuard>

            {/* Simple Phase Count */}
            {phases.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                        {phases.length} phases • {phases.filter(p => p.progress === 100).length} complete
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProjectProgressCard;
