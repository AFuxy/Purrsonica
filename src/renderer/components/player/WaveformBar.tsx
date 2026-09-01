import React, { useRef, useState, useMemo } from 'react';
import { formatDuration } from '../../../shared/formatters.js';
import { useThemeStore } from '../../store/themeStore.js';
import { useScanStore } from '../../store/scanStore.js';

interface WaveformBarProps {
  waveformData?: number[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  accentColor?: string;
  crossfadeDuration?: number;
}

export const WaveformBar: React.FC<WaveformBarProps> = ({
  waveformData,
  currentTime,
  duration,
  onSeek,
  accentColor: propAccentColor,
  crossfadeDuration: propCrossfadeDuration,
}) => {
  const storeAccent = useThemeStore((s) => s.accentColor);
  const accentColor = propAccentColor || storeAccent || '#10b981';
  const settingsCrossfade = useScanStore((s) => s.settings?.crossfadeDuration ?? 0);
  const crossfadeDuration = propCrossfadeDuration !== undefined ? propCrossfadeDuration : settingsCrossfade;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Generate fallback peaks if not provided
  const peaks = useMemo(() => {
    if (waveformData && waveformData.length >= 20) {
      return waveformData;
    }
    // Dynamic aesthetic wave envelope
    const count = 120;
    const generated: number[] = [];
    for (let i = 0; i < count; i++) {
      const p1 = Math.sin((i / count) * Math.PI * 4);
      const p2 = Math.cos((i / count) * Math.PI * 9) * 0.4;
      const noise = (Math.sin(i * 13.37) % 1) * 0.2;
      const val = Math.min(1.0, Math.max(0.12, Math.abs(p1 + p2 + noise)));
      generated.push(Number(val.toFixed(3)));
    }
    return generated;
  }, [waveformData]);

  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const crossfadeRatio = duration > 0 && crossfadeDuration > 0
    ? Math.min(0.4, crossfadeDuration / duration)
    : 0;

  const calculateTimeFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = x / rect.width;
    return ratio * duration;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = x / rect.width;
    setHoverPosition(ratio);
    setHoverTime(ratio * duration);

    if (isDragging) {
      onSeek(ratio * duration);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const newTime = calculateTimeFromEvent(e);
    onSeek(newTime);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
    setHoverTime(null);
    setIsDragging(false);
  };

  // Tooltip transition zone label
  const getHoverLabel = () => {
    if (hoverTime === null || hoverPosition === null) return '';
    const formatted = formatDuration(hoverTime);
    if (crossfadeRatio > 0) {
      if (hoverPosition >= 1 - crossfadeRatio) {
        return `${formatted} (Fade-Out ${crossfadeDuration}s)`;
      }
      if (hoverPosition <= crossfadeRatio) {
        return `${formatted} (Fade-In ${crossfadeDuration}s)`;
      }
    }
    return formatted;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-8 flex items-center cursor-pointer group py-1 select-none"
    >
      {/* Hover timestamp tooltip */}
      {hoverTime !== null && hoverPosition !== null && (
        <div
          className="absolute -top-7 transform -translate-x-1/2 bg-neutral-900 text-neutral-100 text-[10px] font-mono px-2 py-0.5 rounded shadow-lg border border-neutral-700 pointer-events-none z-30 whitespace-nowrap"
          style={{ left: `${hoverPosition * 100}%` }}
        >
          {getHoverLabel()}
        </div>
      )}

      {/* Visual Crossfade Transition Zone: Fade-In (Start) */}
      {crossfadeRatio > 0 && (
        <div
          className="absolute left-0 top-0.5 bottom-0.5 bg-gradient-to-r from-white/20 via-white/10 to-transparent border-r border-dashed border-white/40 rounded-l-md pointer-events-none z-10"
          style={{ width: `${crossfadeRatio * 100}%` }}
          title={`Fade-In Zone: ${crossfadeDuration}s`}
        />
      )}

      {/* Visual Crossfade Transition Zone: Fade-Out (End) */}
      {crossfadeRatio > 0 && (
        <div
          className="absolute right-0 top-0.5 bottom-0.5 bg-gradient-to-l from-white/25 via-white/10 to-transparent border-l border-dashed border-white/40 rounded-r-md pointer-events-none z-10"
          style={{ width: `${crossfadeRatio * 100}%` }}
          title={`Fade-Out Transition Zone: ${crossfadeDuration}s`}
        />
      )}

      {/* Waveform Bars Container */}
      <div className="w-full h-full flex items-center gap-[2px] justify-between relative z-0">
        {peaks.map((peak, idx) => {
          const barRatio = idx / peaks.length;
          const isPlayed = barRatio <= progressRatio;
          const isHovered = hoverPosition !== null && barRatio <= hoverPosition;
          const isInCrossfadeZone = crossfadeRatio > 0 && (barRatio <= crossfadeRatio || barRatio >= 1 - crossfadeRatio);

          // Height based on normalized amplitude peak
          const heightPercent = Math.max(15, Math.min(100, Math.round(peak * 100)));

          return (
            <div
              key={idx}
              className="flex-1 rounded-full transition-all duration-75"
              style={{
                height: `${heightPercent}%`,
                backgroundColor: isPlayed
                  ? accentColor
                  : isHovered
                  ? 'rgba(255, 255, 255, 0.65)'
                  : isInCrossfadeZone
                  ? 'rgba(255, 255, 255, 0.4)'
                  : 'rgba(128, 128, 128, 0.3)',
                boxShadow: isPlayed ? `0 0 6px ${accentColor}40` : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Playhead thumb line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20"
        style={{ left: `${progressRatio * 100}%` }}
      />
    </div>
  );
};
