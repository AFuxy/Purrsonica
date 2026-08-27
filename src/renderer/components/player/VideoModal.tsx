import React, { useRef, useEffect, useState } from 'react';
import { X, Maximize, Minimize, Play, Pause } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore.js';

export const VideoModal: React.FC = () => {
  const {
    currentTrack,
    isVideoModalOpen,
    setVideoModalOpen,
    isPlaying,
    togglePlay,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    setDuration,
    volume,
    isMuted,
    playNext,
  } = usePlayerStore();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCenterIcon, setShowCenterIcon] = useState<string | null>(null);

  // Sync Video Media Source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentTrack || currentTrack.media_type !== 'video') return;

    const mediaUrl = window.api
      ? window.api.getMediaUrl(currentTrack.file_path)
      : currentTrack.file_path;

    if (video.src !== mediaUrl) {
      video.src = mediaUrl;
      video.load();
      if (isPlaying) {
        video.play().catch(() => {});
      }
    }
  }, [currentTrack]);

  // Sync Play / Pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentTrack || currentTrack.media_type !== 'video') return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, currentTrack]);

  // Sync Volume & Mute
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Sync External Seek (from Waveform or PlaybackBar)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(video.currentTime - currentTime) > 1.2) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  // Handle Fullscreen state change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleVideoClick = () => {
    togglePlay();
    setShowCenterIcon(isPlaying ? 'pause' : 'play');
    setTimeout(() => setShowCenterIcon(null), 500);
  };

  if (!currentTrack || currentTrack.media_type !== 'video') return null;

  return (
    <div
      className={`fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isVideoModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl bg-neutral-950 rounded-xl overflow-hidden shadow-2xl border border-neutral-800 flex flex-col group"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 text-white z-10">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-600 text-white uppercase tracking-wider">
              Video
            </span>
            <span className="text-sm font-semibold truncate">{currentTrack.title}</span>
            <span className="text-xs text-neutral-400 truncate">— {currentTrack.artist}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-800 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setVideoModalOpen(false)}
              className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-800 transition-colors"
              title="Minimize Video (Plays in background)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Surface */}
        <div
          className="relative aspect-video bg-black flex items-center justify-center cursor-pointer select-none"
          onClick={handleVideoClick}
          onDoubleClick={toggleFullscreen}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current && !isNaN(videoRef.current.duration)) {
                setDuration(videoRef.current.duration);
                const savedTime = usePlayerStore.getState().currentTime;
                if (savedTime > 0 && Math.abs(videoRef.current.currentTime - savedTime) > 0.5) {
                  videoRef.current.currentTime = savedTime;
                }
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => playNext()}
          />

          {/* Center Play/Pause Flash Animation */}
          {showCenterIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="p-4 rounded-full bg-black/60 text-white backdrop-blur-sm shadow-xl animate-out fade-out zoom-out duration-500">
                {showCenterIcon === 'play' ? (
                  <Play className="w-10 h-10 fill-current ml-1" />
                ) : (
                  <Pause className="w-10 h-10 fill-current" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
