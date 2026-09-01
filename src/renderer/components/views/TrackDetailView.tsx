import React from 'react';
import {
  Play,
  Pause,
  Heart,
  Edit3,
  Folder,
  Disc,
  User,
  Music,
  Tv,
  Activity,
  Key,
  Clock,
  HardDrive,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Track } from '../../../shared/types.js';
import { usePlayerStore } from '../../store/playerStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { useScanStore } from '../../store/scanStore.js';
import { analyzeAudioTrack } from '../../services/audioAnalyzer.js';
import { seekAudioTo } from '../../hooks/useAudioPlayer.js';
import { WaveformBar } from '../player/WaveformBar.js';
import { TrackCover } from '../common/TrackCover.js';
import { formatDuration, formatFileSize } from '../../../shared/formatters.js';

interface TrackDetailViewProps {
  track: Track;
}

export const TrackDetailView: React.FC<TrackDetailViewProps> = ({ track }) => {
  const { currentTrack, isPlaying, currentTime, setTrack, togglePlay, setVideoModalOpen } = usePlayerStore();
  const { toggleLikeTrack, setEditingTrack, selectArtist, selectAlbumByName } = useLibraryStore();
  const { settings } = useScanStore();
  const isDjMode = !!settings?.enableDjMode;
  const [copied, setCopied] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [loadedWaveform, setLoadedWaveform] = React.useState<number[] | undefined>(track.waveform_data);

  const [localBpm, setLocalBpm] = React.useState<number | undefined>(track.bpm);
  const [localMusicalKey, setLocalMusicalKey] = React.useState<string | undefined>(track.musical_key);
  const [localCamelotKey, setLocalCamelotKey] = React.useState<string | undefined>(track.camelot_key);

  React.useEffect(() => {
    setLocalBpm(track.bpm);
    setLocalMusicalKey(track.musical_key);
    setLocalCamelotKey(track.camelot_key);
  }, [track.id, track.bpm, track.musical_key, track.camelot_key]);

  const handleAnalyzeTrack = async () => {
    if (track.media_type !== 'audio' || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeAudioTrack(track);
      if (res) {
        setLocalBpm(res.bpm);
        setLocalMusicalKey(res.musical_key);
        setLocalCamelotKey(res.camelot_key);

        if (window.api?.updateMetadata) {
          const updated = await window.api.updateMetadata({
            id: track.id,
            bpm: res.bpm,
            musical_key: res.musical_key,
            camelot_key: res.camelot_key,
          });
          if (updated) {
            useLibraryStore.getState().updateTrackInStore(updated);
            if (currentTrack?.id === track.id) {
              usePlayerStore.getState().updateCurrentTrackMetadata(updated);
            }
          }
          await useLibraryStore.getState().refreshAll();
        }
      }
    } catch (err) {
      console.error('Failed to analyze track:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  React.useEffect(() => {
    setLoadedWaveform(track.waveform_data);
    if (!track.waveform_data && window.api?.getTrackById) {
      window.api.getTrackById(track.id).then((fullTrack) => {
        if (fullTrack?.waveform_data) {
          setLoadedWaveform(fullTrack.waveform_data);
        }
      }).catch(() => {});
    }
  }, [track.id, track.waveform_data]);

  const isCurrent = currentTrack?.id === track.id;
  const isThisPlaying = isCurrent && isPlaying;

  const coverUrl = track.cover_art_path && window.api
    ? window.api.getCoverUrl(track.cover_art_path)
    : null;

  const handlePlaySong = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      setTrack(track);
    }
  };

  const handleCopyPath = () => {
    if (!track.file_path) return;
    navigator.clipboard.writeText(track.file_path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevealInFolder = () => {
    if (window.api?.showItemInFolder && track.file_path) {
      window.api.showItemInFolder(track.file_path);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--bg-primary)] p-6 md:p-8 space-y-8 select-none">
      {/* Hero Header Section */}
      <div className="relative rounded-2xl overflow-hidden border border-[var(--border-color)] bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] p-6 md:p-8 shadow-xl">
        {/* Ambient Blur Background */}
        {coverUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10 blur-3xl pointer-events-none scale-125"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
        )}

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
          {/* Large Artwork */}
          <div
            onClick={() => {
              if (track.media_type === 'video') {
                setVideoModalOpen(true);
              }
            }}
            className={`w-44 h-44 md:w-52 md:h-52 rounded-2xl overflow-hidden bg-[var(--bg-tertiary)] border border-[var(--border-color)] shadow-2xl flex-shrink-0 relative group flex items-center justify-center ${
              track.media_type === 'video' ? 'cursor-pointer' : ''
            }`}
          >
            <TrackCover
              coverPath={track.cover_art_path}
              mediaType={track.media_type}
              alt={track.title}
              fallbackIconClassName="w-20 h-20 text-[var(--text-muted)] opacity-40"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            {track.media_type === 'video' && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Tv className="w-10 h-10 text-purple-300 drop-shadow" />
              </div>
            )}
          </div>

          {/* Track Meta & Main Controls */}
          <div className="flex-1 space-y-3 text-center md:text-left min-w-0">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {track.media_type === 'video' ? 'Video File' : 'Audio Track'}
              </span>
              {track.format && (
                <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                  {track.format}
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] truncate" title={track.title}>
              {track.title || track.file_name}
            </h1>

            {/* Clickable Artist & Album */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
              <button
                onClick={() => selectArtist(track.artist)}
                className="flex items-center gap-1.5 hover:text-emerald-400 hover:underline font-semibold transition-colors cursor-pointer"
                title={`View all songs by ${track.artist}`}
              >
                <User className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{track.artist || 'Unknown Artist'}</span>
              </button>

              {track.album && (
                <>
                  <span className="text-[var(--text-muted)]">•</span>
                  <button
                    onClick={() => selectAlbumByName(track.album, track.album_artist || track.artist)}
                    className="flex items-center gap-1.5 hover:text-emerald-400 hover:underline transition-colors cursor-pointer"
                    title={`View album: ${track.album}`}
                  >
                    <Disc className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>{track.album}</span>
                  </button>
                </>
              )}

              {track.year && (
                <>
                  <span className="text-[var(--text-muted)]">•</span>
                  <span className="font-mono">{track.year}</span>
                </>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 pt-3">
              <button
                onClick={handlePlaySong}
                className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold text-sm flex items-center gap-2 shadow-xl hover:scale-105 transition-all cursor-pointer"
              >
                {isThisPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>{isCurrent ? 'Resume' : 'Play Song'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => toggleLikeTrack(track.id)}
                className={`p-2.5 rounded-full border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer ${
                  track.is_liked ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
                title={track.is_liked ? 'Remove from Liked' : 'Save to Liked'}
              >
                <Heart className={`w-4 h-4 ${track.is_liked ? 'fill-emerald-500' : ''}`} />
              </button>

              <button
                onClick={() => setEditingTrack(track)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold shadow-sm transition-all cursor-pointer"
                title="Edit ID3 Metadata & Tags"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Metadata</span>
              </button>

              <button
                onClick={handleRevealInFolder}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold shadow-sm transition-all cursor-pointer"
                title="Show in File Explorer"
              >
                <Folder className="w-3.5 h-3.5 text-cyan-400" />
                <span>Show in Folder</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Waveform Seeking Section */}
      <div className="p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Audio Waveform & Energy Curve
          </span>
          <span className="text-xs font-mono text-[var(--text-secondary)]">
            {formatDuration(isCurrent ? currentTime : 0)} / {formatDuration(track.duration)}
          </span>
        </div>

        <div className="py-2">
          <WaveformBar
            waveformData={loadedWaveform || track.waveform_data}
            currentTime={isCurrent ? currentTime : 0}
            duration={track.duration}
            onSeek={(t) => {
              if (!isCurrent) {
                setTrack(track);
              }
              seekAudioTo(t);
            }}
          />
        </div>
      </div>

      {/* Audio Engine & Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* BPM Card (DJ Mode Only) */}
        {isDjMode && (
          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-1 relative group">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tempo / BPM</span>
              </div>
              {track.media_type === 'audio' && (
                <button
                  onClick={handleAnalyzeTrack}
                  disabled={isAnalyzing}
                  className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Detect BPM & Musical Key using WASM Engine"
                >
                  <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>{isAnalyzing ? 'Analyzing...' : localBpm ? 'Re-Analyze' : 'Analyze'}</span>
                </button>
              )}
            </div>
            <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
              {localBpm ? `${Math.round(localBpm)} BPM` : 'Not Detected'}
            </div>
          </div>
        )}

        {/* Harmonic Key Card (DJ Mode Only) */}
        {isDjMode && (
          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-1 relative group">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Musical & Camelot Key</span>
              </div>
              {track.media_type === 'audio' && (
                <button
                  onClick={handleAnalyzeTrack}
                  disabled={isAnalyzing}
                  className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 disabled:opacity-50 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Detect BPM & Musical Key using WASM Engine"
                >
                  <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{isAnalyzing ? 'Analyzing...' : localCamelotKey ? 'Re-Analyze' : 'Analyze'}</span>
                </button>
              )}
            </div>
            <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
              {localMusicalKey || localCamelotKey ? `${localMusicalKey || ''} ${localCamelotKey ? `(${localCamelotKey})` : ''}` : 'Not Detected'}
            </div>
          </div>
        )}

        {/* Quality & Bitrate Card */}
        <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audio Quality</span>
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
            {track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : 'Lossless / Standard'}
          </div>
        </div>

        {/* Sample Rate Card */}
        <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Sample Rate</span>
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
            {track.sample_rate ? `${track.sample_rate / 1000} kHz` : '44.1 kHz'}
          </div>
        </div>

        {/* Duration Card */}
        <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Track Duration</span>
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
            {formatDuration(track.duration)}
          </div>
        </div>

        {/* File Size Card */}
        <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-rose-400" />
            <span>File Size</span>
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
            {formatFileSize(track.file_size)}
          </div>
        </div>

        {/* Play Count Card */}
        <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-teal-400" />
            <span>Total Plays</span>
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
            {track.play_count || 0} plays
          </div>
        </div>

        {/* Disc & Track Number Card */}
        <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Disc className="w-3.5 h-3.5 text-indigo-400" />
            <span>Track & Disc Index</span>
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
            #{track.track_number || '1'} {track.disc_number ? `(Disc ${track.disc_number})` : ''}
          </div>
        </div>
      </div>

      {/* File Location Card */}
      <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-cyan-400" />
            Storage Path & Physical Location
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPath}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
              title="Copy file path to clipboard"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Path'}</span>
            </button>
            <button
              onClick={handleRevealInFolder}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
              title="Reveal file in Windows Explorer"
            >
              <Folder className="w-3 h-3 text-cyan-400" />
              <span>Open in Explorer</span>
            </button>
          </div>
        </div>
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-2.5 font-mono text-xs text-[var(--text-secondary)] select-text break-all">
          {track.file_path}
        </div>
      </div>
    </div>
  );
};
