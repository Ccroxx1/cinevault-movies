import React from 'react';
import { Bookmark, Trash2, Film, Star, Download, Play, Eye } from 'lucide-react';
import { Movie } from '../types';
import { MovieCard } from './MovieCard';

interface WatchlistViewProps {
  watchlist: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  onToggleWatchlist: (movie: Movie) => void;
  onClearWatchlist: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlist,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  onToggleWatchlist,
  onClearWatchlist
}) => {
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0a0a0a] border border-white/10 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-600/10 border border-rose-500/20 text-rose-500 rounded-xl">
            <Bookmark className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-display text-white">
              My Watchlist & Library
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400">
              {watchlist.length} {watchlist.length === 1 ? 'film' : 'films'} saved for offline viewing and streaming
            </p>
          </div>
        </div>

        {watchlist.length > 0 && (
          <button
            onClick={onClearWatchlist}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#050505] hover:bg-rose-950/40 text-neutral-400 hover:text-rose-300 border border-white/10 hover:border-rose-900/50 rounded-full text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Watchlist</span>
          </button>
        )}
      </div>

      {/* Grid or Empty State */}
      {watchlist.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {watchlist.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onSelect={onSelectMovie}
              onPlayTrailer={onPlayTrailer}
              onCopyMagnet={onCopyMagnet}
              isWatchlisted={true}
              onToggleWatchlist={onToggleWatchlist}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-[#0a0a0a]/50 border border-dashed border-white/10 rounded-3xl p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#050505] border border-white/10 flex items-center justify-center text-neutral-600">
            <Bookmark className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-lg font-bold text-neutral-200">Your watchlist is empty</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Explore films from the catalog and tap the bookmark icon on any movie card to add them here for quick access and downloads.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
