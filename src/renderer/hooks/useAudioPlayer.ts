import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore.js';
import { useScanStore } from '../store/scanStore.js';

// Dual-deck audio pipeline for zero-gap seamless transitions
const decks = [new Audio(), new Audio()];
decks[0].preload = 'auto';
decks[1].preload = 'auto';

let activeDeckIndex: 0 | 1 = 0;
let listenersInitialized = false;
let currentPlayingTrackId: string | null = null;
let pendingRestoreTime: number | null = null;
let hasCheckedInitialResume = false;
let preloadedTrackId: string | null = null;
let isGaplessTransitioning = false;
let handoffFiredForTrackId: string | null = null;
let precisionTimer: any = null;

export function getAudioElement(): HTMLAudioElement {
  return decks[activeDeckIndex];
}

export function getActiveDeck(): HTMLAudioElement {
  return decks[activeDeckIndex];
}

export function getStandbyDeck(): HTMLAudioElement {
  return decks[1 - activeDeckIndex as 0 | 1];
}

export function seekAudioTo(newTime: number): void {
  const currentTrack = usePlayerStore.getState().currentTrack;
  pendingRestoreTime = null;
  handoffFiredForTrackId = null;

  if (currentTrack?.media_type === 'video') {
    window.dispatchEvent(new CustomEvent('purrsonica:seek-video', { detail: newTime }));
  } else {
    const active = getActiveDeck();
    if (active && !isNaN(newTime)) {
      try {
        active.currentTime = newTime;
      } catch {}
    }
  }
  usePlayerStore.getState().setCurrentTime(newTime);
}

