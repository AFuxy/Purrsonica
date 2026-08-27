import { ipcMain, dialog, BrowserWindow, nativeImage, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { parseFile } from 'music-metadata';
import NodeID3 from 'node-id3';
import { resolveIconPath } from './index.js';
import {
  checkForUpdates,
  quitAndInstallUpdate,
  getCurrentUpdateStatus,
} from './updater.js';
import {
  queryTracks,
  getTrackById,
  getDrivesSummary,
  getAlbumsSummary,
  getPlaylists,
  createPlaylist,
  deletePlaylist,
  updatePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  toggleLikeTrack,
  updateTrackMetadataInDB,
  getLibraryStats,
  getScanSettings,
  saveScanSettings,
  upsertTracksBatch,
  saveTrackWaveform,
  incrementPlayCount,
  wipeLibraryOnly,
  factoryResetDatabase,
} from './db/queries.js';
import {
  startScan,
  stopScan,
  getScanProgress,
  detectSystemDrives,
} from './scanner/scanner-controller.js';
import { getCoversCacheDir, clearCoversCache } from './db/database.js';
import { extractWaveformPeaks } from './scanner/waveform.js';
import { getMediaType } from './scanner/exclusions.js';
import { parseKey } from '../shared/camelot.js';
import { Track, UpdateTrackMetadataPayload, ScanSettings } from '../shared/types.js';

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // --- Window Controls ---
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    win?.minimize();
  });

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    win?.close();
  });

  ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    return win ? win.isMaximized() : false;
  });

  ipcMain.handle('theme:setIcon', (_event, themeMode: 'dark' | 'light') => {
    const iconFile = themeMode === 'dark' ? 'PurrSonica-White-logo.png' : 'PurrSonica-Black-logo.png';
    const iconPath = resolveIconPath(iconFile);
    if (iconPath) {
      try {
        const img = nativeImage.createFromPath(iconPath);
        mainWindow.setIcon(img);
      } catch (err) {
        console.warn('Failed to set window icon:', err);
      }
    }
  });

  // --- Auto-Updater ---
  ipcMain.handle('updater:check', async () => {
    return checkForUpdates();
  });

  ipcMain.handle('updater:install', async () => {
    quitAndInstallUpdate();
  });

  ipcMain.handle('updater:getStatus', async () => {
    return getCurrentUpdateStatus();
  });

  // --- Danger Zone / System Maintenance ---
  ipcMain.handle('system:clearCache', async () => {
    return clearCoversCache();
  });

  ipcMain.handle('system:wipeLibrary', async () => {
    wipeLibraryOnly();
    mainWindow?.webContents.send('library:updated');
    return true;
  });

  ipcMain.handle('system:factoryReset', async () => {
    factoryResetDatabase();
    clearCoversCache();
    mainWindow?.webContents.send('library:updated');
    return true;
  });

  // --- Track Queries ---
  ipcMain.handle('tracks:query', async (_event, params) => {
    return queryTracks(params);
  });

  ipcMain.handle('tracks:getById', async (_event, id: string) => {
    return getTrackById(id);
  });

  ipcMain.handle('tracks:toggleLike', async (_event, id: string) => {
    const isLiked = toggleLikeTrack(id);
    return isLiked;
  });

  ipcMain.handle('tracks:incrementPlayCount', async (_event, id: string) => {
    incrementPlayCount(id);
  });

  ipcMain.handle('tracks:saveWaveform', async (_event, trackId: string, waveformData: number[]) => {
    saveTrackWaveform(trackId, waveformData);
  });

  ipcMain.handle('tracks:generateWaveform', async (_event, filePath: string) => {
    return extractWaveformPeaks(filePath, 128);
  });

  // --- Metadata & ID3 Editing ---
  ipcMain.handle('metadata:update', async (_event, payload: UpdateTrackMetadataPayload) => {
    const track = getTrackById(payload.id);
    if (!track) throw new Error('Track not found');

    let newCoverPath = track.cover_art_path;

    // If custom cover image base64 is provided, write to cache dir
    if (payload.cover_art_base64) {
      const cacheDir = getCoversCacheDir();
      const filename = `custom_${payload.id}_${Date.now()}.jpg`;
      newCoverPath = path.join(cacheDir, filename);
      const base64Data = payload.cover_art_base64.replace(/^data:image\/\w+;base64,/, '');
      await fs.promises.writeFile(newCoverPath, Buffer.from(base64Data, 'base64'));
    }

    // Optionally write tags directly to source audio file using node-id3
    if (payload.writeToSourceFile && track.media_type === 'audio') {
      try {
        const tags: NodeID3.Tags = {};
        if (payload.title) tags.title = payload.title;
        if (payload.artist) tags.artist = payload.artist;
        if (payload.album) tags.album = payload.album;
        if (payload.genre) tags.genre = payload.genre;
        if (payload.year) tags.year = String(payload.year);
        if (payload.track_number) tags.trackNumber = String(payload.track_number);
        if (payload.bpm) tags.bpm = String(payload.bpm);
        if (payload.musical_key || payload.camelot_key) {
          tags.initialKey = payload.musical_key || payload.camelot_key;
        }
        if (payload.cover_art_base64) {
          const base64Data = payload.cover_art_base64.replace(/^data:image\/\w+;base64,/, '');
          tags.image = {
            mime: 'image/jpeg',
            type: { id: 3, name: 'front cover' },
            description: 'Cover',
            imageBuffer: Buffer.from(base64Data, 'base64'),
          };
        }
        NodeID3.update(tags, track.file_path);
      } catch (err) {
        console.warn('Could not write ID3 tag to physical file:', err);
      }
    }

    const updated = updateTrackMetadataInDB({
      ...payload,
      cover_art_path: newCoverPath,
    } as any);

    return updated;
  });

  // --- Drives & Library Views ---
  ipcMain.handle('drives:get', async () => {
    return detectSystemDrives();
  });

  ipcMain.handle('albums:get', async () => {
    return getAlbumsSummary();
  });

  ipcMain.handle('stats:get', async () => {
    return getLibraryStats();
  });

  // --- Playlists ---
  ipcMain.handle('playlists:get', async () => {
    return getPlaylists();
  });

  ipcMain.handle('playlists:create', async (_event, name: string, description?: string) => {
    return createPlaylist(name, description);
  });

  ipcMain.handle(
    'playlists:update',
    async (_event, id: string, name?: string, description?: string, coverArtBase64?: string) => {
      let coverArtPath: string | undefined;
      if (coverArtBase64) {
        const cacheDir = getCoversCacheDir();
        const filename = `pl_cover_${id}_${Date.now()}.jpg`;
        coverArtPath = path.join(cacheDir, filename);
        const base64Data = coverArtBase64.replace(/^data:image\/\w+;base64,/, '');
        await fs.promises.writeFile(coverArtPath, Buffer.from(base64Data, 'base64'));
      }
      return updatePlaylist(id, name, description, coverArtPath);
    }
  );

  ipcMain.handle('playlists:delete', async (_event, id: string) => {
    deletePlaylist(id);
  });

  ipcMain.handle('playlists:addTrack', async (_event, playlistId: string, trackId: string) => {
    addTrackToPlaylist(playlistId, trackId);
  });

  ipcMain.handle('playlists:removeTrack', async (_event, playlistId: string, trackId: string) => {
    removeTrackFromPlaylist(playlistId, trackId);
  });

  // --- Scanner Controls ---
  ipcMain.handle('scanner:start', async (_event, targetDrives?: string[], customFolders?: string[]) => {
    return startScan(targetDrives, customFolders, mainWindow);
  });

  ipcMain.handle('scanner:stop', async () => {
    return stopScan(mainWindow);
  });

  ipcMain.handle('scanner:getProgress', async () => {
    return getScanProgress();
  });

  ipcMain.handle('scanner:getSettings', async () => {
    return getScanSettings();
  });

  ipcMain.handle('scanner:saveSettings', async (_event, settings: ScanSettings) => {
    saveScanSettings(settings);
    return settings;
  });

  // --- Manual File/Folder Import Dialogs ---
  ipcMain.handle('dialog:pickFiles', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Media Files',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Audio & Video Files', extensions: ['mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'mp4', 'mkv', 'webm', 'mov', 'avi'] },
        { name: 'Audio Only', extensions: ['mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg', 'opus'] },
        { name: 'Video Only', extensions: ['mp4', 'mkv', 'webm', 'mov', 'avi'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) return [];
    return importSpecificFiles(result.filePaths, mainWindow);
  });

  ipcMain.handle('dialog:pickFolders', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Media Folder',
      properties: ['openDirectory', 'multiSelections'],
    });

    if (result.canceled || result.filePaths.length === 0) return [];
    // Start scan on selected folders
    return startScan(undefined, result.filePaths, mainWindow);
  });

  ipcMain.handle('dialog:pickImage', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Cover Artwork',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const buffer = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).replace('.', '').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  });

  // --- Drag and Drop File / Folder Import ---
  ipcMain.handle('media:importPaths', async (_event, paths: string[]) => {
    const imported = await importSpecificFiles(paths, mainWindow);
    return { importedCount: imported.length };
  });
}

