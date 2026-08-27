import { app, BrowserWindow, protocol, net, nativeImage } from 'electron';
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

function parseProtocolPath(requestUrl: string, scheme: string): string {
  const prefix = `${scheme}://`;
  let raw = requestUrl.startsWith(prefix) ? requestUrl.slice(prefix.length) : requestUrl;
  let decoded = decodeURIComponent(raw);

  // Clean leading slashes on Windows (e.g. /D:/... or /D:\...)
  if (process.platform === 'win32') {
    if (/^\/[a-zA-Z]:/.test(decoded)) {
      decoded = decoded.substring(1);
    }
  }

  return path.normalize(decoded);
}

function registerStreamingProtocols() {
  // Protocol: media://<encoded-file-path>
  protocol.handle('media', async (request) => {
    try {
      const decodedPath = parseProtocolPath(request.url, 'media');

      if (!fs.existsSync(decodedPath)) {
        console.warn('[media://] File Not Found:', decodedPath);
        return new Response('File Not Found', { status: 404 });
      }

      const fileUrl = pathToFileURL(decodedPath).toString();
      return net.fetch(fileUrl, {
        headers: request.headers,
      });
    } catch (err: any) {
      console.error('[media://] Protocol error:', err);
      return new Response('Internal Server Error: ' + err.message, { status: 500 });
    }
  });

  // Protocol: cover://<encoded-file-path>
  protocol.handle('cover', async (request) => {
    try {
      const decodedPath = parseProtocolPath(request.url, 'cover');

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

export function resolveIconPath(iconFile: string): string | null {
  const candidates = [
    path.join(__dirname, '../../public', iconFile),
    path.join(app.getAppPath(), 'public', iconFile),
    path.join(process.resourcesPath, 'public', iconFile),
    path.join(process.resourcesPath, 'app.asar/public', iconFile),
    path.join(process.cwd(), 'public', iconFile),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function createWindow(): void {
  const iconPath = resolveIconPath('PurrSonica-White-logo.png');
  const defaultIcon = iconPath ? nativeImage.createFromPath(iconPath) : undefined;
  const preloadScript = resolvePreloadPath();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    frame: false, // Frameless Spotify look
    titleBarStyle: 'hidden',
    backgroundColor: '#121212',
    icon: defaultIcon,
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
