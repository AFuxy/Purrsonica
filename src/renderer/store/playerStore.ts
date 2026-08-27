import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '../../shared/types.js';

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0.0 - 1.0
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  queue: Track[];
  history: Track[];
  isVideoModalOpen: boolean;
  isRightSidebarOpen: boolean;

  // Actions
  setTrack: (track: Track, newQueue?: Track[]) => void;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  setVideoModalOpen: (open: boolean) => void;
  toggleRightSidebar: () => void;
  updateCurrentTrackMetadata: (updated: Partial<Track>) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  isShuffle: false,
  repeatMode: 'off',
  queue: [],
  history: [],
  isVideoModalOpen: false,
  isRightSidebarOpen: false,

  setTrack: (track: Track, newQueue?: Track[]) => {
    const state = get();
    const history = state.currentTrack
      ? [state.currentTrack, ...state.history.slice(0, 50)]
      : state.history;

    let queue = state.queue;
    if (newQueue) {
      // Set queue to remaining tracks after the selected one
      const index = newQueue.findIndex((t) => t.id === track.id);
      if (index !== -1) {
        queue = newQueue.slice(index + 1);
      } else {
        queue = newQueue;
      }
    }

    set({
      currentTrack: track,
      duration: track.duration || 0,
      currentTime: 0,
      isPlaying: true,
      queue,
      history,
      isVideoModalOpen: track.media_type === 'video',
    });

    if (window.api) {
      window.api.incrementPlayCount(track.id);
    }
  },

  playTrack: (track: Track) => {
    get().setTrack(track);
  },

  togglePlay: () => {
    const { currentTrack, isPlaying } = get();
    if (!currentTrack) return;
    set({ isPlaying: !isPlaying });
  },

  setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),

  setCurrentTime: (currentTime: number) => set({ currentTime }),

  setDuration: (duration: number) => set({ duration }),

  setVolume: (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    const { isMuted } = get();
    set({ isMuted: !isMuted });
  },

  toggleShuffle: () => {
    const { isShuffle, queue } = get();
    const nextShuffle = !isShuffle;

    if (nextShuffle && queue.length > 1) {
      // Shuffle existing queue
      const shuffled = [...queue].sort(() => Math.random() - 0.5);
      set({ isShuffle: true, queue: shuffled });
    } else {
      set({ isShuffle: nextShuffle });
    }
  },

  cycleRepeat: () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIdx = modes.indexOf(get().repeatMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    set({ repeatMode: nextMode });
  },

  playNext: () => {
    const { queue, repeatMode, currentTrack, history } = get();

    if (repeatMode === 'one' && currentTrack) {
      set({ currentTime: 0, isPlaying: true });
      return;
    }

    if (queue.length > 0) {
      const nextTrack = queue[0];
      const nextQueue = queue.slice(1);
      const nextHistory = currentTrack ? [currentTrack, ...history] : history;

      set({
        currentTrack: nextTrack,
        queue: nextQueue,
        history: nextHistory,
        currentTime: 0,
        isPlaying: true,
        isVideoModalOpen: nextTrack.media_type === 'video',
      });

      if (window.api) {
        window.api.incrementPlayCount(nextTrack.id);
      }
    } else if (repeatMode === 'all' && history.length > 0) {
      // Loop back history as queue
      const reversedHistory = [...history].reverse();
      const first = reversedHistory[0];
      const rest = reversedHistory.slice(1);

      set({
        currentTrack: first,
        queue: rest,
        history: [],
        currentTime: 0,
        isPlaying: true,
      });
    } else {
      set({ isPlaying: false });
    }
  },

  playPrevious: () => {
    const { currentTime, history, currentTrack, queue } = get();

    // If played more than 3 seconds, replay from start of track
    if (currentTime > 3 || history.length === 0) {
      set({ currentTime: 0 });
      return;
    }

    const prevTrack = history[0];
    const newHistory = history.slice(1);
    const newQueue = currentTrack ? [currentTrack, ...queue] : queue;

    set({
      currentTrack: prevTrack,
      history: newHistory,
      queue: newQueue,
      currentTime: 0,
      isPlaying: true,
      isVideoModalOpen: prevTrack.media_type === 'video',
    });
  },

  addToQueue: (track: Track) => {
    set((state) => ({ queue: [...state.queue, track] }));
  },

  removeFromQueue: (index: number) => {
    set((state) => ({
      queue: state.queue.filter((_, i) => i !== index),
    }));
  },

  clearQueue: () => set({ queue: [] }),

  reorderQueue: (startIndex: number, endIndex: number) => {
    set((state) => {
      const result = Array.from(state.queue);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { queue: result };
    });
  },

  setVideoModalOpen: (isVideoModalOpen: boolean) => set({ isVideoModalOpen }),

  toggleRightSidebar: () => set((state) => ({ isRightSidebarOpen: !state.isRightSidebarOpen })),

  updateCurrentTrackMetadata: (updated: Partial<Track>) => {
    set((state) => {
      if (!state.currentTrack || state.currentTrack.id !== updated.id) return state;
      return {
        currentTrack: {
          ...state.currentTrack,
          ...updated,
        },
      };
    });
  },
}),
    {
      name: 'purrsonica_player_session',
      partialize: (state) => ({
        currentTrack: state.currentTrack,
        currentTime: state.currentTime,
        duration: state.duration,
        volume: state.volume,
        isMuted: state.isMuted,
        repeatMode: state.repeatMode,
        isShuffle: state.isShuffle,
        queue: state.queue,
        history: state.history,
      }),
    }
  )
);
