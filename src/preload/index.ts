import { contextBridge, ipcRenderer, webUtils } from 'electron';
import {
  Track,
  Album,
  Playlist,
  DriveInfo,
  LibraryStats,
  ScanProgress,
  ScanSettings,
  UpdateTrackMetadataPayload,
  UpdateStatus,
  DiscordPresencePayload,
} from '../shared/types.js';

export const electronAPI = {
  // Discord Rich Presence
  updateDiscordPresence: (payload: DiscordPresencePayload) =>
    ipcRenderer.invoke('discord:update-presence', payload),
  clearDiscordPresence: () => ipcRenderer.invoke('discord:clear-presence'),
  setDiscordRpcEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('discord:set-enabled', enabled),

  // Window controls & App Info
  platform: process.platform,
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  setMiniPlayer: (enable: boolean): Promise<boolean> =>
    ipcRenderer.invoke('window:setMiniPlayer', enable),
  isMiniPlayer: (): Promise<boolean> =>
    ipcRenderer.invoke('window:isMiniPlayer'),
  setThemeIcon: (theme: 'dark' | 'light') => ipcRenderer.invoke('theme:setIcon', theme),
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),

  // Tracks
  queryTracks: (params?: any): Promise<{ tracks: Track[]; total: number }> =>
    ipcRenderer.invoke('tracks:query', params),
  getTrackById: (id: string): Promise<Track | null> =>
    ipcRenderer.invoke('tracks:getById', id),
  toggleLike: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('tracks:toggleLike', id),
  incrementPlayCount: (id: string): Promise<void> =>
    ipcRenderer.invoke('tracks:incrementPlayCount', id),
  saveWaveform: (trackId: string, waveformData: number[]): Promise<void> =>
    ipcRenderer.invoke('tracks:saveWaveform', trackId, waveformData),
  generateWaveform: (filePath: string): Promise<number[]> =>
    ipcRenderer.invoke('tracks:generateWaveform', filePath),

  // Metadata
  updateMetadata: (payload: UpdateTrackMetadataPayload): Promise<Track | null> =>
    ipcRenderer.invoke('metadata:update', payload),

  // Drives & Library
  getDrives: (): Promise<DriveInfo[]> => ipcRenderer.invoke('drives:get'),
  getAlbums: (): Promise<Album[]> => ipcRenderer.invoke('albums:get'),
  getStats: (): Promise<LibraryStats> => ipcRenderer.invoke('stats:get'),

  // Playlists
  getPlaylists: (): Promise<Playlist[]> => ipcRenderer.invoke('playlists:get'),
  createPlaylist: (name: string, description?: string): Promise<Playlist> =>
    ipcRenderer.invoke('playlists:create', name, description),
  updatePlaylist: (
    id: string,
    name?: string,
    description?: string,
    coverArtBase64?: string
  ): Promise<Playlist | null> =>
    ipcRenderer.invoke('playlists:update', id, name, description, coverArtBase64),
  deletePlaylist: (id: string): Promise<void> =>
    ipcRenderer.invoke('playlists:delete', id),
  addTrackToPlaylist: (playlistId: string, trackId: string): Promise<void> =>
    ipcRenderer.invoke('playlists:addTrack', playlistId, trackId),
  removeTrackFromPlaylist: (playlistId: string, trackId: string): Promise<void> =>
    ipcRenderer.invoke('playlists:removeTrack', playlistId, trackId),

  // Scanner controls
  startScan: (targetDrives?: string[], customFolders?: string[]): Promise<ScanProgress> =>
    ipcRenderer.invoke('scanner:start', targetDrives, customFolders),
  stopScan: (): Promise<ScanProgress> => ipcRenderer.invoke('scanner:stop'),
  getScanProgress: (): Promise<ScanProgress> => ipcRenderer.invoke('scanner:getProgress'),
  getScanSettings: (): Promise<ScanSettings> => ipcRenderer.invoke('scanner:getSettings'),
  saveScanSettings: (settings: ScanSettings): Promise<ScanSettings> =>
    ipcRenderer.invoke('scanner:saveSettings', settings),

  // Auto-Updater
  checkForUpdates: (): Promise<UpdateStatus> => ipcRenderer.invoke('updater:check'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('updater:install'),
  getUpdateStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('updater:getStatus'),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const handler = (_event: any, data: UpdateStatus) => callback(data);
    ipcRenderer.on('updater:status', handler);
    return () => ipcRenderer.removeListener('updater:status', handler);
  },

  // Danger Zone / Maintenance
  clearCache: (): Promise<boolean> => ipcRenderer.invoke('system:clearCache'),
  recacheArtwork: (): Promise<{ updatedCount: number; total: number; cancelled?: boolean }> =>
    ipcRenderer.invoke('system:recacheArtwork'),
  cancelRecacheArtwork: (): Promise<boolean> => ipcRenderer.invoke('system:cancelRecacheArtwork'),
  onRecacheProgress: (callback: (progress: { current: number; total: number; status?: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('artwork:recacheProgress', handler);
    return () => ipcRenderer.removeListener('artwork:recacheProgress', handler);
  },
  recacheWaveforms: (): Promise<{ generatedCount: number; total: number; cancelled?: boolean }> =>
    ipcRenderer.invoke('system:recacheWaveforms'),
  cancelRecacheWaveforms: (): Promise<boolean> => ipcRenderer.invoke('system:cancelRecacheWaveforms'),
  onRecacheWaveformsProgress: (callback: (progress: { current: number; total: number; status?: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('waveforms:recacheProgress', handler);
    return () => {
      ipcRenderer.removeListener('waveforms:recacheProgress', handler);
    };
  },
  wipeLibrary: (): Promise<boolean> => ipcRenderer.invoke('system:wipeLibrary'),
  factoryReset: (): Promise<boolean> => ipcRenderer.invoke('system:factoryReset'),
  cleanDeadTracks: (): Promise<{ removedCount: number }> => ipcRenderer.invoke('system:cleanDeadTracks'),
  showItemInFolder: (filePath: string): Promise<boolean> => ipcRenderer.invoke('system:showItemInFolder', filePath),

  // Dialogs & Drag-and-Drop Import
  pickFiles: (): Promise<Track[]> => ipcRenderer.invoke('dialog:pickFiles'),
  pickFolders: (): Promise<ScanProgress> => ipcRenderer.invoke('dialog:pickFolders'),
  pickImage: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickImage'),
  importPaths: (paths: string[]): Promise<{ importedCount: number }> =>
    ipcRenderer.invoke('media:importPaths', paths),
  getPathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return (file as any).path || '';
    }
  },

  // Real-time Event Subscriptions
  onScanProgress: (callback: (progress: ScanProgress) => void) => {
    const handler = (_event: any, data: ScanProgress) => callback(data);
    ipcRenderer.on('scanner:progress', handler);
    return () => ipcRenderer.removeListener('scanner:progress', handler);
  },
  onLibraryUpdated: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('library:updated', handler);
    return () => ipcRenderer.removeListener('library:updated', handler);
  },
  onGlobalMediaKey: (callback: (action: 'play-pause' | 'next' | 'previous' | 'stop') => void) => {
    const handler = (_event: any, action: 'play-pause' | 'next' | 'previous' | 'stop') => callback(action);
    ipcRenderer.on('media:global-key', handler);
    return () => ipcRenderer.removeListener('media:global-key', handler);
  },

  // Protocol URL helpers
  getMediaUrl: (filePath: string) => {
    return `media://app/stream?path=${encodeURIComponent(filePath)}`;
  },
  getCoverUrl: (coverPath?: string) => {
    if (!coverPath) return null;
    if (coverPath.startsWith('data:') || coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
      return coverPath;
    }
    return `cover://app/image?path=${encodeURIComponent(coverPath)}`;
  },
};

contextBridge.exposeInMainWorld('api', electronAPI);

export type ElectronAPI = typeof electronAPI;
