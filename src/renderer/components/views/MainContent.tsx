import React, { useState } from 'react';
import {
  Music,
  Heart,
  Tv,
  HardDrive,
  Disc,
  ListPlus,
  Play,
  Clock,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { useLibraryStore } from '../../store/libraryStore.js';
import { usePlayerStore } from '../../store/playerStore.js';
import { TrackTable } from '../common/TrackTable.js';
import { PlaylistEditModal } from '../modals/PlaylistEditModal.js';
import { SettingsView } from './SettingsView.js';
import { formatDuration, formatFileSize } from '../../../shared/formatters.js';

export const MainContent: React.FC = () => {
  const {
    currentView,
    selectedDrive,
    selectedAlbum,
    selectedPlaylist,
    tracks,
    totalTracks,
    isLoading,
    albums,
    playlists,
    stats,
    selectAlbum,
    selectPlaylist,
  } = useLibraryStore();

  const { setTrack } = usePlayerStore();
  const [isEditingPlaylist, setIsEditingPlaylist] = useState(false);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      setTrack(tracks[0], tracks);
    }
  };

  const playlistCoverUrl = selectedPlaylist?.cover_art_path && window.api
    ? window.api.getCoverUrl(selectedPlaylist.cover_art_path)
    : null;

  // Render Settings View
  if (currentView === 'settings') {
    return <SettingsView />;
  }

  return (
    <main className="flex-1 bg-[var(--bg-primary)] overflow-hidden flex flex-col h-full select-none">
      {/* Dynamic View Header Banner */}
      <div className="p-6 pb-4 border-b border-[var(--border-color)] bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)]">
        {/* All Media View Header */}
        {currentView === 'all' && (
          <div className="flex items-end gap-5">
            <div className="w-28 h-28 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl">
              <Music className="w-14 h-14" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Local Library
              </span>
              <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
                All Media
              </h1>
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <span>{totalTracks} items</span>
                <span>•</span>
                <span>{stats ? formatDuration(stats.totalDuration) : '0:00'} total</span>
                <span>•</span>
                <span>{stats ? formatFileSize(stats.totalSize) : '0 B'}</span>
              </div>
            </div>
            {tracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black flex items-center justify-center shadow-xl transition-all hover:scale-105"
                title="Play All"
              >
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </button>
            )}
          </div>
        )}

        {/* Liked Songs Header */}
        {currentView === 'liked' && (
          <div className="flex items-end gap-5">
            <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-xl">
              <Heart className="w-14 h-14 fill-white" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Collection
              </span>
              <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
                Liked Songs
              </h1>
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <span>{totalTracks} favorite tracks</span>
              </div>
            </div>
            {tracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black flex items-center justify-center shadow-xl transition-all hover:scale-105"
                title="Play All"
              >
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </button>
            )}
          </div>
        )}

        {/* Drive View Header */}
        {currentView === 'drive' && (
          <div className="flex items-end gap-5">
            <div className="w-28 h-28 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-xl">
              <HardDrive className="w-14 h-14" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Physical Storage
              </span>
              <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
                Drive {selectedDrive}
              </h1>
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <span>{totalTracks} tracks stored on this drive</span>
              </div>
            </div>
            {tracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black flex items-center justify-center shadow-xl transition-all hover:scale-105"
                title="Play All"
              >
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </button>
            )}
          </div>
        )}

        {/* Videos View Header */}
        {currentView === 'videos' && (
          <div className="flex items-end gap-5">
            <div className="w-28 h-28 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-xl">
              <Tv className="w-14 h-14" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Video Library
              </span>
              <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
                Videos
              </h1>
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <span>{totalTracks} video files</span>
              </div>
            </div>
            {tracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black flex items-center justify-center shadow-xl transition-all hover:scale-105"
                title="Play All"
              >
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </button>
            )}
          </div>
        )}

        {/* Album Detail Header */}
        {currentView === 'album_detail' && selectedAlbum && (
          <div className="flex items-end gap-5">
            <div className="w-28 h-28 rounded-xl bg-[var(--bg-tertiary)] overflow-hidden border border-[var(--border-color)] shadow-xl flex items-center justify-center">
              {selectedAlbum.cover_art_path && window.api ? (
                <img
                  src={window.api.getCoverUrl(selectedAlbum.cover_art_path) || ''}
                  alt={selectedAlbum.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Disc className="w-14 h-14 text-[var(--text-muted)]" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Album
              </span>
              <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
                {selectedAlbum.name}
              </h1>
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">
                  {selectedAlbum.artist}
                </span>
                {selectedAlbum.year && (
                  <>
                    <span>•</span>
                    <span>{selectedAlbum.year}</span>
                  </>
                )}
                <span>•</span>
                <span>{totalTracks} songs</span>
              </div>
            </div>
            {tracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black flex items-center justify-center shadow-xl transition-all hover:scale-105"
                title="Play All"
              >
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </button>
            )}
          </div>
        )}

        {/* Playlist Detail Header */}
        {currentView === 'playlist_detail' && selectedPlaylist && (
          <div className="flex items-end gap-5">
            <div
              onClick={() => !selectedPlaylist.is_system && setIsEditingPlaylist(true)}
              className={`w-28 h-28 rounded-xl overflow-hidden shadow-xl flex items-center justify-center relative group ${
                !selectedPlaylist.is_system ? 'cursor-pointer' : ''
              } bg-gradient-to-br from-indigo-600 to-purple-800 text-white`}
            >
              {playlistCoverUrl ? (
                <img src={playlistCoverUrl} alt={selectedPlaylist.name} className="w-full h-full object-cover" />
              ) : (
                <ListPlus className="w-14 h-14" />
              )}

              {!selectedPlaylist.is_system && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                  <Edit3 className="w-5 h-5 mr-1" />
                  <span>Edit</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Custom Playlist
              </span>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
                  {selectedPlaylist.name}
                </h1>
                {!selectedPlaylist.is_system && (
                  <button
                    onClick={() => setIsEditingPlaylist(true)}
                    className="p-1.5 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-emerald-400 transition-colors"
                    title="Edit Playlist Details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <span>{totalTracks} tracks</span>
                {selectedPlaylist.description && (
                  <>
                    <span>•</span>
                    <span className="text-[var(--text-muted)] italic">{selectedPlaylist.description}</span>
                  </>
                )}
              </div>
            </div>

            {tracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black flex items-center justify-center shadow-xl transition-all hover:scale-105"
                title="Play All"
              >
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </button>
            )}
          </div>
        )}

        {/* Search Results Header */}
        {currentView === 'search' && (
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Search Results
            </span>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Showing {totalTracks} results
            </h1>
          </div>
        )}
      </div>

      {/* Albums Grid View */}
      {currentView === 'albums' ? (
        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          {albums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
              <Disc className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-semibold">No albums found in your library</p>
              <p className="text-xs mt-1 opacity-70">
                Scan your music folders or drag and drop files to index albums.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-12">
              {albums.map((album) => {
                const coverUrl = album.cover_art_path && window.api
                  ? window.api.getCoverUrl(album.cover_art_path)
                  : null;

                return (
                  <div
                    key={album.id}
                    onClick={() => selectAlbum(album)}
                    className="group bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-color)] cursor-pointer transition-all hover:shadow-xl"
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-[var(--bg-primary)] mb-2.5 relative flex items-center justify-center shadow-sm">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={album.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Disc className="w-12 h-12 text-[var(--text-muted)] opacity-50" />
                      )}
                    </div>
                    <div className="font-bold text-xs text-[var(--text-primary)] truncate">
                      {album.name}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] truncate">
                      {album.artist}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                      {album.track_count} tracks {album.year ? `• ${album.year}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Standard Track Table List (Virtualized) */
        <div className="flex-1 min-h-0 relative">
          <TrackTable tracks={tracks} />
        </div>
      )}

      {/* Playlist Edit Modal */}
      {isEditingPlaylist && selectedPlaylist && (
        <PlaylistEditModal
          playlist={selectedPlaylist}
          onClose={() => setIsEditingPlaylist(false)}
        />
      )}
    </main>
  );
};
