import React, { useEffect } from 'react';
import { Titlebar } from './components/layout/Titlebar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { RightSidebar } from './components/layout/RightSidebar.js';
import { MainContent } from './components/views/MainContent.js';
import { PlaybackBar } from './components/player/PlaybackBar.js';
import { MiniPlayerView } from './components/player/MiniPlayerView.js';
import { ScanModal } from './components/modals/ScanModal.js';
import { MetadataEditorModal } from './components/modals/MetadataEditorModal.js';
import { VideoModal } from './components/player/VideoModal.js';
import { DropZoneOverlay } from './components/common/DropZoneOverlay.js';
import { useAudioPlayer, seekAudioTo } from './hooks/useAudioPlayer.js';
import { useLibraryStore } from './store/libraryStore.js';
import { useScanStore } from './store/scanStore.js';
import { useUpdateStore } from './store/updateStore.js';
import { useMaintenanceStore } from './store/maintenanceStore.js';
import { usePlayerStore } from './store/playerStore.js';
import { useDjStore } from './store/djStore.js';
import { useDiscordRpc } from './hooks/useDiscordRpc.js';

export const App: React.FC = () => {
  const { seekTo } = useAudioPlayer();
  useDiscordRpc();
  const { refreshAll, editingTrack, setEditingTrack } = useLibraryStore();
  const {
    currentTrack,
    togglePlay,
    playNext,
    playPrevious,
    isVideoModalOpen,
    isMiniPlayer,
    toggleMiniPlayer,
  } = usePlayerStore();
  const { setProgress } = useScanStore();
  const { setStatus } = useUpdateStore();
  const { setArtworkProgress, setWaveformProgress } = useMaintenanceStore();
  const [appVersion, setAppVersion] = React.useState('');

  const isPrerelease = /-(alpha|beta|rc|canary|pre|dev|preview)/i.test(appVersion);

  // Global Media & Playback Keyboard Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputFocused =
        ['input', 'textarea'].includes(activeTag) ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (isInputFocused) return;

      // Toggle Mini Player (Ctrl + M / Cmd + M)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyM') {
        e.preventDefault();
        toggleMiniPlayer();
        return;
      }

      // Handle Hardware Media Keys
      if (e.code === 'MediaPlayPause' || e.key === 'MediaPlayPause') {
        e.preventDefault();
        togglePlay();
        return;
      }
      if (e.code === 'MediaTrackNext' || e.key === 'MediaTrackNext') {
        e.preventDefault();
        playNext();
        return;
      }
      if (e.code === 'MediaTrackPrevious' || e.key === 'MediaTrackPrevious') {
        e.preventDefault();
        playPrevious();
        return;
      }
      if (e.code === 'MediaStop' || e.key === 'MediaStop') {
        e.preventDefault();
        usePlayerStore.getState().setIsPlaying(false);
        return;
      }

      // Handle Spacebar when not typing and video modal isn't open
      if (e.code === 'Space' && !isVideoModalOpen && currentTrack) {
        e.preventDefault();
        togglePlay();
        return;
      }

      // Toggle DJ Performance Deck (Ctrl + D / Cmd + D)
      const isDjMode = !!useScanStore.getState().settings?.enableDjMode;
      if (isDjMode && (e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        e.preventDefault();
        useDjStore.getState().toggleDeckExpanded();
        return;
      }

      // Pioneer CDJ Main Cue (Key C / Shift+C)
      if (isDjMode && e.code === 'KeyC' && currentTrack && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const djStore = useDjStore.getState();
        const mainCue = djStore.getMainCue(currentTrack.id);
        const player = usePlayerStore.getState();

        if (e.shiftKey) {
          djStore.clearMainCue(currentTrack.id);
          return;
        }

        if (player.isPlaying) {
          player.togglePlay();
          seekAudioTo(mainCue ?? 0);
        } else {
          if (mainCue === null) {
            djStore.setMainCue(currentTrack.id, player.currentTime);
          } else {
            seekAudioTo(mainCue);
          }
        }
        return;
      }

      // Hot Cues 1..4 (Active when DJ mode is enabled AND (DJ Deck is open OR with Alt+1..4))
      const isDjDeckActive = useDjStore.getState().isDeckExpanded;
      const cueMatch = e.code.match(/^(?:Digit|Numpad)([1-4])$/);
      if (isDjMode && cueMatch && currentTrack && (isDjDeckActive || e.altKey)) {
        const cueNum = parseInt(cueMatch[1], 10) as 1 | 2 | 3 | 4;
        const djStore = useDjStore.getState();
        const cues = djStore.getTrackHotCues(currentTrack.id);

        if (e.shiftKey) {
          // Shift + 1..4: Clear Cue
          e.preventDefault();
          djStore.clearHotCue(currentTrack.id, cueNum);
        } else {
          // 1..4: Jump if set, else Set
          e.preventDefault();
          const existingTime = cues[cueNum];
          if (existingTime !== undefined) {
            seekAudioTo(existingTime);
            if (!usePlayerStore.getState().isPlaying) {
              usePlayerStore.getState().togglePlay();
            }
          } else {
            djStore.setHotCue(currentTrack.id, cueNum, usePlayerStore.getState().currentTime);
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentTrack, isVideoModalOpen]);

  // OS-level Background & Minimized Global Hardware Media Keys Listener
  useEffect(() => {
    if (!window.api?.onGlobalMediaKey) return;
    const unsubscribe = window.api.onGlobalMediaKey((action) => {
      if (action === 'play-pause') {
        togglePlay();
      } else if (action === 'next') {
        playNext();
      } else if (action === 'previous') {
        playPrevious();
      } else if (action === 'stop') {
        usePlayerStore.getState().setIsPlaying(false);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (window.api?.getVersion) {
      window.api.getVersion().then((v) => {
        if (v) setAppVersion(v);
      });
    }
  }, []);

  useEffect(() => {
    // Initial fetch of library data and scanner/DJ settings
    refreshAll();
    useScanStore.getState().fetchSettings();

    // Listen to real-time scanning telemetry & updates from Electron worker
    let cleanupScan: (() => void) | undefined;
    let cleanupLib: (() => void) | undefined;
    let cleanupUpdate: (() => void) | undefined;
    let cleanupArtwork: (() => void) | undefined;
    let cleanupWaveforms: (() => void) | undefined;

    if (window.api) {
      cleanupScan = window.api.onScanProgress((progress) => {
        setProgress(progress);
        if (progress.status === 'completed') {
          useLibraryStore.getState().refreshAll();
        }
      });

      let libDebounceTimer: any = null;
      cleanupLib = window.api.onLibraryUpdated(() => {
        if (useScanStore.getState().progress.status === 'scanning') {
          // During active scan, update lightweight stats without reloading 50,000 tracks
          useLibraryStore.getState().fetchStats();
          useLibraryStore.getState().fetchDrives();
          return;
        }
        clearTimeout(libDebounceTimer);
        libDebounceTimer = setTimeout(() => {
          refreshAll();
        }, 300);
      });

      if (window.api.onUpdateStatus) {
        cleanupUpdate = window.api.onUpdateStatus((status) => {
          setStatus(status);
        });
      }

      if (window.api.onRecacheProgress) {
        cleanupArtwork = window.api.onRecacheProgress((p) => {
          setArtworkProgress(p);
        });
      }

      if (window.api.onRecacheWaveformsProgress) {
        cleanupWaveforms = window.api.onRecacheWaveformsProgress((p) => {
          setWaveformProgress(p);
        });
      }
    }

    return () => {
      cleanupScan?.();
      cleanupLib?.();
      cleanupUpdate?.();
      cleanupArtwork?.();
      cleanupWaveforms?.();
    };
  }, []);

  if (isMiniPlayer) {
    return (
      <div className="w-screen h-screen bg-[#121212] select-none overflow-hidden p-0.5">
        <MiniPlayerView onSeek={seekTo} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] select-none overflow-hidden relative">
      {/* Frameless Titlebar with Compact Navbar Update Indicator */}
      <Titlebar />

      {/* Main App Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <MainContent />
        <RightSidebar />
      </div>

      {/* Persistent Bottom Playback Bar */}
      <PlaybackBar onSeek={seekTo} />

      {/* Global Drag & Drop Ingestion Overlay */}
      <DropZoneOverlay />

      {/* Pre-release Watermark Overlay */}
      {isPrerelease && (
        <div className="fixed bottom-24 right-4 pointer-events-none select-none z-30 opacity-30 hover:opacity-75 transition-opacity">
          <div className="text-[10px] font-mono tracking-widest text-purple-300 bg-neutral-950/70 backdrop-blur-sm px-2.5 py-1 rounded border border-purple-500/20 shadow-md">
            PURRSONICA v{appVersion} • PRE-RELEASE
          </div>
        </div>
      )}

      {/* Modals & Overlays */}
      <ScanModal />
      {editingTrack && (
        <MetadataEditorModal
          track={editingTrack}
          onClose={() => setEditingTrack(null)}
        />
      )}
      <VideoModal />
    </div>
  );
};
export default App;
