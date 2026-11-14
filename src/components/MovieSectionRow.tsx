import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Film } from 'lucide-react';
import { Movie, buildMagnetLink } from '../types';
import { getMoviePath } from '../utils/seo';
import { getPosterCandidates, CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';
import { BookmarkPlusIcon, BookmarkIcon, PlayIcon, CopyIcon } from './ActionIcons';
import { useIntersectionLazyLoad } from '../hooks/useIntersectionLazyLoad';

export interface CuratedSectionConfig {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  filterParams: {
    genre?: string;
    minimum_rating?: number;
    sort_by?: string;
    order_by?: 'desc' | 'asc';
    query_term?: string;
    quality?: string;
    min_year?: number;
    max_year?: number;
  };
}

export const CURATED_SECTIONS: CuratedSectionConfig[] = [
  {
    id: 'trending',
    title: 'Trending Movies',
    subtitle: 'Currently buzzing worldwide & most active seeders',
    badge: 'Popular Now',
    accentColor: 'from-orange-500/20 text-orange-400 border-orange-500/30',
    filterParams: { sort_by: 'download_count', order_by: 'desc' }
  },
  {
    id: 'top-imdb',
    title: 'Top IMDb Masterpieces',
    subtitle: 'Highest critically acclaimed cinema (Rating 8.0+)',
    badge: 'Critically Acclaimed',
    accentColor: 'from-amber-500/20 text-amber-400 border-amber-500/30',
    filterParams: { minimum_rating: 8, sort_by: 'rating', order_by: 'desc' }
  },
  {
    id: 'sci-fi',
    title: 'Science Fiction & Mind-Benders',
    subtitle: 'Interstellar voyages, dystopian futures & paradoxes',
    badge: 'Futuristic',
    accentColor: 'from-cyan-500/20 text-cyan-400 border-cyan-500/30',
    filterParams: { genre: 'Sci-Fi', sort_by: 'rating', order_by: 'desc', minimum_rating: 7 }
  },
  {
    id: 'superhero',
    title: 'Superhero Universe & Action Sagas',
    subtitle: 'Marvel, DC, and high-octane multiverse action',
    badge: 'Epic Heroes',
    accentColor: 'from-blue-500/20 text-blue-400 border-blue-500/30',
    filterParams: { genre: 'Action', sort_by: 'like_count', order_by: 'desc', minimum_rating: 7 }
  },
  {
    id: 'crime-thriller',
    title: 'Crime & Mystery Thrillers',
    subtitle: 'Gripping whodunits, noir investigations & psychological tension',
    badge: 'High Suspense',
    accentColor: 'from-violet-500/20 text-violet-400 border-violet-500/30',
    filterParams: { genre: 'Thriller', minimum_rating: 7.2, sort_by: 'rating', order_by: 'desc' }
  },
  {
    id: 'best-drama',
    title: 'Best Drama Movies',
    subtitle: 'Emotionally gripping stories & legendary character studies',
    badge: 'Deep & Moving',
    accentColor: 'from-rose-500/20 text-rose-400 border-rose-500/30',
    filterParams: { genre: 'Drama', minimum_rating: 7.8, sort_by: 'rating', order_by: 'desc' }
  },
  {
    id: 'best-comedy',
    title: 'Top Comedy & Feel-Good Cinema',
    subtitle: 'Laugh-out-loud favorites & witty adventures',
    badge: 'Non-stop Laughs',
    accentColor: 'from-lime-500/20 text-lime-400 border-lime-500/30',
    filterParams: { genre: 'Comedy', sort_by: 'download_count', order_by: 'desc', minimum_rating: 6.8 }
  },
  {
    id: 'family-animation',
    title: 'Animation & Family Gems',
    subtitle: 'Timeless studio animation and heartwarming journeys',
    badge: 'Universal Appeal',
    accentColor: 'from-teal-500/20 text-teal-400 border-teal-500/30',
    filterParams: { genre: 'Animation', sort_by: 'rating', order_by: 'desc', minimum_rating: 7.5 }
  },
  {
    id: 'upcoming',
    title: 'Latest High-Bitrate Releases',
    subtitle: `Brand new ${new Date().getFullYear() - 1}–${new Date().getFullYear()} additions & freshest encodes`,
    badge: 'Fresh Encodes',
    accentColor: 'from-indigo-500/20 text-indigo-400 border-indigo-500/30',
    filterParams: { sort_by: 'date_added', order_by: 'desc', min_year: new Date().getFullYear() - 1 }
  }
];

interface MovieSectionRowProps {
  section: CuratedSectionConfig;
  movies: Movie[];
  isLoading: boolean;
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isWatchlisted: (movieId: number) => boolean;
  onToggleWatchlist: (movie: Movie) => void;
  onViewAll?: () => void;
}

interface MovieSectionCardProps {
  sectionId: string;
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isSaved: boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

const MovieSectionCard: React.FC<MovieSectionCardProps> = ({
  sectionId,
  movie,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  isSaved,
  onToggleWatchlist
}) => {
  const [cardRef, isVisible] = useIntersectionLazyLoad<HTMLElement>({
    rootMargin: '250px 0px 250px 0px',
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const posterCandidates = getPosterCandidates(movie);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasAllFailed, setHasAllFailed] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

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
  const torrent = movie.torrents?.[0];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (torrent) {
      const magnet = buildMagnetLink(torrent.hash, movie.title_long || movie.title);
      onCopyMagnet(magnet, `${movie.title} (${torrent.quality})`);
      setCopiedHash(torrent.hash);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  return (
    <article
      ref={cardRef}
      onClick={(e) => {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
          e.preventDefault();
          onSelectMovie(movie);
        }
      }}
      className="movie-card-contain group relative shrink-0 w-36 sm:w-44 md:w-48 snap-start rounded-2xl overflow-hidden bg-[#0e0e0e] border border-white/10 hover:border-white/25 transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/80 flex flex-col cursor-pointer text-inherit select-none"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
        {!isLoaded && !hasAllFailed && (
          <div
            aria-hidden="true"
            className="absolute inset-0 skeleton-shimmer z-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500/40">
              <Film className="w-4 h-4" />
            </div>
          </div>
        )}

        {!hasAllFailed ? (
          isVisible ? (
            <img
              key={`section-poster-${sectionId}-${movie.id}-${candidateIndex}`}
              ref={(imgEl) => {
                if (imgEl && imgEl.complete && imgEl.naturalWidth > 0 && !isLoaded) {
                  setIsLoaded(true);
                }
              }}
              src={currentPosterSrc}
              alt={`${movie.title} (${movie.year}) Poster`}
              width="192"
              height="288"
              referrerPolicy="no-referrer"
              loading="eager"
              decoding="async"
              onLoad={() => setIsLoaded(true)}
              onError={handleImageError}
              className={`w-full h-full object-cover transition-opacity duration-300 group-hover:scale-105 group-hover:transition-transform group-hover:duration-500 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : null
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-neutral-900 text-neutral-500">
            <span className="text-xs font-semibold text-neutral-300 line-clamp-2">{movie.title}</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/85 border border-white/15 text-[11px] font-bold text-amber-400">
          <span>{movie.rating ? movie.rating.toFixed(1) : '7.5'}</span>
        </div>

        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/85 border border-white/15 text-[10px] font-semibold text-neutral-300">
          {movie.year}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 space-y-2 z-10">
          <div className="flex items-center gap-1.5">
            {movie.yt_trailer_code && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPlayTrailer(movie.yt_trailer_code, movie.title);
                }}
                className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-lg"
                aria-label="Watch Trailer"
              >
                <PlayIcon size={14} />
                <span>Trailer</span>
              </button>
            )}

            {torrent && (
              <button
                type="button"
                onClick={handleCopy}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  copiedHash === torrent.hash
                    ? 'bg-emerald-500 text-white border-emerald-400 scale-105 shadow-md shadow-emerald-950/60'
                    : 'bg-[#6ac045]/20 hover:bg-[#6ac045]/30 border border-[#6ac045]/40 text-[#6ac045]'
                }`}
                title={copiedHash === torrent.hash ? 'Copied Magnet Link!' : 'Copy Magnet Link'}
                aria-label={copiedHash === torrent.hash ? 'Copied Magnet Link!' : 'Copy Magnet Link'}
              >
                <CopyIcon size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWatchlist(movie);
              }}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isSaved ? 'bg-rose-600 text-white border-rose-500' : 'bg-black/60 text-neutral-300 hover:text-white border-white/20'
              }`}
              title={isSaved ? 'Remove from Watchlist' : 'Add to Watchlist'}
              aria-label={isSaved ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              {isSaved ? <BookmarkIcon size={15} /> : <BookmarkPlusIcon size={15} />}
            </button>
          </div>
        </div>
      </div>

      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1">
        <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-rose-400 transition-colors">
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
        <div className="flex items-center justify-between text-[10px] text-neutral-400">
          <span className="line-clamp-1">{movie.genres?.[0] || 'Feature'}</span>
          {torrent && (
            <span className="font-mono px-1 py-0.2 rounded bg-neutral-800 text-neutral-300 font-semibold">
              {torrent.quality}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export const MovieSectionRow: React.FC<MovieSectionRowProps> = ({
  section,
  movies,
  isLoading,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  isWatchlisted,
  onToggleWatchlist,
  onViewAll
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollBounds = useCallback(() => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setCanScrollLeft(scrollLeft > 8);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
    }
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    checkScrollBounds();
    el.addEventListener('scroll', checkScrollBounds, { passive: true });
    window.addEventListener('resize', checkScrollBounds, { passive: true });
    return () => {
      el.removeEventListener('scroll', checkScrollBounds);
      window.removeEventListener('resize', checkScrollBounds);
    };
  }, [movies, checkScrollBounds]);

  if (!isLoading && (!movies || movies.length === 0)) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const step = Math.max(280, rowRef.current.clientWidth * 0.75);
      const scrollAmount = direction === 'left' ? -step : step;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="movie-section-contain space-y-3.5 my-8" aria-labelledby={`${section.id}-heading`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 id={`${section.id}-heading`} className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {section.title}
          </h2>
          <p className="text-xs text-neutral-400">
            {section.subtitle}
          </p>
        </div>

        <nav aria-label={`${section.title} controls`} className="flex items-center gap-1.5">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-semibold text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer mr-1"
            >
              Explore All
            </button>
          )}
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="p-1.5 text-neutral-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Scroll left"
            title="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="p-1.5 text-neutral-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Scroll right"
            title="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      </div>

      <div
        ref={rowRef}
        className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skeleton-${section.id}-${i}`}
              className="shrink-0 w-40 sm:w-48 aspect-[2/3] rounded-2xl bg-neutral-900 border border-white/5 animate-pulse"
            />
          ))
        ) : (
          movies.map((movie) => (
            <MovieSectionCard
              key={`${section.id}-${movie.id}`}
              sectionId={section.id}
              movie={movie}
              onSelectMovie={onSelectMovie}
              onPlayTrailer={onPlayTrailer}
              onCopyMagnet={onCopyMagnet}
              isSaved={isWatchlisted(movie.id)}
              onToggleWatchlist={onToggleWatchlist}
            />
          ))
        )}
      </div>
    </section>
  );
};
