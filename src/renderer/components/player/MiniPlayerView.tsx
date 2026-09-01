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
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { useThemeStore } from '../../store/themeStore.js';
import { useScanStore } from '../../store/scanStore.js';
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
    crossfadeState,
  } = usePlayerStore();

  const { toggleLikeTrack } = useLibraryStore();
  const { logoPath } = useThemeStore();
  const { settings } = useScanStore();
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
        className="h-7 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-2.5 flex items-center justify-between cursor-move flex-shrink-0"
      >
        {/* Left: Brand + Hanging DJ Badge + Camelot Key (if DJ Mode) */}
        <div className="flex items-center gap-1.5 min-w-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="relative flex items-center">
            <img src={logoPath} alt="Purrsonica" className="h-4 w-auto object-contain" />
            {settings?.enableDjMode && (
              <div
                className="relative -ml-0.5 -top-1.5 flex flex-col items-center rotate-12 select-none pointer-events-none"
                title="DJ Mode Active"
              >
                <div className="w-1 h-1 rounded-full bg-neutral-900 border border-white/70 -mb-0.5 z-10 shadow-sm" />
                <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-black text-[7px] font-black tracking-widest px-1 py-0.2 rounded shadow border border-amber-200/50 uppercase leading-none">
                  DJ
                </div>
              </div>
            )}
          </div>
          {settings?.enableDjMode && currentTrack?.camelot_key && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold leading-none"
              style={{
                backgroundColor: currentTrack.camelot_key.endsWith('A') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                color: currentTrack.camelot_key.endsWith('A') ? '#34d399' : '#818cf8',
              }}
            >
              {currentTrack.camelot_key}
            </span>
          )}
          {settings?.enableDjMode && currentTrack?.bpm && (
            <span className="text-[9px] font-mono text-[var(--text-muted)] hidden sm:inline">
              {Math.round(currentTrack.bpm)} BPM
            </span>
          )}
        </div>

        {/* Right: Window & Mode Controls */}
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
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
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
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
              className="p-1 rounded text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
              title="Volume"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
            {showVolumeSlider && (
              <div className="absolute right-0 top-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-2 rounded-lg shadow-xl z-50 flex items-center gap-2">
                <button onClick={toggleMute} className="text-xs text-[var(--text-muted)] hover:text-white cursor-pointer">
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
            className="p-1 rounded text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            title="Expand to Full App (Ctrl+M)"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Minimize */}
          <button
            onClick={handleMinimize}
            className="p-1 rounded text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Mini-Deck Body */}
      <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0 overflow-hidden">
        {/* Top Row: Cover Art, Metadata, and Primary Transport Controls */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Cover Art */}
          <div className={`relative w-11 h-11 rounded-lg bg-[var(--bg-tertiary)] overflow-hidden flex-shrink-0 border border-white/10 shadow-md ${
            crossfadeState?.isCrossfading ? 'ring-2 ring-purple-500/70' : ''
          }`}>
            {currentTrack ? (
              <>
                <div
                  className="w-full h-full transition-opacity"
                  style={{ opacity: crossfadeState?.isCrossfading ? 1 - crossfadeState.progress : 1 }}
                >
                  <TrackCover
                    coverPath={currentTrack.cover_art_path}
                    mediaType={currentTrack.media_type}
                    alt={currentTrack.title}
                    fallbackIconClassName="w-5 h-5 text-[var(--text-muted)]"
                    className="w-full h-full object-cover"
                  />
                </div>

                {crossfadeState?.isCrossfading && crossfadeState.incomingTrack && (
                  <div
                    className="absolute inset-0 transition-opacity"
                    style={{ opacity: crossfadeState.progress }}
                  >
                    <TrackCover
                      coverPath={crossfadeState.incomingTrack.cover_art_path}
                      mediaType={crossfadeState.incomingTrack.media_type}
                      alt={crossfadeState.incomingTrack.title}
                      fallbackIconClassName="w-5 h-5 text-[var(--text-muted)]"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
            )}
          </div>

          {/* Center: Track Metadata */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="text-xs font-bold text-white truncate leading-tight">
              {crossfadeState?.isCrossfading && crossfadeState.incomingTrack && crossfadeState.progress > 0.5
                ? crossfadeState.incomingTrack.title || crossfadeState.incomingTrack.file_name
                : currentTrack ? currentTrack.title || currentTrack.file_name : 'No track playing'}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] truncate leading-tight mt-0.5">
              {crossfadeState?.isCrossfading && crossfadeState.incomingTrack && crossfadeState.progress > 0.5
                ? crossfadeState.incomingTrack.artist || 'Unknown Artist'
                : currentTrack ? currentTrack.artist || 'Unknown Artist' : 'Purrsonica'}
            </div>
          </div>

          {/* Right: Primary Transport Controls */}
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

        {/* Bottom Row: Full-Width Waveform Scrubber & Timers */}
        <div className="space-y-0.5 pt-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="h-4 flex items-center">
            <WaveformBar
              waveformData={currentTrack?.waveform_data}
              currentTime={currentTime}
              duration={duration}
              onSeek={onSeek}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)] px-0.5">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
