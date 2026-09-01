import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  Play,
  Pause,
  Heart,
  MoreHorizontal,
  Clock3,
  Music,
  Edit3,
  ListPlus,
  ArrowUpDown,
  FileText,
  Trash2,
  Folder,
  Sparkles,
  Radio,
} from 'lucide-react';
import { Track, Playlist } from '../../../shared/types.js';
import { usePlayerStore } from '../../store/playerStore.js';
import { useLibraryStore, LibraryViewType } from '../../store/libraryStore.js';
import { useScanStore } from '../../store/scanStore.js';
import { analyzeAudioTrack } from '../../services/audioAnalyzer.js';
import { formatDuration } from '../../../shared/formatters.js';
import { TrackCover } from './TrackCover.js';

interface TrackTableProps {
  tracks: Track[];
}

const ROW_HEIGHT = 44; // Fixed height per row in pixels
const OVERSCAN = 8; // Extra buffer rows rendered above & below

interface TrackTableRowProps {
  track: Track;
  actualIndex: number;
  isCurrent: boolean;
  isTrackPlaying: boolean;
  isDjMode: boolean;
  activeMenuTrackId: string | null;
  playlistSubmenuTrackId: string | null;
  currentView: LibraryViewType;
  selectedPlaylist: Playlist | null;
  playlists: Playlist[];
  onPlay: (track: Track) => void;
  onToggleLike: (trackId: string) => void;
  onSelectDetail: (track: Track) => void;
  onSelectArtist: (artist: string) => void;
  onSelectAlbum: (album: string, artist?: string) => void;
  onEditTrack: (track: Track) => void;
  onRemoveFromPlaylist: (playlistId: string, trackId: string) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onAddToQueue: (track: Track) => void;
  onToggleMenu: (trackId: string) => void;
  onTogglePlaylistSubmenu: (trackId: string) => void;
  onCloseMenu: () => void;
}

