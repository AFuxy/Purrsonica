import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Sun, Moon, Search, Settings as SettingsIcon, Sparkles, RefreshCw, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { useUpdateStore } from '../../store/updateStore.js';
import { useMaintenanceStore } from '../../store/maintenanceStore.js';

export const Titlebar: React.FC = () => {
  const { theme, toggleTheme, logoPath } = useThemeStore();
  const { searchQuery, setSearchQuery, currentView, setView, goBack, goForward, canGoBack, canGoForward } = useLibraryStore();
  const { status: updateStatus } = useUpdateStore();
  const { artworkTask, waveformTask, cancelArtworkRecache, cancelWaveformRecache } = useMaintenanceStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Global Navigation Shortcuts (Alt + Left/Right, Mouse 4 & 5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.altKey && e.key === 'ArrowLeft') || e.key === 'BrowserBack') {
        e.preventDefault();
        goBack();
      } else if ((e.altKey && e.key === 'ArrowRight') || e.key === 'BrowserForward') {
        e.preventDefault();
        goForward();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        goBack();
      } else if (e.button === 4) {
        e.preventDefault();
        goForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canGoBack, canGoForward, goBack, goForward]);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [localSearch]);

  useEffect(() => {
    const checkMaximized = async () => {
      if (window.api) {
        const max = await window.api.isMaximized();
        setIsMaximized(max);
      }
    };
    checkMaximized();

    const handleResize = () => checkMaximized();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMinimize = () => window.api?.minimize();
  const handleMaximize = async () => {
    await window.api?.maximize();
    const max = await window.api?.isMaximized();
    setIsMaximized(!!max);
  };
  const handleClose = () => window.api?.close();

  return (
    <header className="titlebar-drag-region h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-4 z-50 select-none">
      {/* Brand, Logo & Navigation History Controls */}
      <div
        className="titlebar-no-drag flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <img
          src={logoPath}
          alt="Purrsonica"
          className="h-7 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setView('all')}
          title="Purrsonica"
        />

        {/* Back and Forward Navigation History Buttons */}
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-25 disabled:hover:bg-transparent disabled:pointer-events-none transition-all cursor-pointer"
            title="Go Back (Alt + Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-25 disabled:hover:bg-transparent disabled:pointer-events-none transition-all cursor-pointer"
            title="Go Forward (Alt + Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Artwork Caching Live Progress Pill */}
        {artworkTask.isActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] shadow-sm">
            <RefreshCw className="w-3 h-3 animate-spin flex-shrink-0" />
            <button
              onClick={() => setView('settings')}
              className="hover:underline font-medium cursor-pointer"
              title="Caching artwork. Click to open Settings."
            >
              Art ({artworkTask.current}/{artworkTask.total})
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancelArtworkRecache();
              }}
              className="text-emerald-400/70 hover:text-white ml-0.5 p-0.5 rounded transition-colors"
              title="Cancel Artwork Caching"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Waveform Generation Live Progress Pill */}
        {waveformTask.isActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[11px] shadow-sm">
            <Activity className="w-3 h-3 animate-pulse flex-shrink-0" />
            <button
              onClick={() => setView('settings')}
              className="hover:underline font-medium cursor-pointer"
              title="Generating waveforms. Click to open Settings."
            >
              Waveforms ({waveformTask.current}/{waveformTask.total})
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancelWaveformRecache();
              }}
              className="text-cyan-400/70 hover:text-white ml-0.5 p-0.5 rounded transition-colors"
              title="Cancel Waveform Generation"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Compact Navbar Update Pill Notification */}
        {updateStatus.state === 'downloaded' && !artworkTask.isActive && !waveformTask.isActive && (
          <button
            onClick={() => setView('settings')}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold shadow-sm hover:bg-emerald-500/30 transition-all cursor-pointer animate-pulse"
            title="Update downloaded and ready to install! Click to open Settings."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <Sparkles className="w-3 h-3 text-emerald-300" />
            <span>v{updateStatus.version} Ready</span>
          </button>
        )}

        {updateStatus.state === 'downloading' && !artworkTask.isActive && !waveformTask.isActive && (
          <button
            onClick={() => setView('settings')}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[11px] font-semibold transition-all cursor-pointer"
            title={`Downloading update (${updateStatus.percent || 0}%)... Click to view.`}
          >
            <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
            <span>Updating ({updateStatus.percent || 0}%)</span>
          </button>
        )}

        {updateStatus.state === 'available' && !artworkTask.isActive && !waveformTask.isActive && (
          <button
            onClick={() => setView('settings')}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[11px] font-semibold transition-all cursor-pointer"
            title="New update available! Click to view in Settings."
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>New Update</span>
          </button>
        )}
      </div>

      {/* Global Search Bar */}
      <div
        className="titlebar-no-drag flex-1 max-w-md mx-6"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search tracks, artists, albums, or keys (e.g. 8A, 128 bpm)..."
            className="w-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] focus:bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs rounded-full pl-9 pr-8 py-1.5 border border-transparent focus:border-[var(--accent)] transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Theme Switcher, Settings & Window Controls */}
      <div
        className="titlebar-no-drag flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          onClick={() => setView(currentView === 'settings' ? 'all' : 'settings')}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          title="Settings"
          className={`p-1.5 rounded-md transition-colors mr-1 cursor-pointer ${
            currentView === 'settings'
              ? 'text-emerald-400 bg-[var(--bg-tertiary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
        </button>

        <button
          onClick={toggleTheme}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors mr-2 cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={handleMinimize}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors rounded-sm cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors rounded-sm cursor-pointer"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleClose}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-rose-600 transition-colors rounded-sm cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
