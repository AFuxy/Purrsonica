import React, { useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore.js';

export const VideoModal: React.FC = () => {
  const {
    currentTrack,
    isVideoModalOpen,
    setVideoModalOpen,
    isPlaying,
    togglePlay,
    volume,
    isMuted,
    toggleMute,
    setVolume,
  } = usePlayerStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentTrack || currentTrack.media_type !== 'video') return;

    const mediaUrl = window.api
      ? window.api.getMediaUrl(currentTrack.file_path)
      : currentTrack.file_path;

    if (video.src !== mediaUrl) {
      video.src = mediaUrl;
    }

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  if (!isVideoModalOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
      <div className="relative w-full max-w-5xl bg-neutral-950 rounded-xl overflow-hidden shadow-2xl border border-neutral-800 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/80 border-b border-neutral-800 text-white">
          <div className="flex items-center gap-2 truncate">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-600 text-white uppercase">
              Video
            </span>
            <span className="text-sm font-semibold truncate">{currentTrack.title}</span>
            <span className="text-xs text-neutral-400 truncate">— {currentTrack.artist}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVideoModalOpen(false)}
              className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
              title="Close Video"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Surface */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            autoPlay
            onPlay={() => usePlayerStore.getState().setIsPlaying(true)}
            onPause={() => usePlayerStore.getState().setIsPlaying(false)}
            onEnded={() => usePlayerStore.getState().playNext()}
          />
        </div>
      </div>
    </div>
  );
};
