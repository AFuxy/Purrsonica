import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import { INIT_SCHEMA_SQL } from './schema.js';

let dbInstance: Database.Database | null = null;
let coversCacheDir = '';

export function getDatabasePath(): string {
  // If app is available (Electron main process)
  if (app) {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'purrsonica.db');
  }
  // Fallback for standalone worker or dev scripts
  const localDir = path.join(process.cwd(), '.purrsonica_data');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  return path.join(localDir, 'purrsonica.db');
}

let customCoversDir = '';

export function getCustomCoversDir(): string {
  if (customCoversDir) return customCoversDir;

  if (app) {
    customCoversDir = path.join(app.getPath('userData'), 'custom_covers');
  } else {
    customCoversDir = path.join(process.cwd(), '.purrsonica_data', 'custom_covers');
  }

  if (!fs.existsSync(customCoversDir)) {
    fs.mkdirSync(customCoversDir, { recursive: true });
  }
  return customCoversDir;
}

export function getCoversCacheDir(): string {
  if (coversCacheDir) return coversCacheDir;

  if (app) {
    coversCacheDir = path.join(app.getPath('userData'), 'covers_cache');
  } else {
    coversCacheDir = path.join(process.cwd(), '.purrsonica_data', 'covers_cache');
  }

  if (!fs.existsSync(coversCacheDir)) {
    fs.mkdirSync(coversCacheDir, { recursive: true });
  }
  return coversCacheDir;
}

export function clearCoversCache(): boolean {
  try {
    const dir = getCoversCacheDir();
    const oldDir = app
      ? path.join(app.getPath('userData'), 'cache', 'covers')
      : path.join(process.cwd(), '.purrsonica_data', 'cache', 'covers');

    for (const d of [dir, oldDir]) {
      if (fs.existsSync(d)) {
        const files = fs.readdirSync(d);
        for (const f of files) {
          // Never delete custom playlist or track covers
          if (f.startsWith('pl_cover_') || f.startsWith('custom_')) continue;
          try {
            fs.unlinkSync(path.join(d, f));
          } catch {}
        }
      }
    }

    if (dbInstance) {
      dbInstance.prepare("UPDATE tracks SET cover_art_path = NULL WHERE (cover_art_path LIKE '%covers_cache%' OR cover_art_path LIKE '%cache%') AND cover_art_path NOT LIKE '%custom_%'").run();
      dbInstance.prepare("UPDATE albums SET cover_art_path = NULL WHERE cover_art_path LIKE '%covers_cache%' OR cover_art_path LIKE '%cache%'").run();
    }
    return true;
  } catch (err) {
    console.error('Failed to clear covers cache:', err);
    return false;
  }
}

export function initDatabase(customPath?: string): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = customPath || getDatabasePath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(dbPath);

  // Performance Pragmas for lightning speed SQLite operations
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('synchronous = NORMAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('cache_size = -64000'); // 64MB cache
  dbInstance.pragma('temp_store = MEMORY');
  dbInstance.pragma('mmap_size = 268435456'); // 256MB memory mapping

  // Execute schema creation
  dbInstance.exec(INIT_SCHEMA_SQL);

  return dbInstance;
}

export function getDB(): Database.Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
