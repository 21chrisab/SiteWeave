import React, { memo } from 'react';
import { useAppContext } from '../context/AppContext';

const DashboardStats = memo(function DashboardStats() {
    const { state } = useAppContext();
    
    // Calculate statistics
    const totalProjects = state.projects.length;
    const activeProjects = state.projects.filter(p => p.status !== 'completed').length;
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.completed).length;
    const overdueTasks = state.tasks.filter(task => {
        if (!task.due_date || task.completed) return false;
        return new Date(task.due_date) < new Date();
    }).length;
    
    const stats = [
        {
            title: 'Active Projects',
            value: activeProjects,
            total: null,
            color: 'blue',
            icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
        },
        {
            title: 'Tasks Completed',
            value: completedTasks,
            total: null,
            color: 'green',
            icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        },
        {
            title: 'Overdue Tasks',
            value: overdueTasks,
            total: null,
            color: overdueTasks > 0 ? 'red' : 'gray',
            icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        }
    ];
    
    const getColorClasses = (color) => {
        const colors = {
            blue: 'bg-blue-50 text-blue-600 border-blue-200',
            green: 'bg-green-50 text-green-600 border-green-200',
            red: 'bg-red-50 text-red-600 border-red-200',
            purple: 'bg-purple-50 text-purple-600 border-purple-200',
            gray: 'bg-gray-50 text-gray-600 border-gray-200'
        };
        return colors[color] || colors.gray;
    };
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {stats.map((stat, index) => (
                <div key={index} className={`p-4 rounded-lg border ${getColorClasses(stat.color)}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium opacity-75">{stat.title}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            {stat.total !== null && (
                                <p className="text-xs opacity-75">of {stat.total} total</p>
                            )}
                        </div>
                        <div className="p-2 rounded-lg bg-white bg-opacity-50">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                            </svg>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

export default DashboardStats;
