import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  Lock,
  Unlock,
  Radio,
  X,
  Plus,
  Zap,
  Check,
  Music,
  ChevronDown,
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore.js';
import { useDjStore, CUE_COLORS, PitchRange } from '../../store/djStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { seekAudioTo } from '../../hooks/useAudioPlayer.js';
import { formatDuration } from '../../../shared/formatters.js';

interface DjDeckPanelProps {
  onClose?: () => void;
  isEmbedded?: boolean; // When rendered inside DjMatcherView
}

export const DjDeckPanel: React.FC<DjDeckPanelProps> = ({ onClose, isEmbedded = false }) => {
  const { currentTrack, isPlaying, currentTime, togglePlay, updateCurrentTrackMetadata } = usePlayerStore();
  const {
    pitchPercent,
    pitchRange,
    pitchBend,
    isMasterTempo,
    setPitchPercent,
    setPitchRange,
    setPitchBend,
    toggleMasterTempo,
    resetPitch,
    setHotCue,
    clearHotCue,
    clearAllHotCues,
    hotCues,
    registerTap,
    resetTap,
    tappedBpm,
    tapTimestamps,
  } = useDjStore();

  const { openDjMatcher, updateTrackInStore } = useLibraryStore();

  const [tapSuccessMessage, setTapSuccessMessage] = useState<string | null>(null);

  const trackCues = currentTrack?.id ? hotCues[currentTrack.id] || {} : {};

  // Calculate adjusted target BPM based on effective playback rate
  const baseBpm = currentTrack?.bpm ? Number(currentTrack.bpm) : null;
  const effectiveRate = 1 + (pitchPercent + pitchBend) / 100;
  const adjustedBpm = baseBpm ? Number((baseBpm * effectiveRate).toFixed(1)) : null;

  // Handle Hot Cue click:
  // If already set -> jump to timestamp and resume playback if paused
  // If not set -> set at current timestamp
  const handleCueClick = (cueNumber: 1 | 2 | 3 | 4) => {
    if (!currentTrack) return;
    const existingTime = trackCues[cueNumber];

    if (existingTime !== undefined) {
      seekAudioTo(existingTime);
      if (!isPlaying) {
        togglePlay();
      }
    } else {
      setHotCue(currentTrack.id, cueNumber, currentTime);
    }
  };

  // Handle Tap-Tempo click
  const handleTap = () => {
    registerTap();
  };

  // Apply tapped BPM to current track metadata in DB
  const handleApplyTappedBpm = async () => {
    if (!currentTrack || !tappedBpm) return;
    const roundedBpm = Math.round(tappedBpm);

    try {
      if (window.api?.updateMetadata) {
        await window.api.updateMetadata({
          id: currentTrack.id,
          bpm: roundedBpm,
        });
      }

      updateCurrentTrackMetadata({ bpm: roundedBpm });
      updateTrackInStore({ ...currentTrack, bpm: roundedBpm });

      setTapSuccessMessage(`Updated to ${roundedBpm} BPM!`);
      setTimeout(() => setTapSuccessMessage(null), 2500);
    } catch (err) {
      console.error('Failed to update track BPM:', err);
    }
  };

  // Sync tapped BPM to DJ Matcher
  const handleSyncToMatcher = () => {
    if (!tappedBpm) return;
    openDjMatcher(currentTrack || undefined);
    setTapSuccessMessage(`Synced ${Math.round(tappedBpm)} BPM to Matcher!`);
    setTimeout(() => setTapSuccessMessage(null), 2500);
  };

  const ranges: PitchRange[] = [4, 8, 16, 50];

  return (
    <div
      className={`border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/95 backdrop-blur-md select-none transition-all duration-200 animate-in slide-in-from-bottom-2 ${
        isEmbedded
          ? 'rounded-2xl border border-[var(--border-color)] p-4 shadow-lg'
          : 'px-4 py-3 shadow-2xl z-30'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Hot Cues (1..4) */}
        <div className="flex-1 space-y-1.5 min-w-[280px]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5 font-mono uppercase tracking-wider text-[var(--text-secondary)]">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Hot Cues (1–4)</span>
            </div>
            {currentTrack && Object.keys(trackCues).length > 0 && (
              <button
                onClick={() => clearAllHotCues(currentTrack.id)}
                className="text-[10px] text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Clear all hot cues for this track"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as const).map((cueNum) => {
              const cueTime = trackCues[cueNum];
              const isSet = cueTime !== undefined;
              const style = CUE_COLORS[cueNum];

              return (
                <div
                  key={cueNum}
                  onClick={() => handleCueClick(cueNum)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (currentTrack && isSet) {
                      clearHotCue(currentTrack.id, cueNum);
                    }
                  }}
                  className={`group relative h-12 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer overflow-hidden ${
                    isSet
                      ? `bg-[var(--bg-tertiary)] ${style.border} ${style.glow}`
                      : 'bg-[var(--bg-tertiary)]/40 border-[var(--border-color)] hover:border-neutral-600 hover:bg-[var(--bg-tertiary)]'
                  }`}
                  title={
                    isSet
                      ? `Cue ${cueNum}: ${formatDuration(cueTime)} (Click to Jump, Right-click to Clear)`
                      : `Cue ${cueNum}: Unset (Click to Set at ${formatDuration(currentTime)})`
                  }
                >
                  {/* Glowing color bar at top of pad */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 transition-opacity ${
                      isSet ? style.bg : 'bg-neutral-600/40 group-hover:bg-neutral-500'
                    }`}
                  />

                  {/* Clear 'x' button on hover for active cues */}
                  {isSet && currentTrack && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearHotCue(currentTrack.id, cueNum);
                      }}
                      className="absolute top-1 right-1 p-0.5 rounded text-neutral-400 hover:text-white hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Clear cue"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[10px] font-black font-mono px-1 rounded ${
                        isSet ? `${style.bg} text-black` : 'text-neutral-500'
                      }`}
                    >
                      {cueNum}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        isSet ? style.text : 'text-neutral-500'
                      }`}
                    >
                      {isSet ? formatDuration(cueTime) : 'EMPTY'}
                    </span>
                  </div>

                  <span className="text-[9px] text-[var(--text-muted)] font-mono">
                    {isSet ? 'JUMP' : '+ SET'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Pitch & Tempo Performance Fader */}
        <div className="flex-1 bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)] rounded-xl p-2.5 space-y-2 min-w-[320px]">
          {/* Header Row: BPM display + Range selector */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 font-mono font-bold text-xs text-[var(--text-primary)]">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>PITCH:</span>
                <span
                  className={`font-mono font-black ${
                    pitchPercent > 0
                      ? 'text-emerald-400'
                      : pitchPercent < 0
                      ? 'text-rose-400'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {pitchPercent >= 0 ? `+${pitchPercent.toFixed(2)}%` : `${pitchPercent.toFixed(2)}%`}
                </span>
                {pitchBend !== 0 && (
                  <span className="text-[10px] text-amber-400 animate-pulse">
                    (Nudge {pitchBend > 0 ? `+${pitchBend}%` : `${pitchBend}%`})
                  </span>
                )}
              </div>

              {/* Dynamic BPM Indicator */}
              {baseBpm && (
                <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-mono text-[var(--text-muted)]">
                  <span>{baseBpm}</span>
                  <span>→</span>
                  <span className="font-bold text-cyan-400">{adjustedBpm} BPM</span>
                </div>
              )}
            </div>

            {/* Pitch Range Pills */}
            <div className="flex items-center gap-1">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => setPitchRange(r)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    pitchRange === r
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-neutral-400 hover:text-white bg-[var(--bg-secondary)]/60'
                  }`}
                >
                  ±{r}%
                </button>
              ))}
            </div>
          </div>

          {/* Slider Row: Pitch Slider + Reset + Nudge */}
          <div className="flex items-center gap-3">
            {/* Momentary Pitch Nudge (-) */}
            <button
              onMouseDown={() => setPitchBend(-2)}
              onMouseUp={() => setPitchBend(0)}
              onMouseLeave={() => setPitchBend(0)}
              className="px-2 py-1 bg-[var(--bg-secondary)] hover:bg-neutral-700 active:bg-cyan-500/30 text-neutral-300 active:text-cyan-300 rounded font-mono font-bold text-xs border border-[var(--border-color)] cursor-pointer select-none transition-colors"
              title="Pitch Bend (-): Hold to slow down momentarily for beatmatching"
            >
              -
            </button>

            {/* Slider */}
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={-pitchRange}
                max={pitchRange}
                step={0.05}
                value={pitchPercent}
                onChange={(e) => setPitchPercent(parseFloat(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              {/* Center 0% indicator tick */}
              <div
                className="absolute left-1/2 -top-1 bottom-0 w-0.5 bg-neutral-500/50 pointer-events-none -translate-x-1/2"
                title="Center 0.00%"
              />
            </div>

            {/* Momentary Pitch Nudge (+) */}
            <button
              onMouseDown={() => setPitchBend(2)}
              onMouseUp={() => setPitchBend(0)}
              onMouseLeave={() => setPitchBend(0)}
              className="px-2 py-1 bg-[var(--bg-secondary)] hover:bg-neutral-700 active:bg-cyan-500/30 text-neutral-300 active:text-cyan-300 rounded font-mono font-bold text-xs border border-[var(--border-color)] cursor-pointer select-none transition-colors"
              title="Pitch Bend (+): Hold to speed up momentarily for beatmatching"
            >
              +
            </button>

            {/* Reset to 0% */}
            <button
              onClick={resetPitch}
              disabled={pitchPercent === 0 && pitchBend === 0}
              className={`p-1.5 rounded-md border text-xs font-mono transition-all cursor-pointer ${
                pitchPercent !== 0 || pitchBend !== 0
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                  : 'bg-[var(--bg-secondary)] text-neutral-500 border-transparent cursor-not-allowed opacity-50'
              }`}
              title="Reset Pitch to 0.00%"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            {/* Master Tempo (Key Lock) Toggle */}
            <button
              onClick={toggleMasterTempo}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase tracking-wider border transition-all cursor-pointer ${
                isMasterTempo
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                  : 'bg-[var(--bg-secondary)] text-neutral-400 border-[var(--border-color)] hover:text-white'
              }`}
              title={
                isMasterTempo
                  ? 'Master Tempo ON: Musical key is locked and preserved during tempo changes'
                  : 'Master Tempo OFF: Vinyl mode (key shifts with tempo changes)'
              }
            >
              {isMasterTempo ? <Lock className="w-2.5 h-2.5 text-emerald-400" /> : <Unlock className="w-2.5 h-2.5" />}
              <span>MT</span>
            </button>
          </div>
        </div>

        {/* Right: Tap-Tempo Calibration Tool */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-center justify-between gap-2 bg-[var(--bg-tertiary)]/40 border border-[var(--border-color)] rounded-xl p-2.5 min-w-[190px]">
          <div className="w-full flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
            <span className="font-mono uppercase tracking-wider text-[var(--text-secondary)]">
              Tap Tempo
            </span>
            {tapTimestamps.length > 0 && (
              <span className="text-[10px] font-mono text-cyan-400 animate-pulse">
                {tapTimestamps.length} taps
              </span>
            )}
          </div>

          <div className="w-full flex items-center gap-2">
            {/* Big Tap Button */}
            <button
              onClick={handleTap}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 active:scale-95 border border-emerald-500/40 text-[var(--text-primary)] font-mono font-black text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Click rhythmically to calculate BPM"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{tappedBpm ? `${tappedBpm} BPM` : 'TAP'}</span>
            </button>

            {tappedBpm && (
              <button
                onClick={resetTap}
                className="p-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-neutral-700 text-neutral-400 hover:text-white border border-[var(--border-color)] transition-colors cursor-pointer"
                title="Reset Tap sequence"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Actions for Tapped BPM */}
          {tappedBpm && currentTrack && (
            <div className="w-full flex items-center gap-1.5 animate-in fade-in">
              <button
                onClick={handleApplyTappedBpm}
                className="flex-1 py-1 px-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                title="Save this BPM to current song metadata in library database"
              >
                <Check className="w-2.5 h-2.5" />
                <span>Save BPM</span>
              </button>

              <button
                onClick={handleSyncToMatcher}
                className="py-1 px-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                title="Send BPM to DJ Harmonic Matcher"
              >
                <Music className="w-2.5 h-2.5" />
                <span>Matcher</span>
              </button>
            </div>
          )}

          {tapSuccessMessage && (
            <div className="text-[10px] font-mono text-emerald-400 animate-in fade-in text-center">
              {tapSuccessMessage}
            </div>
          )}
        </div>

        {/* Close Button if docked above PlaybackBar */}
        {onClose && !isEmbedded && (
          <button
            onClick={onClose}
            className="self-center p-1 rounded-md text-neutral-400 hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            title="Hide DJ Deck Panel"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
