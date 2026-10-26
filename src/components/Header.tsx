import React, { useState, useEffect, useRef } from 'react';
import { Dices, Search, HelpCircle, X, Sparkles, ChevronDown, Palette, Tv, Star, Command } from 'lucide-react';
import { Movie, TvShowInfo } from '../types';
import { GENRES } from '../services/movieApi';
import { CineVaultLogo } from './CineVaultLogo';
import { BookmarkIcon, PlayIcon } from './ActionIcons';
import { ColorModeSelector } from './ColorModeSelector';
import { PWAInstallButton } from './PWAInstallButton';
import { VisitorCountBadge } from './VisitorCountBadge';
import { CINEVAULT_POSTER_FALLBACK, getPrimaryMoviePoster } from '../utils/imageFallback';
import { useTheme, COLOR_MODES } from '../context/ThemeContext';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  currentNav: string;
  onNavSelect: (nav: string) => void;
  watchlistCount: number;
  onOpenGuide: () => void;
  onSelectMovie: (movie: Movie) => void;
  onSelectTvShow?: (show: TvShowInfo) => void;
  onSelectGenre?: (genre: string) => void;
  onOpenPolicy?: (tab: 'privacy' | 'terms' | 'about' | 'contact' | 'dmca') => void;
  onOpenSpinner?: () => void;
  onRequestSearch?: () => void;
  onOpenCineBot?: () => void;
  onOpenShortcuts?: () => void;
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
  onSelectTvShow,
  onSelectGenre,
  onOpenPolicy,
  onOpenSpinner,
  onRequestSearch,
  onOpenCineBot,
  onOpenShortcuts
}) => {
  const { colorMode, setColorMode } = useTheme();
  const isWhite = colorMode === 'white';
  const isBlueBlack = colorMode === 'blue-black';

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [quickResults, setQuickResults] = useState<Movie[]>([]);
  const [quickTvResults, setQuickTvResults] = useState<TvShowInfo[]>([]);
  const [isSearchingQuick, setIsSearchingQuick] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const genreMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    let lastScrolled = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const next = window.scrollY > 20;
          if (next !== lastScrolled) {
            lastScrolled = next;
            setIsScrolled(next);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global keyboard shortcuts: Space or '/' to take user to search, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setIsMobileMenuOpen(false);
        setIsGenreDropdownOpen(false);
        setIsMoreMenuOpen(false);
        searchInputRef.current?.blur();
        return;
      }

      // Check if user is typing inside an editable form element
      const activeEl = document.activeElement as HTMLElement | null;
      const targetEl = e.target as HTMLElement | null;
      const isEditable = (el: HTMLElement | null): boolean => {
        if (!el) return false;
        const tag = el.tagName ? el.tagName.toUpperCase() : '';
        return (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          Boolean(el.isContentEditable) ||
          el.getAttribute('role') === 'textbox' ||
          el.getAttribute('role') === 'searchbox' ||
          el.getAttribute('role') === 'combobox'
        );
      };

      if (isEditable(activeEl) || isEditable(targetEl)) {
        return; // Allow typing spaces normally without interruption
      }

      // If a video player or trailer modal is active, do not hijack spacebar (used for media controls)
      if (
        document.querySelector('[data-trailer-modal]') ||
        activeEl?.tagName === 'VIDEO' ||
        activeEl?.tagName === 'IFRAME' ||
        targetEl?.tagName === 'VIDEO' ||
        targetEl?.tagName === 'IFRAME'
      ) {
        return;
      }

      // Ignore OS-level modifier key combos (e.g. Cmd+Space, Ctrl+Space, Alt+Space)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const isSlash = e.key === '/';
      const isSKey = e.key === 's' || e.key === 'S';

      if (isSlash || isSKey) {
        // Prevent default browser behavior
        e.preventDefault();

        // Switch to browse / main catalog view if on another route
        if (onRequestSearch) {
          onRequestSearch();
        } else if (currentNav !== 'browse') {
          onNavSelect('browse');
        }

        // Close open menus/drawers
        setIsMobileMenuOpen(false);
        setIsGenreDropdownOpen(false);
        setIsMoreMenuOpen(false);

        // Smoothly scroll to the top so search is prominent
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Focus search input, select any existing text to allow immediate typing
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
            setIsSearchFocused(true);
          }
        }, 20);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNav, onNavSelect, onRequestSearch]);

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
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setQuickResults([]);
      setQuickTvResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingQuick(true);
      try {
        // Parallel fetch movies and TV shows
        const [moviesPromise, tvPromise] = await Promise.allSettled([
          fetch(`/api/movies/list?query_term=${encodeURIComponent(trimmed)}&limit=5`).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/tv/shows?q=${encodeURIComponent(trimmed)}`).then((r) => r.ok ? r.json() : null).catch(() => null)
        ]);

        if (moviesPromise.status === 'fulfilled' && moviesPromise.value) {
          setQuickResults(moviesPromise.value?.data?.movies || []);
        } else {
          setQuickResults([]);
        }

        if (tvPromise.status === 'fulfilled' && tvPromise.value) {
          setQuickTvResults(tvPromise.value?.shows || []);
        } else {
          setQuickTvResults([]);
        }
      } catch {
        setQuickResults([]);
        setQuickTvResults([]);
      } finally {
        setIsSearchingQuick(false);
      }
    }, 250);

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
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setIsMoreMenuOpen(false);
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
      <header className={`sticky top-0 z-40 w-full transform-gpu backdrop-blur-md border-b transition-[background-color,border-color,box-shadow] duration-200 ${
        isScrolled
          ? isWhite
            ? 'bg-white/95 border-slate-200/90 shadow-md shadow-slate-900/5'
            : isBlueBlack
            ? 'bg-[#080e1e]/95 border-sky-400/20 shadow-lg shadow-black/60'
            : 'bg-[#0a0a0a]/95 border-white/15 shadow-lg shadow-black/70'
          : isWhite
          ? 'bg-white/90 border-slate-200/60 shadow-none'
          : isBlueBlack
          ? 'bg-[#080e1e]/85 border-sky-400/10 shadow-none'
          : 'bg-[#0a0a0a]/85 border-white/10 shadow-none'
      }`}>
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
                  <Search className="absolute left-2.5 sm:left-3.5 w-3.5 sm:w-4 h-3.5 sm:h-4 text-neutral-400 pointer-events-none" />
                  <label htmlFor="movie-search-input" className="sr-only">Search movies</label>
                  <input
                    id="movie-search-input"
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    placeholder={currentNav === 'series' ? 'Search TV series or IMDb ID...' : 'Search titles, actors, directors...'}
                    className="w-full pl-8 sm:pl-10 pr-14 sm:pr-16 py-1.5 sm:py-2.5 text-xs sm:text-sm bg-[#0f0f0f] hover:bg-[#141414] focus:bg-[#141414] border border-white/10 focus:border-rose-500/80 rounded-xl text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                  />
                  
                  {searchQuery ? (
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
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="absolute right-2 sm:right-2.5 hidden sm:flex items-center pointer-events-none select-none">
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-neutral-400 bg-white/5 border border-white/10 rounded shadow-xs" title="Press 'S' or '/' to search">
                        S
                      </kbd>
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

                  <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
                    {/* If TV series are found */}
                    {quickTvResults.length > 0 && (
                      <div className="p-1.5 bg-rose-950/20">
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                          <Tv className="w-3 h-3" />
                          <span>TV Series (EZTV)</span>
                        </div>
                        {quickTvResults.slice(0, 4).map((tvShow) => (
                          <button
                            key={tvShow.imdb_code || tvShow.id}
                            onClick={() => {
                              setIsSearchFocused(false);
                              if (onSelectTvShow) {
                                onSelectTvShow(tvShow);
                              } else {
                                onNavSelect('series');
                              }
                            }}
                            className="w-full flex items-center gap-2.5 p-2 hover:bg-white/10 rounded-xl cursor-pointer transition-colors text-left group"
                          >
                            <div className="w-8 h-11 sm:w-9 sm:h-12 bg-neutral-800 rounded overflow-hidden shrink-0 border border-white/10">
                              {tvShow.image ? (
                                <img
                                  src={tvShow.image}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-500">
                                  <Tv className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs sm:text-sm font-semibold text-neutral-100 truncate group-hover:text-rose-400">
                                  {tvShow.name}
                                </h4>
                                <span className="px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                                  TV
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                                {tvShow.year && <span>{tvShow.year}</span>}
                                {tvShow.rating && (
                                  <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                                    <Star className="w-3 h-3 fill-amber-400" />
                                    {tvShow.rating}
                                  </span>
                                )}
                                {tvShow.network && <span className="text-neutral-500">• {tvShow.network}</span>}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Movie Results */}
                    {quickResults.length > 0 && (
                      <div className="p-1.5">
                        {quickTvResults.length > 0 && (
                          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            Movies (YTS)
                          </div>
                        )}
                        {quickResults.map((movie) => (
                          <button
                            key={movie.id}
                            onClick={() => {
                              onSelectMovie(movie);
                              setIsSearchFocused(false);
                            }}
                            className="w-full flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 hover:bg-white/5 rounded-xl cursor-pointer transition-colors text-left group"
                          >
                            <img
                              src={getPrimaryMoviePoster(movie)}
                              alt=""
                              loading="lazy"
                              width="40"
                              height="56"
                              className="w-8 h-11 sm:w-10 sm:h-14 object-cover rounded bg-neutral-900 shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = CINEVAULT_POSTER_FALLBACK;
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
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  {movie.rating || '7.5'}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Bottom Submit Action */}
                    <button
                      onClick={() => {
                        onSearchSubmit(searchQuery);
                        setIsSearchFocused(false);
                      }}
                      className="w-full p-3 text-center text-xs text-rose-400 font-bold hover:bg-rose-500/10 cursor-pointer transition-colors"
                    >
                      {currentNav === 'series'
                        ? `Search EZTV index for "${searchQuery}"`
                        : `View all results for "${searchQuery}"`}
                    </button>

                    {/* No results message */}
                    {!isSearchingQuick && quickResults.length === 0 && quickTvResults.length === 0 && (
                      <div className="p-5 text-center text-xs text-neutral-400">
                        No movies or TV shows found matching "{searchQuery}".
                      </div>
                    )}
                  </div>
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

              <button
                onClick={() => onNavSelect('series')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === 'series'
                    ? 'bg-rose-600 text-white shadow-lg'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
                title="EZTV TV Series & Episode Releases"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>TV Series</span>
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

              {/* Movie Night Roulette - kept directly on navbar */}
              {onOpenSpinner && (
                <button
                  id="header-roulette-btn"
                  onClick={onOpenSpinner}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer shadow-sm"
                  title="Surprise Me - Movie Night Roulette (Hot key: R)"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Roulette</span>
                  <kbd className="hidden sm:inline-flex items-center justify-center px-1 text-[9px] font-mono text-amber-400/90 bg-amber-400/10 border border-amber-400/20 rounded font-bold">
                    R
                  </kbd>
                </button>
              )}

              {/* Dropdown Menu: CineBot AI, Install App, Guide, and Theme */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  id="header-more-menu-btn"
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  aria-expanded={isMoreMenuOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isMoreMenuOpen
                      ? isWhite
                        ? 'bg-slate-200 text-slate-900 border border-slate-300'
                        : 'bg-white/15 text-white border border-white/20'
                      : isWhite
                      ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-transparent'
                      : 'text-neutral-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                  title="More options & features"
                >
                  <span>More</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isMoreMenuOpen && (
                  <div
                    className={`absolute top-full right-0 mt-2 w-64 p-2 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border ${
                      isWhite
                        ? 'bg-white border-slate-200 text-slate-800 shadow-slate-900/15'
                        : isBlueBlack
                        ? 'bg-[#0b142c] border-sky-400/20 text-slate-200 shadow-sky-950/50'
                        : 'bg-[#0e0e12] border-white/15 text-neutral-200 shadow-black/80'
                    }`}
                  >
                    <div className="space-y-1">
                      {/* CineBot AI */}
                      {onOpenCineBot && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            onOpenCineBot();
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left transition-colors cursor-pointer group ${
                            isWhite
                              ? 'hover:bg-rose-50 text-slate-800 hover:text-rose-600'
                              : 'hover:bg-rose-500/15 text-neutral-200 hover:text-white'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold">CineBot AI</span>
                              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Gemini
                              </span>
                            </div>
                            <div className={`text-[10px] truncate ${isWhite ? 'text-slate-500' : 'text-neutral-400'}`}>
                              Film Concierge & Vibe Discovery
                            </div>
                          </div>
                        </button>
                      )}

                      {/* Install App */}
                      <PWAInstallButton
                        variant="menu"
                        onAfterClick={() => setIsMoreMenuOpen(false)}
                      />

                      {/* Download Guide */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          onOpenGuide();
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left transition-colors cursor-pointer group ${
                          isWhite
                            ? 'hover:bg-slate-100 text-slate-800 hover:text-slate-950'
                            : 'hover:bg-white/5 text-neutral-200 hover:text-white'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                          isWhite
                            ? 'bg-slate-100 border-slate-200 text-slate-600 group-hover:bg-slate-200'
                            : 'bg-white/5 border-white/10 text-neutral-400 group-hover:bg-white/10 group-hover:text-white'
                        }`}>
                          <HelpCircle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold">Download Guide</div>
                          <div className={`text-[10px] truncate ${isWhite ? 'text-slate-500' : 'text-neutral-400'}`}>
                            Torrents, player & tips
                          </div>
                        </div>
                      </button>

                      {/* Keyboard Shortcuts */}
                      {onOpenShortcuts && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            onOpenShortcuts();
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left transition-colors cursor-pointer group ${
                            isWhite
                              ? 'hover:bg-slate-100 text-slate-800 hover:text-slate-950'
                              : 'hover:bg-white/5 text-neutral-200 hover:text-white'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                            isWhite
                              ? 'bg-slate-100 border-slate-200 text-slate-600 group-hover:bg-slate-200'
                              : 'bg-white/5 border-white/10 text-neutral-400 group-hover:bg-white/10 group-hover:text-white'
                          }`}>
                            <Command className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div>
                              <div className="font-bold">Keyboard Shortcuts</div>
                              <div className={`text-[10px] truncate ${isWhite ? 'text-slate-500' : 'text-neutral-400'}`}>
                                Quick hotkeys & navigation
                              </div>
                            </div>
                            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/10 rounded border border-white/15">
                              ?
                            </kbd>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Theme / Color Mode Selector */}
                    <div className={`pt-2 mt-1.5 border-t ${isWhite ? 'border-slate-100' : 'border-white/10'}`}>
                      <div className="px-2.5 pb-1.5 flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          isWhite ? 'text-slate-500' : 'text-neutral-400'
                        }`}>
                          <Palette className="w-3 h-3 text-rose-500" />
                          <span>Theme</span>
                        </span>
                        <span className="text-[10px] font-mono text-rose-500 font-bold capitalize">
                          {colorMode}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 px-1">
                        {COLOR_MODES.map((mode) => {
                          const isActive = colorMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setColorMode(mode.id)}
                              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer select-none text-center ${
                                isActive
                                  ? 'border-rose-500 bg-rose-500/15 text-rose-500 font-bold shadow-xs'
                                  : isWhite
                                  ? 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700'
                                  : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-neutral-300'
                              }`}
                              title={mode.tagline}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <span className={`w-2.5 h-2.5 rounded-full ${mode.dotColor}`} />
                              </div>
                              <span className="text-[11px] leading-tight">{mode.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Mobile Actions */}
            <div className="flex items-center gap-1.5 lg:hidden">
              {onOpenCineBot && (
                <button
                  onClick={onOpenCineBot}
                  className="p-2 text-rose-400 hover:text-rose-300 rounded-xl cursor-pointer relative"
                  aria-label="CineBot AI Concierge"
                  title="CineBot AI Concierge"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                </button>
              )}

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
                aria-label="Download Guide & FAQs"
                title="Download Guide & FAQs"
              >
                <HelpCircle className="w-[18px] h-[18px]" />
              </button>

              {onOpenShortcuts && (
                <button
                  onClick={onOpenShortcuts}
                  className="p-2 text-neutral-400 hover:text-white rounded-xl cursor-pointer hidden md:flex items-center justify-center"
                  aria-label="Keyboard Shortcuts"
                  title="Keyboard Shortcuts (?)"
                >
                  <Command className="w-[18px] h-[18px]" />
                </button>
              )}
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
                  onClick={() => { onNavSelect('series'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer ${currentNav === 'series' ? 'bg-rose-600 text-white' : 'text-neutral-300 hover:bg-white/5'}`}
                >
                  <Tv className="w-4 h-4 text-rose-400" />
                  <span>TV Series (EZTV)</span>
                </button>
                <button
                  onClick={() => { onNavSelect('watchlist'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${currentNav === 'watchlist' ? 'bg-rose-600 text-white' : 'text-neutral-300 hover:bg-white/5'}`}
                >
                  My Watchlist ({watchlistCount})
                </button>
                {onOpenCineBot && (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenCineBot(); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-rose-400" />
                      <span>CineBot AI Concierge</span>
                    </div>
                    <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      Gemini
                    </span>
                  </button>
                )}
                {onOpenSpinner && (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenSpinner(); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Dices className="w-4 h-4 text-amber-400" />
                    <span>Movie Night Roulette</span>
                  </button>
                )}
                {onOpenShortcuts && (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenShortcuts(); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between text-neutral-300 hover:bg-white/5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Command className="w-4 h-4 text-neutral-400" />
                      <span>Keyboard Shortcuts</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/10 rounded border border-white/15">
                      ?
                    </kbd>
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

            <div className="pt-4 border-t border-white/10 space-y-3">
              <VisitorCountBadge variant="compact" />
              <div className="text-[10px] text-neutral-500">
                <p className="font-semibold text-neutral-400">CineVault Cinema Portal</p>
                <p>© 2026 Sasuu. All media from public APIs.</p>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
};
