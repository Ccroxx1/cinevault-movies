import React, { useState, useEffect, useCallback } from 'react';
import { Play, Star, Clock, Bookmark, ChevronLeft, ChevronRight, Copy, Check, Eye, Pause, Magnet } from 'lucide-react';
import { Movie, buildMagnetLink } from '../types';
import { getMoviePath } from '../utils/seo';
import { handleBrandedMagnetDownload } from '../utils/downloadPack';
import { getBackdropCandidates, getPosterCandidates, CINEVAULT_BACKDROP_FALLBACK, CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';

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
  const [posterIndex, setPosterIndex] = useState(0);

  // Showcase up to 10 popular movies in the slideshow
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

  // Reset candidate indices when index changes
  useEffect(() => {
    setBackdropIndex(0);
    setPosterIndex(0);
  }, [currentIndex]);

  // Auto-play Carousel Timer (cycles every 6 seconds if not paused)
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;

    const interval = setInterval(() => {
      handleNext();
    }, 6000);

    return () => clearInterval(interval);
  }, [isPaused, totalSlides, handleNext, currentIndex]);

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  if (!movies || movies.length === 0 || !heroMovies[0]) return null;

  const currentMovie = heroMovies[currentIndex] || heroMovies[0];
  const primaryTorrent = currentMovie.torrents?.[0];

  const backdropCandidates = getBackdropCandidates(currentMovie);
  const posterCandidates = getPosterCandidates(currentMovie);

  const currentBackdropSrc = backdropCandidates[backdropIndex] || CINEVAULT_BACKDROP_FALLBACK;
  const currentPosterSrc = posterCandidates[posterIndex] || CINEVAULT_POSTER_FALLBACK;

  const handleBackdropError = () => {
    if (backdropIndex + 1 < backdropCandidates.length) {
      setBackdropIndex((prev) => prev + 1);
    }
  };

  const handlePosterError = () => {
    if (posterIndex + 1 < posterCandidates.length) {
      setPosterIndex((prev) => prev + 1);
    }
  };

  const togglePlayPause = () => {
    setIsPaused((prev) => !prev);
  };

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
      className="relative w-full rounded-3xl overflow-hidden bg-[#0c0c0c] border border-white/10 shadow-2xl min-h-[480px] sm:min-h-[540px] flex flex-col justify-end group transition-all select-none mb-10"
    >
      {/* Dynamic Background Ambient Backdrop with Smooth Fade Transition */}
      <div key={`bg-${currentMovie.id}-${slideKey}-${backdropIndex}`} className="absolute inset-0 z-0 animate-fadeIn duration-700">
        <img
          src={currentBackdropSrc}
          alt={currentMovie.title}
          referrerPolicy="no-referrer"
          onError={handleBackdropError}
          className="w-full h-full object-cover object-center opacity-40 scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
        />
      </div>

      {/* Multilayer Gradients for Depth & High Legibility */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#080808] via-[#080808]/85 to-[#080808]/40" />
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#080808] via-[#080808]/80 to-transparent" />

      {/* Main Content & Poster Container */}
      <div
        key={`content-${currentMovie.id}-${slideKey}`}
        className="relative z-20 p-4 sm:p-8 md:p-12 w-full flex flex-col md:flex-row items-center md:items-end justify-between gap-6 animate-fadeIn"
      >
        {/* Left Side: Movie Information & Actions */}
        <div className="space-y-3 sm:space-y-4 max-w-2xl flex-1 text-center md:text-left">
          
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 text-amber-400 bg-black/60 border border-white/15 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-md">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>IMDb {currentMovie.rating?.toFixed(1) || '8.0'}</span>
            </div>

            <span className="text-xs font-semibold text-neutral-300 bg-black/60 border border-white/15 px-2.5 py-1 rounded-lg backdrop-blur-md">
              {currentMovie.year}
            </span>

            {currentMovie.runtime > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-neutral-300 bg-black/60 border border-white/15 px-2.5 py-1 rounded-lg backdrop-blur-md">
                <Clock className="w-3.5 h-3.5" />
                <span>{Math.floor(currentMovie.runtime / 60)}h {currentMovie.runtime % 60}m</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="font-display font-black text-2xl sm:text-4xl md:text-5xl text-white tracking-tight leading-tight">
            <a
              href={getMoviePath(currentMovie)}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  onSelectMovie(currentMovie);
                }
              }}
              className="hover:text-rose-400 transition-colors"
            >
              {currentMovie.title}
            </a>
          </h2>

          {/* Genres */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-1 sm:gap-1.5 pt-0.5">
            {currentMovie.genres?.map((g) => (
              <span
                key={g}
                className="text-[10px] sm:text-xs font-semibold text-neutral-300 bg-white/10 border border-white/15 px-3 py-1 rounded-full backdrop-blur-md"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Synopsis / Description */}
          <p className="text-neutral-300 text-xs sm:text-sm md:text-base line-clamp-3 leading-relaxed">
            {currentMovie.description_full || currentMovie.summary || currentMovie.synopsis || 'Explore full movie details, high-bitrate torrents, and magnet links.'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 pt-2">
            <a
              href={getMoviePath(currentMovie)}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  onSelectMovie(currentMovie);
                }
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-5 sm:px-7 py-2.5 bg-white text-black font-bold text-xs sm:text-sm rounded-full hover:bg-neutral-200 transition-all shadow-xl cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Details</span>
            </a>

            {currentMovie.yt_trailer_code && (
              <button
                onClick={() => onPlayTrailer(currentMovie.yt_trailer_code, currentMovie.title)}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-xs sm:text-sm rounded-full hover:bg-white/20 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current text-rose-500" />
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
                          `${currentMovie.title} (${primaryTorrent.quality}) — Starting Download & CineVault Info`
                        );
                      }
                    });
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-full backdrop-blur-md shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                  title={`Direct Magnet Download for ${primaryTorrent.quality} with CineVault Branded Info`}
                >
                  <Magnet className="w-4 h-4 text-emerald-200" />
                  <span>Magnet ({primaryTorrent.quality})</span>
                </button>

                <button
                  onClick={handleCopyMagnet}
                  className="p-2.5 sm:p-3 bg-white/10 hover:bg-white/20 text-neutral-200 rounded-full border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                  title="Copy raw Magnet URI"
                  aria-label="Copy raw Magnet URI"
                >
                  {copiedHash === primaryTorrent.hash ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-neutral-300" />
                  )}
                </button>
              </>
            )}

            <button
              onClick={() => onToggleWatchlist(currentMovie)}
              className={`p-2.5 sm:p-3 rounded-full border transition-all cursor-pointer backdrop-blur-md ${
                isWatchlisted(currentMovie.id)
                  ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-900/30'
                  : 'bg-white/10 text-neutral-300 hover:text-white border-white/20 hover:bg-white/20'
              }`}
              title={isWatchlisted(currentMovie.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
              aria-label="Toggle Watchlist"
            >
              <Bookmark className={`w-4 h-4 ${isWatchlisted(currentMovie.id) ? 'fill-current' : ''}`} />
            </button>
          </div>

        </div>

        {/* Right Side: Visible High-Quality Movie Poster Artwork Card */}
        <div
          onClick={() => onSelectMovie(currentMovie)}
          className="relative shrink-0 w-36 sm:w-44 md:w-56 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-neutral-900 group/poster cursor-pointer transition-transform hover:scale-105"
        >
          <img
            key={`hero-poster-${currentMovie.id}-${posterIndex}`}
            src={currentPosterSrc}
            alt={currentMovie.title}
            referrerPolicy="no-referrer"
            onError={handlePosterError}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-end justify-center p-3">
            <span className="text-xs font-bold text-white bg-rose-600 px-3 py-1 rounded-full shadow-lg">
              Quick View
            </span>
          </div>
        </div>

      </div>

      {/* Carousel Navigation Arrows, Play/Pause & 10-Item Indicators */}
      {heroMovies.length > 1 && (
        <div className="absolute right-3 bottom-3 sm:right-6 sm:bottom-4 z-30 flex items-center gap-1.5 sm:gap-2.5 bg-black/75 border border-white/15 backdrop-blur-md px-3 py-1.5 rounded-full shadow-2xl">
          {/* Play / Pause Auto-play toggle */}
          <button
            onClick={togglePlayPause}
            className="p-1 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
            title={isPaused ? 'Resume Autoplay' : 'Pause Autoplay'}
            aria-label={isPaused ? 'Resume Autoplay' : 'Pause Autoplay'}
          >
            {isPaused ? <Play className="w-3 h-3 fill-current text-rose-500" /> : <Pause className="w-3 h-3 text-neutral-300" />}
          </button>

          <div className="w-[1px] h-3.5 bg-white/15" />

          <button
            onClick={handlePrev}
            className="p-1 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
            aria-label="Previous Featured Movie"
            title="Previous Movie"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* 10-Item Dot / Progress Indicator Bars */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-1">
            {heroMovies.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => goToSlide(idx)}
                className={`relative h-1.5 sm:h-2 rounded-full overflow-hidden transition-all duration-300 cursor-pointer ${
                  idx === currentIndex
                    ? 'w-5 sm:w-8 bg-white/20 shadow-md'
                    : 'w-1.5 sm:w-2 bg-white/25 hover:bg-white/50'
                }`}
                aria-label={`Slide ${idx + 1}: ${m.title}`}
                title={m.title}
              >
                {idx === currentIndex && (
                  <div
                    key={`progress-${slideKey}-${isPaused ? 'paused' : 'running'}`}
                    className={`absolute inset-0 bg-rose-600 h-full ${!isPaused ? 'animate-progressFill' : 'w-full'}`}
                  />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="p-1 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
            aria-label="Next Featured Movie"
            title="Next Movie"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </section>
  );
};
