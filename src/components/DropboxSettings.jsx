import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import dropboxStorage from '../utils/dropboxStorage';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';
import DropboxFileBrowser from './DropboxFileBrowser';

function DropboxSettings() {
  const { state, dispatch } = useAppContext();
  const { addToast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [storageUsage, setStorageUsage] = useState(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);

  // Load account info when connected
  useEffect(() => {
    if (state.dropboxConnected) {
      setConnectionStatus('connected');
      if (!accountInfo) {
        loadAccountInfo();
      }
      setLastSyncTime(new Date());
    } else {
      setConnectionStatus('disconnected');
      setAccountInfo(null);
    }
  }, [state.dropboxConnected]);

  // Check connection status periodically
  useEffect(() => {
    if (state.dropboxConnected) {
      const interval = setInterval(async () => {
        try {
          const isConnected = await dropboxStorage.checkConnection();
          if (!isConnected) {
            setConnectionStatus('error');
          }
        } catch (error) {
          setConnectionStatus('error');
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [state.dropboxConnected]);

  const loadAccountInfo = async () => {
    setIsLoadingAccount(true);
    try {
      const info = await dropboxStorage.getAccountInfo();
      setAccountInfo(info);
      // Also load storage usage
      await loadStorageUsage();
    } catch (error) {
      console.error('Error loading account info:', error);
      addToast('Error loading Dropbox account information', 'error');
    } finally {
      setIsLoadingAccount(false);
    }
  };

  const loadStorageUsage = async () => {
    setIsLoadingStorage(true);
    try {
      const usage = await dropboxStorage.getStorageUsage();
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error loading storage usage:', error);
      // Don't show toast for storage usage errors, it's optional
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const formatStorageSize = (bytes) => {
    if (!bytes) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(2)} KB`;
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    try {
      const accessToken = await dropboxStorage.startOAuthFlow();
      dispatch({ type: 'SET_DROPBOX_TOKEN', payload: accessToken });
      setConnectionStatus('connected');
      setLastSyncTime(new Date());
      addToast('Successfully connected to Dropbox!', 'success');
      // Load account info after connection
      await loadAccountInfo();
    } catch (error) {
      console.error('Dropbox connection error:', error);
      setConnectionStatus('error');
      addToast(`Failed to connect to Dropbox: ${error.message}`, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      dropboxStorage.disconnect();
      dispatch({ type: 'DISCONNECT_DROPBOX' });
      setAccountInfo(null);
      setConnectionStatus('disconnected');
      setLastSyncTime(null);
      addToast('Disconnected from Dropbox', 'success');
    } catch (error) {
      console.error('Error disconnecting:', error);
      addToast('Error disconnecting from Dropbox', 'error');
    }
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const now = new Date();
    const diff = now - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
          <Icon 
            path="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
            className="w-6 h-6 text-white" 
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Dropbox Storage</h3>
          <p className="text-sm text-gray-500">Connect your Dropbox account for file storage</p>
        </div>
      </div>

      {state.dropboxConnected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5" />
              <span className="font-medium">Connected to Dropbox</span>
            </div>
            {connectionStatus === 'connected' && lastSyncTime && (
              <span className="text-xs text-gray-500">Last sync: {formatLastSync()}</span>
            )}
          </div>

          {isLoadingAccount ? (
            <div className="flex items-center gap-2 text-gray-500">
              <LoadingSpinner size="sm" text="" />
              <span className="text-sm">Loading account information...</span>
            </div>
          ) : accountInfo ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                {accountInfo.profile_photo_url ? (
                  <img 
                    src={accountInfo.profile_photo_url} 
                    alt={accountInfo.name.display_name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {accountInfo.name.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{accountInfo.name.display_name}</p>
                  <p className="text-sm text-gray-500">{accountInfo.email}</p>
                  {accountInfo.account_id && (
                    <p className="text-xs text-gray-400 mt-0.5">Account ID: {accountInfo.account_id.slice(0, 8)}...</p>
                  )}
                </div>
              </div>
              
              {/* Storage Usage */}
              {storageUsage && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Storage Usage</span>
                    {isLoadingStorage && (
                      <LoadingSpinner size="sm" text="" />
                    )}
                  </div>
                  {storageUsage.allocation ? (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ 
                            width: `${Math.min(100, (storageUsage.used / storageUsage.allocation) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{formatStorageSize(storageUsage.used)} used</span>
                        <span>{formatStorageSize(storageUsage.allocation)} total</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {formatStorageSize(storageUsage.used)} used
                      {storageUsage.type === 'team' && ' (Team account)'}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">Unable to load account information. Please try refreshing.</p>
            </div>
          )}

          {connectionStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Icon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Connection Error</p>
                  <p className="text-sm text-red-700 mt-1">There was an issue with your Dropbox connection. Try reconnecting.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={loadAccountInfo}
              disabled={isLoadingAccount}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoadingAccount ? (
                <>
                  <LoadingSpinner size="sm" text="" />
                  Loading...
                </>
              ) : (
                <>
                  <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-4 h-4" />
                  Refresh Info
                </>
              )}
            </button>
            {connectionStatus === 'error' && (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                {isConnecting ? 'Reconnecting...' : 'Reconnect'}
              </button>
            )}
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Icon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" className="w-5 h-5" />
            <span className="text-sm">Not connected to Dropbox</span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Connect to Dropbox</p>
                <p className="text-sm text-blue-700 mt-1">
                  Connect your Dropbox account to store project files, field issue attachments, and message files directly in your Dropbox cloud storage.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Connecting...</span>
              </div>
            ) : (
              'Connect to Dropbox'
            )}
          </button>
        </div>
      )}

      {state.dropboxConnected && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">File Browser</h4>
          <div className="max-h-96 overflow-y-auto">
            <DropboxFileBrowser folderPath="/SiteWeave" />
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">How it works:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Files are stored in your Dropbox account under /SiteWeave/</li>
          <li>• Each project gets its own folder for organization</li>
          <li>• Field issues and messages have separate folders</li>
          <li>• Files are accessible through Dropbox shared links</li>
          <li>• You can browse and delete files directly from Settings</li>
        </ul>
      </div>
    </div>
  );
}

export default DropboxSettings;

