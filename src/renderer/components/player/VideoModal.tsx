import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  X,
  Maximize,
  Minimize,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore.js';
import { formatDuration } from '../../../shared/formatters.js';

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
    duration,
    setDuration,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    playNext,
    playPrevious,
  } = usePlayerStore();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCenterIcon, setShowCenterIcon] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

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

  // Sync External Seek (if not currently dragging)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isScrubbing) return;
    if (Math.abs(video.currentTime - currentTime) > 1.2) {
      video.currentTime = currentTime;
    }
  }, [currentTime, isScrubbing]);

  // Handle Fullscreen state change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls logic on mouse activity
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying && !isScrubbing) {
      hideControlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2500);
    }
  }, [isPlaying, isScrubbing]);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    } else {
      resetHideTimer();
    }
  }, [isPlaying, resetHideTimer]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePlay();
    setShowCenterIcon(isPlaying ? 'pause' : 'play');
    setTimeout(() => setShowCenterIcon(null), 500);
  };

  const handleSeek = (timeInSecs: number) => {
    const target = Math.max(0, Math.min(duration || 1, timeInSecs));
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
    setCurrentTime(target);
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration || 1, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setShowCenterIcon(seconds > 0 ? '+10s' : '-10s');
      setTimeout(() => setShowCenterIcon(null), 500);
    }
  };

  // Timeline scrubber click / drag calculations
  const calculateScrubTime = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return pos * duration;
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsScrubbing(true);
    const newTime = calculateScrubTime(e);
    handleSeek(newTime);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!progressBarRef.current || !duration) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      handleSeek(pos * duration);
    };

    const onMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
  };

  // Keyboard controls for video view
  useEffect(() => {
    if (!isVideoModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((document.activeElement?.tagName || '').toLowerCase())) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        resetHideTimer();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-5);
        resetHideTimer();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip(5);
        resetHideTimer();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'Escape' && isVideoModalOpen) {
        if (!document.fullscreenElement) {
          setVideoModalOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVideoModalOpen, isPlaying, duration]);

  if (!currentTrack || currentTrack.media_type !== 'video') return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isVideoModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        ref={containerRef}
        onMouseMove={resetHideTimer}
        onMouseEnter={() => setControlsVisible(true)}
        className="relative w-full max-w-5xl bg-neutral-950 rounded-xl overflow-hidden shadow-2xl border border-neutral-800 flex flex-col group select-none"
      >
        {/* Top Header Bar Overlay */}
        <div
          className={`absolute top-0 inset-x-0 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent text-white z-20 transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-600/90 text-white uppercase tracking-widest border border-purple-400/30">
              Video Playback
            </span>
            <span className="text-sm font-bold truncate drop-shadow">{currentTrack.title}</span>
            <span className="text-xs text-neutral-300 truncate drop-shadow">— {currentTrack.artist}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={toggleFullscreen}
              className="text-neutral-300 hover:text-white p-2 rounded-lg bg-black/40 hover:bg-black/70 border border-white/10 backdrop-blur-md transition-all cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setVideoModalOpen(false)}
              className="text-neutral-300 hover:text-white p-2 rounded-lg bg-black/40 hover:bg-black/70 border border-white/10 backdrop-blur-md transition-all cursor-pointer"
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
              if (videoRef.current && !isScrubbing) {
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

          {/* Center Feedback Animation */}
          {showCenterIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div className="px-5 py-4 rounded-2xl bg-black/70 text-white backdrop-blur-md shadow-2xl border border-white/10 text-base font-bold flex items-center gap-2">
                {showCenterIcon === 'play' && <Play className="w-8 h-8 fill-current ml-0.5" />}
                {showCenterIcon === 'pause' && <Pause className="w-8 h-8 fill-current" />}
                {showCenterIcon === '+10s' && <span>+10s</span>}
                {showCenterIcon === '-10s' && <span>-10s</span>}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Floating Control Bar Overlay */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 md:p-5 pt-10 text-white z-20 transition-opacity duration-300 space-y-3 ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Interactive Scrub / Timeline Bar */}
          <div className="space-y-1">
            <div
              ref={progressBarRef}
              onMouseDown={handleProgressMouseDown}
              onMouseMove={handleProgressMouseMove}
              onMouseLeave={handleProgressMouseLeave}
              className="relative h-2 hover:h-3.5 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer transition-all flex items-center group/scrubber"
            >
              {/* Played Progress Bar */}
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full relative"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              >
                {/* Thumb Handle */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover/scrubber:opacity-100 transition-opacity" />
              </div>

              {/* Hover Timestamp Tooltip */}
              {hoverTime !== null && (
                <div
                  className="absolute bottom-5 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-white text-[10px] font-mono border border-white/20 pointer-events-none shadow-md"
                  style={{ left: `${hoverPosition}%` }}
                >
                  {formatDuration(hoverTime)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-300 px-0.5">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Controls & Quick Actions Row */}
          <div className="flex items-center justify-between">
            {/* Left Controls: Play, Skip, Prev, Next */}
            <div className="flex items-center gap-3">
              <button
                onClick={playPrevious}
                className="text-neutral-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Previous Track"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={() => handleSkip(-10)}
                className="text-neutral-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Rewind 10 Seconds (←)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer hover:scale-105"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={() => handleSkip(10)}
                className="text-neutral-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Fast-Forward 10 Seconds (→)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                onClick={playNext}
                className="text-neutral-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Right Controls: Volume Slider & Fullscreen */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 group/volume">
                <button
                  onClick={toggleMute}
                  className="text-neutral-300 hover:text-white p-1.5 transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (isMuted) toggleMute();
                  }}
                  className="w-20 h-1.5 bg-white/20 hover:bg-white/30 rounded-full appearance-none cursor-pointer accent-emerald-400"
                  title="Volume"
                />
              </div>

              <button
                onClick={toggleFullscreen}
                className="text-neutral-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

