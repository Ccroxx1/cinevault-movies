import React, { useRef, useState, useEffect } from 'react';
import { Movie, buildMagnetLink } from '../types';
import { getMoviePath } from '../utils/seo';
import { getPosterCandidates, CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';

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
    title: 'Top IMDb',
    subtitle: 'Highest critically acclaimed cinema of all time (Rating 8.2+)',
    badge: 'Critically Acclaimed',
    accentColor: 'from-amber-500/20 text-amber-400 border-amber-500/30',
    filterParams: { minimum_rating: 8, sort_by: 'rating', order_by: 'desc' }
  },
  {
    id: 'highest-grossing',
    title: 'Most Popular Movies',
    subtitle: 'All-time fan favorites & most liked cinema worldwide',
    badge: 'Fan Favorites',
    accentColor: 'from-emerald-500/20 text-emerald-400 border-emerald-500/30',
    filterParams: { sort_by: 'like_count', order_by: 'desc' }
  },
  {
    id: 'superhero',
    title: 'Superhero Universe',
    subtitle: 'Marvel, DC, and epic comic book multiverse sagas',
    badge: 'Epic Heroes',
    accentColor: 'from-blue-500/20 text-blue-400 border-blue-500/30',
    filterParams: { genre: 'Action', sort_by: 'download_count', order_by: 'desc' }
  },
  {
    id: 'sci-fi',
    title: 'Science Fiction',
    subtitle: 'Interstellar voyages, cyberpunk futures & mind-bending paradoxes',
    badge: 'Futuristic',
    accentColor: 'from-cyan-500/20 text-cyan-400 border-cyan-500/30',
    filterParams: { genre: 'Sci-Fi', sort_by: 'download_count', order_by: 'desc', minimum_rating: 6.5 }
  },
  {
    id: 'best-drama',
    title: 'Best Drama Movies',
    subtitle: 'Emotionally gripping stories, character studies & human resilience',
    badge: 'Deep & Moving',
    accentColor: 'from-rose-500/20 text-rose-400 border-rose-500/30',
    filterParams: { genre: 'Drama', minimum_rating: 7.5, sort_by: 'rating', order_by: 'desc' }
  },
  {
    id: 'best-comedy',
    title: 'Best Comedy Movies',
    subtitle: 'Laugh-out-loud favorites, sharp satires & feel-good adventures',
    badge: 'Non-stop Laughs',
    accentColor: 'from-lime-500/20 text-lime-400 border-lime-500/30',
    filterParams: { genre: 'Comedy', sort_by: 'download_count', order_by: 'desc', minimum_rating: 6 }
  },
  {
    id: 'horror-collection',
    title: 'Horror Collection',
    subtitle: 'Chilling psychological thrillers, supernatural suspense & jump scares',
    badge: 'Night Terrors',
    accentColor: 'from-purple-500/20 text-purple-400 border-purple-500/30',
    filterParams: { genre: 'Horror', sort_by: 'download_count', order_by: 'desc' }
  },
  {
    id: 'family-favorites',
    title: 'Family Favorites',
    subtitle: 'Wholesome entertainment, animated worlds & joy for all generations',
    badge: 'All Ages',
    accentColor: 'from-teal-500/20 text-teal-400 border-teal-500/30',
    filterParams: { genre: 'Family', sort_by: 'download_count', order_by: 'desc', minimum_rating: 6.5 }
  },
  {
    id: 'upcoming',
    title: 'Latest Releases',
    subtitle: 'Brand new additions, freshest encodes & latest catalog uploads',
    badge: 'Latest Added',
    accentColor: 'from-indigo-500/20 text-indigo-400 border-indigo-500/30',
    filterParams: { sort_by: 'date_added', order_by: 'desc' }
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
  const posterCandidates = getPosterCandidates(movie);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasAllFailed, setHasAllFailed] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

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
    <div
      onClick={(e) => {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
          e.preventDefault();
          onSelectMovie(movie);
        }
      }}
      className="group relative shrink-0 w-36 sm:w-44 md:w-48 snap-start rounded-2xl overflow-hidden bg-[#0e0e0e] border border-white/10 hover:border-white/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/80 flex flex-col cursor-pointer text-inherit select-none"
    >
      {/* Poster Image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
        {!hasAllFailed ? (
          <img
            key={`section-poster-${sectionId}-${movie.id}-${candidateIndex}`}
            src={currentPosterSrc}
            alt={`${movie.title} (${movie.year || ''})`}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={handleImageError}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-neutral-900 text-neutral-500">
            <span className="text-2xl mb-1"></span>
            <span className="text-xs font-semibold text-neutral-300 line-clamp-2">{movie.title}</span>
          </div>
        )}

        {/* Rating Tag */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 border border-white/15 backdrop-blur-md text-[11px] font-bold text-amber-400">
          <span aria-hidden="true" className="hidden" />
          <span>{movie.rating ? movie.rating.toFixed(1) : '7.5'}</span>
        </div>

        {/* Year Tag */}
        {movie.year ? (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/75 border border-white/15 backdrop-blur-md text-[10px] font-semibold text-neutral-300">
            {movie.year}
          </div>
        ) : null}

        {/* Hover Quick Action Overlay */}
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
              >
                <span aria-hidden="true" className="hidden" />
                <span>Trailer</span>
              </button>
            )}

            {torrent && (
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 bg-[#6ac045]/20 hover:bg-[#6ac045]/30 border border-[#6ac045]/40 text-[#6ac045] rounded-lg transition-colors cursor-pointer"
                title="Copy Magnet Link"
              >
                {copiedHash === torrent.hash ? <span aria-hidden="true" className="hidden" /> : <span aria-hidden="true" className="hidden" />}
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
                isSaved
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-black/60 text-neutral-300 hover:text-white border-white/20'
              }`}
              title={isSaved ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <span aria-hidden="true" className="hidden" />
            </button>
          </div>
        </div>
      </div>

      {/* Movie Title & Info */}
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
    </div>
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

  // If loading is finished and there are no valid movies, gracefully hide the section
  if (!isLoading && (!movies || movies.length === 0)) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="space-y-3.5 my-8">
      {/* Header with Title, Badge, and Carousel Arrows */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {section.title}
            </h2>
            <p className="text-xs text-neutral-400">
              {section.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-semibold text-neutral-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer mr-1"
            >
              Explore All
            </button>
          )}
          <button
            onClick={() => scroll('left')}
            className="px-2.5 py-1 text-xs font-semibold text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label={`Scroll ${section.title} left`}
          >
            Previous
          </button>
          <button
            onClick={() => scroll('right')}
            className="px-2.5 py-1 text-xs font-semibold text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label={`Scroll ${section.title} right`}
          >
            Next
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Movie Row */}
      <div
        ref={rowRef}
        className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
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
