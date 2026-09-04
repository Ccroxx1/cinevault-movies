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
import { CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';

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

  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [showAddPicker, setShowAddPicker] = useState(false);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-6xl rounded-2xl sm:rounded-3xl bg-[#0c0c0c] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="comparison-title" className="text-lg sm:text-xl font-display font-black text-white">
                Movie Versus Matrix
              </h2>
              <p className="text-xs text-neutral-400">
                Direct format matrix, cast & director comparison, audio codecs, and file sizes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {comparisonList.length > 0 && (
              <button
                onClick={clearComparison}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 text-xs font-semibold transition cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
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
              <div className="w-16 h-16 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">No Movies Selected for Comparison</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Browse the catalog and click the "Compare" button on any movie card or detail page to add up to 3 films here.
              </p>
            </div>
          ) : (
            <>
              {/* Top Controls: Slot Count & Add Movie */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-300">
                    Comparing {comparisonList.length} of 3 Movies
                  </span>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((idx) => (
                      <div
                        key={idx}
                        className={`w-2.5 h-2.5 rounded-full ${
                          idx < comparisonList.length ? 'bg-rose-500' : 'bg-neutral-800 border border-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {comparisonList.length < 3 && (
                  <button
                    onClick={() => setShowAddPicker(!showAddPicker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddPicker ? 'Close Search' : 'Add Movie to Versus'}</span>
                  </button>
                )}
              </div>

              {/* In-Modal Movie Selector */}
              {showAddPicker && comparisonList.length < 3 && (
                <div className="p-4 rounded-2xl bg-neutral-900/90 border border-rose-500/30 space-y-3 animate-in fade-in duration-150">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search movie title to add..."
                      value={addSearchTerm}
                      onChange={(e) => setAddSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder:text-neutral-500 focus:border-rose-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {availableCandidates.map((cand) => (
                      <button
                        key={cand.id}
                        onClick={() => {
                          addToComparison(cand);
                          if (comparisonList.length + 1 >= 3) {
                            setShowAddPicker(false);
                          }
                        }}
                        className="p-2 rounded-xl bg-black/40 hover:bg-rose-950/40 border border-white/5 hover:border-rose-500/30 text-left transition cursor-pointer group"
                      >
                        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-neutral-800 mb-1.5">
                          <img
                            src={cand.medium_cover_image || cand.small_cover_image || CINEVAULT_POSTER_FALLBACK}
                            alt={cand.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        </div>
                        <h5 className="text-[11px] font-bold text-neutral-200 truncate group-hover:text-rose-400">
                          {cand.title}
                        </h5>
                        <p className="text-[10px] text-neutral-400">{cand.year} • ★ {cand.rating}</p>
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
                      className={`relative rounded-2xl p-4 flex flex-col justify-between border transition-all ${
                        isTopRated
                          ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/20'
                          : 'bg-[#121212] border-white/10'
                      }`}
                    >
                      {/* Top badge */}
                      {isTopRated && (
                        <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-mono font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                          <Award className="w-3 h-3" /> Top Rated
                        </div>
                      )}

                      <button
                        onClick={() => removeFromComparison(movie.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-neutral-400 hover:text-white transition cursor-pointer"
                        title="Remove movie"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Poster and Title */}
                      <div className="space-y-3">
                        <div className="aspect-[2/3] max-w-[170px] mx-auto rounded-xl overflow-hidden shadow-lg border border-white/10 bg-neutral-900">
                          <img
                            src={movie.medium_cover_image || movie.large_cover_image || CINEVAULT_POSTER_FALLBACK}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        </div>

                        <div className="text-center space-y-1">
                          <h3
                            onClick={() => onSelectMovie && onSelectMovie(movie)}
                            className="text-base font-bold text-white hover:text-rose-400 transition cursor-pointer line-clamp-1"
                            title={movie.title}
                          >
                            {movie.title}
                          </h3>
                          <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
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
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <span className="text-xs text-neutral-400 font-medium">IMDb Rating</span>
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-sm font-black text-white">{movie.rating.toFixed(1)}</span>
                            <span className="text-[10px] text-neutral-500">/10</span>
                          </div>
                        </div>

                        {/* Genres */}
                        <div className="flex flex-wrap gap-1 justify-center">
                          {movie.genres?.slice(0, 3).map((g) => (
                            <span
                              key={g}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300"
                            >
                              {g}
                            </span>
                          ))}
                        </div>

                        {/* Billing Cast & Director Section */}
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2 text-left">
                          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                            <span>Key Cast & Billing</span>
                            <User className="w-3 h-3 text-neutral-500" />
                          </div>
                          {movie.cast && movie.cast.length > 0 ? (
                            <div className="space-y-1">
                              {movie.cast.slice(0, 3).map((c, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => onOpenFilmography && onOpenFilmography(c.name, 'actor')}
                                  className="w-full flex items-center justify-between text-left group cursor-pointer hover:bg-white/5 px-1 py-0.5 rounded transition"
                                  title={`Explore filmography for ${c.name}`}
                                >
                                  <span className="text-xs font-semibold text-neutral-200 group-hover:text-rose-400 truncate">
                                    {c.name}
                                  </span>
                                  <span className="text-[10px] text-neutral-500 truncate max-w-[100px]">
                                    {c.character_name || 'Lead Cast'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-neutral-500 italic">Featured ensemble billing</p>
                          )}
                        </div>

                        {/* Direct Format Matrix (File Size vs Audio Codec) */}
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3 text-rose-400" />
                              <span>Format Matrix (Size vs Codec)</span>
                            </span>
                            <Volume2 className="w-3 h-3 text-emerald-400" />
                          </div>

                          {torrents.length > 0 ? (
                            <div className="space-y-1.5">
                              {torrents.slice(0, 3).map((t, idx) => {
                                const is265 = t.video_codec?.includes('x265') || t.quality?.includes('x265');
                                const isSurround = t.audio_channels === '5.1' || t.audio_channels === '7.1';
                                return (
                                  <div
                                    key={idx}
                                    className="p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-white px-1.5 py-0.5 rounded bg-white/10 text-[10px]">
                                          {t.quality}
                                        </span>
                                        <span className="font-mono text-neutral-300 text-[11px]">{t.size}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {is265 && (
                                          <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-300">
                                            x265 HEVC
                                          </span>
                                        )}
                                        <span
                                          className={`text-[9px] font-mono px-1 rounded ${
                                            isSurround
                                              ? 'bg-amber-500/20 text-amber-300'
                                              : 'bg-neutral-800 text-neutral-400'
                                          }`}
                                        >
                                          {t.audio_channels || '2.0'} CH
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-0.5">
                                      <TorrentSwarmHealthBadge seeds={t.seeds} peers={t.peers} />
                                      <div className="flex items-center gap-1">
                                        <a
                                          href={t.url}
                                          download
                                          className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 transition"
                                          title={`Download ${t.quality} torrent`}
                                        >
                                          <Download className="w-2.5 h-2.5" />
                                          <span>Torrent</span>
                                        </a>
                                        <a
                                          href={buildMagnetLink(t.hash, movie.title)}
                                          className="p-1 rounded bg-white/10 hover:bg-white/20 text-neutral-200 text-[10px] font-bold flex items-center gap-1 transition"
                                          title="Magnet link"
                                        >
                                          <Magnet className="w-2.5 h-2.5 text-rose-400" />
                                          <span>Magnet</span>
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-500 text-center py-2">No torrent streams listed</p>
                          )}
                        </div>
                      </div>

                      {/* Detail View Shortcut */}
                      <div className="pt-3 mt-3 border-t border-white/10">
                        <button
                          onClick={() => {
                            if (onSelectMovie) onSelectMovie(movie);
                            setIsOpen(false);
                          }}
                          className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 text-xs font-bold transition cursor-pointer"
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
                <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/30 to-amber-950/20 border border-rose-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <Zap className="w-4 h-4" />
                    <span>CineVault Recommendation</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Based on ratings and technical specs,{' '}
                    <strong className="text-white">
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
