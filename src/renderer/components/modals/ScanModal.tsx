import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Square,
  HardDrive,
  FolderMinus,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { useScanStore } from '../../store/scanStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { formatDuration } from '../../../shared/formatters.js';

export const ScanModal: React.FC = () => {
  const {
    isModalOpen,
    setModalOpen,
    progress,
    settings,
    selectedDrivesToScan,
    fetchSettings,
    toggleDriveSelection,
    addExclusion,
    removeExclusion,
    startScan,
    stopScan,
  } = useScanStore();

  const { drives, fetchDrives, refreshAll } = useLibraryStore();
  const [newExclusionPath, setNewExclusionPath] = useState('');
  const [activeTab, setActiveTab] = useState<'scan' | 'exclusions'>('scan');

  useEffect(() => {
    if (isModalOpen) {
      fetchSettings();
      fetchDrives();
    }
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const isScanning = progress.status === 'scanning';
  const isStopping = progress.status === 'stopping';
  const isCompleted = progress.status === 'completed';

  const handleStartScan = async () => {
    await startScan();
  };

  const handleStopScan = async () => {
    await stopScan();
  };

  const handleAddCustomExclusion = async () => {
    if (newExclusionPath.trim()) {
      await addExclusion(newExclusionPath.trim());
      setNewExclusionPath('');
    }
  };

  const handleBrowseFolderToExclude = async () => {
    if (!window.api) return;
    const res = await window.api.pickFolders();
    if (res && (res as any).currentFolder) {
      await addExclusion((res as any).currentFolder);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              PC Media Scanner & Indexer
            </h2>
          </div>
          <button
            onClick={() => {
              setModalOpen(false);
              refreshAll();
            }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-tertiary)] px-6">
          <button
            onClick={() => setActiveTab('scan')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'scan'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Scan Drives
          </button>
          <button
            onClick={() => setActiveTab('exclusions')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'exclusions'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Excluded Folders ({settings?.excludedPaths.length || 0})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'scan' ? (
            <>
              {/* Drive Selection Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Target Drives to Scan
                  </label>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {selectedDrivesToScan.length === 0
                      ? 'All system drives will be scanned'
                      : `${selectedDrivesToScan.length} drive(s) selected`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {drives.map((d) => {
                    const isSelected = selectedDrivesToScan.includes(d.letter);
                    return (
                      <div
                        key={d.letter}
                        onClick={() => !isScanning && toggleDriveSelection(d.letter)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/30 border-emerald-500 text-emerald-300'
                            : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                        } ${isScanning ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <HardDrive className="w-4 h-4" />
                          <span className="font-semibold text-xs">{d.label}</span>
                        </div>
                        <span className="text-[10px] font-mono opacity-80">
                          {d.trackCount} tracks
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress & Live Telemetry Area */}
              <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg border border-[var(--border-color)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isScanning && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />}
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {progress.status === 'idle' && <HardDrive className="w-4 h-4 text-[var(--text-muted)]" />}
                    {progress.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    <span className="text-xs font-bold capitalize text-[var(--text-primary)]">
                      Status: {progress.status}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    {formatDuration(progress.elapsedMs / 1000)} elapsed
                  </span>
                </div>

                {/* Progress Counters */}
                <div className="grid grid-cols-2 gap-3 py-1">
                  <div className="bg-[var(--bg-secondary)] p-2.5 rounded border border-[var(--border-color)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Files Scanned</div>
                    <div className="text-base font-bold font-mono text-[var(--text-primary)]">
                      {progress.scannedFilesCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-2.5 rounded border border-[var(--border-color)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Media Indexed</div>
                    <div className="text-base font-bold font-mono text-emerald-400">
                      {progress.foundMediaCount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Current Directory */}
                {isScanning && progress.currentFolder && (
                  <div className="text-[11px] text-[var(--text-muted)] truncate font-mono bg-[var(--bg-secondary)] px-2.5 py-1.5 rounded border border-[var(--border-color)]">
                    <span className="text-[var(--text-secondary)] font-semibold">Crawling: </span>
                    {progress.currentFolder}
                  </div>
                )}

                {progress.status === 'error' && progress.errorMessage && (
                  <div className="text-xs text-rose-400 bg-rose-950/30 p-2 rounded border border-rose-800">
                    {progress.errorMessage}
                  </div>
                )}
              </div>

              {/* Start & Stop Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {isScanning || isStopping ? (
                  <button
                    onClick={handleStopScan}
                    disabled={isStopping}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>{isStopping ? 'Stopping Scan...' : 'Stop Scan Anytime'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartScan}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold text-xs shadow-lg transition-all hover:scale-105"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Library Scan</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Exclusions Tab */
            <div className="space-y-4">
              <div className="text-xs text-[var(--text-secondary)]">
                Purrsonica automatically skips Windows system folders, recycle bins, and temporary files. You can add more folders below to exclude them from indexing.
              </div>

              {/* Add Custom Exclusion */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newExclusionPath}
                  onChange={(e) => setNewExclusionPath(e.target.value)}
                  placeholder="e.g. D:\Backups or node_modules"
                  className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-emerald-500 rounded-md px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomExclusion}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-md flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* List of Exclusions */}
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {settings?.excludedPaths.map((p) => (
                  <div
                    key={p}
                    className="flex items-center justify-between px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                  >
                    <span className="font-mono truncate mr-2">{p}</span>
                    <button
                      type="button"
                      onClick={() => removeExclusion(p)}
                      className="text-[var(--text-muted)] hover:text-rose-400 p-1 transition-colors"
                      title="Remove Exclusion"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
