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

export const App: React.FC = () => {
  const { seekTo } = useAudioPlayer();
  const { refreshAll, editingTrack, setEditingTrack } = useLibraryStore();
  const { setProgress } = useScanStore();
  const { setStatus } = useUpdateStore();

  useEffect(() => {
    // Initial fetch of library data
    refreshAll();

    // Listen to real-time scanning telemetry & updates from Electron worker
    let cleanupScan: (() => void) | undefined;
    let cleanupLib: (() => void) | undefined;
    let cleanupUpdate: (() => void) | undefined;

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
    }

    return () => {
      cleanupScan?.();
      cleanupLib?.();
      cleanupUpdate?.();
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
