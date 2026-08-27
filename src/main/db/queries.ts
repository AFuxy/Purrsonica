import fs from 'node:fs';
import { getDB } from './database.js';
import {
  Track,
  Album,
  Playlist,
  DriveInfo,
  LibraryStats,
  ScanSettings,
  UpdateTrackMetadataPayload,
} from '../../shared/types.js';

export interface TrackQueryParams {
  drive?: string;
  isLiked?: boolean;
  mediaType?: 'audio' | 'video' | 'all';
  search?: string;
  album?: string;
  artist?: string;
  genre?: string;
  camelotKey?: string;
  playlistId?: string;
  sortBy?: 'title' | 'artist' | 'album' | 'duration' | 'bpm' | 'camelot_key' | 'created_at' | 'track_number';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export function queryTracks(params: TrackQueryParams = {}): { tracks: Track[]; total: number } {
  const db = getDB();
  const conditions: string[] = [];
  const bindings: Record<string, any> = {};

  let joins = '';

  if (params.playlistId) {
    joins += ' INNER JOIN playlist_tracks pt ON pt.track_id = t.id';
    conditions.push('pt.playlist_id = @playlistId');
    bindings.playlistId = params.playlistId;
  }

  if (params.drive) {
    conditions.push('t.drive_letter = @drive');
    bindings.drive = params.drive;
  }

  if (params.isLiked !== undefined) {
    conditions.push('t.is_liked = @isLiked');
    bindings.isLiked = params.isLiked ? 1 : 0;
  }

  if (params.mediaType && params.mediaType !== 'all') {
    conditions.push('t.media_type = @mediaType');
    bindings.mediaType = params.mediaType;
  }

  if (params.album) {
    conditions.push('TRIM(LOWER(t.album)) = TRIM(LOWER(@album))');
    bindings.album = params.album;
  }

  if (params.artist) {
    conditions.push('(TRIM(LOWER(t.artist)) = TRIM(LOWER(@artist)) OR t.artist LIKE @artistPattern OR t.album_artist LIKE @artistPattern)');
    bindings.artist = params.artist;
    bindings.artistPattern = `%${params.artist}%`;
  }

  if (params.genre) {
    conditions.push('t.genre = @genre');
    bindings.genre = params.genre;
  }

  if (params.camelotKey) {
    conditions.push('t.camelot_key = @camelotKey');
    bindings.camelotKey = params.camelotKey;
  }

  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push('(t.title LIKE @search OR t.artist LIKE @search OR t.album LIKE @search OR t.file_name LIKE @search)');
    bindings.search = term;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const groupByClause = params.album
    ? `GROUP BY 
         CASE WHEN t.disc_number IS NULL OR t.disc_number = 0 THEN 1 ELSE t.disc_number END,
         CASE WHEN t.track_number IS NOT NULL AND t.track_number > 0 THEN t.track_number ELSE LOWER(TRIM(t.title)) END,
         LOWER(TRIM(t.title))`
    : '';

  // Get total count
  const countSql = params.album
    ? `SELECT COUNT(*) as count FROM (SELECT 1 FROM tracks t ${joins} ${whereClause} ${groupByClause})`
    : `SELECT COUNT(*) as count FROM tracks t ${joins} ${whereClause}`;
  const total = (db.prepare(countSql).get(bindings) as { count: number }).count;

  // Sorting
  const sortBy = params.sortBy || 'title';
  const sortOrder = params.sortOrder || 'ASC';
  let orderByClause = '';
  if (params.playlistId) {
    orderByClause = 'ORDER BY pt.position ASC';
  } else if (params.album && (!params.sortBy || params.sortBy === 'track_number' || params.sortBy === 'title')) {
    orderByClause = `ORDER BY 
      CASE WHEN t.disc_number IS NULL OR t.disc_number = 0 THEN 1 ELSE t.disc_number END ASC,
      CASE WHEN t.track_number IS NULL OR t.track_number = 0 THEN 9999 ELSE t.track_number END ASC,
      t.title COLLATE NOCASE ${sortOrder}`;
  } else {
    const isTextCol = ['title', 'artist', 'album', 'genre', 'camelot_key', 'file_name', 'file_path', 'album_artist'].includes(sortBy);
    orderByClause = isTextCol
      ? `ORDER BY t.${sortBy} COLLATE NOCASE ${sortOrder}`
      : `ORDER BY t.${sortBy} ${sortOrder}`;
  }

  let paginationClause = '';
  if (params.limit) {
    paginationClause = `LIMIT ${params.limit} OFFSET ${params.offset || 0}`;
  }

  const dataSql = `
    SELECT 
      t.id, t.file_path, t.drive_letter, t.file_name, t.title, t.artist, t.album, t.album_artist,
      t.genre, t.year, t.track_number, t.disc_number, t.duration, t.bitrate, t.sample_rate,
      t.format, t.file_size, t.mtime, t.cover_art_path, t.bpm, t.musical_key, t.camelot_key,
      t.is_liked, t.play_count, t.last_played_at, t.media_type, t.is_custom_metadata,
      t.created_at, t.updated_at
    FROM tracks t ${joins} ${whereClause} ${groupByClause} ${orderByClause} ${paginationClause}
  `;
  const rows = db.prepare(dataSql).all(bindings) as any[];

  const tracks: Track[] = rows.map((r) => ({
    ...r,
    is_liked: Boolean(r.is_liked),
    is_custom_metadata: Boolean(r.is_custom_metadata),
  }));

  return { tracks, total };
}

export function getTrackById(id: string): Track | null {
  const db = getDB();
  const row = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    ...row,
    is_liked: Boolean(row.is_liked),
    is_custom_metadata: Boolean(row.is_custom_metadata),
    waveform_data: row.waveform_data ? JSON.parse(row.waveform_data) : undefined,
  };
}

