import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Movie, buildMagnetLink } from '../types';
import { getMoviePath } from '../utils/seo';
import { handleBrandedMagnetDownload } from '../utils/downloadPack';
import { getBackdropCandidates, CINEVAULT_BACKDROP_FALLBACK } from '../utils/imageFallback';
import { BookmarkPlusIcon, BookmarkIcon, PlayIcon, CopyIcon } from './ActionIcons';
import { ChevronLeft, ChevronRight, Shuffle, Sparkles, Flame, Star, Rocket, Clapperboard, RefreshCw } from 'lucide-react';

interface FeaturedHeroProps {
  movies: Movie[];
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

  // Filter and populate active queue whenever movies prop or curationMode changes
  useEffect(() => {
    if (!movies || movies.length === 0) return;

    let filtered: Movie[] = [];
    if (curationMode === 'trending') {
      filtered = [...movies].sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
    } else if (curationMode === 'topRated') {
      filtered = movies.filter((m) => (m.rating || 0) >= 7.8);
      if (filtered.length < 5) {
        filtered = [...movies].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }
    } else if (curationMode === 'scifi') {
      filtered = movies.filter((m) =>
        m.genres?.some((g) => ['Sci-Fi', 'Fantasy', 'Adventure'].includes(g))
      );
      if (filtered.length < 5) filtered = movies;
    } else if (curationMode === 'action') {
      filtered = movies.filter((m) =>
        m.genres?.some((g) => ['Action', 'Thriller', 'Crime'].includes(g))
      );
      if (filtered.length < 5) filtered = movies;
    } else {
      // 'all': take the whole pool
      filtered = movies;
    }

    // Always shuffle the pool initially so the user starts with fresh, non-repetitive movies
    const randomized = shuffleArray(filtered);
    setActiveQueue(randomized);
    setCurrentIndex(0);
    setSlideKey((k) => k + 1);
  }, [movies, curationMode]);

  const totalSlides = activeQueue.length;

