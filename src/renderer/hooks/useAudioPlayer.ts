import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore.js';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener('play', () => {
        setIsPlaying(true);
      });

      audio.addEventListener('pause', () => {
        setIsPlaying(false);
      });

      audio.addEventListener('loadedmetadata', () => {
        if (!isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
        const savedTime = usePlayerStore.getState().currentTime;
        if (savedTime > 0 && Math.abs(audio.currentTime - savedTime) > 0.5) {
          audio.currentTime = savedTime;
        }
      });

      audio.addEventListener('ended', () => {
        playNext();
      });

      audio.addEventListener('error', (e) => {
        console.warn('Audio playback error:', e);
        setIsPlaying(false);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Update track source
  useEffect(() => {
    const audio = audioRef.current;
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
    const audio = audioRef.current;
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
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Media Session API integration (Windows SMTC & Keyboard Media Keys)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    const coverUrl = currentTrack.cover_art_path && window.api
      ? window.api.getCoverUrl(currentTrack.cover_art_path)
      : undefined;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || currentTrack.file_name,
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || '',
        artwork: coverUrl
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
          seekTo(details.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        seekTo(Math.max(0, currentTime - skipTime));
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        seekTo(Math.min(duration || 1, currentTime + skipTime));
      });
    } catch {}
  }, [currentTrack, isPlaying, duration]);

  // External seek sync (if difference > 1.5s)
  const seekTo = (newTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return {
    audioElement: audioRef.current,
    seekTo,
  };
}
