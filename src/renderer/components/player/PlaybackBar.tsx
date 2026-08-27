import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  ListMusic,
  Tv,
  Music,
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { WaveformBar } from './WaveformBar.js';
import { formatDuration } from '../../../shared/formatters.js';

interface PlaybackBarProps {
  onSeek: (time: number) => void;
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({ onSeek }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    isRightSidebarOpen,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleRightSidebar,
    setVideoModalOpen,
  } = usePlayerStore();

  const { toggleLikeTrack } = useLibraryStore();

  const coverUrl = currentTrack?.cover_art_path && window.api
    ? window.api.getCoverUrl(currentTrack.cover_art_path)
    : null;

  return (
    <footer className="h-20 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] px-4 flex items-center justify-between z-40 select-none">
      {/* Left: Track Info & Cover */}
      <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
        {currentTrack ? (
          <>
            <div
              onClick={() => {
                if (currentTrack.media_type === 'video') {
                  setVideoModalOpen(true);
                }
              }}
              className={`relative w-14 h-14 rounded-md overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0 group shadow-md ${
                currentTrack.media_type === 'video' ? 'cursor-pointer ring-1 ring-purple-500/30 hover:ring-purple-500/60 transition-all' : ''
              }`}
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                  {currentTrack.media_type === 'video' ? <Tv className="w-6 h-6 text-purple-400" /> : <Music className="w-6 h-6" />}
                </div>
              )}

              {currentTrack.media_type === 'video' && (
                <div
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  title="Click to Open Video Player"
                >
                  <Tv className="w-5 h-5 text-purple-300" />
                </div>
              )}
            </div>

            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate hover:underline cursor-pointer">
                {currentTrack.title}
              </span>
              <span className="text-xs text-[var(--text-secondary)] truncate hover:underline cursor-pointer">
                {currentTrack.artist}
              </span>
            </div>

            <button
              onClick={() => toggleLikeTrack(currentTrack.id)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 transition-colors"
              title={currentTrack.is_liked ? 'Remove from Liked' : 'Save to Liked'}
            >
              <Heart
                className={`w-4 h-4 transition-transform active:scale-125 ${
                  currentTrack.is_liked
                    ? 'fill-emerald-500 text-emerald-500'
                    : 'hover:text-white'
                }`}
              />
            </button>
          </>
        ) : (
          <div className="text-xs text-[var(--text-muted)] italic">
            Select a track to start playback
          </div>
        )}
      </div>

      {/* Center: Playback Controls & Waveform Bar */}
      <div className="flex flex-col items-center max-w-xl w-2/4 px-4">
        {/* Buttons */}
        <div className="flex items-center gap-4 mb-1">
          <button
            onClick={toggleShuffle}
            className={`p-1.5 transition-colors ${
              isShuffle
                ? 'text-emerald-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={playPrevious}
            disabled={!currentTrack}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 transition-colors disabled:opacity-40"
            title="Previous"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            className="w-8 h-8 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg disabled:opacity-40"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={playNext}
            disabled={!currentTrack}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 transition-colors disabled:opacity-40"
            title="Next"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-1.5 transition-colors ${
              repeatMode !== 'off'
                ? 'text-emerald-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Waveform & Time */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[11px] font-mono text-[var(--text-muted)] w-9 text-right">
            {formatDuration(currentTime)}
          </span>

          <div className="flex-1">
            <WaveformBar
              waveformData={currentTrack?.waveform_data}
              currentTime={currentTime}
              duration={duration}
              onSeek={onSeek}
            />
          </div>

          <span className="text-[11px] font-mono text-[var(--text-muted)] w-9">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Right: DJ Key/BPM Info, Queue, Volume */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
        {/* BPM & Camelot Key Badge */}
        {currentTrack && (currentTrack.bpm || currentTrack.camelot_key) && (
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[10px] font-mono text-emerald-400">
            {currentTrack.bpm && <span>{Math.round(currentTrack.bpm)} BPM</span>}
            {currentTrack.bpm && currentTrack.camelot_key && <span>•</span>}
            {currentTrack.camelot_key && <span>{currentTrack.camelot_key}</span>}
          </div>
        )}

        {/* Video Mode Button */}
        {currentTrack?.media_type === 'video' && (
          <button
            onClick={() => setVideoModalOpen(true)}
            className="text-[var(--text-secondary)] hover:text-white p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
            title="Video View"
          >
            <Tv className="w-4 h-4 text-purple-400" />
          </button>
        )}

        {/* Up Next Queue Toggle */}
        <button
          onClick={toggleRightSidebar}
          className={`p-1.5 rounded-md transition-colors ${
            isRightSidebarOpen
              ? 'text-emerald-400 bg-[var(--bg-tertiary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
          title="Queue & Info"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Volume Slider */}
        <div className="flex items-center gap-1.5 group">
          <button
            onClick={toggleMute}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
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
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 accent-emerald-500 h-1 bg-[var(--bg-tertiary)] rounded-full"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>
      </div>
    </footer>
  );
};
