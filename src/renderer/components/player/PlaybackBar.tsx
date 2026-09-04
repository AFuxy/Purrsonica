import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  ListMusic,
  Tv,
  Music,
  Disc,
  Folder,
  PictureInPicture,
  Sliders,
  Smartphone,
  ArrowRightLeft,
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { useScanStore } from '../../store/scanStore.js';
import { useDjStore } from '../../store/djStore.js';
import { useCompanionStore } from '../../store/companionStore.js';
import { WaveformBar } from './WaveformBar.js';
import { DjDeckPanel } from './DjDeckPanel.js';
import { TrackCover } from '../common/TrackCover.js';
import { formatDuration } from '../../../shared/formatters.js';
import { Track } from '../../../shared/types.js';

interface PlaybackBarProps {
  onSeek: (time: number) => void;
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({ onSeek }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    isRightSidebarOpen,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleRightSidebar,
    toggleMiniPlayer,
    setVideoModalOpen,
    crossfadeState,
  } = usePlayerStore();

  const { toggleLikeTrack, selectAlbumByName, selectArtist, selectTrackDetail, tracks } = useLibraryStore();
  const isDjMode = !!useScanStore((s) => s.settings?.enableDjMode);
  const { isDeckExpanded, toggleDeckExpanded, pitchPercent } = useDjStore();
  const {
    devices,
    mobilePlaybackState,
    playbackTarget,
    setPlaybackTarget,
    openPairingModal,
    sendRemoteCommand,
    setMobilePlaybackState,
  } = useCompanionStore();
  const activeCompanionCount = devices.filter((d) => d.is_active).length;

  // Track if mobile playback is actively playing or paused with a track loaded
  const isMobileActive = Boolean(
    (playbackTarget === 'remote_mobile' || !isPlaying) && mobilePlaybackState?.trackId
  );

