import React, { useState, useEffect } from 'react';
import { Movie, buildMagnetLink } from '../types';
import { getMoviePath } from '../utils/seo';
import { getPosterCandidates, CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';
import { BookmarkPlusIcon, BookmarkIcon, PlayIcon, CopyIcon } from './ActionIcons';

interface PopularTopFiveProps {
  movies: Movie[];
  isLoading: boolean;
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isWatchlisted: (movieId: number) => boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

interface PopularCardProps {
  movie: Movie;
  rank: { label: string; bg: string };
  isWatch: boolean;
  copiedId: number | null;
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onToggleWatchlist: (movie: Movie) => void;
  handleCopyMagnet: (e: React.MouseEvent, movie: Movie) => void;
}

const PopularCard: React.FC<PopularCardProps> = ({
  movie,
  rank,
  isWatch,
  copiedId,
  onSelectMovie,
  onPlayTrailer,
  onToggleWatchlist,
  handleCopyMagnet
}) => {
  const posterCandidates = getPosterCandidates(movie);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasAllFailed, setHasAllFailed] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setHasAllFailed(false);
  }, [movie.id]);

  const handleImageError = () => {
    if (candidateIndex + 1 < posterCandidates.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setHasAllFailed(true);
    }
  };

  const currentPosterSrc = posterCandidates[candidateIndex] || CINEVAULT_POSTER_FALLBACK;
  const primaryTorrent = movie.torrents?.[0];
  const has4k = movie.torrents?.some(t => t.quality?.includes('2160p'));

  return (
    <div
      onClick={(e) => {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
          e.preventDefault();
          onSelectMovie(movie);
        }
      }}
      className="group relative bg-[#0e0e0e] hover:bg-[#141414] border border-white/10 hover:border-rose-500/60 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-rose-950/30 flex flex-col text-inherit select-none"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#050505]">
        {!hasAllFailed ? (
          <img
            key={`pop-poster-${movie.id}-${candidateIndex}`}
            src={currentPosterSrc}
            alt={`${movie.title} (${movie.year || ''})`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-neutral-900 text-neutral-500">
            <span className="text-2xl mb-1"></span>
            <span className="text-xs font-semibold text-neutral-300 line-clamp-2">{movie.title}</span>
          </div>
        )}

        {/* Rank Badge */}
        <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10">
          <span className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-lg ${rank.bg}`}>
            {rank.label}
          </span>
        </div>

        {/* 4K Badge & Watchlist Button */}
        <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-10 flex items-center gap-1">
          {has4k && (
            <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black bg-rose-600 text-white shadow-md">
              4K
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWatchlist(movie);
            }}
            className={`p-1.5 rounded-full backdrop-blur-md border transition-all ${
              isWatch
                ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                : 'bg-black/60 text-neutral-300 hover:text-white border-white/20 hover:bg-black/80'
            }`}
            title={isWatch ? 'Remove from Watchlist' : 'Add to Watchlist'}
            aria-label="Toggle Watchlist"
          >
            {isWatch ? <BookmarkIcon size={15} /> : <BookmarkPlusIcon size={15} />}
          </button>
        </div>

        {/* Hover & Mobile Actions Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 z-10">
          {/* Rating & Year */}
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1 text-amber-400">
              <span aria-hidden="true" className="hidden" />
              {movie.rating ? movie.rating.toFixed(1) : '7.5'}
            </span>
            <span className="text-neutral-300">{movie.year}</span>
          </div>

          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="text-[10px] text-neutral-300 line-clamp-1 font-medium">
              {movie.genres.slice(0, 2).join(' / ')}
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {movie.yt_trailer_code ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTrailer(movie.yt_trailer_code, movie.title);
                }}
                className="h-7 sm:h-7.5 px-1.5 sm:px-2 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 backdrop-blur-md transition-colors"
                title="Watch Trailer"
              >
                <PlayIcon size={13} />
                <span>Trailer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectMovie(movie)}
                className="h-7 sm:h-7.5 px-1.5 sm:px-2 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 backdrop-blur-md transition-colors"
              >
                <span aria-hidden="true" className="hidden" />
                <span>Details</span>
              </button>
            )}

            {primaryTorrent && (
              <button
                type="button"
                onClick={(e) => handleCopyMagnet(e, movie)}
                className="h-7 sm:h-7.5 px-1.5 sm:px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                title={`Copy Magnet URI (${primaryTorrent.quality})`}
              >
                <CopyIcon size={13} />
                {copiedId === movie.id ? (
                  <>
                    <span className="text-[9px] sm:text-[10px]">Copied</span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] sm:text-[10px]">Magnet</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Movie Title & Info Footer */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-1">
        <h3
          className="font-bold text-xs sm:text-sm text-neutral-100 line-clamp-1 group-hover:text-rose-400 transition-colors"
          title={movie.title}
        >
          <a
            href={getMoviePath(movie)}
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                onSelectMovie(movie);
              }
            }}
            className="hover:underline"
          >
            {movie.title}
          </a>
        </h3>

        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400">
          <span>{movie.year}</span>
          <span className="flex items-center gap-1 text-amber-400 font-semibold">
            <span aria-hidden="true" className="hidden" />
            {movie.rating ? movie.rating.toFixed(1) : '7.5'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const PopularTopFive: React.FC<PopularTopFiveProps> = ({
  movies,
  isLoading,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  isWatchlisted,
  onToggleWatchlist
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Take top 5 movies
  const topFive = movies.slice(0, 5);
  const currentYear = new Date().getFullYear();

  const handleCopyMagnet = (e: React.MouseEvent, movie: Movie) => {
    e.stopPropagation();
    const primaryTorrent = movie.torrents?.[0];
    if (!primaryTorrent) return;

    const magnetUrl = buildMagnetLink(primaryTorrent.hash, movie.title_long || movie.title);
    onCopyMagnet(magnetUrl, `${movie.title} (${primaryTorrent.quality})`);
    setCopiedId(movie.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const rankBadges = [
    { label: '#1 Top', bg: 'bg-amber-500 text-black shadow-amber-500/40' },
    { label: '#2', bg: 'bg-slate-200 text-black shadow-slate-300/30' },
    { label: '#3', bg: 'bg-amber-700 text-white shadow-amber-800/30' },
    { label: '#4', bg: 'bg-rose-600 text-white shadow-rose-900/30' },
    { label: '#5', bg: 'bg-rose-700 text-white shadow-rose-900/30' }
  ];

  if (!isLoading && topFive.length === 0) {
    return null;
  }

  return (
    <section id="top-5-popular-movies" className="w-full mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              5 Latest Popular Movies ({currentYear})
            </h2>
            <p className="text-xs text-neutral-400">
              Top trending box office releases & highest-seeded torrents of {currentYear}
            </p>
          </div>
        </div>
      </div>

      {/* 5-Cards Grid */}
      {isLoading && topFive.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`pop-skeleton-${i}`}
              className="aspect-[2/3] rounded-2xl bg-[#101010] border border-white/5 animate-pulse flex flex-col justify-end p-3 space-y-2"
            >
              <div className="h-4 bg-[#1e1e1e] rounded w-3/4" />
              <div className="h-3 bg-[#1e1e1e]/60 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : topFive.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {topFive.map((movie, index) => (
            <PopularCard
              key={`pop-${movie.id}`}
              movie={movie}
              rank={rankBadges[index] || { label: `#${index + 1}`, bg: 'bg-neutral-800 text-white' }}
              isWatch={isWatchlisted(movie.id)}
              copiedId={copiedId}
              onSelectMovie={onSelectMovie}
              onPlayTrailer={onPlayTrailer}
              onToggleWatchlist={onToggleWatchlist}
              handleCopyMagnet={handleCopyMagnet}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};