export function getTrackByPath(filePath: string): Track | null {
  const db = getDB();
  const row = db.prepare('SELECT * FROM tracks WHERE file_path = ?').get(filePath) as any;
  if (!row) return null;
  return {
    ...row,
    is_liked: Boolean(row.is_liked),
    is_custom_metadata: Boolean(row.is_custom_metadata),
    waveform_data: row.waveform_data ? JSON.parse(row.waveform_data) : undefined,
  };
}

export function getDrivesSummary(): DriveInfo[] {
  const db = getDB();
  const rows = db
    .prepare(
      `SELECT drive_letter, COUNT(*) as trackCount 
       FROM tracks 
       GROUP BY drive_letter 
       ORDER BY drive_letter ASC`
    )
    .all() as { drive_letter: string; trackCount: number }[];

  return rows.map((r) => ({
    letter: r.drive_letter,
    label: `Drive ${r.drive_letter}`,
    trackCount: r.trackCount,
  }));
}

export function getAlbumsSummary(): Album[] {
  const db = getDB();
  const rows = db
    .prepare(
      `SELECT 
         MAX(album) as name, 
         COALESCE(
           NULLIF(MAX(album_artist), ''), 
           NULLIF(MIN(album_artist), ''), 
           CASE WHEN COUNT(DISTINCT artist) > 1 THEN 'Various Artists' ELSE MAX(artist) END
         ) as artist, 
         MAX(cover_art_path) as cover_art_path, 
         MAX(year) as year, 
         COUNT(DISTINCT LOWER(TRIM(title))) as track_count 
       FROM tracks 
       WHERE album IS NOT NULL AND TRIM(album) != '' AND TRIM(LOWER(album)) != 'unknown album'
       GROUP BY TRIM(LOWER(album)) 
       ORDER BY MAX(album) COLLATE NOCASE ASC`
    )
    .all() as any[];

  return rows.map((r, i) => ({
    id: `album_${i}_${encodeURIComponent(r.name)}`,
    name: r.name,
    artist: r.artist,
    cover_art_path: r.cover_art_path,
    year: r.year,
    track_count: r.track_count,
    is_custom: false,
  }));
}

export function getPlaylists(): Playlist[] {
  const db = getDB();
  const rows = db
    .prepare(
      `SELECT p.*, COUNT(pt.track_id) as track_count 
       FROM playlists p 
       LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id 
       GROUP BY p.id 
       ORDER BY p.is_system DESC, p.created_at ASC`
    )
    .all() as any[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    cover_art_path: r.cover_art_path,
    is_system: Boolean(r.is_system),
    track_count: r.track_count,
    created_at: r.created_at,
  }));
}

