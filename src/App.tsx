import React, { useState, useEffect, useCallback } from 'react';
import { Film, Flame, Star, Search, RefreshCw, AlertCircle, Bookmark, Clapperboard, Heart, Layers, ArrowLeft } from 'lucide-react';
import { Movie, FilterParams } from './types';
import { fetchMovies, fetchMovieBySlug } from './services/movieApi';
import { FALLBACK_FEATURED_MOVIES } from './data/fallbackMovies';
import { Header } from './components/Header';
import { FeaturedHero } from './components/FeaturedHero';
import { PopularTopFive } from './components/PopularTopFive';
import { MovieSectionRow, CURATED_SECTIONS, CuratedSectionConfig } from './components/MovieSectionRow';
import { FilterBar } from './components/FilterBar';
import { MovieCard } from './components/MovieCard';
import { MovieDetailPage } from './components/MovieDetailPage';
import { TrailerModal } from './components/TrailerModal';
import { WatchlistView } from './components/WatchlistView';
import { DownloadGuideModal } from './components/DownloadGuideModal';
import { Pagination } from './components/Pagination';
import { ToastContainer, ToastMessage } from './components/Toast';
import { AdSensePolicyModal } from './components/AdSensePolicyModal';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { AdSenseSlot } from './components/AdSenseSlot';
import { CineVaultLogo } from './components/CineVaultLogo';
import { VisitorCounter } from './components/VisitorCounter';
import { CuratedCollections } from './components/CuratedCollections';
import { RecentlyViewedStrip } from './components/RecentlyViewedStrip';
import { PersonalizedRecommendations } from './components/PersonalizedRecommendations';
import { getMoviePath, getMovieSlug, updateDocumentSeo, parseMovieSlug } from './utils/seo';

const DEFAULT_FILTERS: FilterParams = {
  query_term: '',
  quality: 'All',
  genre: 'All',
  minimum_rating: 0,
  year: 'All',
  language: 'All',
  sort_by: 'date_added',
  order_by: 'desc',
  page: 1,
  limit: 20
};

interface AppRoute {
  type: 'browse' | 'movie' | 'watchlist';
  slug?: string;
  movie?: Movie | null;
}

