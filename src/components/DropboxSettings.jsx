import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import dropboxStorage from '../utils/dropboxStorage';
import Icon from './Icon';

function DropboxSettings() {
  const { state, dispatch } = useAppContext();
  const { addToast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);

  // Load account info when connected
  useEffect(() => {
    if (state.dropboxConnected && !accountInfo) {
      loadAccountInfo();
    }
  }, [state.dropboxConnected]);

  const loadAccountInfo = async () => {
    setIsLoadingAccount(true);
    try {
      const info = await dropboxStorage.getAccountInfo();
      setAccountInfo(info);
    } catch (error) {
      console.error('Error loading account info:', error);
      addToast('Error loading Dropbox account information', 'error');
    } finally {
      setIsLoadingAccount(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const accessToken = await dropboxStorage.startOAuthFlow();
      dispatch({ type: 'SET_DROPBOX_TOKEN', payload: accessToken });
      addToast('Successfully connected to Dropbox!', 'success');
    } catch (error) {
      console.error('Dropbox connection error:', error);
      addToast(`Failed to connect to Dropbox: ${error.message}`, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    dropboxStorage.disconnect();
    dispatch({ type: 'DISCONNECT_DROPBOX' });
    setAccountInfo(null);
    addToast('Disconnected from Dropbox', 'success');
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
          <div className="flex items-center gap-2 text-green-600">
            <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5" />
            <span className="font-medium">Connected to Dropbox</span>
          </div>

          {isLoadingAccount ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm">Loading account information...</span>
            </div>
          ) : accountInfo ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{accountInfo.name.display_name}</p>
                  <p className="text-sm text-gray-500">{accountInfo.email}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              onClick={loadAccountInfo}
              disabled={isLoadingAccount}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingAccount ? 'Loading...' : 'Refresh Info'}
            </button>
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

      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">How it works:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Files are stored in your Dropbox account under /SiteWeave/</li>
          <li>• Each project gets its own folder for organization</li>
          <li>• Field issues and messages have separate folders</li>
          <li>• Files are accessible through Dropbox shared links</li>
        </ul>
      </div>
    </div>
  );
}

export default DropboxSettings;
