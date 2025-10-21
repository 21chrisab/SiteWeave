import { app, BrowserWindow, Menu, shell, protocol, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer } from 'http';
import { parse } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let oauthServer = null;
const OAUTH_PORT = 5000;

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify();

// OAuth Server for loopback method
function startOAuthServer() {
  if (oauthServer) {
    return; // Server already running
  }

  oauthServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Handle OAuth callbacks
    if (pathname.includes('-callback')) {
      const provider = pathname.replace('/-callback', '').replace('/', '');
      
      // Send CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Send success response to browser
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Success</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #4CAF50; }
            .error { color: #f44336; }
          </style>
        </head>
        <body>
          <h2 class="success">✓ Authentication Successful!</h2>
          <p>You can close this window and return to SiteWeave.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
        </html>
      `);

      // Send callback data to main window
      if (mainWindow) {
        mainWindow.webContents.send('oauth-callback', {
          provider: provider,
          code: query.code,
          state: query.state,
          error: query.error,
          errorDescription: query.error_description
        });
      }
    } else {
      // Handle other requests
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  oauthServer.listen(OAUTH_PORT, '127.0.0.1', () => {
    console.log(`OAuth server listening on http://127.0.0.1:${OAUTH_PORT}`);
  });

  oauthServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${OAUTH_PORT} is already in use`);
    } else {
      console.error('OAuth server error:', err);
    }
  });
}

function stopOAuthServer() {
  if (oauthServer) {
    oauthServer.close();
    oauthServer = null;
    console.log('OAuth server stopped');
  }
}

// Custom protocol for OAuth callbacks
const PROTOCOL_NAME = 'siteweave';

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../build/icon.png'),
    title: 'SiteWeave',
    show: false, // Don't show until ready
    titleBarStyle: 'default'
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
    mainWindow.focus();
  });

  // Add error handling for failed loads
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    // Show window even if load fails
    mainWindow.show();
    mainWindow.focus();
  });

  // Fallback: Force show window after timeout
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('Force showing window after timeout');
      mainWindow.show();
      mainWindow.focus();
    }
  }, 2000);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-project');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About SiteWeave',
          click: () => {
            mainWindow.webContents.send('menu-about');
          }
        },
        {
          label: 'Check for Updates',
          click: () => {
            autoUpdater.checkForUpdatesAndNotify();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Register custom protocol
function registerProtocol() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: PROTOCOL_NAME,
      privileges: {
        standard: true,
        secure: true,
        allowServiceWorkers: true,
        supportFetchAPI: true,
        corsEnabled: true
      }
    }
  ]);
}

// Handle protocol URLs
function handleProtocolUrl(url) {
  if (!mainWindow) return;

  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  
  // Send OAuth callback to renderer
  mainWindow.webContents.send('oauth-callback', {
    provider: pathname.replace('/', ''),
    code: urlObj.searchParams.get('code'),
    state: urlObj.searchParams.get('state'),
    error: urlObj.searchParams.get('error'),
    errorDescription: urlObj.searchParams.get('error_description')
  });
}

// Register protocol BEFORE app is ready
registerProtocol();

// App event handlers
app.whenReady().then(() => {
  console.log('App is ready');
  createWindow();
  createMenu();
  startOAuthServer(); // Start OAuth server

  // Handle protocol URLs
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Prevent the app from quitting when all windows are closed
app.on('window-all-closed', () => {
  stopOAuthServer(); // Stop OAuth server
  // Don't quit on Windows - keep the app running
  if (process.platform !== 'darwin') {
    // Only quit if explicitly requested
    console.log('All windows closed, but keeping app running');
  }
});

app.on('before-quit', () => {
  stopOAuthServer(); // Stop OAuth server before quitting
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded');
});

autoUpdater.on('error', (error) => {
  console.error('Auto-updater error:', error);
  mainWindow?.webContents.send('update-error', error.message);
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('check-for-updates', () => {
  return autoUpdater.checkForUpdates();
});

ipcMain.handle('start-oauth-server', () => {
  startOAuthServer();
  return true;
});

ipcMain.handle('stop-oauth-server', () => {
  stopOAuthServer();
  return true;
});

// Handle deep links on Windows
if (process.platform === 'win32') {
  app.setAsDefaultProtocolClient(PROTOCOL_NAME);
  
  // Handle protocol URL when app is already running
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`));
    if (url) {
      handleProtocolUrl(url);
    }
    
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
