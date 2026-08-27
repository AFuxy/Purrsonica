import React, { useEffect } from 'react';
import { Titlebar } from './components/layout/Titlebar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { RightSidebar } from './components/layout/RightSidebar.js';
import { MainContent } from './components/views/MainContent.js';
import { PlaybackBar } from './components/player/PlaybackBar.js';
import { ScanModal } from './components/modals/ScanModal.js';
import { MetadataEditorModal } from './components/modals/MetadataEditorModal.js';
import { VideoModal } from './components/player/VideoModal.js';
import { DropZoneOverlay } from './components/common/DropZoneOverlay.js';
import { useAudioPlayer } from './hooks/useAudioPlayer.js';
import { useLibraryStore } from './store/libraryStore.js';
import { useScanStore } from './store/scanStore.js';
import { useUpdateStore } from './store/updateStore.js';
import { useMaintenanceStore } from './store/maintenanceStore.js';
import { usePlayerStore } from './store/playerStore.js';
import { useDiscordRpc } from './hooks/useDiscordRpc.js';

export const App: React.FC = () => {
  const { seekTo } = useAudioPlayer();
  useDiscordRpc();
  const { refreshAll, editingTrack, setEditingTrack } = useLibraryStore();
  const { currentTrack, togglePlay, playNext, playPrevious, isVideoModalOpen } = usePlayerStore();
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
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentTrack, isVideoModalOpen]);

  useEffect(() => {
    if (window.api?.getVersion) {
      window.api.getVersion().then((v) => {
        if (v) setAppVersion(v);
      });
    }
  }, []);

  useEffect(() => {
    // Initial fetch of library data
    refreshAll();

    // Listen to real-time scanning telemetry & updates from Electron worker
    let cleanupScan: (() => void) | undefined;
    let cleanupLib: (() => void) | undefined;
    let cleanupUpdate: (() => void) | undefined;
    let cleanupArtwork: (() => void) | undefined;
    let cleanupWaveforms: (() => void) | undefined;

    if (window.api) {
      cleanupScan = window.api.onScanProgress((progress) => {
        setProgress(progress);
      });

      cleanupLib = window.api.onLibraryUpdated(() => {
        refreshAll();
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
