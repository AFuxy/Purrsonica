import path from 'node:path';
import fs from 'node:fs';

export const DEFAULT_EXCLUDED_DIRECTORY_NAMES = new Set([
  // Windows & OS Internals
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
  'windowsapps',
  'wsl',

  // Game Stores & Launchers
  'games',
  'steam',
  'steamlibrary',
  'steamapps',
  'epic games',
  'riot games',
  'riot client',
  'gog games',
  'gog galaxy',
  'origin games',
  'electronic arts',
  'ea games',
  'ea desktop',
  'ubisoft',
  'ubisoft game launcher',
  'battle.net',
  'blizzard',
  'xboxgames',
  'oculus',
  'meta quest',

  // Game Engines & Audio Middleware
  'unity',
  'unityplayer',
  'unreal engine',
  'unrealengine',
  'godot',
  'cryengine',
  'sourceengine',
  'soundbanks',
  'soundbank',
  'wwise',
  'fmod',
  'gamemaker',
  'rpgmaker',

  // Popular Game Directories
  'roblox',
  'minecraft',
  'genshin impact',
  'valorant',
  'league of legends',
  'world of warcraft',
  'fortnite',
  'overwatch',
  'steamvr',
]);

// Signature files that mark a folder as a game installation directory
const GAME_SIGNATURE_FILES = [
  'unityplayer.dll',
  'steam_api.dll',
  'steam_api64.dll',
  'fmod.dll',
  'fmodstudio.dll',
  'aksoundengine.dll',
  'bink2w64.dll',
  'binkw32.dll',
  'xinput1_3.dll',
];

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

  // 1. Check built-in folder names
  if (DEFAULT_EXCLUDED_DIRECTORY_NAMES.has(baseName)) {
    return true;
  }

  // 2. Check if any path segment matches blacklisted directory names
  const segments = normalized.split('\\');
  for (const seg of segments) {
    if (DEFAULT_EXCLUDED_DIRECTORY_NAMES.has(seg)) {
      return true;
    }
  }

  // 3. Check user-defined custom exclusions
  for (const custom of customExclusions) {
    const normCustom = custom.toLowerCase().replace(/\//g, '\\').trim();
    if (normCustom && (normalized === normCustom || normalized.startsWith(normCustom + '\\'))) {
      return true;
    }
  }

  // 4. Quick heuristic check: If folder contains game engine DLLs / signature files, skip directory
  try {
    const files = fs.readdirSync(folderPath);
    for (const f of files) {
      if (GAME_SIGNATURE_FILES.includes(f.toLowerCase())) {
        return true;
      }
    }
  } catch {}

  return false;
}

export function getMediaType(filePath: string): 'audio' | 'video' | null {
  const ext = path.extname(filePath).toLowerCase();
  if (SUPPORTED_AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (SUPPORTED_VIDEO_EXTENSIONS.has(ext)) return 'video';
  return null;
}