  // Resolve full Track object for the track currently streaming on mobile
  const [resolvedMobileTrack, setResolvedMobileTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (!mobilePlaybackState?.trackId) {
      setResolvedMobileTrack(null);
      return;
    }
    const found = tracks.find((t) => t.id === mobilePlaybackState.trackId);
    if (found) {
      setResolvedMobileTrack(found);
    } else if (window.api?.getTrackById) {
      window.api.getTrackById(mobilePlaybackState.trackId).then((tr) => {
        if (tr) setResolvedMobileTrack(tr);
      });
    }
  }, [mobilePlaybackState?.trackId, tracks]);

  // Smoothly interpolate mobile playback position between network sync ticks
  const [smoothMobileTime, setSmoothMobileTime] = useState(0);

  useEffect(() => {
    if (!mobilePlaybackState) {
      setSmoothMobileTime(0);
      return;
    }

    const baseSec = mobilePlaybackState.currentTime || 0;
    setSmoothMobileTime(baseSec);

    if (!mobilePlaybackState.isPlaying) return;

    const startTimestamp = mobilePlaybackState.lastReceivedAt || Date.now();
    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - startTimestamp) / 1000;
      const totalDur = mobilePlaybackState.duration || resolvedMobileTrack?.duration || 0;
      const interpolated = totalDur > 0 ? Math.min(totalDur, baseSec + elapsedSec) : baseSec + elapsedSec;
      setSmoothMobileTime(interpolated);
    }, 200);

    return () => clearInterval(interval);
  }, [
    mobilePlaybackState?.currentTime,
    mobilePlaybackState?.isPlaying,
    mobilePlaybackState?.lastReceivedAt,
    resolvedMobileTrack?.duration,
  ]);

  const activeCurrentTime = isMobileActive ? smoothMobileTime : currentTime;
  const activeDuration = isMobileActive
    ? (mobilePlaybackState?.duration || resolvedMobileTrack?.duration || 0)
    : duration;
  const activeIsPlaying = isMobileActive ? Boolean(mobilePlaybackState?.isPlaying) : isPlaying;

  const handleSeek = (time: number) => {
    if (isMobileActive && mobilePlaybackState) {
      setSmoothMobileTime(time);
      sendRemoteCommand(
        {
          type: 'seek',
          position: time,
        },
        mobilePlaybackState.deviceId
      );
    } else {
      onSeek(time);
    }
  };

  const handleTogglePlay = () => {
    if (isMobileActive && mobilePlaybackState) {
      sendRemoteCommand(
        {
          type: mobilePlaybackState.isPlaying ? 'pause' : 'play',
        },
        mobilePlaybackState.deviceId
      );
    } else {
      togglePlay();
    }
  };

  const handlePrevious = () => {
    playPrevious();
  };

  const handleNext = () => {
    playNext();
  };

  const handleTakeOverOnPC = () => {
    if (!mobilePlaybackState?.trackId) return;
    sendRemoteCommand({ type: 'pause' }, mobilePlaybackState.deviceId);
    setPlaybackTarget('desktop');
    if (mobilePlaybackState) {
      setMobilePlaybackState({
        ...mobilePlaybackState,
        isPlaying: false,
      });
    }
    const track = resolvedMobileTrack || tracks.find((t) => t.id === mobilePlaybackState.trackId);
    if (track) {
      usePlayerStore.getState().playTrack(track, true);
      const pos = smoothMobileTime;
      if (pos > 0) {
        setTimeout(() => {
          onSeek(pos);
        }, 200);
      }
    }
  };

  const handleTransferToPhone = () => {
    if (!currentTrack) return;
    const activeDevice = devices.find((d) => d.is_active);
    if (!activeDevice) return;

    usePlayerStore.getState().setIsPlaying(false);
    setPlaybackTarget('remote_mobile');

    sendRemoteCommand(
      {
        type: 'playTrack',
        trackId: currentTrack.id,
        position: Math.round(currentTime),
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        duration: currentTrack.duration,
      } as any,
      activeDevice.id
    );

    setMobilePlaybackState({
      deviceId: activeDevice.id,
      deviceName: activeDevice.name,
      trackId: currentTrack.id,
      trackTitle: currentTrack.title || currentTrack.file_name,
      trackArtist: currentTrack.artist,
      artist: currentTrack.artist,
      album: currentTrack.album || undefined,
      duration: currentTrack.duration || 0,
      currentTime: Math.round(currentTime),
      cover_art_path: currentTrack.cover_art_path || undefined,
      isPlaying: true,
      lastReceivedAt: Date.now(),
    });
  };

  const coverUrl = currentTrack?.cover_art_path && window.api
    ? window.api.getCoverUrl(currentTrack.cover_art_path)
    : null;

  return (
    <>
      {isDjMode && isDeckExpanded && <DjDeckPanel onClose={() => toggleDeckExpanded(false)} />}
      <footer className="h-20 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] px-4 flex items-center justify-between z-40 select-none">
      {/* Left: Track Info, Album & File Location OR Mobile Companion Info */}
      <div
        draggable={!isMobileActive && !!currentTrack}
        onDragStart={(e) => {
          if (!currentTrack || isMobileActive) return;
          e.dataTransfer.setData('application/purrsonica-track', currentTrack.id);
          e.dataTransfer.setData('application/json', JSON.stringify({ trackId: currentTrack.id, track: currentTrack }));
          e.dataTransfer.setData('text/plain', currentTrack.id);
          e.dataTransfer.effectAllowed = 'copy';
        }}
        className={`flex items-center gap-3 w-1/3 max-w-sm min-w-[220px] ${!isMobileActive && currentTrack ? 'cursor-grab active:cursor-grabbing' : ''}`}
        title={!isMobileActive && currentTrack ? 'Drag track to a playlist' : undefined}
      >
        {isMobileActive && mobilePlaybackState ? (
          <div className="flex items-center gap-3 min-w-0 pr-1 flex-1 animate-in fade-in duration-300">
            {/* Cover art with PHONE tag overlay */}
            <div
              onClick={handleTakeOverOnPC}
              className="relative w-14 h-14 rounded-md overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0 shadow-md ring-1 ring-emerald-500/50 hover:ring-emerald-400 group cursor-pointer transition-all"
              title="Click to take over playback on this PC"
            >
              <TrackCover
                coverPath={resolvedMobileTrack?.cover_art_path || mobilePlaybackState.cover_art_path}
                alt={resolvedMobileTrack?.title || mobilePlaybackState.trackTitle || 'Phone Track'}
                fallbackIconClassName="w-6 h-6 text-emerald-400/60"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500 text-[8px] font-mono font-bold text-black flex items-center gap-0.5 shadow-sm">
                <Smartphone className="w-2.5 h-2.5" />
                <span>PHONE</span>
              </div>
            </div>

            {/* Track Info & Device State */}
            <div className="flex flex-col min-w-0 pr-1 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  onClick={() => resolvedMobileTrack && selectTrackDetail(resolvedMobileTrack)}
                  className={`text-xs font-bold text-white truncate leading-tight transition-colors ${resolvedMobileTrack ? 'hover:text-emerald-400 hover:underline cursor-pointer' : ''}`}
                  title={resolvedMobileTrack?.title || mobilePlaybackState.trackTitle}
                >
                  {resolvedMobileTrack?.title || mobilePlaybackState.trackTitle || 'Streaming Audio'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] truncate leading-tight mt-0.5">
                <span
                  onClick={() => (resolvedMobileTrack?.artist || mobilePlaybackState.artist) && selectArtist(resolvedMobileTrack?.artist || mobilePlaybackState.artist!)}
                  className="truncate hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
                >
                  {resolvedMobileTrack?.artist || mobilePlaybackState.trackArtist || mobilePlaybackState.artist || 'Unknown Artist'}
                </span>
                {(resolvedMobileTrack?.album || mobilePlaybackState.album) && (
                  <>
                    <span className="text-[var(--text-muted)] opacity-60">•</span>
                    <span className="truncate text-[var(--text-muted)]">{resolvedMobileTrack?.album || mobilePlaybackState.album}</span>
                  </>
                )}
              </div>

              {/* Status Indicator & Take Over Button */}
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className={`w-1.5 h-1.5 rounded-full ${mobilePlaybackState.isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {mobilePlaybackState.isPlaying ? 'Playing on' : 'Paused on'} {mobilePlaybackState.deviceName || 'Phone'}
                </span>

                <button
                  onClick={handleTakeOverOnPC}
                  className="text-[9px] font-sans font-semibold px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer shadow-sm flex items-center gap-1"
                  title="Transfer playback from phone and play on this PC"
                >
                  <ArrowRightLeft className="w-2.5 h-2.5" />
                  <span>Take Over on PC</span>
                </button>
              </div>
            </div>
          </div>
        ) : currentTrack ? (
          <>
            <div
              onClick={() => {
                if (currentTrack.media_type === 'video') {
                  setVideoModalOpen(true);
                } else {
                  selectTrackDetail(currentTrack);
                }
              }}
              className={`relative w-14 h-14 rounded-md overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0 group shadow-md cursor-pointer ring-1 ring-white/5 hover:ring-emerald-500/50 transition-all ${
                crossfadeState?.isCrossfading ? 'ring-2 ring-purple-500/70 shadow-[0_0_12px_rgba(168,85,247,0.4)]' : ''
              }`}
              title="Click to View Song Info & Play Page"
            >
              <div
                className="w-full h-full transition-opacity"
                style={{ opacity: crossfadeState?.isCrossfading ? 1 - crossfadeState.progress : 1 }}
              >
                <TrackCover
                  coverPath={currentTrack.cover_art_path}
                  mediaType={currentTrack.media_type}
                  alt={currentTrack.title}
                  fallbackIconClassName="w-6 h-6 text-[var(--text-muted)]"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>

              {/* Incoming Track Cover Blend Overlay during Crossfade */}
              {crossfadeState?.isCrossfading && crossfadeState.incomingTrack && (
                <div
                  className="absolute inset-0 transition-opacity"
                  style={{ opacity: crossfadeState.progress }}
                >
                  <TrackCover
                    coverPath={crossfadeState.incomingTrack.cover_art_path}
                    mediaType={crossfadeState.incomingTrack.media_type}
                    alt={crossfadeState.incomingTrack.title}
                    fallbackIconClassName="w-6 h-6 text-[var(--text-muted)]"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {currentTrack.media_type === 'video' && !crossfadeState?.isCrossfading && (
                <div
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  title="Click to Open Video Player"
                >
                  <Tv className="w-5 h-5 text-purple-300" />
                </div>
              )}
            </div>

            <div className="flex flex-col min-w-0 pr-1 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  onClick={() => selectTrackDetail(currentTrack)}
                  className="text-xs font-semibold text-[var(--text-primary)] truncate hover:text-emerald-400 hover:underline cursor-pointer leading-tight transition-colors"
                  title={`Song: ${currentTrack.title} (Click to open song play page)`}
                >
                  {crossfadeState?.isCrossfading && crossfadeState.incomingTrack && crossfadeState.progress > 0.5
                    ? crossfadeState.incomingTrack.title
                    : currentTrack.title}
                </span>

                {crossfadeState?.isCrossfading && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse flex-shrink-0">
                    Blend {Math.round(crossfadeState.progress * 100)}%
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] truncate leading-tight mt-0.5">
                <span
                  onClick={() => selectArtist(currentTrack.artist)}
                  className="truncate hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
                  title={`Artist: ${currentTrack.artist} (Click to view artist's songs)`}
                >
                  {crossfadeState?.isCrossfading && crossfadeState.incomingTrack && crossfadeState.progress > 0.5
                    ? crossfadeState.incomingTrack.artist
                    : currentTrack.artist}
                </span>
                {currentTrack.album && (
                  <>
                    <span className="text-[var(--text-muted)] opacity-60">•</span>
                    <span
                      onClick={() => selectAlbumByName(currentTrack.album, currentTrack.album_artist || currentTrack.artist)}
                      className="truncate hover:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 text-[var(--text-muted)] hover:opacity-100 transition-colors"
                      title={`Album: ${currentTrack.album} (Click to open album)`}
                    >
                      <Disc className="w-2.5 h-2.5 flex-shrink-0" />
                      <span>{currentTrack.album}</span>
                    </span>
                  </>
                )}
              </div>

              {currentTrack.file_path && (
                <div
                  onClick={() => {
                    if (window.api?.showItemInFolder) {
                      window.api.showItemInFolder(currentTrack.file_path);
                    }
                  }}
                  className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] opacity-70 hover:opacity-100 hover:text-cyan-400 cursor-pointer truncate transition-all mt-0.5"
                  title={`File location: ${currentTrack.file_path}\nClick to reveal in Windows File Explorer`}
                >
                  <Folder className="w-2.5 h-2.5 flex-shrink-0 text-cyan-400/80" />
                  <span className="truncate font-mono">{currentTrack.file_path}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => toggleLikeTrack(currentTrack.id)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 transition-colors flex-shrink-0"
              title={currentTrack.is_liked ? 'Remove from Liked' : 'Save to Liked'}
            >
              <Heart
                className={`w-4 h-4 transition-transform active:scale-125 ${
                  currentTrack.is_liked
                    ? 'fill-emerald-500 text-emerald-500'
                    : 'hover:text-white'
                }`}
              />
            </button>
          </>
        ) : (
          <div className="text-xs text-[var(--text-muted)] italic">
            Select a track to start playback
          </div>
        )}
      </div>

      {/* Center: Playback Controls & Waveform Bar */}
      <div className="flex flex-col items-center max-w-xl w-2/4 px-4">
        {/* Buttons */}
        <div className="flex items-center gap-4 mb-1">
          <button
            onClick={toggleShuffle}
            disabled={isMobileActive}
            className={`p-1.5 transition-colors disabled:opacity-30 ${
              isShuffle
                ? 'text-emerald-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrevious}
            disabled={!isMobileActive && !currentTrack}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            title="Previous"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={handleTogglePlay}
            disabled={!isMobileActive && !currentTrack}
            className={`w-8 h-8 rounded-full transition-all flex items-center justify-center shadow-lg disabled:opacity-40 hover:scale-105 active:scale-95 cursor-pointer ${
              isMobileActive
                ? 'bg-emerald-500 text-black shadow-emerald-500/30'
                : 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
            }`}
            title={activeIsPlaying ? 'Pause' : 'Play'}
          >
            {activeIsPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={!isMobileActive && !currentTrack}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            title="Next"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={cycleRepeat}
            disabled={isMobileActive}
            className={`p-1.5 transition-colors disabled:opacity-30 ${
              repeatMode !== 'off'
                ? 'text-[var(--accent)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title={`Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'Repeat All (Loop Playlist)' : 'Repeat One (Loop Song)'}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Waveform & Time */}
        <div className="w-full flex items-center gap-3">
          <span className={`text-[11px] font-mono w-9 text-right ${isMobileActive ? 'text-emerald-400 font-bold' : 'text-[var(--text-muted)]'}`}>
            {formatDuration(activeCurrentTime)}
          </span>

          <div className="flex-1">
            <WaveformBar
              waveformData={isMobileActive ? resolvedMobileTrack?.waveform_data : currentTrack?.waveform_data}
              currentTime={activeCurrentTime}
              duration={activeDuration}
              onSeek={handleSeek}
            />
          </div>

          <span className={`text-[11px] font-mono w-9 ${isMobileActive ? 'text-emerald-400/80' : 'text-[var(--text-muted)]'}`}>
            {formatDuration(activeDuration)}
          </span>
        </div>
      </div>

      {/* Right: DJ Key/BPM Info, Queue, Volume */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
        {/* BPM & Camelot Key Badge */}
        {isDjMode && (isMobileActive ? resolvedMobileTrack : currentTrack) && (
          (() => {
            const tr = isMobileActive ? resolvedMobileTrack : currentTrack;
            if (!tr || (!tr.bpm && !tr.camelot_key)) return null;
            return (
              <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[10px] font-mono text-emerald-400">
                {tr.bpm && <span>{Math.round(tr.bpm)} BPM</span>}
                {tr.bpm && tr.camelot_key && <span>•</span>}
                {tr.camelot_key && <span>{tr.camelot_key}</span>}
              </div>
            );
          })()
        )}

        {/* Video Mode Button */}
        {currentTrack?.media_type === 'video' && (
          <button
            onClick={() => setVideoModalOpen(true)}
            className="text-[var(--text-secondary)] hover:text-white p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
            title="Video View"
          >
            <Tv className="w-4 h-4 text-purple-400" />
          </button>
        )}

        {/* DJ Deck Performance Panel Toggle */}
        {isDjMode && (
          <button
            onClick={() => toggleDeckExpanded()}
            className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 text-xs font-mono font-bold ${
              isDeckExpanded
                ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : pitchPercent !== 0
                ? 'text-emerald-400 bg-[var(--bg-tertiary)] border border-emerald-500/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
            title="Toggle DJ Deck Performance Panel (Pitch, Hot Cues, Tap-Tempo)"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden xl:inline">DJ DECK</span>
          </button>
        )}

        {/* Mini Player Toggle */}
        <button
          onClick={() => toggleMiniPlayer(true)}
          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          title="Switch to Floating Mini Player (Ctrl+M)"
        >
          <PictureInPicture className="w-4 h-4" />
        </button>

        {/* Up Next Queue Toggle */}
        <button
          onClick={toggleRightSidebar}
          className={`p-1.5 rounded-md transition-colors ${
            isRightSidebarOpen
              ? 'text-emerald-400 bg-[var(--bg-tertiary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
          title="Queue & Info"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Send Playback to Phone Button */}
        {activeCompanionCount > 0 && currentTrack && !isMobileActive && (
          <button
            onClick={handleTransferToPhone}
            className="p-1.5 rounded-md transition-colors text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center gap-1 cursor-pointer"
            title="Transfer playback to connected mobile phone"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="hidden 2xl:inline text-[10px] font-mono font-bold">TO PHONE</span>
          </button>
        )}

        {/* Mobile Companion Devices Indicator */}
        <button
          onClick={openPairingModal}
          className={`p-1.5 rounded-md transition-colors relative flex items-center gap-1 cursor-pointer ${
            activeCompanionCount > 0
              ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
          title={
            activeCompanionCount > 0
              ? `${activeCompanionCount} Mobile Companion device(s) connected. Click to manage.`
              : 'Pair Mobile Companion (iOS / Android)'
          }
        >
          <Smartphone className={`w-4 h-4 ${activeCompanionCount > 0 ? 'animate-pulse' : ''}`} />
          {activeCompanionCount > 0 && (
            <span className="text-[10px] font-mono font-bold">{activeCompanionCount}</span>
          )}
        </button>

        {/* Volume Slider */}
        <div className="flex items-center gap-1.5 group">
          <button
            onClick={toggleMute}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 cursor-pointer"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>
      </div>
    </footer>
    </>
  );
};
