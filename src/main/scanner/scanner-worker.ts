import { parentPort } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { parseFile } from 'music-metadata';
import { parseKey } from '../../shared/camelot.js';
import { shouldExcludeFolder, getMediaType } from './exclusions.js';
import { extractWaveformPeaks } from './waveform.js';
import { Track } from '../../shared/types.js';

let isAborted = false;

if (!parentPort) {
  throw new Error('scanner-worker must be run inside a Worker Thread');
}

parentPort.on('message', async (message: any) => {
  if (message.type === 'START_SCAN') {
    isAborted = false;
    try {
      await runScan(message.payload);
    } catch (err: any) {
      parentPort?.postMessage({
        type: 'ERROR',
        payload: err?.message || String(err),
      });
    }
  } else if (message.type === 'ABORT_SCAN') {
    isAborted = true;
  }
});

interface ScanOptions {
  drives: string[];
  customFolders: string[];
  exclusions: string[];
  generateWaveforms: boolean;
  cacheDir: string;
}

async function runScan(options: ScanOptions) {
  const startTime = Date.now();
  let scannedFilesCount = 0;
  let foundMediaCount = 0;
  const BATCH_SIZE = 100; // Efficient high-throughput batches
  let currentBatch: Partial<Track>[] = [];
  let lastFlushTime = Date.now();

  const sendProgress = (currentFolder: string, currentFile?: string) => {
    parentPort?.postMessage({
      type: 'PROGRESS',
      payload: {
        status: isAborted ? 'stopping' : 'scanning',
        currentFolder,
        currentFile,
        scannedFilesCount,
        foundMediaCount,
        newMediaCount: foundMediaCount,
        elapsedMs: Date.now() - startTime,
      },
    });
  };

  const flushBatch = () => {
    if (currentBatch.length > 0) {
      parentPort?.postMessage({
        type: 'BATCH_RESULTS',
        payload: {
          tracks: [...currentBatch],
        },
      });
      currentBatch = [];
      lastFlushTime = Date.now();
    }
  };

  // Build target roots to scan
  const rootsToScan: string[] = [];
  if (options.customFolders && options.customFolders.length > 0) {
    rootsToScan.push(...options.customFolders);
  } else if (options.drives && options.drives.length > 0) {
    rootsToScan.push(...options.drives);
  } else {
    // Default roots by OS
    if (process.platform === 'win32') {
      rootsToScan.push('C:\\');
    } else {
      const musicDir = path.join(os.homedir(), 'Music');
      rootsToScan.push(fs.existsSync(musicDir) ? musicDir : os.homedir());
    }
  }

  // Ensure covers cache directory exists
  if (options.cacheDir && !fs.existsSync(options.cacheDir)) {
    try {
      fs.mkdirSync(options.cacheDir, { recursive: true });
    } catch {}
  }

  let lastProgressReportTime = 0;

  for (const root of rootsToScan) {
    if (isAborted) break;

    // Check if root exists
    if (!fs.existsSync(root)) continue;

    const stack: string[] = [root];

    while (stack.length > 0) {
      if (isAborted) break;

      const currentDir = stack.pop()!;

      // Skip excluded directories
      if (shouldExcludeFolder(currentDir, options.exclusions)) {
        continue;
      }

      let entries: fs.Dirent[] = [];
      try {
        entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      } catch {
        // Skip inaccessible folders (permission denied, system folders)
        continue;
      }

      const now = Date.now();
      if (now - lastProgressReportTime > 100) {
        sendProgress(currentDir);
        lastProgressReportTime = now;
      }

      for (const entry of entries) {
        if (isAborted) break;

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Add to traversal stack if not excluded
          if (!shouldExcludeFolder(fullPath, options.exclusions)) {
            stack.push(fullPath);
          }
        } else if (entry.isFile()) {
          scannedFilesCount++;
          const mediaType = getMediaType(fullPath);

          if (mediaType) {
            foundMediaCount++;
            try {
              const trackData = await parseMediaFile(fullPath, mediaType, options);
              if (trackData) {
                currentBatch.push(trackData);
                if (currentBatch.length >= BATCH_SIZE || Date.now() - lastFlushTime > 400) {
                  flushBatch();
                }
              }
            } catch (err) {
              // Ignore single file parse errors and continue
            }
          }
        }
      }
    }
  }

  // Flush remaining items
  flushBatch();

  const elapsedMs = Date.now() - startTime;
  if (isAborted) {
    parentPort?.postMessage({
      type: 'ABORTED',
      payload: {
        scannedFilesCount,
        foundMediaCount,
        elapsedMs,
      },
    });
  } else {
    parentPort?.postMessage({
      type: 'COMPLETED',
      payload: {
        scannedFilesCount,
        foundMediaCount,
        elapsedMs,
      },
    });
  }
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

