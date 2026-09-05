import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Film, Star, Calendar, Clock, Loader2 } from 'lucide-react';
import { Movie } from '../types';
import { fetchFilmography } from '../services/movieApi';
import { CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';

interface FilmographyModalProps {
  personName: string | null;
  role?: 'director' | 'actor' | 'cast';
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
}

export const FilmographyModal: React.FC<FilmographyModalProps> = ({
  personName,
  role = 'cast',
  onClose,
  onSelectMovie,
}) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'year'>('rating');

  useEffect(() => {
    if (!personName) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function loadFilmography() {
      try {
        const results = await fetchFilmography(personName || '', role);

        if (isMounted) {
          setMovies(results || []);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError('Could not load filmography at this time.');
          setIsLoading(false);
        }
      }
    }

    loadFilmography();

    return () => {
      isMounted = false;
    };
  }, [personName, role]);

  const sortedMovies = useMemo(() => {
    return [...movies].sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      return (b.year || 0) - (a.year || 0);
    });
  }, [movies, sortBy]);

  if (!personName) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="filmography-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl rounded-2xl sm:rounded-3xl bg-[#0c0c0c] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-rose-950/30">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 font-bold">
                  {role === 'director' ? 'Director Filmography' : 'Cast Member'}
                </span>
                <span className="text-xs text-neutral-400">
                  {sortedMovies.length > 0 && `${sortedMovies.length} films found`}
                </span>
              </div>
              <h2 id="filmography-title" className="text-lg sm:text-xl font-display font-black text-white mt-0.5">
                {personName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 text-[11px] sm:text-xs">
              <button
                type="button"
                onClick={() => setSortBy('rating')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  sortBy === 'rating' ? 'bg-rose-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Top Rated
              </button>
              <button
                type="button"
                onClick={() => setSortBy('year')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  sortBy === 'year' ? 'bg-rose-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Release Date
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
              aria-label="Close Filmography"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-xs">Searching catalog for films featuring {personName}...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-400 text-sm">{error}</div>
          ) : sortedMovies.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Film className="w-12 h-12 mx-auto text-neutral-600" />
              <p className="text-sm font-bold text-white">No Additional Titles Found</p>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                No other matching films featuring {personName} were found in the current mirror catalog.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {sortedMovies.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    onSelectMovie(m);
                    onClose();
                  }}
                  className="group relative rounded-xl bg-[#121212] border border-white/10 overflow-hidden hover:border-rose-500/50 transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="aspect-[2/3] w-full bg-neutral-900 overflow-hidden relative">
                    <img
                      src={m.medium_cover_image || m.large_cover_image || CINEVAULT_POSTER_FALLBACK}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = CINEVAULT_POSTER_FALLBACK;
                      }}
                    />
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/10 flex items-center gap-1 text-[11px] font-bold text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{(m.rating || 0).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="p-2.5 space-y-1">
                    <h3 className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-1">
                      {m.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> {m.year}
                      </span>
                      {m.runtime > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {m.runtime}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
