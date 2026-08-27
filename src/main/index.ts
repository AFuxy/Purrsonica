import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { initDatabase, closeDatabase } from './db/database.js';
import { registerIpcHandlers } from './ipc.js';
import { initAutoUpdater } from './updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// Register privileged custom protocols before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
  {
    scheme: 'cover',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
    },
  },
]);

function registerStreamingProtocols() {
  // Protocol: media://<encoded-file-path>
  protocol.handle('media', async (request) => {
    try {
      const url = new URL(request.url);
      let decodedPath = decodeURIComponent(url.pathname);

      // Handle Windows drive paths like /C:/Users/...
      if (process.platform === 'win32' && decodedPath.startsWith('/') && /^\/[a-zA-Z]:/.test(decodedPath)) {
        decodedPath = decodedPath.substring(1);
      }

      if (!fs.existsSync(decodedPath)) {
        return new Response('File Not Found', { status: 404 });
      }

      const fileUrl = pathToFileURL(decodedPath).toString();
      return net.fetch(fileUrl, {
        headers: request.headers,
      });
    } catch (err: any) {
      console.error('Error serving media protocol:', err);
      return new Response('Internal Server Error: ' + err.message, { status: 500 });
    }
  });

  // Protocol: cover://<encoded-file-path>
  protocol.handle('cover', async (request) => {
    try {
      const url = new URL(request.url);
      let decodedPath = decodeURIComponent(url.pathname);

      if (process.platform === 'win32' && decodedPath.startsWith('/') && /^\/[a-zA-Z]:/.test(decodedPath)) {
        decodedPath = decodedPath.substring(1);
      }

      if (!fs.existsSync(decodedPath)) {
        return new Response('Cover Not Found', { status: 404 });
      }

      const fileUrl = pathToFileURL(decodedPath).toString();
      return net.fetch(fileUrl);
    } catch (err: any) {
      return new Response('Error loading cover', { status: 500 });
    }
  });
}

function resolvePreloadPath(): string {
  const candidates = [
    path.join(__dirname, '../preload/index.cjs'),
    path.join(__dirname, '../preload/index.js'),
    path.join(process.cwd(), 'dist-electron', 'preload', 'index.cjs'),
    path.join(process.cwd(), 'dist-electron', 'preload', 'index.js'),
    path.join(__dirname, 'preload.cjs'),
    path.join(__dirname, 'preload.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      console.log('[Purrsonica] Loading preload script from:', c);
      return c;
    }
  }
  return candidates[0];
}

function createWindow(): void {
  const defaultIcon = path.join(process.cwd(), 'public', 'PurrSonica-White-logo.png');
  const preloadScript = resolvePreloadPath();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    frame: false, // Frameless Spotify look
    titleBarStyle: 'hidden',
    backgroundColor: '#121212',
    icon: fs.existsSync(defaultIcon) ? defaultIcon : undefined,
    webPreferences: {
      preload: preloadScript,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false,
    },
  });

  // Register all IPC events
  registerIpcHandlers(mainWindow);

  // Initialize Auto Updater
  initAutoUpdater(mainWindow);

  // Load URL
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initDatabase();
  registerStreamingProtocols();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
