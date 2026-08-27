import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Sun, Moon, Search } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';

export const Titlebar: React.FC = () => {
  const { theme, toggleTheme, logoPath } = useThemeStore();
  const { searchQuery, setSearchQuery } = useLibraryStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

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
      {/* Brand & Logo (Image Only, Enlarged & Clean) */}
      <div
        className="titlebar-no-drag flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <img
          src={logoPath}
          alt="Purrsonica"
          className="h-7 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.location.reload()}
          title="Purrsonica"
        />
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

      {/* Theme Switcher & Window Controls */}
      <div
        className="titlebar-no-drag flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
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