export default function App() {
  const [filters, setFilters] = useState<FilterParams>(DEFAULT_FILTERS);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [isFeaturedLoading, setIsFeaturedLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Router State
  const [route, setRoute] = useState<AppRoute>({ type: 'browse' });
  const [isMovieSlugLoading, setIsMovieSlugLoading] = useState<boolean>(false);
  const [movieSlugError, setMovieSlugError] = useState<string | null>(null);

  // Curated sections state map: sectionId -> Movie[]
  const [sectionMovies, setSectionMovies] = useState<Record<string, Movie[]>>({});
  const [isSectionsLoading, setIsSectionsLoading] = useState<boolean>(true);
  
  // Navigation & Modals
  const [currentNav, setCurrentNav] = useState<string>('browse');
  const [trailerData, setTrailerData] = useState<{ ytCode: string; title: string } | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [policyModalTab, setPolicyModalTab] = useState<'privacy' | 'terms' | 'about' | 'contact' | 'dmca' | null>(null);
  
  // Watchlist Persistence
  const [watchlist, setWatchlist] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem('cinevault_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Recently Viewed Movies Persistence
  const [recentlyViewed, setRecentlyViewed] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem('cinevault_recent_views');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active Curated Collection Pill (if any)
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Save watchlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cinevault_watchlist', JSON.stringify(watchlist));
    } catch (e) {
      console.error('Failed to save watchlist to localStorage:', e);
    }
  }, [watchlist]);

  // Save recentlyViewed to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cinevault_recent_views', JSON.stringify(recentlyViewed));
    } catch (e) {
      console.error('Failed to save recently viewed to localStorage:', e);
    }
  }, [recentlyViewed]);

  // Initial Route Parser & Browser History Listener
  useEffect(() => {
    const resolveLocation = async () => {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);

      // Check if URL matches /movies/:slug
      const movieMatch = pathname.match(/^\/movies\/([^\/]+)/);

      if (movieMatch) {
        const slug = movieMatch[1];
        setRoute((prev) => {
          if (prev.type === 'movie' && prev.slug === slug && prev.movie) {
            return prev;
          }
          return { type: 'movie', slug, movie: null };
        });

        setIsMovieSlugLoading(true);
        setMovieSlugError(null);

        try {
          const found = await fetchMovieBySlug(slug);
          if (found) {
            setRoute({ type: 'movie', slug, movie: found });
          } else {
            setMovieSlugError(`Movie "${slug}" could not be located in the catalog.`);
          }
        } catch (err: any) {
          setMovieSlugError('Failed to load movie details. Please check your internet connection.');
        } finally {
          setIsMovieSlugLoading(false);
        }
        return;
      }

      // Check if Watchlist route
      if (pathname === '/watchlist') {
        setRoute({ type: 'watchlist' });
        setCurrentNav('watchlist');
        updateDocumentSeo({
          title: 'My Saved Watchlist — CineVault By Sasuu',
          description: 'View your saved bookmarked films and download torrents on CineVault.'
        });
        return;
      }

      // Default Browse Route
      setRoute({ type: 'browse' });
      setCurrentNav('browse');

      // Check for search or genre query parameters in URL
      const genreParam = searchParams.get('genre');
      const queryParam = searchParams.get('q') || searchParams.get('query');
      const yearParam = searchParams.get('year');

      if (genreParam || queryParam || yearParam) {
        setFilters((prev) => ({
          ...prev,
          genre: genreParam || prev.genre,
          query_term: queryParam || prev.query_term,
          year: yearParam || prev.year,
          page: 1
        }));
      }

      updateDocumentSeo({});
    };

    resolveLocation();

    // Listen for forward/backward browser navigation
    const handlePopState = () => {
      resolveLocation();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation Handlers
  const handleSelectMovie = (movie: Movie) => {
    const movieSlug = getMovieSlug(movie);
    const moviePath = getMoviePath(movie);

    // Track recently viewed
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((m) => m.id !== movie.id);
      return [movie, ...filtered].slice(0, 15);
    });

    setRoute({
      type: 'movie',
      slug: movieSlug,
      movie: movie
    });
    setMovieSlugError(null);

    // Push URL without page reload
    if (window.location.pathname !== moviePath) {
      window.history.pushState({ type: 'movie', slug: movieSlug }, '', moviePath);
    }
  };

  const handleNavigateHome = () => {
    setRoute({ type: 'browse' });
    setCurrentNav('browse');
    setMovieSlugError(null);

    if (window.location.pathname !== '/') {
      window.history.pushState({ type: 'browse' }, '', '/');
    }

    updateDocumentSeo({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateWatchlist = () => {
    setRoute({ type: 'watchlist' });
    setCurrentNav('watchlist');
    setMovieSlugError(null);

    if (window.location.pathname !== '/watchlist') {
      window.history.pushState({ type: 'watchlist' }, '', '/watchlist');
    }

    updateDocumentSeo({
      title: 'My Saved Watchlist — CineVault By Sasuu',
      description: 'View your saved bookmarked films and download torrents on CineVault.'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      handleNavigateHome();
    }
  };

  // Fetch Featured & Top Popular Movies for the current year once on mount
  useEffect(() => {
    const loadFeatured = async () => {
      setIsFeaturedLoading(true);
      const currentYear = new Date().getFullYear().toString();
      try {
        let data = await fetchMovies({ 
          query_term: currentYear, 
          sort_by: 'download_count', 
          limit: 15 
        });

        let validMovies = (data.movies || []).filter(m => m && (m.large_cover_image || m.medium_cover_image));

        if (validMovies.length < 10) {
          try {
            const fallbackData = await fetchMovies({ sort_by: 'download_count', limit: 20 });
            const additional = (fallbackData.movies || []).filter(
              m => m && !validMovies.some(existing => existing.id === m.id)
            );
            validMovies = [...validMovies, ...additional];
          } catch {
            // keep validMovies
          }
        }

        if (validMovies.length === 0) {
          validMovies = FALLBACK_FEATURED_MOVIES;
        }

        setFeaturedMovies(validMovies.slice(0, 10));
      } catch (err) {
        console.warn('Using offline catalog for featured hero:', err);
        setFeaturedMovies(FALLBACK_FEATURED_MOVIES);
      } finally {
        setIsFeaturedLoading(false);
      }
    };
    loadFeatured();
  }, []);

  // Fetch all Curated Homepage Sections in parallel on mount
  useEffect(() => {
    const loadCuratedSections = async () => {
      setIsSectionsLoading(true);
      try {
        const results = await Promise.allSettled(
          CURATED_SECTIONS.map(async (sec) => {
            const data = await fetchMovies({
              ...DEFAULT_FILTERS,
              ...sec.filterParams,
              limit: 10
            });
            return {
              id: sec.id,
              movies: (data.movies || []).filter(m => m && (m.medium_cover_image || m.large_cover_image))
            };
          })
        );

        const newMap: Record<string, Movie[]> = {};
        results.forEach((res, index) => {
          const sectionId = CURATED_SECTIONS[index].id;
          if (res.status === 'fulfilled' && res.value.movies.length > 0) {
            newMap[sectionId] = res.value.movies;
          }
        });
        setSectionMovies(newMap);
      } catch (err) {
        console.error('Error loading curated movie sections:', err);
      } finally {
        setIsSectionsLoading(false);
      }
    };

    loadCuratedSections();
  }, []);

  // Fetch Main Movies Catalog based on active filters
  const loadMovies = useCallback(async () => {
    if (route.type === 'watchlist' || route.type === 'movie') return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchMovies(filters);
      setMovies(data.movies || []);
      setTotalCount(data.totalCount || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to movie library. Please try again.');
      setMovies([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, route.type]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  // Handle Navigation Category switching
  const handleNavSelect = (nav: string) => {
    if (nav === 'watchlist') {
      handleNavigateWatchlist();
      return;
    }

    if (route.type !== 'browse') {
      setRoute({ type: 'browse' });
      if (window.location.pathname !== '/') {
        window.history.pushState({ type: 'browse' }, '', '/');
      }
      updateDocumentSeo({});
    }

    setCurrentNav(nav);
    if (nav === 'browse') {
      setFilters(DEFAULT_FILTERS);
    } else if (nav === 'trending') {
      setFilters({
        ...DEFAULT_FILTERS,
        sort_by: 'download_count',
        order_by: 'desc'
      });
    } else if (nav === '4k') {
      setFilters({
        ...DEFAULT_FILTERS,
        quality: '2160p',
        sort_by: 'date_added'
      });
    } else if (nav === 'top') {
      setFilters({
        ...DEFAULT_FILTERS,
        minimum_rating: 8,
        sort_by: 'rating',
        order_by: 'desc'
      });
    }
  };

  // Filter updates
  const handleFilterChange = (newFilters: Partial<FilterParams>) => {
    if (route.type !== 'browse') {
      setRoute({ type: 'browse' });
      if (window.location.pathname !== '/') {
        window.history.pushState({ type: 'browse' }, '', '/');
      }
      updateDocumentSeo({});
    }

    setFilters((prev) => ({
      ...prev,
      ...newFilters
    }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleSearchSubmit = (query: string) => {
    if (route.type !== 'browse') {
      setRoute({ type: 'browse' });
      if (window.location.pathname !== '/') {
        window.history.pushState({ type: 'browse' }, '', '/');
      }
      updateDocumentSeo({});
    }

    setCurrentNav('browse');
    setFilters((prev) => ({
      ...prev,
      query_term: query,
      page: 1
    }));
  };

  // Watchlist Toggle
  const handleToggleWatchlist = (movie: Movie) => {
    setWatchlist((prev) => {
      const exists = prev.some((m) => m.id === movie.id);
      if (exists) {
        addToast('info', 'Removed from Watchlist', movie.title);
        return prev.filter((m) => m.id !== movie.id);
      } else {
        addToast('success', 'Added to Watchlist', `${movie.title} is now in your library`);
        return [movie, ...prev];
      }
    });
  };

  const isMovieWatchlisted = (movieId: number) => {
    return watchlist.some((m) => m.id === movieId);
  };

  // Magnet Copy Handler
  const handleCopyMagnet = (magnetUrl: string, title: string) => {
    navigator.clipboard.writeText(magnetUrl);
    addToast('success', 'Magnet Link Copied!', title);
  };

  // Trailer Handler
  const handlePlayTrailer = (ytCode: string, title: string) => {
    setTrailerData({ ytCode, title });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-neutral-100 selection:bg-rose-600 selection:text-white">
      
      {/* Header */}
      <Header
        searchQuery={filters.query_term}
        onSearchChange={(q) => setFilters((prev) => ({ ...prev, query_term: q }))}
        onSearchSubmit={handleSearchSubmit}
        currentNav={route.type === 'watchlist' ? 'watchlist' : currentNav}
        onNavSelect={handleNavSelect}
        watchlistCount={watchlist.length}
        onOpenGuide={() => setIsGuideOpen(true)}
        onSelectMovie={handleSelectMovie}
        onSelectGenre={(genre) => {
          if (route.type !== 'browse') {
            setRoute({ type: 'browse' });
            if (window.location.pathname !== '/') {
              window.history.pushState({ type: 'browse' }, '', `/?genre=${encodeURIComponent(genre)}`);
            }
            updateDocumentSeo({});
          }
          setCurrentNav('browse');
          setFilters((prev) => ({
            ...prev,
            genre: genre,
            page: 1
          }));
          window.scrollTo({ top: 450, behavior: 'smooth' });
        }}
        onOpenPolicy={(tab) => setPolicyModalTab(tab)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Route 1: Dedicated Movie Detail Page */}
        {route.type === 'movie' ? (
          <div>
            {isMovieSlugLoading ? (
              <div className="space-y-6 animate-pulse py-8">
                <div className="h-8 bg-neutral-900 rounded-lg w-1/3" />
                <div className="h-96 bg-neutral-900 rounded-3xl border border-white/5" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 h-64 bg-neutral-900 rounded-2xl" />
                  <div className="h-64 bg-neutral-900 rounded-2xl" />
                </div>
              </div>
            ) : movieSlugError ? (
              <div className="py-20 text-center flex flex-col items-center justify-center bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 space-y-4 my-8">
                <div className="w-16 h-16 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-500">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-xl font-bold text-white">Movie Not Found</h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                    {movieSlugError}
                  </p>
                </div>
                <button
                  onClick={handleBack}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-full shadow-lg shadow-rose-900/30 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              </div>
            ) : route.movie ? (
              <MovieDetailPage
                movie={route.movie}
                onBack={handleBack}
                onNavigateHome={handleNavigateHome}
                onSelectMovie={handleSelectMovie}
                onSelectGenre={(genre) => {
                  setRoute({ type: 'browse' });
                  if (window.location.pathname !== '/') {
                    window.history.pushState({ type: 'browse' }, '', `/?genre=${encodeURIComponent(genre)}`);
                  }
                  updateDocumentSeo({});
                  setCurrentNav('browse');
                  setFilters((prev) => ({
                    ...prev,
                    genre: genre,
                    page: 1
                  }));
                }}
                onPlayTrailer={handlePlayTrailer}
                onCopyMagnet={handleCopyMagnet}
                isWatchlisted={isMovieWatchlisted}
                onToggleWatchlist={handleToggleWatchlist}
                onOpenGuide={() => setIsGuideOpen(true)}
              />
            ) : null}
          </div>
        ) : route.type === 'watchlist' ? (
          /* Route 2: Watchlist View */
          <WatchlistView
            watchlist={watchlist}
            onSelectMovie={handleSelectMovie}
            onPlayTrailer={handlePlayTrailer}
            onCopyMagnet={handleCopyMagnet}
            onToggleWatchlist={handleToggleWatchlist}
            onClearWatchlist={() => {
              setWatchlist([]);
              addToast('info', 'Watchlist Cleared');
            }}
            onImportWatchlist={(imported) => {
              setWatchlist((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const newItems = imported.filter((m) => !existingIds.has(m.id));
                addToast('success', 'Watchlist Imported', `Added ${newItems.length} new titles to your library.`);
                return [...newItems, ...prev];
              });
            }}
            onExploreCatalog={() => handleNavSelect('browse')}
          />
        ) : (
          /* Route 3: Browse Homepage & Catalog View */
          <>
            {/* Primary Main H1 for SEO */}
            <h1 className="sr-only">CineVault By Sasuu — HD Movie Library & Downloads</h1>

            {/* Featured Hero Premiere Carousel (Only on browse homepage when no search active) */}
            {currentNav === 'browse' && !filters.query_term && filters.page === 1 && filters.genre === 'All' && filters.quality === 'All' && (
              <FeaturedHero
                movies={featuredMovies}
                onSelectMovie={handleSelectMovie}
                onPlayTrailer={handlePlayTrailer}
                onCopyMagnet={handleCopyMagnet}
                isWatchlisted={isMovieWatchlisted}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}

            {/* Recently Viewed Strip (If history exists) */}
            {recentlyViewed.length > 0 && !filters.query_term && (
              <div className="mb-6">
                <RecentlyViewedStrip
                  recentMovies={recentlyViewed}
                  onSelectMovie={handleSelectMovie}
                  onClearRecent={() => {
                    setRecentlyViewed([]);
                    addToast('info', 'Viewing History Cleared');
                  }}
                  onPlayTrailer={handlePlayTrailer}
                  onCopyMagnet={handleCopyMagnet}
                />
              </div>
            )}

            {/* 5 Latest Popular Movies - Always on Top */}
            <PopularTopFive
              movies={featuredMovies}
              isLoading={isFeaturedLoading}
              onSelectMovie={handleSelectMovie}
              onPlayTrailer={handlePlayTrailer}
              onCopyMagnet={handleCopyMagnet}
              isWatchlisted={(id) => isMovieWatchlisted(id)}
              onToggleWatchlist={handleToggleWatchlist}
            />

            {/* Personalized Recommendations based on Watchlist & History */}
            {currentNav === 'browse' && !filters.query_term && (watchlist.length > 0 || recentlyViewed.length > 0) && (
              <div className="my-8">
                <PersonalizedRecommendations
                  watchlist={watchlist}
                  recentlyViewed={recentlyViewed}
                  onSelectMovie={handleSelectMovie}
                  onPlayTrailer={handlePlayTrailer}
                  onCopyMagnet={handleCopyMagnet}
                  isWatchlisted={isMovieWatchlisted}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              </div>
            )}

            {/* Top Responsive AdSense Leaderboard Placement */}
            <AdSenseSlot format="auto" responsive={true} className="my-6" />

            {/* Thematic & Mood-based Collections Bar */}
            {currentNav === 'browse' && !filters.query_term && filters.page === 1 && (
              <div className="my-6">
                <CuratedCollections
                  activeCollectionId={activeCollectionId}
                  onSelectCollection={(filterParams) => {
                    setActiveCollectionId(filterParams.genre || 'all');
                    setFilters((prev) => ({
                      ...DEFAULT_FILTERS,
                      ...filterParams,
                      page: 1
                    }));
                    document.getElementById('movie-search-filters')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </div>
            )}

            {/* Curated Cinema Categories (Rendered on Home Browse View) */}
            {currentNav === 'browse' && !filters.query_term && filters.page === 1 && filters.genre === 'All' && filters.quality === 'All' && (
              <div className="space-y-6 my-10 border-t border-b border-white/5 py-6">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-rose-500" />
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Curated Film Collections</h2>
                    <p className="text-xs text-neutral-400">Explore cinematic worlds categorized by prestigious themes, box office records, and genres</p>
                  </div>
                </div>

                {CURATED_SECTIONS.map((section) => (
                  <MovieSectionRow
                    key={section.id}
                    section={section}
                    movies={sectionMovies[section.id] || []}
                    isLoading={isSectionsLoading}
                    onSelectMovie={handleSelectMovie}
                    onPlayTrailer={handlePlayTrailer}
                    onCopyMagnet={handleCopyMagnet}
                    isWatchlisted={isMovieWatchlisted}
                    onToggleWatchlist={handleToggleWatchlist}
                    onViewAll={() => {
                      setFilters({
                        ...DEFAULT_FILTERS,
                        ...section.filterParams,
                        page: 1
                      });
                      document.getElementById('movie-search-filters')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />
                ))}
              </div>
            )}

            {/* Section Heading & Filter Bar */}
            <div id="movie-catalog-section" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black font-display text-white flex items-center gap-2.5">
                    {currentNav === 'trending' && <Flame className="w-6 h-6 text-rose-500" />}
                    {currentNav === '4k' && <Film className="w-6 h-6 text-rose-400" />}
                    {currentNav === 'top' && <Star className="w-6 h-6 text-amber-400" />}
                    {currentNav === 'browse' && <Clapperboard className="w-6 h-6 text-rose-500" />}
                    
                    <span>
                      {filters.query_term
                        ? `Search: "${filters.query_term}"`
                        : filters.genre && filters.genre !== 'All'
                        ? `Explore ${filters.genre} Cinema`
                        : currentNav === 'trending'
                        ? 'Trending & Popular Films'
                        : currentNav === '4k'
                        ? '4K Ultra HD Cinema (2160p)'
                        : currentNav === 'top'
                        ? 'Top Rated Masterpieces (IMDb 8+)'
                        : 'Explore Films & Torrents'}
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                    Stream trailers, view metadata, and download high-quality files with magnet links
                  </p>
                </div>
              </div>

              {/* Filters */}
              <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                totalResults={totalCount}
                isLoading={isLoading}
                onReset={handleResetFilters}
              />
            </div>

            {/* Error Message banner if any */}
            {error && (
              <div className="my-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
                <button
                  onClick={loadMovies}
                  className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold rounded-full border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Movies Catalog Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 my-6">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="aspect-[2/3] rounded-2xl bg-[#0a0a0a] border border-white/5 animate-pulse flex flex-col justify-end p-4 space-y-2"
                  >
                    <div className="h-4 bg-[#151515] rounded-lg w-3/4" />
                    <div className="h-3 bg-[#151515]/60 rounded-lg w-1/2" />
                  </div>
                ))}
              </div>
            ) : movies.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 my-6">
                {movies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onSelect={handleSelectMovie}
                    onPlayTrailer={handlePlayTrailer}
                    onCopyMagnet={handleCopyMagnet}
                    isWatchlisted={isMovieWatchlisted(movie.id)}
                    onToggleWatchlist={handleToggleWatchlist}
                  />
                ))}
              </div>
            ) : (
              !error && (
                <div className="py-20 text-center flex flex-col items-center justify-center bg-[#0a0a0a]/40 border border-dashed border-white/10 rounded-3xl p-8 space-y-4 my-8">
                  <div className="w-16 h-16 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center text-neutral-600">
                    <Search className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-lg font-bold text-neutral-200">No movies found</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      We couldn't find any films matching your active search or filters. Try adjusting your query or resetting filters.
                    </p>
                  </div>
                  <button
                    onClick={handleResetFilters}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-full shadow-lg shadow-rose-900/30 transition-colors cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              )
            )}

            {/* AdSense In-Feed / Banner Placement compliant with ad-to-content ratio */}
            <AdSenseSlot format="auto" responsive={true} className="my-8" />

            {/* Pagination */}
            {!isLoading && totalCount > filters.limit && (
              <Pagination
                currentPage={filters.page}
                totalCount={totalCount}
                limit={filters.limit}
                onPageChange={(p) => handleFilterChange({ page: p })}
              />
            )}
          </>
        )}

      </main>

      {/* Footer & AdSense Required Legal Compliance Links */}
      <footer className="w-full border-t border-white/10 bg-[#050505] mt-16 py-10 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto justify-between sm:justify-start">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigateHome();
                }}
                className="cursor-pointer"
              >
                <CineVaultLogo variant="header" size="sm" showTagline={true} />
              </a>
              <VisitorCounter />
            </div>

            {/* Compliance Navigation Links */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4 text-xs">
              <button
                onClick={() => setPolicyModalTab('privacy')}
                className="hover:text-rose-400 transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <span>•</span>
              <button
                onClick={() => setPolicyModalTab('terms')}
                className="hover:text-rose-400 transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
              <span>•</span>
              <button
                onClick={() => setPolicyModalTab('dmca')}
                className="hover:text-rose-400 transition-colors cursor-pointer"
              >
                DMCA
              </button>
              <span>•</span>
              <button
                onClick={() => setPolicyModalTab('about')}
                className="hover:text-rose-400 transition-colors cursor-pointer"
              >
                About Us
              </button>
              <span>•</span>
              <button
                onClick={() => setPolicyModalTab('contact')}
                className="hover:text-rose-400 transition-colors cursor-pointer"
              >
                Contact
              </button>
              <span>•</span>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="hover:text-rose-400 transition-colors cursor-pointer"
              >
                Guides
              </button>
            </div>

          </div>

          <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <p>
              CineVault operates strictly as a metadata directory and film indexer. Content is aggregated from public REST APIs for informational and discovery purposes.
            </p>
            <p className="text-neutral-600">
              CineVault By Sasuu © 2026. All trademarks and media belong to their respective copyright holders.
            </p>
          </div>
        </div>
      </footer>

      {/* AdSense Policy & Legal Modal */}
      {policyModalTab && (
        <AdSensePolicyModal
          initialTab={policyModalTab}
          onClose={() => setPolicyModalTab(null)}
        />
      )}

      {/* Cookie & GDPR/CCPA Consent Banner */}
      <CookieConsentBanner
        onOpenPrivacy={() => setPolicyModalTab('privacy')}
      />

      {/* YouTube Trailer Modal */}
      {trailerData && (
        <TrailerModal
          ytTrailerCode={trailerData.ytCode}
          movieTitle={trailerData.title}
          onClose={() => setTrailerData(null)}
        />
      )}

      {/* Download & Magnet Guide Modal */}
      {isGuideOpen && (
        <DownloadGuideModal
          onClose={() => setIsGuideOpen(false)}
          onCopyAllTrackers={() => {
            addToast('success', 'Trackers Copied!', '10 high-speed trackers copied to clipboard');
          }}
        />
      )}

      {/* Notifications Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}

