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
  AlertTriangle,
  Flame,
  Image as ImageIcon,
  AudioWaveform,
  FileText,
  ChevronDown,
  ChevronUp,
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Artwork recache state
  const [isRecaching, setIsRecaching] = useState(false);
  const [recacheProgress, setRecacheProgress] = useState<{ current: number; total: number } | null>(null);

  // Waveform recache state
  const [isRecachingWaveforms, setIsRecachingWaveforms] = useState(false);
  const [waveformProgress, setWaveformProgress] = useState<{ current: number; total: number } | null>(null);

  // Patch Notes Expansion
  const [showPatchNotes, setShowPatchNotes] = useState(true);

  // Danger Zone Confirmation States
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmFactoryReset, setConfirmFactoryReset] = useState(false);
  const [isProcessingDangerAction, setIsProcessingDangerAction] = useState(false);

  useEffect(() => {
    if (!settings) {
      fetchSettings();
    }
  }, [settings, fetchSettings]);

  useEffect(() => {
    if (window.api?.onRecacheProgress) {
      const unsub = window.api.onRecacheProgress((p) => {
        setRecacheProgress(p);
      });
      return () => {
        unsub();
      };
    }
  }, []);

  useEffect(() => {
    if (window.api?.onRecacheWaveformsProgress) {
      const unsub = window.api.onRecacheWaveformsProgress((p) => {
        setWaveformProgress(p);
      });
      return () => {
        unsub();
      };
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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

  const handleRecacheArtwork = async () => {
    if (!window.api || isRecaching) return;
    setIsRecaching(true);
    setRecacheProgress(null);
    try {
      const result = await window.api.recacheArtwork();
      await refreshAll();
      showToast(`Artwork re-cached: ${result.updatedCount} tracks updated`);
    } catch (err) {
      showToast('Error re-caching artwork');
    } finally {
      setIsRecaching(false);
      setRecacheProgress(null);
    }
  };

  const handleRecacheWaveforms = async () => {
    if (!window.api || isRecachingWaveforms) return;
    setIsRecachingWaveforms(true);
    setWaveformProgress(null);
    try {
      const result = await window.api.recacheWaveforms();
      await refreshAll();
      showToast(`Waveforms generated: ${result.generatedCount} tracks computed`);
    } catch (err) {
      showToast('Error generating waveforms');
    } finally {
      setIsRecachingWaveforms(false);
      setWaveformProgress(null);
    }
  };

  const handleClearCache = async () => {
    if (!window.api) return;
    setIsProcessingDangerAction(true);
    try {
      await window.api.clearCache();
      showToast('Artwork thumbnail cache cleared successfully');
    } catch (err) {
      showToast('Error clearing cache');
    } finally {
      setIsProcessingDangerAction(false);
    }
  };

  const handleWipeLibrary = async () => {
    if (!window.api) return;
    setIsProcessingDangerAction(true);
    try {
      await window.api.wipeLibrary();
      await refreshAll();
      setConfirmWipe(false);
      showToast('Library wiped. Click Scan PC to re-index');
    } catch (err) {
      showToast('Error wiping library');
    } finally {
      setIsProcessingDangerAction(false);
    }
  };

  const handleFactoryReset = async () => {
    if (!window.api) return;
    setIsProcessingDangerAction(true);
    try {
      await window.api.factoryReset();
      await refreshAll();
      setConfirmFactoryReset(false);
      showToast('Factory reset complete. All data restored to default');
    } catch (err) {
      showToast('Error executing factory reset');
    } finally {
      setIsProcessingDangerAction(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto min-h-0 bg-[var(--bg-primary)] text-[var(--text-primary)] select-none relative">
      <div className="max-w-4xl mx-auto p-8 space-y-8 pb-24">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-24 right-8 bg-neutral-900 border border-emerald-500/50 text-emerald-400 px-4 py-2.5 rounded-xl shadow-2xl z-50 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

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
          v1.1.0
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
          <span>Storage & Maintenance</span>
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

        {/* Maintenance Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Artwork Re-Caching Card */}
          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Re-extract & Cache Artwork</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Re-scans embedded ID3 picture tags and local folder cover files (folder.jpg, cover.jpg) without wiping your library.
              </div>
            </div>

            <button
              onClick={handleRecacheArtwork}
              disabled={isRecaching || isRecachingWaveforms}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold rounded-md shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecaching ? 'animate-spin text-emerald-400' : ''}`} />
              <span>
                {isRecaching
                  ? recacheProgress
                    ? `Re-caching (${recacheProgress.current}/${recacheProgress.total})...`
                    : 'Re-caching...'
                  : 'Re-cache Artwork'}
              </span>
            </button>
          </div>

          {/* Waveforms Re-Generation Card */}
          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Re-generate All Waveforms</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Pre-computes 128-bar energy amplitude curves for all audio tracks for instant playback rendering.
              </div>
            </div>

            <button
              onClick={handleRecacheWaveforms}
              disabled={isRecaching || isRecachingWaveforms}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold rounded-md shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecachingWaveforms ? 'animate-spin text-cyan-400' : ''}`} />
              <span>
                {isRecachingWaveforms
                  ? waveformProgress
                    ? `Generating (${waveformProgress.current}/${waveformProgress.total})...`
                    : 'Generating...'
                  : 'Re-generate Waveforms'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 4: Auto-Updates & About */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Updates & Information</span>
        </h2>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-[var(--text-primary)]">Purrsonica v1.1.0</div>
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

          {/* Dynamic Release Patch Notes Box (When update is available or downloaded) */}
          {updateStatus.releaseNotes && (
            <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  What's New in v{updateStatus.version}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  Release Notes
                </span>
              </div>
              <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3 max-h-48 overflow-y-auto text-xs text-[var(--text-secondary)] whitespace-pre-line leading-relaxed font-sans select-text">
                {updateStatus.releaseNotes}
              </div>
            </div>
          )}

          {/* Current Version Patch Notes / Highlights Accordion */}
          {!updateStatus.releaseNotes && (
            <div className="pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowPatchNotes(!showPatchNotes)}
                className="w-full flex items-center justify-between text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors py-1"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  v1.1.0 Release Highlights & Changelog
                </span>
                {showPatchNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showPatchNotes && (
                <div className="mt-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3 text-xs text-[var(--text-secondary)] space-y-2">
                  <div className="font-bold text-[var(--text-primary)] text-xs">v1.1.0 — Settings & Maintenance Hub</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-[var(--text-muted)]">
                    <li><strong className="text-[var(--text-primary)]">Settings Hub</strong>: Preferences, scanner toggles, exclusions, and storage stats.</li>
                    <li><strong className="text-[var(--text-primary)]">Maintenance Suite</strong>: Re-extract ID3 & folder artwork, re-generate 128-bar waveforms.</li>
                    <li><strong className="text-[var(--text-primary)]">Danger Zone</strong>: Cache cleaner, library reset, and factory reset tools.</li>
                    <li><strong className="text-[var(--text-primary)]">Media Streaming</strong>: HTTP 206 Partial Content Range streaming with exact MIME headers.</li>
                    <li><strong className="text-[var(--text-primary)]">Navigation</strong>: Clickable album names across song tables and now playing sidebar.</li>
                  </ul>
                </div>
              )}
            </div>
          )}

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

      {/* Section 5: Danger Zone */}
      <section className="space-y-4 pb-16">
        <h2 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-500" />
          <span>Danger Zone</span>
        </h2>

        <div className="border border-rose-500/30 bg-rose-500/5 rounded-xl p-5 space-y-4">
          {/* Action 1: Clear Thumbnail Cache */}
          <div className="flex items-center justify-between py-2 border-b border-rose-500/20">
            <div className="pr-4">
              <div className="font-bold text-xs text-[var(--text-primary)]">Clear Artwork Cache</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Deletes all cached album art thumbnails to reclaim storage. Artwork will re-cache on demand.
              </div>
            </div>
            <button
              onClick={handleClearCache}
              disabled={isProcessingDangerAction}
              className="px-3 py-1.5 rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors flex-shrink-0 disabled:opacity-50"
            >
              Clear Cache
            </button>
          </div>

          {/* Action 2: Wipe Library Index */}
          <div className="flex items-center justify-between py-2 border-b border-rose-500/20">
            <div className="pr-4">
              <div className="font-bold text-xs text-[var(--text-primary)]">Wipe Library Index</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Removes all scanned tracks and albums from SQLite. Your local files and custom playlists remain safe.
              </div>
            </div>

            {confirmWipe ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleWipeLibrary}
                  disabled={isProcessingDangerAction}
                  className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-colors"
                >
                  Yes, Wipe All
                </button>
                <button
                  onClick={() => setConfirmWipe(false)}
                  className="px-2.5 py-1.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmWipe(true)}
                className="px-3 py-1.5 rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors flex-shrink-0"
              >
                Wipe Library
              </button>
            )}
          </div>

          {/* Action 3: Factory Reset */}
          <div className="flex items-center justify-between py-2">
            <div className="pr-4">
              <div className="font-bold text-xs text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Factory Reset Purrsonica</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Permanently wipes all indexed tracks, playlists, favorites, custom metadata tags, and settings.
              </div>
            </div>

            {confirmFactoryReset ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleFactoryReset}
                  disabled={isProcessingDangerAction}
                  className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-colors animate-pulse"
                >
                  Confirm Reset
                </button>
                <button
                  onClick={() => setConfirmFactoryReset(false)}
                  className="px-2.5 py-1.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmFactoryReset(true)}
                className="px-3 py-1.5 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors flex-shrink-0 shadow-sm"
              >
                Factory Reset
              </button>
            )}
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};
