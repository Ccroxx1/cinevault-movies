import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
  onBecomeVisible?: (sectionId: string) => void;
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
      className="movie-card-contain group relative shrink-0 w-36 sm:w-44 md:w-48 snap-start rounded-2xl overflow-hidden cv-card-interactive border hover:-translate-y-1 hover:shadow-2xl flex flex-col cursor-pointer text-inherit select-none"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-950">
        {!isLoaded && !hasAllFailed && (
          <div
            aria-hidden="true"
            className="absolute inset-0 skeleton-shimmer z-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cv-text-muted">
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
              loading="lazy"
              decoding="async"
              onLoad={() => setIsLoaded(true)}
              onError={handleImageError}
              className="relative z-[1] w-full h-full object-cover group-hover:scale-105 group-hover:transition-transform group-hover:duration-500"
            />
          ) : null
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-neutral-900 text-neutral-300">
            <span className="text-xs font-semibold text-neutral-200 line-clamp-2">{movie.title}</span>
          </div>
        )}

        <div className="poster-badge absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/85 border border-white/15 text-[11px] font-bold text-amber-400">
          <span className="cv-rating-overlay">{movie.rating ? movie.rating.toFixed(1) : '7.5'}</span>
        </div>

        <div className="poster-badge absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/85 border border-white/15 text-[10px] font-semibold text-neutral-200">
          {movie.year}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 space-y-2 z-10">
          <div className="flex items-center gap-1.5">
            {movie.yt_trailer_code && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPlayTrailer(movie.yt_trailer_code, movie.title);
                }}
                className="cv-btn-playback flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-lg"
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
                    ? 'cv-btn-magnet scale-105 shadow-md'
                    : 'bg-[#047857]/90 hover:bg-[#065f46] border-emerald-400/50 text-white'
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
                isSaved ? 'cv-btn-primary' : 'bg-black/75 text-neutral-200 hover:text-white border-white/25'
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
        <h3 className="text-xs sm:text-sm font-bold cv-text cv-group-hover-accent line-clamp-1 transition-colors">
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
        <div className="flex items-center justify-between text-[10px] cv-text-muted">
          <span className="line-clamp-1">{movie.genres?.[0] || 'Feature'}</span>
          {torrent && (
            <span className="cv-badge-neutral border font-mono px-1.5 py-0.5 rounded font-semibold">
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
  onViewAll,
  onBecomeVisible
}) => {
  const [sectionVisRef, isSectionNearViewport] = useIntersectionLazyLoad<HTMLElement>({
    rootMargin: '450px 0px 450px 0px',
  });
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const triggeredVisibilityRef = useRef(false);

  useEffect(() => {
    if (isSectionNearViewport && onBecomeVisible && !triggeredVisibilityRef.current) {
      triggeredVisibilityRef.current = true;
      onBecomeVisible(section.id);
    }
  }, [isSectionNearViewport, onBecomeVisible, section.id]);

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

  if (!isLoading && (!movies || movies.length === 0) && triggeredVisibilityRef.current) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const step = Math.max(280, rowRef.current.clientWidth * 0.75);
      const scrollAmount = direction === 'left' ? -step : step;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section ref={sectionVisRef} className="movie-section-contain space-y-3.5 my-8" aria-labelledby={`${section.id}-heading`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 id={`${section.id}-heading`} className="text-lg sm:text-xl font-bold cv-text tracking-tight">
            {section.title}
          </h2>
          <p className="text-xs cv-text-muted">
            {section.subtitle}
          </p>
        </div>

        <nav aria-label={`${section.title} controls`} className="flex items-center gap-1.5">
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs font-semibold cv-text-muted hover:text-[var(--cv-text)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--cv-surface-muted)] transition-colors cursor-pointer mr-1"
            >
              Explore All
            </button>
          )}
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="p-1.5 cv-text-muted hover:text-[var(--cv-text)] disabled:opacity-35 disabled:cursor-not-allowed rounded-lg hover:bg-[var(--cv-surface-muted)] transition-colors cursor-pointer"
            aria-label="Scroll left"
            title="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="p-1.5 cv-text-muted hover:text-[var(--cv-text)] disabled:opacity-35 disabled:cursor-not-allowed rounded-lg hover:bg-[var(--cv-surface-muted)] transition-colors cursor-pointer"
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
              className="movie-card-contain shrink-0 w-36 sm:w-44 md:w-48 snap-start rounded-2xl overflow-hidden cv-card border flex flex-col select-none"
            >
              <div className="aspect-[2/3] w-full skeleton-shimmer" />
              <div className="p-2.5 space-y-1.5">
                <div className="h-4 w-4/5 rounded skeleton-shimmer" />
                <div className="flex items-center justify-between">
                  <div className="h-3 w-14 rounded skeleton-shimmer" />
                  <div className="h-3 w-10 rounded skeleton-shimmer" />
                </div>
              </div>
            </div>
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