export function createPlaylist(name: string, description?: string): Playlist {
  const db = getDB();
  const id = 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = Date.now();

  db.prepare(
    `INSERT INTO playlists (id, name, description, is_system, created_at) 
     VALUES (?, ?, ?, 0, ?)`
  ).run(id, name, description || '', now);

  return {
    id,
    name,
    description,
    is_system: false,
    track_count: 0,
    created_at: now,
  };
}

export function deletePlaylist(id: string): void {
  const db = getDB();
  db.prepare('DELETE FROM playlists WHERE id = ? AND is_system = 0').run(id);
}

export function updatePlaylist(
  id: string,
  name?: string,
  description?: string,
  coverArtPath?: string
): Playlist | null {
  const db = getDB();
  db.prepare(
    `UPDATE playlists SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      cover_art_path = COALESCE(?, cover_art_path)
     WHERE id = ? AND is_system = 0`
  ).run(name || null, description !== undefined ? description : null, coverArtPath || null, id);

  const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    cover_art_path: row.cover_art_path,
    is_system: Boolean(row.is_system),
    track_count: 0,
    created_at: row.created_at,
  };
}

export function addTrackToPlaylist(playlistId: string, trackId: string): void {
  const db = getDB();
  const maxPosRow = db
    .prepare('SELECT MAX(position) as maxPos FROM playlist_tracks WHERE playlist_id = ?')
    .get(playlistId) as { maxPos: number | null };
  const position = (maxPosRow?.maxPos ?? -1) + 1;

  db.prepare(
    `INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at) 
     VALUES (?, ?, ?, ?)`
  ).run(playlistId, trackId, position, Date.now());
}

export function removeTrackFromPlaylist(playlistId: string, trackId: string): void {
  const db = getDB();
  db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?').run(
    playlistId,
    trackId
  );
}

export function toggleLikeTrack(id: string): boolean {
  const db = getDB();
  const track = db.prepare('SELECT is_liked FROM tracks WHERE id = ?').get(id) as { is_liked: number } | undefined;
  if (!track) return false;

  const newLiked = track.is_liked ? 0 : 1;
  db.prepare('UPDATE tracks SET is_liked = ?, updated_at = ? WHERE id = ?').run(
    newLiked,
    Date.now(),
    id
  );
  return Boolean(newLiked);
}

