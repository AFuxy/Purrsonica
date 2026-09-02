import React, { useState, useMemo, useEffect } from 'react';
import {
  Radio,
  Music,
  Play,
  Pause,
  Heart,
  Plus,
  Sliders,
  Sparkles,
  Zap,
  RefreshCw,
  Search,
  ListPlus,
  Check,
  Disc,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { Track, Playlist } from '../../../shared/types.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { usePlayerStore } from '../../store/playerStore.js';
import { useScanStore } from '../../store/scanStore.js';
import { useDjStore } from '../../store/djStore.js';
import { TrackCover } from '../common/TrackCover.js';
import { DjDeckPanel } from '../player/DjDeckPanel.js';
import { formatDuration } from '../../../shared/formatters.js';
import {
  HarmonicMode,
  findHarmonicMatches,
  getCompatibleCamelotKeys,
  MatchedDjTrack,
} from '../../services/harmonicMatcher.js';

export const DjMatcherView: React.FC = () => {
  const { tracks, selectedDjAnchorTrack, openDjMatcher, createPlaylist, addTrackToPlaylist, toggleLikeTrack, selectTrackDetail } = useLibraryStore();
  const { currentTrack, isPlaying, setTrack, togglePlay, addToQueue } = usePlayerStore();
  const { settings } = useScanStore();

  // Mode settings
  const [syncWithPlaying, setSyncWithPlaying] = useState<boolean>(!selectedDjAnchorTrack);
  const [harmonicMode, setHarmonicMode] = useState<HarmonicMode>('neighbors');
  const [bpmTolerance, setBpmTolerance] = useState<number>(5); // Default ±5%
  const [allowHalfDoubleTime, setAllowHalfDoubleTime] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>('');

  // Manual key/BPM override state (when no track is available or user selects manual)
  const [manualKey, setManualKey] = useState<string>('8A');
  const [manualBpm, setManualBpm] = useState<number>(128);
  const [isManualMode, setIsManualMode] = useState<boolean>(false);

  // Track selection modal / search
  const [showTrackPicker, setShowTrackPicker] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Determine active anchor track or manual settings
  const activeAnchor = useMemo(() => {
    if (isManualMode) return null;
    if (syncWithPlaying && currentTrack && currentTrack.media_type !== 'video') {
      return currentTrack;
    }
    return selectedDjAnchorTrack || currentTrack;
  }, [isManualMode, syncWithPlaying, currentTrack, selectedDjAnchorTrack]);

  const targetKey = useMemo(() => {
    if (isManualMode) return manualKey;
    return activeAnchor?.camelot_key || manualKey;
  }, [isManualMode, activeAnchor, manualKey]);

  const targetBpm = useMemo(() => {
    if (isManualMode) return manualBpm;
    return activeAnchor?.bpm ? Math.round(activeAnchor.bpm) : manualBpm;
  }, [isManualMode, activeAnchor, manualBpm]);

  // Harmonic compatible keys list
  const compatibleKeys = useMemo(() => {
    return targetKey ? getCompatibleCamelotKeys(targetKey, harmonicMode) : [];
  }, [targetKey, harmonicMode]);

  // Compute matched tracks
  const matchedResults = useMemo(() => {
    return findHarmonicMatches(tracks, targetKey, targetBpm, {
      harmonicMode,
      bpmTolerancePercent: bpmTolerance,
      allowHalfDoubleTime,
      ignoreSameTrackId: activeAnchor?.id,
      searchQuery: filterQuery,
    });
  }, [tracks, targetKey, targetBpm, harmonicMode, bpmTolerance, allowHalfDoubleTime, activeAnchor, filterQuery]);

  // Play all matched tracks
  const handlePlayAllMatches = () => {
    if (matchedResults.length === 0) return;
    const matchTracks = matchedResults.map((m) => m.track);
    setTrack(matchTracks[0], matchTracks);
    showToast(`Playing ${matchTracks.length} harmonically matched tracks`);
  };

  // Add all matches to queue
  const handleQueueAllMatches = () => {
    if (matchedResults.length === 0) return;
    matchedResults.forEach((m) => addToQueue(m.track));
    showToast(`Added ${matchedResults.length} tracks to queue`);
  };

  // Save matches as custom playlist / DJ crate
  const handleSaveAsDjCrate = async () => {
    if (matchedResults.length === 0) return;
    const playlistName = `DJ Crate: ${targetKey} ${targetBpm}BPM (±${bpmTolerance}%)`;
    try {
      await createPlaylist(playlistName, `Harmonic mix crate matched against ${activeAnchor ? activeAnchor.title : targetKey}`);
      // Find created playlist in library store
      const updatedPlaylists = useLibraryStore.getState().playlists;
      const created = updatedPlaylists.find((p) => p.name === playlistName);
      if (created) {
        for (const m of matchedResults) {
          await addTrackToPlaylist(created.id, m.track.id);
        }
        showToast(`Saved "${playlistName}" with ${matchedResults.length} tracks`);
      }
    } catch (err) {
      console.error('Failed to create DJ crate:', err);
    }
  };

  // Track Picker Filtered List
  const availableTracksForPicker = useMemo(() => {
    if (!pickerSearch.trim()) return tracks.slice(0, 30);
    const q = pickerSearch.toLowerCase();
    return tracks.filter(
      (t) =>
        t.media_type !== 'video' &&
        ((t.title && t.title.toLowerCase().includes(q)) ||
          (t.artist && t.artist.toLowerCase().includes(q)) ||
          (t.camelot_key && t.camelot_key.toLowerCase().includes(q)))
    ).slice(0, 40);
  }, [tracks, pickerSearch]);

  const allCamelotKeys = [
    '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A',
    '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B',
  ];

  return (
    <div className="flex-1 bg-[var(--bg-primary)] overflow-y-auto p-6 space-y-6 select-none relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 bg-amber-500 text-black px-4 py-2 rounded-xl text-xs font-bold shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-transparent border border-amber-500/20 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-black shadow-md flex-shrink-0">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[var(--text-primary)]">DJ Matcher & Mix Assistant</h1>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                Harmonic Suite
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Harmonic Camelot Wheel compatibility & precision BPM tempo matching across your library
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePlayAllMatches}
            disabled={matchedResults.length === 0}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-40 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play All ({matchedResults.length})</span>
          </button>

          <button
            onClick={handleQueueAllMatches}
            disabled={matchedResults.length === 0}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Queue</span>
          </button>

          <button
            onClick={handleSaveAsDjCrate}
            disabled={matchedResults.length === 0}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-amber-400 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            title="Save matched tracks to a custom DJ Crate playlist"
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>Save as DJ Crate</span>
          </button>
        </div>
      </div>

      {/* Target Anchor Track & Configuration Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Anchor Track Card */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Anchor Track / Reference
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setIsManualMode(false);
                  setSyncWithPlaying(true);
                  if (currentTrack) openDjMatcher(currentTrack);
                }}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  !isManualMode && syncWithPlaying
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-[var(--text-muted)] hover:text-white bg-[var(--bg-tertiary)]'
                }`}
                title="Automatically match against whatever song is currently playing"
              >
                Sync with Player
              </button>
              <button
                onClick={() => setShowTrackPicker(true)}
                className="px-2 py-1 rounded-md text-[10px] font-semibold text-[var(--text-secondary)] hover:text-white bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                Choose Track...
              </button>
              <button
                onClick={() => setIsManualMode(!isManualMode)}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  isManualMode
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                    : 'text-[var(--text-muted)] hover:text-white bg-[var(--bg-tertiary)]'
                }`}
              >
                Manual Dial
              </button>
            </div>
          </div>

          {/* Reference Card Content */}
          {!isManualMode && activeAnchor ? (
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <div className="w-14 h-14 rounded-lg bg-[var(--bg-primary)] overflow-hidden flex-shrink-0 border border-white/10 shadow">
                <TrackCover
                  coverPath={activeAnchor.cover_art_path}
                  mediaType={activeAnchor.media_type}
                  alt={activeAnchor.title}
                  fallbackIconClassName="w-6 h-6 text-[var(--text-muted)]"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3
                  onClick={() => selectTrackDetail(activeAnchor)}
                  className="text-xs font-bold text-[var(--text-primary)] truncate hover:text-emerald-400 hover:underline cursor-pointer"
                >
                  {activeAnchor.title}
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                  {activeAnchor.artist || 'Unknown Artist'}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  {activeAnchor.camelot_key ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {activeAnchor.camelot_key} {activeAnchor.musical_key ? `(${activeAnchor.musical_key})` : ''}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-[var(--text-muted)] bg-neutral-800 border border-neutral-700">
                      Key Unknown
                    </span>
                  )}
                  {activeAnchor.bpm ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      {Math.round(activeAnchor.bpm)} BPM
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-[var(--text-muted)] bg-neutral-800 border border-neutral-700">
                      BPM Unknown
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[var(--text-primary)]">Manual Harmonic Target</span>
                <span className="text-amber-400 font-mono font-bold">{manualKey} @ {manualBpm} BPM</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">Camelot Key</label>
                  <select
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-mono outline-none cursor-pointer"
                  >
                    {allCamelotKeys.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">Target BPM</label>
                  <input
                    type="number"
                    min="40"
                    max="240"
                    value={manualBpm}
                    onChange={(e) => setManualBpm(parseInt(e.target.value, 10) || 120)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Compatible Keys Breakdown */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Harmonically Compatible Keys ({compatibleKeys.length})
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {compatibleKeys.map((k) => (
                <span
                  key={k.key}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${k.badgeColor}`}
                  title={k.label}
                >
                  {k.key} <span className="text-[9px] opacity-75 font-normal">({k.label})</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Harmonic & BPM Match Settings */}
        <div className="lg:col-span-7 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Matching Rules & Tolerance
          </span>

          {/* Harmonic Wheel Mode Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">Camelot Harmonic Mode</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setHarmonicMode('neighbors')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                  harmonicMode === 'neighbors'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                }`}
              >
                Harmonic Neighbors
                <span className="block text-[9px] opacity-75 font-normal">±1h & Rel Major/Minor</span>
              </button>

              <button
                onClick={() => setHarmonicMode('exact')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                  harmonicMode === 'exact'
                    ? 'bg-emerald-500 text-black font-bold shadow'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                }`}
              >
                Exact Key Only
                <span className="block text-[9px] opacity-75 font-normal">Same key only</span>
              </button>

              <button
                onClick={() => setHarmonicMode('energy')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                  harmonicMode === 'energy'
                    ? 'bg-rose-500 text-white font-bold shadow'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                }`}
              >
                Energy Boost
                <span className="block text-[9px] opacity-75 font-normal">+1h & +2h Steps</span>
              </button>

              <button
                onClick={() => setHarmonicMode('all')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                  harmonicMode === 'all'
                    ? 'bg-purple-500 text-white font-bold shadow'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                }`}
              >
                Any Key
                <span className="block text-[9px] opacity-75 font-normal">Pure BPM match</span>
              </button>
            </div>
          </div>

          {/* BPM Tolerance Slider & Presets */}
          <div className="space-y-2 pt-1 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-primary)]">BPM Pitch Window</label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-amber-400 font-bold">
                  {bpmTolerance === -1 ? 'Any BPM' : `±${bpmTolerance}% (${(targetBpm * (1 - bpmTolerance / 100)).toFixed(1)} – ${(targetBpm * (1 + bpmTolerance / 100)).toFixed(1)} BPM)`}
                </span>
              </div>
            </div>

            {/* Quick Preset Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: 'Exact (0%)', val: 0 },
                { label: '±3%', val: 3 },
                { label: '±5% (DJ Standard)', val: 5 },
                { label: '±8%', val: 8 },
                { label: '±16%', val: 16 },
                { label: 'Any BPM', val: -1 },
              ].map((p) => (
                <button
                  key={p.val}
                  onClick={() => setBpmTolerance(p.val)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    bpmTolerance === p.val
                      ? 'bg-amber-500 text-black shadow'
                      : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {bpmTolerance >= 0 && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[10px] font-mono text-[var(--text-muted)]">0%</span>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={bpmTolerance}
                  onChange={(e) => setBpmTolerance(parseInt(e.target.value, 10) || 0)}
                  className="flex-1 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-[var(--text-muted)]">20%</span>
              </div>
            )}
          </div>

          {/* Half-Time / Double-Time Checkbox */}
          <div
            onClick={() => setAllowHalfDoubleTime(!allowHalfDoubleTime)}
            className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-tertiary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">Include Half-Time (1/2x) & Double-Time (2x)</div>
              <div className="text-[10px] text-[var(--text-muted)]">
                Matches sub-genres (e.g. 70 BPM ↔ 140 BPM for Trap, Dubstep, and Drum & Bass)
              </div>
            </div>
            <button
              className={`w-9 h-4.5 rounded-full transition-colors relative flex-shrink-0 ${
                allowHalfDoubleTime ? 'bg-amber-500' : 'bg-neutral-600'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                  allowHalfDoubleTime ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Live DJ Deck Performance Suite (Pitch, Hot Cues, Tap-Tempo) */}
      <DjDeckPanel isEmbedded={true} />

      {/* Results Header & Quick Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Matched Tracks</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {matchedResults.length}
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter matches by title, artist..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      {/* Matched Tracks List */}
      {matchedResults.length > 0 ? (
        <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm divide-y divide-[var(--border-color)]">
          {/* Table Column Headers */}
          <div className="grid grid-cols-[40px_minmax(180px,2fr)_minmax(120px,1.5fr)_90px_100px_70px_80px] items-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-tertiary)]/50">
            <div className="text-center">#</div>
            <div>Title</div>
            <div>Artist</div>
            <div>Camelot Key</div>
            <div>BPM & Pitch</div>
            <div className="text-right pr-2">Duration</div>
            <div className="text-center">Actions</div>
          </div>

          {/* Rows */}
          {matchedResults.map((item, idx) => {
            const isCurrent = currentTrack?.id === item.track.id;
            const isThisPlaying = isCurrent && isPlaying;

            return (
              <div
                key={item.track.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/purrsonica-track', item.track.id);
                  e.dataTransfer.setData('application/json', JSON.stringify({ trackId: item.track.id, track: item.track }));
                  e.dataTransfer.setData('text/plain', item.track.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className={`grid grid-cols-[40px_minmax(180px,2fr)_minmax(120px,1.5fr)_90px_100px_70px_80px] items-center px-4 py-2 text-xs hover:bg-[var(--bg-hover)] transition-colors group cursor-grab active:cursor-grabbing ${
                  isCurrent ? 'bg-amber-500/10' : ''
                }`}
              >
                {/* Index / Play Button */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => {
                      if (isCurrent) togglePlay();
                      else setTrack(item.track, matchedResults.map((m) => m.track));
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-white hover:bg-emerald-500 hover:text-black transition-all cursor-pointer"
                  >
                    {isThisPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Track Cover & Title */}
                <div className="flex items-center gap-3 pr-4 min-w-0">
                  <div className="w-8 h-8 rounded bg-[var(--bg-tertiary)] overflow-hidden flex-shrink-0 border border-white/5">
                    <TrackCover
                      coverPath={item.track.cover_art_path}
                      mediaType={item.track.media_type}
                      alt={item.track.title}
                      fallbackIconClassName="w-4 h-4 text-[var(--text-muted)]"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span
                    onClick={() => selectTrackDetail(item.track)}
                    className={`font-semibold truncate hover:underline hover:text-emerald-400 cursor-pointer ${
                      isCurrent ? 'text-amber-400 font-bold' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {item.track.title}
                  </span>
                </div>

                {/* Artist */}
                <div className="truncate text-[var(--text-secondary)] pr-4">
                  {item.track.artist || 'Unknown Artist'}
                </div>

                {/* Camelot Key Badge */}
                <div>
                  {item.track.camelot_key ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                        item.keyMatch ? item.keyMatch.badgeColor : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                      }`}
                    >
                      {item.track.camelot_key}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">-</span>
                  )}
                </div>

                {/* BPM & Delta Tag */}
                <div>
                  {item.track.bpm ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-[var(--text-primary)]">
                        {Math.round(item.track.bpm)}
                      </span>
                      {item.bpmMatch && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            item.bpmMatch.diffPercent === 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : Math.abs(item.bpmMatch.diffPercent) <= 3
                              ? 'bg-blue-500/20 text-blue-300'
                              : item.bpmMatch.matchType === 'halftime' || item.bpmMatch.matchType === 'doubletime'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {item.bpmMatch.matchType === 'halftime'
                            ? '½x'
                            : item.bpmMatch.matchType === 'doubletime'
                            ? '2x'
                            : `${item.bpmMatch.diffPercent > 0 ? '+' : ''}${item.bpmMatch.diffPercent}%`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">-</span>
                  )}
                </div>

                {/* Duration */}
                <div className="text-right pr-2 font-mono text-[11px] text-[var(--text-muted)]">
                  {formatDuration(item.track.duration || 0)}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1.5">
                  {currentTrack?.bpm && item.track.bpm && (
                    <button
                      onClick={() => {
                        const curBpm = Number(currentTrack.bpm);
                        const targetBpm = Number(item.track.bpm);
                        const success = useDjStore.getState().syncBpmToTarget(targetBpm, curBpm);
                        if (success) {
                          showToast(`Synced Deck pitch to match ${Math.round(targetBpm)} BPM!`);
                        }
                      }}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 transition-colors cursor-pointer"
                      title={`Sync playing deck (${Math.round(Number(currentTrack.bpm))} BPM) to match this track's ${Math.round(Number(item.track.bpm))} BPM`}
                    >
                      SYNC
                    </button>
                  )}

                  <button
                    onClick={() => toggleLikeTrack(item.track.id)}
                    className={`p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${
                      item.track.is_liked ? 'text-emerald-400' : 'text-[var(--text-muted)] hover:text-white'
                    }`}
                    title={item.track.is_liked ? 'Unlike' : 'Like'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${item.track.is_liked ? 'fill-emerald-400' : ''}`} />
                  </button>

                  <button
                    onClick={() => {
                      addToQueue(item.track);
                      showToast(`Added "${item.track.title}" to queue`);
                    }}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                    title="Add to Queue"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Radio className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">No Harmonically Matched Tracks</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            Try increasing the BPM pitch window (e.g. to ±8% or ±16%) or switching the Camelot Harmonic mode to "Any Key".
          </p>
        </div>
      )}

      {/* Track Picker Modal */}
      {showTrackPicker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-5 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Select Reference Anchor Track</h3>
              <button
                onClick={() => setShowTrackPicker(false)}
                className="text-[var(--text-muted)] hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                autoFocus
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search tracks by title, artist, or key..."
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 divide-y divide-[var(--border-color)]">
              {availableTracksForPicker.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    openDjMatcher(t);
                    setSyncWithPlaying(false);
                    setIsManualMode(false);
                    setShowTrackPicker(false);
                  }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded bg-[var(--bg-primary)] overflow-hidden flex-shrink-0">
                      <TrackCover
                        coverPath={t.cover_art_path}
                        mediaType={t.media_type}
                        alt={t.title}
                        fallbackIconClassName="w-4 h-4 text-[var(--text-muted)]"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate">{t.title}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{t.artist || 'Unknown Artist'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.camelot_key && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {t.camelot_key}
                      </span>
                    )}
                    {t.bpm && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-[var(--text-muted)] bg-neutral-800">
                        {Math.round(t.bpm)} BPM
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
