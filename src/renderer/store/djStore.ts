import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PitchRange = 4 | 8 | 16 | 50;

export interface HotCueData {
  [cueNumber: number]: number; // cueNumber (1..4) -> time in seconds
}

interface DjState {
  // Pitch & Tempo
  pitchPercent: number; // e.g. -8.0 to +8.0
  pitchRange: PitchRange; // 4, 8, 16, or 50
  pitchBend: number; // Temporary momentary offset (e.g. -2 or +2 while nudging)
  isMasterTempo: boolean; // Key lock: true = preserve key via time-stretching, false = vinyl pitch
  isDeckExpanded: boolean; // Docked DJ Performance panel open/closed

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
  toggleDeckExpanded: (enable?: boolean) => void;

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

      toggleDeckExpanded: (enable?: boolean) => {
        set((state) => ({
          isDeckExpanded: enable !== undefined ? enable : !state.isDeckExpanded,
        }));
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
