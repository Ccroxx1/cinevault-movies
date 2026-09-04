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
import { CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';

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

  if (!isOpen) return null;

  const displayMovie = selectedMovie || poolToUse[currentIndex] || poolToUse[0];
  const isSaved = displayMovie && watchlist.some((w) => w.id === displayMovie.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spinner-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-[#0c0c0c] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-md">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h2 id="spinner-title" className="text-base sm:text-lg font-display font-black text-white">
                Movie Night Roulette
              </h2>
              <p className="text-xs text-neutral-400">Can't decide? Let fate choose your next film</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
            aria-label="Close Spinner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls & Filter Bar */}
        <div className="p-4 border-b border-white/10 bg-white/[0.01] space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 font-semibold">Mood / Genre:</span>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-[#141414] text-white border border-white/15 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-neutral-400 font-semibold">Min IMDb:</span>
              <div className="flex items-center gap-1">
                {[0, 6.5, 7.0, 7.5, 8.0].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setMinRating(rating)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                      minRating === rating
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-white/5 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {rating === 0 ? 'Any' : `${rating}+`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-neutral-400/80 font-mono text-right">
            Available Candidate Films: <strong className="text-white">{poolToUse.length}</strong>
          </div>
        </div>

        {/* Slot / Reel Stage */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
          {displayMovie ? (
            <div
              className={`w-full max-w-md rounded-2xl bg-[#141414] border p-4 sm:p-5 transition-all duration-300 ${
                isSpinning
                  ? 'border-amber-500/50 scale-[0.98] shadow-lg shadow-amber-950/20 animate-pulse'
                  : 'border-rose-500/40 shadow-2xl shadow-rose-950/20'
              }`}
            >
              <div className="flex gap-4 items-start">
                <div className="w-28 sm:w-32 aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-white/10 shadow-lg relative">
                  <img
                    src={displayMovie.medium_cover_image || displayMovie.large_cover_image || CINEVAULT_POSTER_FALLBACK}
                    alt={displayMovie.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isSpinning && (
                    <div className="absolute inset-0 bg-rose-600/20 backdrop-blur-[1px] flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-amber-300 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{displayMovie.rating.toFixed(1)} / 10</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white leading-tight line-clamp-2">
                    {displayMovie.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-neutral-400">
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
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300"
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed pt-1">
                    {displayMovie.description_full ||
                      displayMovie.summary ||
                      'An extraordinary cinematic experience waiting to be discovered tonight.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons for Landed Movie */}
              {!isSpinning && (
                <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      onSelectMovie(displayMovie);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>View & Download</span>
                  </button>

                  {onWatchTrailer && displayMovie.yt_trailer_code && (
                    <button
                      onClick={() => {
                        onWatchTrailer(displayMovie);
                        onClose();
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 font-semibold text-xs transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-rose-400" />
                      <span>Watch Trailer</span>
                    </button>
                  )}

                  {onToggleWatchlist && (
                    <button
                      onClick={() => onToggleWatchlist(displayMovie)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        isSaved
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300 hover:text-white'
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
            <div className="py-12 text-center text-neutral-400 text-xs">No movies found for filters.</div>
          )}

          {/* Spin Trigger Button */}
          <div className="mt-6 text-center">
            <button
              onClick={handleSpin}
              disabled={isSpinning || poolToUse.length === 0}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 text-white font-black text-sm tracking-wide shadow-xl shadow-rose-950/50 flex items-center gap-2.5 mx-auto transition-all transform hover:scale-[1.02] cursor-pointer"
            >
              <RotateCcw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'SPINNING REEL...' : 'SPIN AGAIN'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
