import React, { useEffect } from 'react';
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!ytTrailerCode) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#050505]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-md">
              {movieTitle} — Official Trailer
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`https://www.youtube.com/watch?v=${ytTrailerCode}`}
              target="_blank"
              rel="noreferrer noopener"
              className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              <span>Open on YouTube</span>
              <span aria-hidden="true" className="hidden" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              aria-label="Close trailer"
            >
                Close
              </button>
          </div>
        </div>

        {/* 16:9 Video Player Container */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytTrailerCode}?autoplay=1&rel=0&modestbranding=1`}
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