export function upsertTracksBatch(tracks: Partial<Track>[]): { inserted: number; updated: number } {
  const db = getDB();
  let inserted = 0;
  let updated = 0;

  const insertStmt = db.prepare(`
    INSERT INTO tracks (
      id, file_path, drive_letter, file_name, title, artist, album, album_artist,
      genre, year, track_number, disc_number, duration, bitrate, sample_rate,
      format, file_size, mtime, cover_art_path, waveform_data, bpm, musical_key,
      camelot_key, is_liked, play_count, last_played_at, media_type,
      is_custom_metadata, created_at, updated_at
    ) VALUES (
      @id, @file_path, @drive_letter, @file_name, @title, @artist, @album, @album_artist,
      @genre, @year, @track_number, @disc_number, @duration, @bitrate, @sample_rate,
      @format, @file_size, @mtime, @cover_art_path, @waveform_data, @bpm, @musical_key,
      @camelot_key, @is_liked, @play_count, @last_played_at, @media_type,
      @is_custom_metadata, @created_at, @updated_at
    )
    ON CONFLICT(file_path) DO UPDATE SET
      drive_letter = excluded.drive_letter,
      file_name = excluded.file_name,
      title = CASE WHEN tracks.is_custom_metadata = 1 THEN tracks.title ELSE excluded.title END,
      artist = CASE WHEN tracks.is_custom_metadata = 1 THEN tracks.artist ELSE excluded.artist END,
      album = CASE WHEN tracks.is_custom_metadata = 1 THEN tracks.album ELSE excluded.album END,
      album_artist = CASE WHEN tracks.is_custom_metadata = 1 THEN tracks.album_artist ELSE excluded.album_artist END,
      genre = CASE WHEN tracks.is_custom_metadata = 1 THEN tracks.genre ELSE excluded.genre END,
      year = CASE WHEN tracks.is_custom_metadata = 1 THEN tracks.year ELSE excluded.year END,
      track_number = CASE WHEN tracks.is_custom_metadata = 1 THEN tracks.track_number ELSE excluded.track_number END,
      duration = excluded.duration,
      bitrate = excluded.bitrate,
      sample_rate = excluded.sample_rate,
      format = excluded.format,
      file_size = excluded.file_size,
      mtime = excluded.mtime,
      cover_art_path = CASE WHEN tracks.is_custom_metadata = 1 AND tracks.cover_art_path IS NOT NULL THEN tracks.cover_art_path ELSE excluded.cover_art_path END,
      waveform_data = COALESCE(excluded.waveform_data, tracks.waveform_data),
      bpm = CASE WHEN tracks.is_custom_metadata = 1 AND tracks.bpm IS NOT NULL THEN tracks.bpm ELSE excluded.bpm END,
      musical_key = CASE WHEN tracks.is_custom_metadata = 1 AND tracks.musical_key IS NOT NULL THEN tracks.musical_key ELSE excluded.musical_key END,
      camelot_key = CASE WHEN tracks.is_custom_metadata = 1 AND tracks.camelot_key IS NOT NULL THEN tracks.camelot_key ELSE excluded.camelot_key END,
      updated_at = excluded.updated_at
  `);

  const runBatch = db.transaction((items: Partial<Track>[]) => {
    for (const item of items) {
      const now = Date.now();
      const params = {
        id: item.id || 'trk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        file_path: item.file_path!,
        drive_letter: item.drive_letter || 'C:',
        file_name: item.file_name || '',
        title: item.title || item.file_name || 'Unknown Title',
        artist: item.artist || 'Unknown Artist',
        album: item.album || 'Unknown Album',
        album_artist: item.album_artist || null,
        genre: item.genre || null,
        year: item.year || null,
        track_number: item.track_number || null,
        disc_number: item.disc_number || null,
        duration: item.duration || 0,
        bitrate: item.bitrate || null,
        sample_rate: item.sample_rate || null,
        format: item.format || 'unknown',
        file_size: item.file_size || 0,
        mtime: item.mtime || now,
        cover_art_path: item.cover_art_path || null,
        waveform_data: item.waveform_data ? JSON.stringify(item.waveform_data) : null,
        bpm: item.bpm || null,
        musical_key: item.musical_key || null,
        camelot_key: item.camelot_key || null,
        is_liked: item.is_liked ? 1 : 0,
        play_count: item.play_count || 0,
        last_played_at: item.last_played_at || null,
        media_type: item.media_type || 'audio',
        is_custom_metadata: item.is_custom_metadata ? 1 : 0,
        created_at: item.created_at || now,
        updated_at: now,
      };

      const result = insertStmt.run(params);
      if (result.changes > 0) {
        inserted++;
      }
    }
  });

  runBatch(tracks);
  return { inserted, updated };
}

export function updateTrackMetadataInDB(payload: UpdateTrackMetadataPayload): Track | null {
  const db = getDB();
  const track = getTrackById(payload.id);
  if (!track) return null;

  const now = Date.now();
  db.prepare(`
    UPDATE tracks SET
      title = COALESCE(@title, title),
      artist = COALESCE(@artist, artist),
      album = COALESCE(@album, album),
      genre = COALESCE(@genre, genre),
      year = COALESCE(@year, year),
      track_number = COALESCE(@track_number, track_number),
      bpm = COALESCE(@bpm, bpm),
      musical_key = COALESCE(@musical_key, musical_key),
      camelot_key = COALESCE(@camelot_key, camelot_key),
      cover_art_path = COALESCE(@cover_art_path, cover_art_path),
      is_custom_metadata = 1,
      updated_at = @now
    WHERE id = @id
  `).run({
    id: payload.id,
    title: payload.title !== undefined ? payload.title : null,
    artist: payload.artist !== undefined ? payload.artist : null,
    album: payload.album !== undefined ? payload.album : null,
    genre: payload.genre !== undefined ? payload.genre : null,
    year: payload.year !== undefined ? payload.year : null,
    track_number: payload.track_number !== undefined ? payload.track_number : null,
    bpm: payload.bpm !== undefined ? payload.bpm : null,
    musical_key: payload.musical_key !== undefined ? payload.musical_key : null,
    camelot_key: payload.camelot_key !== undefined ? payload.camelot_key : null,
    cover_art_path: (payload as any).cover_art_path || null,
    now,
  });

  return getTrackById(payload.id);
}

export function saveTrackWaveform(trackId: string, waveformData: number[]): void {
  const db = getDB();
  db.prepare('UPDATE tracks SET waveform_data = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(waveformData),
    Date.now(),
    trackId
  );
}