  // Handle advancing to next slide with infinite non-repeating cycle
  const handleNext = useCallback(() => {
    if (totalSlides <= 1) return;

    setCurrentIndex((prev) => {
      // If we are at the very last slide of the queue, reshuffle so we don't repeat in the same order
      if (prev >= totalSlides - 1) {
        setActiveQueue((current) => {
          const reshuffled = shuffleArray(current);
          // Ensure first movie of new batch isn't the same as the last one displayed
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
    if (!movies || movies.length === 0) return;
    const freshShuffled = shuffleArray(activeQueue.length > 0 ? activeQueue : movies);
    setActiveQueue(freshShuffled);
    setCurrentIndex(0);
    setSlideKey((k) => k + 1);
    setFeedbackToast(`Shuffled ${freshShuffled.length} fresh blockbuster picks`);
    setTimeout(() => setFeedbackToast(null), 2500);

    // Call background refresh if available
    if (onRefreshHero) {
      onRefreshHero();
    }
  }, [activeQueue, movies, onRefreshHero]);

  // Reset backdrop fallback counter when movie changes
  useEffect(() => {
    setBackdropIndex(0);
  }, [currentIndex]);

  // Preload adjacent slide backdrops for instant zero-flicker transitions
  useEffect(() => {
    if (totalSlides <= 1) return;
    const nextIdx = (currentIndex + 1) % totalSlides;
    const prevIdx = (currentIndex - 1 + totalSlides) % totalSlides;
    [nextIdx, prevIdx].forEach((idx) => {
      const nextMovie = activeQueue[idx];
      if (nextMovie) {
        const nextCandidates = getBackdropCandidates(nextMovie);
        if (nextCandidates[0] && !nextCandidates[0].startsWith('data:')) {
          const img = new Image();
          img.referrerPolicy = 'no-referrer';
          img.src = nextCandidates[0];
        }
      }
    });
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

  if (!movies || movies.length === 0) return null;

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

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="hero-cinema-container relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl min-h-[500px] sm:min-h-[540px] md:min-h-[580px] lg:min-h-[620px] aspect-[16/11] sm:aspect-[16/10] md:aspect-[21/9] flex flex-col justify-between group transition-all select-none mb-10"
      aria-label="Featured Movies Slideshow"
    >
      {/* Edge-to-Edge Cinematic Slide Artwork */}
      <div
        key={`hero-slide-${currentMovie.id}-${slideKey}-${backdropIndex}`}
        className="absolute inset-0 z-0 animate-heroFadeIn overflow-hidden"
      >
        <img
          src={currentBackdropSrc}
          alt={`${currentMovie.title} Cinematic Artwork`}
          width="1920"
          height="1080"
          loading="eager"
          referrerPolicy="no-referrer"
          onError={handleBackdropError}
          className="w-full h-full object-cover object-center sm:object-[center_20%] scale-100 group-hover:scale-[1.025] transition-transform duration-1000 ease-out select-none"
          style={{
            objectFit: 'cover',
            imageRendering: 'auto',
            filter: 'none',
            WebkitFilter: 'none'
          }}
        />
      </div>

      {/* Dark Gradients for 100% Typography Contrast & Visual Depth */}
      <div className="absolute inset-0 z-10 hero-gradient-overlay-x pointer-events-none" />
      <div className="absolute inset-0 z-10 hero-gradient-overlay-y pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-28 z-10 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none" />

      {/* Interactive Edge Navigation Arrows (Desktop Hover) */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-white/70 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer shadow-xl hidden sm:flex items-center justify-center hover:scale-110 active:scale-95"
            aria-label="Previous movie slide"
            title="Previous movie"
          >
            <ChevronLeft size={22} />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-white/70 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer shadow-xl hidden sm:flex items-center justify-center hover:scale-110 active:scale-95"
            aria-label="Next movie slide"
            title="Next movie"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* TOP HEADER CONTROLS: Spotlight Badge, Curation Tabs, and Shuffle Button */}
      <div className="relative z-20 p-4 sm:p-6 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 border border-white/20 backdrop-blur-md text-[11px] font-bold tracking-wider text-rose-400 uppercase shadow-lg">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Spotlight</span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-black/60 border border-white/15 backdrop-blur-md text-[11px] font-mono font-semibold text-neutral-300">
            Slide {currentIndex + 1} of {totalSlides}
          </div>

          {feedbackToast && (
            <div className="animate-fadeIn text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-md">
              {feedbackToast}
            </div>
          )}
        </div>

        {/* Dynamic Curation Category Filters & Quick Shuffle */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
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

          <button
            type="button"
            onClick={handleShuffle}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition-all duration-200 cursor-pointer backdrop-blur-md shadow-md hover:scale-105 active:scale-95 ml-1"
            title="Shuffle & Load Fresh Blockbusters"
            aria-label="Shuffle slideshow"
          >
            <Shuffle size={12} className="text-rose-300" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* FOREGROUND CONTENT LAYER: Metadata, Title, Genres, Synopsis, Action Buttons */}
      <div
        key={`content-${currentMovie.id}-${slideKey}`}
        className="relative z-20 p-5 sm:p-8 md:p-12 lg:p-14 w-full max-w-2xl lg:max-w-3xl flex flex-col justify-end gap-3 sm:gap-4 animate-heroFadeIn pb-16 sm:pb-16 md:pb-12 text-left"
      >
        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 text-amber-400 bg-black/60 border border-white/15 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-md shadow-sm">
            <span>★</span>
            <span>IMDb {currentMovie.rating?.toFixed(1) || '8.0'}</span>
          </div>

          <span className="text-xs font-semibold text-neutral-200 bg-black/60 border border-white/15 px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm">
            {currentMovie.year}
          </span>

          {currentMovie.runtime > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-neutral-300 bg-black/60 border border-white/15 px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm">
              <span>
                {Math.floor(currentMovie.runtime / 60)}h {currentMovie.runtime % 60}m
              </span>
            </span>
          )}

          {primaryTorrent?.quality && (
            <span className="text-xs font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm uppercase tracking-wide">
              {primaryTorrent.quality}
            </span>
          )}

          <span className="hidden sm:inline-block text-[11px] text-neutral-300 font-medium bg-black/50 border border-white/15 px-2.5 py-1 rounded-lg backdrop-blur-md">
            Unseen in current session
          </span>
        </div>

        {/* Display Title */}
        <h2 className="font-display font-black text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-tight leading-[1.08] drop-shadow-md">
          <a
            href={getMoviePath(currentMovie)}
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                onSelectMovie(currentMovie);
              }
            }}
            className="hover:text-rose-400 transition-colors cursor-pointer"
          >
            {currentMovie.title}
          </a>
        </h2>

        {/* Genre Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {currentMovie.genres?.map((g) => (
            <span
              key={g}
              className="text-[11px] sm:text-xs font-semibold text-neutral-200 bg-white/10 hover:bg-white/15 border border-white/20 px-3 py-0.5 rounded-full backdrop-blur-md shadow-sm transition-colors"
            >
              {g}
            </span>
          ))}
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
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-full backdrop-blur-md shadow-lg shadow-emerald-950/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title={`Direct Magnet Download for ${primaryTorrent.quality}`}
              >
                <span>Magnet ({primaryTorrent.quality})</span>
              </button>

              <button
                type="button"
                onClick={handleCopyMagnet}
                className="p-2.5 sm:p-3 bg-black/50 hover:bg-black/70 text-neutral-200 hover:text-white rounded-full border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-lg"
                title={copiedHash === primaryTorrent.hash ? 'Copied Magnet URI!' : 'Copy Magnet URI'}
                aria-label="Copy Magnet URI"
              >
                <CopyIcon size={16} />
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
                key={`progress-${currentIndex}-${slideKey}`}
                className={`absolute inset-0 bg-rose-500 h-full ${
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
            className="p-1 text-rose-400 hover:text-rose-300 rounded-full transition-colors cursor-pointer flex items-center gap-1"
            title="Shuffle Slideshow"
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
