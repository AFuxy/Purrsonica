import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '../../shared/types.js';
import { useCompanionStore, registerPlayerStoreSync } from './companionStore.js';

let getLibraryTracksFallback: (() => Track[]) | null = null;
export function registerLibraryTracksFallback(fn: () => Track[]) {
  getLibraryTracksFallback = fn;
}

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

      const state = get();
      const history = state.currentTrack
        ? [state.currentTrack, ...state.history.slice(0, 50)]
        : state.history;

      let queue = state.queue;
      if (newQueue) {
        const index = newQueue.findIndex((t) => t.id === track.id);
        queue = index !== -1 ? newQueue.slice(index + 1) : newQueue;
      } else {
        const index = queue.findIndex((t) => t.id === track.id);
        if (index !== -1) {
          queue = queue.slice(index + 1);
        }
      }

      set({
        currentTrack: track,
        duration: track.duration || 0,
        currentTime: 0,
        isPlaying: false, // Desktop audio stays silent
        queue,
        history,
      });

      if (window.api) {
        window.api.incrementPlayCount(track.id);
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
    const { queue, repeatMode, currentTrack, history, isShuffle } = get();
    const companionStore = useCompanionStore.getState();
    const mobileState = companionStore.mobilePlaybackState;
    const activeDevice = companionStore.devices.find((d) => d.is_active);
    const targetDeviceId = mobileState?.deviceId || activeDevice?.id;
    const isMobileInCharge =
      companionStore.playbackTarget === 'remote_mobile' && Boolean(targetDeviceId);

    let nextTrack: Track | null = null;
    let nextQueue: Track[] = queue;
    let nextHistory: Track[] = currentTrack ? [currentTrack, ...history.slice(0, 50)] : history;

    if (queue.length > 0) {
      nextTrack = queue[0];
      nextQueue = queue.slice(1);
    } else if (repeatMode === 'all') {
      const fullHistory = currentTrack ? [currentTrack, ...history] : history;
      if (fullHistory.length > 0) {
        const reversedHistory = [...fullHistory].reverse();
        nextTrack = reversedHistory[0];
        nextQueue = reversedHistory.slice(1);
        nextHistory = [];
      }
    } else if (repeatMode === 'one' && currentTrack) {
      nextTrack = currentTrack;
    } else {
      // If queue is empty, resolve next track from current active view tracks
      const libTracks = getLibraryTracksFallback?.() || [];
      if (libTracks.length > 0) {
        if (isShuffle) {
          const pool = currentTrack ? libTracks.filter((t) => t.id !== currentTrack.id) : libTracks;
          if (pool.length > 0) {
            nextTrack = pool[Math.floor(Math.random() * pool.length)];
          }
        } else if (currentTrack) {
          const curIdx = libTracks.findIndex((t) => t.id === currentTrack.id);
          if (curIdx !== -1 && curIdx + 1 < libTracks.length) {
            nextTrack = libTracks[curIdx + 1];
            nextQueue = libTracks.slice(curIdx + 2);
          } else if ((repeatMode as string) === 'all') {
            nextTrack = libTracks[0];
            nextQueue = libTracks.slice(1);
          }
        }
      }
    }

    if (nextTrack) {
      if (isMobileInCharge && targetDeviceId) {
        set({
          currentTrack: nextTrack,
          queue: nextQueue,
          history: nextHistory,
          currentTime: 0,
          duration: nextTrack.duration || 0,
          isPlaying: false, // Keep desktop audio silent
        });

        companionStore.sendRemoteCommand(
          {
            type: 'playTrack',
            trackId: nextTrack.id,
            position: 0,
            title: nextTrack.title,
            artist: nextTrack.artist,
            album: nextTrack.album,
            duration: nextTrack.duration,
          } as any,
          targetDeviceId
        );

        companionStore.setMobilePlaybackState({
          deviceId: targetDeviceId,
          deviceName: mobileState?.deviceName || activeDevice?.name || 'Mobile Companion',
          trackId: nextTrack.id,
          trackTitle: nextTrack.title || nextTrack.file_name,
          trackArtist: nextTrack.artist,
          artist: nextTrack.artist,
          album: nextTrack.album || undefined,
          duration: nextTrack.duration || 0,
          currentTime: 0,
          cover_art_path: nextTrack.cover_art_path || undefined,
          isPlaying: true,
          lastReceivedAt: Date.now(),
        });
      } else {
        set({
          currentTrack: nextTrack,
          queue: nextQueue,
          history: nextHistory,
          currentTime: 0,
          duration: nextTrack.duration || 0,
          isPlaying: true,
          isVideoModalOpen: nextTrack.media_type === 'video',
        });
      }

      if (window.api) {
        window.api.incrementPlayCount(nextTrack.id);
      }
    } else {
      if (isMobileInCharge && targetDeviceId) {
        companionStore.sendRemoteCommand({ type: 'pause' }, targetDeviceId);
        if (mobileState) {
          companionStore.setMobilePlaybackState({
            ...mobileState,
            isPlaying: false,
          });
        }
      }
      set({ isPlaying: false, currentTime: 0 });
    }
  },

  playPrevious: () => {
    const { currentTime, history, currentTrack, queue } = get();
    const companionStore = useCompanionStore.getState();
    const mobileState = companionStore.mobilePlaybackState;
    const activeDevice = companionStore.devices.find((d) => d.is_active);
    const targetDeviceId = mobileState?.deviceId || activeDevice?.id;
    const isMobileInCharge =
      companionStore.playbackTarget === 'remote_mobile' && Boolean(targetDeviceId);

    // If played more than 3 seconds, replay from start of current track
    if (currentTime > 3) {
      if (isMobileInCharge && targetDeviceId) {
        companionStore.sendRemoteCommand({ type: 'seek', position: 0 }, targetDeviceId);
      }
      set({ currentTime: 0 });
      return;
    }

    let prevTrack: Track | null = null;
    let nextHistory = history;
    let nextQueue = currentTrack ? [currentTrack, ...queue] : queue;

    if (history.length > 0) {
      prevTrack = history[0];
      nextHistory = history.slice(1);
    } else {
      const libTracks = getLibraryTracksFallback?.() || [];
      if (currentTrack && libTracks.length > 0) {
        const curIdx = libTracks.findIndex((t) => t.id === currentTrack.id);
        if (curIdx > 0) {
          prevTrack = libTracks[curIdx - 1];
        }
      }
    }

    if (prevTrack) {
      if (isMobileInCharge && targetDeviceId) {
        set({
          currentTrack: prevTrack,
          history: nextHistory,
          queue: nextQueue,
          currentTime: 0,
          duration: prevTrack.duration || 0,
          isPlaying: false,
        });

        companionStore.sendRemoteCommand(
          {
            type: 'playTrack',
            trackId: prevTrack.id,
            position: 0,
            title: prevTrack.title,
            artist: prevTrack.artist,
            album: prevTrack.album,
            duration: prevTrack.duration,
          } as any,
          targetDeviceId
        );

        companionStore.setMobilePlaybackState({
          deviceId: targetDeviceId,
          deviceName: mobileState?.deviceName || activeDevice?.name || 'Mobile Companion',
          trackId: prevTrack.id,
          trackTitle: prevTrack.title || prevTrack.file_name,
          trackArtist: prevTrack.artist,
          artist: prevTrack.artist,
          album: prevTrack.album || undefined,
          duration: prevTrack.duration || 0,
          currentTime: 0,
          cover_art_path: prevTrack.cover_art_path || undefined,
          isPlaying: true,
          lastReceivedAt: Date.now(),
        });
      } else {
        set({
          currentTrack: prevTrack,
          history: nextHistory,
          queue: nextQueue,
          currentTime: 0,
          duration: prevTrack.duration || 0,
          isPlaying: true,
          isVideoModalOpen: prevTrack.media_type === 'video',
        });
      }
    } else {
      if (isMobileInCharge && targetDeviceId) {
        companionStore.sendRemoteCommand({ type: 'seek', position: 0 }, targetDeviceId);
      }
      set({ currentTime: 0 });
    }
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

registerPlayerStoreSync(async (state) => {
  if (!state.trackId) return;

  const player = usePlayerStore.getState();
  const targetId = state.trackId;

  if (player.currentTrack?.id === targetId) {
    usePlayerStore.setState({
      currentTime: state.currentTime,
      duration: state.duration || player.duration,
    });
    return;
  }

  let fullTrack: Track | null = null;
  const libTracks = getLibraryTracksFallback?.() || [];
  fullTrack = libTracks.find((t) => t.id === targetId) || null;

  if (!fullTrack && window.api?.getTrackById) {
    try {
      fullTrack = await window.api.getTrackById(targetId);
    } catch {}
  }

  if (!fullTrack) {
    fullTrack = {
      id: targetId,
      title: state.trackTitle || 'Streaming Track',
      artist: state.trackArtist || state.artist || 'Unknown Artist',
      album: state.album || '',
      duration: state.duration || 0,
      cover_art_path: state.cover_art_path || undefined,
      file_name: state.trackTitle || '',
      file_path: '',
      drive_letter: '',
      file_size: 0,
      format: 'mp3',
      mtime: Date.now(),
      is_custom_metadata: false,
      play_count: 0,
      is_liked: false,
      media_type: 'audio',
      created_at: Date.now(),
      updated_at: Date.now(),
    };
  }

  let currentQueue = player.queue;
  const idxInQueue = currentQueue.findIndex((t) => t.id === targetId);
  if (idxInQueue !== -1) {
    currentQueue = currentQueue.slice(idxInQueue + 1);
  } else if (currentQueue.length === 0 && libTracks.length > 0) {
    const idxInLib = libTracks.findIndex((t) => t.id === targetId);
    if (idxInLib !== -1) {
      currentQueue = libTracks.slice(idxInLib + 1);
    }
  }

  const history = player.currentTrack
    ? [player.currentTrack, ...player.history.slice(0, 50)]
    : player.history;

  const finalTrack: Track = fullTrack!;
  usePlayerStore.setState({
    currentTrack: finalTrack,
    queue: currentQueue,
    history,
    duration: state.duration || finalTrack.duration || 0,
    currentTime: state.currentTime || 0,
    isPlaying: false,
  });
});

