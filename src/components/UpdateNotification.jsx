import React, { useState, useEffect } from 'react';

const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Listen for update events
    window.electronAPI.onUpdateAvailable(() => {
      setUpdateAvailable(true);
      setDownloadProgress(null); // Reset progress when new download starts
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setUpdateDownloaded(true);
      setUpdateAvailable(false);
      setDownloadProgress(null); // Clear progress when download completes
    });

    window.electronAPI.onUpdateError((error) => {
      // Filter out 404/latest.yml errors - these are normal when release artifacts aren't ready yet
      if (error && (error.includes('latest.yml') || error.includes('404'))) {
        console.log('Update check skipped: Release artifacts not available yet');
        return;
      }
      // Only show non-404 errors in UI
      setUpdateError(error);
      setUpdateAvailable(false);
      setUpdateDownloaded(false);
      setDownloadProgress(null);
    });

    // Listen for download progress
    if (window.electronAPI.onUpdateDownloadProgress) {
      window.electronAPI.onUpdateDownloadProgress((progress) => {
        setDownloadProgress(progress);
      });
    }

    // Check for updates on mount
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const result = await window.electronAPI.checkForUpdates();
      // Handle the new serializable response format
      if (result && !result.success) {
        // Only log error if it's not a "no update available" error
        if (result.error && !result.error.includes('latest.yml') && !result.error.includes('404')) {
          console.error('Failed to check for updates:', result.error);
        }
      }
    } catch (error) {
      // Only log error if it's not a "no update available" error
      if (!error.message?.includes('latest.yml') && !error.message?.includes('404')) {
        console.error('Failed to check for updates:', error);
      }
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
    setDownloadProgress(null);
  };

  // Format bytes to human readable format
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (updateError) {
    // Truncate error message to first 100 characters
    const shortError = updateError.length > 100 ? updateError.substring(0, 100) + '...' : updateError;
    
    return (
      <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg shadow-lg z-50 max-w-xs text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <h4 className="font-semibold text-xs mb-1">Update Error</h4>
            <p className="text-xs">{shortError}</p>
          </div>
          <button
            onClick={dismissNotification}
            className="text-red-500 hover:text-red-700 text-sm flex-shrink-0"
            title="Dismiss"
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
    const percent = downloadProgress ? Math.round(downloadProgress.percent) : 0;
    const speed = downloadProgress?.bytesPerSecond ? formatBytes(downloadProgress.bytesPerSecond) + '/s' : '';
    const transferred = downloadProgress?.transferred ? formatBytes(downloadProgress.transferred) : '';
    const total = downloadProgress?.total ? formatBytes(downloadProgress.total) : '';

    return (
      <div className="fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-semibold">Update Available</h4>
            <p className="text-sm text-blue-600">
              {downloadProgress 
                ? `Downloading... ${percent}%`
                : 'Preparing download...'}
            </p>
          </div>
          <button
            onClick={dismissNotification}
            className="ml-4 text-blue-500 hover:text-blue-700"
          >
            ✕
          </button>
        </div>
        
        {/* Progress Bar */}
        {downloadProgress && (
          <div className="mt-3">
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-blue-600">
              <span>{transferred} / {total}</span>
              {speed && <span>{speed}</span>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default UpdateNotification;
