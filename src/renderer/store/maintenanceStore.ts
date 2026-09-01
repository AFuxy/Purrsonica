import { create } from 'zustand';
import { analyzeAudioTrack } from '../services/audioAnalyzer.js';
import { useLibraryStore } from './libraryStore.js';

export interface MaintenanceTask {
  isActive: boolean;
  current: number;
  total: number;
  currentTrackTitle?: string;
}

let cancelAnalysisFlag = false;

interface MaintenanceState {
  artworkTask: MaintenanceTask;
  waveformTask: MaintenanceTask;
  audioAnalysisTask: MaintenanceTask;

  // Actions
  setArtworkProgress: (progress: { current: number; total: number; status?: string } | null) => void;
  setWaveformProgress: (progress: { current: number; total: number; status?: string } | null) => void;
  startArtworkRecache: () => Promise<{ updatedCount: number; total: number; cancelled?: boolean }>;
  cancelArtworkRecache: () => Promise<void>;
  startWaveformRecache: () => Promise<{ generatedCount: number; total: number; cancelled?: boolean }>;
  cancelWaveformRecache: () => Promise<void>;
  startAudioAnalysis: (options?: { reanalyzeAll?: boolean }) => Promise<{ analyzedCount: number; total: number; cancelled?: boolean }>;
  cancelAudioAnalysis: () => void;
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
  audioAnalysisTask: {
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

  startAudioAnalysis: async (options = {}) => {
    cancelAnalysisFlag = false;
    set({ audioAnalysisTask: { isActive: true, current: 0, total: 0 } });

    if (!window.api?.queryTracks || !window.api?.updateMetadata) {
      set({ audioAnalysisTask: { isActive: false, current: 0, total: 0 } });
      return { analyzedCount: 0, total: 0 };
    }

    try {
      // Fetch all audio tracks (strictly audio only)
      const res = await window.api.queryTracks({ mediaType: 'audio', limit: 100000 });
      const audioTracks = (res.tracks || []).filter((t: any) => t.media_type === 'audio');

      const targetTracks = options.reanalyzeAll
        ? audioTracks
        : audioTracks.filter((t: any) => !t.bpm || !t.camelot_key);

      const total = targetTracks.length;
      if (total === 0) {
        set({ audioAnalysisTask: { isActive: false, current: 0, total: 0 } });
        return { analyzedCount: 0, total: 0 };
      }

      set({ audioAnalysisTask: { isActive: true, current: 0, total } });

      let analyzedCount = 0;
      for (let i = 0; i < total; i++) {
        if (cancelAnalysisFlag) {
          break;
        }

        const track = targetTracks[i];
        set({
          audioAnalysisTask: {
            isActive: true,
            current: i + 1,
            total,
            currentTrackTitle: track.title || track.file_name,
          },
        });

        try {
          const analysis = await analyzeAudioTrack(track);
          if (analysis && (analysis.bpm > 0 || analysis.camelot_key)) {
            await window.api.updateMetadata({
              id: track.id,
              bpm: analysis.bpm,
              musical_key: analysis.musical_key,
              camelot_key: analysis.camelot_key,
            });
            analyzedCount++;
          }
        } catch (err) {
          console.warn(`Analysis skipped for "${track.title || track.file_name}":`, err);
        }
      }

      const wasCancelled = cancelAnalysisFlag;
      cancelAnalysisFlag = false;
      set({ audioAnalysisTask: { isActive: false, current: 0, total: 0 } });

      // Refresh library tracks so UI reflects updated BPM and keys
      useLibraryStore.getState().refreshAll();

      return { analyzedCount, total, cancelled: wasCancelled };
    } catch (err) {
      set({ audioAnalysisTask: { isActive: false, current: 0, total: 0 } });
      throw err;
    }
  },

  cancelAudioAnalysis: () => {
    cancelAnalysisFlag = true;
    set({ audioAnalysisTask: { isActive: false, current: 0, total: 0 } });
  },
}));
