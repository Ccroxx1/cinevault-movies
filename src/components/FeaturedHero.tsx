import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Movie, buildMagnetLink } from '../types';
import { getMoviePath } from '../utils/seo';
import { handleBrandedMagnetDownload } from '../utils/downloadPack';
import { getBackdropCandidates, CINEVAULT_BACKDROP_FALLBACK } from '../utils/imageFallback';
import { BookmarkPlusIcon, BookmarkIcon, PlayIcon, CopyIcon } from './ActionIcons';
import { ChevronLeft, ChevronRight, Shuffle, Sparkles, Flame, Star, Rocket, Clapperboard, Film, Check, Download, Disc } from 'lucide-react';
import { getGenreHeroConfig, getHeroMoviesForGenre } from '../data/genreBanners';
import { GENRES } from '../services/movieApi';

interface FeaturedHeroProps {
  movies: Movie[];
  genreMovies?: Movie[];
  selectedGenre?: string;
  onSelectGenre?: (genre: string) => void;
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isWatchlisted: (movieId: number) => boolean;
  onToggleWatchlist: (movie: Movie) => void;
  onRefreshHero?: () => void;
}

type CurationMode = 'all' | 'trending' | 'topRated' | 'scifi' | 'action';

interface CurationOption {
  id: CurationMode;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const CURATION_OPTIONS: CurationOption[] = [
  { id: 'all', label: 'Fresh Mix', icon: Sparkles },
  { id: 'trending', label: 'Trending Hits', icon: Flame },
  { id: 'topRated', label: '8.0+ Masterpieces', icon: Star },
  { id: 'scifi', label: 'Sci-Fi & Fantasy', icon: Rocket },
  { id: 'action', label: 'Action & Thrillers', icon: Clapperboard }
];

// Curated top genres to display in hero quick-switcher
const HERO_FEATURED_GENRES = [
  'All',
  'Action',
  'Sci-Fi',
  'Animation',
  'Horror',
  'Comedy',
  'Drama',
  'Adventure',
  'Crime',
  'Mystery',
  'Fantasy',
  'Thriller',
  'Romance'
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const FeaturedHero: React.FC<FeaturedHeroProps> = ({
  movies,
  genreMovies = [],
  selectedGenre = 'All',
  onSelectGenre,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  isWatchlisted,
  onToggleWatchlist,
  onRefreshHero
}) => {
  const [curationMode, setCurationMode] = useState<CurationMode>('all');
  const [activeQueue, setActiveQueue] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [slideKey, setSlideKey] = useState(0);
  const [backdropIndex, setBackdropIndex] = useState(0);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const activeGenre = selectedGenre || 'All';
  const isSpecificGenre = activeGenre.toLowerCase() !== 'all';
  const genreConfig = useMemo(() => getGenreHeroConfig(activeGenre), [activeGenre]);
  const lastSelectionKeyRef = useRef<string>(`${activeGenre}::${curationMode}`);

  // Dynamically populate active queue whenever selectedGenre, movies, genreMovies, or curationMode changes
  useEffect(() => {
    let pool: Movie[] = [];

    if (isSpecificGenre) {
      // User has explicitly chosen a genre in browse mode
      pool = getHeroMoviesForGenre(activeGenre, genreMovies, movies);
    } else {
      // "All" genres mode: respect curationMode tab if user clicked one
      const basePool = movies.length > 0 ? movies : genreMovies;
      if (curationMode === 'trending') {
        pool = [...basePool].sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
      } else if (curationMode === 'topRated') {
        pool = basePool.filter((m) => (m.rating || 0) >= 7.8);
        if (pool.length < 5) {
          pool = [...basePool].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
      } else if (curationMode === 'scifi') {
        pool = basePool.filter((m) =>
          m.genres?.some((g) => ['Sci-Fi', 'Fantasy', 'Adventure'].includes(g))
        );
        if (pool.length < 5) pool = basePool;
      } else if (curationMode === 'action') {
        pool = basePool.filter((m) =>
          m.genres?.some((g) => ['Action', 'Thriller', 'Crime'].includes(g))
        );
        if (pool.length < 5) pool = basePool;
      } else {
        pool = basePool;
      }
    }

    if (pool.length === 0) {
      pool = getHeroMoviesForGenre(activeGenre, [], movies);
    }

    const selectionKey = `${activeGenre}::${curationMode}`;
    const selectionChanged = lastSelectionKeyRef.current !== selectionKey;
    lastSelectionKeyRef.current = selectionKey;

    setActiveQueue((prevQueue) => {
      // If user didn't switch genre/curation and we already rendered slide 0, keep the active slide 0
      // pinned in place so its LCP image load is never aborted by background API hydration.
      if (!selectionChanged && prevQueue.length > 0 && currentIndex === 0) {
        const pinnedSlide = prevQueue[0];
        const remainingLive = shuffleArray(pool.filter((m) => m.id !== pinnedSlide.id));
        return [pinnedSlide, ...remainingLive];
      }

      if (pool.length > 2) {
        const topTitle = pool[0];
        const remainder = shuffleArray(pool.slice(1));
        return [topTitle, ...remainder];
      }
      return pool;
    });

    if (selectionChanged) {
      setCurrentIndex(0);
      setBackdropIndex(0);
      setSlideKey((k) => k + 1);
    }
  }, [activeGenre, isSpecificGenre, movies, genreMovies, curationMode]);

  const totalSlides = activeQueue.length;

  // Handle advancing to next slide with infinite non-repeating cycle
  const handleNext = useCallback(() => {
    if (totalSlides <= 1) return;

    setCurrentIndex((prev) => {
      if (prev >= totalSlides - 1) {
        setActiveQueue((current) => {
          const reshuffled = shuffleArray(current);
          if (reshuffled[0]?.id === current[prev]?.id && reshuffled.length > 1) {
            [reshuffled[0], reshuffled[1]] = [reshuffled[1], reshuffled[0]];
          }
          return reshuffled;
        });
        return 0;
      }
      return prev + 1;
    });

    setSlideKey((k) => k + 1);
  }, [totalSlides]);

  // Handle previous slide
  const handlePrev = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    setSlideKey((k) => k + 1);
  }, [totalSlides]);

  // Manual shuffle & refresh action
  const handleShuffle = useCallback(() => {
    if (activeQueue.length === 0) return;
    const freshShuffled = shuffleArray(activeQueue);
    setActiveQueue(freshShuffled);
    setCurrentIndex(0);
    setSlideKey((k) => k + 1);
    setFeedbackToast(`Shuffled ${isSpecificGenre ? activeGenre : 'blockbuster'} picks`);
    setTimeout(() => setFeedbackToast(null), 2500);

    if (onRefreshHero) {
      onRefreshHero();
    }
  }, [activeQueue, isSpecificGenre, activeGenre, onRefreshHero]);

  // Reset backdrop fallback counter when movie changes
  useEffect(() => {
    setBackdropIndex(0);
  }, [currentIndex]);

  // Preload next slide backdrop during idle time to avoid competing with LCP image
  useEffect(() => {
    if (totalSlides <= 1) return;
    const nextIdx = (currentIndex + 1) % totalSlides;
    const nextMovie = activeQueue[nextIdx];
    if (!nextMovie) return;

    const preloadNext = () => {
      const nextCandidates = getBackdropCandidates(nextMovie);
      if (nextCandidates[0] && !nextCandidates[0].startsWith('data:')) {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.src = nextCandidates[0];
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = (window as any).requestIdleCallback(preloadNext, { timeout: 1500 });
      return () => (window as any).cancelIdleCallback?.(idleId);
    }
    const timer = setTimeout(preloadNext, 500);
    return () => clearTimeout(timer);
  }, [currentIndex, activeQueue, totalSlides]);

  // Autoplay with 12-second pacing to allow comfortable reading
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 12000);
    return () => clearInterval(interval);
  }, [isPaused, totalSlides, handleNext, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Touch swipe support for responsive mobile experience
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  const currentMovie = activeQueue[currentIndex] || movies[0];
  if (!currentMovie) return null;

  const primaryTorrent = currentMovie.torrents?.[0];
  const backdropCandidates = getBackdropCandidates(currentMovie);
  const currentBackdropSrc = backdropCandidates[backdropIndex] || CINEVAULT_BACKDROP_FALLBACK;

  const handleBackdropError = () => {
    if (backdropIndex + 1 < backdropCandidates.length) {
      setBackdropIndex((prev) => prev + 1);
    }
  };

  const togglePlayPause = () => setIsPaused((prev) => !prev);

  const handleCopyMagnet = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (primaryTorrent) {
      const magnetUrl = buildMagnetLink(primaryTorrent.hash, currentMovie.title_long || currentMovie.title);
      onCopyMagnet(magnetUrl, `${currentMovie.title} (${primaryTorrent.quality})`);
      setCopiedHash(primaryTorrent.hash);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  const handleGenreTabClick = (genre: string) => {
    if (onSelectGenre) {
      onSelectGenre(genre);
    }
  };

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`hero-cinema-container relative w-full rounded-3xl overflow-hidden border ${genreConfig.themeColor.border} shadow-2xl h-[520px] sm:h-[540px] md:h-[580px] lg:h-[620px] flex flex-col justify-between group transition-colors select-none mb-8 [contain:layout_style]`}
      aria-label={`${isSpecificGenre ? activeGenre : 'Featured'} Movies Slideshow`}
    >
      {/* Edge-to-Edge Cinematic Slide Artwork with dynamic background image */}
      <div
        key={`hero-slide-${activeGenre}-${currentMovie.id}-${slideKey}-${backdropIndex}`}
        className={`absolute inset-0 z-0 overflow-hidden ${slideKey > 0 ? 'animate-heroFadeIn' : ''}`}
      >
        <img
          src={currentBackdropSrc}
          alt={`${currentMovie.title} ${activeGenre} Cinematic Artwork`}
          width="1920"
          height="1080"
          loading="eager"
          fetchPriority="high"
          decoding="sync"
          referrerPolicy="no-referrer"
          onError={handleBackdropError}
          className="w-full h-full object-cover object-center sm:object-[center_20%] scale-100 group-hover:scale-[1.025] transition-transform duration-1000 ease-out select-none"
        />
      </div>

      {/* Dark Cinematic Scrim Gradients for 100% Typography Contrast & Depth */}
      <div className="absolute inset-0 z-10 hero-gradient-overlay-x pointer-events-none" />
      <div className="absolute inset-0 z-10 hero-gradient-overlay-y pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-28 z-10 bg-gradient-to-b from-black/80 via-black/35 to-transparent pointer-events-none" />

      {/* Interactive Edge Navigation Arrows (Desktop Hover) */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-xl hidden sm:flex items-center justify-center"
            aria-label="Previous movie slide"
            title="Previous movie"
          >
            <ChevronLeft size={22} />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-xl hidden sm:flex items-center justify-center"
            aria-label="Next movie slide"
            title="Next movie"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* TOP HEADER CONTROLS: Dynamic Genre Indicator, Genre Quick Switcher, and Slide Tracker */}
      <div className="relative z-20 p-4 sm:p-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Dynamic Genre Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 border border-white/15 text-xs font-semibold shadow-lg">
            <span className={`font-bold uppercase tracking-wider text-[11px] ${genreConfig.themeColor.primaryText}`}>
              {genreConfig.badgeLabel}
            </span>
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-black/75 border border-white/10 text-[11px] font-mono font-semibold text-neutral-300">
            {currentIndex + 1} of {totalSlides}
          </div>

          {feedbackToast && (
            <div className="animate-fadeIn text-[11px] font-semibold text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 px-2.5 py-1 rounded-xl shadow-md">
              {feedbackToast}
            </div>
          )}
        </div>

        {/* Dynamic Genre Quick-Switcher Ribbon */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          {isSpecificGenre ? (
            // Genre-Specific Mode: Show clear reset to "All Genres" + related genre siblings
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleGenreTabClick('All')}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-neutral-300 hover:text-white bg-black/60 hover:bg-black/80 border border-white/15 transition-all cursor-pointer backdrop-blur-md"
                title="View All Genres"
              >
                <span>All Genres</span>
              </button>

              {/* Show top active genre pill as selected */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white ${genreConfig.themeColor.accentBg} border ${genreConfig.themeColor.border} shadow-md`}
              >
                <Film size={12} />
                <span>{activeGenre}</span>
              </div>

              {/* Curated quick shortcuts to switch to another popular genre */}
              {HERO_FEATURED_GENRES.filter((g) => g !== 'All' && g.toLowerCase() !== activeGenre.toLowerCase())
                .slice(0, 4)
                .map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleGenreTabClick(g)}
                    className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-neutral-300 hover:text-white bg-black/50 hover:bg-black/75 border border-white/10 transition-all cursor-pointer backdrop-blur-md whitespace-nowrap"
                  >
                    <span>{g}</span>
                  </button>
                ))}
            </div>
          ) : (
            // All-Genres Mode: Show curation tabs (Fresh Mix, Trending, 8.0+ Masterpieces, etc.)
            <div className="flex items-center gap-1.5">
              {CURATION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = curationMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCurationMode(opt.id)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer backdrop-blur-md shadow-sm ${
                      isActive
                        ? 'bg-rose-600 text-white border border-rose-400/60 shadow-rose-950/40 scale-105'
                        : 'bg-black/55 text-neutral-300 hover:text-white hover:bg-black/75 border border-white/15'
                    }`}
                  >
                    <Icon size={12} className={isActive ? 'text-white' : 'text-neutral-400'} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={handleShuffle}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold transition-all duration-200 cursor-pointer backdrop-blur-md shadow-md hover:scale-105 active:scale-95 ml-1 shrink-0"
            title={`Shuffle & Load Fresh ${isSpecificGenre ? activeGenre : ''} Blockbusters`}
            aria-label="Shuffle slideshow"
          >
            <Shuffle size={12} className={genreConfig.themeColor.primaryText} />
            <span className="hidden xs:inline">Shuffle</span>
          </button>
        </div>
      </div>

      {/* FOREGROUND HERO CONTENT: Dynamic Headline, Featured Title, Synopsis, and Actions */}
      <div
        key={`content-${activeGenre}-${currentMovie.id}-${slideKey}`}
        className="relative z-20 p-5 sm:p-8 md:p-10 lg:p-12 xl:p-14 w-full flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8 animate-heroFadeIn pb-16 sm:pb-16 md:pb-12 text-left"
      >
        {/* Left Column: Title, Headline, Synopsis, and Primary Controls */}
        <div className="w-full max-w-2xl lg:max-w-2xl xl:max-w-3xl flex flex-col justify-end gap-3 sm:gap-4">
          {/* Dynamic Genre Tagline / Vibe Kicker */}
          {isSpecificGenre && (
            <div className="space-y-0.5">
              <span className={`text-xs sm:text-sm font-bold tracking-tight ${genreConfig.themeColor.primaryText}`}>
                {genreConfig.headline}
              </span>
              <p className="text-neutral-400 text-[11px] sm:text-xs font-normal line-clamp-1">
                {genreConfig.tagline}
              </p>
            </div>
          )}

          {/* Clean Typographic Metadata (Zero-Pill Discipline) */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-300">
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span>★</span>
              <span className="tabular-nums">IMDb {currentMovie.rating ? currentMovie.rating.toFixed(1) : '8.0'}</span>
            </span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="tabular-nums font-semibold text-white">{currentMovie.year}</span>
            {currentMovie.runtime > 0 && (
              <>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="tabular-nums text-neutral-300">
                  {Math.floor(currentMovie.runtime / 60)}h {currentMovie.runtime % 60}m
                </span>
              </>
            )}
            {primaryTorrent?.quality && (
              <>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className={`font-bold uppercase tracking-wider ${genreConfig.themeColor.primaryText}`}>
                  {primaryTorrent.quality}
                </span>
              </>
            )}
            {currentMovie.mpa_rating && (
              <>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="text-neutral-400 text-[11px]">{currentMovie.mpa_rating}</span>
              </>
            )}
          </div>

          {/* Dynamic Featured Title */}
          <h2 className="font-display font-black text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-tight leading-[1.08] drop-shadow-md">
            <a
              href={getMoviePath(currentMovie)}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  onSelectMovie(currentMovie);
                }
              }}
              className={`hover:${genreConfig.themeColor.primaryText} transition-colors cursor-pointer`}
            >
              {currentMovie.title}
            </a>
          </h2>

          {/* Clean Genre Tags with interactive click to switch genres */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {currentMovie.genres?.map((g) => {
              const isThisGenre = g.toLowerCase() === activeGenre.toLowerCase();
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleGenreTabClick(g)}
                  className={`text-[11px] sm:text-xs font-medium px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                    isThisGenre
                      ? `${genreConfig.themeColor.accentBg} text-white font-semibold`
                      : 'bg-white/10 text-neutral-300 hover:bg-white/20 hover:text-white'
                  }`}
                  title={`Filter by ${g}`}
                >
                  {g}
                </button>
              );
            })}
          </div>

