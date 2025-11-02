import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Avatar from './Avatar';

function MyDaySidebar() {
    const { state } = useAppContext();
    const [lastUpdate, setLastUpdate] = useState(new Date());

    useEffect(() => {
        // Update timestamp when tasks or events change
        setLastUpdate(new Date());
    }, [state.tasks.length, state.calendarEvents.length]);

    const myTodos = state.tasks.filter(task => 
        task.assignee_id === state.user.id && !task.completed
    );

    const today = new Date();
    const todayEvents = state.calendarEvents.filter(event => 
        new Date(event.start_time).toDateString() === today.toDateString()
    );

    // Get recent activity from the database (filtered by RLS)
    const recentActivity = state.activityLog.slice(0, 4).map(activity => ({
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">My Day</h2>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Live</span>
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">TO-DO ({myTodos.length})</h3>
                <div className="space-y-2">
                    {myTodos.length > 0 ? myTodos.map(task => (
                        <div key={task.id} className="flex items-center gap-3 text-sm">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                            <span>{task.text}</span>
                        </div>
                    )) : <p className="text-sm text-center py-4 text-gray-400">No tasks assigned to you.</p>}
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">RECENT ACTIVITY</h3>
                 <div className="space-y-3">
                    {recentActivity.length > 0 ? recentActivity.map(activity => (
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
                        <p className="text-sm text-center py-4 text-gray-400">No recent activity.</p>
                    )}
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">TODAY'S CALENDAR ({todayEvents.length})</h3>
                 <div className="space-y-3">
                     {todayEvents.length > 0 ? todayEvents.map(event => {
                        const startTime = new Date(event.start_time);
                        const endTime = new Date(event.end_time);
                        const timeString = startTime.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                        });
                        const location = event.location || 'No location specified';
                        
                        // Determine icon based on event category or title
                        const getEventIcon = () => {
                            const title = event.title.toLowerCase();
                            const category = event.category?.toLowerCase();
                            
                            if (title.includes('standup') || title.includes('meeting') || category === 'meeting') {
                                // Video camera icon for meetings
                                return "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z";
                            } else if (title.includes('site') || title.includes('visit') || title.includes('inspection')) {
                                // Map pin icon for site visits
                                return "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12 12 5.373 12 12z";
                            } else if (title.includes('presentation') || title.includes('demo')) {
                                // Presentation screen icon
                                return "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l-1-3m1 3l-1-3m-16.5-3h9v2.25M6 20.25l2.25-2.25M6 20.25l-2.25-2.25M6 20.25v-2.25";
                            } else {
                                // Calendar icon for general events
                                return "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5";
                            }
                        };

                        return (
                            <div key={event.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#3B82F6" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d={getEventIcon()} />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 text-sm">{event.title}</h4>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {timeString} • {location}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                     }) : <p className="text-sm text-center py-4 text-gray-400">No events scheduled today.</p>}
                </div>
            </div>
            <div className="text-xs text-gray-400 pt-2 border-t border-gray-200">
                Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
        </div>
    );
}

export default MyDaySidebar;