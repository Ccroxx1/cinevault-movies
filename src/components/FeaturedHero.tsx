import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Movie, buildMagnetLink } from '../types';
import { getMoviePath } from '../utils/seo';
import { handleBrandedMagnetDownload } from '../utils/downloadPack';
import { getBackdropCandidates, CINEVAULT_BACKDROP_FALLBACK } from '../utils/imageFallback';
import { BookmarkPlusIcon, BookmarkIcon, PlayIcon, CopyIcon } from './ActionIcons';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FeaturedHeroProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isWatchlisted: (movieId: number) => boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

export const FeaturedHero: React.FC<FeaturedHeroProps> = ({
  movies,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  isWatchlisted,
  onToggleWatchlist,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [slideKey, setSlideKey] = useState(0);
  const [backdropIndex, setBackdropIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  const heroMovies = (movies || []).slice(0, 10);
  const totalSlides = heroMovies.length;

  const handleNext = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
    setSlideKey((k) => k + 1);
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    setSlideKey((k) => k + 1);
  }, [totalSlides]);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
    setSlideKey((k) => k + 1);
  };

  useEffect(() => {
    setBackdropIndex(0);
  }, [currentIndex]);

  // Preload adjacent slide backdrops for instant zero-flicker transitions
  useEffect(() => {
    if (heroMovies.length <= 1) return;
    const nextIdx = (currentIndex + 1) % heroMovies.length;
    const prevIdx = (currentIndex - 1 + heroMovies.length) % heroMovies.length;
    [nextIdx, prevIdx].forEach((idx) => {
      const nextMovie = heroMovies[idx];
      if (nextMovie) {
        const nextCandidates = getBackdropCandidates(nextMovie);
        if (nextCandidates[0] && !nextCandidates[0].startsWith('data:')) {
          const img = new Image();
          img.referrerPolicy = 'no-referrer';
          img.src = nextCandidates[0];
        }
      }
    });
  }, [currentIndex, heroMovies]);

  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, totalSlides, handleNext, currentIndex]);

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

  if (!movies || movies.length === 0 || !heroMovies[0]) return null;

  const currentMovie = heroMovies[currentIndex] || heroMovies[0];
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
      className="hero-cinema-container relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl min-h-[500px] sm:min-h-[540px] md:min-h-[580px] lg:min-h-[620px] aspect-[16/11] sm:aspect-[16/10] md:aspect-[21/9] flex flex-col justify-end group transition-all select-none mb-10"
      aria-label="Featured Movies Carousel"
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
            WebkitFilter: 'none',
          }}
        />
      </div>

      {/* Left-to-Right Subtle Dark Gradient Overlay: Preserves 100% typography contrast while keeping right-side artwork vivid */}
      <div className="absolute inset-0 z-10 hero-gradient-overlay-x pointer-events-none" />

      {/* Bottom-to-Top Subtle Dark Gradient Overlay: Shields control pills & action buttons across mobile and desktop */}
      <div className="absolute inset-0 z-10 hero-gradient-overlay-y pointer-events-none" />

      {/* Top Subtle Vignette */}
      <div className="absolute top-0 inset-x-0 h-24 z-10 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Interactive Edge Navigation Arrows (Desktop Hover) */}
      {heroMovies.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/80 border border-white/15 text-white/70 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer shadow-xl hidden sm:flex items-center justify-center hover:scale-110 active:scale-95"
            aria-label="Previous movie slide"
            title="Previous movie"
          >
            <ChevronLeft size={22} />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/80 border border-white/15 text-white/70 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer shadow-xl hidden sm:flex items-center justify-center hover:scale-110 active:scale-95"
            aria-label="Next movie slide"
            title="Next movie"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Prominent Foreground Content Layer Positioned Above the Artwork */}
      <div
        key={`content-${currentMovie.id}-${slideKey}`}
        className="relative z-20 p-5 sm:p-8 md:p-12 lg:p-14 w-full max-w-2xl lg:max-w-3xl flex flex-col justify-end gap-3 sm:gap-4 animate-heroFadeIn pb-16 sm:pb-16 md:pb-12 text-left"
      >
        {/* Metadata Badges (Rating, Year, Duration, Quality) */}
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
              <span>{Math.floor(currentMovie.runtime / 60)}h {currentMovie.runtime % 60}m</span>
            </span>
          )}

          {primaryTorrent?.quality && (
            <span className="text-xs font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm uppercase tracking-wide">
              {primaryTorrent.quality}
            </span>
          )}
        </div>

        {/* Cinematic Display Title */}
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
          {currentMovie.description_full || currentMovie.summary || currentMovie.synopsis || 'Explore full movie details, high-bitrate torrents, and magnet links.'}
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

      {/* Floating Slideshow Controls & Progress Bar */}
      {heroMovies.length > 1 && (
        <div className="absolute right-3 bottom-3 sm:right-6 sm:bottom-4 z-30 flex items-center gap-1.5 sm:gap-2.5 bg-black/80 border border-white/20 backdrop-blur-md px-3 py-1.5 rounded-full shadow-2xl">
          <button
            type="button"
            onClick={togglePlayPause}
            className="p-1 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
            title={isPaused ? 'Resume Autoplay' : 'Pause Autoplay'}
            aria-label={isPaused ? 'Resume Autoplay' : 'Pause Autoplay'}
          >
            <span className="text-[10px] font-bold tracking-wider">{isPaused ? 'PLAY' : 'PAUSE'}</span>
          </button>

          <div className="w-[1px] h-3.5 bg-white/20" />

          <button
            type="button"
            onClick={handlePrev}
            className="p-1 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer text-[10px] font-bold tracking-wider"
            aria-label="Previous Movie"
            title="Previous Movie"
          >
            PREV
          </button>

          {/* Slide Indicator Progress Bars */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-1">
            {heroMovies.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => goToSlide(idx)}
                className={`relative h-1.5 sm:h-2 rounded-full overflow-hidden transition-all duration-300 cursor-pointer ${
                  idx === currentIndex ? 'w-6 sm:w-9 bg-white/20' : 'w-1.5 sm:w-2 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
                title={m.title}
              >
                {idx === currentIndex && (
                  <div
                    className={`absolute inset-0 bg-rose-600 h-full ${
                      !isPaused ? 'animate-progressFill' : 'w-full'
                    }`}
                  />
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="p-1 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer text-[10px] font-bold tracking-wider"
            aria-label="Next Movie"
            title="Next Movie"
          >
            NEXT
          </button>
        </div>
      )}
    </section>
  );
};
export default FeaturedHero;
