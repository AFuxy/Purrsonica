import React, { useState } from 'react';
import {
  Play,
  Pause,
  Heart,
  MoreHorizontal,
  Clock3,
  Music,
  Tv,
  Edit3,
  ListPlus,
  ArrowUpDown,
  FileText,
  Trash2,
} from 'lucide-react';
import { Track } from '../../../shared/types.js';
import { usePlayerStore } from '../../store/playerStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { formatDuration } from '../../../shared/formatters.js';

interface TrackTableProps {
  tracks: Track[];
}

export const TrackTable: React.FC<TrackTableProps> = ({ tracks }) => {
  const { currentTrack, isPlaying, setTrack, togglePlay, addToQueue } = usePlayerStore();
  const {
    currentView,
    selectedPlaylist,
    removeTrackFromPlaylist,
    toggleLikeTrack,
    setEditingTrack,
    playlists,
    addTrackToPlaylist,
    sortBy,
    sortOrder,
    setSorting,
  } = useLibraryStore();

  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
  const [playlistSubmenuTrackId, setPlaylistSubmenuTrackId] = useState<string | null>(null);

  const handleRowPlay = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      setTrack(track, tracks);
    }
  };

  const handleHeaderSort = (field: any) => {
    setSorting(field);
  };

  return (
    <div className="w-full select-none text-xs text-[var(--text-secondary)]">
      {/* Table Header */}
      <div className="grid grid-cols-[36px_minmax(200px,2fr)_minmax(120px,1.5fr)_70px_80px_70px_40px_40px] items-center px-4 py-2 border-b border-[var(--border-color)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] sticky top-0 bg-[var(--bg-primary)] z-10">
        <div className="text-center">#</div>

        <div
          onClick={() => handleHeaderSort('title')}
          className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)]"
        >
          <span>Title</span>
          {sortBy === 'title' && <ArrowUpDown className="w-3 h-3 text-emerald-400" />}
        </div>

        <div
          onClick={() => handleHeaderSort('album')}
          className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)]"
        >
          <span>Album</span>
          {sortBy === 'album' && <ArrowUpDown className="w-3 h-3 text-emerald-400" />}
        </div>

        <div
          onClick={() => handleHeaderSort('bpm')}
          className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)] justify-end pr-2"
        >
          <span>BPM</span>
          {sortBy === 'bpm' && <ArrowUpDown className="w-3 h-3 text-emerald-400" />}
        </div>

        <div
          onClick={() => handleHeaderSort('camelot_key')}
          className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)] text-center justify-center"
        >
          <span>Key</span>
          {sortBy === 'camelot_key' && <ArrowUpDown className="w-3 h-3 text-emerald-400" />}
        </div>

        <div
          onClick={() => handleHeaderSort('duration')}
          className="flex items-center justify-end pr-2 gap-1 cursor-pointer hover:text-[var(--text-primary)]"
        >
          <Clock3 className="w-3.5 h-3.5" />
          {sortBy === 'duration' && <ArrowUpDown className="w-3 h-3 text-emerald-400" />}
        </div>

        <div className="text-center">❤️</div>
        <div className="text-center">•••</div>
      </div>

      {/* Table Rows */}
      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
          <Music className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-semibold">No media found in this view</p>
          <p className="text-xs mt-1 opacity-70">
            Click "Scan PC" in the sidebar or "Import Files" to add media.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-color)]">
          {tracks.map((track, index) => {
            const isCurrent = currentTrack?.id === track.id;
            const isTrackPlaying = isCurrent && isPlaying;
            const coverUrl = track.cover_art_path && window.api
              ? window.api.getCoverUrl(track.cover_art_path)
              : null;

            return (
              <div
                key={track.id}
                onDoubleClick={() => handleRowPlay(track)}
                className={`grid grid-cols-[36px_minmax(200px,2fr)_minmax(120px,1.5fr)_70px_80px_70px_40px_40px] items-center px-4 py-2 hover:bg-[var(--bg-tertiary)] transition-colors group cursor-default ${
                  isCurrent ? 'bg-[var(--bg-tertiary)] text-emerald-400' : ''
                }`}
              >
                {/* Index / Play Button */}
                <div className="flex items-center justify-center relative">
                  <span className={`text-xs group-hover:hidden ${isCurrent ? 'text-emerald-400 font-bold' : 'text-[var(--text-muted)]'}`}>
                    {index + 1}
                  </span>
                  <button
                    onClick={() => handleRowPlay(track)}
                    className="hidden group-hover:flex items-center justify-center text-[var(--text-primary)] hover:scale-110 transition-transform"
                  >
                    {isTrackPlaying ? (
                      <Pause className="w-4 h-4 fill-current text-emerald-400" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                  </button>
                </div>

                {/* Title, Artist, & Thumbnail */}
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="w-9 h-9 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                    {coverUrl ? (
                      <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : track.media_type === 'video' ? (
                      <Tv className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Music className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`font-semibold truncate text-xs ${isCurrent ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                      {track.title}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] truncate">
                      {track.artist}
                    </span>
                  </div>
                </div>

                {/* Album */}
                <div className="truncate text-xs text-[var(--text-secondary)] pr-3">
                  {track.album}
                </div>

                {/* BPM */}
                <div className="text-right font-mono text-[11px] pr-2 text-[var(--text-muted)]">
                  {track.bpm ? Math.round(track.bpm) : '—'}
                </div>

                {/* Camelot & Musical Key */}
                <div className="flex items-center justify-center">
                  {track.camelot_key ? (
                    <span className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] font-mono font-bold text-[10px] text-emerald-400" title={track.musical_key || ''}>
                      {track.camelot_key}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)] text-[11px]">—</span>
                  )}
                </div>

                {/* Duration */}
                <div className="text-right font-mono text-[11px] pr-2 text-[var(--text-muted)]">
                  {formatDuration(track.duration)}
                </div>

                {/* Like Button */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => toggleLikeTrack(track.id)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                    title={track.is_liked ? 'Liked' : 'Like'}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        track.is_liked
                          ? 'fill-emerald-500 text-emerald-500'
                          : 'opacity-0 group-hover:opacity-100 hover:text-white'
                      }`}
                    />
                  </button>
                </div>

                {/* 3-Dots Context Menu */}
                <div className="relative flex items-center justify-center">
                  <button
                    onClick={() =>
                      setActiveMenuTrackId(activeMenuTrackId === track.id ? null : track.id)
                    }
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeMenuTrackId === track.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                          setActiveMenuTrackId(null);
                          setPlaylistSubmenuTrackId(null);
                        }}
                      />
                      <div className="absolute right-0 top-8 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 z-50 text-xs">
                        {currentView === 'playlist_detail' && selectedPlaylist && (
                          <button
                            onClick={() => {
                              removeTrackFromPlaylist(selectedPlaylist.id, track.id);
                              setActiveMenuTrackId(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] text-rose-400 flex items-center gap-2 border-b border-[var(--border-color)]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove from this Playlist</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            addToQueue(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                          <span>Add to Queue</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingTrack(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Edit Details & Art</span>
                        </button>

                        {/* Add to Playlist Submenu */}
                        <div className="border-t border-[var(--border-color)] my-1" />
                        <div className="px-3 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                          Add to Playlist
                        </div>
                        {playlists.map((pl) => (
                          <button
                            key={pl.id}
                            onClick={() => {
                              addTrackToPlaylist(pl.id, track.id);
                              setActiveMenuTrackId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] truncate flex items-center gap-2"
                          >
                            <span>•</span>
                            <span className="truncate">{pl.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
