import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Volume2,
  VolumeX,
  Maximize2,
  Minus,
  X,
  Shuffle,
  Repeat,
  Repeat1,
  Music,
  Disc,
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { WaveformBar } from './WaveformBar.js';
import { TrackCover } from '../common/TrackCover.js';
import { formatDuration } from '../../../shared/formatters.js';

interface MiniPlayerViewProps {
  onSeek: (time: number) => void;
}

export const MiniPlayerView: React.FC<MiniPlayerViewProps> = ({ onSeek }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleMiniPlayer,
  } = usePlayerStore();

  const { toggleLikeTrack } = useLibraryStore();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const handleMinimize = () => {
    if (window.api?.minimize) {
      window.api.minimize();
    }
  };

  const handleClose = () => {
    if (window.api?.close) {
      window.api.close();
    }
  };

  return (
    <div className="w-full h-full bg-[#141416] text-[var(--text-primary)] border border-[var(--border-color)] flex flex-col justify-between select-none shadow-2xl overflow-hidden rounded-lg">
      {/* Draggable Titlebar / Top Controls */}
      <div
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        onDoubleClick={() => toggleMiniPlayer(false)}
        className="h-7 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-2.5 flex items-center justify-between cursor-move"
      >
        {/* Left: Brand + Camelot Key */}
        <div className="flex items-center gap-2 min-w-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <img src="/PurrSonica-White.png" alt="Purrsonica" className="h-4 w-auto opacity-80" />
          {currentTrack?.camelot_key && (
            <span
              className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold"
              style={{
                backgroundColor: currentTrack.camelot_key.endsWith('A') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                color: currentTrack.camelot_key.endsWith('A') ? '#34d399' : '#818cf8',
              }}
            >
              {currentTrack.camelot_key}
            </span>
          )}
          {currentTrack?.bpm && (
            <span className="text-[9px] font-mono text-[var(--text-muted)] hidden sm:inline">
              {Math.round(currentTrack.bpm)} BPM
            </span>
          )}
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            className={`p-1 rounded text-xs transition-colors ${
              repeatMode !== 'off'
                ? 'text-[var(--accent)] font-bold'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
            title={`Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'Repeat All' : 'Repeat One'}`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-3 h-3" /> : <Repeat className="w-3 h-3" />}
          </button>

          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`p-1 rounded text-xs transition-colors ${
              isShuffle ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-muted)] hover:text-white'
            }`}
            title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
          >
            <Shuffle className="w-3 h-3" />
          </button>

          {/* Volume Button & Slider Flyout */}
          <div className="relative">
            <button
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              className="p-1 rounded text-[var(--text-muted)] hover:text-white transition-colors"
              title="Volume"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
            {showVolumeSlider && (
              <div className="absolute right-0 top-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-2 rounded-lg shadow-xl z-50 flex items-center gap-2">
                <button onClick={toggleMute} className="text-xs text-[var(--text-muted)] hover:text-white">
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-[var(--bg-tertiary)] rounded-full accent-emerald-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Return to Full Window */}
          <button
            onClick={() => toggleMiniPlayer(false)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors"
            title="Expand to Full App (Ctrl+M)"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Minimize */}
          <button
            onClick={handleMinimize}
            className="p-1 rounded text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Mini-Deck */}
      <div className="flex-1 p-2.5 flex items-center gap-3 min-w-0">
        {/* Cover Art */}
        <div className="relative w-12 h-12 rounded bg-[var(--bg-tertiary)] overflow-hidden flex-shrink-0 border border-white/5 shadow-md">
          {currentTrack ? (
            <TrackCover
              coverPath={currentTrack.cover_art_path}
              mediaType={currentTrack.media_type}
              alt={currentTrack.title}
              fallbackIconClassName="w-5 h-5 text-[var(--text-muted)]"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
          )}
        </div>

        {/* Center: Track Metadata & Waveform Scrubber */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="min-w-0 pr-1">
              <div className="text-xs font-bold text-white truncate leading-tight">
                {currentTrack ? currentTrack.title || currentTrack.file_name : 'No track playing'}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] truncate leading-tight">
                {currentTrack ? currentTrack.artist || 'Unknown Artist' : 'Purrsonica'}
              </div>
            </div>
            <div className="text-[10px] font-mono text-[var(--text-muted)] flex-shrink-0">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </div>
          </div>

          {/* Compact Waveform Scrubber */}
          <div className="mt-1">
            <WaveformBar
              waveformData={currentTrack?.waveform_data}
              currentTime={currentTime}
              duration={duration}
              onSeek={onSeek}
            />
          </div>
        </div>

        {/* Right: Primary Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* Like Heart */}
          {currentTrack && (
            <button
              onClick={() => toggleLikeTrack(currentTrack.id)}
              className="p-1 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
              title={currentTrack.is_liked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  currentTrack.is_liked ? 'fill-emerald-500 text-emerald-500' : ''
                }`}
              />
            </button>
          )}

          {/* Previous Track */}
          <button
            onClick={playPrevious}
            disabled={!currentTrack}
            className="p-1 text-[var(--text-secondary)] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
            title="Previous Track"
          >
            <SkipBack className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            className="w-7 h-7 rounded-full accent-btn-solid flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={playNext}
            disabled={!currentTrack}
            className="p-1 text-[var(--text-secondary)] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