async function parseMediaFile(
  filePath: string,
  mediaType: 'audio' | 'video',
  options: ScanOptions
): Promise<Partial<Track> | null> {
  const stats = await fs.promises.stat(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const fileName = path.basename(filePath);
  let driveLetter = 'C:';
  if (process.platform === 'win32') {
    driveLetter = path.parse(filePath).root.replace(/[\\/]/g, '') || 'C:';
  } else if (filePath.startsWith('/Volumes/')) {
    const parts = filePath.split('/');
    driveLetter = parts.slice(0, 3).join('/');
  } else {
    driveLetter = '/';
  }

  let title = path.basename(filePath, path.extname(filePath));
  let artist = 'Unknown Artist';
  let album = 'Unknown Album';
  let albumArtist: string | undefined;
  let genre: string | undefined;
  let year: number | undefined;
  let trackNumber: number | undefined;
  let discNumber: number | undefined;
  let duration = 0;
  let bitrate: number | undefined;
  let sampleRate: number | undefined;
  let bpm: number | undefined;
  let musicalKey: string | undefined;
  let camelotKey: string | undefined;
  let coverArtPath: string | undefined;
  let waveformData: number[] | undefined;

  try {
    const metadata = await parseFile(filePath, { duration: true, skipCovers: false });
    const { common, format } = metadata;

    if (common.title) title = common.title.trim();
    if (common.artist) artist = common.artist.trim();
    if (common.album) album = common.album.trim();
    if (common.albumartist) albumArtist = common.albumartist.trim();
    if (common.genre && common.genre.length > 0) genre = common.genre.join(', ');
    if (common.year) year = common.year;
    if (common.track?.no) trackNumber = common.track.no;
    if (common.disk?.no) discNumber = common.disk.no;
    if (common.bpm) bpm = Number(common.bpm);

    if (common.key) {
      const parsed = parseKey(common.key);
      if (parsed) {
        musicalKey = parsed.musicalKey;
        camelotKey = parsed.camelot;
      }
    }

    if (format.duration) duration = format.duration;
    if (format.bitrate) bitrate = Math.round(format.bitrate / 1000);
    if (format.sampleRate) sampleRate = format.sampleRate;

    // Extract & cache cover art
    if (common.picture && common.picture.length > 0 && options.cacheDir) {
      const pic = common.picture[0];
      const hash = crypto.createHash('md5').update(pic.data).digest('hex');
      const extName = pic.format?.includes('png') ? '.png' : '.jpg';
      const cachedFile = path.join(options.cacheDir, `${hash}${extName}`);

      if (!fs.existsSync(cachedFile)) {
        await fs.promises.writeFile(cachedFile, pic.data);
      }
      coverArtPath = cachedFile;
    }

    // Fallback to directory cover art (folder.jpg, cover.jpg, etc.)
    if (!coverArtPath) {
      coverArtPath = await findFolderCoverArt(path.dirname(filePath));
    }
  } catch (err) {
    // If music-metadata fails (e.g. video files or raw headers), check folder for thumbnail
    if (!coverArtPath) {
      coverArtPath = await findFolderCoverArt(path.dirname(filePath));
    }
  }

  // Smart SFX / Game Audio Filter: Discard untagged audio under 15 seconds (UI sounds, footsteps, gunshots)
  if (mediaType === 'audio' && duration > 0 && duration < 15) {
    if (artist === 'Unknown Artist' && album === 'Unknown Album') {
      return null;
    }
  }

  // Waveform peak extraction (for audio files)
  if (mediaType === 'audio' && options.generateWaveforms) {
    try {
      waveformData = await extractWaveformPeaks(filePath, 128);
    } catch {}
  }

  return {
    file_path: filePath,
    drive_letter: driveLetter,
    file_name: fileName,
    title,
    artist,
    album,
    album_artist: albumArtist,
    genre,
    year,
    track_number: trackNumber,
    disc_number: discNumber,
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
  };
}
