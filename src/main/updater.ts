import { BrowserWindow, app } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'node:path';
import fs from 'node:fs';
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

function hasUpdateConfig(): boolean {
  try {
    const updateConfigPath = path.join(process.resourcesPath, 'app-update.yml');
    return fs.existsSync(updateConfigPath);
  } catch {
    return false;
  }
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
    console.log('[Purrsonica Updater] App is up to date.');
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
    const msg = err?.message || String(err);
    console.warn('[Purrsonica Updater] Update notice:', msg);

    // If app-update.yml is missing (e.g. portable/dev), don't show user a noisy error
    if (msg.includes('app-update.yml') || msg.includes('ENOENT')) {
      sendStatus({ state: 'idle' });
      return;
    }

    sendStatus({
      state: 'error',
      errorMessage: 'Could not connect to update server',
    });
  });

  // Automatically check for updates on startup and periodically while app remains open
  if (app.isPackaged && hasUpdateConfig()) {
    // Initial check after 4 seconds
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[Purrsonica Updater] Startup check bypassed:', err?.message || err);
      });
    }, 4000);

    // Periodic check every 1 hour while running continuously
    setInterval(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[Purrsonica Updater] Periodic check bypassed:', err?.message || err);
      });
    }, 60 * 60 * 1000);
  }
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged || !hasUpdateConfig()) {
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
    console.warn('[Purrsonica Updater] Check error:', err?.message || err);
    sendStatus({
      state: 'not-available',
      version: app.getVersion(),
    });
    return currentStatus;
  }
}

export function quitAndInstallUpdate(): void {
  if (currentStatus.state === 'downloaded') {
    autoUpdater.quitAndInstall(false, true);
  }
}
