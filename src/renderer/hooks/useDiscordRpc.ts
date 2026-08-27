import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore.js';

export function useDiscordRpc() {
  const { currentTrack, isPlaying, currentTime, duration } = usePlayerStore();

  useEffect(() => {
    if (!window.api?.updateDiscordPresence) return;

    window.api.updateDiscordPresence({
      track: currentTrack
        ? {
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            album: currentTrack.album,
            duration: currentTrack.duration,
            file_name: currentTrack.file_name,
            media_type: currentTrack.media_type,
          }
        : null,
      isPlaying,
      currentTime,
      duration: duration || currentTrack?.duration || 0,
    });
  }, [currentTrack, isPlaying, Math.floor(currentTime / 5), duration]);
}