export function incrementPlayCount(trackId: string): void {
  const db = getDB();
  db.prepare(
    'UPDATE tracks SET play_count = play_count + 1, last_played_at = ?, updated_at = ? WHERE id = ?'
  ).run(Date.now(), Date.now(), trackId);
}

export function getLibraryStats(): LibraryStats {
  const db = getDB();
  const counts = db
    .prepare(`
      SELECT 
        COUNT(*) as totalTracks,
        SUM(CASE WHEN media_type = 'audio' THEN 1 ELSE 0 END) as totalAudio,
        SUM(CASE WHEN media_type = 'video' THEN 1 ELSE 0 END) as totalVideo,
        SUM(duration) as totalDuration,
        SUM(file_size) as totalSize,
        COUNT(DISTINCT artist) as totalArtists,
        COUNT(DISTINCT album) as totalAlbums,
        SUM(CASE WHEN is_liked = 1 THEN 1 ELSE 0 END) as totalLiked
      FROM tracks
    `)
    .get() as any;

  return {
    totalTracks: counts.totalTracks || 0,
    totalAudio: counts.totalAudio || 0,
    totalVideo: counts.totalVideo || 0,
    totalDuration: counts.totalDuration || 0,
    totalSize: counts.totalSize || 0,
    totalArtists: counts.totalArtists || 0,
    totalAlbums: counts.totalAlbums || 0,
    totalLiked: counts.totalLiked || 0,
  };
}

export const DEFAULT_SCAN_SETTINGS: ScanSettings = {
  excludedPaths: [
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
    'C:\\ProgramData',
    'AppData\\Local\\Temp',
    'AppData\\Local\\Microsoft',
    'node_modules',
    '.git',
    '.vscode',
    '$Recycle.Bin',
    'System Volume Information',
  ],
  customFolders: [],
  scanAudio: true,
  scanVideo: true,
  generateWaveforms: true,
  autoDetectKeyBpm: true,
  allowPrerelease: false,
  enableDiscordRpc: true,
  discordRpcShowButtons: true,
};

export function getScanSettings(): ScanSettings {
  const db = getDB();
  const row = db.prepare('SELECT value_json FROM app_settings WHERE key = ?').get('scan_settings') as { value_json: string } | undefined;
  if (!row) {
    saveScanSettings(DEFAULT_SCAN_SETTINGS);
    return DEFAULT_SCAN_SETTINGS;
  }
  try {
    return { ...DEFAULT_SCAN_SETTINGS, ...JSON.parse(row.value_json) };
  } catch {
    return DEFAULT_SCAN_SETTINGS;
  }
}

export function saveScanSettings(settings: ScanSettings): void {
  const db = getDB();
  db.prepare(
    `INSERT INTO app_settings (key, value_json) 
     VALUES ('scan_settings', ?) 
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`
  ).run(JSON.stringify(settings));
}

export function wipeLibraryOnly(): void {
  const db = getDB();
  db.transaction(() => {
    db.prepare('DELETE FROM tracks').run();
    db.prepare('DELETE FROM albums').run();
    db.prepare('DELETE FROM playlist_tracks').run();
  })();
}

export function cleanDeadTracks(): { removedCount: number } {
  const db = getDB();
  const rows = db.prepare('SELECT id, file_path FROM tracks').all() as { id: string; file_path: string }[];
  let removedCount = 0;

  const deleteStmt = db.prepare('DELETE FROM tracks WHERE id = ?');
  const deletePlaylistTracksStmt = db.prepare('DELETE FROM playlist_tracks WHERE track_id = ?');

  const runCleanup = db.transaction(() => {
    for (const r of rows) {
      if (!fs.existsSync(r.file_path)) {
        deletePlaylistTracksStmt.run(r.id);
        deleteStmt.run(r.id);
        removedCount++;
      }
    }
  });

  runCleanup();
  return { removedCount };
}

export function factoryResetDatabase(): void {
  const db = getDB();
  db.transaction(() => {
    db.prepare('DELETE FROM playlist_tracks').run();
    db.prepare('DELETE FROM playlists').run();
    db.prepare('DELETE FROM tracks').run();
    db.prepare('DELETE FROM albums').run();
    db.prepare('DELETE FROM app_settings').run();
  })();
}