async function expandPaths(inputPaths: string[]): Promise<string[]> {
  const result: string[] = [];

  for (const p of inputPaths) {
    try {
      const stats = await fs.promises.stat(p);
      if (stats.isFile()) {
        result.push(p);
      } else if (stats.isDirectory()) {
        const stack: string[] = [p];
        while (stack.length > 0) {
          const dir = stack.pop()!;
          const entries = await fs.promises.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                stack.push(full);
              }
            } else if (entry.isFile()) {
              result.push(full);
            }
          }
        }
      }
    } catch {}
  }

  return result;
}

async function importSpecificFiles(filePaths: string[], mainWindow: BrowserWindow): Promise<Track[]> {
  const cacheDir = getCoversCacheDir();
  const allResolvedFiles = await expandPaths(filePaths);
  const importedTracks: Partial<Track>[] = [];

  for (const filePath of allResolvedFiles) {
    const mediaType = getMediaType(filePath);
    if (!mediaType) continue;

    const stats = await fs.promises.stat(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const fileName = path.basename(filePath);
    const driveLetter = path.parse(filePath).root.replace('\\', '').replace('/', '') || 'C:';

    let title = path.basename(filePath, path.extname(filePath));
    let artist = 'Unknown Artist';
    let album = 'Unknown Album';
    let duration = 0;
    let bitrate: number | undefined;
    let sampleRate: number | undefined;
    let bpm: number | undefined;
    let musicalKey: string | undefined;
    let camelotKey: string | undefined;
    let coverArtPath: string | undefined;

    try {
      const metadata = await parseFile(filePath, { duration: true });
      if (metadata.common.title) title = metadata.common.title;
      if (metadata.common.artist) artist = metadata.common.artist;
      if (metadata.common.album) album = metadata.common.album;
      if (metadata.common.bpm) bpm = Number(metadata.common.bpm);
      if (metadata.common.key) {
        const parsed = parseKey(metadata.common.key);
        if (parsed) {
          musicalKey = parsed.musicalKey;
          camelotKey = parsed.camelot;
        }
      }
      if (metadata.format.duration) duration = metadata.format.duration;
      if (metadata.format.bitrate) bitrate = Math.round(metadata.format.bitrate / 1000);
      if (metadata.format.sampleRate) sampleRate = metadata.format.sampleRate;

      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const pic = metadata.common.picture[0];
        const hash = `cov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const cachedFile = path.join(cacheDir, `${hash}.jpg`);
        await fs.promises.writeFile(cachedFile, pic.data);
        coverArtPath = cachedFile;
      }
    } catch {}

    const waveformData = mediaType === 'audio' ? await extractWaveformPeaks(filePath, 128) : undefined;

    importedTracks.push({
      file_path: filePath,
      drive_letter: driveLetter,
      file_name: fileName,
      title,
      artist,
      album,
      duration,
      bitrate,
      sample_rate: sampleRate,
      format: ext,
      file_size: stats.size,
      mtime: Math.floor(stats.mtimeMs),
      cover_art_path: coverArtPath,
      waveform_data: waveformData,
      bpm,
      musical_key: musicalKey,
      camelot_key: camelotKey,
      media_type: mediaType,
      is_liked: false,
      play_count: 0,
      is_custom_metadata: false,
    });
  }

  if (importedTracks.length > 0) {
    upsertTracksBatch(importedTracks);
    mainWindow.webContents.send('library:updated');
  }

  const { tracks } = queryTracks({ limit: 100 });
  return tracks;
}
