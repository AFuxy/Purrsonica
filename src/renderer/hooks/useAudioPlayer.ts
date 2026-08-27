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
    repeatMode,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    playNext,
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

      audio.addEventListener('loadedmetadata', () => {
        if (!isNaN(audio.duration)) {
          setDuration(audio.duration);
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

    if (currentTrack) {
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
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('Play interrupted:', err);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Handle Volume / Mute
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

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
