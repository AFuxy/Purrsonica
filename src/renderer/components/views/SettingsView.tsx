import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Share2,
  Radio,
  Palette,
  Check,
  Copy,
  Zap,
  Sliders,
  Smartphone,
  QrCode,
  Wifi,
  Unlink,
  Globe,
} from 'lucide-react';
import { useThemeStore, ACCENT_PRESETS } from '../../store/themeStore.js';
import { useLibraryStore, SettingsTabId } from '../../store/libraryStore.js';
import { useScanStore } from '../../store/scanStore.js';
import { useUpdateStore } from '../../store/updateStore.js';
import { useMaintenanceStore } from '../../store/maintenanceStore.js';
import { useFeatureFlagStore, useFeatureFlagValue } from '../../store/featureFlagStore.js';
import { useDjStore } from '../../store/djStore.js';
import { useCompanionStore } from '../../store/companionStore.js';
import { DuplicateCleanerModal } from '../modals/DuplicateCleanerModal.js';
import { ActionConfirmModal, ActionConfirmConfig } from '../modals/ActionConfirmModal.js';
import { ActionReportModal, ActionReportData } from '../modals/ActionReportModal.js';
import { APP_CHANGELOGS, fetchGitHubReleases, isPrereleaseVersion, getReleaseTag, parseChangelogItem, GitHubReleaseInfo } from '../../data/changelogs.js';
import { formatDuration, formatFileSize } from '../../../shared/formatters.js';
import { ScanSettings } from '../../../shared/types.js';

