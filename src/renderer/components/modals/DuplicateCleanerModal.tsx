import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  X,
  Trash2,
  HardDrive,
  CheckCircle2,
  Folder,
  RefreshCw,
  Search,
  Music,
  ShieldAlert,
} from 'lucide-react';
import { DuplicateCluster, DuplicateScanResult, DuplicateTrackItem } from '../../../shared/types.js';
import { formatFileSize, formatDuration } from '../../../shared/formatters.js';

interface DuplicateCleanerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshLibrary: () => Promise<void>;
}

interface ClusterCardProps {
  cluster: DuplicateCluster;
  selectedDeleteIds: Set<string>;
  onToggleTrack: (trackId: string) => void;
  onKeepTrack: (cluster: DuplicateCluster, keepTrackId: string) => void;
  onRevealFolder: (filePath: string) => void;
}

const ClusterCard = memo<ClusterCardProps>(({
  cluster,
  selectedDeleteIds,
  onToggleTrack,
  onKeepTrack,
  onRevealFolder,
}) => {
  return (
    <div className="border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-xl overflow-hidden shadow-sm">
      {/* Cluster Header */}
      <div className="px-4 py-2.5 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <Music className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="min-w-0">
            <span className="font-bold text-xs text-white truncate">
              {cluster.title}
            </span>
            <span className="text-xs text-[var(--text-muted)] ml-2">
              by {cluster.artist}
            </span>
            {cluster.album && (
              <span className="text-[11px] text-[var(--text-muted)] ml-2 opacity-75">
                • {cluster.album}
              </span>
            )}
          </div>
        </div>
        <div className="text-[11px] font-mono text-[var(--text-muted)] flex-shrink-0 ml-2">
          {formatDuration(cluster.duration)} •{' '}
          <span className="text-amber-400 font-semibold">
            {cluster.tracks.length} Copies ({formatFileSize(cluster.totalWastedBytes)} redundant)
          </span>
        </div>
      </div>

      {/* Tracks in Cluster */}
      <div className="divide-y divide-[var(--border-color)] text-xs">
        {cluster.tracks.map((track) => {
          const isMarkedDelete = selectedDeleteIds.has(track.id);
          const isKeep = !isMarkedDelete;

          return (
            <div
              key={track.id}
              className={`px-4 py-2 flex items-center justify-between gap-4 transition-colors ${
                isKeep
                  ? 'bg-emerald-950/15 hover:bg-emerald-950/25'
                  : 'bg-rose-950/10 hover:bg-rose-950/20'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={isMarkedDelete}
                  onChange={() => onToggleTrack(track.id)}
                  className="accent-rose-500 w-4 h-4 cursor-pointer flex-shrink-0"
                  title={isMarkedDelete ? 'Marked for Deletion' : 'Marked to Keep'}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--text-primary)] truncate">
                      {track.file_name}
                    </span>
                    {isKeep ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex-shrink-0">
                        Keep (Active)
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 flex-shrink-0">
                        Redundant (Delete)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono">{track.file_path}</span>
                    <button
                      onClick={() => onRevealFolder(track.file_path)}
                      className="text-[var(--text-muted)] hover:text-white p-0.5 rounded hover:bg-white/10 cursor-pointer"
                      title="Reveal in File Explorer / Finder"
                    >
                      <Folder className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Audio Specs */}
              <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--text-secondary)] flex-shrink-0">
                <span className="uppercase px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  {track.format}
                </span>
                <span>{track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : 'N/A'}</span>
                <span className="font-bold text-[var(--text-primary)] w-16 text-right">
                  {formatFileSize(track.file_size)}
                </span>
                {!isKeep && (
                  <button
                    onClick={() => onKeepTrack(cluster, track.id)}
                    className="px-2 py-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded cursor-pointer"
                    title="Keep this copy instead"
                  >
                    Keep This
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export const DuplicateCleanerModal: React.FC<DuplicateCleanerModalProps> = ({
  isOpen,
  onClose,
  onRefreshLibrary,
}) => {
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<DuplicateScanResult | null>(null);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<Set<string>>(new Set());
  const [sendToTrash, setSendToTrash] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [displayCount, setDisplayCount] = useState(50); // Progressive render window

  const fetchDuplicates = async () => {
    if (!window.api?.findDuplicates) return;
    setLoading(true);
    try {
      const result = await window.api.findDuplicates();
      setScanResult(result);

      // By default, pre-select all copies EXCEPT the recommended keep copy
      const toDelete = new Set<string>();
      if (result && Array.isArray(result.clusters)) {
        for (const cluster of result.clusters) {
          for (const track of cluster.tracks) {
            if (!track.isRecommendedKeep) {
              toDelete.add(track.id);
            }
          }
        }
      }
      setSelectedDeleteIds(toDelete);
      setDisplayCount(50);
    } catch (err) {
      console.error('Failed to scan for duplicate tracks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDuplicates();
    }
  }, [isOpen]);

  // Fast O(1) track size lookup map
  const trackSizeMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!scanResult?.clusters) return map;
    for (const c of scanResult.clusters) {
      for (const t of c.tracks) {
        map.set(t.id, t.file_size);
      }
    }
    return map;
  }, [scanResult]);

  // Instant calculation of selected recoverable bytes: O(K) where K is selected size
  const selectedWastedBytes = useMemo(() => {
    if (selectedDeleteIds.size === 0) return 0;
    let bytes = 0;
    for (const id of selectedDeleteIds) {
      bytes += trackSizeMap.get(id) || 0;
    }
    return bytes;
  }, [selectedDeleteIds, trackSizeMap]);

  // Filter clusters by search
  const filteredClusters = useMemo(() => {
    if (!scanResult?.clusters) return [];
    if (!filterQuery.trim()) return scanResult.clusters;
    const q = filterQuery.toLowerCase();
    return scanResult.clusters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.artist.toLowerCase().includes(q) ||
        (c.album && c.album.toLowerCase().includes(q)) ||
        c.tracks.some((t) => t.file_path.toLowerCase().includes(q))
    );
  }, [scanResult, filterQuery]);

  const visibleClusters = useMemo(() => {
    return filteredClusters.slice(0, displayCount);
  }, [filteredClusters, displayCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      setDisplayCount((prev) => Math.min(prev + 50, filteredClusters.length));
    }
  };

  const toggleSelectTrack = useCallback((trackId: string) => {
    setSelectedDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  }, []);

  const setKeepTrack = useCallback((cluster: DuplicateCluster, keepTrackId: string) => {
    setSelectedDeleteIds((prev) => {
      const next = new Set(prev);
      for (const t of cluster.tracks) {
        if (t.id === keepTrackId) {
          next.delete(t.id);
        } else {
          next.add(t.id);
        }
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!scanResult?.clusters) return;
    const toDelete = new Set<string>();
    for (const cluster of scanResult.clusters) {
      const keepId = cluster.tracks.find((t) => t.isRecommendedKeep)?.id || cluster.tracks[0]?.id;
      for (const track of cluster.tracks) {
        if (track.id !== keepId) {
          toDelete.add(track.id);
        }
      }
    }
    setSelectedDeleteIds(toDelete);
  }, [scanResult]);

  const handleDeselectAll = useCallback(() => {
    setSelectedDeleteIds(new Set());
  }, []);

  const handleExecuteDelete = async () => {
    if (!window.api?.deleteDuplicates || selectedDeleteIds.size === 0) return;
    setIsDeleting(true);
    try {
      const idsArray = Array.from(selectedDeleteIds);
      await window.api.deleteDuplicates(idsArray, sendToTrash);
      setConfirmDeleteModal(false);
      await onRefreshLibrary();
      await fetchDuplicates();
    } catch (err) {
      console.error('Failed to delete duplicate tracks:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRevealInFolder = useCallback((filePath: string) => {
    if (window.api?.showItemInFolder) {
      window.api.showItemInFolder(filePath);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Duplicate File Detector & Disk Cleaner
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Identifies identical audio tracks stored across different folders and drives.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overview Stats Strip */}
        <div className="px-6 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-[var(--text-muted)]">Duplicate Groups:</span>{' '}
              <strong className="text-[var(--text-primary)] font-mono">
                {scanResult?.totalClusters || 0}
              </strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Redundant Copies:</span>{' '}
              <strong className="text-[var(--text-primary)] font-mono">
                {scanResult?.totalDuplicateFiles || 0}
              </strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Total Recoverable:</span>{' '}
              <strong className="text-emerald-400 font-mono font-bold">
                {formatFileSize(scanResult?.totalWastedBytes || 0)}
              </strong>
            </div>
            {selectedDeleteIds.size > 0 && (
              <div className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold font-mono">
                Selected: {selectedDeleteIds.size} files ({formatFileSize(selectedWastedBytes)})
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              disabled={loading || !scanResult?.totalClusters}
              className="px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:text-white bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] rounded transition-colors disabled:opacity-50 cursor-pointer"
            >
              Select All Redundant
            </button>
            <button
              onClick={handleDeselectAll}
              disabled={loading || selectedDeleteIds.size === 0}
              className="px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:text-white bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] rounded transition-colors disabled:opacity-50 cursor-pointer"
            >
              Deselect All
            </button>
            <button
              onClick={fetchDuplicates}
              disabled={loading}
              className="p-1 text-[var(--text-secondary)] hover:text-white bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] rounded transition-colors disabled:opacity-50 cursor-pointer"
              title="Rescan duplicates"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search filter bar */}
        <div className="px-6 py-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-[var(--text-muted)]" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => {
                setFilterQuery(e.target.value);
                setDisplayCount(50);
              }}
              placeholder="Filter duplicate results by title, artist, album, or folder path..."
              className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs rounded-md pl-9 pr-4 py-1.5 border border-transparent focus:border-[var(--accent)] outline-none"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-3 text-xs text-[var(--text-muted)] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Main Duplicate Clusters List */}
        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[55vh]"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)] space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs">Analyzing library for duplicate files across drives...</p>
            </div>
          ) : filteredClusters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)] space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-1" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">No Duplicate Files Found</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm text-center">
                Your music library is clean! No redundant copies of the same song were found across your drives.
              </p>
            </div>
          ) : (
            <>
              {visibleClusters.map((cluster) => (
                <ClusterCard
                  key={cluster.key}
                  cluster={cluster}
                  selectedDeleteIds={selectedDeleteIds}
                  onToggleTrack={toggleSelectTrack}
                  onKeepTrack={setKeepTrack}
                  onRevealFolder={handleRevealInFolder}
                />
              ))}
              {visibleClusters.length < filteredClusters.length && (
                <div className="text-center py-2 text-xs text-[var(--text-muted)]">
                  Showing {visibleClusters.length} of {filteredClusters.length} groups (Scroll down to load more)
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)] flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sendToTrash}
              onChange={(e) => setSendToTrash(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
            <span>Move deleted duplicates to OS Trash / Recycle Bin (Safe Mode)</span>
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-white bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-md transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => setConfirmDeleteModal(true)}
              disabled={selectedDeleteIds.size === 0 || isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 rounded-md shadow-md transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {isDeleting
                  ? 'Cleaning...'
                  : `Clean Selected (${selectedDeleteIds.size} files • ${formatFileSize(selectedWastedBytes)})`}
              </span>
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmDeleteModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-[var(--bg-secondary)] border border-rose-500/40 w-full max-w-md p-6 rounded-xl shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="text-sm font-bold text-white">Confirm Duplicate File Removal</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                You are about to remove <strong className="text-white">{selectedDeleteIds.size} duplicate audio files</strong> reclaiming{' '}
                <strong className="text-emerald-400">{formatFileSize(selectedWastedBytes)}</strong> of disk storage space.
                {sendToTrash ? (
                  <span className="block mt-2 text-emerald-400/90 font-medium">
                    Safe Mode: Files will be safely moved to your system's Recycle Bin / Trash.
                  </span>
                ) : (
                  <span className="block mt-2 text-rose-400 font-bold">
                    Warning: Files will be permanently deleted from disk.
                  </span>
                )}
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-white bg-[var(--bg-tertiary)] rounded-md border border-[var(--border-color)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-md shadow-md"
                >
                  {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isDeleting ? 'Deleting...' : 'Confirm & Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
