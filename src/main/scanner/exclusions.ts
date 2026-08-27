import path from 'node:path';

export const DEFAULT_EXCLUDED_DIRECTORY_NAMES = new Set([
  'windows',
  'program files',
  'program files (x86)',
  'programdata',
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '.vscode',
  '.idea',
  '__pycache__',
  '.venv',
  'venv',
  'env',
  'temp',
  'tmp',
  'appdata',
  '$recycle.bin',
  'system volume information',
  'recovery',
  'msocache',
  'perflogs',
  '$windows.~bt',
  '$windows.~ws',
]);

export const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.flac',
  '.wav',
  '.m4a',
  '.aac',
  '.ogg',
  '.opus',
  '.wma',
  '.aiff',
  '.aif',
  '.alac',
  '.ape',
]);

export const SUPPORTED_VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mkv',
  '.webm',
  '.mov',
  '.avi',
  '.wmv',
  '.m4v',
]);

export function shouldExcludeFolder(folderPath: string, customExclusions: string[] = []): boolean {
  const normalized = folderPath.toLowerCase().replace(/\//g, '\\');
  const baseName = path.basename(normalized);

  // Check built-in folder names
  if (DEFAULT_EXCLUDED_DIRECTORY_NAMES.has(baseName)) {
    return true;
  }

  // Check if any segment of the path matches blacklisted directory names
  const segments = normalized.split('\\');
  for (const seg of segments) {
    if (DEFAULT_EXCLUDED_DIRECTORY_NAMES.has(seg)) {
      return true;
    }
  }

  // Check user-defined custom exclusions
  for (const custom of customExclusions) {
    const normCustom = custom.toLowerCase().replace(/\//g, '\\').trim();
    if (normCustom && (normalized === normCustom || normalized.startsWith(normCustom + '\\'))) {
      return true;
    }
  }

  return false;
}

export function getMediaType(filePath: string): 'audio' | 'video' | null {
  const ext = path.extname(filePath).toLowerCase();
  if (SUPPORTED_AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (SUPPORTED_VIDEO_EXTENSIONS.has(ext)) return 'video';
  return null;
}
