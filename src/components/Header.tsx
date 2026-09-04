import React, { useState, useEffect, useRef } from 'react';
import { Dices } from 'lucide-react';
import { Movie } from '../types';
import { GENRES } from '../services/movieApi';
import { CineVaultLogo } from './CineVaultLogo';
import { BookmarkIcon, PlayIcon } from './ActionIcons';
import { ColorModeSelector } from './ColorModeSelector';
import { PWAInstallButton } from './PWAInstallButton';
import { CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  currentNav: string;
  onNavSelect: (nav: string) => void;
  watchlistCount: number;
  onOpenGuide: () => void;
  onSelectMovie: (movie: Movie) => void;
  onSelectGenre?: (genre: string) => void;
  onOpenPolicy?: (tab: 'privacy' | 'terms' | 'about' | 'contact' | 'dmca') => void;
  onOpenSpinner?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  currentNav,
  onNavSelect,
  watchlistCount,
  onOpenGuide,
  onSelectMovie,
  onSelectGenre,
  onOpenPolicy,
  onOpenSpinner
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [quickResults, setQuickResults] = useState<Movie[]>([]);
  const [isSearchingQuick, setIsSearchingQuick] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const genreMenuRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setIsMobileMenuOpen(false);
        setIsGenreDropdownOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when mobile menu drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

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

  // Click outside to close dropdowns
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
      if (
        genreMenuRef.current &&
        !genreMenuRef.current.contains(e.target as Node)
      ) {
        setIsGenreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchFocused(false);
    setIsMobileMenuOpen(false);
    onSearchSubmit(searchQuery);
  };

  const handleGenreClick = (genre: string) => {
    setIsGenreDropdownOpen(false);
    setIsMobileMenuOpen(false);
    if (onSelectGenre) {
      onSelectGenre(genre);
    }
  };

  const popularGenres = ['Action', 'Sci-Fi', 'Drama', 'Comedy', 'Horror', 'Animation', 'Thriller', 'Romance'];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-20 gap-2 sm:gap-4">
            
            {/* Left: Mobile Menu Button + Brand Logo */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-1 text-neutral-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer lg:hidden"
                aria-label="Open Navigation Menu"
              >
                <div className="w-6 h-0.5 bg-current mb-1"></div>
                <div className="w-6 h-0.5 bg-current mb-1"></div>
                <div className="w-6 h-0.5 bg-current"></div>
              </button>

              <div
                onClick={() => {
                  onNavSelect('browse');
                  setIsMobileMenuOpen(false);
                }}
                className="cursor-pointer group shrink-0"
                role="button"
                aria-label="CineVault Home"
              >
                <CineVaultLogo variant="header" size="md" />
              </div>
            </div>

            {/* Middle: Search Bar with Live Quick Dropdown */}
            <div className="relative flex-1 max-w-xs sm:max-w-md lg:max-w-lg mx-1 sm:mx-2">
              <form onSubmit={handleFormSubmit} className="relative" role="search">
                <div className="relative flex items-center">
                  <label htmlFor="movie-search-input" className="sr-only">Search movies</label>
                  <input
                    id="movie-search-input"
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    placeholder="Search titles, actors, directors..."
                    className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-1.5 sm:py-2.5 text-xs sm:text-sm bg-[#0f0f0f] hover:bg-[#141414] focus:bg-[#141414] border border-white/10 focus:border-rose-500/80 rounded-xl text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                  />
                  
                  {searchQuery && (
                    <div className="absolute right-2 sm:right-2.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          onSearchChange('');
                          searchInputRef.current?.focus();
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-200 rounded cursor-pointer"
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </div>
                  )}
                </div>
              </form>

              {/* Quick Live Search Results Dropdown */}
              {isSearchFocused && searchQuery.trim().length >= 2 && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#0c0c0c] border border-white/15 rounded-2xl shadow-2xl shadow-black overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="p-2.5 bg-neutral-900/80 border-b border-white/10 text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
                    <span>Quick Search Results</span>
                    {isSearchingQuick && <span className="text-rose-500 animate-pulse">Searching...</span>}
                  </div>

                  {quickResults.length > 0 ? (
                    <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                      {quickResults.map((movie) => (
                        <button
                          key={movie.id}
                          onClick={() => {
                            onSelectMovie(movie);
                            setIsSearchFocused(false);
                          }}
                          className="w-full flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 hover:bg-white/5 cursor-pointer transition-colors text-left"
                        >
                          <img
                            src={
                              [movie.small_cover_image, movie.medium_cover_image, movie.large_cover_image]
                                .find((url) => typeof url === 'string' && url.trim().length > 0) || CINEVAULT_POSTER_FALLBACK
                            }
                            alt=""
                            loading="lazy"
                            width="40"
                            height="56"
                            className="w-8 h-11 sm:w-10 sm:h-14 object-cover rounded bg-neutral-900 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-neutral-100 truncate group-hover:text-rose-500">
                              {movie.title}
                            </h4>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                              <span>{movie.year}</span>
                              <span>•</span>
                              <div className="flex items-center gap-0.5 text-amber-400 font-semibold">
                                {movie.rating || '7.5'}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          onSearchSubmit(searchQuery);
                          setIsSearchFocused(false);
                        }}
                        className="w-full p-3 text-center text-xs text-rose-400 font-bold hover:bg-rose-500/10 cursor-pointer transition-colors"
                      >
                        View all full catalog results for "{searchQuery}" 
                      </button>
                    </div>
                  ) : (
                    !isSearchingQuick && (
                      <div className="p-5 text-center text-xs text-neutral-400">
                        No movies found matching "{searchQuery}".
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Desktop Navigation Links */}
            <nav aria-label="Desktop Navigation" className="hidden lg:flex items-center gap-1.5">
              <button
                onClick={() => onNavSelect('browse')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === 'browse'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(229,9,20,0.25)]'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Browse</span>
              </button>

              <button
                onClick={() => onNavSelect('trending')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === 'trending'
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Trending</span>
              </button>

              <button
                onClick={() => onNavSelect('4k')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === '4k'
                    ? 'bg-rose-600 text-white shadow-lg'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>4K UHD</span>
              </button>

              <button
                onClick={() => onNavSelect('top')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === 'top'
                    ? 'bg-rose-600 text-white shadow-lg'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Top Rated</span>
              </button>

              {/* Genres Mega-Dropdown */}
              <div className="relative" ref={genreMenuRef}>
                <button
                  onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
                  aria-expanded={isGenreDropdownOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isGenreDropdownOpen
                      ? 'bg-white/10 text-white'
                      : 'text-neutral-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>Genres</span>
                </button>

                {isGenreDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 p-3 bg-[#0c0c0c] border border-white/15 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 pb-2 mb-1 border-b border-white/10 flex items-center justify-between">
                      <span>Explore by Genre</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto pr-1">
                      {GENRES.map((g) => (
                        <button
                          key={g}
                          onClick={() => handleGenreClick(g)}
                          className="px-2.5 py-1.5 text-left text-xs rounded-lg text-neutral-300 hover:text-white hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer"
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => onNavSelect('watchlist')}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === 'watchlist'
                    ? 'bg-rose-600 text-white shadow-lg'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
                title="My Saved Movies"
              >
                <BookmarkIcon size={15} />
                <span>Watchlist</span>
                {watchlistCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-mono font-bold bg-white text-rose-600 rounded-full">
                    {watchlistCount}
                  </span>
                )}
              </button>

              {onOpenSpinner && (
                <button
                  onClick={onOpenSpinner}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer shadow-sm"
                  title="Surprise Me - Movie Night Roulette"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Roulette</span>
                </button>
              )}

              <PWAInstallButton variant="nav" />

              <button
                onClick={onOpenGuide}
                className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors shrink-0 cursor-pointer text-xs font-bold"
                aria-label="Download Guide"
              >
                Guide
              </button>

              <div className="h-4 w-px bg-white/10 mx-1" aria-hidden="true" />

              <ColorModeSelector variant="dropdown" />
            </nav>

            {/* Mobile Actions */}
            <div className="flex items-center gap-1.5 lg:hidden">
              {onOpenSpinner && (
                <button
                  onClick={onOpenSpinner}
                  className="p-2 text-amber-400 hover:text-amber-300 rounded-xl cursor-pointer"
                  aria-label="Movie Night Roulette"
                  title="Movie Night Roulette"
                >
                  <Dices className="w-4 h-4" />
                </button>
              )}

              <ColorModeSelector variant="dropdown" />

              <button
                onClick={() => onNavSelect('watchlist')}
                className="p-2 text-neutral-300 hover:text-white rounded-xl relative cursor-pointer"
                aria-label={`Watchlist (${watchlistCount} items)`}
              >
                <BookmarkIcon size={18} />
                {watchlistCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600"></span>
                )}
              </button>

              <button
                onClick={onOpenGuide}
                className="p-2 text-neutral-400 hover:text-white rounded-xl cursor-pointer"
                aria-label="Download Guide"
              >
                <PlayIcon size={18} className="rotate-90" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <nav
            ref={drawerRef}
            className="fixed inset-y-0 left-0 max-w-xs w-full bg-[#0d0d0d] border-r border-white/10 shadow-2xl p-5 flex flex-col justify-between overflow-y-auto z-50 animate-in slide-in-from-left duration-200"
            aria-label="Mobile Navigation Menu"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <CineVaultLogo variant="header" size="sm" />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                  aria-label="Close menu"
                >
                  <span aria-hidden="true" className="text-xl">&times;</span>
                </button>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => { onNavSelect('browse'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${currentNav === 'browse' ? 'bg-rose-600 text-white' : 'text-neutral-300 hover:bg-white/5'}`}
                >
                  Browse Movies
                </button>
                <button
                  onClick={() => { onNavSelect('trending'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${currentNav === 'trending' ? 'bg-rose-600 text-white' : 'text-neutral-300 hover:bg-white/5'}`}
                >
                  Trending Now
                </button>
                <button
                  onClick={() => { onNavSelect('4k'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${currentNav === '4k' ? 'bg-rose-600 text-white' : 'text-neutral-300 hover:bg-white/5'}`}
                >
                  4K Ultra HD
                </button>
                <button
                  onClick={() => { onNavSelect('top'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${currentNav === 'top' ? 'bg-rose-600 text-white' : 'text-neutral-300 hover:bg-white/5'}`}
                >
                  Top Rated
                </button>
                <button
                  onClick={() => { onNavSelect('watchlist'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${currentNav === 'watchlist' ? 'bg-rose-600 text-white' : 'text-neutral-300 hover:bg-white/5'}`}
                >
                  My Watchlist ({watchlistCount})
                </button>
                {onOpenSpinner && (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenSpinner(); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Dices className="w-4 h-4 text-amber-400" />
                    <span>Movie Night Roulette</span>
                  </button>
                )}
              </div>

              <div className="pt-2">
                <PWAInstallButton variant="banner" />
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-3">Genres</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {popularGenres.map((g) => (
                    <button key={g} onClick={() => handleGenreClick(g)} className="px-3 py-2 text-left rounded-xl bg-neutral-900 border border-white/5 text-xs text-neutral-200 hover:text-white transition-colors cursor-pointer">
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <ColorModeSelector variant="inline" />
              </div>

              <div className="space-y-1 pt-2 border-t border-white/5">
                <button onClick={() => { setIsMobileMenuOpen(false); onOpenGuide(); }} className="w-full text-left px-3 py-2 rounded-xl text-xs text-neutral-400 hover:text-white cursor-pointer">
                  Download Guide
                </button>
                {onOpenPolicy && (
                  <>
                    <button onClick={() => { setIsMobileMenuOpen(false); onOpenPolicy('privacy'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs text-neutral-400 hover:text-white cursor-pointer">
                      Privacy & Cookies
                    </button>
                    <button onClick={() => { setIsMobileMenuOpen(false); onOpenPolicy('dmca'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs text-neutral-400 hover:text-white cursor-pointer">
                      Legal Disclaimer
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-[10px] text-neutral-500">
              <p className="font-semibold text-neutral-400">CineVault Cinema Portal</p>
              <p>© 2026 Sasuu. All media from public APIs.</p>
            </div>
          </nav>
        </div>
      )}
    </>
  );
};
