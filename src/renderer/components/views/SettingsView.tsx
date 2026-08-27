import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  HardDrive,
  FolderPlus,
  Trash2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Database,
  Music,
  Tv,
  Activity,
  Layers,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useThemeStore } from '../../store/themeStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { useScanStore } from '../../store/scanStore.js';
import { useUpdateStore } from '../../store/updateStore.js';
import { formatDuration, formatFileSize } from '../../../shared/formatters.js';

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useThemeStore();
  const { drives, stats, refreshAll } = useLibraryStore();
  const {
    settings,
    fetchSettings,
    saveSettings,
    addExclusion,
    removeExclusion,
    setModalOpen,
  } = useScanStore();
  const { status: updateStatus, isChecking, checkForUpdates, installUpdate } = useUpdateStore();

  const [newExclusion, setNewExclusion] = useState('');

  useEffect(() => {
    if (!settings) {
      fetchSettings();
    }
  }, [settings, fetchSettings]);

  const currentSettings = settings || {
    scannedDrives: [],
    customFolders: [],
    excludedPaths: [],
    scanAudio: true,
    scanVideo: true,
    generateWaveforms: true,
    autoDetectKeyBpm: true,
  };

  const handleAddExclusion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExclusion.trim()) return;
    await addExclusion(newExclusion.trim());
    setNewExclusion('');
  };

  const handleToggleAudio = async () => {
    await saveSettings({ ...currentSettings, scanAudio: !currentSettings.scanAudio });
  };

  const handleToggleVideo = async () => {
    await saveSettings({ ...currentSettings, scanVideo: !currentSettings.scanVideo });
  };

  const handleToggleWaveforms = async () => {
    await saveSettings({ ...currentSettings, generateWaveforms: !currentSettings.generateWaveforms });
  };

  const handleToggleKeyBpm = async () => {
    await saveSettings({ ...currentSettings, autoDetectKeyBpm: !currentSettings.autoDetectKeyBpm });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[var(--bg-primary)] text-[var(--text-primary)] select-none max-w-4xl mx-auto w-full">
      {/* Settings Header */}
      <div className="border-b border-[var(--border-color)] pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Settings</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Configure Purrsonica preferences, scanning rules, and storage
            </p>
          </div>
        </div>
        <div className="text-xs font-mono px-2.5 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-muted)]">
          v1.0.2
        </div>
      </div>

      {/* Section 1: Appearance */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <Sun className="w-4 h-4 text-emerald-400" />
          <span>Appearance & Theme</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dark Mode Card */}
          <div
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              theme === 'dark'
                ? 'bg-neutral-900 border-emerald-500 shadow-lg ring-1 ring-emerald-500/50'
                : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-neutral-800 text-purple-400">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-white">Dark Theme</div>
                <div className="text-xs text-neutral-400">Deep obsidian background & glowing accents</div>
              </div>
            </div>
            {theme === 'dark' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          </div>

          {/* Light Mode Card */}
          <div
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              theme === 'light'
                ? 'bg-neutral-100 text-black border-emerald-500 shadow-lg ring-1 ring-emerald-500/50'
                : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-neutral-200 text-amber-500">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-[var(--text-primary)]">Light Theme</div>
                <div className="text-xs text-[var(--text-muted)]">Clean, high-contrast daylight aesthetic</div>
              </div>
            </div>
            {theme === 'light' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          </div>
        </div>
      </section>

      {/* Section 2: Library & Scanner Rules */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Library & Scanner Preferences</span>
          </h2>
          <button
            onClick={() => setModalOpen(true)}
            className="text-xs font-semibold px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black shadow transition-all"
          >
            Open Scanner Modal
          </button>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Audio Toggle */}
            <div
              onClick={handleToggleAudio}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Music className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-xs text-[var(--text-primary)]">Index Audio Files</div>
                  <div className="text-[11px] text-[var(--text-muted)]">MP3, FLAC, WAV, M4A, AAC, OGG, OPUS</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={currentSettings.scanAudio}
                onChange={() => {}}
                className="w-4 h-4 accent-emerald-500 pointer-events-none"
              />
            </div>

            {/* Video Toggle */}
            <div
              onClick={handleToggleVideo}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Tv className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="font-semibold text-xs text-[var(--text-primary)]">Index Video Files</div>
                  <div className="text-[11px] text-[var(--text-muted)]">MP4, MKV, WEBM, MOV, AVI</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={currentSettings.scanVideo}
                onChange={() => {}}
                className="w-4 h-4 accent-emerald-500 pointer-events-none"
              />
            </div>

            {/* Waveforms Toggle */}
            <div
              onClick={handleToggleWaveforms}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-semibold text-xs text-[var(--text-primary)]">Generate Waveform Data</div>
                  <div className="text-[11px] text-[var(--text-muted)]">128-bar loudness amplitude curves</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={currentSettings.generateWaveforms}
                onChange={() => {}}
                className="w-4 h-4 accent-emerald-500 pointer-events-none"
              />
            </div>

            {/* Key/BPM Detection */}
            <div
              onClick={handleToggleKeyBpm}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="font-semibold text-xs text-[var(--text-primary)]">Camelot & BPM Analysis</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Harmonic mixing key recognition</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={currentSettings.autoDetectKeyBpm}
                onChange={() => {}}
                className="w-4 h-4 accent-emerald-500 pointer-events-none"
              />
            </div>
          </div>

          {/* Exclusions Manager */}
          <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-secondary)]">
                Excluded Folders & Patterns
              </label>
              <span className="text-[11px] text-[var(--text-muted)]">
                Windows system paths are skipped by default
              </span>
            </div>

            <form onSubmit={handleAddExclusion} className="flex gap-2">
              <input
                type="text"
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                placeholder="e.g. C:\Users\User\Downloads or games..."
                className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-emerald-500 rounded-md px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)]"
              >
                Add Rule
              </button>
            </form>

            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {currentSettings.excludedPaths.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-secondary)] group font-mono"
                >
                  <span className="truncate">{rule}</span>
                  <button
                    onClick={() => removeExclusion(rule)}
                    className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 p-1 transition-opacity"
                    title="Remove rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Storage & Maintenance */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Storage & Database Stats</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
            <div className="text-[11px] text-[var(--text-muted)] font-semibold">Total Indexed Media</div>
            <div className="text-xl font-black mt-1 text-[var(--text-primary)] font-mono">
              {stats?.totalTracks || 0}
            </div>
          </div>

          <div className="p-3.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
            <div className="text-[11px] text-[var(--text-muted)] font-semibold">Audio Tracks</div>
            <div className="text-xl font-black mt-1 text-emerald-400 font-mono">
              {stats?.totalAudio || 0}
            </div>
          </div>

          <div className="p-3.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
            <div className="text-[11px] text-[var(--text-muted)] font-semibold">Video Files</div>
            <div className="text-xl font-black mt-1 text-purple-400 font-mono">
              {stats?.totalVideo || 0}
            </div>
          </div>

          <div className="p-3.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
            <div className="text-[11px] text-[var(--text-muted)] font-semibold">Estimated Library Size</div>
            <div className="text-xl font-black mt-1 text-[var(--text-primary)] font-mono">
              {stats ? formatFileSize(stats.totalSize) : '0 B'}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Auto-Updates & About */}
      <section className="space-y-4 pb-12">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Updates & Information</span>
        </h2>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-[var(--text-primary)]">Purrsonica v1.0.2</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {updateStatus.state === 'downloaded' ? (
                  <span className="text-emerald-400 font-semibold">
                    New version v{updateStatus.version} is downloaded and ready to install!
                  </span>
                ) : updateStatus.state === 'downloading' ? (
                  <span className="text-cyan-400">
                    Downloading update ({updateStatus.percent || 0}%)...
                  </span>
                ) : updateStatus.state === 'checking' ? (
                  <span>Checking GitHub Releases for new updates...</span>
                ) : (
                  <span>Automatic background updates check every 1 hour</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {updateStatus.state === 'downloaded' ? (
                <button
                  onClick={installUpdate}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-md shadow-md transition-all animate-pulse"
                >
                  Restart & Install
                </button>
              ) : (
                <button
                  onClick={checkForUpdates}
                  disabled={isChecking}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold rounded-md shadow-sm transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Checking...' : 'Check for Updates'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Engineered with Electron, React, TypeScript & SQLite</span>
            <a
              href="https://github.com/AFuxy/Purrsonica"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-emerald-400 hover:underline"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
