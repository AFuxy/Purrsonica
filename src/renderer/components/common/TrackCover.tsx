import React, { useState, useEffect } from 'react';
import { Music, Disc, Tv } from 'lucide-react';

interface TrackCoverProps {
  coverPath?: string | null;
  mediaType?: string;
  alt?: string;
  className?: string;
  fallbackIconClassName?: string;
  fallbackType?: 'music' | 'disc' | 'video';
  loading?: 'lazy' | 'eager';
}

export const TrackCover: React.FC<TrackCoverProps> = ({
  coverPath,
  mediaType = 'audio',
  alt = 'Cover artwork',
  className = 'w-full h-full object-cover',
  fallbackIconClassName = 'w-5 h-5 text-[var(--text-muted)]',
  fallbackType = 'music',
  loading = 'lazy',
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state whenever the cover path changes
  useEffect(() => {
    setHasError(false);
  }, [coverPath]);

  const coverUrl = coverPath && window.api ? window.api.getCoverUrl(coverPath) : null;

  if (coverUrl && !hasError) {
    return (
      <img
        src={coverUrl}
        alt={alt}
        loading={loading}
        decoding="async"
        draggable={false}
        onError={() => setHasError(true)}
        className={`${className} select-none`}
      />
    );
  }

  // Fallback icon rendering
  if (mediaType === 'video' || fallbackType === 'video') {
    return <Tv className={fallbackIconClassName || 'w-5 h-5 text-purple-400'} />;
  }

  if (fallbackType === 'disc') {
    return <Disc className={fallbackIconClassName || 'w-6 h-6 text-[var(--text-muted)]'} />;
  }

  return <Music className={fallbackIconClassName || 'w-5 h-5 text-[var(--text-muted)]'} />;
};
