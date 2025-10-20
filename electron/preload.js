import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // OAuth callbacks
  onOAuthCallback: (callback) => {
    ipcRenderer.on('oauth-callback', (event, data) => callback(data));
  },

  // Update notifications
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', callback);
  },

  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', callback);
  },

  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, error) => callback(error));
  },

  // Menu actions
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-project', callback);
    ipcRenderer.on('menu-about', callback);
  },

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Update actions
  installUpdate: () => ipcRenderer.invoke('install-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // OAuth server control
  startOAuthServer: () => ipcRenderer.invoke('start-oauth-server'),
  stopOAuthServer: () => ipcRenderer.invoke('stop-oauth-server'),

  // External links
  openExternal: (url) => {
    // This will be handled by the main process automatically
    window.open(url, '_blank');
  },

  // Platform detection
  platform: process.platform,

  // Environment
  isElectron: true
});
