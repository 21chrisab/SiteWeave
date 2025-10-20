import React, { useState, useEffect } from 'react';

const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Listen for update events
    window.electronAPI.onUpdateAvailable(() => {
      setUpdateAvailable(true);
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setUpdateDownloaded(true);
      setUpdateAvailable(false);
    });

    window.electronAPI.onUpdateError((error) => {
      setUpdateError(error);
      setUpdateAvailable(false);
      setUpdateDownloaded(false);
    });

    // Check for updates on mount
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  };

  const installUpdate = async () => {
    setIsInstalling(true);
    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      console.error('Failed to install update:', error);
      setIsInstalling(false);
    }
  };

  const dismissNotification = () => {
    setUpdateAvailable(false);
    setUpdateDownloaded(false);
    setUpdateError(null);
  };

  if (updateError) {
    return (
      <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Update Error</h4>
            <p className="text-sm">{updateError}</p>
          </div>
          <button
            onClick={dismissNotification}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (updateDownloaded) {
    return (
      <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Update Ready</h4>
            <p className="text-sm">A new version is ready to install. Restart the app to apply the update.</p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={installUpdate}
              disabled={isInstalling}
              className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-3 py-1 rounded text-sm"
            >
              {isInstalling ? 'Installing...' : 'Restart'}
            </button>
            <button
              onClick={dismissNotification}
              className="text-green-500 hover:text-green-700"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (updateAvailable) {
    return (
      <div className="fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Update Available</h4>
            <p className="text-sm">Downloading update...</p>
          </div>
          <button
            onClick={dismissNotification}
            className="ml-4 text-blue-500 hover:text-blue-700"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default UpdateNotification;
