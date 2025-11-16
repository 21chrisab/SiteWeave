// Helper functions for project calculations

export const calculateProjectProgress = async (projectId, supabaseClient) => {
    try {
        const { data: phases, error } = await supabaseClient
            .from('project_phases')
            .select('*')
            .eq('project_id', projectId)
            .order('order');

        if (error || !phases || phases.length === 0) return 0;

        const totalBudget = phases.reduce((sum, phase) => sum + (phase.budget || 0), 0);
        if (totalBudget === 0) return 0;

        const totalWeightedProgress = phases.reduce((sum, phase) => {
            const phaseWeight = (phase.budget || 0) / totalBudget;
            return sum + (phase.progress * phaseWeight);
        }, 0);

        return Math.round(totalWeightedProgress);
    } catch (error) {
        console.error('Error calculating project progress:', error);
        return 0;
    }
};

export const calculateProjectBudget = async (projectId, supabaseClient) => {
    try {
        const { data: phases, error } = await supabaseClient
            .from('project_phases')
            .select('budget, progress')
            .eq('project_id', projectId);

        if (error || !phases || phases.length === 0) {
            return { total: 0, spent: 0, remaining: 0 };
        }

        const total = phases.reduce((sum, phase) => sum + (phase.budget || 0), 0);
        const spent = phases.reduce((sum, phase) => {
            return sum + ((phase.budget || 0) * (phase.progress / 100));
        }, 0);
        const remaining = total - spent;

        return { total, spent, remaining };
    } catch (error) {
        console.error('Error calculating project budget:', error);
        return { total: 0, spent: 0, remaining: 0 };
    }
};

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export const formatDateShort = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Normalize status to canonical format
export const normalizeStatusDisplay = (status) => {
    if (!status) return null;
    const lower = status.trim().toLowerCase();
    if (lower === 'planning') return 'Planning';
    if (lower === 'in progress' || lower === 'in-progress') return 'In Progress';
    if (lower === 'on hold' || lower === 'on-hold') return 'On Hold';
    if (lower === 'completed') return 'Completed';
    if (lower === 'cancelled' || lower === 'canceled') return 'Cancelled';
    return status.trim(); // Return trimmed original if not recognized
};

export const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const normalized = status.trim().toLowerCase();
    switch (normalized) {
        case 'planning':
            return 'bg-blue-100 text-blue-800';
        case 'in progress':
        case 'in-progress':
            return 'bg-green-100 text-green-800';
        case 'on hold':
        case 'on-hold':
            return 'bg-yellow-100 text-yellow-900';
        case 'completed':
            return 'bg-gray-100 text-gray-800';
        case 'cancelled':
        case 'canceled':
            return 'bg-gray-100 text-gray-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

