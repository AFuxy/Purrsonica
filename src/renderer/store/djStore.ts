import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PitchRange = 4 | 8 | 16 | 50;

export interface HotCueData {
  [cueNumber: number]: number; // cueNumber (1..4) -> time in seconds
}

export interface ActiveLoopData {
  start: number;
  end: number;
  beats: number; // e.g. 0.5, 1, 2, 4, 8, 16, 32
}

interface DjState {
  // Pitch & Tempo
  pitchPercent: number; // e.g. -8.0 to +8.0
  pitchRange: PitchRange; // 4, 8, 16, or 50
  pitchBend: number; // Temporary momentary offset (e.g. -2 or +2 while nudging)
  isMasterTempo: boolean; // Key lock: true = preserve key via time-stretching, false = vinyl pitch
  isDeckExpanded: boolean; // Docked DJ Performance panel open/closed

  // Beat Looper
  activeLoop: ActiveLoopData | null;
  manualLoopIn: number | null;

  // Hot Cues: trackId -> { 1: sec, 2: sec, 3: sec, 4: sec }
  hotCues: Record<string, HotCueData>;

  // Primary Pioneer CDJ Main Cue: trackId -> timestamp in seconds
  mainCues: Record<string, number>;

  // Tap Tempo state
  tapTimestamps: number[];
  tappedBpm: number | null;

  // Actions
  setPitchPercent: (percent: number) => void;
  setPitchRange: (range: PitchRange) => void;
  setPitchBend: (bend: number) => void;
  toggleMasterTempo: () => void;
  resetPitch: () => void;
  syncBpmToTarget: (targetBpm: number, trackBpm: number) => boolean;
  toggleDeckExpanded: (enable?: boolean) => void;

  // Looper Actions
  setBeatLoop: (beats: number, currentPos: number, bpm: number | null, duration: number) => void;
  exitLoop: () => void;
  setManualIn: (currentPos: number) => void;
  setManualOut: (currentPos: number) => void;
  halveLoop: () => void;
  doubleLoop: (duration: number) => void;

  // Hot Cue Actions
  setHotCue: (trackId: string, cueNumber: 1 | 2 | 3 | 4, time: number) => void;
  clearHotCue: (trackId: string, cueNumber: 1 | 2 | 3 | 4) => void;
  clearAllHotCues: (trackId: string) => void;
  getTrackHotCues: (trackId: string) => HotCueData;

  // Pioneer CDJ Main Cue Actions
  setMainCue: (trackId: string, time: number) => void;
  clearMainCue: (trackId: string) => void;
  getMainCue: (trackId: string) => number | null;

  // Tap-Tempo Actions
  registerTap: () => number | null;
  resetTap: () => void;
}

export const CUE_COLORS: Record<1 | 2 | 3 | 4, { hex: string; bg: string; text: string; border: string; glow: string }> = {
  1: {
    hex: '#ef4444',
    bg: 'bg-red-500',
    text: 'text-red-400',
    border: 'border-red-500/40',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.45)]',
  },
  2: {
    hex: '#10b981',
    bg: 'bg-emerald-500',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.45)]',
  },
  3: {
    hex: '#06b6d4',
    bg: 'bg-cyan-500',
    text: 'text-cyan-400',
    border: 'border-cyan-500/40',
    glow: 'shadow-[0_0_12px_rgba(6,182,212,0.45)]',
  },
  4: {
    hex: '#f59e0b',
    bg: 'bg-amber-500',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.45)]',
  },
};

