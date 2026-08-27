import { BrowserWindow, app } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import { UpdateStatus } from '../shared/types.js';

let currentStatus: UpdateStatus = {
  state: 'idle',
};

let targetWindow: BrowserWindow | null = null;

function sendStatus(status: UpdateStatus) {
  currentStatus = status;
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send('updater:status', currentStatus);
  }
}

export function getCurrentUpdateStatus(): UpdateStatus {
  return currentStatus;
}

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  targetWindow = mainWindow;

  // Configure autoUpdater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    console.log('[Purrsonica Updater] Checking for updates...');
    sendStatus({ state: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Purrsonica Updater] Update available:', info.version);
    sendStatus({
      state: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Purrsonica Updater] Update not available. Current version is latest.');
    sendStatus({
      state: 'not-available',
      version: info.version,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Purrsonica Updater] Download progress: ${Math.round(progress.percent)}%`);
    sendStatus({
      state: 'downloading',
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Purrsonica Updater] Update downloaded successfully:', info.version);
    sendStatus({
      state: 'downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    console.warn('[Purrsonica Updater] Update error:', err?.message || err);
    sendStatus({
      state: 'error',
      errorMessage: err?.message || 'Update check failed',
    });
  });

  // Automatically check for updates on startup in production
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[Purrsonica Updater] Initial check error:', err.message);
      });
    }, 5000);
  }
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    // In dev mode, return mock or notify
    sendStatus({
      state: 'not-available',
      version: app.getVersion(),
    });
    return currentStatus;
  }

  try {
    await autoUpdater.checkForUpdates();
    return currentStatus;
  } catch (err: any) {
    sendStatus({
      state: 'error',
      errorMessage: err?.message || 'Failed to check for updates',
    });
    return currentStatus;
  }
}

export function quitAndInstallUpdate(): void {
  if (currentStatus.state === 'downloaded') {
    autoUpdater.quitAndInstall(false, true);
  }
}
