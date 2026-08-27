import { create } from 'zustand';

export interface MaintenanceTask {
  isActive: boolean;
  current: number;
  total: number;
}

interface MaintenanceState {
  artworkTask: MaintenanceTask;
  waveformTask: MaintenanceTask;

  // Actions
  setArtworkProgress: (progress: { current: number; total: number; status?: string } | null) => void;
  setWaveformProgress: (progress: { current: number; total: number; status?: string } | null) => void;
  startArtworkRecache: () => Promise<{ updatedCount: number; total: number; cancelled?: boolean }>;
  cancelArtworkRecache: () => Promise<void>;
  startWaveformRecache: () => Promise<{ generatedCount: number; total: number; cancelled?: boolean }>;
  cancelWaveformRecache: () => Promise<void>;
}

export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  artworkTask: {
    isActive: false,
    current: 0,
    total: 0,
  },
  waveformTask: {
    isActive: false,
    current: 0,
    total: 0,
  },

  setArtworkProgress: (progress) => {
    if (!progress || progress.status === 'completed' || progress.status === 'cancelled') {
      set({ artworkTask: { isActive: false, current: 0, total: 0 } });
    } else {
      set({
        artworkTask: {
          isActive: true,
          current: progress.current,
          total: progress.total,
        },
      });
    }
  },

  setWaveformProgress: (progress) => {
    if (!progress || progress.status === 'completed' || progress.status === 'cancelled') {
      set({ waveformTask: { isActive: false, current: 0, total: 0 } });
    } else {
      set({
        waveformTask: {
          isActive: true,
          current: progress.current,
          total: progress.total,
        },
      });
    }
  },

  startArtworkRecache: async () => {
    set({ artworkTask: { isActive: true, current: 0, total: 0 } });
    if (!window.api?.recacheArtwork) return { updatedCount: 0, total: 0 };
    try {
      const res = await window.api.recacheArtwork();
      set({ artworkTask: { isActive: false, current: 0, total: 0 } });
      return res;
    } catch (err) {
      set({ artworkTask: { isActive: false, current: 0, total: 0 } });
      throw err;
    }
  },

  cancelArtworkRecache: async () => {
    if (window.api?.cancelRecacheArtwork) {
      await window.api.cancelRecacheArtwork();
    }
    set({ artworkTask: { isActive: false, current: 0, total: 0 } });
  },

  startWaveformRecache: async () => {
    set({ waveformTask: { isActive: true, current: 0, total: 0 } });
    if (!window.api?.recacheWaveforms) return { generatedCount: 0, total: 0 };
    try {
      const res = await window.api.recacheWaveforms();
      set({ waveformTask: { isActive: false, current: 0, total: 0 } });
      return res;
    } catch (err) {
      set({ waveformTask: { isActive: false, current: 0, total: 0 } });
      throw err;
    }
  },

  cancelWaveformRecache: async () => {
    if (window.api?.cancelRecacheWaveforms) {
      await window.api.cancelRecacheWaveforms();
    }
    set({ waveformTask: { isActive: false, current: 0, total: 0 } });
  },
}));
