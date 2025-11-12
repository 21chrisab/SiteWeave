import React from 'react';
import { useAppContext } from '../context/AppContext';
import BuildPath from './BuildPath';
import Avatar from './Avatar';

function ProjectSidebar({ project }) {
    const { state } = useAppContext();
    
    // Get recent activity for this specific project (filtered by RLS)
    const projectActivity = state.activityLog
        .filter(activity => activity.project_id === project.id)
        .slice(0, 2)
        .map(activity => ({
            id: activity.id,
            user: { 
                name: activity.user_name, 
                avatar: activity.user_avatar || null // null means use default Avatar component
            }, 
            action: activity.action,
            time: formatTimeAgo(activity.created_at)
        }));

    // Helper function to format time ago
    function formatTimeAgo(dateString) {
        const now = new Date();
        const activityDate = new Date(dateString);
        const diffInMinutes = Math.floor((now - activityDate) / (1000 * 60));
        
        if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        } else if (diffInMinutes < 1440) {
            return `${Math.floor(diffInMinutes / 60)}h ago`;
        } else {
            return `${Math.floor(diffInMinutes / 1440)}d ago`;
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const hasMilestones = project.milestones && Array.isArray(project.milestones) && project.milestones.length > 0;

    return (
        <div className="space-y-6">
            {hasMilestones && (
                <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold mb-3">Overview</h3>
                    <ul className="space-y-3">
                        {project.milestones.map((m, index) => (
                            <li key={index} className="flex justify-between items-center text-sm">
                                <span className="font-medium">{m.name}</span>
                                <span className="text-gray-500">Due: {formatDate(m.due_date)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            {/* Progress Status Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[600px] overflow-hidden">
                <BuildPath project={project} />
            </div>
            
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold mb-3">Recent Activity</h3>
                 <div className="space-y-3">
                    {projectActivity.length > 0 ? projectActivity.map(activity => (
                        <div key={activity.id} className="flex items-start gap-3 text-sm">
                            {activity.user.avatar ? (
                                <img src={activity.user.avatar} alt={activity.user.name} className="w-8 h-8 rounded-full mt-1" />
                            ) : (
                                <div className="mt-1">
                                    <Avatar name={activity.user.name} size="sm" />
                                </div>
                            )}
                            <div>
                                <p><span className="font-semibold">{activity.user.name}</span> {activity.action}</p>
                                <p className="text-xs text-gray-400">{activity.time}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-center py-4 text-gray-400">No recent activity for this project.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProjectSidebar;