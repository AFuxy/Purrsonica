import { Worker } from 'node:worker_threads';
import path from 'node:path';
import fs from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, app } from 'electron';
import { ScanProgress, ScanSettings, DriveInfo } from '../../shared/types.js';
import { getScanSettings, upsertTracksBatch, getDrivesSummary } from '../db/queries.js';
import { getCoversCacheDir } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

let activeWorker: Worker | null = null;
let currentProgress: ScanProgress = {
  status: 'idle',
  scannedFilesCount: 0,
  foundMediaCount: 0,
  newMediaCount: 0,
  elapsedMs: 0,
};

export async function detectSystemDrives(): Promise<DriveInfo[]> {
  const existingSummary = getDrivesSummary();
  const foundDrives: Map<string, DriveInfo> = new Map();

  for (const s of existingSummary) {
    foundDrives.set(s.letter.toUpperCase(), s);
  }

  // Windows drive detection
  if (process.platform === 'win32') {
    // Probe letters C through Z
    for (let i = 67; i <= 90; i++) {
      const letter = String.fromCharCode(i) + ':';
      try {
        if (fs.existsSync(letter + '\\')) {
          const existing = foundDrives.get(letter);
          foundDrives.set(letter, {
            letter,
            label: `Drive ${letter}`,
            trackCount: existing ? existing.trackCount : 0,
          });
        }
      } catch {}
    }

    try {
      const { stdout } = await execAsync('wmic logicaldisk get name,volumename');
      const lines = stdout.trim().split('\n').slice(1);

      for (const line of lines) {
        const parts = line.trim().split(/\s{2,}/);
        const name = parts[0]?.trim();
        const label = parts[1]?.trim() || '';

        if (name && /^[A-Za-z]:$/.test(name)) {
          const letter = name.toUpperCase();
          const existing = foundDrives.get(letter);

          foundDrives.set(letter, {
            letter,
            label: label ? `${label} (${letter})` : `Drive ${letter}`,
            trackCount: existing ? existing.trackCount : 0,
          });
        }
      }
    } catch {}
  } else {
    // POSIX root fallback
    foundDrives.set('/', {
      letter: '/',
      label: 'Root Directory',
      trackCount: existingSummary[0]?.trackCount || 0,
    });
  }

  return Array.from(foundDrives.values());
}

export function getScanProgress(): ScanProgress {
  return currentProgress;
}

function resolveWorkerPath(): string {
  const candidates = [
    path.join(process.cwd(), 'dist-electron', 'scanner', 'scanner-worker.js'),
    path.join(__dirname, '..', 'scanner', 'scanner-worker.js'),
    path.join(__dirname, 'scanner-worker.js'),
    path.join(app ? app.getAppPath() : process.cwd(), 'dist-electron', 'scanner', 'scanner-worker.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

export async function startScan(
  targetDrives?: string[],
  customFolders?: string[],
  mainWindow?: BrowserWindow | null
): Promise<ScanProgress> {
  if (activeWorker || currentProgress.status === 'scanning') {
    return currentProgress;
  }

  const settings: ScanSettings = getScanSettings();
  const cacheDir = getCoversCacheDir();
  const workerScriptPath = resolveWorkerPath();

  console.log('[Purrsonica Scanner] Resolving worker script at:', workerScriptPath);

  // If no specific drives selected, detect and scan all system drives
  let drivesToScan = targetDrives && targetDrives.length > 0 ? [...targetDrives] : [];
  if (drivesToScan.length === 0 && (!customFolders || customFolders.length === 0)) {
    const detected = await detectSystemDrives();
    drivesToScan = detected.map((d) => d.letter);
    if (drivesToScan.length === 0) {
      drivesToScan = ['C:'];
    }
  }

  // Format drive roots with trailing backslash (e.g. "C:\\", "D:\\")
  const formattedDrives = drivesToScan.map((d) =>
    d.endsWith('\\') || d.endsWith('/') ? d : d + '\\'
  );

  console.log('[Purrsonica Scanner] Starting scan for roots:', formattedDrives, customFolders);

  currentProgress = {
    status: 'scanning',
    scannedFilesCount: 0,
    foundMediaCount: 0,
    newMediaCount: 0,
    elapsedMs: 0,
  };

  try {
    activeWorker = new Worker(workerScriptPath);

    let lastLibraryNotifyTime = 0;
    const notifyLibraryThrottled = (force = false) => {
      const now = Date.now();
      if (force || now - lastLibraryNotifyTime > 1800) {
        lastLibraryNotifyTime = now;
        mainWindow?.webContents.send('library:updated');
      }
    };

    activeWorker.on('message', (msg: any) => {
      if (msg.type === 'PROGRESS') {
        currentProgress = {
          ...currentProgress,
          ...msg.payload,
        };
        mainWindow?.webContents.send('scanner:progress', currentProgress);
      } else if (msg.type === 'BATCH_RESULTS') {
        if (msg.payload.tracks && msg.payload.tracks.length > 0) {
          upsertTracksBatch(msg.payload.tracks);
          notifyLibraryThrottled(false);
        }
      } else if (msg.type === 'COMPLETED' || msg.type === 'ABORTED') {
        console.log(`[Purrsonica Scanner] Scan ${msg.type.toLowerCase()}: ${msg.payload.foundMediaCount} media files found.`);
        currentProgress = {
          ...currentProgress,
          status: msg.type === 'COMPLETED' ? 'completed' : 'idle',
          scannedFilesCount: msg.payload.scannedFilesCount,
          foundMediaCount: msg.payload.foundMediaCount,
          elapsedMs: msg.payload.elapsedMs,
        };
        mainWindow?.webContents.send('scanner:progress', currentProgress);
        notifyLibraryThrottled(true);
        cleanupWorker();
      } else if (msg.type === 'ERROR') {
        console.error('[Purrsonica Scanner] Worker error message:', msg.payload);
        currentProgress = {
          ...currentProgress,
          status: 'error',
          errorMessage: msg.payload,
        };
        mainWindow?.webContents.send('scanner:progress', currentProgress);
        cleanupWorker();
      }
    });

    activeWorker.on('error', (err) => {
      console.error('[Purrsonica Scanner] Worker thread runtime error:', err);
      currentProgress = {
        ...currentProgress,
        status: 'error',
        errorMessage: err.message,
      };
      mainWindow?.webContents.send('scanner:progress', currentProgress);
      cleanupWorker();
    });

    activeWorker.on('exit', (code) => {
      console.log('[Purrsonica Scanner] Worker thread exited with code:', code);
      if (code !== 0 && currentProgress.status === 'scanning') {
        currentProgress = {
          ...currentProgress,
          status: 'idle',
        };
        mainWindow?.webContents.send('scanner:progress', currentProgress);
      }
      activeWorker = null;
    });

    activeWorker.postMessage({
      type: 'START_SCAN',
      payload: {
        drives: formattedDrives,
        customFolders: customFolders || settings.customFolders || [],
        exclusions: settings.excludedPaths || [],
        generateWaveforms: settings.generateWaveforms,
        cacheDir,
      },
    });

    return currentProgress;
  } catch (err: any) {
    console.error('[Purrsonica Scanner] Failed to instantiate worker:', err);
    currentProgress = {
      status: 'error',
      scannedFilesCount: 0,
      foundMediaCount: 0,
      newMediaCount: 0,
      elapsedMs: 0,
      errorMessage: err.message,
    };
    return currentProgress;
  }
}

export function stopScan(mainWindow?: BrowserWindow | null): ScanProgress {
  if (activeWorker && currentProgress.status === 'scanning') {
    currentProgress.status = 'stopping';
    activeWorker.postMessage({ type: 'ABORT_SCAN' });
    mainWindow?.webContents.send('scanner:progress', currentProgress);

    // Timeout safety fallback: terminate if not exited in 3s
    setTimeout(() => {
      if (activeWorker) {
        activeWorker.terminate();
        cleanupWorker();
        currentProgress.status = 'idle';
        mainWindow?.webContents.send('scanner:progress', currentProgress);
      }
    }, 3000);
  } else {
    currentProgress.status = 'idle';
    mainWindow?.webContents.send('scanner:progress', currentProgress);
  }
  return currentProgress;
}

function cleanupWorker() {
  if (activeWorker) {
    activeWorker.removeAllListeners();
    activeWorker = null;
  }
}
