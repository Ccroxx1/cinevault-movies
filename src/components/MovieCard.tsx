import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeftRight, Film, Download, Check } from 'lucide-react';
import { Movie, buildMagnetLink } from '../types';
import { getMoviePath } from '../utils/seo';
import { handleBrandedMagnetDownload } from '../utils/downloadPack';
import { getPosterCandidates, CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';
import { BookmarkPlusIcon, BookmarkIcon, PlayIcon, CopyIcon } from './ActionIcons';
import { useMovieComparison } from '../context/MovieComparisonContext';
import { TorrentSwarmHealthBadge } from './TorrentSwarmHealthBadge';
import { useIntersectionLazyLoad } from '../hooks/useIntersectionLazyLoad';

interface MovieCardProps {
  movie: Movie;
  priority?: boolean;
  onSelect: (movie: Movie) => void;
  onPlayTrailer?: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  priority = false,
  onSelect,
  onPlayTrailer,
  onCopyMagnet,
  isWatchlisted,
  onToggleWatchlist,
}) => {
  const [cardRef, isObservedVisible] = useIntersectionLazyLoad<HTMLElement>({
    rootMargin: '250px 0px 250px 0px',
  });
  const isVisible = priority || isObservedVisible;
  const [isLoaded, setIsLoaded] = useState(false);
  const posterCandidates = useMemo(() => getPosterCandidates(movie, 'medium'), [
    movie,
    movie.id,
    movie.imdb_code,
    movie.title,
    movie.title_english,
    movie.year,
    movie.medium_cover_image,
    movie.large_cover_image,
    movie.small_cover_image,
  ]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasAllFailed, setHasAllFailed] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const { addToComparison, removeFromComparison, isInComparison } = useMovieComparison();
  const isCompared = isInComparison(movie.id);

  useEffect(() => {
    setCandidateIndex(0);
    setHasAllFailed(false);
    setIsLoaded(false);
  }, [movie.id]);

  const handleImageError = () => {
    setIsLoaded(false);
    if (candidateIndex + 1 < posterCandidates.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setHasAllFailed(true);
    }
  };

  const currentPosterSrc = posterCandidates[candidateIndex] || CINEVAULT_POSTER_FALLBACK;

  const torrents = movie.torrents || [];
  const torrentCount = torrents.length;
  const qualities: string[] = Array.from(new Set(torrents.map((t) => t.quality).filter(Boolean)));
  const has4k = qualities.some((q) => typeof q === 'string' && q.includes('2160p'));
  const has1080 = qualities.some((q) => typeof q === 'string' && q.includes('1080p'));
  const has3d = qualities.some((q) => typeof q === 'string' && q.includes('3D'));

  const primaryTorrent = torrents[0];
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
      ref={cardRef}
      onClick={handleCardClick}
      className="movie-card-contain group relative bg-[#0a0a0a] hover:bg-[#111111] border border-white/5 hover:border-rose-500/50 rounded-2xl overflow-hidden cursor-pointer transition-[border-color,background-color,box-shadow,transform] duration-200 hover:shadow-2xl hover:shadow-rose-950/20 flex flex-col text-inherit select-none"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#050505]">
        {/* Cinema shimmer skeleton placeholder while deferred or loading */}
        {!isLoaded && !hasAllFailed && (
          <div
            aria-hidden="true"
            className="absolute inset-0 skeleton-shimmer z-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500/40">
              <Film className="w-5 h-5" />
            </div>
          </div>
        )}

        {!hasAllFailed ? (
          isVisible ? (
            <img
              key={`poster-${movie.id}-${candidateIndex}`}
              ref={(imgEl) => {
                if (imgEl && imgEl.complete && imgEl.naturalWidth > 0 && !isLoaded) {
                  setIsLoaded(true);
                }
              }}
              src={currentPosterSrc}
              alt={`${movie.title} (${movie.year}) Poster`}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding={priority ? 'sync' : 'async'}
              width="240"
              height="360"
              referrerPolicy="no-referrer"
              onLoad={() => setIsLoaded(true)}
              onError={handleImageError}
              className="relative z-[1] w-full h-full object-cover group-hover:scale-105 group-hover:transition-transform group-hover:duration-500"
            />
          ) : null
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
              className={`p-1.5 rounded-full border transition-colors shadow-md cursor-pointer ${
                isCompared
                  ? 'bg-amber-500 text-black border-amber-400 shadow-amber-900/40'
                  : 'bg-black/85 text-neutral-300 hover:text-white hover:bg-black border-white/15'
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
              className={`p-1.5 rounded-full border transition-colors shadow-md cursor-pointer ${
                isWatchlisted
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-900/30'
                  : 'bg-black/85 text-neutral-300 hover:text-white hover:bg-black border-white/15'
              }`}
              title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
              aria-label={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              {isWatchlisted ? <BookmarkIcon size={16} /> : <BookmarkPlusIcon size={16} />}
            </button>
          </div>
        </div>

        {/* Prominent 'Download' Badge indicating available torrent options at a glance */}
        {torrentCount > 0 ? (
          <div className="absolute bottom-2 inset-x-2 z-10 pointer-events-none group-hover:opacity-0 transition-opacity duration-200">
            <div className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-lg bg-black/90 border border-emerald-500/35 text-emerald-400 font-bold text-[10px] shadow-lg shadow-black/80 max-w-full">
              <Download className="w-2.5 h-2.5 shrink-0" />
              <span className="uppercase tracking-wider font-extrabold text-emerald-400 shrink-0">
                {has4k ? '4K UHD' : has1080 ? '1080p' : 'HD'}
              </span>
              <span className="w-1 h-1 rounded-full bg-emerald-400/50 shrink-0" />
              <span className="text-neutral-200 font-semibold truncate">
                {torrentCount} {torrentCount === 1 ? 'Option' : 'Options'}
              </span>
            </div>
          </div>
        ) : (
          <div className="absolute bottom-2 inset-x-2 z-10 pointer-events-none group-hover:opacity-0 transition-opacity duration-200">
            <div className="inline-flex items-center gap-1 py-0.5 px-2 rounded-lg bg-black/85 border border-white/10 text-neutral-400 font-medium text-[10px] shadow-md">
              <span>Streaming Only</span>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5 gap-2 z-10">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white text-black font-bold text-xs rounded-full hover:bg-neutral-200 shadow-lg transition-all">
              <span>Details</span>
            </div>

            {movie.yt_trailer_code && (
              <button
                type="button"
                onClick={handleTrailerClick}
                className="p-2 bg-black/80 hover:bg-black text-rose-500 hover:text-rose-400 rounded-full border border-white/20 shadow-lg transition-colors cursor-pointer"
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
                className={`p-1.5 rounded-full border transition-all cursor-pointer relative ${
                  copiedHash === primaryTorrent.hash
                    ? 'bg-emerald-600 text-white border-emerald-400 scale-105 shadow-md shadow-emerald-950/60'
                    : 'bg-black/80 hover:bg-black text-neutral-200 border-white/15'
                }`}
                title={copiedHash === primaryTorrent.hash ? 'Copied Magnet Link!' : 'Copy Magnet URI'}
                aria-label={copiedHash === primaryTorrent.hash ? 'Copied Magnet Link!' : 'Copy Magnet URI'}
              >
                {copiedHash === primaryTorrent.hash ? <Check size={16} /> : <CopyIcon size={16} />}
                {copiedHash === primaryTorrent.hash && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold shadow-lg whitespace-nowrap pointer-events-none animate-fadeIn">
                    Copied!
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3.5 min-h-[112px] flex-1 flex flex-col justify-between gap-2">
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

          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-1 truncate">
            <span className="truncate">{movie.genres?.slice(0, 2).join(' · ') || 'Cinema'}</span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-1.5 text-[11px] text-neutral-400 select-none">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-medium text-neutral-300 text-[11px] shrink-0">
              {torrentCount > 1 ? `${torrentCount} Formats` : primaryTorrent?.quality || 'HD'}
            </span>
            {primaryTorrent?.size && (
              <>
                <span aria-hidden="true" className="text-neutral-600 shrink-0">·</span>
                <span className="font-mono text-[10px] sm:text-[11px] text-neutral-400 truncate">
                  {primaryTorrent.size}
                </span>
              </>
            )}
          </div>

          {primaryTorrent ? (
            <TorrentSwarmHealthBadge
              seeds={primaryTorrent.seeds}
              peers={primaryTorrent.peers}
              compact={true}
            />
          ) : (
            <span className="text-[10px] text-neutral-500 shrink-0">Standard</span>
          )}
        </div>
      </div>
    </article>
  );
};
