import React, { useState } from 'react';
import {
  Music,
  Heart,
  Tv,
  HardDrive,
  Disc,
  ListPlus,
  Plus,
  Zap,
  FolderInput,
  Trash2,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useLibraryStore } from '../../store/libraryStore.js';
import { useScanStore } from '../../store/scanStore.js';

export const Sidebar: React.FC = () => {
  const {
    currentView,
    selectedDrive,
    selectedPlaylist,
    drives,
    playlists,
    stats,
    setView,
    selectDrive,
    selectPlaylist,
    createPlaylist,
    deletePlaylist,
    refreshAll,
  } = useLibraryStore();

  const { setModalOpen } = useScanStore();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const handleCreatePlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
    }
  };

  const handlePickFiles = async () => {
    if (!window.api) return;
    await window.api.pickFiles();
    await refreshAll();
  };

  return (
    <aside className="w-60 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col justify-between select-none h-full text-xs">
      {/* Scrollable Top Navigation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 no-scrollbar">
        {/* Main Navigation */}
        <div className="space-y-1">
          <button
            onClick={() => setView('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
              currentView === 'all'
                ? 'bg-emerald-500 text-black font-bold shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Music className="w-4 h-4" />
              <span>All Media</span>
            </div>
            {stats && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${currentView === 'all' ? 'bg-black/20 text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                {stats.totalTracks}
              </span>
            )}
          </button>

          <button
            onClick={() => setView('liked')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
              currentView === 'liked'
                ? 'bg-emerald-500 text-black font-bold shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Heart className={`w-4 h-4 ${currentView === 'liked' ? 'fill-black' : 'fill-emerald-500 text-emerald-500'}`} />
              <span>Liked Songs</span>
            </div>
            {stats && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${currentView === 'liked' ? 'bg-black/20 text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                {stats.totalLiked}
              </span>
            )}
          </button>

          <button
            onClick={() => setView('videos')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
              currentView === 'videos'
                ? 'bg-emerald-500 text-black font-bold shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Tv className="w-4 h-4 text-purple-400" />
              <span>Videos</span>
            </div>
            {stats && stats.totalVideo > 0 && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${currentView === 'videos' ? 'bg-black/20 text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                {stats.totalVideo}
              </span>
            )}
          </button>

          <button
            onClick={() => setView('albums')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
              currentView === 'albums'
                ? 'bg-emerald-500 text-black font-bold shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Disc className="w-4 h-4" />
              <span>Albums</span>
            </div>
          </button>

          <button
            onClick={() => setView('settings')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
              currentView === 'settings'
                ? 'bg-emerald-500 text-black font-bold shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <SettingsIcon className="w-4 h-4" />
              <span>Settings</span>
            </div>
          </button>
        </div>

        {/* System Drives Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <span>Drives</span>
            <span className="text-[9px] font-normal lowercase opacity-70">
              {drives.length} detected
            </span>
          </div>

          <div className="space-y-0.5">
            {drives.map((d) => {
              const isSelected = currentView === 'drive' && selectedDrive === d.letter;
              return (
                <button
                  key={d.letter}
                  onClick={() => selectDrive(d.letter)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md transition-all ${
                    isSelected
                      ? 'bg-[var(--bg-tertiary)] text-emerald-400 font-bold border-l-2 border-emerald-500'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-3.5 h-3.5 opacity-70" />
                    <span className="truncate">{d.label}</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-60">
                    {d.trackCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Playlists Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <span>Playlists</span>
            <button
              onClick={() => setIsCreatingPlaylist(true)}
              className="text-emerald-400 hover:text-emerald-300 p-0.5"
              title="New Playlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isCreatingPlaylist && (
            <form onSubmit={handleCreatePlaylistSubmit} className="px-2 py-1 flex items-center gap-1">
              <input
                type="text"
                autoFocus
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsCreatingPlaylist(false);
                }}
                placeholder="Playlist name..."
                className="flex-1 bg-[var(--bg-tertiary)] border border-emerald-500 rounded px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
              />
              <button
                type="submit"
                className="p-1 text-emerald-400 hover:text-emerald-300 rounded bg-[var(--bg-tertiary)]"
                title="Create"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingPlaylist(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded bg-[var(--bg-tertiary)]"
                title="Cancel"
              >
                ✕
              </button>
            </form>
          )}

          <div className="space-y-0.5">
            {playlists.map((pl) => {
              const isSelected = currentView === 'playlist_detail' && selectedPlaylist?.id === pl.id;
              return (
                <div
                  key={pl.id}
                  onClick={() => selectPlaylist(pl)}
                  className={`group flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[var(--bg-tertiary)] text-emerald-400 font-bold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <ListPlus className="w-3.5 h-3.5 opacity-70" />
                    <span className="truncate">{pl.name}</span>
                  </div>

                  {!pl.is_system && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlaylist(pl.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-rose-400 p-0.5"
                      title="Delete Playlist"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-2">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold shadow-md transition-all hover:scale-[1.02]"
        >
          <Zap className="w-4 h-4 fill-black" />
          <span>Scan PC</span>
        </button>

        <button
          onClick={handlePickFiles}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium border border-[var(--border-color)] transition-colors"
        >
          <FolderInput className="w-4 h-4 text-emerald-400" />
          <span>Import Files</span>
        </button>
      </div>
    </aside>
  );
};
