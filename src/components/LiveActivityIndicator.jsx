import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

function LiveActivityIndicator() {
    const { state } = useAppContext();
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        // Simulate live activity based on recent changes
        const hasRecentActivity = state.tasks.length > 0 || state.messages.length > 0;
        setIsActive(hasRecentActivity);

        // Blink effect for live indicator
        const interval = setInterval(() => {
            setIsActive(prev => !prev);
        }, 2000);

        return () => clearInterval(interval);
    }, [state.tasks.length, state.messages.length]);

    return (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span>{isActive ? 'Live' : 'Offline'}</span>
        </div>
    );
}

export default LiveActivityIndicator;