export function useAudioPlayer() {
  const activeAudio = getActiveDeck();

  // Check saved session time on initial hook run
  if (!hasCheckedInitialResume) {
    hasCheckedInitialResume = true;
    const initialSavedTime = usePlayerStore.getState().currentTime;
    if (initialSavedTime > 0) {
      pendingRestoreTime = initialSavedTime;
    }
  }

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    currentTime,
    duration,
    repeatMode,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    playNext,
    playPrevious,
  } = usePlayerStore();

  const { settings } = useScanStore();
  const isGaplessEnabled = settings?.enableGaplessPlayback !== false;

  // Pre-buffer upcoming track on the standby deck
  const preloadUpcomingTrack = () => {
    if (!isGaplessEnabled) return;
    const state = usePlayerStore.getState();
    const nextTrack = state.queue.length > 0
      ? state.queue[0]
      : (state.repeatMode === 'all' && state.history.length > 0 ? state.history[state.history.length - 1] : null);

    if (
      nextTrack &&
      nextTrack.media_type !== 'video' &&
      nextTrack.id !== preloadedTrackId &&
      nextTrack.id !== currentPlayingTrackId
    ) {
      preloadedTrackId = nextTrack.id;
      const standby = getStandbyDeck();
      const nextMediaUrl = window.api
        ? window.api.getMediaUrl(nextTrack.file_path)
        : nextTrack.file_path;

      if (standby.src !== nextMediaUrl) {
        standby.src = nextMediaUrl;
        standby.preload = 'auto';
        standby.load();
        standby.volume = isMuted ? 0 : volume;
      }
    }
  };

  // Perform instant 0ms handoff from active deck to pre-buffered standby deck
  const executeHandoff = () => {
    if (isGaplessTransitioning) return;
    const state = usePlayerStore.getState();
    const active = getActiveDeck();
    const standby = getStandbyDeck();

    if (active.src && handoffFiredForTrackId === currentPlayingTrackId) {
      return;
    }
    handoffFiredForTrackId = currentPlayingTrackId;

    if (precisionTimer) {
      clearInterval(precisionTimer);
      precisionTimer = null;
    }

    if (state.repeatMode === 'one' && state.currentTrack) {
      active.currentTime = 0;
      active.play().catch(() => {});
      setCurrentTime(0);
      setIsPlaying(true);
      handoffFiredForTrackId = null;
      return;
    }

    const nextTrack = state.queue.length > 0
      ? state.queue[0]
      : (state.repeatMode === 'all' && state.history.length > 0 ? state.history[state.history.length - 1] : null);

    if (
      isGaplessEnabled &&
      nextTrack &&
      nextTrack.media_type !== 'video' &&
      standby.src
    ) {
      isGaplessTransitioning = true;
      currentPlayingTrackId = nextTrack.id;
      preloadedTrackId = null;

      // Start standby deck immediately with zero latency
      standby.currentTime = 0;
      standby.play().catch((err) => {
        console.warn('Gapless playback transition error:', err);
      });

      // Swap active deck reference
      const oldActive = active;
      activeDeckIndex = (1 - activeDeckIndex) as 0 | 1;

      if (!isNaN(standby.duration) && standby.duration > 0) {
        setDuration(standby.duration);
      }
      setCurrentTime(0);

      usePlayerStore.getState().playNext();

      isGaplessTransitioning = false;

      // Gracefully overlap for 350ms so the hardware WASAPI buffer never drops to silence
      setTimeout(() => {
        try {
          oldActive.pause();
          oldActive.src = '';
        } catch {}
      }, 350);
    } else {
      usePlayerStore.getState().playNext();
    }
  };

  // Start high-precision monitor for the final 3 seconds of a track
  const checkPrecisionEnd = (deck: HTMLAudioElement) => {
    if (!isGaplessEnabled || precisionTimer) return;
    if (deck.duration > 3 && deck.currentTime >= deck.duration - 3.0) {
      precisionTimer = setInterval(() => {
        const currentActive = getActiveDeck();
        if (currentActive === deck && !deck.paused) {
          if (deck.currentTime >= deck.duration - 0.20) {
            executeHandoff();
          }
        } else {
          clearInterval(precisionTimer);
          precisionTimer = null;
        }
      }, 25);
    }
  };

  // Initialize event listeners once on both decks
  useEffect(() => {
    if (listenersInitialized) return;
    listenersInitialized = true;

    const applyPendingRestore = (deck: HTMLAudioElement) => {
      if (pendingRestoreTime !== null && pendingRestoreTime > 0) {
        try {
          if (Math.abs(deck.currentTime - pendingRestoreTime) > 0.5) {
            deck.currentTime = pendingRestoreTime;
          }
        } catch {}
        pendingRestoreTime = null;
      }
    };

    decks.forEach((deck, deckIdx) => {
      deck.addEventListener('timeupdate', () => {
        if (deckIdx === activeDeckIndex) {
          if (pendingRestoreTime !== null) return;
          setCurrentTime(deck.currentTime);

          // Preload upcoming track when within last 12 seconds
          if (deck.duration > 10 && deck.currentTime >= deck.duration - 12) {
            preloadUpcomingTrack();
          }

          // Trigger high-precision end monitor during final 3 seconds
          checkPrecisionEnd(deck);
        }
      });

      deck.addEventListener('loadedmetadata', () => {
        if (deckIdx === activeDeckIndex && !isNaN(deck.duration)) {
          setDuration(deck.duration);
          applyPendingRestore(deck);
        }
      });

      deck.addEventListener('canplay', () => {
        if (deckIdx === activeDeckIndex) {
          applyPendingRestore(deck);
        }
      });

      deck.addEventListener('ended', () => {
        if (deckIdx !== activeDeckIndex) return;
        pendingRestoreTime = null;
        executeHandoff();
      });

      deck.addEventListener('error', () => {
        if (deck.src && deck.src !== window.location.href) {
          console.warn(`Audio playback error on deck ${deckIdx}:`, deck.src);
        }
      });
    });

    window.addEventListener('beforeunload', () => {
      const active = getActiveDeck();
      if (active && !isNaN(active.currentTime) && active.currentTime > 0) {
        usePlayerStore.getState().setCurrentTime(active.currentTime);
      }
    });
  }, []);

  // Sync native HTMLAudioElement loop mode
  useEffect(() => {
    decks.forEach((deck) => {
      deck.loop = repeatMode === 'one';
    });
  }, [repeatMode]);

  // Update track source when currentTrack changes
  useEffect(() => {
    if (isGaplessTransitioning) return;

    const active = getActiveDeck();

    if (currentTrack && currentTrack.media_type !== 'video') {
      const mediaUrl = window.api
        ? window.api.getMediaUrl(currentTrack.file_path)
        : currentTrack.file_path;

      if (currentPlayingTrackId !== currentTrack.id) {
        currentPlayingTrackId = currentTrack.id;
        handoffFiredForTrackId = null;

        // If the active deck is not yet playing this mediaUrl (manual track select)
        if (active.src !== mediaUrl) {
          active.src = mediaUrl;
          active.load();

          if (isPlaying) {
            active.play().catch((err) => {
              console.warn('Auto-play blocked or media unsupported:', err);
            });
          }
        } else if (isPlaying && (active.paused || active.ended)) {
          active.play().catch(() => {});
        }

        // Trigger preload for upcoming track
        setTimeout(() => {
          preloadUpcomingTrack();
        }, 500);
      } else {
        // Same track re-triggered
        if (isPlaying) {
          if (usePlayerStore.getState().currentTime === 0 && active.currentTime > 0) {
            active.currentTime = 0;
          }
          if (active.paused || active.ended) {
            active.play().catch(() => {});
          }
        }
      }
    } else {
      if (currentPlayingTrackId !== null) {
        currentPlayingTrackId = null;
        handoffFiredForTrackId = null;
        active.pause();
        active.src = '';
        getStandbyDeck().pause();
        getStandbyDeck().src = '';
      }
    }
  }, [currentTrack, isPlaying]);

  // Handle Play/Pause
  useEffect(() => {
    const active = getActiveDeck();
    if (!currentTrack || currentTrack.media_type === 'video') return;

    if (isPlaying) {
      if (active.paused) {
        active.play().catch((err) => {
          console.warn('Play interrupted:', err);
        });
      }
    } else {
      if (!active.paused) {
        active.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  // Handle Volume / Mute on both decks
  useEffect(() => {
    const targetVol = isMuted ? 0 : volume;
    decks.forEach((deck) => {
      deck.volume = targetVol;
    });
  }, [volume, isMuted]);

  // Media Session API integration
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    const coverUrl = currentTrack.cover_art_path && window.api
      ? window.api.getCoverUrl(currentTrack.cover_art_path)
      : undefined;

    const isStandardScheme = coverUrl ? /^(https?|data|blob):/i.test(coverUrl) : false;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || currentTrack.file_name,
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || '',
        artwork: isStandardScheme && coverUrl
          ? [
              { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
              { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
              { src: coverUrl, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrevious();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNext();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekAudioTo(details.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        seekAudioTo(Math.max(0, currentTime - skipTime));
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        seekAudioTo(Math.min(duration || 1, currentTime + skipTime));
      });
    } catch {}
  }, [currentTrack, isPlaying, duration]);

  return {
    audioElement: activeAudio,
    seekTo: seekAudioTo,
  };
}
