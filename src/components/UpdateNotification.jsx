import React, { useState, useEffect } from 'react';
import Icon from './Icon';

/**
 * UpdateNotification - Shows notifications for app updates
 * Only works in Electron (desktop app)
 */
function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    const checkElectron = window.electronAPI !== undefined;
    setIsElectron(checkElectron);

    if (!checkElectron) return;

    // Listen for update events from Electron main process
    const handleUpdateAvailable = () => {
      console.log('Update available');
      setUpdateAvailable(true);
    };

    const handleUpdateDownloaded = () => {
      console.log('Update downloaded');
      setUpdateDownloaded(true);
      setUpdateAvailable(false);
    };

    // Set up listeners via electronAPI
    if (window.electronAPI) {
      window.electronAPI.onUpdateAvailable(handleUpdateAvailable);
      window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded);
    }
  }, []);

  const handleInstallUpdate = async () => {
    if (window.electronAPI?.installUpdate) {
      await window.electronAPI.installUpdate();
    }
  };

  const handleCheckForUpdates = async () => {
    if (window.electronAPI?.checkForUpdates) {
      const result = await window.electronAPI.checkForUpdates();
      if (result?.success) {
        if (result.updateInfo) {
          setUpdateAvailable(true);
        } else {
          alert('You are running the latest version!');
        }
      } else {
        console.error('Update check failed:', result?.error);
      }
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
    setUpdateDownloaded(false);
  };

  // Don't render anything if not in Electron
  if (!isElectron) return null;

  // Update downloaded - ready to install
  if (updateDownloaded) {
    return (
      <div className="fixed bottom-4 right-4 max-w-md bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 z-50 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Icon 
              path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              className="w-6 h-6 text-green-600"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-green-900 mb-1">
              Update Downloaded
            </h3>
            <p className="text-sm text-green-700 mb-3">
              A new version has been downloaded and is ready to install. Restart the app to apply the update.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallUpdate}
                className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
              >
                Restart & Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-white text-green-700 text-sm font-medium rounded border border-green-300 hover:bg-green-50 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-green-400 hover:text-green-600 transition-colors"
          >
            <Icon 
              path="M6 18L18 6M6 6l12 12"
              className="w-5 h-5"
            />
          </button>
        </div>
      </div>
    );
  }

  // Update available - downloading
  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 max-w-md bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 z-50 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Icon 
              path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              className="w-6 h-6 text-blue-600"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              Update Available
            </h3>
            <p className="text-sm text-blue-700">
              Downloading the latest version in the background...
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors"
          >
            <Icon 
              path="M6 18L18 6M6 6l12 12"
              className="w-5 h-5"
            />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default UpdateNotification;
