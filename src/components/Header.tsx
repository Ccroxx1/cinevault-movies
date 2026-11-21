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
      <header className={`cv-header sticky top-0 z-40 w-full transform-gpu border-b transition-[box-shadow] duration-200 ${
        isScrolled ? 'shadow-lg' : 'shadow-none'
      }`}>
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-20 gap-1.5 sm:gap-4">
            
            {/* Left: Mobile Menu Button + Brand Logo */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-1.5 sm:p-2 -ml-1 cv-nav-pill rounded-xl transition-colors cursor-pointer lg:hidden"
                aria-label="Open Navigation Menu"
              >
                <div className="w-5 sm:w-6 h-0.5 bg-current mb-1"></div>
                <div className="w-5 sm:w-6 h-0.5 bg-current mb-1"></div>
                <div className="w-5 sm:w-6 h-0.5 bg-current"></div>
              </button>

              <div
                onClick={() => {
                  onNavSelect('browse');
                  setIsMobileMenuOpen(false);
                }}
                className="cursor-pointer group shrink-0"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavSelect('browse');
                    setIsMobileMenuOpen(false);
                  }
                }}
                aria-label="CineVault Home"
              >
                <CineVaultLogo variant="header" size="md" />
              </div>
            </div>

            {/* Middle: Search Bar with Live Quick Dropdown */}
            <div className="relative flex-1 min-w-0 max-w-xs sm:max-w-md lg:max-w-lg mx-0.5 sm:mx-2">
              <form onSubmit={handleFormSubmit} className="relative" role="search">
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 sm:left-3.5 w-3.5 sm:w-4 h-3.5 sm:h-4 cv-text-muted pointer-events-none" />
                  <label htmlFor="movie-search-input" className="sr-only">Search movies</label>
                  <input
                    id="movie-search-input"
                    name="headerSearch"
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    placeholder={currentNav === 'series' ? 'Search TV...' : 'Search...'}
                    className="cv-input w-full min-w-0 pl-7 sm:pl-10 pr-7 sm:pr-14 py-1.5 sm:py-2.5 text-xs sm:text-sm border rounded-xl focus:outline-none transition-colors"
                  />
                  
                  {searchQuery ? (
                    <div className="absolute right-1.5 sm:right-2.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          onSearchChange('');
                          searchInputRef.current?.focus();
                        }}
                        className="p-1 cv-text-muted hover:text-[var(--cv-text)] rounded cursor-pointer"
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="absolute right-2 sm:right-2.5 hidden sm:flex items-center pointer-events-none select-none">
                      <kbd className="cv-kbd px-1.5 py-0.5 text-[10px] font-mono font-medium border rounded shadow-xs" title="Press 'S' or '/' to search">
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
                  className="cv-surface-elevated fixed left-2.5 right-2.5 top-14 sm:absolute sm:top-full sm:left-0 sm:right-0 mt-1 sm:mt-2 border rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="cv-surface-muted p-2.5 border-b cv-border text-[11px] font-semibold cv-text-muted flex items-center justify-between">
                    <span>Quick Search Results</span>
                    {isSearchingQuick && <span className="cv-text-accent animate-pulse">Searching...</span>}
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-[var(--cv-border-subtle)]">
                    {/* If TV series are found */}
                    {quickTvResults.length > 0 && (
                      <div className="p-1.5 bg-[var(--cv-nav-active-soft-bg)]/40">
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider cv-text-accent flex items-center gap-1">
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
                            className="w-full flex items-center gap-2.5 p-2 hover:bg-[var(--cv-surface-hover)] rounded-xl cursor-pointer transition-colors text-left group"
                          >
                            <div className="w-8 h-11 sm:w-9 sm:h-12 cv-surface-muted rounded overflow-hidden shrink-0 border cv-border">
                              {tvShow.image ? (
                                <img
                                  src={tvShow.image}
                                  alt={`${tvShow.name} Poster`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center cv-text-muted">
                                  <Tv className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs sm:text-sm font-semibold cv-text truncate cv-group-hover-accent">
                                  {tvShow.name}
                                </h4>
                                <span className="cv-badge-info px-1.5 py-0.2 rounded border text-[10px] font-bold">
                                  TV
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] cv-text-muted mt-0.5">
                                {tvShow.year && <span>{tvShow.year}</span>}
                                {tvShow.rating && (
                                  <span className="cv-rating flex items-center gap-0.5 font-semibold">
                                    <Star className="w-3 h-3 fill-current" />
                                    {tvShow.rating}
                                  </span>
                                )}
                                {tvShow.network && <span className="cv-text-subtle">• {tvShow.network}</span>}
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
                          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider cv-text-muted">
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
                            className="w-full flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 hover:bg-[var(--cv-surface-hover)] rounded-xl cursor-pointer transition-colors text-left group"
                          >
                            <img
                              src={getPrimaryMoviePoster(movie)}
                              alt={`${movie.title} (${movie.year || 'Film'}) Poster`}
                              loading="eager"
                              width="40"
                              height="56"
                              className="w-8 h-11 sm:w-10 sm:h-14 object-cover rounded cv-surface-muted shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = CINEVAULT_POSTER_FALLBACK;
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs sm:text-sm font-semibold cv-text truncate cv-group-hover-accent">
                                {movie.title}
                              </h4>
                              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs cv-text-muted mt-0.5">
                                <span>{movie.year}</span>
                                <span>•</span>
                                <div className="cv-rating flex items-center gap-0.5 font-semibold">
                                  <Star className="w-3 h-3 fill-current" />
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
                      className="w-full p-3 text-center text-xs cv-text-accent font-bold hover:bg-[var(--cv-nav-active-soft-bg)] cursor-pointer transition-colors"
                    >
                      {currentNav === 'series'
                        ? `Search EZTV index for "${searchQuery}"`
                        : `View all results for "${searchQuery}"`}
                    </button>

                    {/* No results message */}
                    {!isSearchingQuick && quickResults.length === 0 && quickTvResults.length === 0 && (
                      <div className="p-5 text-center text-xs cv-text-muted">
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
                  currentNav === 'browse' ? 'cv-nav-soft-active shadow-xs' : 'cv-nav-pill'
                }`}
              >
                <span>Browse</span>
              </button>

              <button
                onClick={() => onNavSelect('trending')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === 'trending' ? 'cv-nav-soft-active shadow-xs' : 'cv-nav-pill'
                }`}
              >
                <span>Trending</span>
              </button>

              <button
                onClick={() => onNavSelect('4k')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === '4k' ? 'cv-nav-pill-active shadow-md' : 'cv-nav-pill'
                }`}
              >
                <span>4K UHD</span>
              </button>

              <button
                onClick={() => onNavSelect('top')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === 'top' ? 'cv-nav-pill-active shadow-md' : 'cv-nav-pill'
                }`}
              >
                <span>Top Rated</span>
              </button>

              <button
                onClick={() => onNavSelect('series')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentNav === 'series' ? 'cv-nav-pill-active shadow-md' : 'cv-nav-pill'
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
                    isGenreDropdownOpen ? 'cv-nav-soft-active' : 'cv-nav-pill'
                  }`}
                >
                  <span>Genres</span>
                </button>

                {isGenreDropdownOpen && (
                  <div className="cv-surface-elevated absolute top-full right-0 mt-2 w-72 p-3 border rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] font-bold uppercase tracking-wider cv-text-muted px-2 pb-2 mb-1 border-b cv-border flex items-center justify-between">
                      <span>Explore by Genre</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto pr-1">
                      {GENRES.map((g) => (
                        <button
                          key={g}
                          onClick={() => handleGenreClick(g)}
                          className="px-2.5 py-1.5 text-left text-xs rounded-lg cv-text-secondary hover:bg-[var(--cv-nav-active-soft-bg)] hover:text-[var(--cv-nav-active-soft-fg)] transition-colors cursor-pointer"
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
                  currentNav === 'watchlist' ? 'cv-nav-pill-active shadow-md' : 'cv-nav-pill'
                }`}
                title="My Saved Movies"
              >
                <BookmarkIcon size={15} />
                <span>Watchlist</span>
                {watchlistCount > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full ${
                    currentNav === 'watchlist'
                      ? 'bg-white text-[var(--cv-nav-active-bg)]'
                      : 'cv-nav-soft-active'
                  }`}>
                    {watchlistCount}
                  </span>
                )}
              </button>

              {/* Movie Night Roulette - kept directly on navbar */}
              {onOpenSpinner && (
                <button
                  id="header-roulette-btn"
                  onClick={onOpenSpinner}
                  className="cv-rating-badge flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs hover:brightness-110"
                  title="Surprise Me - Movie Night Roulette (Hot key: R)"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Roulette</span>
                  <kbd className="hidden sm:inline-flex items-center justify-center px-1 text-[9px] font-mono border border-current/30 rounded font-bold">
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
                    isMoreMenuOpen ? 'cv-nav-soft-active' : 'cv-nav-pill'
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
                  <div className="cv-surface-elevated absolute top-full right-0 mt-2 w-64 p-2 rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border">
                    <div className="space-y-1">
                      {/* CineBot AI */}
                      {onOpenCineBot && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            onOpenCineBot();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left cv-text-secondary hover:bg-[var(--cv-nav-active-soft-bg)] hover:text-[var(--cv-nav-active-soft-fg)] transition-colors cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-lg cv-nav-soft-active border flex items-center justify-center group-hover:bg-[var(--cv-nav-active-bg)] group-hover:text-white transition-colors shrink-0">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold">CineBot AI</span>
                              <span className="cv-nav-soft-active text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border">
                                Gemini
                              </span>
                            </div>
                            <div className="text-[10px] truncate cv-text-muted">
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
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left cv-text-secondary hover:bg-[var(--cv-surface-hover)] hover:text-[var(--cv-text)] transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg border cv-surface-muted cv-border cv-text-muted flex items-center justify-center transition-colors shrink-0">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold cv-text">Download Guide</div>
                          <div className="text-[10px] truncate cv-text-muted">
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
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left cv-text-secondary hover:bg-[var(--cv-surface-hover)] hover:text-[var(--cv-text)] transition-colors cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-lg border cv-surface-muted cv-border cv-text-muted flex items-center justify-center transition-colors shrink-0">
                            <Command className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div>
                              <div className="font-bold cv-text">Keyboard Shortcuts</div>
                              <div className="text-[10px] truncate cv-text-muted">
                                Quick hotkeys & navigation
                              </div>
                            </div>
                            <kbd className="cv-kbd px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border">
                              ?
                            </kbd>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Theme / Color Mode Selector */}
                    <div className="pt-2 mt-1.5 border-t cv-border-subtle">
                      <div className="px-2.5 pb-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cv-text-muted">
                          <Palette className="w-3 h-3 cv-text-accent" />
                          <span>Theme</span>
                        </span>
                        <span className="text-[10px] font-mono cv-text-accent font-bold capitalize">
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
                              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-colors cursor-pointer select-none text-center ${
                                isActive
                                  ? 'cv-nav-soft-active font-bold shadow-xs'
                                  : 'cv-btn-secondary'
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
            <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0 lg:hidden">
              {onOpenCineBot && (
                <button
                  onClick={onOpenCineBot}
                  className="hidden sm:inline-flex p-2 cv-text-accent hover:bg-[var(--cv-nav-active-soft-bg)] rounded-xl cursor-pointer relative"
                  aria-label="CineBot AI Concierge"
                  title="CineBot AI Concierge"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="sr-only">AI Concierge Ready</span>
                </button>
              )}

              {onOpenSpinner && (
                <button
                  onClick={onOpenSpinner}
                  className="p-1.5 sm:p-2 cv-rating hover:bg-[var(--cv-rating-soft-bg)] rounded-xl cursor-pointer"
                  aria-label="Movie Night Roulette"
                  title="Movie Night Roulette"
                >
                  <Dices className="w-4 h-4" />
                </button>
              )}

              <ColorModeSelector variant="dropdown" />

              <button
                onClick={() => onNavSelect('watchlist')}
                className="p-1.5 sm:p-2 cv-nav-pill rounded-xl relative cursor-pointer"
                aria-label={`Watchlist (${watchlistCount} items)`}
              >
                <BookmarkIcon size={18} />
                {watchlistCount > 0 && (
                  <span className="cv-nav-pill-active absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[9px] font-mono font-bold rounded-full flex items-center justify-center">
                    {watchlistCount > 99 ? '99+' : watchlistCount}
                  </span>
                )}
              </button>

              <button
                onClick={onOpenGuide}
                className="hidden sm:inline-flex p-2 cv-nav-pill rounded-xl cursor-pointer"
                aria-label="Download Guide & FAQs"
                title="Download Guide & FAQs"
              >
                <HelpCircle className="w-[18px] h-[18px]" />
              </button>

              {onOpenShortcuts && (
                <button
                  onClick={onOpenShortcuts}
                  className="p-2 cv-nav-pill rounded-xl cursor-pointer hidden md:flex items-center justify-center"
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
            className="fixed inset-0 backdrop-blur-sm transition-opacity"
            style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <nav
            ref={drawerRef}
            className="cv-surface-elevated fixed inset-y-0 left-0 max-w-xs w-full border-r p-5 flex flex-col justify-between overflow-y-auto z-50 animate-in slide-in-from-left duration-200"
            aria-label="Mobile Navigation Menu"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b cv-border">
                <CineVaultLogo variant="header" size="sm" />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 cv-nav-pill rounded-lg cursor-pointer"
                  aria-label="Close menu"
                >
                  <span aria-hidden="true" className="text-xl">&times;</span>
                </button>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => { onNavSelect('browse'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${currentNav === 'browse' ? 'cv-nav-pill-active' : 'cv-nav-pill'}`}
                >
                  Browse Movies
                </button>
                <button
                  onClick={() => { onNavSelect('trending'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${currentNav === 'trending' ? 'cv-nav-pill-active' : 'cv-nav-pill'}`}
                >
                  Trending Now
                </button>
                <button
                  onClick={() => { onNavSelect('4k'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${currentNav === '4k' ? 'cv-nav-pill-active' : 'cv-nav-pill'}`}
                >
                  4K Ultra HD
                </button>
                <button
                  onClick={() => { onNavSelect('top'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${currentNav === 'top' ? 'cv-nav-pill-active' : 'cv-nav-pill'}`}
                >
                  Top Rated
                </button>
                <button
                  onClick={() => { onNavSelect('series'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer ${currentNav === 'series' ? 'cv-nav-pill-active' : 'cv-nav-pill'}`}
                >
                  <Tv className="w-4 h-4" />
                  <span>TV Series (EZTV)</span>
                </button>
                <button
                  onClick={() => { onNavSelect('watchlist'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${currentNav === 'watchlist' ? 'cv-nav-pill-active' : 'cv-nav-pill'}`}
                >
                  My Watchlist ({watchlistCount})
                </button>
                {onOpenCineBot && (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenCineBot(); }}
                    className="cv-nav-soft-active w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>CineBot AI Concierge</span>
                    </div>
                    <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border border-current/25">
                      Gemini
                    </span>
                  </button>
                )}
                {onOpenSpinner && (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenSpinner(); }}
                    className="cv-rating-badge w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 cursor-pointer"
                  >
                    <Dices className="w-4 h-4" />
                    <span>Movie Night Roulette</span>
                  </button>
                )}
                {onOpenShortcuts && (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenShortcuts(); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cv-nav-pill cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Command className="w-4 h-4 cv-text-muted" />
                      <span>Keyboard Shortcuts</span>
                    </div>
                    <kbd className="cv-kbd px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border">
                      ?
                    </kbd>
                  </button>
                )}
              </div>

              <div className="pt-2">
                <PWAInstallButton variant="banner" />
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider cv-text-muted px-3">Genres</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {popularGenres.map((g) => (
                    <button key={g} onClick={() => handleGenreClick(g)} className="cv-card-interactive px-3 py-2 text-left rounded-xl border text-xs cursor-pointer">
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t cv-border">
                <ColorModeSelector variant="inline" />
              </div>

              <div className="space-y-1 pt-2 border-t cv-border-subtle">
                <button onClick={() => { setIsMobileMenuOpen(false); onOpenGuide(); }} className="w-full text-left px-3 py-2 rounded-xl text-xs cv-nav-pill cursor-pointer">
                  Download Guide
                </button>
                {onOpenPolicy && (
                  <>
                    <button onClick={() => { setIsMobileMenuOpen(false); onOpenPolicy('privacy'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs cv-nav-pill cursor-pointer">
                      Privacy & Cookies
                    </button>
                    <button onClick={() => { setIsMobileMenuOpen(false); onOpenPolicy('dmca'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs cv-nav-pill cursor-pointer">
                      Legal Disclaimer
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 border-t cv-border space-y-3">
              <VisitorCountBadge variant="compact" />
              <div className="text-[10px] cv-text-muted">
                <p className="font-semibold cv-text-secondary">CineVault Cinema Portal</p>
                <p>© 2026 Sasuu. All media from public APIs.</p>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
};
