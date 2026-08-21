import React, { useState, useEffect, useRef } from 'react';
import { 
  Film, Search, Bookmark, HelpCircle, Flame, Star, Sparkles, X, 
  Clapperboard, Menu, Grid, Layers, Shield, Atom, Heart, Laugh, 
  Skull, Tv, Compass, Info, FileText, ChevronRight, SlidersHorizontal, Eye
} from 'lucide-react';
import { Movie, FilterParams } from '../types';
import { GENRES } from '../services/movieApi';
import { CineVaultLogo, CineVaultBrowseIcon } from './CineVaultLogo';

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
  onOpenPolicy
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

  const popularGenres = [
    { name: 'Action', icon: Shield, color: 'text-blue-400 bg-blue-500/10' },
    { name: 'Sci-Fi', icon: Atom, color: 'text-cyan-400 bg-cyan-500/10' },
    { name: 'Drama', icon: Heart, color: 'text-rose-400 bg-rose-500/10' },
    { name: 'Comedy', icon: Laugh, color: 'text-lime-400 bg-lime-500/10' },
    { name: 'Horror', icon: Skull, color: 'text-purple-400 bg-purple-500/10' },
    { name: 'Animation', icon: Sparkles, color: 'text-amber-400 bg-amber-500/10' }
  ];

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
                <Menu className="w-5 h-5" />
              </button>

              <div
                onClick={() => {
                  onNavSelect('browse');
                  setIsMobileMenuOpen(false);
                }}
                className="cursor-pointer group shrink-0"
              >
                <CineVaultLogo variant="header" size="md" />
              </div>
            </div>

            {/* Middle: Search Bar with Live Quick Dropdown */}
            <div className="relative flex-1 max-w-xs sm:max-w-md lg:max-w-lg mx-1 sm:mx-2">
              <form onSubmit={handleFormSubmit} className="relative">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 sm:left-3.5 w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    placeholder="Search movies by title, actor, director..."
                    className="w-full pl-8 sm:pl-10 pr-8 sm:pr-16 py-1.5 sm:py-2.5 text-xs sm:text-sm bg-[#0f0f0f] hover:bg-[#141414] focus:bg-[#141414] border border-white/10 focus:border-rose-500/80 rounded-xl text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                  />
                  
                  <div className="absolute right-2 sm:right-2.5 flex items-center gap-1">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          onSearchChange('');
                          searchInputRef.current?.focus();
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-200 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-800 border border-white/10 rounded">
                      /
                    </kbd>
                  </div>
                </div>
              </form>

              {/* Quick Live Search Results Dropdown */}
              {isSearchFocused && searchQuery.trim().length >= 2 && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#0c0c0c] border border-white/15 rounded-2xl shadow-2xl shadow-black overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="p-2.5 bg-neutral-900/80 border-b border-white/10 text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
                    <span>Quick Cinema Search</span>
                    {isSearchingQuick && <span className="text-rose-500 animate-pulse">Searching...</span>}
                  </div>

                  {quickResults.length > 0 ? (
                    <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                      {quickResults.map((movie) => (
                        <div
                          key={movie.id}
                          onClick={() => {
                            onSelectMovie(movie);
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <img
                            src={movie.small_cover_image || movie.medium_cover_image}
                            alt={movie.title}
                            referrerPolicy="no-referrer"
                            className="w-8 h-11 sm:w-10 sm:h-14 object-cover rounded bg-neutral-900 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-neutral-100 truncate hover:text-rose-500">
                              {movie.title}
                            </h4>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                              <span>{movie.year}</span>
                              <span>•</span>
                              <div className="flex items-center gap-0.5 text-amber-400">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span className="font-semibold">{movie.rating || '7.5'}</span>
                              </div>
                              {movie.genres?.[0] && (
                                <>
                                  <span>•</span>
                                  <span className="text-neutral-400">{movie.genres[0]}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[9px] sm:text-[10px] font-mono text-neutral-300 bg-neutral-800 px-1.5 py-0.5 rounded border border-white/10">
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
                        className="p-3 text-center text-xs text-rose-400 font-bold hover:bg-rose-500/10 cursor-pointer transition-colors"
                      >
                        View all full catalog results for "{searchQuery}" →
                      </div>
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
            <nav className="hidden lg:flex items-center gap-1.5">
              <button
                onClick={() => onNavSelect('browse')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === 'browse'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(229,9,20,0.25)]'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <CineVaultBrowseIcon size={16} />
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
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Trending</span>
              </button>

              <button
                onClick={() => onNavSelect('4k')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === '4k'
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>4K UHD</span>
              </button>

              <button
                onClick={() => onNavSelect('top')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === 'top'
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span>Top Rated</span>
              </button>

              {/* Genres Mega-Dropdown Menu */}
              <div className="relative" ref={genreMenuRef}>
                <button
                  onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isGenreDropdownOpen
                      ? 'bg-white/10 text-white'
                      : 'text-neutral-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Genres</span>
                </button>

                {isGenreDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 p-3 bg-[#0c0c0c] border border-white/15 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 pb-2 mb-1 border-b border-white/10 flex items-center justify-between">
                      <span>Explore by Genre</span>
                      <span className="text-neutral-600">20+ Genres</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto pr-1">
                      {GENRES.map((g) => (
                        <button
                          key={g}
                          onClick={() => handleGenreClick(g)}
                          className="px-2.5 py-1.5 text-left text-xs rounded-lg text-neutral-300 hover:text-white hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer flex items-center justify-between"
                        >
                          <span>{g}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Watchlist Button */}
              <button
                onClick={() => onNavSelect('watchlist')}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === 'watchlist'
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
                title="My Saved Movies"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Watchlist</span>
                {watchlistCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-mono font-bold bg-rose-600 text-white rounded-full">
                    {watchlistCount}
                  </span>
                )}
              </button>

              {/* Guide Trigger */}
              <button
                onClick={onOpenGuide}
                className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors shrink-0 cursor-pointer"
                title="Torrent & Download Guide"
                aria-label="Download Guide"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </nav>

            {/* Right: Mobile Quick Actions (Watchlist + Guide + Menu Toggle) */}
            <div className="flex items-center gap-1 lg:hidden">
              <button
                onClick={() => onNavSelect('watchlist')}
                className="p-2 text-neutral-300 hover:text-white rounded-xl relative cursor-pointer"
                aria-label="Watchlist"
              >
                <Bookmark className="w-4 h-4" />
                {watchlistCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600"></span>
                )}
              </button>

              <button
                onClick={onOpenGuide}
                className="p-2 text-neutral-400 hover:text-white rounded-xl cursor-pointer"
                aria-label="Download Guide"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Slide-in Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            ref={drawerRef}
            className="fixed inset-y-0 left-0 max-w-xs w-full bg-[#0d0d0d] border-r border-white/10 shadow-2xl p-5 flex flex-col justify-between overflow-y-auto z-50 animate-in slide-in-from-left duration-200"
          >
            <div className="space-y-6">
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <CineVaultLogo variant="header" size="sm" />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main Nav Links */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-3 py-1">
                  Main Navigation
                </div>

                <button
                  onClick={() => {
                    onNavSelect('browse');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                    currentNav === 'browse'
                      ? 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-950/50'
                      : 'text-neutral-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CineVaultBrowseIcon size={16} />
                    <span>Browse All Cinema</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button
                  onClick={() => {
                    onNavSelect('trending');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                    currentNav === 'trending'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'text-neutral-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span>Trending Now</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button
                  onClick={() => {
                    onNavSelect('4k');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                    currentNav === '4k'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'text-neutral-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    <span>4K Ultra HD</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button
                  onClick={() => {
                    onNavSelect('top');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                    currentNav === 'top'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'text-neutral-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span>Top Rated (IMDb 8.0+)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button
                  onClick={() => {
                    onNavSelect('watchlist');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                    currentNav === 'watchlist'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'text-neutral-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bookmark className="w-4 h-4" />
                    <span>My Saved Watchlist</span>
                  </div>
                  {watchlistCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-300 rounded-full">
                      {watchlistCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Popular Genre Quick Filters */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-3">
                  Popular Film Genres
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {popularGenres.map((g) => {
                    const Icon = g.icon;
                    return (
                      <button
                        key={g.name}
                        onClick={() => handleGenreClick(g.name)}
                        className="flex items-center gap-2 p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-white/5 text-xs text-neutral-200 transition-colors cursor-pointer"
                      >
                        <div className={`p-1 rounded-lg ${g.color}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="font-semibold truncate">{g.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Help & Information */}
              <div className="space-y-1 pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenGuide();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-neutral-400" />
                  <span>Download Guide & Trackers</span>
                </button>

                {onOpenPolicy && (
                  <>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenPolicy('privacy');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-neutral-400" />
                      <span>Privacy & Cookies</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenPolicy('dmca');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-neutral-400" />
                      <span>DMCA & Legal Disclaimer</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-white/10 text-[10px] text-neutral-500 space-y-1">
              <p className="font-semibold text-neutral-400">CineVault Cinema Portal</p>
              <p>© 2026 Sasuu. All media indexed from public APIs.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
