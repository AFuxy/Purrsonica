export type MediaType = 'audio' | 'video';

export interface Track {
  id: string;
  file_path: string;
  drive_letter: string;
  file_name: string;
  title: string;
  artist: string;
  album: string;
  album_artist?: string;
  genre?: string;
  year?: number;
  track_number?: number;
  disc_number?: number;
  duration: number; // in seconds
  bitrate?: number; // in kbps
  sample_rate?: number; // in Hz
  format: string; // e.g. 'mp3', 'flac', 'mp4'
  file_size: number; // in bytes
  mtime: number; // timestamp
  cover_art_path?: string; // cached thumbnail file path or data URI
  waveform_data?: number[]; // 100-200 normalized amplitude points (0.0 to 1.0)
  bpm?: number;
  musical_key?: string; // e.g. "A Minor", "C Major"
  camelot_key?: string; // e.g. "8A", "11B"
  is_liked: boolean;
  play_count: number;
  last_played_at?: number;
  media_type: MediaType;
  is_custom_metadata: boolean;
  created_at: number;
  updated_at: number;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  cover_art_path?: string;
  year?: number;
  track_count: number;
  is_custom: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_art_path?: string;
  is_system: boolean; // Liked, All, etc.
  track_count: number;
  created_at: number;
}

export interface PlaylistTrack {
  playlist_id: string;
  track_id: string;
  position: number;
  added_at: number;
}

export interface DriveInfo {
  letter: string; // e.g. 'C:', 'D:'
  label: string;
  totalSpace?: number;
  freeSpace?: number;
  trackCount: number;
  isScanning?: boolean;
}

export type ScanStatus = 'idle' | 'scanning' | 'stopping' | 'completed' | 'error';

export interface ScanProgress {
  status: ScanStatus;
  currentDrive?: string;
  currentFolder?: string;
  currentFile?: string;
  scannedFilesCount: number;
  foundMediaCount: number;
  newMediaCount: number;
  elapsedMs: number;
  errorMessage?: string;
}

export interface ScanSettings {
  excludedPaths: string[];
  customFolders: string[];
  scanAudio: boolean;
  scanVideo: boolean;
  generateWaveforms: boolean;
  autoDetectKeyBpm: boolean;
  allowPrerelease?: boolean;
  enableDiscordRpc?: boolean;
  discordRpcShowButtons?: boolean;
  enableDjMode?: boolean;
  enableGaplessPlayback?: boolean;
  crossfadeDuration?: number; // 0 to 10 seconds (0 = 0ms gapless, 1-10s = crossfade)
  allowOutsideLan?: boolean; // Out-of-LAN Remote Streaming Toggle (Default: false)
}

export interface DiscordPresencePayload {
  track?: {
    id: string;
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
    file_name?: string;
    media_type?: string;
  } | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface CamelotKeyInfo {
  camelot: string; // e.g. "8A"
  musicalKey: string; // e.g. "A Minor"
  openKey: string; // e.g. "1m"
  energyLevel?: number;
  complementaryKeys: string[]; // harmonic mixing compatible keys
}

export type ThemeMode = 'dark' | 'light';

export interface LibraryStats {
  totalTracks: number;
  totalAudio: number;
  totalVideo: number;
  totalDuration: number;
  totalSize: number;
  totalArtists: number;
  totalAlbums: number;
  totalLiked: number;
}

export interface UpdateTrackMetadataPayload {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  track_number?: number;
  bpm?: number;
  musical_key?: string;
  camelot_key?: string;
  cover_art_base64?: string;
  writeToSourceFile?: boolean;
}

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateStatus {
  state: UpdateState;
  version?: string;
  releaseNotes?: string;
  percent?: number;
  isPrerelease?: boolean;
  isDowngrade?: boolean;
  errorMessage?: string;
}

export interface DuplicateTrackItem {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  bitrate: number;
  format: string;
  duration: number;
  drive_letter: string;
  created_at: string;
  isRecommendedKeep: boolean;
}

export interface DuplicateCluster {
  key: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  tracks: DuplicateTrackItem[];
  totalWastedBytes: number;
}

export interface DuplicateScanResult {
  clusters: DuplicateCluster[];
  totalClusters: number;
  totalDuplicateFiles: number;
  totalWastedBytes: number;
}

// --- Mobile Companion App Protocol Types ---

export interface CompanionDevice {
  id: string;
  name: string;
  platform: 'ios' | 'android' | 'web';
  model?: string;
  ip_address?: string;
  paired_at: number;
  last_seen_at: number;
  is_active: boolean;
}

export interface CompanionServerStatus {
  isRunning: boolean;
  port: number;
  localIps: string[];
  serverName: string;
  activeDeviceCount: number;
  pairedDeviceCount: number;
  allowOutsideLan: boolean;
}

export interface CompanionPairingSession {
  pairingToken: string;
  qrCodeDataUrl: string;
  port: number;
  localIps: string[];
  serverName: string;
  expiresAt: number;
  allowOutsideLan: boolean;
}

export interface RemotePlaybackCommand {
  type: 'play' | 'pause' | 'toggle' | 'next' | 'previous' | 'seek' | 'setVolume' | 'playTrack' | 'transferToPC';
  trackId?: string;
  position?: number;
  volume?: number;
}

export interface MobilePlaybackState {
  deviceId: string;
  deviceName: string;
  isPlaying: boolean;
  trackTitle?: string;
  trackArtist?: string;
  trackId?: string;
  currentTime?: number;
  duration?: number;
}

