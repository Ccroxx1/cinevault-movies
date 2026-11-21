import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Film, Star, Calendar, Clock, Loader2 } from 'lucide-react';
import { Movie } from '../types';
import { fetchFilmography } from '../services/movieApi';
import { CINEVAULT_POSTER_FALLBACK, getPrimaryMoviePoster } from '../utils/imageFallback';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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
  useBodyScrollLock(Boolean(personName));
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'year'>('rating');

  useEffect(() => {
    if (!personName) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [personName, onClose]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
    >
      <div className="modal-dialog-surface cv-surface-elevated border relative w-full max-w-4xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b cv-border flex items-center justify-between cv-surface-muted gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl cv-btn-primary flex items-center justify-center shadow-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full cv-badge-neutral border font-bold">
                  {role === 'director' ? 'Director Filmography' : 'Cast Member'}
                </span>
                <span className="text-xs cv-text-muted">
                  {sortedMovies.length > 0 && `${sortedMovies.length} films found`}
                </span>
              </div>
              <h2 id="filmography-title" className="text-lg sm:text-xl font-display font-black cv-text mt-0.5">
                {personName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center cv-card rounded-xl p-1 border text-[11px] sm:text-xs">
              <button
                type="button"
                aria-pressed={sortBy === 'rating'}
                onClick={() => setSortBy('rating')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  sortBy === 'rating' ? 'cv-nav-pill-active' : 'cv-nav-pill'
                }`}
              >
                Top Rated
              </button>
              <button
                type="button"
                aria-pressed={sortBy === 'year'}
                onClick={() => setSortBy('year')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  sortBy === 'year' ? 'cv-nav-pill-active' : 'cv-nav-pill'
                }`}
              >
                Release Date
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl cv-btn-secondary transition cursor-pointer"
              aria-label="Close Filmography"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 cv-text-muted">
              <Loader2 className="w-8 h-8 cv-text-accent animate-spin" />
              <p className="text-xs">Searching catalog for films featuring {personName}...</p>
            </div>
          ) : error ? (
            <div className="py-12 px-4 text-center rounded-2xl border cv-badge-error text-sm font-medium">{error}</div>
          ) : sortedMovies.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Film className="w-12 h-12 mx-auto cv-text-subtle" />
              <p className="text-sm font-bold cv-text">No Additional Titles Found</p>
              <p className="text-xs cv-text-muted max-w-sm mx-auto">
                No other matching films featuring {personName} were found in the current mirror catalog.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {sortedMovies.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onSelectMovie(m);
                    onClose();
                  }}
                  className="group relative rounded-xl cv-card-interactive border overflow-hidden cursor-pointer flex flex-col justify-between text-left"
                >
                  <div className="aspect-[2/3] w-full cv-surface-muted overflow-hidden relative">
                    <img
                      src={getPrimaryMoviePoster(m)}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      loading="eager"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = CINEVAULT_POSTER_FALLBACK;
                      }}
                    />
                    <div className="poster-badge cv-rating-overlay absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-sm border border-white/15 flex items-center gap-1 text-[11px] font-bold text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{(m.rating || 0).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="p-2.5 space-y-1 w-full">
                    <h3 className="text-xs font-bold cv-text cv-group-hover-accent transition-colors line-clamp-1">
                      {m.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] cv-text-muted">
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
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
