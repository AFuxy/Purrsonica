import { CamelotKeyInfo } from './types.js';

export interface CamelotMapping {
  camelot: string;
  musicalKey: string;
  aliases: string[];
  isMinor: boolean;
  openKey: string;
}

export const CAMELOT_WHEEL: CamelotMapping[] = [
  // Minor Keys (A)
  { camelot: '1A', musicalKey: 'Ab Minor', aliases: ['abm', 'ab minor', 'g#m', 'g# minor', 'g sharp minor', 'a flat minor'], isMinor: true, openKey: '1m' },
  { camelot: '2A', musicalKey: 'Eb Minor', aliases: ['ebm', 'eb minor', 'd#m', 'd# minor', 'd sharp minor', 'e flat minor'], isMinor: true, openKey: '2m' },
  { camelot: '3A', musicalKey: 'Bb Minor', aliases: ['bbm', 'bb minor', 'a#m', 'a# minor', 'a sharp minor', 'b flat minor'], isMinor: true, openKey: '3m' },
  { camelot: '4A', musicalKey: 'F Minor', aliases: ['fm', 'f minor'], isMinor: true, openKey: '4m' },
  { camelot: '5A', musicalKey: 'C Minor', aliases: ['cm', 'c minor'], isMinor: true, openKey: '5m' },
  { camelot: '6A', musicalKey: 'G Minor', aliases: ['gm', 'g minor'], isMinor: true, openKey: '6m' },
  { camelot: '7A', musicalKey: 'D Minor', aliases: ['dm', 'd minor'], isMinor: true, openKey: '7m' },
  { camelot: '8A', musicalKey: 'A Minor', aliases: ['am', 'a minor'], isMinor: true, openKey: '8m' },
  { camelot: '9A', musicalKey: 'E Minor', aliases: ['em', 'e minor'], isMinor: true, openKey: '9m' },
  { camelot: '10A', musicalKey: 'B Minor', aliases: ['bm', 'b minor'], isMinor: true, openKey: '10m' },
  { camelot: '11A', musicalKey: 'F# Minor', aliases: ['f#m', 'f# minor', 'gbm', 'gb minor', 'f sharp minor', 'g flat minor'], isMinor: true, openKey: '11m' },
  { camelot: '12A', musicalKey: 'C# Minor', aliases: ['c#m', 'c# minor', 'dbm', 'db minor', 'c sharp minor', 'd flat minor'], isMinor: true, openKey: '12m' },

  // Major Keys (B)
  { camelot: '1B', musicalKey: 'B Major', aliases: ['b', 'b maj', 'b major', 'cb', 'cb major'], isMinor: false, openKey: '1d' },
  { camelot: '2B', musicalKey: 'F# Major', aliases: ['f#', 'f# maj', 'f# major', 'gb', 'gb maj', 'gb major', 'f sharp major', 'g flat major'], isMinor: false, openKey: '2d' },
  { camelot: '3B', musicalKey: 'Db Major', aliases: ['db', 'db maj', 'db major', 'c#', 'c# maj', 'c# major', 'd flat major', 'c sharp major'], isMinor: false, openKey: '3d' },
  { camelot: '4B', musicalKey: 'Ab Major', aliases: ['ab', 'ab maj', 'ab major', 'g#', 'g# maj', 'g# major', 'a flat major', 'g sharp major'], isMinor: false, openKey: '4d' },
  { camelot: '5B', musicalKey: 'Eb Major', aliases: ['eb', 'eb maj', 'eb major', 'd#', 'd# maj', 'd# major', 'e flat major', 'd sharp major'], isMinor: false, openKey: '5d' },
  { camelot: '6B', musicalKey: 'Bb Major', aliases: ['bb', 'bb maj', 'bb major', 'a#', 'a# maj', 'a# major', 'b flat major', 'a sharp major'], isMinor: false, openKey: '6d' },
  { camelot: '7B', musicalKey: 'F Major', aliases: ['f', 'f maj', 'f major'], isMinor: false, openKey: '7d' },
  { camelot: '8B', musicalKey: 'C Major', aliases: ['c', 'c maj', 'c major'], isMinor: false, openKey: '8d' },
  { camelot: '9B', musicalKey: 'G Major', aliases: ['g', 'g maj', 'g major'], isMinor: false, openKey: '9d' },
  { camelot: '10B', musicalKey: 'D Major', aliases: ['d', 'd maj', 'd major'], isMinor: false, openKey: '10d' },
  { camelot: '11B', musicalKey: 'A Major', aliases: ['a', 'a maj', 'a major'], isMinor: false, openKey: '11d' },
  { camelot: '12B', musicalKey: 'E Major', aliases: ['e', 'e maj', 'e major'], isMinor: false, openKey: '12d' },
];

/**
 * Normalizes any key input (Camelot code or standard musical key) into a complete CamelotKeyInfo
 */
export function parseKey(input?: string | null): CamelotKeyInfo | null {
  if (!input || !input.trim()) return null;
  const clean = input.trim().toLowerCase();

  // 1. Direct Camelot code match (e.g. "8A", "11B", "8a")
  const directCamelot = CAMELOT_WHEEL.find(
    (item) => item.camelot.toLowerCase() === clean
  );
  if (directCamelot) {
    return createKeyInfo(directCamelot);
  }

  // 2. OpenKey code match (e.g. "1m", "8d")
  const openKeyMatch = CAMELOT_WHEEL.find(
    (item) => item.openKey.toLowerCase() === clean
  );
  if (openKeyMatch) {
    return createKeyInfo(openKeyMatch);
  }

  // 3. Exact musicalKey or alias match
  const aliasMatch = CAMELOT_WHEEL.find(
    (item) =>
      item.musicalKey.toLowerCase() === clean ||
      item.aliases.includes(clean)
  );
  if (aliasMatch) {
    return createKeyInfo(aliasMatch);
  }

  // 4. Fuzzy fallback match (strip spaces, symbols)
  const stripped = clean.replace(/[^a-z0-9#]/g, '');
  const fuzzy = CAMELOT_WHEEL.find(
    (item) =>
      item.camelot.toLowerCase() === stripped ||
      item.aliases.some((a) => a.replace(/[^a-z0-9#]/g, '') === stripped)
  );
  if (fuzzy) {
    return createKeyInfo(fuzzy);
  }

  return null;
}

/**
 * Calculates harmonic compatible keys for DJ mixing (same key, ±1 position, and relative major/minor)
 */
export function getHarmonicCompatibleKeys(camelot: string): string[] {
  const match = camelot.match(/^([0-9]{1,2})([ABab])$/i);
  if (!match) return [];

  const num = parseInt(match[1], 10);
  const letter = match[2].toUpperCase(); // 'A' or 'B'
  const otherLetter = letter === 'A' ? 'B' : 'A';

  const prevNum = num === 1 ? 12 : num - 1;
  const nextNum = num === 12 ? 1 : num + 1;

  return [
    `${num}${letter}`,        // Same key
    `${prevNum}${letter}`,    // Energy shift down
    `${nextNum}${letter}`,    // Energy shift up
    `${num}${otherLetter}`,   // Relative Major/Minor
  ];
}

function createKeyInfo(mapping: CamelotMapping): CamelotKeyInfo {
  return {
    camelot: mapping.camelot,
    musicalKey: mapping.musicalKey,
    openKey: mapping.openKey,
    complementaryKeys: getHarmonicCompatibleKeys(mapping.camelot),
  };
}
