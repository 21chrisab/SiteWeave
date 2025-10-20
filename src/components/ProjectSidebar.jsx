import React from 'react';
import { useAppContext } from '../context/AppContext';
import BuildPath from './BuildPath';

function ProjectSidebar({ project }) {
    const { state } = useAppContext();

    const teamMembers = state.contacts.filter(contact => 
        contact.project_contacts && contact.project_contacts.some(pc => pc.project_id === project.id) && contact.type === 'Team'
    );
    
    // Static data for recent activity - in a real app, this would come from a 'activity_log' table
    const recentActivity = [
        { id: 1, user: { name: 'Sarah J.', avatar: 'https://i.pravatar.cc/150?u=sarah_j' }, action: 'uploaded 3 photos', time: '2h ago' },
        { id: 2, user: { name: 'Mike R.', avatar: 'https://i.pravatar.cc/150?u=mike_r' }, action: 'completed task "Review permits"', time: '4h ago' },
    ];

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold mb-3">Overview</h3>
                <ul className="space-y-3">
                   {project.milestones && Array.isArray(project.milestones) && project.milestones.map((m, index) => (
                       <li key={index} className="flex justify-between items-center text-sm">
                           <span className="font-medium">{m.name}</span>
                           <span className="text-gray-500">Due: {formatDate(m.due_date)}</span>
                       </li>
                   ))}
                   {(!project.milestones || !Array.isArray(project.milestones) || project.milestones.length === 0) && (
                       <li className="text-sm text-gray-500">No milestones defined</li>
                   )}
                </ul>
            </div>
            
            {/* BuildPath Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-96 overflow-hidden">
                <BuildPath project={project} />
            </div>
            
             <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold mb-3">Team ({teamMembers.length} members)</h3>
                <div className="flex items-center">
                    <div className="flex -space-x-2">
                        {teamMembers.slice(0, 5).map(member => (
                            <img key={member.id} src={member.avatar_url} title={member.name} className="w-10 h-10 rounded-full border-2 border-white" />
                        ))}
                    </div>
                    {teamMembers.length > 5 && (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 border-2 border-white">
                            +{teamMembers.length - 5}
                        </div>
                    )}
                </div>
            </div>
             <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold mb-3">Recent Activity</h3>
                 <div className="space-y-3">
                    {recentActivity.map(activity => (
                        <div key={activity.id} className="flex items-start gap-3 text-sm">
                            <img src={activity.user.avatar} className="w-8 h-8 rounded-full mt-1" />
                            <div>
                                <p><span className="font-semibold">{activity.user.name}</span> {activity.action}</p>
                                <p className="text-xs text-gray-400">{activity.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ProjectSidebar;