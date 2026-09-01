import { Track } from '../../shared/types.js';

export type HarmonicMode = 'neighbors' | 'exact' | 'energy' | 'all';

export interface HarmonicKeyMatch {
  key: string;
  type: 'exact' | 'energy_up' | 'energy_down' | 'relative' | 'energy_boost' | 'any';
  label: string;
  badgeColor: string;
}

export interface BpmMatchResult {
  matches: boolean;
  diffPercent: number;
  matchType: 'exact' | 'close' | 'halftime' | 'doubletime';
  effectiveBpm: number;
}

export interface MatchedDjTrack {
  track: Track;
  keyMatch: HarmonicKeyMatch | null;
  bpmMatch: BpmMatchResult | null;
  matchScore: number; // Higher is better
}

/**
 * Returns compatible Camelot keys according to standard harmonic mixing rules
 */
export function getCompatibleCamelotKeys(
  camelotKey?: string | null,
  mode: HarmonicMode = 'neighbors'
): HarmonicKeyMatch[] {
  if (!camelotKey) return [];
  const match = camelotKey.trim().toUpperCase().match(/^(\d{1,2})([AB])$/);
  if (!match) return [];

  const num = parseInt(match[1], 10);
  const letter = match[2] as 'A' | 'B';
  const otherLetter = letter === 'A' ? 'B' : 'A';

  const stepUp = (num % 12) + 1;
  const stepDown = num - 1 <= 0 ? 12 : num - 1;
  const boostUp = ((num + 1) % 12) + 1;

  if (mode === 'exact') {
    return [
      { key: `${num}${letter}`, type: 'exact', label: 'Exact Key', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    ];
  }

  if (mode === 'energy') {
    return [
      { key: `${num}${letter}`, type: 'exact', label: 'Exact Key', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
      { key: `${stepUp}${letter}`, type: 'energy_up', label: '+1 Energy Up', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
      { key: `${boostUp}${letter}`, type: 'energy_boost', label: '+2 Energy Boost', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
    ];
  }

  if (mode === 'all') {
    // Return all 24 keys
    const allKeys: HarmonicKeyMatch[] = [];
    for (let i = 1; i <= 12; i++) {
      allKeys.push({ key: `${i}A`, type: 'any', label: `${i}A`, badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40' });
      allKeys.push({ key: `${i}B`, type: 'any', label: `${i}B`, badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' });
    }
    return allKeys;
  }

  // Default 'neighbors' (Standard DJ Camelot wheel compatibility: Same, ±1 Hour, Relative)
  return [
    { key: `${num}${letter}`, type: 'exact', label: 'Exact Key', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { key: `${stepUp}${letter}`, type: 'energy_up', label: '+1h Energy Up', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { key: `${stepDown}${letter}`, type: 'energy_down', label: '-1h Energy Down', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { key: `${num}${otherLetter}`, type: 'relative', label: 'Relative Major/Minor', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  ];
}

/**
 * Checks if a track's BPM matches within a percentage tolerance window, with optional half-time / double-time matching
 */
export function checkBpmMatch(
  trackBpm: number | undefined | null,
  targetBpm: number,
  tolerancePercent: number = 5,
  allowHalfDoubleTime: boolean = true
): BpmMatchResult {
  if (!trackBpm || trackBpm <= 0 || !targetBpm || targetBpm <= 0) {
    return { matches: false, diffPercent: 0, matchType: 'close', effectiveBpm: 0 };
  }

  // 1. Direct BPM window
  const directDiff = Math.abs(trackBpm - targetBpm);
  const directDiffPercent = (directDiff / targetBpm) * 100;
  if (directDiffPercent <= tolerancePercent) {
    return {
      matches: true,
      diffPercent: Number(((trackBpm - targetBpm) / targetBpm * 100).toFixed(1)),
      matchType: directDiffPercent < 0.1 ? 'exact' : 'close',
      effectiveBpm: trackBpm,
    };
  }

  // 2. Half-time & Double-time (e.g. 70 BPM <=> 140 BPM)
  if (allowHalfDoubleTime) {
    // Half target (track is ~70 BPM, target is 140 BPM)
    const halfTarget = targetBpm / 2;
    const halfDiff = Math.abs(trackBpm - halfTarget);
    if ((halfDiff / halfTarget) * 100 <= tolerancePercent) {
      return {
        matches: true,
        diffPercent: Number(((trackBpm - halfTarget) / halfTarget * 100).toFixed(1)),
        matchType: 'halftime',
        effectiveBpm: trackBpm * 2,
      };
    }

    // Double target (track is ~140 BPM, target is 70 BPM)
    const doubleTarget = targetBpm * 2;
    const doubleDiff = Math.abs(trackBpm - doubleTarget);
    if ((doubleDiff / doubleTarget) * 100 <= tolerancePercent) {
      return {
        matches: true,
        diffPercent: Number(((trackBpm - doubleTarget) / doubleTarget * 100).toFixed(1)),
        matchType: 'doubletime',
        effectiveBpm: trackBpm / 2,
      };
    }
  }

  return {
    matches: false,
    diffPercent: Number(((trackBpm - targetBpm) / targetBpm * 100).toFixed(1)),
    matchType: 'close',
    effectiveBpm: trackBpm,
  };
}

/**
 * Filters and ranks library tracks based on harmonic key and BPM compatibility
 */
export function findHarmonicMatches(
  tracks: Track[],
  anchorKey: string | null | undefined,
  anchorBpm: number | null | undefined,
  options: {
    harmonicMode: HarmonicMode;
    bpmTolerancePercent: number; // 0 to 20, or -1 for any
    allowHalfDoubleTime: boolean;
    ignoreSameTrackId?: string;
    searchQuery?: string;
  }
): MatchedDjTrack[] {
  const {
    harmonicMode,
    bpmTolerancePercent,
    allowHalfDoubleTime,
    ignoreSameTrackId,
    searchQuery = '',
  } = options;

  const compatibleKeys = anchorKey ? getCompatibleCamelotKeys(anchorKey, harmonicMode) : [];
  const keyMap = new Map<string, HarmonicKeyMatch>();
  compatibleKeys.forEach((k) => keyMap.set(k.key.toUpperCase(), k));

  const queryLower = searchQuery.trim().toLowerCase();

  const results: MatchedDjTrack[] = [];

  for (const track of tracks) {
    if (track.media_type === 'video') continue;
    if (ignoreSameTrackId && track.id === ignoreSameTrackId) continue;

    // Text search filter
    if (queryLower) {
      const matchText = (track.title || '') + ' ' + (track.artist || '') + ' ' + (track.album || '') + ' ' + (track.file_name || '');
      if (!matchText.toLowerCase().includes(queryLower)) {
        continue;
      }
    }

    // Key match check
    let keyMatch: HarmonicKeyMatch | null = null;
    if (anchorKey && harmonicMode !== 'all') {
      const trackKey = track.camelot_key ? track.camelot_key.trim().toUpperCase() : null;
      if (!trackKey || !keyMap.has(trackKey)) {
        continue;
      }
      keyMatch = keyMap.get(trackKey)!;
    } else if (track.camelot_key) {
      keyMatch = {
        key: track.camelot_key,
        type: 'any',
        label: track.camelot_key,
        badgeColor: 'bg-neutral-800 text-neutral-300 border-neutral-700',
      };
    }

    // BPM match check
    let bpmMatch: BpmMatchResult | null = null;
    if (anchorBpm && anchorBpm > 0 && bpmTolerancePercent >= 0) {
      bpmMatch = checkBpmMatch(track.bpm, anchorBpm, bpmTolerancePercent, allowHalfDoubleTime);
      if (!bpmMatch.matches) {
        continue;
      }
    } else if (track.bpm && anchorBpm && anchorBpm > 0) {
      bpmMatch = checkBpmMatch(track.bpm, anchorBpm, 100, allowHalfDoubleTime);
    }

    // Calculate ranking score (100 = perfect match)
    let score = 50;
    if (keyMatch) {
      if (keyMatch.type === 'exact') score += 40;
      else if (keyMatch.type === 'energy_up' || keyMatch.type === 'energy_down') score += 30;
      else if (keyMatch.type === 'relative') score += 25;
      else if (keyMatch.type === 'energy_boost') score += 20;
    }

    if (bpmMatch && bpmMatch.matches) {
      const diffPenalty = Math.min(25, Math.abs(bpmMatch.diffPercent) * 2);
      score += (25 - diffPenalty);
      if (bpmMatch.matchType === 'exact') score += 10;
    }

    results.push({
      track,
      keyMatch,
      bpmMatch,
      matchScore: score,
    });
  }

  // Sort by highest score first, then smallest BPM delta
  results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    const aDiff = a.bpmMatch ? Math.abs(a.bpmMatch.diffPercent) : 999;
    const bDiff = b.bpmMatch ? Math.abs(b.bpmMatch.diffPercent) : 999;
    return aDiff - bDiff;
  });

  return results;
}
