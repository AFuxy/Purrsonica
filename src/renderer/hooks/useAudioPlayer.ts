import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore.js';
import { useScanStore } from '../store/scanStore.js';

// Dual-deck audio pipeline for 0ms gapless and smooth crossfade transitions
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
let isCrossfading = false;
let handoffFiredForTrackId: string | null = null;
let precisionTimer: any = null;
let crossfadeTimer: any = null;

function getPlayerConfig() {
  const s = useScanStore.getState().settings;
  return {
    isGaplessEnabled: s?.enableGaplessPlayback !== false,
    crossfadeDuration: Math.min(10, Math.max(0, s?.crossfadeDuration ?? 0)),
  };
}

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

  if (crossfadeTimer) {
    clearInterval(crossfadeTimer);
    crossfadeTimer = null;
    isCrossfading = false;
    usePlayerStore.getState().setCrossfadeState(null);
    const curMaster = usePlayerStore.getState().isMuted ? 0 : usePlayerStore.getState().volume;
    getActiveDeck().volume = curMaster;
    getStandbyDeck().pause();
    getStandbyDeck().src = '';
  }

  if (precisionTimer) {
    clearInterval(precisionTimer);
    precisionTimer = null;
  }

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

  // Pre-buffer upcoming track on the standby deck
  const preloadUpcomingTrack = () => {
    const { isGaplessEnabled, crossfadeDuration } = getPlayerConfig();
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
        standby.volume = crossfadeDuration > 0 ? 0 : (isMuted ? 0 : volume);
      }
    }
  };

  // Perform smooth audio crossfade transition over fadeSec seconds
  const executeCrossfade = (fadeSec: number) => {
    if (isCrossfading || isGaplessTransitioning) return;
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
      nextTrack &&
      nextTrack.media_type !== 'video' &&
      standby.src
    ) {
      isCrossfading = true;
      isGaplessTransitioning = true;
      currentPlayingTrackId = nextTrack.id;
      preloadedTrackId = null;

      const startTime = Date.now();
      const totalFadeMs = Math.max(500, fadeSec * 1000);

      // Start incoming track at 0 volume
      standby.currentTime = 0;
      standby.volume = 0;
      standby.play().catch((err) => {
        console.warn('Crossfade incoming deck play error:', err);
      });

      usePlayerStore.getState().setCrossfadeState({
        isCrossfading: true,
        progress: 0,
        incomingTrack: nextTrack,
      });

      if (crossfadeTimer) clearInterval(crossfadeTimer);

      crossfadeTimer = setInterval(() => {
        const elapsedMs = Date.now() - startTime;
        const progress = Math.min(1, Math.max(0, elapsedMs / totalFadeMs));
        const curMaster = usePlayerStore.getState().isMuted ? 0 : usePlayerStore.getState().volume;

        // Equal-power crossfade curve
        active.volume = curMaster * Math.cos(progress * 0.5 * Math.PI);
        standby.volume = curMaster * Math.sin(progress * 0.5 * Math.PI);

        usePlayerStore.getState().setCrossfadeState({
          isCrossfading: true,
          progress,
          incomingTrack: nextTrack,
        });

        if (progress >= 1) {
          clearInterval(crossfadeTimer);
          crossfadeTimer = null;

          // Swap active deck reference
          const oldActive = active;
          activeDeckIndex = (1 - activeDeckIndex) as 0 | 1;

          standby.volume = curMaster;
          if (!isNaN(standby.duration) && standby.duration > 0) {
            setDuration(standby.duration);
          }

          // Advance queue in store and preserve the continuous ongoing position (e.g. 4.0s)
          const ongoingTime = standby.currentTime;
          usePlayerStore.getState().playNext();
          usePlayerStore.getState().setCurrentTime(ongoingTime);
          usePlayerStore.getState().setCrossfadeState(null);

          isCrossfading = false;
          isGaplessTransitioning = false;

          try {
            oldActive.pause();
            oldActive.src = '';
          } catch {}
        }
      }, 20);
    } else {
      executeHandoff();
    }
  };

  // Perform instant 0ms handoff from active deck to pre-buffered standby deck
  const executeHandoff = () => {
    if (isGaplessTransitioning || isCrossfading) return;
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

    const { isGaplessEnabled } = getPlayerConfig();

    if (
      isGaplessEnabled &&
      nextTrack &&
      nextTrack.media_type !== 'video' &&
      standby.src
    ) {
      isGaplessTransitioning = true;
      currentPlayingTrackId = nextTrack.id;
      preloadedTrackId = null;

      const curMaster = state.isMuted ? 0 : state.volume;
      standby.volume = curMaster;
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

  // Monitor end of track for Crossfade or 0ms Gapless Handoff
  const checkTransition = (deck: HTMLAudioElement) => {
    const { isGaplessEnabled, crossfadeDuration } = getPlayerConfig();
    if (!isGaplessEnabled || isCrossfading || isGaplessTransitioning) return;

    if (crossfadeDuration > 0) {
      // Trigger Crossfade when reaching (duration - crossfadeDuration)
      if (deck.duration > crossfadeDuration + 0.5 && deck.currentTime >= deck.duration - crossfadeDuration) {
        executeCrossfade(crossfadeDuration);
      }
    } else {
      // 0ms Gapless: Trigger high-precision monitor during final 3 seconds
      if (deck.duration > 3 && deck.currentTime >= deck.duration - 3.0 && !precisionTimer) {
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
        }, 20);
      }
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

          const { crossfadeDuration } = getPlayerConfig();
          const preBufferSec = crossfadeDuration > 0 ? crossfadeDuration + 8 : 12;
          if (deck.duration > preBufferSec && deck.currentTime >= deck.duration - preBufferSec) {
            preloadUpcomingTrack();
          }

          checkTransition(deck);
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
        if (!isCrossfading) {
          executeHandoff();
        }
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
    if (isGaplessTransitioning || isCrossfading) return;

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
        // Same track re-triggered (e.g. resume)
        if (isPlaying) {
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

  // Handle Volume / Mute
  useEffect(() => {
    if (isCrossfading) return;
    const targetVol = isMuted ? 0 : volume;
    decks.forEach((deck) => {
      deck.volume = targetVol;
    });
  }, [volume, isMuted, isCrossfading]);

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
