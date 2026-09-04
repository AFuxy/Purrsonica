export const INIT_SCHEMA_SQL = `
-- Tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  file_path TEXT UNIQUE NOT NULL,
  drive_letter TEXT NOT NULL,
  file_name TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  album_artist TEXT,
  genre TEXT,
  year INTEGER,
  track_number INTEGER,
  disc_number INTEGER,
  duration REAL NOT NULL DEFAULT 0,
  bitrate INTEGER,
  sample_rate INTEGER,
  format TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mtime INTEGER NOT NULL DEFAULT 0,
  cover_art_path TEXT,
  waveform_data TEXT, -- JSON array of normalized peaks
  bpm REAL,
  musical_key TEXT,
  camelot_key TEXT,
  is_liked INTEGER NOT NULL DEFAULT 0,
  play_count INTEGER NOT NULL DEFAULT 0,
  last_played_at INTEGER,
  media_type TEXT NOT NULL DEFAULT 'audio', -- 'audio' | 'video'
  is_custom_metadata INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes for lightning fast queries, search, and sorting
CREATE INDEX IF NOT EXISTS idx_tracks_drive ON tracks(drive_letter);
CREATE INDEX IF NOT EXISTS idx_tracks_drive_media ON tracks(drive_letter, media_type);
CREATE INDEX IF NOT EXISTS idx_tracks_media_type ON tracks(media_type);
CREATE INDEX IF NOT EXISTS idx_tracks_is_liked ON tracks(is_liked);
CREATE INDEX IF NOT EXISTS idx_tracks_liked_media ON tracks(is_liked, media_type);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_camelot_key ON tracks(camelot_key);
CREATE INDEX IF NOT EXISTS idx_tracks_bpm ON tracks(bpm);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
CREATE INDEX IF NOT EXISTS idx_tracks_created ON tracks(created_at DESC);

-- Albums table
CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  artist TEXT NOT NULL,
  cover_art_path TEXT,
  year INTEGER,
  track_count INTEGER NOT NULL DEFAULT 0,
  is_custom INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist);
CREATE INDEX IF NOT EXISTS idx_albums_name ON albums(name);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_art_path TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Playlist tracks mapping table
CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (playlist_id, track_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position);

-- Application Settings / Scanner Settings
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

-- Mobile Companion Devices
CREATE TABLE IF NOT EXISTS companion_devices (
  id TEXT PRIMARY KEY,               -- Unique hardware device UUID
  name TEXT NOT NULL,               -- e.g. "Zak's iPhone 16 Pro"
  platform TEXT NOT NULL,           -- 'ios' | 'android' | 'web'
  model TEXT,                       -- Device model
  auth_token_hash TEXT NOT NULL,    -- SHA-256 hash of pairing token
  ip_address TEXT,                  -- Last known IP
  paired_at INTEGER NOT NULL,       -- Creation timestamp
  last_seen_at INTEGER NOT NULL,    -- Heartbeat timestamp
  is_active INTEGER DEFAULT 0       -- 1 = Currently connected via WS
);
CREATE INDEX IF NOT EXISTS idx_companion_devices_active ON companion_devices(is_active);
`;
