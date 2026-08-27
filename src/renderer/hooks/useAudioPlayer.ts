import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore.js';

let globalAudio: HTMLAudioElement | null = null;
let listenersInitialized = false;

export function getAudioElement(): HTMLAudioElement {
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.preload = 'auto';
  }
  return globalAudio;
}

export function seekAudioTo(newTime: number): void {
  const audio = getAudioElement();
  if (audio && !isNaN(newTime)) {
    try {
      audio.currentTime = newTime;
    } catch {}
  }
  usePlayerStore.getState().setCurrentTime(newTime);
}

export function useAudioPlayer() {
  const audio = getAudioElement();

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    currentTime,
    duration,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    playNext,
    playPrevious,
  } = usePlayerStore();

  // Initialize event listeners once on the global audio instance
  useEffect(() => {
    if (listenersInitialized || !globalAudio) return;
    listenersInitialized = true;

    globalAudio.addEventListener('timeupdate', () => {
      if (globalAudio) {
        setCurrentTime(globalAudio.currentTime);
      }
    });

    globalAudio.addEventListener('loadedmetadata', () => {
      if (globalAudio && !isNaN(globalAudio.duration)) {
        setDuration(globalAudio.duration);
      }
      const savedTime = usePlayerStore.getState().currentTime;
      if (globalAudio && savedTime > 0 && Math.abs(globalAudio.currentTime - savedTime) > 0.5) {
        globalAudio.currentTime = savedTime;
      }
    });

    globalAudio.addEventListener('ended', () => {
      usePlayerStore.getState().playNext();
    });

    globalAudio.addEventListener('error', () => {
      if (globalAudio && globalAudio.src && globalAudio.src !== window.location.href) {
        console.warn('Audio playback error on source:', globalAudio.src);
      }
    });
  }, []);

  // Update track source
  useEffect(() => {
    if (!audio) return;

    if (currentTrack && currentTrack.media_type !== 'video') {
      const mediaUrl = window.api
        ? window.api.getMediaUrl(currentTrack.file_path)
        : currentTrack.file_path;

      if (audio.src !== mediaUrl) {
        audio.src = mediaUrl;
        audio.load();
      }

      if (isPlaying) {
        audio.play().catch((err) => {
          console.warn('Auto-play blocked or media unsupported:', err);
        });
      }
    } else {
      audio.pause();
      audio.src = '';
    }
  }, [currentTrack]);

  // Handle Play/Pause
  useEffect(() => {
    if (!audio || !currentTrack || currentTrack.media_type === 'video') return;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('Play interrupted:', err);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  // Handle Volume / Mute
  useEffect(() => {
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Media Session API integration (Windows SMTC & Keyboard Media Keys)
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
    audioElement: audio,
    seekTo: seekAudioTo,
  };
}
