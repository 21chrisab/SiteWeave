import React, { useState, useEffect, useRef } from 'react';
import { supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

function LiveActivityIndicator() {
    const { addToast } = useToast();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isConnected, setIsConnected] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const previousOnlineState = useRef(navigator.onLine);
    const previousConnectedState = useRef(false);

    // Check network and Supabase connection status
    const checkConnectionStatus = async () => {
        setIsChecking(true);
        
        // Check basic network connectivity
        const networkOnline = navigator.onLine;
        const wasOnline = previousOnlineState.current;
        previousOnlineState.current = networkOnline;
        setIsOnline(networkOnline);

        // If network is offline, we can't check Supabase
        if (!networkOnline) {
            const wasConnected = previousConnectedState.current;
            previousConnectedState.current = false;
            setIsConnected(false);
            setIsChecking(false);
            
            // Show error toast when connection is lost (longer duration for critical errors)
            if (wasOnline) {
                addToast('Network Connection Lost - Some features may not work until connection is restored.', 'error', 10000);
            }
            return;
        }

        // Check Supabase connection with a simple health check
        try {
            // Make a lightweight query to check Supabase connectivity
            const { error } = await supabaseClient
                .from('projects')
                .select('id')
                .limit(1);
            
            const nowConnected = !error;
            const wasConnected = previousConnectedState.current;
            previousConnectedState.current = nowConnected;
            setIsConnected(nowConnected);
            
            // Show error toast when database connection is lost (longer duration for critical errors)
            if (wasConnected && !nowConnected) {
                addToast('Database Connection Lost - Unable to sync data. Please check your internet connection.', 'error', 10000);
            }
            
            // Show success toast when database connection is restored
            if (!wasConnected && nowConnected) {
                addToast('Database connection restored. Data will sync automatically.', 'success');
            }
        } catch (err) {
            console.error('Connection check failed:', err);
            const wasConnected = previousConnectedState.current;
            previousConnectedState.current = false;
            setIsConnected(false);
            
            // Show error toast when connection check fails (longer duration for critical errors)
            if (wasConnected) {
                addToast('Database Connection Lost - Unable to sync data. Please check your internet connection.', 'error', 10000);
            }
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        // Initial check
        checkConnectionStatus();

        // Check every 10 seconds
        const interval = setInterval(checkConnectionStatus, 10000);

        // Listen to browser online/offline events for immediate updates
        const handleOnline = () => {
            const wasOffline = !previousOnlineState.current;
            previousOnlineState.current = true;
            setIsOnline(true);
            if (wasOffline) {
                addToast('Network connection restored. Checking database connection...', 'info');
            }
            checkConnectionStatus();
        };
        
        const handleOffline = () => {
            const wasOnline = previousOnlineState.current;
            previousOnlineState.current = false;
            setIsOnline(false);
            setIsConnected(false);
            if (wasOnline) {
                addToast('Network Connection Lost - Some features may not work until connection is restored.', 'error', 10000);
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Determine status: online if both network and Supabase are connected
    const isActive = isOnline && isConnected;
    const statusText = isChecking ? 'Checking...' : (isActive ? 'Live' : 'Offline');

    return (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
            <div 
                className={`w-2 h-2 rounded-full transition-colors ${
                    isActive 
                        ? 'bg-green-500 animate-pulse' 
                        : isOnline 
                            ? 'bg-yellow-500' 
                            : 'bg-gray-400'
                }`} 
                title={isActive ? 'Connected to network and database' : isOnline ? 'Network connected, database unreachable' : 'No network connection'}
            />
            <span>{statusText}</span>
        </div>
    );
}

export default LiveActivityIndicator;