const TrackTableRow = memo<TrackTableRowProps>(
  ({
    track,
    actualIndex,
    isCurrent,
    isTrackPlaying,
    isDjMode,
    activeMenuTrackId,
    playlistSubmenuTrackId,
    currentView,
    selectedPlaylist,
    playlists,
    onPlay,
    onToggleLike,
    onSelectDetail,
    onSelectArtist,
    onSelectAlbum,
    onEditTrack,
    onRemoveFromPlaylist,
    onAddToPlaylist,
    onAddToQueue,
    onToggleMenu,
    onTogglePlaylistSubmenu,
    onCloseMenu,
  }) => {
    const isMenuOpen = activeMenuTrackId === track.id;
    const isSubmenuOpen = playlistSubmenuTrackId === track.id;

    return (
      <div
        style={{ height: `${ROW_HEIGHT}px` }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/purrsonica-track', track.id);
          e.dataTransfer.setData('application/json', JSON.stringify({ trackId: track.id, track }));
          e.dataTransfer.setData('text/plain', track.id);
          e.dataTransfer.effectAllowed = 'copy';
        }}
        onDoubleClick={() => onPlay(track)}
        className={`grid ${
          isDjMode
            ? 'grid-cols-[36px_minmax(200px,2fr)_minmax(120px,1.5fr)_70px_80px_70px_40px_40px]'
            : 'grid-cols-[36px_minmax(200px,2fr)_minmax(120px,1.5fr)_70px_40px_40px]'
        } items-center px-4 hover:bg-[var(--bg-tertiary)] transition-colors group cursor-grab active:cursor-grabbing ${
          isCurrent ? 'bg-[var(--bg-tertiary)] text-emerald-400' : ''
        }`}
      >
        {/* Index / Play Button */}
        <div className="flex items-center justify-center relative">
          <span
            className={`text-xs group-hover:hidden ${
              isCurrent ? 'text-emerald-400 font-bold' : 'text-[var(--text-muted)]'
            }`}
          >
            {actualIndex + 1}
          </span>
          <button
            onClick={() => onPlay(track)}
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
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectDetail(track);
            }}
            className="w-8 h-8 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm cursor-pointer hover:ring-1 hover:ring-emerald-500/50 transition-all"
            title="View song info & play page"
          >
            <TrackCover
              coverPath={track.cover_art_path}
              mediaType={track.media_type}
              alt={track.title}
              fallbackIconClassName="w-4 h-4 text-[var(--text-muted)]"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelectDetail(track);
              }}
              className={`font-semibold truncate text-xs hover:underline hover:text-emerald-400 cursor-pointer transition-colors ${
                isCurrent ? 'text-emerald-400' : 'text-[var(--text-primary)]'
              }`}
              title={`Song: ${track.title} (Click to open song play page)`}
            >
              {track.title || track.file_name}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelectArtist(track.artist);
              }}
              className="text-[11px] text-[var(--text-secondary)] truncate hover:underline hover:text-emerald-400 cursor-pointer transition-colors"
              title={`Artist: ${track.artist} (Click to view artist's songs)`}
            >
              {track.artist || 'Unknown Artist'}
            </span>
          </div>
        </div>

        {/* Album */}
        <div className="truncate text-[var(--text-secondary)] text-xs pr-4">
          {track.album ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelectAlbum(track.album, track.artist);
              }}
              className="hover:underline hover:text-emerald-400 cursor-pointer transition-colors"
              title={`View album: ${track.album}`}
            >
              {track.album}
            </span>
          ) : (
            '—'
          )}
        </div>

        {/* BPM (DJ Mode Only) */}
        {isDjMode && (
          <div className="text-right font-mono text-[11px] pr-2 text-[var(--text-muted)]">
            {track.bpm ? Math.round(track.bpm) : '—'}
          </div>
        )}

        {/* Camelot Key Badge (DJ Mode Only) */}
        {isDjMode && (
          <div className="flex items-center justify-center">
            {track.camelot_key ? (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  track.camelot_key.endsWith('A')
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                }`}
                title={track.musical_key || track.camelot_key}
              >
                {track.camelot_key}
              </span>
            ) : (
              <span className="text-[var(--text-muted)] text-[11px]">—</span>
            )}
          </div>
        )}

        {/* Duration */}
        <div className="text-right font-mono text-[11px] pr-2 text-[var(--text-muted)]">
          {formatDuration(track.duration)}
        </div>

        {/* Like Button */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => onToggleLike(track.id)}
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
            onClick={() => onToggleMenu(track.id)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={onCloseMenu} />
              <div className="absolute right-0 top-8 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 z-50 text-xs">
                {currentView === 'playlist_detail' && selectedPlaylist && (
                  <button
                    onClick={() => {
                      onRemoveFromPlaylist(selectedPlaylist.id, track.id);
                      onCloseMenu();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] text-rose-400 flex items-center gap-2 border-b border-[var(--border-color)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove from this Playlist</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onAddToQueue(track);
                    onCloseMenu();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>Add to Queue</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => onTogglePlaylistSubmenu(track.id)}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <ListPlus className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Add to Playlist</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">◀</span>
                  </button>

                  {/* Playlist Submenu */}
                  {isSubmenuOpen && (
                    <div className="absolute right-full top-0 w-48 max-h-60 overflow-y-auto bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 z-50 mr-1.5">
                      {playlists.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] text-[var(--text-muted)] italic text-center">
                          No playlists created
                        </div>
                      ) : (
                        playlists.map((pl) => (
                          <button
                            key={pl.id}
                            onClick={() => {
                              onAddToPlaylist(pl.id, track.id);
                              onCloseMenu();
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[var(--bg-hover)] text-[var(--text-primary)] truncate block text-xs"
                          >
                            {pl.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    onSelectDetail(track);
                    onCloseMenu();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] text-emerald-400 flex items-center gap-2 font-medium"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>View Song Info & Play Page</span>
                </button>

                <button
                  onClick={() => {
                    onSelectArtist(track.artist);
                    onCloseMenu();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Artist's Songs</span>
                </button>

                <button
                  onClick={() => {
                    if (window.api?.showItemInFolder) {
                      window.api.showItemInFolder(track.file_path);
                    }
                    onCloseMenu();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                >
                  <Folder className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Show in Folder</span>
                </button>

                <button
                  onClick={() => {
                    onEditTrack(track);
                    onCloseMenu();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Track Info</span>
                </button>

                {track.media_type === 'audio' && isDjMode && (
                  <>
                    <button
                      onClick={() => {
                        onCloseMenu();
                        useLibraryStore.getState().openDjMatcher(track);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] text-amber-300 flex items-center gap-2 border-t border-[var(--border-color)]"
                    >
                      <Radio className="w-3.5 h-3.5 text-amber-400" />
                      <span>Find DJ Harmonic Matches</span>
                    </button>

                    <button
                      onClick={async () => {
                        onCloseMenu();
                        try {
                          const res = await analyzeAudioTrack(track);
                          if (res && window.api?.updateMetadata) {
                            await window.api.updateMetadata({
                              id: track.id,
                              bpm: res.bpm,
                              musical_key: res.musical_key,
                              camelot_key: res.camelot_key,
                            });
                            useLibraryStore.getState().refreshAll();
                          }
                        } catch (err) {
                          console.error('Failed to analyze track:', err);
                        }
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] text-amber-400 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyze BPM & Key</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

TrackTableRow.displayName = 'TrackTableRow';

/**
 * Lightweight skeleton ghost row for instantly rendering virtual placeholders during fast scrolls
 */
const TrackTableSkeletonRow = memo<{ actualIndex: number; isDjMode: boolean }>(({ actualIndex, isDjMode }) => (
  <div
    style={{ height: `${ROW_HEIGHT}px` }}
    className={`grid ${
      isDjMode
        ? 'grid-cols-[36px_minmax(200px,2fr)_minmax(120px,1.5fr)_70px_80px_70px_40px_40px]'
        : 'grid-cols-[36px_minmax(200px,2fr)_minmax(120px,1.5fr)_70px_40px_40px]'
    } items-center px-4 animate-pulse opacity-40`}
  >
    <div className="text-center font-mono text-[var(--text-muted)] text-xs">{actualIndex + 1}</div>
    <div className="flex items-center gap-3 pr-4">
      <div className="w-8 h-8 rounded bg-[var(--bg-tertiary)] flex-shrink-0" />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="h-3 w-32 bg-[var(--bg-tertiary)] rounded" />
        <div className="h-2.5 w-20 bg-[var(--bg-tertiary)]/70 rounded" />
      </div>
    </div>
    <div className="h-3 w-24 bg-[var(--bg-tertiary)] rounded pr-4" />
    {isDjMode && <div className="h-3 w-8 bg-[var(--bg-tertiary)] rounded ml-auto mr-2" />}
    {isDjMode && <div className="h-4 w-10 bg-[var(--bg-tertiary)] rounded mx-auto" />}
    <div className="h-3 w-10 bg-[var(--bg-tertiary)] rounded ml-auto mr-2" />
    <div className="mx-auto h-3.5 w-3.5 bg-[var(--bg-tertiary)] rounded-full" />
    <div className="mx-auto h-3.5 w-3.5 bg-[var(--bg-tertiary)] rounded-full" />
  </div>
));

TrackTableSkeletonRow.displayName = 'TrackTableSkeletonRow';

export const TrackTable: React.FC<TrackTableProps> = ({ tracks }) => {
  const { currentTrack, isPlaying, setTrack, togglePlay, addToQueue } = usePlayerStore();
  const { settings } = useScanStore();
  const isDjMode = !!settings?.enableDjMode;
  const {
    currentView,
    selectedPlaylist,
    removeTrackFromPlaylist,
    toggleLikeTrack,
    setEditingTrack,
    playlists,
    addTrackToPlaylist,
    sortBy,
    setSorting,
    selectAlbumByName,
    selectArtist,
    selectTrackDetail,
    totalTracks,
    hasMore,
    isLoadingMore,
    fetchMoreTracks,
  } = useLibraryStore();

  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
  const [playlistSubmenuTrackId, setPlaylistSubmenuTrackId] = useState<string | null>(null);

  // Virtualization state
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        setScrollTop(el.scrollTop);
        rafId = null;
      });
    };

    const handleResize = () => {
      setContainerHeight(el.clientHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    el.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', handleResize);
      el.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleRowPlay = useCallback(
    (track: Track) => {
      if (currentTrack?.id === track.id) {
        togglePlay();
      } else {
        setTrack(track, tracks);
      }
    },
    [currentTrack?.id, togglePlay, setTrack, tracks]
  );

  const handleHeaderSort = (field: any) => {
    if (sortBy === field) {
      // Toggle direction via query re-fetch
    } else {
      setSorting(field);
    }
  };

  const handleToggleMenu = useCallback((trackId: string) => {
    setActiveMenuTrackId((prev) => (prev === trackId ? null : trackId));
    setPlaylistSubmenuTrackId(null);
  }, []);

  const handleTogglePlaylistSubmenu = useCallback((trackId: string) => {
    setPlaylistSubmenuTrackId((prev) => (prev === trackId ? null : trackId));
  }, []);

  const handleCloseMenu = useCallback(() => {
    setActiveMenuTrackId(null);
    setPlaylistSubmenuTrackId(null);
  }, []);

  // Ghost Virtualization calculations
  const totalCount = Math.max(tracks.length, totalTracks);
  const totalHeight = totalCount * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2 * OVERSCAN;
  const endIndex = Math.min(totalCount, startIndex + visibleCount);
  const offsetY = startIndex * ROW_HEIGHT;

  // Infinite Ghost Trigger when scrolling near the loaded boundary
  useEffect(() => {
    if (endIndex >= tracks.length - 25 && hasMore && !isLoadingMore) {
      fetchMoreTracks();
    }
  }, [endIndex, tracks.length, hasMore, isLoadingMore, fetchMoreTracks]);

  const visibleRowIndices = Array.from(
    { length: Math.max(0, endIndex - startIndex) },
    (_, i) => startIndex + i
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto select-none text-xs text-[var(--text-secondary)]"
    >
      {/* Table Header (Sticky) */}
      <div className={`grid ${
        isDjMode
          ? 'grid-cols-[36px_minmax(200px,2fr)_minmax(120px,1.5fr)_70px_80px_70px_40px_40px]'
          : 'grid-cols-[36px_minmax(200px,2fr)_minmax(120px,1.5fr)_70px_40px_40px]'
      } items-center px-4 py-2 border-b border-[var(--border-color)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] sticky top-0 bg-[var(--bg-primary)] z-10`}>
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

        {isDjMode && (
          <div
            onClick={() => handleHeaderSort('bpm')}
            className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)] justify-end pr-2"
          >
            <span>BPM</span>
            {sortBy === 'bpm' && <ArrowUpDown className="w-3 h-3 text-emerald-400" />}
          </div>
        )}

        {isDjMode && (
          <div
            onClick={() => handleHeaderSort('camelot_key')}
            className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)] text-center justify-center"
          >
            <span>Key</span>
            {sortBy === 'camelot_key' && <ArrowUpDown className="w-3 h-3 text-emerald-400" />}
          </div>
        )}

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

      {/* Table Rows (Virtualized Ghost Container) */}
      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
          <Music className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-semibold">No media found in this view</p>
          <p className="text-xs mt-1 opacity-70">
            Click "Scan PC" in the sidebar or drag and drop media files to add.
          </p>
        </div>
      ) : (
        <div
          style={{ height: `${totalHeight}px`, position: 'relative' }}
          className="w-full"
        >
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              willChange: 'transform',
            }}
            className="divide-y divide-[var(--border-color)]"
          >
            {visibleRowIndices.map((actualIndex) => {
              const track = tracks[actualIndex];

              if (!track) {
                return (
                  <TrackTableSkeletonRow
                    key={`ghost-${actualIndex}`}
                    actualIndex={actualIndex}
                    isDjMode={isDjMode}
                  />
                );
              }

              const isCurrent = currentTrack?.id === track.id;
              const isTrackPlaying = isCurrent && isPlaying;

              return (
                <TrackTableRow
                  key={track.id}
                  track={track}
                  actualIndex={actualIndex}
                  isCurrent={isCurrent}
                  isTrackPlaying={isTrackPlaying}
                  isDjMode={isDjMode}
                  activeMenuTrackId={activeMenuTrackId}
                  playlistSubmenuTrackId={playlistSubmenuTrackId}
                  currentView={currentView}
                  selectedPlaylist={selectedPlaylist}
                  playlists={playlists}
                  onPlay={handleRowPlay}
                  onToggleLike={toggleLikeTrack}
                  onSelectDetail={selectTrackDetail}
                  onSelectArtist={selectArtist}
                  onSelectAlbum={selectAlbumByName}
                  onEditTrack={setEditingTrack}
                  onRemoveFromPlaylist={removeTrackFromPlaylist}
                  onAddToPlaylist={addTrackToPlaylist}
                  onAddToQueue={addToQueue}
                  onToggleMenu={handleToggleMenu}
                  onTogglePlaylistSubmenu={handleTogglePlaylistSubmenu}
                  onCloseMenu={handleCloseMenu}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
