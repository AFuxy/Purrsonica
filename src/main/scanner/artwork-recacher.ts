import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseFile } from 'music-metadata';
import { getDB } from '../db/database.js';
import { getCoversCacheDir } from '../db/database.js';

let isArtworkCancelled = false;

export function cancelArtworkRecache(): void {
  isArtworkCancelled = true;
}

const COMMON_COVER_NAMES = [
  'cover.jpg',
  'cover.jpeg',
  'cover.png',
  'cover.webp',
  'folder.jpg',
  'folder.jpeg',
  'folder.png',
  'albumart.jpg',
  'albumart.png',
  'front.jpg',
  'front.png',
];

async function findFolderCoverArt(dir: string): Promise<string | undefined> {
  try {
    for (const name of COMMON_COVER_NAMES) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) {
        return p;
      }
    }
  } catch {}
  return undefined;
}

export async function recacheAllArtwork(
  onProgress?: (current: number, total: number, status?: 'running' | 'completed' | 'cancelled') => void,
  force: boolean = false
): Promise<{ updatedCount: number; alreadyCachedCount: number; total: number; cancelled: boolean }> {
  isArtworkCancelled = false;
  const db = getDB();
  const cacheDir = getCoversCacheDir();

  const rows = db
    .prepare('SELECT id, file_path, cover_art_path, album, artist, media_type FROM tracks')
    .all() as Array<{
    id: string;
    file_path: string;
    cover_art_path: string | null;
    album: string;
    artist: string;
    media_type: string;
  }>;

  const total = rows.length;
  let updatedCount = 0;
  let alreadyCachedCount = 0;

  const updateStmt = db.prepare('UPDATE tracks SET cover_art_path = ? WHERE id = ?');

  for (let i = 0; i < total; i++) {
    if (isArtworkCancelled) {
      if (onProgress) onProgress(i, total, 'cancelled');
      return { updatedCount, alreadyCachedCount, total, cancelled: true };
    }

    const row = rows[i];

    // Smart Resume: If the track already has a valid cover on disk, skip expensive ID3 parsing
    if (!force && row.cover_art_path && fs.existsSync(row.cover_art_path)) {
      alreadyCachedCount++;
      if (onProgress && (i % 25 === 0 || i === total - 1)) {
        onProgress(i + 1, total, 'running');
      }
      continue;
    }

    if (!fs.existsSync(row.file_path)) continue;

    let newCoverPath: string | undefined = undefined;

    // Check embedded metadata for audio
    if (row.media_type === 'audio') {
      try {
        const metadata = await parseFile(row.file_path, { skipCovers: false });
        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const pic = metadata.common.picture[0];
          const hash = crypto.createHash('md5').update(pic.data).digest('hex');
          const extName = pic.format?.includes('png') ? '.png' : '.jpg';
          const cachedFile = path.join(cacheDir, `${hash}${extName}`);

          if (!fs.existsSync(cachedFile)) {
            await fs.promises.writeFile(cachedFile, pic.data);
          }
          newCoverPath = cachedFile;
        }
      } catch {}
    }

    // Fallback to directory cover art (folder.jpg, cover.jpg, etc.)
    if (!newCoverPath) {
      newCoverPath = await findFolderCoverArt(path.dirname(row.file_path));
    }

    if (newCoverPath && newCoverPath !== row.cover_art_path) {
      updateStmt.run(newCoverPath, row.id);
      updatedCount++;
    }

    if (onProgress && (i % 15 === 0 || i === total - 1)) {
      onProgress(i + 1, total, 'running');
    }
  }

  // Update albums summary cover art
  try {
    db.prepare(`
      UPDATE albums 
      SET cover_art_path = (
        SELECT cover_art_path 
        FROM tracks 
        WHERE tracks.album = albums.name AND tracks.cover_art_path IS NOT NULL 
        LIMIT 1
      )
      WHERE is_custom = 0
    `).run();
  } catch {}

  if (onProgress) onProgress(total, total, 'completed');
  return { updatedCount, alreadyCachedCount, total, cancelled: false };
}
