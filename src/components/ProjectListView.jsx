import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatDateShort, formatCurrency, getStatusColor, normalizeStatusDisplay } from '../utils/projectHelpers';
import { calculateProjectProgress, calculateProjectBudget } from '../utils/projectHelpers';
import { supabaseClient } from '../context/AppContext';

function ProjectListView({ projects, onEdit, onDelete, onProjectClick }) {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [projectData, setProjectData] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    // Load progress and budget data for all projects IN PARALLEL
    React.useEffect(() => {
        const loadProjectData = async () => {
            setIsLoading(true);
            // Initialize all projects with default values first
            const initialData = {};
            projects.forEach(project => {
                initialData[project.id] = { progress: 0, budget: { total: 0, spent: 0, remaining: 0 }, loading: true };
            });
            setProjectData(initialData); // Show initial state immediately
            
            // Load all project data in parallel for maximum performance
            try {
                const results = await Promise.all(
                    projects.map(async (project) => {
                        try {
                            const [progress, budget] = await Promise.all([
                                calculateProjectProgress(project.id, supabaseClient),
                                calculateProjectBudget(project.id, supabaseClient)
                            ]);
                            return {
                                id: project.id,
                                progress: progress || 0,
                                budget: budget || { total: 0, spent: 0, remaining: 0 }
                            };
                        } catch (error) {
                            console.error(`Error loading data for project ${project.id}:`, error);
                            return {
                                id: project.id,
                                progress: 0,
                                budget: { total: 0, spent: 0, remaining: 0 }
                            };
                        }
                    })
                );
                
                // Update all at once after parallel loading
                const newData = {};
                results.forEach(result => {
                    newData[result.id] = { progress: result.progress, budget: result.budget, loading: false };
                });
                setProjectData(newData);
            } catch (error) {
                console.error('Error loading project data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        if (projects.length > 0) {
            loadProjectData();
        } else {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projects.length, projects.map(p => p.id).join(',')]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedProjects = useMemo(() => {
        if (!sortConfig.key) return projects;

        return [...projects].sort((a, b) => {
            let aValue, bValue;

            switch (sortConfig.key) {
                case 'name':
                    aValue = a.name?.toLowerCase() || '';
                    bValue = b.name?.toLowerCase() || '';
                    break;
                case 'status':
                    aValue = a.status?.toLowerCase() || '';
                    bValue = b.status?.toLowerCase() || '';
                    break;
                case 'progress':
                    aValue = projectData[a.id]?.progress || 0;
                    bValue = projectData[b.id]?.progress || 0;
                    break;
                case 'due_date':
                    aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
                    bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
                    break;
                case 'budget_remaining':
                    aValue = projectData[a.id]?.budget?.remaining || 0;
                    bValue = projectData[b.id]?.budget?.remaining || 0;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [projects, sortConfig, projectData]);

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) {
            return (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }
        return sortConfig.direction === 'asc' ? (
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

    const getProgressColor = (progress) => {
        return 'bg-blue-500';
    };

    if (projects.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No projects found.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center gap-2">
                                    Project Name
                                    <SortIcon columnKey="name" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center gap-2">
                                    Status
                                    <SortIcon columnKey="status" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('progress')}
                            >
                                <div className="flex items-center gap-2">
                                    Progress
                                    <SortIcon columnKey="progress" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('due_date')}
                            >
                                <div className="flex items-center gap-2">
                                    Due Date
                                    <SortIcon columnKey="due_date" />
                                </div>
                            </th>
                            <th
                                className="pl-6 pr-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('budget_remaining')}
                            >
                                <div className="flex items-center gap-2">
                                    Budget Rem.
                                    <SortIcon columnKey="budget_remaining" />
                                </div>
                            </th>
                            <th className="pl-2 pr-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedProjects.map((project) => {
                            const data = projectData[project.id] || { progress: 0, budget: { remaining: 0 } };
                            const progress = Math.max(0, Math.min(100, data.progress || 0));
                            return (
                                <tr
                                    key={project.id}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => onProjectClick && onProjectClick(project)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-semibold text-gray-900">{project.name}</div>
                                        <div className="text-xs text-gray-500">{project.project_type}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                                            {normalizeStatusDisplay(project.status) || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {data.loading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-28 h-2.5 bg-gray-200 rounded-full animate-pulse"></div>
                                                <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="w-28 bg-gray-200 rounded-full h-2.5 relative overflow-hidden">
                                                    {progress > 0 ? (
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                                                            style={{ 
                                                                width: `${Math.max(0, Math.min(100, progress))}%`,
                                                                minWidth: '4px'
                                                            }}
                                                        ></div>
                                                    ) : (
                                                        <div
                                                            className="h-full rounded-full bg-gray-400 opacity-50"
                                                            style={{ width: '2px' }}
                                                        ></div>
                                                    )}
                                                </div>
                                                <span className="text-sm text-gray-600 w-12 text-right font-medium">{progress}%</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatDateShort(project.due_date) || '—'}
                                    </td>
                                    <td className="pl-6 pr-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {data.loading ? (
                                            <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                                        ) : (
                                            formatCurrency(data.budget?.remaining || 0)
                                        )}
                                    </td>
                                    <td className="pl-2 pr-3 py-3 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEdit(project);
                                                }}
                                                className="text-blue-600 hover:text-blue-800 p-0.5"
                                                title="Edit"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(project);
                                                }}
                                                className="text-red-600 hover:text-red-800 p-0.5"
                                                title="Delete"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ProjectListView;

