import { app, BrowserWindow, protocol, net, nativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { initDatabase, closeDatabase } from './db/database.js';
import { registerIpcHandlers } from './ipc.js';
import { initAutoUpdater } from './updater.js';
import { initDiscordRpc, destroyDiscordRpc } from './discord.js';

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
      stream: true,
      bypassCSP: true,
    },
  },
]);

const MEDIA_MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  wma: 'audio/x-ms-wma',
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
};

const IMAGE_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
};

function resolveProtocolFilePath(requestUrl: string, scheme: string): string | null {
  try {
    const parsed = new URL(requestUrl);
    // Check search params first: media://app/stream?path=...
    const queryPath = parsed.searchParams.get('path');
    if (queryPath) {
      return path.normalize(queryPath);
    }

    // Fallback: media://<raw-path>
    const prefix = `${scheme}://`;
    let raw = requestUrl.startsWith(prefix) ? requestUrl.slice(prefix.length) : requestUrl;
    let decoded = decodeURIComponent(raw);

    if (process.platform === 'win32') {
      if (/^\/[a-zA-Z]:/.test(decoded)) {
        decoded = decoded.substring(1);
      }
    }

    return path.normalize(decoded);
  } catch {
    return null;
  }
}

function registerStreamingProtocols() {
  // Protocol: media://app/stream?path=<path>
  protocol.handle('media', async (request) => {
    try {
      const filePath = resolveProtocolFilePath(request.url, 'media');

      if (!filePath || !fs.existsSync(filePath)) {
        console.warn('[media://] File Not Found:', filePath);
        return new Response('File Not Found', { status: 404 });
      }

      const stat = await fs.promises.stat(filePath);
      const fileSize = stat.size;
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      const mimeType = MEDIA_MIME_TYPES[ext] || 'audio/mpeg';

      const rangeHeader = request.headers.get('range');

      if (rangeHeader) {
        // e.g. "bytes=0-" or "bytes=100-500"
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10) || 0;
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const nodeStream = fs.createReadStream(filePath, { start, end });
        const webStream = Readable.toWeb(nodeStream) as any;

        return new Response(webStream, {
          status: 206,
          statusText: 'Partial Content',
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(chunkSize),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
          },
        });
      } else {
        const nodeStream = fs.createReadStream(filePath);
        const webStream = Readable.toWeb(nodeStream) as any;

        return new Response(webStream, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(fileSize),
            'Accept-Ranges': 'bytes',
          },
        });
      }
    } catch (err: any) {
      console.error('[media://] Stream error:', err);
      return new Response('Error streaming file: ' + err.message, { status: 500 });
    }
  });

  // Protocol: cover://app/image?path=<path>
  protocol.handle('cover', async (request) => {
    try {
      const filePath = resolveProtocolFilePath(request.url, 'cover');

      // Transparent 1x1 fallback GIF for missing/deleted cache files
      const TRANSPARENT_FALLBACK = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );

      if (!filePath || !fs.existsSync(filePath)) {
        return new Response(TRANSPARENT_FALLBACK, {
          headers: {
            'Content-Type': 'image/gif',
            'Content-Length': String(TRANSPARENT_FALLBACK.length),
            'Cache-Control': 'no-cache',
          },
        });
      }

      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      const mimeType = IMAGE_MIME_TYPES[ext] || 'image/jpeg';
      const fileBuffer = await fs.promises.readFile(filePath);

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(fileBuffer.length),
          'Cache-Control': 'public, max-age=86400',
        },
      });
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
  initDiscordRpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  destroyDiscordRpc();
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