          {/* Synopsis Paragraph */}
          <p className="text-neutral-200/90 text-xs sm:text-sm md:text-base line-clamp-3 md:line-clamp-4 leading-relaxed font-normal max-w-2xl drop-shadow-sm">
            {currentMovie.description_full ||
              currentMovie.summary ||
              currentMovie.synopsis ||
              'Explore full movie details, high-bitrate torrents, and magnet links.'}
          </p>

          {/* Primary Action Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={() => onSelectMovie(currentMovie)}
              className="flex items-center gap-1.5 sm:gap-2 px-5 sm:px-7 py-2.5 bg-white text-black font-bold text-xs sm:text-sm rounded-full hover:bg-neutral-200 transition-all shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>View Details</span>
            </button>

            {currentMovie.yt_trailer_code && (
              <button
                type="button"
                onClick={() => onPlayTrailer(currentMovie.yt_trailer_code, currentMovie.title)}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/25 text-white font-bold text-xs sm:text-sm rounded-full transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                <PlayIcon size={16} />
                <span>Trailer</span>
              </button>
            )}

            {primaryTorrent && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    handleBrandedMagnetDownload(currentMovie, primaryTorrent, {
                      onStart: () => {
                        onCopyMagnet(
                          buildMagnetLink(primaryTorrent.hash, currentMovie.title_long || currentMovie.title),
                          `${currentMovie.title} (${primaryTorrent.quality}) — Starting Download`
                        );
                      }
                    });
                  }}
                  className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 ${genreConfig.themeColor.accentBg} ${genreConfig.themeColor.buttonHover} text-white font-bold text-xs sm:text-sm rounded-full backdrop-blur-md shadow-lg ${genreConfig.themeColor.glow} transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]`}
                  title={`Direct Magnet Download for ${primaryTorrent.quality}`}
                >
                  <span>Magnet ({primaryTorrent.quality})</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyMagnet}
                  className={`p-2.5 sm:p-3 rounded-full border backdrop-blur-md transition-all cursor-pointer shadow-lg ${
                    copiedHash === primaryTorrent.hash
                      ? 'bg-emerald-600 text-white border-emerald-400 scale-105 shadow-emerald-950/60'
                      : 'bg-black/50 hover:bg-black/70 text-neutral-200 hover:text-white border-white/20'
                  }`}
                  title={copiedHash === primaryTorrent.hash ? 'Copied Magnet URI!' : 'Copy Magnet URI'}
                  aria-label="Copy Magnet URI"
                >
                  {copiedHash === primaryTorrent.hash ? <Check size={16} /> : <CopyIcon size={16} />}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onToggleWatchlist(currentMovie)}
              className={`p-2.5 sm:p-3 rounded-full border transition-all cursor-pointer backdrop-blur-md shadow-lg ${
                isWatchlisted(currentMovie.id)
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-950/50'
                  : 'bg-black/50 text-neutral-300 hover:text-white border-white/20 hover:bg-black/70'
              }`}
              title={isWatchlisted(currentMovie.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
              aria-label={isWatchlisted(currentMovie.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              {isWatchlisted(currentMovie.id) ? <BookmarkIcon size={17} /> : <BookmarkPlusIcon size={17} />}
            </button>
          </div>
        </div>

        {/* Right Column: Floating Glass Cinema Quick-Specs Card (Desktop & Widescreen) */}
        <div className="hidden lg:flex flex-col gap-3.5 p-4 xl:p-5 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 w-72 xl:w-80 shadow-2xl shrink-0 self-end mb-6 z-20 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <Disc className="w-3.5 h-3.5 text-rose-500" />
              <span>Cinema Quick Specs</span>
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
              {primaryTorrent?.quality || '1080p'}
            </span>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5 space-y-0.5">
              <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">IMDb Score</span>
              <div className="flex items-center gap-1 text-amber-400 font-extrabold text-xs">
                <span>★</span>
                <span>{currentMovie.rating ? currentMovie.rating.toFixed(1) : '8.0'}/10</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5 space-y-0.5">
              <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">Active Swarm</span>
              <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                <Flame className="w-3 h-3 text-emerald-400" />
                <span>{primaryTorrent?.seeds ? primaryTorrent.seeds.toLocaleString() : '3,200'} seeds</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5 space-y-0.5">
              <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">Audio / Codec</span>
              <span className="text-neutral-200 font-semibold block truncate">
                {primaryTorrent?.audio_channels || '5.1'} • {primaryTorrent?.video_codec || 'x264'}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5 space-y-0.5">
              <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">File Size</span>
              <span className="text-neutral-200 font-semibold block truncate">
                {primaryTorrent?.size || '1.85 GB'}
              </span>
            </div>
          </div>

