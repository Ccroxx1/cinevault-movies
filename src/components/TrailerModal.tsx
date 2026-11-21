import React, { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { getSafeYoutubeId } from '../utils/safeUrl';

interface TrailerModalProps {
  ytTrailerCode: string;
  movieTitle: string;
  onClose: () => void;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({
  ytTrailerCode,
  movieTitle,
  onClose
}) => {
  useBodyScrollLock(Boolean(ytTrailerCode || movieTitle));
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!ytTrailerCode && !movieTitle) return null;

  const safeYtCode = getSafeYoutubeId(ytTrailerCode);

  const embedUrl = safeYtCode
    ? `https://www.youtube-nocookie.com/embed/${safeYtCode}?autoplay=1&rel=0&modestbranding=1`
    : `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(movieTitle + ' official trailer')}&autoplay=1`;

  const externalUrl = safeYtCode
    ? `https://www.youtube.com/watch?v=${safeYtCode}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(movieTitle + ' official trailer')}`;

  return (
    <div
      data-trailer-modal="true"
      className="fixed inset-0 z-60 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-150"
      style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`${movieTitle} Trailer`}
    >
      <div className="modal-dialog-surface cv-surface-elevated border relative w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b cv-border cv-surface-muted">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold cv-text truncate max-w-md">
              {movieTitle} — Official Trailer
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="hidden sm:flex items-center gap-1.5 text-xs cv-text-muted hover:text-[var(--cv-accent-text)] transition-colors"
            >
              <span>Open on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-2 cv-btn-secondary rounded-full transition-colors cursor-pointer"
              aria-label="Close trailer"
              title="Close trailer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 16:9 Video Player Container (Always Black Cinema Viewport) */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title={`${movieTitle} Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>

      </div>
    </div>
  );
};
