import React from 'react';
import {
  X,
  Music,
  Tv,
  Edit3,
  Trash2,
  Sliders,
  Disc,
  Clock,
  Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { getHarmonicCompatibleKeys } from '../../../shared/camelot.js';
import { formatDuration, formatFileSize } from '../../../shared/formatters.js';
import { TrackCover } from '../common/TrackCover.js';

export const RightSidebar: React.FC = () => {
  const {
    currentTrack,
    queue,
    isRightSidebarOpen,
    toggleRightSidebar,
    removeFromQueue,
    clearQueue,
    playTrack,
    setVideoModalOpen,
  } = usePlayerStore();

  const { setEditingTrack, selectAlbumByName } = useLibraryStore();

  if (!isRightSidebarOpen) return null;

  const coverUrl = currentTrack?.cover_art_path && window.api
    ? window.api.getCoverUrl(currentTrack.cover_art_path)
    : null;

  const harmonicKeys = currentTrack?.camelot_key
    ? getHarmonicCompatibleKeys(currentTrack.camelot_key)
    : [];

  return (
    <aside className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] flex flex-col justify-between select-none h-full text-xs z-30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <span className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
          Now Playing & Queue
        </span>
        <button
          onClick={toggleRightSidebar}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
        {/* Track Artwork & Details */}
        {currentTrack ? (
          <div className="space-y-3">
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-[var(--bg-tertiary)] border border-[var(--border-color)] shadow-xl relative group">
              <TrackCover
                coverPath={currentTrack.cover_art_path}
                mediaType={currentTrack.media_type}
                alt={currentTrack.title}
                fallbackIconClassName="w-12 h-12 text-[var(--text-muted)] opacity-40"
                className="w-full h-full object-cover"
              />

              {currentTrack.media_type === 'video' && (
                <button
                  onClick={() => setVideoModalOpen(true)}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                  title="Open Video Player"
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-600/90 backdrop-blur-sm text-white font-semibold text-xs shadow-lg hover:scale-105 transition-transform">
                    <Tv className="w-4 h-4" />
                    <span>Watch Video</span>
                  </div>
                </button>
              )}

              <button
                onClick={() => setEditingTrack(currentTrack)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                title="Edit Track Metadata"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                {currentTrack.title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {currentTrack.artist}
              </p>
              {currentTrack.album && (
                <p 
                  onClick={() => selectAlbumByName(currentTrack.album, currentTrack.artist)}
                  className="text-[11px] text-[var(--text-muted)] truncate mt-0.5 hover:underline hover:text-emerald-400 cursor-pointer transition-colors"
                  title={`View album: ${currentTrack.album}`}
                >
                  {currentTrack.album} {currentTrack.year ? `(${currentTrack.year})` : ''}
                </p>
              )}
            </div>

            {/* Harmonic DJ Information Card */}
            {(currentTrack.bpm || currentTrack.camelot_key) && (
              <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    DJ Harmonic Data
                  </span>
                  <button
                    onClick={() => setEditingTrack(currentTrack)}
                    className="text-[10px] text-[var(--text-muted)] hover:text-emerald-400"
                  >
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[var(--bg-secondary)] p-2 rounded border border-[var(--border-color)]">
                    <div className="text-[9px] text-[var(--text-muted)] uppercase">Tempo</div>
                    <div className="text-xs font-mono font-bold text-[var(--text-primary)]">
                      {currentTrack.bpm ? `${Math.round(currentTrack.bpm)} BPM` : '—'}
                    </div>
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-2 rounded border border-[var(--border-color)]">
                    <div className="text-[9px] text-[var(--text-muted)] uppercase">Key (Camelot)</div>
                    <div className="text-xs font-mono font-bold text-emerald-400 truncate">
                      {currentTrack.camelot_key || '—'}{' '}
                      {currentTrack.musical_key ? `(${currentTrack.musical_key})` : ''}
                    </div>
                  </div>
                </div>

                {harmonicKeys.length > 0 && (
                  <div className="pt-1 text-[10px] text-[var(--text-muted)]">
                    <span className="opacity-80">Compatible Keys: </span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {harmonicKeys.join(' • ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Audio Specifications */}
            <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-color)] space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>Format</span>
                <span className="font-mono uppercase text-[var(--text-primary)]">
                  {currentTrack.format}
                </span>
              </div>
              {currentTrack.bitrate && (
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span>Bitrate</span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {currentTrack.bitrate} kbps
                  </span>
                </div>
              )}
              {currentTrack.sample_rate && (
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span>Sample Rate</span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {(currentTrack.sample_rate / 1000).toFixed(1)} kHz
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>File Size</span>
                <span className="font-mono text-[var(--text-primary)]">
                  {formatFileSize(currentTrack.file_size)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)] italic text-center py-6">
            No track currently playing
          </div>
        )}

        {/* Up Next Queue Section */}
        <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Up Next Queue ({queue.length})
            </span>
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="text-[11px] text-[var(--text-muted)] italic py-2">
              Queue is empty
            </div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {queue.map((t, idx) => (
                <div
                  key={`${t.id}_${idx}`}
                  className="group flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors text-xs"
                >
                  <div
                    onClick={() => playTrack(t)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="font-semibold truncate text-[var(--text-primary)]">
                      {t.title}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">
                      {t.artist}
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromQueue(idx)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-rose-400 p-1"
                    title="Remove from Queue"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
