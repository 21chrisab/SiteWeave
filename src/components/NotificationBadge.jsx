import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

function NotificationBadge() {
    const { state } = useAppContext();
    const [notifications, setNotifications] = useState([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Simulate real-time notifications based on recent activity
        const recentActivity = [
            { id: 1, message: 'New task added to Downtown Office Complex', time: '2m ago', type: 'task' },
            { id: 2, message: 'Project Oceanview Residence status updated', time: '5m ago', type: 'project' },
            { id: 3, message: 'File uploaded to Riverside Apartments', time: '8m ago', type: 'file' },
            { id: 4, message: 'New message in Retail Complex channel', time: '12m ago', type: 'message' },
        ];

        setNotifications(recentActivity);
        setIsVisible(true);

        // Auto-hide after 5 seconds
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 5000);

        return () => clearTimeout(timer);
    }, [state.projects.length, state.tasks.length, state.messages.length]);

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
