const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loading...');

try {
  // Expose protected methods that allow the renderer process to use
  // the ipcRenderer without exposing the entire object
  contextBridge.exposeInMainWorld('electronAPI', {
    // OAuth callbacks
    onOAuthCallback: (callback) => {
      try {
        ipcRenderer.on('oauth-callback', (event, data) => callback(data));
      } catch (error) {
        console.error('Error setting up OAuth callback:', error);
      }
    },

    // Update notifications
    onUpdateAvailable: (callback) => {
      try {
        ipcRenderer.on('update-available', callback);
      } catch (error) {
        console.error('Error setting up update available callback:', error);
      }
    },

    onUpdateDownloaded: (callback) => {
      try {
        ipcRenderer.on('update-downloaded', callback);
      } catch (error) {
        console.error('Error setting up update downloaded callback:', error);
      }
    },

    onUpdateError: (callback) => {
      try {
        ipcRenderer.on('update-error', (event, error) => callback(error));
      } catch (error) {
        console.error('Error setting up update error callback:', error);
      }
    },

    // Menu actions
    onMenuAction: (callback) => {
      try {
        ipcRenderer.on('menu-new-project', callback);
        ipcRenderer.on('menu-about', callback);
      } catch (error) {
        console.error('Error setting up menu action callback:', error);
      }
    },

    // App info
    getAppVersion: () => {
      try {
        return ipcRenderer.invoke('get-app-version');
      } catch (error) {
        console.error('Error getting app version:', error);
        return '1.0.0';
      }
    },

    // Update actions
    installUpdate: () => {
      try {
        return ipcRenderer.invoke('install-update');
      } catch (error) {
        console.error('Error installing update:', error);
        return Promise.resolve();
      }
    },
    
    checkForUpdates: () => {
      try {
        return ipcRenderer.invoke('check-for-updates');
      } catch (error) {
        console.error('Error checking for updates:', error);
        return Promise.resolve();
      }
    },

    // OAuth server control
    startOAuthServer: () => {
      try {
        return ipcRenderer.invoke('start-oauth-server');
      } catch (error) {
        console.error('Error starting OAuth server:', error);
        return Promise.resolve();
      }
    },
    
    stopOAuthServer: () => {
      try {
        return ipcRenderer.invoke('stop-oauth-server');
      } catch (error) {
        console.error('Error stopping OAuth server:', error);
        return Promise.resolve();
      }
    },

    // External links
    openExternal: (url) => {
      try {
        // This will be handled by the main process automatically
        window.open(url, '_blank');
      } catch (error) {
        console.error('Error opening external link:', error);
      }
    },

    // OAuth callback sender
    sendOAuthCallback: (data) => {
      try {
        return ipcRenderer.invoke('send-oauth-callback', data);
      } catch (error) {
        console.error('Error sending OAuth callback:', error);
        return Promise.resolve();
      }
    },

    // Platform detection
    platform: process.platform,

    // Environment
    isElectron: true
  });

  console.log('Preload script loaded successfully');
} catch (error) {
  console.error('Error in preload script:', error);
  
  // Fallback: create a minimal electronAPI
  contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform,
    onOAuthCallback: () => {},
    onUpdateAvailable: () => {},
    onUpdateDownloaded: () => {},
    onUpdateError: () => {},
    onMenuAction: () => {},
    getAppVersion: () => '1.0.0',
    installUpdate: () => Promise.resolve(),
    checkForUpdates: () => Promise.resolve(),
    startOAuthServer: () => Promise.resolve(),
    stopOAuthServer: () => Promise.resolve(),
    openExternal: (url) => window.open(url, '_blank'),
    sendOAuthCallback: () => Promise.resolve()
  });
}
