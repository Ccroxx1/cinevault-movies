import React, { useState, useRef } from 'react';
import { Bookmark, Trash2, Download, Upload, ArrowUpDown, Film, Star, Share2, Check, FileJson } from 'lucide-react';
import { Movie } from '../types';
import { MovieCard } from './MovieCard';

interface WatchlistViewProps {
  watchlist: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  onToggleWatchlist: (movie: Movie) => void;
  onClearWatchlist: () => void;
  onImportWatchlist: (importedMovies: Movie[]) => void;
  onExploreCatalog?: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlist,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  onToggleWatchlist,
  onClearWatchlist,
  onImportWatchlist,
  onExploreCatalog
}) => {
  const [sortBy, setSortBy] = useState<'added' | 'rating' | 'year' | 'title'>('added');
  const [copiedExport, setCopiedExport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Export to JSON
  const handleExportJson = () => {
    const dataStr = JSON.stringify(watchlist, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cinevault_watchlist_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  // Handle Import JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((m: any) => m && m.id && m.title);
          if (valid.length > 0) {
            onImportWatchlist(valid);
          }
        }
      } catch (err) {
        alert('Invalid JSON file format. Please upload a valid CineVault watchlist backup.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // Sort movies according to user choice
  const sortedMovies = [...watchlist].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'year') return (b.year || 0) - (a.year || 0);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0; // Default added order
  });

  return (
    <div className="space-y-6">
      
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0a0a0a] border border-white/10 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-600/10 border border-rose-500/20 text-rose-500 rounded-2xl">
            <Bookmark className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              My Watchlist & Library
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400">
              {watchlist.length} {watchlist.length === 1 ? 'film' : 'films'} saved for offline viewing and streaming
            </p>
          </div>
        </div>

        {/* Action Buttons: Export, Import, Clear */}
        <div className="flex flex-wrap items-center gap-2">
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Import Watchlist from JSON file"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>

          {watchlist.length > 0 && (
            <>
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Export Watchlist to JSON file"
              >
                {copiedExport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                <span>{copiedExport ? 'Downloaded' : 'Export JSON'}</span>
              </button>

              <button
                onClick={onClearWatchlist}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#141414] hover:bg-rose-950/40 text-neutral-400 hover:text-rose-300 border border-white/10 hover:border-rose-900/50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sorting bar when items exist */}
      {watchlist.length > 1 && (
        <div className="flex items-center justify-between gap-3 text-xs text-neutral-400 px-1">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-rose-500" />
            <span>Sort Watchlist:</span>
            <div className="flex items-center gap-1">
              {[
                { id: 'added', label: 'Recently Added' },
                { id: 'rating', label: 'Top Rated' },
                { id: 'year', label: 'Release Year' },
                { id: 'title', label: 'Alphabetical' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    sortBy === opt.id
                      ? 'bg-rose-600 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid or Empty State */}
      {watchlist.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {sortedMovies.map((movie) => (
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
              Explore films from the catalog and tap the bookmark icon on any movie card to add them here for quick access, subtitle lookup, and downloads.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onExploreCatalog && (
              <button
                onClick={onExploreCatalog}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Film className="w-4 h-4" />
                <span>Explore Catalog</span>
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-xl text-xs font-bold border border-white/10 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import Backup JSON</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
