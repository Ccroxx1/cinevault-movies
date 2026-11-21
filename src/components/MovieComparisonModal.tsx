import React, { useState } from 'react';
import {
  X,
  Star,
  Clock,
  Calendar,
  Award,
  Download,
  Magnet,
  CheckCircle,
  XCircle,
  Sparkles,
  Zap,
  User,
  Film,
  Plus,
  Search,
  HardDrive,
  Volume2,
} from 'lucide-react';
import { useMovieComparison } from '../context/MovieComparisonContext';
import { buildMagnetLink, Movie, Torrent } from '../types';
import { TorrentSwarmHealthBadge } from './TorrentSwarmHealthBadge';
import { DownloadSpeedEstimator } from './DownloadSpeedEstimator';
import { CINEVAULT_POSTER_FALLBACK, getPrimaryMoviePoster } from '../utils/imageFallback';
import { getSafeExternalUrl, getSafeMagnetUrl } from '../utils/safeUrl';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface MovieComparisonModalProps {
  onSelectMovie?: (movie: Movie) => void;
  onOpenFilmography?: (name: string, role?: 'director' | 'actor' | 'cast') => void;
  allMoviesPool?: Movie[];
}

export const MovieComparisonModal: React.FC<MovieComparisonModalProps> = ({
  onSelectMovie,
  onOpenFilmography,
  allMoviesPool = [],
}) => {
  const { comparisonList, addToComparison, removeFromComparison, clearComparison, isOpen, setIsOpen } =
    useMovieComparison();

  useBodyScrollLock(isOpen);

  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [showAddPicker, setShowAddPicker] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  // Compute highest rated movie
  const highestRating = Math.max(...comparisonList.map((m) => m.rating || 0));

  const availableCandidates = allMoviesPool
    .filter((m) => !comparisonList.some((c) => c.id === m.id))
    .filter((m) =>
      addSearchTerm.trim() === ''
        ? true
        : m.title.toLowerCase().includes(addSearchTerm.toLowerCase()) ||
          m.genres?.some((g) => g.toLowerCase().includes(addSearchTerm.toLowerCase()))
    )
    .slice(0, 6);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-title"
      style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="modal-dialog-surface relative w-full max-w-6xl rounded-2xl sm:rounded-3xl cv-surface-elevated border overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b cv-border flex items-center justify-between cv-surface-muted">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl cv-btn-primary flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="comparison-title" className="text-lg sm:text-xl font-display font-black cv-text">
                Movie Versus Matrix
              </h2>
              <p className="text-xs cv-text-muted">
                Direct format matrix, cast & director comparison, audio codecs, and file sizes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {comparisonList.length > 0 && (
              <button
                type="button"
                onClick={clearComparison}
                className="px-3 py-1.5 rounded-lg cv-btn-secondary text-xs font-semibold transition cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl cv-btn-secondary transition cursor-pointer"
              aria-label="Close Comparison"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {comparisonList.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full cv-surface-muted border cv-border flex items-center justify-center cv-text-muted">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold cv-text">No Movies Selected for Comparison</h3>
              <p className="text-xs cv-text-muted max-w-sm mx-auto">
                Browse the catalog and click the "Compare" button on any movie card or detail page to add up to 3 films here.
              </p>
            </div>
          ) : (
            <>
              {/* Top Controls: Slot Count & Add Movie */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold cv-text-secondary">
                    Comparing {comparisonList.length} of 3 Movies
                  </span>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((idx) => (
                      <div
                        key={idx}
                        style={
                          idx < comparisonList.length
                            ? { backgroundColor: 'var(--cv-nav-active-bg)' }
                            : undefined
                        }
                        className={`w-2.5 h-2.5 rounded-full ${
                          idx < comparisonList.length ? '' : 'cv-surface-muted border cv-border'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {comparisonList.length < 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAddPicker(!showAddPicker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl cv-nav-soft-active text-xs font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddPicker ? 'Close Search' : 'Add Movie to Versus'}</span>
                  </button>
                )}
              </div>

              {/* In-Modal Movie Selector */}
              {showAddPicker && comparisonList.length < 3 && (
                <div className="p-4 rounded-2xl cv-surface-muted border cv-border space-y-3 animate-in fade-in duration-150">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 cv-text-muted" />
                    <label htmlFor="comparison-add-search" className="sr-only">
                      Search movie title to add
                    </label>
                    <input
                      id="comparison-add-search"
                      name="comparisonSearch"
                      type="text"
                      placeholder="Search movie title to add..."
                      value={addSearchTerm}
                      onChange={(e) => setAddSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl cv-input border text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {availableCandidates.map((cand) => (
                      <button
                        type="button"
                        key={cand.id}
                        onClick={() => {
                          addToComparison(cand);
                          if (comparisonList.length + 1 >= 3) {
                            setShowAddPicker(false);
                          }
                        }}
                        className="p-2 rounded-xl cv-card-interactive border text-left cursor-pointer group"
                      >
                        <div className="aspect-[2/3] rounded-lg overflow-hidden cv-surface-muted mb-1.5">
                          <img
                            src={getPrimaryMoviePoster(cand)}
                            alt={cand.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="eager"
                          />
                        </div>
                        <h5 className="text-[11px] font-bold cv-text cv-group-hover-accent truncate">
                          {cand.title}
                        </h5>
                        <p className="text-[10px] cv-text-muted">{cand.year} • ★ {cand.rating}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matrix Columns */}
              <div
                className={`grid grid-cols-1 ${
                  comparisonList.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
                } gap-4 sm:gap-6`}
              >
                {comparisonList.map((movie) => {
                  const isTopRated = movie.rating > 0 && movie.rating === highestRating;
                  const torrents = movie.torrents || [];

                  return (
                    <div
                      key={movie.id}
                      style={
                        isTopRated
                          ? { borderColor: 'var(--cv-nav-active-bg)', boxShadow: 'var(--cv-card-shadow)' }
                          : undefined
                      }
                      className={`relative rounded-2xl p-4 flex flex-col justify-between cv-card transition-all ${
                        isTopRated ? 'border-2' : 'border'
                      }`}
                    >
                      {/* Top badge */}
                      {isTopRated && (
                        <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full cv-btn-primary font-mono font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                          <Award className="w-3 h-3" /> Top Rated
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeFromComparison(movie.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg cv-btn-secondary transition cursor-pointer"
                        title="Remove movie"
                        aria-label={`Remove ${movie.title} from comparison`}
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Poster and Title */}
                      <div className="space-y-3">
                        <div className="aspect-[2/3] max-w-[170px] mx-auto rounded-xl overflow-hidden shadow-lg border cv-border cv-surface-muted">
                          <img
                            src={getPrimaryMoviePoster(movie)}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="eager"
                          />
                        </div>

                        <div className="text-center space-y-1">
                          <h3
                            onClick={() => onSelectMovie && onSelectMovie(movie)}
                            className="text-base font-bold cv-text hover:text-[var(--cv-accent-text)] transition cursor-pointer line-clamp-1"
                            title={movie.title}
                          >
                            {movie.title}
                          </h3>
                          <div className="flex items-center justify-center gap-2 text-xs cv-text-muted">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {movie.year}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {movie.runtime ? `${movie.runtime}m` : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Rating Card */}
                        <div className="p-2.5 rounded-xl cv-surface-muted border cv-border flex items-center justify-between">
                          <span className="text-xs cv-text-muted font-medium">IMDb Rating</span>
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 cv-rating fill-current" />
                            <span className="text-sm font-black cv-text">{movie.rating.toFixed(1)}</span>
                            <span className="text-[10px] cv-text-subtle">/10</span>
                          </div>
                        </div>

                        {/* Genres */}
                        <div className="flex flex-wrap gap-1 justify-center">
                          {movie.genres?.slice(0, 3).map((g) => (
                            <span
                              key={g}
                              className="text-[10px] px-2 py-0.5 rounded-md cv-badge-neutral border"
                            >
                              {g}
                            </span>
                          ))}
                        </div>

                        {/* Billing Cast & Director Section */}
                        <div className="p-3 rounded-xl cv-surface-muted border cv-border-subtle space-y-2 text-left">
                          <div className="flex items-center justify-between text-[11px] font-bold cv-text-muted uppercase tracking-wider">
                            <span>Key Cast & Billing</span>
                            <User className="w-3 h-3 cv-text-subtle" />
                          </div>
                          {movie.cast && movie.cast.length > 0 ? (
                            <div className="space-y-1">
                              {movie.cast.slice(0, 3).map((c, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => onOpenFilmography && onOpenFilmography(c.name, 'actor')}
                                  className="w-full flex items-center justify-between text-left group cursor-pointer hover:bg-[var(--cv-surface-hover)] px-1.5 py-0.5 rounded transition"
                                  title={`Explore filmography for ${c.name}`}
                                >
                                  <span className="text-xs font-semibold cv-text-secondary cv-group-hover-accent truncate">
                                    {c.name}
                                  </span>
                                  <span className="text-[10px] cv-text-muted truncate max-w-[100px]">
                                    {c.character_name || 'Lead Cast'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] cv-text-muted italic">Featured ensemble billing</p>
                          )}
                        </div>

                        {/* Direct Format Matrix (File Size vs Audio Codec) */}
                        <div className="space-y-2 pt-2 border-t cv-border-subtle">
                          <div className="flex items-center justify-between text-[11px] font-bold cv-text-muted uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3 cv-text-accent" />
                              <span>Format Matrix (Size vs Codec)</span>
                            </span>
                            <Volume2 className="w-3 h-3" style={{ color: 'var(--cv-success-soft-fg)' }} />
                          </div>

                          {torrents.length > 0 ? (
                            <div className="space-y-1.5">
                              {torrents.slice(0, 3).map((t, idx) => {
                                const is265 = t.video_codec?.includes('x265') || t.quality?.includes('x265');
                                const isSurround = t.audio_channels === '5.1' || t.audio_channels === '7.1';
                                return (
                                  <div
                                    key={idx}
                                    className="p-2 rounded-xl cv-surface-muted border cv-border transition space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold cv-badge-neutral border px-1.5 py-0.5 rounded text-[10px]">
                                          {t.quality}
                                        </span>
                                        <span className="font-mono cv-text-secondary text-[11px]">{t.size}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {is265 && (
                                          <span className="text-[9px] font-mono px-1 rounded cv-badge-success border">
                                            x265 HEVC
                                          </span>
                                        )}
                                        <span
                                          className={`text-[9px] font-mono px-1 rounded ${
                                            isSurround
                                              ? 'cv-rating-badge'
                                              : 'cv-badge-neutral border'
                                          }`}
                                        >
                                          {t.audio_channels || '2.0'} CH
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-0.5">
                                      <TorrentSwarmHealthBadge seeds={t.seeds} peers={t.peers} />
                                      <div className="flex items-center gap-1">
                                        {getSafeExternalUrl(t.url) && (
                                          <a
                                            href={getSafeExternalUrl(t.url)!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download
                                            className="px-1.5 py-1 rounded cv-btn-primary text-[10px] font-bold flex items-center gap-1 transition"
                                            title={`Download ${t.quality} torrent`}
                                          >
                                            <Download className="w-2.5 h-2.5" />
                                            <span>Torrent</span>
                                          </a>
                                        )}
                                        <a
                                          href={getSafeMagnetUrl(buildMagnetLink(t.hash, movie.title)) || '#'}
                                          className="px-1.5 py-1 rounded cv-btn-magnet text-[10px] font-bold flex items-center gap-1 transition"
                                          title="Magnet link"
                                        >
                                          <Magnet className="w-2.5 h-2.5" />
                                          <span>Magnet</span>
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs cv-text-muted text-center py-2">No torrent streams listed</p>
                          )}
                        </div>
                      </div>

                      {/* Detail View Shortcut */}
                      <div className="pt-3 mt-3 border-t cv-border-subtle">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectMovie) onSelectMovie(movie);
                            setIsOpen(false);
                          }}
                          className="w-full py-2 rounded-xl cv-btn-secondary text-xs font-bold transition cursor-pointer"
                        >
                          View Full Details & Specs
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Verdict Box */}
              {comparisonList.length >= 2 && (
                <div className="p-4 rounded-2xl cv-nav-soft-active space-y-2">
                  <div className="flex items-center gap-2 cv-text-accent font-bold text-sm">
                    <Zap className="w-4 h-4" />
                    <span>CineVault Recommendation</span>
                  </div>
                  <p className="text-xs cv-text-secondary leading-relaxed">
                    Based on ratings and technical specs,{' '}
                    <strong className="cv-text">
                      {comparisonList.find((m) => m.rating === highestRating)?.title}
                    </strong>{' '}
                    leads with the strongest critical acclaim ({highestRating.toFixed(1)}/10).{' '}
                    Compare the direct format matrix above to balance 2160p 4K high-fidelity video vs. bandwidth-saving x265 HEVC streams.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