export const SettingsView: React.FC = () => {
  const { theme, setTheme, accentColor, accentPreset, setAccentColor } = useThemeStore();
  const [customHexInput, setCustomHexInput] = useState(accentColor);

  useEffect(() => {
    setCustomHexInput(accentColor);
  }, [accentColor]);

  const { drives, stats, fetchStats, refreshAll, activeSettingsTab, setActiveSettingsTab, setView } = useLibraryStore();
  const { isDevMode } = useFeatureFlagStore();
  const {
    serverStatus: companionServerStatus,
    devices: companionDevices,
    fetchDevices: fetchCompanionDevices,
    fetchStatus: fetchCompanionStatus,
    openPairingModal,
    disconnectDevice: disconnectCompanionDevice,
    revokeDevice: revokeCompanionDevice,
  } = useCompanionStore();

  useEffect(() => {
    fetchCompanionDevices();
    fetchCompanionStatus();
  }, [fetchCompanionDevices, fetchCompanionStatus]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const settingsNavMode = useFeatureFlagValue<'off' | 'tabs' | 'submenu'>('SETTINGS_TABBED_LAYOUT') || 'off';
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
    audioAnalysisTask,
    startArtworkRecache,
    cancelArtworkRecache,
    startWaveformRecache,
    cancelWaveformRecache,
    startAudioAnalysis,
    cancelAudioAnalysis,
  } = useMaintenanceStore();

  const [newExclusion, setNewExclusion] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic GitHub Releases cache
  const [gitHubReleases, setGitHubReleases] = useState<GitHubReleaseInfo[]>([]);

  useEffect(() => {
    fetchGitHubReleases().then((releases) => {
      if (releases && releases.length > 0) {
        setGitHubReleases(releases);
      }
    });
  }, []);

  // Dynamic App Version
  const [appVersion, setAppVersion] = useState('1.0.0');

  // Multi-version changelog accordion state (latest version open by default)
  const [expandedChangelogs, setExpandedChangelogs] = useState<Record<string, boolean>>({
    [APP_CHANGELOGS[0]?.version || '1.6.0-beta.2']: true,
  });
  const [changelogPage, setChangelogPage] = useState(1);
  const CHANGELOGS_PER_PAGE = 10;
  const totalChangelogPages = Math.ceil(APP_CHANGELOGS.length / CHANGELOGS_PER_PAGE);

  const paginatedChangelogs = useMemo(() => {
    const startIdx = (changelogPage - 1) * CHANGELOGS_PER_PAGE;
    return APP_CHANGELOGS.slice(startIdx, startIdx + CHANGELOGS_PER_PAGE);
  }, [changelogPage]);

  const toggleChangelog = (ver: string) => {
    setExpandedChangelogs((prev) => ({
      ...prev,
      [ver]: !prev[ver],
    }));
  };

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

  useEffect(() => {
    const handleDevModeChanged = (e: any) => {
      if (e.detail?.enabled) {
        showToast('Developer Mode Activated! Labs section unlocked.');
      } else {
        showToast('Developer Mode Disabled.');
      }
    };
    window.addEventListener('purrsonica:devmode_changed', handleDevModeChanged);
    return () => {
      window.removeEventListener('purrsonica:devmode_changed', handleDevModeChanged);
    };
  }, []);

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

  const isCurrentPrerelease = isPrereleaseVersion(appVersion);
  const releaseTag = getReleaseTag(appVersion);
  const showPrereleases = isCurrentPrerelease || !!currentSettings.allowPrerelease;

  // Filter out pre-release changelogs on live stable builds unless opted in
  const visibleChangelogs = useMemo(() => {
    return APP_CHANGELOGS.filter((rel) => {
      if (showPrereleases) return true;
      return !rel.isPrerelease && !isPrereleaseVersion(rel.version);
    });
  }, [showPrereleases]);

  // Dynamically resolve latest stable and latest beta versions from GitHub API or local data
  const latestStableVersion = useMemo(() => {
    if (gitHubReleases.length > 0) {
      const found = gitHubReleases.find((r) => !r.prerelease && !r.draft);
      if (found) return found.tag_name.replace(/^v/, '');
    }
    const local = APP_CHANGELOGS.find((r) => !r.isPrerelease && !isPrereleaseVersion(r.version));
    return local?.version || '1.3.1';
  }, [gitHubReleases]);

  const latestBetaVersion = useMemo(() => {
    if (gitHubReleases.length > 0) {
      const found = gitHubReleases.find((r) => r.prerelease && !r.draft);
      if (found) return found.tag_name.replace(/^v/, '');
    }
    const local = APP_CHANGELOGS.find((r) => r.isPrerelease || isPrereleaseVersion(r.version));
    return local?.version;
  }, [gitHubReleases]);

  // Auto-expand the top visible changelog by default
  useEffect(() => {
    if (visibleChangelogs.length > 0) {
      const firstVer = visibleChangelogs[0].version;
      setExpandedChangelogs((prev) => {
        if (Object.keys(prev).length === 0 || !Object.values(prev).some(Boolean)) {
          return { [firstVer]: true };
        }
        return prev;
      });
    }
  }, [visibleChangelogs]);

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

  const handleToggleGapless = async () => {
    const nextVal = currentSettings.enableGaplessPlayback === false ? true : false;
    await saveSettings({ ...currentSettings, enableGaplessPlayback: nextVal });
    showToast(nextVal ? 'Gapless audio playback enabled' : 'Gapless playback disabled');
  };

  const handleToggleDjMode = async () => {
    const nextVal = currentSettings.enableDjMode === false || currentSettings.enableDjMode === undefined ? true : false;
    await saveSettings({ ...currentSettings, enableDjMode: nextVal });
    if (!nextVal) {
      useDjStore.getState().resetPitch();
      useDjStore.getState().toggleDeckExpanded(false);
    }
    showToast(nextVal ? 'DJ Suite & Performance Mode enabled' : 'DJ Suite disabled (Tempo reset to normal)');
  };

  const handleToggleOutsideLan = () => {
    const isCurrentlyAllowed = !!currentSettings.allowOutsideLan;

    if (!isCurrentlyAllowed) {
      setConfirmConfig({
        title: 'Enable Out-of-LAN Remote Streaming?',
        description:
          'Enabling this permits encrypted peer-to-peer audio traffic to leave your local home network so your paired mobile companion app can stream music on 4G/5G mobile networks when away from home.',
        points: [
          'All media and commands are protected with End-to-End Encryption (DTLS / TLS)',
          'ZERO third-party cloud servers ever store your music, playlists, or telemetry',
          'Only devices you have physically scanned & paired via QR code are permitted',
          'You can instantly revoke access or re-lock to local LAN at any time',
        ],
        confirmLabel: 'Enable Remote Access',
        cancelLabel: 'Keep Local LAN Only',
        isDestructive: false,
        onConfirm: async () => {
          await saveSettings({ ...currentSettings, allowOutsideLan: true });
          await fetchCompanionStatus();
          showToast('Out-of-LAN Remote Streaming enabled (Encrypted E2EE)');
        },
      });
    } else {
      saveSettings({ ...currentSettings, allowOutsideLan: false }).then(async () => {
        await fetchCompanionStatus();
        showToast('Out-of-LAN Remote Streaming disabled (Local LAN only)');
      });
    }
  };

  const handleTogglePrerelease = async () => {
    const nextVal = !currentSettings.allowPrerelease;
    await saveSettings({ ...currentSettings, allowPrerelease: nextVal });
    showToast(
      nextVal
        ? 'Pre-release channel enabled: You will receive all Beta, Alpha, Canary, and Preview updates'
        : 'Pre-release channel disabled: Switched to Stable release channel only'
    );
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
  const [cleanDeadProgress, setCleanDeadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Confirmation modal state
  const [confirmConfig, setConfirmConfig] = useState<ActionConfirmConfig | null>(null);

  // After Action Reports state (keyed by taskType/action)
  const [actionReports, setActionReports] = useState<Record<string, ActionReportData>>({});
  const [activeReport, setActiveReport] = useState<ActionReportData | null>(null);

  useEffect(() => {
    if (!window.api?.onCleanDeadTracksProgress) return;
    const unsub = window.api.onCleanDeadTracksProgress((p) => {
      setCleanDeadProgress(p);
    });
    return () => {
      unsub();
    };
  }, []);

  const requestCleanDeadTracks = () => {
    if (isCleaningGhostTracks) return;
    setConfirmConfig({
      title: 'Verify Library & Clean Missing Files',
      description: 'Checks database records against physical files on disk.',
      points: [
        'Removes missing, moved, or deleted files',
        'Purges records in excluded folders',
        'Physical files on disk are not modified',
      ],
      confirmLabel: 'Verify & Clean',
      isDestructive: true,
      onConfirm: executeCleanDeadTracks,
    });
  };

  const executeCleanDeadTracks = async () => {
    if (!window.api || isCleaningGhostTracks) return;
    setIsCleaningGhostTracks(true);
    setCleanDeadProgress(null);
    const startTime = Date.now();
    try {
      const result = await window.api.cleanDeadTracks();
      await refreshAll();
      const durationMs = Date.now() - startTime;
      const total = stats?.totalTracks || 0;

      const report: ActionReportData = {
        id: `clean_dead_${Date.now()}`,
        taskType: 'clean_dead',
        title: 'Verify Library & Clean Missing Files',
        timestamp: Date.now(),
        durationMs,
        status: 'completed',
        statusMessage: result.removedCount > 0
          ? `Cleaned ${result.removedCount} tracks from the library (${result.missingCount || 0} missing on disk, ${result.excludedCount || 0} in excluded folders).`
          : 'Library verified: All indexed tracks exist on disk and match your exclusion settings.',
        stats: [
          { label: 'Total Scanned', value: total },
          { label: 'Removed Tracks', value: result.removedCount, color: result.removedCount > 0 ? 'text-rose-400' : 'text-emerald-400' },
          { label: 'Missing on Disk', value: result.missingCount || 0 },
          { label: 'Excluded Folders', value: result.excludedCount || 0 },
          { label: 'Healthy Records', value: total - result.removedCount, color: 'text-emerald-400' },
        ],
        sections: [
          {
            title: 'Verification Summary',
            items: [
              `Evaluated library records against active file system paths.`,
              `Validated against ${settings?.excludedPaths.length || 0} active Excluded Folder rules.`,
              result.removedCount > 0
                ? `Purged ${result.removedCount} stale track entries from SQLite database.`
                : `All indexed tracks are verified and valid.`,
            ],
          },
        ],
      };

      setActionReports((prev) => ({ ...prev, clean_dead: report }));

      if (result.removedCount > 0) {
        showToast(`Cleanup complete: Removed ${result.removedCount} tracks. Click "View Report" to see details.`);
      } else {
        showToast('Library verified: All indexed tracks exist and match exclusion settings');
      }
    } catch {
      showToast('Error cleaning dead tracks');
    } finally {
      setIsCleaningGhostTracks(false);
      setCleanDeadProgress(null);
    }
  };

  const requestRecacheArtwork = () => {
    if (artworkTask.isActive) {
      cancelArtworkRecache();
      showToast('Artwork caching cancelled');
      return;
    }
    setConfirmConfig({
      title: 'Re-extract & Cache Album Artwork',
      description: 'Extracts embedded covers and album art across your library.',
      points: [
        'Reads embedded ID3 picture tags and cover images',
        'Saves optimized thumbnails to cache',
        'Can be stopped at any time',
      ],
      estimatedTime: '~30s – 2m',
      confirmLabel: 'Start Re-caching',
      isDestructive: false,
      onConfirm: executeRecacheArtwork,
    });
  };

  const executeRecacheArtwork = async () => {
    const startTime = Date.now();
    try {
      const result = await startArtworkRecache();
      await refreshAll();
      const durationMs = Date.now() - startTime;

      const report: ActionReportData = {
        id: `artwork_${Date.now()}`,
        taskType: 'artwork',
        title: 'Album Artwork Re-extraction & Caching',
        timestamp: Date.now(),
        durationMs,
        status: result.cancelled ? 'cancelled' : 'completed',
        statusMessage: result.cancelled
          ? 'Artwork caching process was cancelled.'
          : result.updatedCount > 0
          ? `Successfully cached ${result.updatedCount} new album covers.`
          : `All ${result.total} tracks in your library already have cover art cached!`,
        stats: [
          { label: 'Total Tracks', value: result.total },
          { label: 'New Covers Cached', value: result.updatedCount, color: 'text-emerald-400' },
          { label: 'Already Ready', value: Math.max(0, result.total - result.updatedCount) },
        ],
        sections: [
          {
            title: 'Extraction Overview',
            items: [
              `Scanned ${result.total} media files for embedded picture tags and folder images.`,
              result.updatedCount > 0
                ? `Generated and cached ${result.updatedCount} webp album covers.`
                : `All existing tracks were already up-to-date in cache.`,
            ],
          },
        ],
      };

      setActionReports((prev) => ({ ...prev, artwork: report }));
      if (!result.cancelled) {
        showToast(`Artwork updated: ${result.updatedCount} new covers cached (${result.total} total ready).`);
      }
    } catch (err) {
      showToast('Error re-caching artwork');
    }
  };

  const requestRecacheWaveforms = () => {
    if (waveformTask.isActive) {
      cancelWaveformRecache();
      showToast('Waveform generation cancelled');
      return;
    }
    setConfirmConfig({
      title: 'Re-generate Audio Waveforms',
      description: 'Generates waveform peak data for tracks across your library.',
      points: [
        'Computes audio amplitude peaks',
        'Enables fast seeking and transition previews',
        'Can be stopped at any time',
      ],
      estimatedTime: '~1m – 4m',
      confirmLabel: 'Start Generation',
      isDestructive: false,
      onConfirm: executeRecacheWaveforms,
    });
  };

  const executeRecacheWaveforms = async () => {
    const startTime = Date.now();
    try {
      const result = await startWaveformRecache();
      await refreshAll();
      const durationMs = Date.now() - startTime;

      const report: ActionReportData = {
        id: `waveforms_${Date.now()}`,
        taskType: 'waveforms',
        title: 'Audio Waveform Pre-Computation',
        timestamp: Date.now(),
        durationMs,
        status: result.cancelled ? 'cancelled' : 'completed',
        statusMessage: result.cancelled
          ? 'Waveform generation process was cancelled.'
          : result.generatedCount > 0
          ? `Successfully generated ${result.generatedCount} waveforms.`
          : `All ${result.total} audio tracks already have waveforms ready!`,
        stats: [
          { label: 'Total Audio Tracks', value: result.total },
          { label: 'Waveforms Generated', value: result.generatedCount, color: 'text-cyan-400' },
          { label: 'Already Ready', value: Math.max(0, result.total - result.generatedCount) },
        ],
        sections: [
          {
            title: 'Generation Overview',
            items: [
              `Calculated 128-band peak amplitude curves for visualization.`,
              `Stored directly in SQLite database for instant seek bar rendering.`,
            ],
          },
        ],
      };

      setActionReports((prev) => ({ ...prev, waveforms: report }));
      if (!result.cancelled) {
        showToast(`Waveforms generated: ${result.generatedCount} new tracks computed.`);
      }
    } catch (err) {
      showToast('Error generating waveforms');
    }
  };

  const requestBatchAnalyzeAudio = (reanalyzeAll = false) => {
    if (audioAnalysisTask.isActive) {
      cancelAudioAnalysis();
      showToast('Audio analysis stopped');
      return;
    }
    setConfirmConfig({
      title: reanalyzeAll ? 'Re-Analyze All BPM & Musical Keys' : 'Analyze Unanalyzed Audio Tracks',
      description: 'Detects musical keys and tempo across your music tracks.',
      points: [
        'Calculates Camelot key and BPM values',
        'Saves metadata for DJ Matcher and mixing',
        'Can be stopped at any time',
      ],
      estimatedTime: reanalyzeAll ? '~2m – 8m' : 'Varies by track count',
      confirmLabel: reanalyzeAll ? 'Re-Analyze All' : 'Start Analysis',
      isDestructive: false,
      onConfirm: () => executeBatchAnalyzeAudio(reanalyzeAll),
    });
  };

  const executeBatchAnalyzeAudio = async (reanalyzeAll = false) => {
    const startTime = Date.now();
    try {
      const result = await startAudioAnalysis({ reanalyzeAll });
      const durationMs = Date.now() - startTime;

      const report: ActionReportData = {
        id: `audio_analysis_${Date.now()}`,
        taskType: 'audio_analysis',
        title: 'BPM & Camelot Key Analysis',
        timestamp: Date.now(),
        durationMs,
        status: result.cancelled ? 'cancelled' : 'completed',
        statusMessage: result.cancelled
          ? 'Audio analysis process was cancelled.'
          : result.analyzedCount > 0
          ? `Successfully analyzed ${result.analyzedCount} audio tracks!`
          : 'All audio tracks in the library are already analyzed.',
        stats: [
          { label: 'Tracks Analyzed', value: result.analyzedCount, color: 'text-amber-400' },
          { label: 'DSP Engine', value: 'EDMA HPCP 36-bin' },
        ],
        sections: [
          {
            title: 'Analysis Details',
            items: [
              `Calculated Camelot Keys (1A-12B), Musical Keys, and BPM tempo.`,
              `Integrated with Purrsonica DJ Suite & DJ Matcher.`,
            ],
          },
        ],
      };

      setActionReports((prev) => ({ ...prev, audio_analysis: report }));
      if (!result.cancelled && result.analyzedCount > 0) {
        showToast(`Analysis complete: Successfully analyzed ${result.analyzedCount} audio tracks!`);
      }
    } catch (err) {
      showToast('Error analyzing audio tracks');
    }
  };

  const requestClearCache = () => {
    setConfirmConfig({
      title: 'Clear Artwork & Thumbnail Cache',
      description: 'Deletes cached thumbnail images from local disk storage.',
      points: [
        'Frees up disk space in cache directory',
        'Thumbnails re-cache automatically when viewed',
        'Database metadata is not deleted',
      ],
      confirmLabel: 'Clear Cache',
      isDestructive: true,
      onConfirm: executeClearCache,
    });
  };

  const executeClearCache = async () => {
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

  const SETTINGS_TAB_GROUPS: {
    label: string;
    tabs: {
      id: SettingsTabId;
      label: string;
      description: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: string;
      badgeClass?: string;
      danger?: boolean;
    }[];
  }[] = [
    {
      label: 'Preferences',
      tabs: [
        {
          id: 'appearance',
          label: 'Appearance',
          description: 'Themes, accent colors & styling',
          icon: Palette,
        },
        {
          id: 'library',
          label: 'Library & Audio',
          description: 'Scan folders, formats & crossfade',
          icon: Music,
        },
        {
          id: 'dj',
          label: 'DJ Suite',
          description: 'Harmonic keys & BPM inspection',
          icon: Radio,
          badge: currentSettings.enableDjMode ? 'Active' : undefined,
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        },
        {
          id: 'companion',
          label: 'Mobile Companion',
          description: 'Paired devices, sync & streaming',
          icon: Smartphone,
          badge: companionDevices.some((d) => d.is_active) ? `${companionDevices.filter((d) => d.is_active).length} Active` : undefined,
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        },
      ],
    },
    {
      label: 'System & Maintenance',
      tabs: [
        {
          id: 'maintenance',
          label: 'Maintenance',
          description: 'Verification, artwork & waveforms',
          icon: Database,
          badge:
            artworkTask.isActive || waveformTask.isActive || audioAnalysisTask.isActive
              ? 'Running'
              : undefined,
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse',
        },
        {
          id: 'system',
          label: 'System & Updates',
          description: 'Discord RPC & release changelog',
          icon: Info,
          badge:
            updateStatus.state === 'available' || updateStatus.state === 'downloaded'
              ? 'Update'
              : undefined,
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        },
      ],
    },
    {
      label: 'Danger',
      tabs: [
        {
          id: 'danger',
          label: 'Danger Zone',
          description: 'Cache wipe & factory reset',
          icon: Flame,
          danger: true,
        },
      ],
    },
  ];

  const renderHeader = () => (
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
      <div className="text-xs font-mono px-2.5 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-muted)] flex items-center gap-1.5">
        <span>v{appVersion}</span>
        {releaseTag && (
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${releaseTag.badgeClass}`}>
            {releaseTag.label}
          </span>
        )}
      </div>
    </div>
  );

  const renderSideTabs = () => (
    <aside className="w-64 flex-shrink-0 h-full border-r border-[var(--border-color)] bg-[var(--bg-secondary)]/40 flex flex-col justify-between select-none">
      <div className="p-4 space-y-4 overflow-y-auto">
        {/* Settings Sidebar Branding */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-[var(--text-primary)]">Settings</h1>
              <p className="text-[10px] text-[var(--text-muted)]">Purrsonica Preferences</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-muted)]">
              v{appVersion}
            </span>
            {releaseTag && (
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${releaseTag.badgeClass}`}>
                {releaseTag.label}
              </span>
            )}
          </div>
        </div>

        {/* Tab Groups List */}
        <nav className="space-y-4">
          {SETTINGS_TAB_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-2 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeSettingsTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSettingsTab(tab.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                        isActive
                          ? tab.danger
                            ? 'bg-rose-600 text-white font-bold shadow-md'
                            : 'bg-emerald-500 text-black font-bold shadow-md'
                          : tab.danger
                          ? 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1">
                        <div
                          className={`p-1.5 rounded-lg flex-shrink-0 ${
                            isActive
                              ? 'bg-black/20 text-current'
                              : tab.danger
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate leading-tight">{tab.label}</div>
                          <div
                            className={`text-[10px] truncate leading-tight mt-0.5 ${
                              isActive ? 'text-current opacity-80' : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {tab.description}
                          </div>
                        </div>
                      </div>
                      {tab.badge && (
                        <span
                          className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded border flex-shrink-0 ${
                            isActive
                              ? 'bg-black/30 text-current border-black/40'
                              : tab.badgeClass || ''
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer in the side tab rail */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/60 text-[10px] text-[var(--text-muted)] flex items-center justify-between">
        <span className="font-semibold">Purrsonica Labs</span>
        <span className="font-mono text-emerald-400 font-bold">V2 Tab Rail</span>
      </div>
    </aside>
  );

  const renderAppearanceSection = () => (
    <section className="space-y-4 animate-in fade-in duration-150">
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
              <div className="text-xs text-neutral-400">Obsidian background with glowing accents</div>
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
              <div className="text-xs text-[var(--text-muted)]">High-contrast daylight theme</div>
            </div>
          </div>
          {theme === 'light' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        </div>
      </div>

      {/* Accent Color Customizer */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">
              Accent Color Palette
            </h3>
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            Primary highlights, buttons, and active badges
          </span>
        </div>

        {/* Preset Swatches Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {ACCENT_PRESETS.map((preset) => {
            const isSelected = accentPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setAccentColor(preset.color, preset.id);
                  setCustomHexInput(preset.color);
                }}
                className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
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
                onChange={(e) => {
                  setAccentColor(e.target.value, 'custom');
                  setCustomHexInput(e.target.value);
                }}
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

            <button
              onClick={() => {
                if (/^#?([0-9A-F]{3}){1,2}$/i.test(customHexInput)) {
                  setAccentColor(customHexInput.startsWith('#') ? customHexInput : `#${customHexInput}`, 'custom');
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer"
            >
              Apply Color
            </button>

            <button
              onClick={() => {
                setAccentColor('#10b981', 'emerald');
                setCustomHexInput('#10B981');
              }}
              className="px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Reset to default Emerald Green"
            >
              Reset
            </button>
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
  );

  const renderLibrarySection = () => (
    <section className="space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <span>Library & Scanner Preferences</span>
        </h2>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black shadow-md transition-all hover:scale-105 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 fill-black" />
          <span>Scan PC / Drives</span>
        </button>
      </div>

      {/* Quick Scanner Action Card */}
      <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-emerald-900/15 to-transparent border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-sm">
            <Zap className="w-5 h-5 fill-emerald-400" />
          </div>
          <div>
            <div className="font-bold text-sm text-[var(--text-primary)]">Fast Background Scanner</div>
            <div className="text-xs text-[var(--text-muted)]">
              Index local drives and folders for audio and video files.
            </div>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          Launch Scanner
        </button>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Audio Toggle */}
          <div
            onClick={handleToggleAudio}
            className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <Music className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-[var(--text-primary)] truncate">Index Audio Files</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">MP3, FLAC, WAV, M4A, AAC, OGG, OPUS</div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAudio();
              }}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                currentSettings.scanAudio ? 'bg-emerald-500' : 'bg-neutral-600'
              }`}
              title="Toggle Audio Indexing"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                  currentSettings.scanAudio ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Video Toggle */}
          <div
            onClick={handleToggleVideo}
            className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <Tv className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-[var(--text-primary)] truncate">Index Video Files</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">MP4, MKV, WEBM, MOV, AVI</div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleVideo();
              }}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                currentSettings.scanVideo ? 'bg-purple-500' : 'bg-neutral-600'
              }`}
              title="Toggle Video Indexing"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                  currentSettings.scanVideo ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Waveforms Toggle */}
          <div
            onClick={handleToggleWaveforms}
            className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <Activity className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-[var(--text-primary)] truncate">Generate Waveform Data</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">Visual amplitude curves for player</div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleWaveforms();
              }}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                currentSettings.generateWaveforms ? 'bg-cyan-500' : 'bg-neutral-600'
              }`}
              title="Toggle Waveform Generation"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                  currentSettings.generateWaveforms ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* BPM & Camelot Key Tag Recognition Toggle */}
          <div
            onClick={handleToggleKeyBpm}
            className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <Layers className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-[var(--text-primary)] truncate">BPM & Key Tag Recognition</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">Extracts BPM & Camelot keys from ID3 metadata</div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleKeyBpm();
              }}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                currentSettings.autoDetectKeyBpm ? 'bg-amber-500' : 'bg-neutral-600'
              }`}
              title="Toggle BPM & Camelot Key Tag Recognition"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                  currentSettings.autoDetectKeyBpm ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Gapless Audio Playback Toggle */}
          <div
            onClick={handleToggleGapless}
            className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <AudioWaveform className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-[var(--text-primary)] truncate">Gapless Audio Playback</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">Zero-delay transitions between tracks</div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleGapless();
              }}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                currentSettings.enableGaplessPlayback !== false ? 'bg-emerald-500' : 'bg-neutral-600'
              }`}
              title="Toggle Gapless Playback"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                  currentSettings.enableGaplessPlayback !== false ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Audio Crossfade Duration Slider */}
          <div className="p-3.5 rounded-lg bg-[var(--bg-tertiary)] col-span-1 sm:col-span-2 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Sliders className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-xs text-[var(--text-primary)]">Audio Crossfade Duration</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Blends playback between consecutive songs
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                    (currentSettings.crossfadeDuration || 0) > 0
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-neutral-800 text-[var(--text-muted)] border border-neutral-700'
                  }`}
                >
                  {(currentSettings.crossfadeDuration || 0) === 0
                    ? '0s (Off / Gapless)'
                    : `${currentSettings.crossfadeDuration}s Crossfade`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] font-mono text-[var(--text-muted)]">0s</span>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={currentSettings.crossfadeDuration ?? 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  useScanStore.getState().setSettings({ ...currentSettings, crossfadeDuration: val });
                }}
                onPointerUp={(e) => {
                  const val = parseInt((e.target as HTMLInputElement).value, 10) || 0;
                  saveSettings({ ...currentSettings, crossfadeDuration: val });
                }}
                onKeyUp={(e) => {
                  const val = parseInt((e.target as HTMLInputElement).value, 10) || 0;
                  saveSettings({ ...currentSettings, crossfadeDuration: val });
                }}
                className="flex-1 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-[var(--text-muted)]">10s</span>
            </div>
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
              className="px-4 py-1.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
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
                  className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 p-1 transition-opacity cursor-pointer"
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
  );

  const renderDjSection = () => (
    <section className="space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <Radio className="w-4 h-4 text-amber-400" />
          <span>DJ Suite & Performance Mode</span>
        </h2>
        {currentSettings.enableDjMode && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold shadow-sm">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>DJ Mode Active</span>
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
        {/* Master DJ Mode Toggle Card */}
        <div
          onClick={handleToggleDjMode}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
            currentSettings.enableDjMode
              ? 'bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-transparent border-amber-500/50 shadow-lg ring-1 ring-amber-500/40'
              : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] hover:border-neutral-600'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`p-3 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
                currentSettings.enableDjMode
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                  : 'bg-neutral-800 text-[var(--text-muted)] border-neutral-700'
              }`}
            >
              <Radio className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)] flex items-center gap-2">
                <span>Enable DJ Suite & Performance Mode</span>
                {currentSettings.enableDjMode && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500 text-black shadow-sm">
                    DJ
                  </span>
                )}
              </div>
              <div className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5">
                Enables BPM & Camelot key columns, harmonic mixing tools, and DJ Matcher.
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleDjMode();
            }}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
              currentSettings.enableDjMode ? 'bg-amber-500' : 'bg-neutral-600'
            }`}
            title="Toggle DJ Suite & Performance Mode"
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                currentSettings.enableDjMode ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* WASM Audio Key & BPM Batch Analyzer Card (DJ Mode Only) */}
        {currentSettings.enableDjMode && (
          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-[var(--text-primary)]">
                    Harmonic Key & BPM DSP Analysis Engine
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Analyzes musical key and tempo using WASM DSP for harmonic mixing.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => requestBatchAnalyzeAudio(false)}
                  disabled={audioAnalysisTask.isActive}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-black text-xs font-bold rounded-md shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Analyze tracks that are missing BPM or Key tags"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${audioAnalysisTask.isActive ? 'animate-spin' : ''}`} />
                  <span>
                    {audioAnalysisTask.isActive
                      ? `Analyzing (${audioAnalysisTask.current}/${audioAnalysisTask.total})...`
                      : 'Analyze Unanalyzed'}
                  </span>
                </button>

                {!audioAnalysisTask.isActive && (
                  <button
                    onClick={() => requestBatchAnalyzeAudio(true)}
                    className="px-3 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-semibold rounded-md transition-colors cursor-pointer"
                    title="Force re-analyze all audio songs regardless of existing BPM/key"
                  >
                    Re-Analyze All
                  </button>
                )}

                {audioAnalysisTask.isActive && (
                  <button
                    onClick={cancelAudioAnalysis}
                    className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                    title="Cancel Audio Analysis"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {audioAnalysisTask.isActive && (
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-muted)] truncate max-w-xs sm:max-w-md">
                    Current: {audioAnalysisTask.currentTrackTitle || 'Processing...'}
                  </span>
                  <span className="text-amber-400 font-mono font-bold">
                    {Math.round((audioAnalysisTask.current / Math.max(1, audioAnalysisTask.total)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-200"
                    style={{
                      width: `${Math.round((audioAnalysisTask.current / Math.max(1, audioAnalysisTask.total)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );

  const renderCompanionSection = () => {
    const activeCount = companionDevices.filter((d) => d.is_active).length;

    const formatLastSeen = (timestamp: number) => {
      const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      return `${diffDays}d ago`;
    };

    const handleDisconnect = async (id: string, name: string) => {
      await disconnectCompanionDevice(id);
      showToast(`Disconnected ${name}`);
    };

    const handleRevoke = (id: string, name: string) => {
      setConfirmConfig({
        title: `Revoke "${name}"?`,
        description: 'This will remove the pairing authorization. You will need to re-scan the QR code on this device to connect again.',
        confirmLabel: 'Revoke Pairing',
        isDestructive: true,
        onConfirm: async () => {
          await revokeCompanionDevice(id);
          showToast(`Revoked pairing for ${name}`);
        },
      });
    };

    return (
      <section className="space-y-4 animate-in fade-in duration-150">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Mobile Companion & Connected Devices</span>
          </h2>
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{activeCount} {activeCount === 1 ? 'Device Active' : 'Devices Active'}</span>
            </div>
          )}
        </div>

        {/* Server & Pairing Hub Card */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/20 via-[var(--bg-tertiary)] to-transparent border border-[var(--border-color)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Embedded Companion Server Active
                </h3>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Local IP: <span className="font-mono text-[var(--text-secondary)]">{companionServerStatus?.localIps[0] || '127.0.0.1'}:{companionServerStatus?.port || 51820}</span> • Stream lossless audio directly from your PC
              </p>
            </div>

            <button
              onClick={openPairingModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold text-xs transition-all shadow-lg shadow-emerald-500/15 active:scale-95 cursor-pointer flex-shrink-0"
            >
              <QrCode className="w-4 h-4" />
              <span>Pair New Phone</span>
            </button>
          </div>

          {/* Out-of-LAN Remote Access Security Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[var(--bg-tertiary)]/60 via-[var(--bg-tertiary)]/30 to-transparent border border-[var(--border-color)] space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                    Out-of-LAN Remote Streaming (4G / 5G)
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      currentSettings.allowOutsideLan
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {currentSettings.allowOutsideLan ? 'Remote Access Enabled' : 'Local LAN Only (Secure)'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] max-w-xl leading-relaxed">
                  Allow your paired phone to stream music when away from your home Wi-Fi over 4G/5G cellular networks.
                  When disabled, any incoming traffic from outside your local network is strictly blocked.
                </p>
              </div>

              {/* Master Security Toggle */}
              <button
                onClick={handleToggleOutsideLan}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  currentSettings.allowOutsideLan ? 'bg-cyan-500 shadow-sm shadow-cyan-500/30' : 'bg-neutral-700'
                }`}
                title={currentSettings.allowOutsideLan ? 'Disable Out-of-LAN streaming' : 'Enable Out-of-LAN streaming'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    currentSettings.allowOutsideLan ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Privacy & Security Banner */}
            <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                {currentSettings.allowOutsideLan
                  ? 'All remote streams use direct end-to-end encryption (DTLS / TLS). Zero music or metadata is ever stored on external cloud servers.'
                  : 'Strict home Wi-Fi perimeter active. External connection attempts from public internet IPs are blocked with HTTP 403.'}
              </span>
            </div>
          </div>

          {/* Connected / Paired Devices List */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
              Paired Devices ({companionDevices.length})
            </div>

            {companionDevices.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-[var(--border-color)] text-center space-y-3 bg-[var(--bg-tertiary)]/20">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 border border-neutral-700/80 text-[var(--text-muted)] flex items-center justify-center mx-auto">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">No Devices Paired Yet</h4>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                    Install <strong>Purrsonica Mobile</strong> on your iOS or Android device and scan the pairing QR code to get started.
                  </p>
                </div>
                <button
                  onClick={openPairingModal}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  Pair First Device
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {companionDevices.map((dev) => (
                  <div
                    key={dev.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      dev.is_active
                        ? 'bg-emerald-950/20 border-emerald-500/30 shadow-sm'
                        : 'bg-[var(--bg-tertiary)]/40 border-[var(--border-color)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          dev.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-neutral-800 text-[var(--text-muted)] border border-neutral-700'
                        }`}
                      >
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                            {dev.name}
                          </span>
                          {dev.is_active ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              Active Now
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              Last seen {formatLastSeen(dev.last_seen_at)}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono truncate mt-0.5">
                          {dev.platform.toUpperCase()} {dev.model ? `• ${dev.model}` : ''} {dev.ip_address ? `• ${dev.ip_address}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {dev.is_active && (
                        <button
                          onClick={() => handleDisconnect(dev.id, dev.name)}
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[var(--text-secondary)] hover:text-white border border-neutral-700 text-xs font-semibold transition-colors cursor-pointer"
                          title="Disconnect active session"
                        >
                          Disconnect
                        </button>
                      )}
                      <button
                        onClick={() => handleRevoke(dev.id, dev.name)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition-colors cursor-pointer"
                        title="Revoke device pairing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  };

  const renderMaintenanceSection = () => (
    <section className="space-y-4 animate-in fade-in duration-150">
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
          <div className="text-[11px] text-[var(--text-muted)] font-semibold">Video Media</div>
          <div className="text-xl font-black mt-1 text-purple-400 font-mono">
            {stats?.totalVideo || 0}
          </div>
        </div>

        <div
          className="p-3.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl"
          title={stats?.totalDuration ? `Total Playtime: ${formatDuration(stats.totalDuration)}` : undefined}
        >
          <div className="text-[11px] text-[var(--text-muted)] font-semibold">Library Size</div>
          <div className="text-xl font-black mt-1 text-cyan-400 font-mono truncate">
            {formatFileSize(stats?.totalSize || 0)}
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
        {/* Verify Library & Prune Dead Tracks Card */}
        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 pr-2">
              <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verify Library & Clean Missing Files</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Scans database and removes records for moved or deleted files.
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {actionReports['clean_dead'] && !isCleaningGhostTracks && (
                <button
                  onClick={() => setActiveReport(actionReports['clean_dead'])}
                  className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer shadow-sm animate-in fade-in flex-shrink-0"
                  title="View results from the last library verification and cleanup"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View Report</span>
                </button>
              )}

              <button
                onClick={requestCleanDeadTracks}
                disabled={isCleaningGhostTracks}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold rounded-md shadow-sm transition-all disabled:opacity-50 flex-shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCleaningGhostTracks ? 'animate-spin text-emerald-400' : ''}`} />
                <span>
                  {isCleaningGhostTracks
                    ? cleanDeadProgress && cleanDeadProgress.total > 0
                      ? `Verifying (${cleanDeadProgress.current}/${cleanDeadProgress.total})...`
                      : 'Verifying...'
                    : 'Clean Missing Tracks'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Re-cache Artwork Card */}
        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 pr-2">
              <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Re-cache Album Artwork</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Extracts cover art and updates thumbnail cache.
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {actionReports['artwork'] && !artworkTask.isActive && (
                <button
                  onClick={() => setActiveReport(actionReports['artwork'])}
                  className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer shadow-sm animate-in fade-in flex-shrink-0"
                  title="View results from the last artwork recache session"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View Report</span>
                </button>
              )}

              <button
                onClick={requestRecacheArtwork}
                className={`flex items-center justify-center gap-2 px-4 py-2 border text-xs font-semibold rounded-md shadow-sm transition-all flex-shrink-0 cursor-pointer ${
                  artworkTask.isActive
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-primary)]'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${artworkTask.isActive ? 'animate-spin text-emerald-400' : ''}`} />
                <span>
                  {artworkTask.isActive
                    ? `Caching (${artworkTask.current}/${artworkTask.total})...`
                    : 'Re-cache Artwork'}
                </span>
              </button>
            </div>
          </div>

          {artworkTask.isActive && (
            <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)] truncate max-w-xs sm:max-w-md">
                  Current: {artworkTask.currentTrackTitle || 'Processing...'}
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  {Math.round((artworkTask.current / Math.max(1, artworkTask.total)) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200"
                  style={{
                    width: `${Math.round((artworkTask.current / Math.max(1, artworkTask.total)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Re-generate Waveforms Card */}
        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 pr-2">
              <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Re-generate Audio Waveforms</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Re-analyzes audio tracks to update player waveform data.
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {actionReports['waveform'] && !waveformTask.isActive && (
                <button
                  onClick={() => setActiveReport(actionReports['waveform'])}
                  className="px-3 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer shadow-sm animate-in fade-in flex-shrink-0"
                  title="View results from the last waveform generation session"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>View Report</span>
                </button>
              )}

              <button
                onClick={requestRecacheWaveforms}
                className={`flex items-center justify-center gap-2 px-4 py-2 border text-xs font-semibold rounded-md shadow-sm transition-all flex-shrink-0 cursor-pointer ${
                  waveformTask.isActive
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-primary)]'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${waveformTask.isActive ? 'animate-spin text-cyan-400' : ''}`} />
                <span>
                  {waveformTask.isActive
                    ? `Generating (${waveformTask.current}/${waveformTask.total})...`
                    : 'Generate Waveforms'}
                </span>
              </button>
            </div>
          </div>

          {waveformTask.isActive && (
            <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)] truncate max-w-xs sm:max-w-md">
                  Current: {waveformTask.currentTrackTitle || 'Processing...'}
                </span>
                <span className="text-cyan-400 font-mono font-bold">
                  {Math.round((waveformTask.current / Math.max(1, waveformTask.total)) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-200"
                  style={{
                    width: `${Math.round((waveformTask.current / Math.max(1, waveformTask.total)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Duplicate Track Cleaner Card */}
        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 pr-2">
            <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
              <Copy className="w-4 h-4 text-purple-400" />
              <span>Duplicate File Cleaner</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">
              Scans library and removes duplicate audio files.
            </div>
          </div>
          <button
            onClick={() => setIsDuplicateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold rounded-md shadow-sm transition-all flex-shrink-0 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-purple-400" />
            <span>Find Duplicates</span>
          </button>
        </div>
      </div>
    </section>
  );

  const renderSystemSection = () => (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Integrations & Social */}
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
                  Shows currently playing song on your Discord profile.
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
                  Adds a button on Discord linking to Purrsonica.
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

      {/* Auto-Updates & About */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Updates & Information</span>
        </h2>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <span>Purrsonica v{appVersion}</span>
                {releaseTag ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${releaseTag.badgeClass}`}>
                    {releaseTag.label}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Stable
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {updateStatus.state === 'downloaded' ? (
                  <span className={updateStatus.isDowngrade ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                    {updateStatus.isDowngrade
                      ? `Stable release v${updateStatus.version} is downloaded and ready to downgrade!`
                      : `New version v${updateStatus.version} is downloaded and ready to install!`}
                  </span>
                ) : updateStatus.state === 'downloading' ? (
                  <span className="text-cyan-400">
                    {updateStatus.isDowngrade
                      ? `Downloading stable release for downgrade (${updateStatus.percent || 0}%)...`
                      : `Downloading update (${updateStatus.percent || 0}%)...`}
                  </span>
                ) : updateStatus.state === 'checking' ? (
                  <span>Checking GitHub Releases for updates...</span>
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
                    updateStatus.isDowngrade
                      ? 'bg-amber-500 hover:bg-amber-400 text-black'
                      : updateStatus.isPrerelease
                      ? 'bg-purple-500 hover:bg-purple-400 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  }`}
                >
                  {updateStatus.isDowngrade ? 'Install Stable Downgrade & Restart' : 'Install & Restart'}
                </button>
              ) : (
                <button
                  onClick={checkForUpdates}
                  disabled={isChecking || updateStatus.state === 'downloading'}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>{isChecking ? 'Checking...' : 'Check for Updates'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Pre-Release Channel Toggle Card */}
          <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${currentSettings.allowPrerelease ? 'bg-indigo-500/20 text-indigo-400' : 'bg-neutral-800 text-neutral-400'}`}>
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-2">
                  <span>Opt into All Pre-Release Channels</span>
                  {currentSettings.allowPrerelease ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 uppercase tracking-wider">
                      All Pre-Releases Active
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-bold border border-neutral-700 uppercase tracking-wider">
                      Stable Only
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Receive Beta, Pre-Release, Alpha, and RC test builds early.
                </div>
              </div>
            </div>

            <button
              onClick={handleTogglePrerelease}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                currentSettings.allowPrerelease ? 'bg-indigo-600' : 'bg-neutral-600'
              }`}
              title="Toggle Pre-Release Channel Opt-In"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                  currentSettings.allowPrerelease ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Dynamic Version Changelogs Accordion with Pagination */}
          <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Version Changelogs & Release Notes</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-mono">
                <span>
                  Showing {(changelogPage - 1) * CHANGELOGS_PER_PAGE + 1}–
                  {Math.min(changelogPage * CHANGELOGS_PER_PAGE, APP_CHANGELOGS.length)} of {APP_CHANGELOGS.length} Releases
                </span>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              {paginatedChangelogs.map((rel) => {
                const isOpen = !!expandedChangelogs[rel.version];
                const isCurrent = rel.version === appVersion;
                const releaseTag = getReleaseTag(rel.version, rel.isPrerelease);

                return (
                  <div
                    key={rel.version}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isCurrent
                        ? 'bg-[var(--bg-tertiary)] border-emerald-500/40 shadow-sm'
                        : releaseTag
                        ? `bg-[var(--bg-tertiary)] ${releaseTag.borderClass}`
                        : isOpen
                        ? 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'
                        : 'bg-[var(--bg-tertiary)]/50 border-[var(--border-color)] hover:border-neutral-700'
                    }`}
                  >
                    <button
                      onClick={() => toggleChangelog(rel.version)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between text-left cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2 flex-wrap">
                        <div className="font-bold text-xs text-[var(--text-primary)] font-mono">
                          v{rel.version}
                        </div>
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500 text-black shadow-sm">
                            Current
                          </span>
                        )}
                        {releaseTag && (
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${releaseTag.badgeClass}`}
                          >
                            {releaseTag.label}
                          </span>
                        )}
                        <span className="text-[11px] text-[var(--text-muted)] truncate hidden sm:inline">
                          — {rel.title}
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--border-color)] space-y-2.5 text-xs">
                        <div className="sm:hidden text-[11px] font-semibold text-[var(--text-secondary)] pb-1 border-b border-[var(--border-color)]/50">
                          {rel.title}
                        </div>
                        {rel.sections.map((sec, sIdx) => (
                          <div key={sIdx} className="space-y-1">
                            <div className="font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                              {sec.heading}
                            </div>
                            <ul className="space-y-1 text-[11px] text-[var(--text-muted)] leading-relaxed">
                              {sec.items.map((item, iIdx) => {
                                const parsed = parseChangelogItem(item, sec.isExperiment);
                                return (
                                  <li key={iIdx} className="flex items-start gap-1.5">
                                    <span
                                      className={
                                        parsed.isExperiment
                                          ? 'text-purple-400 font-bold flex-shrink-0'
                                          : releaseTag
                                          ? `${releaseTag.bulletClass} font-bold flex-shrink-0`
                                          : 'text-emerald-400 font-bold flex-shrink-0'
                                      }
                                    >
                                      •
                                    </span>
                                    <div className="leading-relaxed">
                                      {parsed.isExperiment && (
                                        <button
                                          type="button"
                                          onClick={isDevMode ? () => setView('labs') : undefined}
                                          disabled={!isDevMode}
                                          className={`inline-flex items-center gap-1 text-[9px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider mr-1.5 align-middle select-none shadow-sm transition-all ${
                                            isDevMode ? 'hover:bg-purple-500/30 hover:border-purple-500/50 cursor-pointer' : 'cursor-default'
                                          }`}
                                          title={
                                            isDevMode
                                              ? 'Experimental feature: Click to configure in Developer Labs'
                                              : 'Experimental feature: Managed via Developer Labs'
                                          }
                                        >
                                          <FlaskConical className="w-2.5 h-2.5 text-purple-400 flex-shrink-0" />
                                          <span>{parsed.experimentLabel || 'Experiment'}</span>
                                        </button>
                                      )}
                                      {parsed.title ? (
                                        <>
                                          <strong className="text-[var(--text-primary)] font-semibold">
                                            {parsed.title}
                                          </strong>
                                          : {parsed.description}
                                        </>
                                      ) : (
                                        parsed.description
                                      )}
                                    </div>
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

            {/* Pagination Controls */}
            {totalChangelogPages > 1 && (
              <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                <button
                  onClick={() => setChangelogPage((p) => Math.max(1, p - 1))}
                  disabled={changelogPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalChangelogPages }, (_, i) => i + 1).map((pageNum) => {
                    const isActive = pageNum === changelogPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setChangelogPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500 text-black shadow-md'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setChangelogPage((p) => Math.min(totalChangelogPages, p + 1))}
                  disabled={changelogPage === totalChangelogPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
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

  const renderDangerSection = () => (
    <section className="space-y-4 pb-16 animate-in fade-in duration-150">
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
              Deletes cached album art thumbnails to free disk space.
            </div>
          </div>
          <button
            onClick={requestClearCache}
            disabled={isProcessingDangerAction}
            className="px-3 py-1.5 rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors flex-shrink-0 disabled:opacity-50 cursor-pointer"
          >
            Clear Cache
          </button>
        </div>

        {/* Action 2: Wipe Library Index */}
        <div className="flex items-center justify-between py-2 border-b border-rose-500/20">
          <div className="pr-4">
            <div className="font-bold text-xs text-[var(--text-primary)]">Wipe Library Index</div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Clears the library database without deleting files.
            </div>
          </div>

          {confirmWipe ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleWipeLibrary}
                disabled={isProcessingDangerAction}
                className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                Yes, Wipe All
              </button>
              <button
                onClick={() => setConfirmWipe(false)}
                className="px-2.5 py-1.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmWipe(true)}
              className="px-3 py-1.5 rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors flex-shrink-0 cursor-pointer"
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
              Resets database, playlists, and settings to factory defaults.
            </div>
          </div>

          {confirmFactoryReset ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleFactoryReset}
                disabled={isProcessingDangerAction}
                className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-colors animate-pulse cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                onClick={() => setConfirmFactoryReset(false)}
                className="px-2.5 py-1.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmFactoryReset(true)}
              className="px-3 py-1.5 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors flex-shrink-0 shadow-sm cursor-pointer"
            >
              Factory Reset
            </button>
          )}
        </div>
      </div>
    </section>
  );

  // Submenu Header: Displayed when in Sidebar Submenu mode (Clean breadcrumb banner, no in-page tabs rail)
  const renderSubmenuHeader = () => {
    const currentTabInfo = {
      appearance: {
        title: 'Appearance & Theme',
        description: 'Themes, accent colors, and player styling',
        icon: Palette,
      },
      library: {
        title: 'Library & Audio Engine',
        description: 'Scan paths, formats, and audio playback',
        icon: Music,
      },
      dj: {
        title: 'Purrsonica DJ Suite',
        description: 'BPM sync, CUE points, loopers, and filters',
        icon: Radio,
      },
      companion: {
        title: 'Mobile Companion & Devices',
        description: 'Wirelessly pair and stream lossless music to iOS & Android',
        icon: Smartphone,
      },
      maintenance: {
        title: 'Storage & Maintenance',
        description: 'Artwork cache, waveforms, and library health',
        icon: Database,
      },
      system: {
        title: 'System & Updates',
        description: 'Discord RPC, update channels, and changelogs',
        icon: Info,
      },
      danger: {
        title: 'Danger Zone',
        description: 'Reset settings and wipe local database',
        icon: Flame,
      },
    }[activeSettingsTab] || {
      title: 'Settings',
      description: 'Preferences, audio engine, and maintenance',
      icon: SettingsIcon,
    };

    const TabIcon = currentTabInfo.icon;

    return (
      <div className="border-b border-[var(--border-color)] pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
            <TabIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Settings</span>
              <span className="text-xs text-[var(--text-muted)]">/</span>
              <h1 className="text-xl font-black tracking-tight text-[var(--text-primary)]">
                {currentTabInfo.title}
              </h1>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {currentTabInfo.description}
            </p>
          </div>
        </div>
        <div className="text-xs font-mono px-2.5 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-muted)] flex items-center gap-1.5">
          <span>v{appVersion}</span>
          {releaseTag && (
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${releaseTag.badgeClass}`}>
              {releaseTag.label}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Mode 1: Sidebar Submenu Navigation (Spacious, full-width single section without in-page tabs rail)
  if (settingsNavMode === 'submenu') {
    return (
      <div className="flex-1 w-full h-full overflow-y-auto min-h-0 bg-[var(--bg-primary)] text-[var(--text-primary)] select-none relative">
        <div className="max-w-4xl mx-auto p-8 space-y-6 pb-24">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-24 right-8 bg-neutral-900 border border-emerald-500/50 text-emerald-400 px-4 py-2.5 rounded-xl shadow-2xl z-50 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {renderSubmenuHeader()}

          {activeSettingsTab === 'appearance' && renderAppearanceSection()}
          {activeSettingsTab === 'library' && renderLibrarySection()}
          {activeSettingsTab === 'dj' && renderDjSection()}
          {activeSettingsTab === 'companion' && renderCompanionSection()}
          {activeSettingsTab === 'maintenance' && renderMaintenanceSection()}
          {activeSettingsTab === 'system' && renderSystemSection()}
          {activeSettingsTab === 'danger' && renderDangerSection()}
        </div>

        {/* Modals */}
        <ActionConfirmModal config={confirmConfig} onClose={() => setConfirmConfig(null)} />
        {activeReport && <ActionReportModal report={activeReport} onClose={() => setActiveReport(null)} />}
        <DuplicateCleanerModal
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          onRefreshLibrary={refreshAll}
        />
      </div>
    );
  }

  // Mode 2: Two-Column Layout with Vertical In-Page Tabs Rail
  if (settingsNavMode === 'tabs') {
    return (
      <div className="flex-1 w-full h-full flex overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] select-none relative">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-24 right-8 bg-neutral-900 border border-emerald-500/50 text-emerald-400 px-4 py-2.5 rounded-xl shadow-2xl z-50 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Left Side Navigation Rail */}
        {renderSideTabs()}

        {/* Right Active Tab Content */}
        <main className="flex-1 h-full overflow-y-auto p-8 min-h-0">
          <div className="max-w-3xl mx-auto space-y-6 pb-24">
            {activeSettingsTab === 'appearance' && renderAppearanceSection()}
            {activeSettingsTab === 'library' && renderLibrarySection()}
            {activeSettingsTab === 'dj' && renderDjSection()}
            {activeSettingsTab === 'companion' && renderCompanionSection()}
            {activeSettingsTab === 'maintenance' && renderMaintenanceSection()}
            {activeSettingsTab === 'system' && renderSystemSection()}
            {activeSettingsTab === 'danger' && renderDangerSection()}
          </div>
        </main>

        {/* Modals */}
        <ActionConfirmModal config={confirmConfig} onClose={() => setConfirmConfig(null)} />
        {activeReport && <ActionReportModal report={activeReport} onClose={() => setActiveReport(null)} />}
        <DuplicateCleanerModal
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          onRefreshLibrary={refreshAll}
        />
      </div>
    );
  }

  // Mode 3: Classic Single-Scroll All-in-One Layout (Default when settingsNavMode is 'off')
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

        {renderHeader()}
        {renderAppearanceSection()}
        {renderLibrarySection()}
        {renderDjSection()}
        {renderCompanionSection()}
        {renderMaintenanceSection()}
        {renderSystemSection()}
        {renderDangerSection()}
      </div>

      {/* Modals */}
      <ActionConfirmModal config={confirmConfig} onClose={() => setConfirmConfig(null)} />
      {activeReport && <ActionReportModal report={activeReport} onClose={() => setActiveReport(null)} />}
      <DuplicateCleanerModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        onRefreshLibrary={refreshAll}
      />
    </div>
  );
};
