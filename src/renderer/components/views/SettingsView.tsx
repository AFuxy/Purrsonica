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
  Share2,
  Radio,
  Palette,
  Check,
} from 'lucide-react';
import { useThemeStore, ACCENT_PRESETS } from '../../store/themeStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { useScanStore } from '../../store/scanStore.js';
import { useUpdateStore } from '../../store/updateStore.js';
import { useMaintenanceStore } from '../../store/maintenanceStore.js';
import { APP_CHANGELOGS } from '../../data/changelogs.js';
import { formatDuration, formatFileSize } from '../../../shared/formatters.js';
import { ScanSettings } from '../../../shared/types.js';

export const SettingsView: React.FC = () => {
  const { theme, setTheme, accentColor, accentPreset, setAccentColor } = useThemeStore();
  const [customHexInput, setCustomHexInput] = useState(accentColor);

  useEffect(() => {
    setCustomHexInput(accentColor);
  }, [accentColor]);
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
  const {
    artworkTask,
    waveformTask,
    startArtworkRecache,
    cancelArtworkRecache,
    startWaveformRecache,
    cancelWaveformRecache,
  } = useMaintenanceStore();

  const [newExclusion, setNewExclusion] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multi-version changelog accordion state (latest version open by default)
  const [expandedChangelogs, setExpandedChangelogs] = useState<Record<string, boolean>>({
    [APP_CHANGELOGS[0]?.version || '1.1.3']: true,
  });

  const toggleChangelog = (ver: string) => {
    setExpandedChangelogs((prev) => ({
      ...prev,
      [ver]: !prev[ver],
    }));
  };

  // Dynamic App Version
  const [appVersion, setAppVersion] = useState('1.1.3');

  // Danger Zone Confirmation States
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmFactoryReset, setConfirmFactoryReset] = useState(false);
  const [isProcessingDangerAction, setIsProcessingDangerAction] = useState(false);

  useEffect(() => {
    if (window.api?.getVersion) {
      window.api.getVersion().then((v) => {
        if (v) setAppVersion(v);
      });
    }
  }, []);

  useEffect(() => {
    if (!settings) {
      fetchSettings();
    }
  }, [settings, fetchSettings]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentSettings: ScanSettings = settings || {
    customFolders: [],
    excludedPaths: [],
    scanAudio: true,
    scanVideo: true,
    generateWaveforms: true,
    autoDetectKeyBpm: true,
    allowPrerelease: false,
    enableDiscordRpc: true,
    discordRpcShowButtons: true,
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

  const handleTogglePrerelease = async () => {
    const nextVal = !currentSettings.allowPrerelease;
    await saveSettings({ ...currentSettings, allowPrerelease: nextVal });
    showToast(nextVal ? 'Pre-release channel enabled: Checking for beta builds' : 'Pre-release channel disabled');
    checkForUpdates();
  };

  const handleToggleDiscordRpc = async () => {
    const nextVal = currentSettings.enableDiscordRpc === false ? true : false;
    await saveSettings({ ...currentSettings, enableDiscordRpc: nextVal });
    if (window.api?.setDiscordRpcEnabled) {
      window.api.setDiscordRpcEnabled(nextVal);
    }
    showToast(nextVal ? 'Discord Rich Presence enabled' : 'Discord Rich Presence disabled');
  };

  const handleToggleDiscordButtons = async () => {
    const nextVal = currentSettings.discordRpcShowButtons === false ? true : false;
    await saveSettings({ ...currentSettings, discordRpcShowButtons: nextVal });
    showToast(nextVal ? 'Discord link button enabled' : 'Discord link button disabled');
  };

  const [isCleaningGhostTracks, setIsCleaningGhostTracks] = useState(false);

  const handleCleanDeadTracks = async () => {
    if (!window.api || isCleaningGhostTracks) return;
    setIsCleaningGhostTracks(true);
    try {
      const result = await window.api.cleanDeadTracks();
      await refreshAll();
      showToast(
        result.removedCount > 0
          ? `Cleanup complete: Removed ${result.removedCount} missing/dead tracks`
          : 'Library verified: No missing/dead tracks found'
      );
    } catch {
      showToast('Error cleaning dead tracks');
    } finally {
      setIsCleaningGhostTracks(false);
    }
  };

  const handleRecacheArtwork = async () => {
    if (artworkTask.isActive) {
      await cancelArtworkRecache();
      showToast('Artwork caching cancelled');
      return;
    }
    try {
      const result = await startArtworkRecache();
      await refreshAll();
      if (result.cancelled) {
        showToast('Artwork caching stopped');
      } else if (result.updatedCount > 0) {
        showToast(`Artwork updated: ${result.updatedCount} new covers cached (${result.total} total ready)`);
      } else {
        showToast(`Artwork is up to date: All ${result.total} tracks already have cover art cached!`);
      }
    } catch (err) {
      showToast('Error re-caching artwork');
    }
  };

  const handleRecacheWaveforms = async () => {
    if (waveformTask.isActive) {
      await cancelWaveformRecache();
      showToast('Waveform generation cancelled');
      return;
    }
    try {
      const result = await startWaveformRecache();
      await refreshAll();
      if (result.cancelled) {
        showToast('Waveform generation stopped');
      } else if (result.generatedCount > 0) {
        showToast(`Waveforms generated: ${result.generatedCount} new tracks computed (${result.total} total ready)`);
      } else {
        showToast(`Waveforms are up to date: All ${result.total} audio tracks already have waveforms ready!`);
      }
    } catch (err) {
      showToast('Error generating waveforms');
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
          v{appVersion}
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

        {/* Accent Color Palette & Custom Hex Picker */}
        <div className="p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm transition-all"
                style={{
                  backgroundColor: `${accentColor}20`,
                  borderColor: `${accentColor}50`,
                  color: accentColor,
                }}
              >
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
                  <span>Custom Accent Color</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${accentColor}20`,
                      color: accentColor,
                      border: `1px solid ${accentColor}40`,
                    }}
                  >
                    {accentColor.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Choose a signature accent palette or input any custom hex color for player buttons, waveforms, and highlights.
                </div>
              </div>
            </div>
          </div>

          {/* Preset Color Swatches */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-1">
            {ACCENT_PRESETS.map((preset) => {
              const isSelected = accentPreset === preset.id || accentColor.toLowerCase() === preset.color.toLowerCase();
              return (
                <button
                  key={preset.id}
                  onClick={() => setAccentColor(preset.color, preset.id)}
                  className={`flex flex-col items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--bg-tertiary)] shadow-md ring-1'
                      : 'bg-[var(--bg-tertiary)]/50 border-[var(--border-color)] hover:border-neutral-500/50 hover:bg-[var(--bg-hover)]'
                  }`}
                  style={{
                    borderColor: isSelected ? preset.color : undefined,
                    boxShadow: isSelected ? `0 0 12px ${preset.color}30` : undefined,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full shadow-inner flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: preset.color }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] text-center leading-tight truncate w-full">
                    {preset.name.replace(/^[A-Za-z]+ /, '')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Hex Color Input Row */}
          <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Custom Hex Color:</span>
              <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 focus-within:border-[var(--accent)] transition-colors">
                <input
                  type="color"
                  value={accentColor.startsWith('#') && accentColor.length === 7 ? accentColor : '#10b981'}
                  onChange={(e) => setAccentColor(e.target.value, 'custom')}
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                  title="Pick a color from wheel"
                />
                <input
                  type="text"
                  value={customHexInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomHexInput(val);
                    if (/^#?([0-9A-F]{3}){1,2}$/i.test(val)) {
                      setAccentColor(val.startsWith('#') ? val : `#${val}`, 'custom');
                    }
                  }}
                  placeholder="#10B981"
                  className="bg-transparent text-xs font-mono text-[var(--text-primary)] outline-none w-20 uppercase"
                  maxLength={7}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-[var(--text-muted)]">Live Preview:</span>
              <button
                className="px-3 py-1 text-xs font-bold text-black rounded-md shadow transition-transform hover:scale-105"
                style={{ backgroundColor: accentColor }}
              >
                Sample Button
              </button>
              <div
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                style={{
                  backgroundColor: `${accentColor}20`,
                  color: accentColor,
                  border: `1px solid ${accentColor}40`,
                }}
              >
                Active Badge
              </div>
            </div>
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

            {/* DJ Key/BPM Tag Recognition */}
            <div
              onClick={handleToggleKeyBpm}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="font-semibold text-xs text-[var(--text-primary)]">DJ Tags & Camelot Key Recognition</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Extracts BPM and normalizes key tags to the 1A–12B Camelot Wheel</div>
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
              {currentSettings.excludedPaths.map((rule: string, idx: number) => (
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

            <div className="flex items-center gap-2">
              <button
                onClick={handleRecacheArtwork}
                disabled={waveformTask.isActive}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border text-xs font-semibold rounded-md shadow-sm transition-all disabled:opacity-50 ${
                  artworkTask.isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-primary)]'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${artworkTask.isActive ? 'animate-spin text-emerald-400' : ''}`} />
                <span>
                  {artworkTask.isActive
                    ? artworkTask.total > 0
                      ? `Re-caching (${artworkTask.current}/${artworkTask.total})...`
                      : 'Re-caching...'
                    : 'Re-cache Artwork'}
                </span>
              </button>

              {artworkTask.isActive && (
                <button
                  onClick={cancelArtworkRecache}
                  className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-semibold rounded-md transition-colors"
                  title="Cancel Artwork Caching"
                >
                  Cancel
                </button>
              )}
            </div>
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

            <div className="flex items-center gap-2">
              <button
                onClick={handleRecacheWaveforms}
                disabled={artworkTask.isActive}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border text-xs font-semibold rounded-md shadow-sm transition-all disabled:opacity-50 ${
                  waveformTask.isActive
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/30'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-primary)]'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${waveformTask.isActive ? 'animate-spin text-cyan-400' : ''}`} />
                <span>
                  {waveformTask.isActive
                    ? waveformTask.total > 0
                      ? `Generating (${waveformTask.current}/${waveformTask.total})...`
                      : 'Generating...'
                    : 'Re-generate Waveforms'}
                </span>
              </button>

              {waveformTask.isActive && (
                <button
                  onClick={cancelWaveformRecache}
                  className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-semibold rounded-md transition-colors"
                  title="Cancel Waveform Generation"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Clean Ghost / Moved Tracks Card */}
          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between space-y-3 sm:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verify Library & Clean Missing Files</span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">
                  Scans all indexed file paths in the database and prunes stale records for audio/video files that were moved, deleted, or renamed outside Purrsonica.
                </div>
              </div>
              <button
                onClick={handleCleanDeadTracks}
                disabled={isCleaningGhostTracks}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold rounded-md shadow-sm transition-all disabled:opacity-50 flex-shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCleaningGhostTracks ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isCleaningGhostTracks ? 'Cleaning...' : 'Clean Missing Tracks'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Integrations & Social */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <Share2 className="w-4 h-4 text-indigo-400" />
          <span>Integrations & Social</span>
        </h2>

        <div className="p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
                  <span>Discord Rich Presence (RPC)</span>
                  {currentSettings.enableDiscordRpc !== false && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Broadcasts your current song title, artist, album, live playback timer, and play/pause status to your Discord profile.
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleDiscordRpc}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                currentSettings.enableDiscordRpc !== false ? 'bg-indigo-600' : 'bg-neutral-600'
              }`}
              title="Toggle Discord Rich Presence"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                  currentSettings.enableDiscordRpc !== false ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {currentSettings.enableDiscordRpc !== false && (
            <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between pl-1">
              <div>
                <div className="font-semibold text-xs text-[var(--text-primary)]">Include "Get Purrsonica" Button</div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Displays an action button on your Discord status linking to the Purrsonica repository.
                </div>
              </div>
              <button
                onClick={handleToggleDiscordButtons}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                  currentSettings.discordRpcShowButtons !== false ? 'bg-indigo-600' : 'bg-neutral-600'
                }`}
                title="Toggle Link Button on Discord Status"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                    currentSettings.discordRpcShowButtons !== false ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Section 5: Auto-Updates & About */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Updates & Information</span>
        </h2>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-[var(--text-primary)]">Purrsonica v{appVersion}</div>
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
                  className={`px-4 py-2 font-bold text-xs rounded-md shadow-md transition-all animate-pulse ${
                    updateStatus.isPrerelease
                      ? 'bg-purple-500 hover:bg-purple-400 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  }`}
                >
                  {updateStatus.isPrerelease ? 'Restart & Install Beta' : 'Restart & Install'}
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

          {/* Pre-release & Beta Channel Switch */}
          <div className="flex items-center justify-between p-3.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl">
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Flame className="w-4 h-4 text-purple-400" />
                <span>Include Pre-release & Beta Updates</span>
                {currentSettings.allowPrerelease && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 uppercase tracking-wider">
                    Beta Channel
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Opt in to experimental builds and preview upcoming features directly from GitHub Releases before general release.
              </div>
            </div>

            <button
              onClick={handleTogglePrerelease}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                currentSettings.allowPrerelease ? 'bg-purple-600' : 'bg-neutral-600'
              }`}
              title="Toggle Pre-release / Beta Channel"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                  currentSettings.allowPrerelease ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Dynamic Release Patch Notes Box (When update is available or downloaded) */}
          {updateStatus.releaseNotes && (
            <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${updateStatus.isPrerelease ? 'text-purple-400' : 'text-emerald-400'}`}>
                  <FileText className="w-3.5 h-3.5" />
                  {updateStatus.isPrerelease ? `What's New in Pre-release v${updateStatus.version}` : `What's New in v${updateStatus.version}`}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  Release Notes
                </span>
              </div>
              <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3.5 max-h-56 overflow-y-auto select-text shadow-inner">
                {(() => {
                  let clean = updateStatus.releaseNotes
                    .replace(/<\/h[1-6]>/gi, '\n\n')
                    .replace(/<h[1-6][^>]*>/gi, '\n### ')
                    .replace(/<\/p>/gi, '\n\n')
                    .replace(/<p[^>]*>/gi, '')
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<hr\s*\/?>/gi, '\n---\n')
                    .replace(/<li[^>]*>/gi, '• ')
                    .replace(/<\/li>/gi, '\n')
                    .replace(/<\/?ul[^>]*>/gi, '\n')
                    .replace(/<\/?ol[^>]*>/gi, '\n')
                    .replace(/<[^>]+>/g, '')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&nbsp;/g, ' ');

                  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

                  return (
                    <div className="space-y-1.5 text-xs">
                      {lines.map((line, idx) => {
                        if (line.startsWith('###') || line.startsWith('##') || line.startsWith('#')) {
                          return (
                            <div key={idx} className="font-bold text-xs text-[var(--text-primary)] pt-1 uppercase tracking-wide">
                              {line.replace(/^#+\s*/, '')}
                            </div>
                          );
                        }
                        if (line === '---') {
                          return <hr key={idx} className="border-[var(--border-color)] my-1" />;
                        }
                        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
                          const content = line.replace(/^[•\-*]\s*/, '');
                          const colonIdx = content.indexOf(': ');
                          return (
                            <div key={idx} className="flex items-start gap-2 pl-1 text-[11px] text-[var(--text-muted)] leading-relaxed">
                              <span className="text-emerald-400 font-bold flex-shrink-0">•</span>
                              <div>
                                {colonIdx !== -1 ? (
                                  <>
                                    <strong className="text-[var(--text-secondary)] font-semibold">{content.substring(0, colonIdx)}:</strong>
                                    <span>{content.substring(colonIdx + 1)}</span>
                                  </>
                                ) : (
                                  <span>{content}</span>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={idx} className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Complete Version Changelog History List */}
          <div className="pt-3 border-t border-[var(--border-color)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Release History & Changelogs
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                {APP_CHANGELOGS.length} Versions
              </span>
            </div>

            <div className="space-y-2 mt-2">
              {APP_CHANGELOGS.map((rel) => {
                const isOpen = !!expandedChangelogs[rel.version];
                return (
                  <div
                    key={rel.version}
                    className="border border-[var(--border-color)] bg-[var(--bg-tertiary)] rounded-lg overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => toggleChangelog(rel.version)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                            rel.isLatest
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]'
                          }`}
                        >
                          v{rel.version}
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          {rel.title}
                        </span>
                        {rel.isLatest && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                            Latest
                          </span>
                        )}
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-3 pt-1 border-t border-[var(--border-color)] space-y-2.5 text-xs">
                        {rel.sections.map((sec, sIdx) => (
                          <div key={sIdx} className="space-y-1">
                            <div className="font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                              {sec.heading}
                            </div>
                            <ul className="list-disc list-inside space-y-1 text-[11px] text-[var(--text-muted)] leading-relaxed">
                              {sec.items.map((item, iIdx) => {
                                const parts = item.split(': ');
                                return (
                                  <li key={iIdx}>
                                    {parts.length > 1 ? (
                                      <>
                                        <strong className="text-[var(--text-primary)]">{parts[0]}</strong>: {parts.slice(1).join(': ')}
                                      </>
                                    ) : (
                                      item
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
