import React, { useState, useEffect } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Movie, buildMagnetLink } from '../types';
import { getMoviePath } from '../utils/seo';
import { handleBrandedMagnetDownload } from '../utils/downloadPack';
import { getPosterCandidates, CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';
import { BookmarkPlusIcon, BookmarkIcon, PlayIcon, CopyIcon } from './ActionIcons';
import { useMovieComparison } from '../context/MovieComparisonContext';
import { TorrentSwarmHealthBadge } from './TorrentSwarmHealthBadge';

interface MovieCardProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
  onPlayTrailer?: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onSelect,
  onPlayTrailer,
  onCopyMagnet,
  isWatchlisted,
  onToggleWatchlist,
}) => {
  const posterCandidates = getPosterCandidates(movie);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasAllFailed, setHasAllFailed] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const { addToComparison, removeFromComparison, isInComparison } = useMovieComparison();
  const isCompared = isInComparison(movie.id);

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

  const qualities: string[] = Array.from(new Set(movie.torrents?.map((t) => t.quality) || []));
  const has4k = qualities.some((q) => typeof q === 'string' && q.includes('2160p'));
  const has1080 = qualities.some((q) => typeof q === 'string' && q.includes('1080p'));
  const has3d = qualities.some((q) => typeof q === 'string' && q.includes('3D'));

  const primaryTorrent = movie.torrents?.[0];
  const moviePath = getMoviePath(movie);

  const handleCopyPrimaryMagnet = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!primaryTorrent) return;
    const magnetUrl = buildMagnetLink(primaryTorrent.hash, movie.title_long || movie.title);
    onCopyMagnet(magnetUrl, `${movie.title} (${primaryTorrent.quality})`);
    setCopiedHash(primaryTorrent.hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleToggleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleWatchlist(movie);
  };

  const handleToggleComparisonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCompared) {
      removeFromComparison(movie.id);
    } else {
      addToComparison(movie);
    }
  };

  const handleTrailerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (movie.yt_trailer_code && onPlayTrailer) {
      onPlayTrailer(movie.yt_trailer_code, movie.title);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      onSelect(movie);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className="group relative bg-[#0a0a0a] hover:bg-[#111111] border border-white/5 hover:border-rose-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-rose-950/20 flex flex-col text-inherit select-none"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#050505]">
        {!hasAllFailed ? (
          <img
            key={`poster-${movie.id}-${candidateIndex}`}
            src={currentPosterSrc}
            alt={`${movie.title} (${movie.year}) Poster`}
            loading="lazy"
            width="240"
            height="360"
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-neutral-900 text-neutral-500">
            <span className="text-xs font-semibold text-neutral-400">{movie.title}</span>
          </div>
        )}

        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex flex-wrap gap-1">
            {has4k && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white rounded shadow-md">
                4K UHD
              </span>
            )}
            {has1080 && !has4k && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-neutral-200 border border-white/10 rounded shadow-md">
                1080p
              </span>
            )}
            {has3d && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white rounded shadow-md">
                3D
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Compare Versus Button */}
            <button
              type="button"
              onClick={handleToggleComparisonClick}
              className={`p-1.5 rounded-full backdrop-blur-md border transition-all shadow-md cursor-pointer ${
                isCompared
                  ? 'bg-amber-500 text-black border-amber-400 shadow-amber-900/40'
                  : 'bg-black/60 text-neutral-300 hover:text-white hover:bg-black/90 border-white/10'
              }`}
              title={isCompared ? 'Remove from Versus' : 'Add to Versus Compare'}
              aria-label={isCompared ? 'Remove from Versus' : 'Add to Versus Compare'}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>

            {/* Watchlist Button */}
            <button
              type="button"
              onClick={handleToggleWatchlistClick}
              className={`p-1.5 rounded-full backdrop-blur-md border transition-all shadow-md cursor-pointer ${
                isWatchlisted
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-900/30'
                  : 'bg-black/60 text-neutral-300 hover:text-white hover:bg-black/90 border-white/10'
              }`}
              title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
              aria-label={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              {isWatchlisted ? <BookmarkIcon size={16} /> : <BookmarkPlusIcon size={16} />}
            </button>
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5 gap-2 z-10">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white text-black font-bold text-xs rounded-full hover:bg-neutral-200 shadow-lg transition-all">
              <span>Details</span>
            </div>

            {movie.yt_trailer_code && (
              <button
                type="button"
                onClick={handleTrailerClick}
                className="p-2 bg-white/10 hover:bg-white/20 text-rose-500 hover:text-rose-400 rounded-full border border-white/20 backdrop-blur-md shadow-lg transition-colors cursor-pointer"
                title="Watch Trailer"
                aria-label="Watch Trailer"
              >
                <PlayIcon size={15} />
              </button>
            )}
          </div>

          {primaryTorrent && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBrandedMagnetDownload(movie, primaryTorrent, {
                    onStart: () => {
                      onCopyMagnet(
                        buildMagnetLink(primaryTorrent.hash, movie.title_long || movie.title),
                        `${movie.title} (${primaryTorrent.quality}) — Starting Download & CineVault Info`
                      );
                    },
                  });
                }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-full shadow-md shadow-emerald-950/30 transition-colors cursor-pointer"
                title={`Direct Magnet Download for ${primaryTorrent.quality}`}
              >
                <span>Magnet ({primaryTorrent.quality})</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPrimaryMagnet}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-neutral-200 rounded-full border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
                title="Copy Magnet URI"
                aria-label="Copy Magnet URI"
              >
                <CopyIcon size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
        <div>
          <div className="flex items-center justify-between gap-1.5 text-xs text-neutral-400 mb-1">
            <span className="font-medium text-neutral-300">{movie.year || 'N/A'}</span>
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <span>{movie.rating ? movie.rating.toFixed(1) : 'NR'}</span>
            </div>
          </div>

          <h3 className="font-display font-bold text-sm text-neutral-100 group-hover:text-rose-500 transition-colors line-clamp-1">
            <a
              href={moviePath}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  onSelect(movie);
                }
              }}
              className="hover:underline"
            >
              {movie.title}
            </a>
          </h3>

          <div className="flex flex-wrap gap-1 mt-1.5">
            {movie.genres?.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="text-[10px] font-medium text-neutral-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center gap-1">
            <span>{primaryTorrent?.size || 'Multi-size'}</span>
          </div>

          {primaryTorrent ? (
            <TorrentSwarmHealthBadge seeds={primaryTorrent.seeds} peers={primaryTorrent.peers} />
          ) : (
            <div className="flex items-center gap-1 text-neutral-400">
              <span>{movie.torrents?.length || 0} files</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
