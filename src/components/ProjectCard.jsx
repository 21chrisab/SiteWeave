import React, { useState, memo } from 'react';
import { useAppContext } from '../context/AppContext';
import Icon from './Icon';
import Avatar from './Avatar';
import ProjectProgressCard from './ProjectProgressCard';

const ProjectCard = memo(function ProjectCard({ project, onEdit, onDelete }) {
    const { dispatch, state } = useAppContext();
    const [showActions, setShowActions] = useState(false);
    
    // Get team members for this project
    const teamMembers = state.contacts.filter(contact => 
        contact.project_contacts && contact.project_contacts.some(pc => pc.project_id === project.id) && contact.type === 'Team'
    );
    
    // Auto-determine status color based on status
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'planning':
                return 'bg-blue-100 text-blue-800';
            case 'in progress':
                return 'bg-green-100 text-green-800';
            case 'on hold':
                return 'bg-orange-100 text-orange-800';
            case 'completed':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const handleCardClick = (e) => {
        // Don't navigate if clicking on action buttons
        if (e.target.closest('.project-actions')) {
            return;
        }
        dispatch({ type: 'SET_PROJECT', payload: project.id });
        dispatch({ type: 'SET_VIEW', payload: 'Projects' });
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        onEdit(project);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        onDelete(project);
    };

    return (
        <div 
            onClick={handleCardClick} 
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3 cursor-pointer hover:border-blue-500 transition-all hover-lift animate-slide-in relative group"
            role="button"
            tabIndex={0}
            aria-label={`Project: ${project.name}, Status: ${project.status}, Due: ${formatDate(project.due_date)}`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(e);
                }
            }}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                    <h3 className="font-bold">{project.name}</h3>
                    <p className="text-xs text-gray-500">{project.project_type}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>{project.status}</span>
                    {project.notification_count > 0 && (
                        <div className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                            {project.notification_count}
                        </div>
                    )}
                </div>
            </div>
            <div>
                <p className="text-xs text-gray-400 font-semibold">NEXT MILESTONE</p>
                <p className="text-sm font-medium">{typeof project.next_milestone === 'string' ? project.next_milestone : (project.next_milestone?.name || project.next_milestone?.title || 'No milestone')}</p>
            </div>
            
            {/* BuildPath Progress */}
            <ProjectProgressCard project={project} />
            
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div>
                    <p className="text-xs text-gray-400 font-semibold">DUE DATE</p>
                    <p className="text-sm font-medium">{formatDate(project.due_date)}</p>
                </div>
                <div className="flex -space-x-2">
                    {teamMembers.slice(0, 3).map(member => (
                        <Avatar key={member.id} name={member.name} size="sm" className="border-2 border-white" />
                    ))}
                    {teamMembers.length === 0 && (
                        <div className="text-xs text-gray-400 italic">No team assigned</div>
                    )}
                </div>
            </div>
            
            {/* Action buttons */}
            <div className={`project-actions absolute top-3 right-3 flex gap-1 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`} role="group" aria-label="Project actions">
                <button
                    onClick={handleEdit}
                    className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                    aria-label={`Edit project: ${project.name}`}
                >
                    <Icon path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleDelete}
                    className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm"
                    aria-label={`Delete project: ${project.name}`}
                >
                    <Icon path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
});

export default ProjectCard;