          {/* Available Encodes */}
          {currentMovie.torrents && currentMovie.torrents.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Available Encodes</span>
              <div className="flex flex-wrap gap-1.5">
                {currentMovie.torrents.map((t, idx) => (
                  <button
                    key={`${t.quality}-${idx}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const magnetUrl = buildMagnetLink(t.hash, currentMovie.title_long || currentMovie.title);
                      onCopyMagnet(magnetUrl, `${currentMovie.title} (${t.quality})`);
                      setCopiedHash(t.hash);
                      setTimeout(() => setCopiedHash(null), 2000);
                    }}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                      copiedHash === t.hash
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-950/50'
                        : 'bg-white/5 text-neutral-300 hover:text-white border-white/10 hover:bg-white/10'
                    }`}
                    title={`Copy ${t.quality} Magnet`}
                  >
                    {copiedHash === t.hash ? <Check size={10} /> : <Download size={10} />}
                    <span>{t.quality}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING SLIDESHOW CONTROLS & PROGRESS BAR */}
      {totalSlides > 1 && (
        <div className="absolute right-3 bottom-3 sm:right-6 sm:bottom-4 z-30 flex items-center gap-1.5 sm:gap-2.5 bg-black/85 border border-white/20 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-2xl">
          <button
            type="button"
            onClick={togglePlayPause}
            className="p-1 text-neutral-300 hover:text-white rounded-full transition-colors cursor-pointer text-[10px] font-bold tracking-wider"
            title={isPaused ? 'Resume Autoplay' : 'Pause Autoplay'}
            aria-label={isPaused ? 'Resume Autoplay' : 'Pause Autoplay'}
          >
            {isPaused ? 'PLAY' : 'PAUSE'}
          </button>

          <div className="w-[1px] h-3.5 bg-white/20" />

          <button
            type="button"
            onClick={handlePrev}
            className="p-1 text-neutral-300 hover:text-white rounded-full transition-colors cursor-pointer text-[10px] font-bold tracking-wider"
            aria-label="Previous Movie"
            title="Previous Movie"
          >
            PREV
          </button>

          {/* Slide Tracker & Active Slide Fill Indicator */}
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-[10px] font-mono font-bold text-neutral-200">
              {currentIndex + 1}
              <span className="text-neutral-400">/{totalSlides}</span>
            </span>

            {/* Dynamic Progress Bar for active slide */}
            <div className="relative w-10 sm:w-14 h-1.5 bg-white/25 rounded-full overflow-hidden">
              <div
                key={`progress-${activeGenre}-${currentIndex}-${slideKey}`}
                className={`absolute inset-0 ${genreConfig.themeColor.accentBg} h-full ${
                  !isPaused ? 'animate-progressFill' : 'w-full'
                }`}
                style={{ animationDuration: '12s' }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="p-1 text-neutral-300 hover:text-white rounded-full transition-colors cursor-pointer text-[10px] font-bold tracking-wider"
            aria-label="Next Movie"
            title="Next Movie"
          >
            NEXT
          </button>

          <div className="w-[1px] h-3.5 bg-white/20" />

          <button
            type="button"
            onClick={handleShuffle}
            className={`p-1 ${genreConfig.themeColor.primaryText} hover:opacity-80 rounded-full transition-colors cursor-pointer flex items-center gap-1`}
            title={`Shuffle ${isSpecificGenre ? activeGenre : ''} Slideshow`}
            aria-label="Shuffle Slideshow"
          >
            <Shuffle size={13} />
          </button>
        </div>
      )}
    </section>
  );
};

export default FeaturedHero;