export const useDjStore = create<DjState>()(
  persist(
    (set, get) => ({
      pitchPercent: 0,
      pitchRange: 8,
      pitchBend: 0,
      isMasterTempo: true,
      isDeckExpanded: false,
      activeLoop: null,
      manualLoopIn: null,
      hotCues: {},
      mainCues: {},
      tapTimestamps: [],
      tappedBpm: null,

      setPitchPercent: (percent: number) => {
        const range = get().pitchRange;
        const clamped = Math.min(range, Math.max(-range, Number(percent.toFixed(2))));
        set({ pitchPercent: clamped });
      },

      setPitchRange: (range: PitchRange) => {
        const current = get().pitchPercent;
        const clamped = Math.min(range, Math.max(-range, current));
        set({ pitchRange: range, pitchPercent: clamped });
      },

      setPitchBend: (bend: number) => {
        set({ pitchBend: bend });
      },

      toggleMasterTempo: () => {
        set((state) => ({ isMasterTempo: !state.isMasterTempo }));
      },

      resetPitch: () => {
        set({ pitchPercent: 0, pitchBend: 0 });
      },

      syncBpmToTarget: (targetBpm: number, trackBpm: number) => {
        if (!targetBpm || !trackBpm || targetBpm <= 0 || trackBpm <= 0) return false;

        const rawPercent = ((targetBpm / trackBpm) - 1) * 100;
        const absPercent = Math.abs(rawPercent);

        let requiredRange: PitchRange = 8;
        if (absPercent <= 4) requiredRange = 4;
        else if (absPercent <= 8) requiredRange = 8;
        else if (absPercent <= 16) requiredRange = 16;
        else requiredRange = 50;

        const clampedPercent = Math.min(50, Math.max(-50, Number(rawPercent.toFixed(2))));

        set({
          pitchRange: requiredRange,
          pitchPercent: clampedPercent,
          pitchBend: 0,
        });
        return true;
      },

      toggleDeckExpanded: (enable?: boolean) => {
        set((state) => ({
          isDeckExpanded: enable !== undefined ? enable : !state.isDeckExpanded,
        }));
      },

      setBeatLoop: (beats: number, currentPos: number, bpm: number | null, duration: number) => {
        const currentLoop = get().activeLoop;
        if (currentLoop && currentLoop.beats === beats) {
          set({ activeLoop: null, manualLoopIn: null });
          return;
        }

        const effectiveBpm = bpm && bpm > 0 ? bpm : 120;
        const beatDuration = 60 / effectiveBpm;
        const loopLength = beats * beatDuration;
        const start = Math.max(0, currentPos);
        const end = Math.min(duration || 99999, start + loopLength);

        set({
          activeLoop: {
            start: Number(start.toFixed(3)),
            end: Number(end.toFixed(3)),
            beats,
          },
          manualLoopIn: start,
        });
      },

      exitLoop: () => {
        set({ activeLoop: null, manualLoopIn: null });
      },

      setManualIn: (currentPos: number) => {
        set({ manualLoopIn: Math.max(0, Number(currentPos.toFixed(3))) });
      },

      setManualOut: (currentPos: number) => {
        const start = get().manualLoopIn;
        if (start === null || currentPos <= start) return;
        set({
          activeLoop: {
            start,
            end: Number(currentPos.toFixed(3)),
            beats: 0,
          },
        });
      },

      halveLoop: () => {
        const loop = get().activeLoop;
        if (!loop) return;
        const currentLength = loop.end - loop.start;
        const newLength = currentLength / 2;
        if (newLength < 0.05) return;
        set({
          activeLoop: {
            start: loop.start,
            end: Number((loop.start + newLength).toFixed(3)),
            beats: loop.beats > 0 ? loop.beats / 2 : 0,
          },
        });
      },

      doubleLoop: (duration: number) => {
        const loop = get().activeLoop;
        if (!loop) return;
        const currentLength = loop.end - loop.start;
        const newLength = currentLength * 2;
        const newEnd = Math.min(duration || 99999, loop.start + newLength);
        set({
          activeLoop: {
            start: loop.start,
            end: Number(newEnd.toFixed(3)),
            beats: loop.beats > 0 ? loop.beats * 2 : 0,
          },
        });
      },

      setHotCue: (trackId: string, cueNumber: 1 | 2 | 3 | 4, time: number) => {
        if (!trackId || isNaN(time) || time < 0) return;
        set((state) => ({
          hotCues: {
            ...state.hotCues,
            [trackId]: {
              ...(state.hotCues[trackId] || {}),
              [cueNumber]: Number(time.toFixed(2)),
            },
          },
        }));
      },

      clearHotCue: (trackId: string, cueNumber: 1 | 2 | 3 | 4) => {
        if (!trackId) return;
        set((state) => {
          const trackCues = { ...(state.hotCues[trackId] || {}) };
          delete trackCues[cueNumber];
          return {
            hotCues: {
              ...state.hotCues,
              [trackId]: trackCues,
            },
          };
        });
      },

      clearAllHotCues: (trackId: string) => {
        if (!trackId) return;
        set((state) => {
          const updated = { ...state.hotCues };
          delete updated[trackId];
          return { hotCues: updated };
        });
      },

      getTrackHotCues: (trackId: string) => {
        if (!trackId) return {};
        return get().hotCues[trackId] || {};
      },

      setMainCue: (trackId: string, time: number) => {
        if (!trackId) return;
        set((state) => ({
          mainCues: {
            ...state.mainCues,
            [trackId]: Math.max(0, Number(time.toFixed(2))),
          },
        }));
      },

      clearMainCue: (trackId: string) => {
        if (!trackId) return;
        set((state) => {
          const updated = { ...state.mainCues };
          delete updated[trackId];
          return { mainCues: updated };
        });
      },

      getMainCue: (trackId: string) => {
        if (!trackId) return null;
        return get().mainCues[trackId] ?? null;
      },

      registerTap: () => {
        const now = Date.now();
        const existing = get().tapTimestamps;

        // If last tap was more than 2.5 seconds ago, start fresh sequence
        let newTimestamps: number[];
        if (existing.length === 0 || now - existing[existing.length - 1] > 2500) {
          newTimestamps = [now];
        } else {
          // Keep last 10 taps for a smooth moving average
          newTimestamps = [...existing.slice(-9), now];
        }

        let calculatedBpm: number | null = null;
        if (newTimestamps.length >= 2) {
          const intervals: number[] = [];
          for (let i = 1; i < newTimestamps.length; i++) {
            intervals.push(newTimestamps[i] - newTimestamps[i - 1]);
          }

          const avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          if (avgIntervalMs > 0) {
            calculatedBpm = Number((60000 / avgIntervalMs).toFixed(1));
          }
        }

        set({
          tapTimestamps: newTimestamps,
          tappedBpm: calculatedBpm,
        });

        return calculatedBpm;
      },

      resetTap: () => {
        set({ tapTimestamps: [], tappedBpm: null });
      },
    }),
    {
      name: 'purrsonica:dj_deck_store',
      partialize: (state) => ({
        pitchRange: state.pitchRange,
        isMasterTempo: state.isMasterTempo,
        isDeckExpanded: state.isDeckExpanded,
        hotCues: state.hotCues,
        mainCues: state.mainCues,
      }),
    }
  )
);
