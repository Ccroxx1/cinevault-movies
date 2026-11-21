import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Dices,
  Star,
  Clock,
  Calendar,
  Download,
  Film,
  RotateCcw,
  Play,
  Bookmark,
  Check,
} from 'lucide-react';
import { Movie } from '../types';
import { GENRES } from '../services/movieApi';
import { CINEVAULT_POSTER_FALLBACK, getPrimaryMoviePoster } from '../utils/imageFallback';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface MovieNightSpinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  moviesPool: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onWatchTrailer?: (movie: Movie) => void;
  watchlist?: Movie[];
  onToggleWatchlist?: (movie: Movie) => void;
}

export const MovieNightSpinnerModal: React.FC<MovieNightSpinnerModalProps> = ({
  isOpen,
  onClose,
  moviesPool,
  onSelectMovie,
  onWatchTrailer,
  watchlist = [],
  onToggleWatchlist,
}) => {
  useBodyScrollLock(isOpen);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [minRating, setMinRating] = useState<number>(7.0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Filter available candidate pool
  const candidatePool = moviesPool.filter((m) => {
    if (selectedGenre !== 'All') {
      if (!m.genres || !m.genres.some((g) => g.toLowerCase() === selectedGenre.toLowerCase())) {
        return false;
      }
    }
    if (minRating > 0 && (m.rating || 0) < minRating) {
      return false;
    }
    return true;
  });

  const poolToUse = candidatePool.length > 0 ? candidatePool : moviesPool;

  const handleSpin = () => {
    if (poolToUse.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setSelectedMovie(null);

    let speed = 50;
    let ticks = 0;
    const maxTicks = 25 + Math.floor(Math.random() * 10);

    const tick = () => {
      ticks++;
      setCurrentIndex((prev) => (prev + 1) % poolToUse.length);

      if (ticks >= maxTicks) {
        // Land on a random movie
        const randomIndex = Math.floor(Math.random() * poolToUse.length);
        setCurrentIndex(randomIndex);
        setSelectedMovie(poolToUse[randomIndex]);
        setIsSpinning(false);
      } else {
        // Decelerate the reel
        if (ticks > maxTicks - 8) {
          speed += 40;
        } else if (ticks > maxTicks - 15) {
          speed += 20;
        }
        setTimeout(tick, speed);
      }
    };

    tick();
  };

  useEffect(() => {
    if (isOpen && !selectedMovie && poolToUse.length > 0) {
      // Pick initial preview
      setSelectedMovie(poolToUse[0]);
    }
  }, [isOpen, poolToUse]);

  // Keyboard shortcut listener within spinner modal: 'Esc' to close, 'R' to spin
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleSpin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, poolToUse, isSpinning]);

  if (!isOpen) return null;

  const displayMovie = selectedMovie || poolToUse[currentIndex] || poolToUse[0];
  const isSaved = displayMovie && watchlist.some((w) => w.id === displayMovie.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spinner-title"
      style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="modal-dialog-surface relative w-full max-w-2xl rounded-2xl sm:rounded-3xl cv-surface-elevated border overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b cv-border flex items-center justify-between cv-surface-muted">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl cv-btn-primary flex items-center justify-center shadow-md">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h2 id="spinner-title" className="text-base sm:text-lg font-display font-black cv-text">
                Movie Night Roulette
              </h2>
              <p className="text-xs cv-text-muted">Can't decide? Let fate choose your next film</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl cv-btn-secondary transition cursor-pointer"
            aria-label="Close Spinner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls & Filter Bar */}
        <div className="p-4 border-b cv-border cv-surface-muted space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <label htmlFor="spinner-genre-select" className="cv-text-secondary font-semibold">Mood / Genre:</label>
              <select
                id="spinner-genre-select"
                name="spinnerGenre"
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="cv-select border rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="cv-text-secondary font-semibold">Min IMDb:</span>
              <div className="flex items-center gap-1">
                {[0, 6.5, 7.0, 7.5, 8.0].map((rating) => {
                  const isActive = minRating === rating;
                  return (
                    <button
                      type="button"
                      key={rating}
                      onClick={() => setMinRating(rating)}
                      aria-pressed={isActive}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                        isActive
                          ? 'cv-rating-badge shadow-sm'
                          : 'cv-btn-secondary'
                      }`}
                    >
                      {rating === 0 ? 'Any' : `${rating}+`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="text-[11px] cv-text-muted font-mono text-right">
            Available Candidate Films: <strong className="cv-text">{poolToUse.length}</strong>
          </div>
        </div>

        {/* Slot / Reel Stage */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
          {displayMovie ? (
            <div
              style={{
                borderColor: isSpinning ? 'var(--cv-rating-border)' : 'var(--cv-nav-active-border)',
                boxShadow: 'var(--cv-card-shadow)',
              }}
              className={`w-full max-w-md rounded-2xl cv-card border p-4 sm:p-5 transition-all duration-300 ${
                isSpinning ? 'scale-[0.98] animate-pulse' : ''
              }`}
            >
              <div className="flex gap-4 items-start">
                <div className="w-28 sm:w-32 aspect-[2/3] rounded-xl overflow-hidden cv-surface-muted shrink-0 border cv-border shadow-lg relative">
                  <img
                    src={getPrimaryMoviePoster(displayMovie)}
                    alt={displayMovie.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isSpinning && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-amber-300 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-1.5 cv-rating text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{displayMovie.rating.toFixed(1)} / 10</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black cv-text leading-tight line-clamp-2">
                    {displayMovie.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs cv-text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {displayMovie.year}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {displayMovie.runtime || 110}m
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {displayMovie.genres?.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="text-[10px] px-1.5 py-0.5 rounded cv-badge-neutral border font-medium"
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs cv-text-muted line-clamp-3 leading-relaxed pt-1">
                    {displayMovie.description_full ||
                      displayMovie.summary ||
                      'An extraordinary cinematic experience waiting to be discovered tonight.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons for Landed Movie */}
              {!isSpinning && (
                <div className="mt-5 pt-4 border-t cv-border-subtle grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectMovie(displayMovie);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl cv-btn-primary font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>View & Download</span>
                  </button>

                  {onWatchTrailer && displayMovie.yt_trailer_code && (
                    <button
                      type="button"
                      onClick={() => {
                        onWatchTrailer(displayMovie);
                        onClose();
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl cv-btn-playback font-semibold text-xs transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Watch Trailer</span>
                    </button>
                  )}

                  {onToggleWatchlist && (
                    <button
                      type="button"
                      onClick={() => onToggleWatchlist(displayMovie)}
                      aria-pressed={Boolean(isSaved)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        isSaved ? 'cv-badge-success' : 'cv-btn-secondary'
                      }`}
                    >
                      {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      <span>{isSaved ? 'In Watchlist' : 'Watchlist'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center cv-text-muted text-xs">No movies found for filters.</div>
          )}

          {/* Spin Trigger Button */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning || poolToUse.length === 0}
              className="px-8 py-3.5 rounded-2xl cv-btn-primary disabled:opacity-50 font-black text-sm tracking-wide shadow-lg flex items-center gap-2.5 mx-auto transition-all cursor-pointer"
            >
              <RotateCcw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'SPINNING REEL...' : 'SPIN AGAIN'}</span>
              <kbd className="hidden sm:inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-[10px] font-mono bg-black/30 border border-white/25 rounded font-bold text-white">
                R
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
