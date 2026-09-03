import React, { useState, useEffect } from 'react';
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
  Radio,
  FlaskConical,
  Palette,
  Database,
  Info,
  Flame,
  ChevronDown,
} from 'lucide-react';
import { useLibraryStore, SettingsTabId } from '../../store/libraryStore.js';
import { useScanStore } from '../../store/scanStore.js';
import { useFeatureFlagStore, useFeatureFlagValue } from '../../store/featureFlagStore.js';

const SIDEBAR_SETTINGS_TABS: {
  id: SettingsTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'library', label: 'Library & Audio', icon: Music },
  { id: 'dj', label: 'DJ Suite', icon: Radio },
  { id: 'maintenance', label: 'Maintenance', icon: Database },
  { id: 'system', label: 'System & Updates', icon: Info },
  { id: 'danger', label: 'Danger Zone', icon: Flame, danger: true },
];

export const Sidebar: React.FC = () => {
  const {
    currentView,
    selectedDrive,
    selectedPlaylist,
    drives,
    playlists,
    stats,
    setView,
    openSettings,
    activeSettingsTab,
    selectDrive,
    selectPlaylist,
    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    toggleLikeTrack,
    refreshAll,
  } = useLibraryStore();

  const { settings, setModalOpen } = useScanStore();
  const { isDevMode } = useFeatureFlagStore();
  const settingsNavMode = useFeatureFlagValue<'off' | 'tabs' | 'submenu'>('SETTINGS_TABBED_LAYOUT') || 'off';
  const isDjMode = !!settings?.enableDjMode;
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(currentView === 'settings');

  // Automatically collapse Settings submenu when navigating outside the Settings view
  useEffect(() => {
    setIsSettingsExpanded(currentView === 'settings');
  }, [currentView]);
  const [draggedOverPlaylistId, setDraggedOverPlaylistId] = useState<string | null>(null);
  const [draggedOverLiked, setDraggedOverLiked] = useState(false);
  const [dropToast, setDropToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setDropToast(msg);
    setTimeout(() => {
      setDropToast(null);
    }, 2500);
  };

  const extractTrackId = (e: React.DragEvent): string | null => {
    const custom = e.dataTransfer.getData('application/purrsonica-track');
    if (custom) return custom;
    try {
      const json = e.dataTransfer.getData('application/json');
      if (json) {
        const parsed = JSON.parse(json);
        if (parsed.trackId) return parsed.trackId;
      }
    } catch {}
    const text = e.dataTransfer.getData('text/plain');
    if (text && !text.startsWith('http') && !text.startsWith('file://')) return text;
    return null;
  };

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
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setDraggedOverLiked(true);
            }}
            onDragLeave={() => setDraggedOverLiked(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDraggedOverLiked(false);
              const trackId = extractTrackId(e);
              if (trackId) {
                await toggleLikeTrack(trackId);
                triggerToast('Added to Liked Songs');
              }
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
              draggedOverLiked
                ? 'bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500 scale-[1.02]'
                : currentView === 'liked'
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

          {isDjMode && (
            <button
              onClick={() => setView('dj_matcher')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
                currentView === 'dj_matcher'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold shadow-md'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>DJ Matcher</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DJ
              </span>
            </button>
          )}

          {settingsNavMode === 'submenu' ? (
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (currentView !== 'settings') {
                    openSettings(activeSettingsTab || 'appearance');
                    setIsSettingsExpanded(true);
                  } else {
                    setIsSettingsExpanded(!isSettingsExpanded);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                  currentView === 'settings'
                    ? 'bg-emerald-500 text-black font-bold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <SettingsIcon className="w-4 h-4" />
                  <span>Settings</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isSettingsExpanded ? 'rotate-0' : '-rotate-90 opacity-60'
                  }`}
                />
              </button>

              {/* Collapsible Sub-menu Items */}
              {isSettingsExpanded && (
                <div className="pl-3 py-0.5 space-y-0.5 border-l border-[var(--border-color)] ml-4.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {SIDEBAR_SETTINGS_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = currentView === 'settings' && activeSettingsTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => openSettings(tab.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer text-left ${
                          isActive
                            ? tab.danger
                              ? 'bg-rose-500/20 text-rose-300 font-bold'
                              : 'bg-emerald-500/15 text-emerald-400 font-bold'
                            : tab.danger
                            ? 'text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              isActive
                                ? tab.danger
                                  ? 'text-rose-400'
                                  : 'text-emerald-400'
                                : 'text-[var(--text-muted)]'
                            }`}
                          />
                          <span className="truncate">{tab.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openSettings()}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
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
          )}

          {/* Developer Labs (Strictly visible only when isDevMode is active) */}
          {isDevMode && (
            <button
              onClick={() => setView('labs')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
                currentView === 'labs'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-md'
                  : 'text-purple-300 hover:bg-purple-950/30 hover:text-purple-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FlaskConical className="w-4 h-4 text-purple-400" />
                <span>Labs</span>
              </div>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                DEV
              </span>
            </button>
          )}
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
              const isDraggedOver = draggedOverPlaylistId === pl.id;

              return (
                <div
                  key={pl.id}
                  onClick={() => selectPlaylist(pl)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    setDraggedOverPlaylistId(pl.id);
                  }}
                  onDragLeave={() => setDraggedOverPlaylistId(null)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDraggedOverPlaylistId(null);
                    const trackId = extractTrackId(e);
                    if (trackId) {
                      await addTrackToPlaylist(pl.id, trackId);
                      triggerToast(`Added to "${pl.name}"`);
                    }
                  }}
                  className={`group flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                    isDraggedOver
                      ? 'bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500 scale-[1.02]'
                      : isSelected
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

      {/* Floating Drop Feedback Toast */}
      {dropToast && (
        <div className="mx-3 mb-2 bg-emerald-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2 text-center pointer-events-none truncate">
          {dropToast}
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-2">
        {(!stats || stats.totalTracks === 0) && (
          <button
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold shadow-md transition-all hover:scale-[1.02] cursor-pointer animate-in fade-in"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>Scan PC</span>
          </button>
        )}

        <button
          onClick={handlePickFiles}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium border border-[var(--border-color)] transition-colors cursor-pointer"
        >
          <FolderInput className="w-4 h-4 text-emerald-400" />
          <span>Import Files</span>
        </button>
      </div>
    </aside>
  );
};
