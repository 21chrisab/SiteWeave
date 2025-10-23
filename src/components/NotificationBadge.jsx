import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

function NotificationBadge() {
    const { state } = useAppContext();
    const [notifications, setNotifications] = useState([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Use real activity data from the database
        const recentActivity = state.activityLog.slice(0, 4).map(activity => ({
            id: activity.id,
            message: `${activity.user_name} ${activity.action}`,
            time: formatTimeAgo(activity.created_at),
            type: activity.entity_type || 'general'
        }));

        // Only show notifications if there's real activity
        if (recentActivity.length > 0) {
            setNotifications(recentActivity);
            setIsVisible(true);

            // Auto-hide after 5 seconds
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [state.activityLog]);

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

    if (!isVisible || notifications.length === 0) return null;

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-800">Recent Activity</h3>
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ×
                    </button>
                </div>
                <div className="space-y-2">
                    {notifications.slice(0, 3).map(notification => (
                        <div key={notification.id} className="flex items-start gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                                notification.type === 'task' ? 'bg-blue-500' :
                                notification.type === 'project' ? 'bg-green-500' :
                                notification.type === 'file' ? 'bg-purple-500' :
                                'bg-orange-500'
                            }`} />
                            <div className="flex-1">
                                <p className="text-gray-800">{notification.message}</p>
                                <p className="text-xs text-gray-500">{notification.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default NotificationBadge;
