import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '../../shared/types.js';
import { useCompanionStore } from './companionStore.js';

export type RepeatMode = 'off' | 'all' | 'one';

export interface CrossfadeAnimationState {
  isCrossfading: boolean;
  progress: number; // 0.0 to 1.0
  incomingTrack: Track | null;
}

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
  isMiniPlayer: boolean;
  crossfadeState: CrossfadeAnimationState | null;

  // Actions
  setTrack: (track: Track, newQueue?: Track[], forceDesktop?: boolean) => void;
  playTrack: (track: Track, forceDesktop?: boolean) => void;
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
  toggleMiniPlayer: (enable?: boolean) => Promise<void>;
  updateCurrentTrackMetadata: (updated: Partial<Track>) => void;
  updateTrackLikeState: (trackId: string, isLiked: boolean) => void;
  setCrossfadeState: (state: CrossfadeAnimationState | null) => void;
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
  isMiniPlayer: false,
  crossfadeState: null,

  toggleMiniPlayer: async (enable?: boolean) => {
    const currentState = get().isMiniPlayer;
    const nextState = enable !== undefined ? enable : !currentState;
    if (window.api?.setMiniPlayer) {
      await window.api.setMiniPlayer(nextState);
    }
    set({ isMiniPlayer: nextState });
  },

  setTrack: (track: Track, newQueue?: Track[], forceDesktop = false) => {
    const companionStore = useCompanionStore.getState();
    const mobileState = companionStore.mobilePlaybackState;
    const activeDevice = companionStore.devices.find((d) => d.is_active);
    const targetDeviceId = mobileState?.deviceId || activeDevice?.id;

    // Check if phone is in charge:
    // When playbackTarget is 'remote_mobile' or mobile is playing, route playback to mobile phone
    const isMobileInCharge =
      !forceDesktop &&
      Boolean(targetDeviceId) &&
      (companionStore.playbackTarget === 'remote_mobile' ||
        (!get().isPlaying && Boolean(mobileState?.isPlaying)));

    if (isMobileInCharge && targetDeviceId) {
      companionStore.setPlaybackTarget('remote_mobile');
      companionStore.sendRemoteCommand(
        {
          type: 'playTrack',
          trackId: track.id,
          position: 0,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration,
        } as any,
        targetDeviceId
      );

      companionStore.setMobilePlaybackState({
        deviceId: targetDeviceId,
        deviceName: mobileState?.deviceName || activeDevice?.name || 'Mobile Companion',
        trackId: track.id,
        trackTitle: track.title || track.file_name,
        trackArtist: track.artist,
        artist: track.artist,
        album: track.album || undefined,
        duration: track.duration || 0,
        currentTime: 0,
        cover_art_path: track.cover_art_path || undefined,
        isPlaying: true,
        lastReceivedAt: Date.now(),
      });

      // Keep desktop audio silent
      set({ isPlaying: false });

      if (newQueue) {
        const index = newQueue.findIndex((t) => t.id === track.id);
        const queue = index !== -1 ? newQueue.slice(index + 1) : newQueue;
        set({ queue });
      }
      return;
    }

    // Otherwise, playing locally on desktop:
    companionStore.setPlaybackTarget('desktop');
    if (mobileState?.isPlaying) {
      companionStore.sendRemoteCommand({ type: 'pause' }, targetDeviceId);
    }

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
      if (!track.waveform_data) {
        window.api.getTrackById(track.id).then((fullTrack) => {
          if (fullTrack && fullTrack.waveform_data && get().currentTrack?.id === track.id) {
            set({
              currentTrack: {
                ...get().currentTrack!,
                waveform_data: fullTrack.waveform_data,
              },
            });
          }
        }).catch(() => {});
      }
    }
  },

  playTrack: (track: Track, forceDesktop = false) => {
    get().setTrack(track, undefined, forceDesktop);
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
    } else if (repeatMode === 'all') {
      // Loop back entire playback history plus the current track
      const fullHistory = currentTrack ? [currentTrack, ...history] : history;
      if (fullHistory.length > 0) {
        const reversedHistory = [...fullHistory].reverse();
        const first = reversedHistory[0];
        const rest = reversedHistory.slice(1);

        set({
          currentTrack: first,
          queue: rest,
          history: [],
          currentTime: 0,
          isPlaying: true,
          isVideoModalOpen: first.media_type === 'video',
        });

        if (window.api) {
          window.api.incrementPlayCount(first.id);
        }
      } else {
        set({ isPlaying: false, currentTime: 0 });
      }
    } else if (repeatMode === 'one' && currentTrack) {
      set({ currentTime: 0, isPlaying: true });
    } else {
      set({ isPlaying: false, currentTime: 0 });
    }
  },

  playPrevious: () => {
    const { currentTime, history, currentTrack, queue } = get();

    // If played more than 3 seconds, replay from start of current track
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

  updateTrackLikeState: (trackId: string, isLiked: boolean) => {
    set((state) => ({
      currentTrack:
        state.currentTrack?.id === trackId
          ? { ...state.currentTrack, is_liked: isLiked }
          : state.currentTrack,
      queue: state.queue.map((t) => (t.id === trackId ? { ...t, is_liked: isLiked } : t)),
      history: state.history.map((t) => (t.id === trackId ? { ...t, is_liked: isLiked } : t)),
    }));
  },

  setCrossfadeState: (crossfadeState: CrossfadeAnimationState | null) => set({ crossfadeState }),
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
