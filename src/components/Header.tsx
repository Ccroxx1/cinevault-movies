import React, { useState, useEffect, useRef } from 'react';
import { Film, Search, Bookmark, HelpCircle, Flame, Star, Sparkles, X, Clapperboard, MonitorPlay } from 'lucide-react';
import { Movie } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  currentNav: string;
  onNavSelect: (nav: string) => void;
  watchlistCount: number;
  onOpenGuide: () => void;
  onSelectMovie: (movie: Movie) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  currentNav,
  onNavSelect,
  watchlistCount,
  onOpenGuide,
  onSelectMovie
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [quickResults, setQuickResults] = useState<Movie[]>([]);
  const [isSearchingQuick, setIsSearchingQuick] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch instant quick suggestions while typing
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setQuickResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingQuick(true);
      try {
        const res = await fetch(`/api/movies/list?query_term=${encodeURIComponent(searchQuery.trim())}&limit=5`);
        if (res.ok) {
          const json = await res.json();
          setQuickResults(json?.data?.movies || []);
        }
      } catch {
        setQuickResults([]);
      } finally {
        setIsSearchingQuick(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close quick suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchFocused(false);
    onSearchSubmit(searchQuery);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Brand Logo */}
          <div
            onClick={() => onNavSelect('browse')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-lg bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-900/30 group-hover:scale-105 transition-transform">
              <Film className="w-5 h-5 text-white font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-black text-xl tracking-tight text-white group-hover:text-rose-500 transition-colors">
                  CineVault
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded">
                  By Sasuu
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Curated Cinema & HD Downloads
              </p>
            </div>
          </div>

          {/* Search Bar with Quick Dropdown */}
          <div className="relative flex-1 max-w-lg mx-2">
            <form onSubmit={handleFormSubmit} className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search movies, actors, directors, IMDb code..."
                  className="w-full pl-10 pr-16 py-2 sm:py-2.5 text-sm bg-[#0f0f0f] hover:bg-[#141414] focus:bg-[#141414] border border-white/10 focus:border-rose-500/80 rounded-xl text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                />
                
                <div className="absolute right-2.5 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        onSearchChange('');
                        searchInputRef.current?.focus();
                      }}
                      className="p-1 text-neutral-400 hover:text-neutral-200 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-800 border border-white/10 rounded">
                    /
                  </kbd>
                </div>
              </div>
            </form>

            {/* Quick Live Search Results Dropdown */}
            {isSearchFocused && searchQuery.trim().length >= 2 && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl shadow-black overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="p-2.5 border-b border-white/10 text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
                  <span>Quick Results</span>
                  {isSearchingQuick && <span className="text-rose-500 animate-pulse">Searching...</span>}
                </div>

                {quickResults.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {quickResults.map((movie) => (
                      <div
                        key={movie.id}
                        onClick={() => {
                          onSelectMovie(movie);
                          setIsSearchFocused(false);
                        }}
                        className="flex items-center gap-3 p-2.5 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <img
                          src={movie.small_cover_image || movie.medium_cover_image}
                          alt={movie.title}
                          className="w-10 h-14 object-cover rounded bg-neutral-900 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-neutral-100 truncate hover:text-rose-500">
                            {movie.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                            <span>{movie.year}</span>
                            <span>•</span>
                            <div className="flex items-center gap-0.5 text-amber-400">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="font-semibold">{movie.rating}</span>
                            </div>
                            <span>•</span>
                            <span className="truncate">{movie.genres?.slice(0, 2).join(', ')}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] font-mono text-neutral-300 bg-neutral-800 px-1.5 py-0.5 rounded border border-white/10">
                            {movie.torrents?.[0]?.quality || 'HD'}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div
                      onClick={() => {
                        onSearchSubmit(searchQuery);
                        setIsSearchFocused(false);
                      }}
                      className="p-2.5 text-center text-xs text-rose-400 font-semibold hover:bg-rose-500/10 cursor-pointer transition-colors"
                    >
                      View all results for "{searchQuery}" →
                    </div>
                  </div>
                ) : (
                  !isSearchingQuick && (
                    <div className="p-4 text-center text-xs text-neutral-400">
                      No movies found matching "{searchQuery}". Press Enter to perform a full search.
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onNavSelect('browse')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentNav === 'browse'
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clapperboard className="w-4 h-4" />
              <span className="hidden md:inline">Browse</span>
            </button>

            <button
              onClick={() => onNavSelect('trending')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentNav === 'trending'
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-4 h-4 text-rose-500" />
              <span className="hidden md:inline">Trending</span>
            </button>

            <button
              onClick={() => onNavSelect('4k')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentNav === '4k'
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span className="hidden md:inline">4K UHD</span>
            </button>

            <button
              onClick={() => onNavSelect('top')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentNav === 'top'
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Star className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Top Rated</span>
            </button>

            {/* Watchlist Button with Badge */}
            <button
              onClick={() => onNavSelect('watchlist')}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentNav === 'watchlist'
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="My Watchlist"
            >
              <Bookmark className="w-4 h-4" />
              <span className="hidden lg:inline">Watchlist</span>
              {watchlistCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[11px] font-mono font-bold bg-rose-600 text-white rounded-full">
                  {watchlistCount}
                </span>
              )}
            </button>

            {/* Download / Magnet Guide Modal Trigger */}
            <button
              onClick={onOpenGuide}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              title="How to download & use magnet links"
              aria-label="Download Guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </nav>

        </div>
      </div>
    </header>
  );
};
