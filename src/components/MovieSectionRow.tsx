import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Flame, Trophy, Award, Clapperboard, Heart, Laugh, Shield, Skull, Atom, Calendar, Eye, Play, Copy, Check, Bookmark, Star } from 'lucide-react';
import { Movie, buildMagnetLink } from '../types';
import { getMoviePath } from '../utils/seo';

export interface CuratedSectionConfig {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  iconName: string;
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
    iconName: 'Flame',
    accentColor: 'from-orange-500/20 text-orange-400 border-orange-500/30',
    filterParams: { sort_by: 'download_count', order_by: 'desc' }
  },
  {
    id: 'top-imdb',
    title: 'Top IMDb',
    subtitle: 'Highest critically acclaimed cinema of all time (Rating 8.2+)',
    badge: 'Critically Acclaimed',
    iconName: 'Trophy',
    accentColor: 'from-amber-500/20 text-amber-400 border-amber-500/30',
    filterParams: { minimum_rating: 8, sort_by: 'rating', order_by: 'desc' }
  },
  {
    id: 'highest-grossing',
    title: 'Highest Grossing Movies',
    subtitle: 'Global box office titans, blockbusters & record breakers',
    badge: 'Box Office Hits',
    iconName: 'Sparkles',
    accentColor: 'from-emerald-500/20 text-emerald-400 border-emerald-500/30',
    filterParams: { sort_by: 'like_count', order_by: 'desc' }
  },
  {
    id: 'superhero',
    title: 'Superhero Universe',
    subtitle: 'Marvel, DC, and epic comic book multiverse sagas',
    badge: 'Epic Heroes',
    iconName: 'Shield',
    accentColor: 'from-blue-500/20 text-blue-400 border-blue-500/30',
    filterParams: { genre: 'Action', sort_by: 'download_count', query_term: 'hero' }
  },
  {
    id: 'sci-fi',
    title: 'Science Fiction',
    subtitle: 'Interstellar voyages, cyberpunk futures & mind-bending paradoxes',
    badge: 'Futuristic',
    iconName: 'Atom',
    accentColor: 'from-cyan-500/20 text-cyan-400 border-cyan-500/30',
    filterParams: { genre: 'Sci-Fi', sort_by: 'rating', order_by: 'desc', minimum_rating: 7 }
  },
  {
    id: 'best-drama',
    title: 'Best Drama Movies',
    subtitle: 'Emotionally gripping stories, character studies & human resilience',
    badge: 'Deep & Moving',
    iconName: 'Heart',
    accentColor: 'from-rose-500/20 text-rose-400 border-rose-500/30',
    filterParams: { genre: 'Drama', minimum_rating: 8, sort_by: 'rating' }
  },
  {
    id: 'best-comedy',
    title: 'Best Comedy Movies',
    subtitle: 'Laugh-out-loud favorites, sharp satires & feel-good adventures',
    badge: 'Non-stop Laughs',
    iconName: 'Laugh',
    accentColor: 'from-lime-500/20 text-lime-400 border-lime-500/30',
    filterParams: { genre: 'Comedy', sort_by: 'download_count', minimum_rating: 7 }
  },
  {
    id: 'horror-collection',
    title: 'Horror Collection',
    subtitle: 'Chilling psychological thrillers, supernatural suspense & jump scares',
    badge: 'Night Terrors',
    iconName: 'Skull',
    accentColor: 'from-purple-500/20 text-purple-400 border-purple-500/30',
    filterParams: { genre: 'Horror', sort_by: 'download_count', order_by: 'desc' }
  },
  {
    id: 'family-favorites',
    title: 'Family Favorites',
    subtitle: 'Wholesome entertainment, animated worlds & joy for all generations',
    badge: 'All Ages',
    iconName: 'Clapperboard',
    accentColor: 'from-teal-500/20 text-teal-400 border-teal-500/30',
    filterParams: { genre: 'Family', sort_by: 'download_count', minimum_rating: 7 }
  },
  {
    id: 'upcoming',
    title: 'Upcoming & Premiere Releases',
    subtitle: 'Brand new theatrical debuts, previews & freshest uploads',
    badge: 'Fresh Releases',
    iconName: 'Calendar',
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
  const [copiedHash, setCopiedHash] = React.useState<string | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const renderIcon = (name: string) => {
    switch (name) {
      case 'Flame': return <Flame className="w-4 h-4" />;
      case 'Trophy': return <Trophy className="w-4 h-4" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4" />;
      case 'Award': return <Award className="w-4 h-4" />;
      case 'Shield': return <Shield className="w-4 h-4" />;
      case 'Atom': return <Atom className="w-4 h-4" />;
      case 'Heart': return <Heart className="w-4 h-4" />;
      case 'Laugh': return <Laugh className="w-4 h-4" />;
      case 'Skull': return <Skull className="w-4 h-4" />;
      case 'Calendar': return <Calendar className="w-4 h-4" />;
      default: return <Clapperboard className="w-4 h-4" />;
    }
  };

  const handleCopy = (e: React.MouseEvent, movie: Movie) => {
    e.stopPropagation();
    const torrent = movie.torrents?.[0];
    if (torrent) {
      const magnet = buildMagnetLink(torrent.hash, movie.title_long || movie.title);
      onCopyMagnet(magnet, `${movie.title} (${torrent.quality})`);
      setCopiedHash(torrent.hash);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  return (
    <section className="space-y-3.5 my-8">
      {/* Header with Title, Badge, and Carousel Arrows */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-gradient-to-br border ${section.accentColor}`}>
            {renderIcon(section.iconName)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {section.title}
              </h2>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-neutral-300 border border-white/10 uppercase tracking-wider">
                {section.badge}
              </span>
            </div>
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
            className="p-1.5 sm:p-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full border border-white/10 transition-colors cursor-pointer"
            aria-label={`Scroll ${section.title} left`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 sm:p-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full border border-white/10 transition-colors cursor-pointer"
            aria-label={`Scroll ${section.title} right`}
          >
            <ChevronRight className="w-4 h-4" />
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
        ) : movies.length > 0 ? (
          movies.map((movie) => {
            const torrent = movie.torrents?.[0];
            const isSaved = isWatchlisted(movie.id);

            return (
              <a
                key={`${section.id}-${movie.id}`}
                href={getMoviePath(movie)}
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                    e.preventDefault();
                    onSelectMovie(movie);
                  }
                }}
                className="group relative shrink-0 w-36 sm:w-44 md:w-48 snap-start rounded-2xl overflow-hidden bg-[#0e0e0e] border border-white/10 hover:border-white/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/80 flex flex-col cursor-pointer no-underline text-inherit"
              >
                {/* Poster Image */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                  <img
                    src={movie.medium_cover_image || movie.large_cover_image || movie.small_cover_image}
                    alt={`${movie.title} (${movie.year})`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Rating Tag */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 border border-white/15 backdrop-blur-md text-[11px] font-bold text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{movie.rating ? movie.rating.toFixed(1) : '7.5'}</span>
                  </div>

                  {/* Year Tag */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/75 border border-white/15 backdrop-blur-md text-[10px] font-semibold text-neutral-300">
                    {movie.year}
                  </div>

                  {/* Hover Quick Action Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 space-y-2">
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
                          <Play className="w-3 h-3 fill-current" />
                          <span>Trailer</span>
                        </button>
                      )}

                      {torrent && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleCopy(e, movie);
                          }}
                          className="p-1.5 bg-[#6ac045]/20 hover:bg-[#6ac045]/30 border border-[#6ac045]/40 text-[#6ac045] rounded-lg transition-colors cursor-pointer"
                          title="Copy Magnet Link"
                        >
                          {copiedHash === torrent.hash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <button
                        onClick={(e) => {
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
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Movie Title & Info */}
                <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-rose-400 transition-colors">
                    {movie.title}
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
              </a>
            );
          })
        ) : (
          <div className="w-full py-8 text-center text-xs text-neutral-500">
            No movies available in this category.
          </div>
        )}
      </div>
    </section>
  );
};
