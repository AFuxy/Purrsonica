import { BrowserWindow, app } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'node:path';
import fs from 'node:fs';
import semver from 'semver';
import { UpdateStatus } from '../shared/types.js';
import { getScanSettings } from './db/queries.js';

let currentStatus: UpdateStatus = {
  state: 'idle',
};

let targetWindow: BrowserWindow | null = null;

export function isPrereleaseVersion(versionStr?: string): boolean {
  if (!versionStr) return false;
  return /-(alpha|beta|rc|canary|pre(-?release)?|dev|preview|nightly)/i.test(versionStr);
}

/**
 * Universal Multi-Channel Resolver:
 * Supports all pre-release tracks (beta, prerelease, alpha, rc, canary, dev, preview, nightly).
 * Dynamically queries GitHub releases and adapts `autoUpdater.channel` so electron-updater
 * never skips custom channel tags.
 */
export async function resolveTargetChannel(allow?: boolean): Promise<void> {
  const allowPrerelease = allow !== undefined ? !!allow : !!getScanSettings().allowPrerelease;
  const currentVer = app.getVersion();
  const isCurrentPrerelease = isPrereleaseVersion(currentVer);

  autoUpdater.allowPrerelease = allowPrerelease;
  autoUpdater.allowDowngrade = !allowPrerelease && isCurrentPrerelease;

  if (!allowPrerelease) {
    autoUpdater.channel = 'latest';
    console.log('[Purrsonica Updater] Pre-release disabled: Channel set to "latest" (allowDowngrade:', autoUpdater.allowDowngrade, ')');
    return;
  }

  try {
    const res = await fetch('https://api.github.com/repos/AFuxy/Purrsonica/releases?per_page=10', {
      headers: {
        'User-Agent': `Purrsonica/${currentVer}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const releases = (await res.json()) as Array<{ tag_name: string; draft?: boolean; prerelease?: boolean }>;
      const validReleases = releases.filter((r) => !r.draft && r.tag_name);

      if (validReleases.length > 0) {
        // Sort by SemVer descending to find highest target release
        const sorted = [...validReleases].sort((a, b) => {
          const vA = semver.clean(a.tag_name) || a.tag_name.replace(/^v/, '');
          const vB = semver.clean(b.tag_name) || b.tag_name.replace(/^v/, '');
          if (!semver.valid(vA) || !semver.valid(vB)) return 0;
          return semver.rcompare(vA, vB);
        });

        const targetTag = sorted[0].tag_name.replace(/^v/, '');
        const prereleaseComponents = semver.prerelease(targetTag);

        if (prereleaseComponents && prereleaseComponents.length > 0) {
          const rawChannel = String(prereleaseComponents[0]).toLowerCase();
          const channelName = rawChannel.split(/[0-9.]/)[0].replace(/[-_]$/, '') || rawChannel;
          console.log(`[Purrsonica Updater] Target release is ${targetTag}, dynamically adapting channel to: "${channelName}"`);
          autoUpdater.channel = channelName;
        } else {
          console.log(`[Purrsonica Updater] Target release is stable (${targetTag}), channel set to: "latest"`);
          autoUpdater.channel = 'latest';
        }
      }
    }
  } catch (err: any) {
    console.warn('[Purrsonica Updater] Dynamic channel resolution bypassed, using default:', err?.message || err);
  }
}

export function syncPrereleaseSetting(allow?: boolean): void {
  const allowPrerelease = allow !== undefined ? !!allow : !!getScanSettings().allowPrerelease;
  const isCurrentPrerelease = isPrereleaseVersion(app.getVersion());

  autoUpdater.allowPrerelease = allowPrerelease;
  autoUpdater.allowDowngrade = !allowPrerelease && isCurrentPrerelease;

  console.log('[Purrsonica Updater] allowPrerelease set to:', autoUpdater.allowPrerelease, 'allowDowngrade:', autoUpdater.allowDowngrade);
}

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

function cleanReleaseNotesHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  let text = rawHtml;

  // Replace headings
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<h[1-6][^>]*>/gi, '\n### ');

  // Replace paragraphs and linebreaks
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Replace list items with bullet points
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/?ul[^>]*>/gi, '\n');
  text = text.replace(/<\/?ol[^>]*>/gi, '\n');

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&bull;/g, '•')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');

  // Clean excessive whitespace
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function extractReleaseNotes(rawNotes: any): string | undefined {
  if (!rawNotes) return undefined;
  if (typeof rawNotes === 'string') return cleanReleaseNotesHtml(rawNotes);
  if (Array.isArray(rawNotes)) {
    const combined = rawNotes
      .map((item) => {
        if (typeof item === 'string') return cleanReleaseNotesHtml(item);
        if (item && item.note) {
          const verHeader = item.version ? `### v${item.version}\n` : '';
          return `${verHeader}${cleanReleaseNotesHtml(item.note)}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
    return combined || undefined;
  }
  return undefined;
}

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  targetWindow = mainWindow;

  // Configure autoUpdater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  syncPrereleaseSetting();

  autoUpdater.on('checking-for-update', () => {
    console.log('[Purrsonica Updater] Checking for updates (allowPrerelease:', autoUpdater.allowPrerelease, 'allowDowngrade:', autoUpdater.allowDowngrade, ')...');
    sendStatus({
      state: 'checking',
      isPrerelease: isPrereleaseVersion(app.getVersion()),
    });
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Purrsonica Updater] Update candidate found:', info.version);
    const isTargetPrerelease = isPrereleaseVersion(info.version);
    const allowPrerelease = !!getScanSettings().allowPrerelease;
    const currentVer = app.getVersion();
    const isCurrentPrerelease = isPrereleaseVersion(currentVer);
    const isDowngrade = isCurrentPrerelease && !isTargetPrerelease;

    // Safety Gate: Skip prerelease builds if user has not opted in
    if (isTargetPrerelease && !allowPrerelease) {
      console.log('[Purrsonica Updater] Prerelease update skipped (allowPrerelease is false):', info.version);
      sendStatus({
        state: 'not-available',
        version: app.getVersion(),
        isPrerelease: isCurrentPrerelease,
      });
      return;
    }

    const notes = extractReleaseNotes(info.releaseNotes);
    sendStatus({
      state: 'available',
      version: info.version,
      releaseNotes: notes,
      isPrerelease: isTargetPrerelease,
      isDowngrade,
    });

    // Start download only if allowed
    autoUpdater.downloadUpdate().catch((err) => {
      console.warn('[Purrsonica Updater] Download failed:', err?.message || err);
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Purrsonica Updater] App is up to date.');
    sendStatus({
      state: 'not-available',
      version: info.version,
      isPrerelease: isPrereleaseVersion(info.version || app.getVersion()),
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Purrsonica Updater] Download progress: ${Math.round(progress.percent)}%`);
    sendStatus({
      state: 'downloading',
      version: currentStatus.version,
      percent: Math.round(progress.percent),
      releaseNotes: currentStatus.releaseNotes,
      isPrerelease: currentStatus.isPrerelease,
      isDowngrade: currentStatus.isDowngrade,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Purrsonica Updater] Update downloaded successfully:', info.version);
    const notes = extractReleaseNotes(info.releaseNotes) || currentStatus.releaseNotes;
    const isTargetPrerelease = isPrereleaseVersion(info.version);
    const currentVer = app.getVersion();
    const isCurrentPrerelease = isPrereleaseVersion(currentVer);
    const isDowngrade = isCurrentPrerelease && !isTargetPrerelease;

    sendStatus({
      state: 'downloaded',
      version: info.version,
      releaseNotes: notes,
      isPrerelease: isTargetPrerelease,
      isDowngrade,
    });
  });

  autoUpdater.on('error', (err) => {
    const msg = err?.message || String(err);
    console.warn('[Purrsonica Updater] Update notice:', msg);

    // If app-update.yml is missing (e.g. portable/dev), don't show user a noisy error
    if (msg.includes('app-update.yml') || msg.includes('ENOENT')) {
      sendStatus({
        state: 'idle',
        isPrerelease: isPrereleaseVersion(app.getVersion()),
      });
      return;
    }

    sendStatus({
      state: 'error',
      errorMessage: 'Could not connect to update server',
      isPrerelease: isPrereleaseVersion(app.getVersion()),
    });
  });

  // Automatically check for updates on startup and periodically while app remains open
  if (app.isPackaged && hasUpdateConfig()) {
    // Initial check after 4 seconds
    setTimeout(async () => {
      await resolveTargetChannel();
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[Purrsonica Updater] Startup check bypassed:', err?.message || err);
      });
    }, 4000);

    // Periodic check every 1 hour while running continuously
    setInterval(async () => {
      await resolveTargetChannel();
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[Purrsonica Updater] Periodic check bypassed:', err?.message || err);
      });
    }, 60 * 60 * 1000);
  }
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  await resolveTargetChannel();
  if (!app.isPackaged || !hasUpdateConfig()) {
    sendStatus({
      state: 'not-available',
      version: app.getVersion(),
      isPrerelease: isPrereleaseVersion(app.getVersion()),
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
      isPrerelease: isPrereleaseVersion(app.getVersion()),
    });
    return currentStatus;
  }
}

export function quitAndInstallUpdate(): void {
  if (currentStatus.state === 'downloaded') {
    // isSilent: true (silent headless background update without installer wizard, like Discord/VS Code)
    // isForceRunAfter: true (automatically relaunch Purrsonica immediately after update completes)
    autoUpdater.quitAndInstall(true, true);
  }
}
