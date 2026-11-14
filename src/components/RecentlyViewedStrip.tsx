import React, { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import { Movie, buildMagnetLink } from '../types';
import { PlayIcon } from './ActionIcons';
import { CINEVAULT_POSTER_FALLBACK, getPosterCandidates } from '../utils/imageFallback';
import { useIntersectionLazyLoad } from '../hooks/useIntersectionLazyLoad';

interface RecentlyViewedStripProps {
  recentMovies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  onClearRecent: () => void;
}

const RecentlyViewedCard: React.FC<{
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
}> = ({ movie, onSelectMovie, onPlayTrailer, onCopyMagnet }) => {
  const [cardRef, isVisible] = useIntersectionLazyLoad<HTMLElement>({
    rootMargin: '250px 0px 250px 0px',
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const posterCandidates = getPosterCandidates(movie);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
    setIsLoaded(false);
  }, [movie.id]);

  const handleImageError = () => {
    setIsLoaded(false);
    if (candidateIndex + 1 < posterCandidates.length) {
      setCandidateIndex((prev) => prev + 1);
    }
  };

  const currentPosterSrc = posterCandidates[candidateIndex] || CINEVAULT_POSTER_FALLBACK;
  const primaryTorrent = movie.torrents?.[0];
  const magnetUrl = primaryTorrent
    ? buildMagnetLink(primaryTorrent.hash, movie.title_long || movie.title)
    : null;

  return (
    <article
      ref={cardRef}
      className="group shrink-0 w-36 sm:w-44 snap-start bg-[#141414] hover:bg-[#1a1a1a] border border-white/10 hover:border-rose-500/40 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col justify-between"
      onClick={() => onSelectMovie(movie)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
        {!isLoaded && (
          <div
            aria-hidden="true"
            className="absolute inset-0 skeleton-shimmer z-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500/40">
              <Film className="w-4 h-4" />
            </div>
          </div>
        )}

        {isVisible ? (
          <img
            ref={(imgEl) => {
              if (imgEl && imgEl.complete && imgEl.naturalWidth > 0 && !isLoaded) {
                setIsLoaded(true);
              }
            }}
            src={currentPosterSrc}
            alt={`${movie.title} Poster`}
            loading="eager"
            decoding="async"
            width="176"
            height="264"
            onLoad={() => setIsLoaded(true)}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-opacity duration-300 group-hover:scale-105 group-hover:transition-transform group-hover:duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : null}
        
        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400 border border-white/10">
          {movie.rating?.toFixed(1) || 'N/A'}
        </div>

        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
          {movie.yt_trailer_code && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayTrailer(movie.yt_trailer_code, movie.title);
              }}
              className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-transform hover:scale-110"
              title="Play Trailer"
              aria-label="Play Trailer"
            >
              <PlayIcon size={15} />
            </button>
          )}

          {magnetUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopyMagnet(magnetUrl, `${movie.title} (${primaryTorrent?.quality})`);
              }}
              className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-transform hover:scale-110"
              title="Copy Magnet Link"
              aria-label="Copy Magnet Link"
            >
              <span className="font-bold text-[10px]">M</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-2.5">
        <h3 className="text-xs font-bold text-neutral-100 truncate group-hover:text-rose-400 transition-colors">
          {movie.title}
        </h3>
        <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1">
          <span>{movie.year}</span>
          <span className="truncate max-w-[70px]">{movie.genres?.[0] || 'Movie'}</span>
        </div>
      </div>
    </article>
  );
};

export const RecentlyViewedStrip: React.FC<RecentlyViewedStripProps> = ({
  recentMovies,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  onClearRecent
}) => {
  if (!recentMovies || recentMovies.length === 0) return null;

  return (
    <section className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3" aria-labelledby="recent-view-heading">
      <div className="flex items-center justify-between">
        <h2 id="recent-view-heading" className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <span>Recently Inspected Titles</span>
          <span className="text-xs font-normal text-neutral-400 font-mono">
            ({recentMovies.length})
          </span>
        </h2>

        <button
          onClick={onClearRecent}
          className="text-xs text-neutral-400 hover:text-rose-400 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
          aria-label="Clear recent browsing history"
        >
          Clear History
        </button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x snap-mandatory scroll-smooth">
        {recentMovies.map((movie) => (
          <RecentlyViewedCard
            key={`recent-${movie.id}`}
            movie={movie}
            onSelectMovie={onSelectMovie}
            onPlayTrailer={onPlayTrailer}
            onCopyMagnet={onCopyMagnet}
          />
        ))}
      </div>
    </section>
  );
};
