import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { RefreshCw } from 'lucide-react';
import { Movie, FilterParams } from './types';
import { fetchMovies, fetchMovieBySlug, validateAndCleanMovies, filterMoviesByParams } from './services/movieApi';
import { FALLBACK_FEATURED_MOVIES } from './data/fallbackMovies';
import { Header } from './components/Header';
import { FeaturedHero } from './components/FeaturedHero';
import { MovieSectionRow, CURATED_SECTIONS } from './components/MovieSectionRow';
import { FilterBar } from './components/FilterBar';
import { MovieCard } from './components/MovieCard';
import { Pagination } from './components/Pagination';
import { ToastContainer, ToastMessage } from './components/Toast';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { AdSenseSlot } from './components/AdSenseSlot';
import { AdsterraBanner } from './components/AdsterraBanner';
import { Footer } from './components/Footer';
import { CuratedCollections } from './components/CuratedCollections';
import { RecentlyViewedStrip } from './components/RecentlyViewedStrip';
import { PersonalizedRecommendations } from './components/PersonalizedRecommendations';
import { MovieComparisonBar } from './components/MovieComparisonBar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CineBotLauncher } from './components/CineBotLauncher';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { TvShowDetails, TvShowInfo, EztvTorrent } from './types';
import { getSeriesSlug, extractShowTitleFromRelease } from './services/eztvApi';
import { getMoviePath, getMovieSlug, updateDocumentSeo } from './utils/seo';
import { refreshEzoicAds } from './utils/ezoic';
import { ensureConsentGatedGlobalAds, onConsentChange } from './utils/consent';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { MovieSortDropdown } from './components/MovieSortDropdown';
import { useTheme } from './context/ThemeContext';
import { useMovieComparison } from './context/MovieComparisonContext';

// Code-split route pages and heavy modals to keep initial browse bundle small
const MovieDetailPage = lazy(() => import('./components/MovieDetailPage').then((m) => ({ default: m.MovieDetailPage })));
const SeriesDetailPage = lazy(() => import('./components/SeriesDetailPage').then((m) => ({ default: m.SeriesDetailPage })));
const EztvView = lazy(() => import('./components/EztvView').then((m) => ({ default: m.EztvView })));
const WatchlistView = lazy(() => import('./components/WatchlistView').then((m) => ({ default: m.WatchlistView })));
const TrailerModal = lazy(() => import('./components/TrailerModal').then((m) => ({ default: m.TrailerModal })));
const DownloadGuideModal = lazy(() => import('./components/DownloadGuideModal').then((m) => ({ default: m.DownloadGuideModal })));
const AdSensePolicyModal = lazy(() => import('./components/AdSensePolicyModal').then((m) => ({ default: m.AdSensePolicyModal })));
const MovieComparisonModal = lazy(() => import('./components/MovieComparisonModal').then((m) => ({ default: m.MovieComparisonModal })));
const MovieNightSpinnerModal = lazy(() => import('./components/MovieNightSpinnerModal').then((m) => ({ default: m.MovieNightSpinnerModal })));
const FilmographyModal = lazy(() => import('./components/FilmographyModal').then((m) => ({ default: m.FilmographyModal })));
const CineBotModal = lazy(() => import('./components/CineBotModal').then((m) => ({ default: m.CineBotModal })));
const KeyboardShortcutsModal = lazy(() => import('./components/KeyboardShortcutsModal'));

const RouteSuspenseFallback = () => (
  <div className="space-y-6 animate-pulse py-8">
    <div className="h-8 bg-neutral-900 rounded-lg w-1/3" />
    <div className="h-80 bg-neutral-900 rounded-3xl border border-white/5" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="aspect-[2/3] bg-neutral-900 rounded-2xl" />
      <div className="aspect-[2/3] bg-neutral-900 rounded-2xl" />
      <div className="aspect-[2/3] bg-neutral-900 rounded-2xl hidden sm:block" />
      <div className="aspect-[2/3] bg-neutral-900 rounded-2xl hidden sm:block" />
    </div>
  </div>
);

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
  type: 'browse' | 'movie' | 'watchlist' | 'series' | 'series_detail';
  slug?: string;
  movie?: Movie | null;
  seriesQuery?: string;
  seriesImdb?: string;
  seriesGenre?: string;
  seriesShow?: TvShowDetails | TvShowInfo | null;
  seriesTorrent?: EztvTorrent | null;
}

function parseCurrentUrl(): {
  route: AppRoute;
  currentNav: string;
  initialFilters?: Partial<FilterParams>;
} {
  if (typeof window === 'undefined') {
    return { route: { type: 'browse' }, currentNav: 'browse' };
  }

  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);

  // Check if URL matches /movies/:slug
  const movieMatch = pathname.match(/^\/movies\/([^/]+)/);
  if (movieMatch) {
    const slug = movieMatch[1];
    return {
      route: { type: 'movie', slug, movie: null },
      currentNav: 'browse'
    };
  }

  // Check if Watchlist route
  if (pathname === '/watchlist') {
    return {
      route: { type: 'watchlist' },
      currentNav: 'watchlist'
    };
  }

  // Check if TV Series route: /series or /tv
  if (pathname === '/series' || pathname === '/tv') {
    const searchQuery = searchParams.get('search') || searchParams.get('q') || searchParams.get('query') || undefined;
    const imdbId = searchParams.get('imdb') || searchParams.get('imdb_id') || undefined;
    const genre = searchParams.get('genre') || undefined;
    return {
      route: { type: 'series', seriesQuery: searchQuery, seriesImdb: imdbId, seriesGenre: genre },
      currentNav: 'series'
    };
  }

  // Check if TV Series Detail route: /series/:slug or /tv/:slug
  const seriesMatch = pathname.match(/^\/(?:series|tv)\/([^/]+)/i);
  if (seriesMatch && seriesMatch[1] && seriesMatch[1] !== 'search') {
    const seriesSlug = decodeURIComponent(seriesMatch[1]);
    const imdbMatch = seriesSlug.match(/^(tt\d+)/i);
    const effectiveImdb = imdbMatch ? imdbMatch[1] : undefined;
    const cleanTitle = seriesSlug.replace(/^(tt\d+-?)/i, '').replace(/-/g, ' ');

    return {
      route: {
        type: 'series_detail',
        slug: seriesSlug,
        seriesImdb: effectiveImdb,
        seriesQuery: cleanTitle || undefined
      },
      currentNav: 'series'
    };
  }

  // Default Browse Route
  const genreParam = searchParams.get('genre');
  const queryParam = searchParams.get('q') || searchParams.get('query');
  const yearParam = searchParams.get('year');

  return {
    route: { type: 'browse' },
    currentNav: 'browse',
    initialFilters: {
      ...(genreParam ? { genre: genreParam } : {}),
      ...(queryParam ? { query_term: queryParam } : {}),
      ...(yearParam ? { year: yearParam } : {})
    }
  };
}

export default function App() {
  const { colorMode } = useTheme();
  const isWhite = colorMode === 'white';
  const [initialUrlState] = useState(() => parseCurrentUrl());
  const [filters, setFilters] = useState<FilterParams>(() => ({
    ...DEFAULT_FILTERS,
    ...(initialUrlState.initialFilters || {})
  }));
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>(() =>
    initialUrlState.route.type === 'browse' ? FALLBACK_FEATURED_MOVIES : []
  );
  const [isFeaturedLoading, setIsFeaturedLoading] = useState<boolean>(() => initialUrlState.route.type === 'browse');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(() => initialUrlState.route.type === 'browse');
  const [isRefreshingSilently, setIsRefreshingSilently] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const lastCatalogUpdateRef = useRef<number>(Date.now());
  const previousFirstMovieIdRef = useRef<number | null>(null);

  // Router State
  const [route, setRoute] = useState<AppRoute>(() => initialUrlState.route);
  const [isMovieSlugLoading, setIsMovieSlugLoading] = useState<boolean>(false);
  const [movieSlugError, setMovieSlugError] = useState<string | null>(null);

  const { isOpen: isComparisonOpen } = useMovieComparison();

  // Curated sections state map: sectionId -> Movie[]
  const [sectionMovies, setSectionMovies] = useState<Record<string, Movie[]>>({});
  const [sectionLoadingMap, setSectionLoadingMap] = useState<Record<string, boolean>>({});
  const requestedSectionsRef = useRef<Set<string>>(new Set());
  const seenSectionMovieIdsRef = useRef<Set<number>>(new Set());
  const featuredSeedIdsRef = useRef<number[]>([]);

  // Navigation & Modals
  const [currentNav, setCurrentNav] = useState<string>(() => initialUrlState.currentNav);
  const [trailerData, setTrailerData] = useState<{ ytCode: string; title: string } | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSpinnerOpen, setIsSpinnerOpen] = useState<boolean>(false);
  const [hasOpenedSpinner, setHasOpenedSpinner] = useState<boolean>(false);
  const [hasOpenedComparison, setHasOpenedComparison] = useState<boolean>(false);
  const [policyModalTab, setPolicyModalTab] = useState<'privacy' | 'terms' | 'about' | 'contact' | 'dmca' | 'agreement' | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('privacy')) return 'privacy';
      if (path.includes('terms')) return 'terms';
      if (path.includes('about')) return 'about';
      if (path.includes('contact')) return 'contact';
      if (path.includes('dmca')) return 'dmca';
      if (path.includes('agreement')) return 'agreement';
    }
    return null;
  });
  const [filmographyPerson, setFilmographyPerson] = useState<{ name: string; role?: 'director' | 'actor' | 'cast' } | null>(null);
  const [isCineBotOpen, setIsCineBotOpen] = useState<boolean>(false);
  const [hasOpenedCineBot, setHasOpenedCineBot] = useState<boolean>(false);
  const [cineBotInitialPrompt, setCineBotInitialPrompt] = useState<string | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isSpinnerOpen) setHasOpenedSpinner(true);
  }, [isSpinnerOpen]);

  useEffect(() => {
    if (isComparisonOpen) setHasOpenedComparison(true);
  }, [isComparisonOpen]);

  useEffect(() => {
    if (isCineBotOpen) setHasOpenedCineBot(true);
  }, [isCineBotOpen]);

  const handleOpenCineBotWithPrompt = (prompt: string) => {
    setCineBotInitialPrompt(prompt);
    setIsCineBotOpen(true);
  };

  const handleOpenFilmography = (name: string, role?: 'director' | 'actor' | 'cast') => {
    setFilmographyPerson({ name, role: role || 'cast' });
  };
  
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
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : `${Date.now()}_${toasts.length}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Listen for global toast notifications (e.g. from context or utilities)
  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: 'success' | 'error' | 'info'; title: string; description?: string }>;
      if (customEvent.detail) {
        addToast(customEvent.detail.type, customEvent.detail.title, customEvent.detail.description);
      }
    };
    window.addEventListener('cinevault_toast', handleToastEvent);
    return () => window.removeEventListener('cinevault_toast', handleToastEvent);
  }, []);

  // Save watchlist to localStorage
  useEffect(() => {
    try {
      if (watchlist.length > 0 || localStorage.getItem('cinevault_watchlist') !== null) {
        localStorage.setItem('cinevault_watchlist', JSON.stringify(watchlist));
      }
    } catch (e) {
      console.error('Failed to save watchlist to localStorage:', e);
    }
  }, [watchlist]);

  // Save recentlyViewed to localStorage
  useEffect(() => {
    try {
      if (recentlyViewed.length > 0 || localStorage.getItem('cinevault_recent_views') !== null) {
        localStorage.setItem('cinevault_recent_views', JSON.stringify(recentlyViewed));
      }
    } catch (e) {
      console.error('Failed to save recently viewed to localStorage:', e);
    }
  }, [recentlyViewed]);

  // Initial Route Parser & Browser History Listener
  useEffect(() => {
    const resolveLocation = async () => {
      const parsed = parseCurrentUrl();

      // Check if URL matches /movies/:slug
      if (parsed.route.type === 'movie' && parsed.route.slug) {
        setRoute((prev) => {
          if (prev.type === 'movie' && prev.slug === parsed.route.slug && prev.movie) {
            return prev;
          }
          return { type: 'movie', slug: parsed.route.slug, movie: null };
        });

        setIsMovieSlugLoading(true);
        setMovieSlugError(null);

        try {
          const found = await fetchMovieBySlug(parsed.route.slug);
          if (found) {
            setRoute({ type: 'movie', slug: parsed.route.slug, movie: found });
          } else {
            setMovieSlugError(`Movie "${parsed.route.slug}" could not be located in the catalog.`);
          }
        } catch (err: any) {
          setMovieSlugError('Failed to load movie details. Please check your internet connection.');
        } finally {
          setIsMovieSlugLoading(false);
        }
        return;
      }

      if (parsed.route.type === 'watchlist') {
        setRoute({ type: 'watchlist' });
        setCurrentNav('watchlist');
        updateDocumentSeo({
          title: 'My Saved Watchlist — CineVault By Sasuu',
          description: 'View your saved bookmarked films and download torrents on CineVault.',
          breadcrumbs: [
            { name: 'Home', item: '/' },
            { name: 'Watchlist', item: '/watchlist' }
          ]
        });
        return;
      }

      if (parsed.route.type === 'series') {
        setRoute(parsed.route);
        setCurrentNav('series');
        updateDocumentSeo({
          title: parsed.route.seriesQuery ? `"${parsed.route.seriesQuery}" — TV Series & Episodes (EZTV) — CineVault` : 'TV Series & Episode Torrents (EZTV) — CineVault',
          description: 'Explore and download television series, full seasons, and episodes powered by the EZTV API.',
          breadcrumbs: [
            { name: 'Home', item: '/' },
            { name: 'TV Series', item: '/series' }
          ]
        });
        return;
      }

      if (parsed.route.type === 'series_detail') {
        setRoute(parsed.route);
        setCurrentNav('series');
        return;
      }

      // Default Browse Route
      setRoute({ type: 'browse' });
      setCurrentNav('browse');

      if (parsed.initialFilters) {
        setFilters((prev) => ({
          ...prev,
          ...parsed.initialFilters,
          page: 1
        }));
      }

      updateDocumentSeo({
        breadcrumbs: [{ name: 'Home', item: '/' }]
      });
    };

    // If initial route was movie without data, resolve it
    if (route.type === 'movie' && route.slug && !route.movie) {
      resolveLocation();
    }

    // Listen for forward/backward browser navigation
    const handlePopState = () => {
      resolveLocation();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Refresh Ezoic ads on dynamic route changes (SPA navigation)
  useEffect(() => {
    refreshEzoicAds();
  }, [route.type, (route as any).slug]);

  // Mount global Adsterra Popunder (<head>) & Social Bar (<body>) scripts on eligible hosts
  useEffect(() => {
    ensureConsentGatedGlobalAds();
    return onConsentChange((accepted) => {
      if (accepted) {
        ensureConsentGatedGlobalAds();
      }
    });
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

    updateDocumentSeo({
      breadcrumbs: [{ name: 'Home', item: '/' }]
    });
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
      description: 'View your saved bookmarked films and download torrents on CineVault.',
      breadcrumbs: [
        { name: 'Home', item: '/' },
        { name: 'Watchlist', item: '/watchlist' }
      ]
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateSeries = (query?: unknown, imdbId?: unknown, genre?: unknown) => {
    const safeQuery = typeof query === 'string' ? query : undefined;
    const safeImdb = typeof imdbId === 'string' ? imdbId : undefined;
    const safeGenre = typeof genre === 'string' ? genre : undefined;
    setRoute({ type: 'series', seriesQuery: safeQuery, seriesImdb: safeImdb, seriesGenre: safeGenre });
    setCurrentNav('series');
    setMovieSlugError(null);

    const params = new URLSearchParams();
    if (safeQuery) params.set('search', safeQuery);
    if (safeImdb) params.set('imdb', safeImdb);
    if (safeGenre && safeGenre !== 'Action') params.set('genre', safeGenre);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const targetUrl = `/series${queryString}`;

    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.pushState({ type: 'series', seriesQuery: safeQuery, seriesImdb: safeImdb, seriesGenre: safeGenre }, '', targetUrl);
    }

    updateDocumentSeo({
      title: safeQuery ? `"${safeQuery}" — TV Series & Episodes (EZTV) — CineVault` : 'TV Series & Episode Torrents (EZTV) — CineVault',
      description: 'Explore and download television series, full seasons, and episodes powered by the EZTV API.',
      breadcrumbs: [
        { name: 'Home', item: '/' },
        { name: 'TV Series', item: '/series' }
      ]
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSeries = (params: { imdb?: string; title?: string; torrent?: EztvTorrent; show?: TvShowDetails | TvShowInfo }) => {
    const title = params.title || params.show?.name || (params.torrent ? extractShowTitleFromRelease(params.torrent.title) : '');
    const imdb = params.imdb || params.show?.imdb_code || params.show?.imdb_id || (params.torrent?.imdb_id && params.torrent.imdb_id !== '0' ? `tt${params.torrent.imdb_id}` : undefined);
    const seriesSlug = getSeriesSlug(title, imdb);
    const seriesPath = `/series/${seriesSlug}`;

    setRoute({
      type: 'series_detail',
      slug: seriesSlug,
      seriesImdb: imdb,
      seriesQuery: title,
      seriesShow: params.show || null,
      seriesTorrent: params.torrent || null
    });
    setCurrentNav('series');
    setMovieSlugError(null);

    if (window.location.pathname !== seriesPath) {
      window.history.pushState({ type: 'series_detail', slug: seriesSlug }, '', seriesPath);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      handleNavigateHome();
    }
  };

  // Global Keyboard Shortcuts Handlers
  const handleCloseAllModals = useCallback(() => {
    setIsSpinnerOpen(false);
    setTrailerData(null);
    setIsGuideOpen(false);
    setIsCineBotOpen(false);
    setFilmographyPerson(null);
    setPolicyModalTab(null);
    setIsShortcutsOpen(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const handleFocusSearch = useCallback(() => {
    if (route.type !== 'browse' && route.type !== 'series') {
      handleNavigateHome();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      const input = document.getElementById('movie-search-input') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  }, [route.type, handleNavigateHome]);

  useGlobalShortcuts({
    onSearchFocus: handleFocusSearch,
    onOpenSpinner: () => setIsSpinnerOpen(true),
    onCloseModals: handleCloseAllModals,
    onNavigateBrowse: handleNavigateHome,
    onNavigateWatchlist: handleNavigateWatchlist,
    onNavigateSeries: () => handleNavigateSeries(),
    onOpenCineBot: () => setIsCineBotOpen(true),
    onToggleShortcutsModal: () => setIsShortcutsOpen((prev) => !prev),
  });

  // Fetch a rich, diverse pool of Featured Movies from multiple streams
  const loadFeatured = useCallback(async () => {
    if (route.type !== 'browse') return;
    setIsFeaturedLoading(true);
    try {
      // Parallel fetch across different high-quality dimensions
      const [trendingRes, recentRes, topRatedRes, actionRes] = await Promise.allSettled([
        fetchMovies({ sort_by: 'download_count', limit: 25 }),
        fetchMovies({ query_term: String(new Date().getFullYear()), sort_by: 'download_count', limit: 20 }),
        fetchMovies({ minimum_rating: 8, sort_by: 'like_count', limit: 20 }),
        fetchMovies({ genre: 'Action', sort_by: 'like_count', limit: 20 }),
      ]);

      const poolMap = new Map<number, Movie>();

      // Fallback base
      FALLBACK_FEATURED_MOVIES.forEach((m) => poolMap.set(m.id, m));

      [trendingRes, recentRes, topRatedRes, actionRes].forEach((res) => {
        if (res.status === 'fulfilled' && res.value?.movies) {
          const cleaned = validateAndCleanMovies(res.value.movies);
          cleaned.forEach((m) => {
            if (m.id && m.title && m.torrents && m.torrents.length > 0) {
              poolMap.set(m.id, m);
            }
          });
        }
      });

      const fullPool = Array.from(poolMap.values());
      // Randomize / shuffle the pool so every session starts fresh and unique
      const shuffled = [...fullPool].sort(() => Math.random() - 0.5);
      setFeaturedMovies(shuffled);
    } catch (err) {
      console.warn('Using offline catalog for featured hero:', err);
      const fallbackShuffled = [...FALLBACK_FEATURED_MOVIES].sort(() => Math.random() - 0.5);
      setFeaturedMovies(validateAndCleanMovies(fallbackShuffled));
    } finally {
      setIsFeaturedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatured();
  }, [loadFeatured]);

  useEffect(() => {
    featuredSeedIdsRef.current = featuredMovies.slice(0, 5).map((m) => m.id).filter(Boolean);
  }, [featuredMovies]);

  // Lazy per-shelf loader triggered when each horizontal curated shelf scrolls near viewport
  const loadCuratedSection = useCallback(async (sectionId: string) => {
    if (route.type !== 'browse') return;
    if (requestedSectionsRef.current.has(sectionId)) return;

    const sec = CURATED_SECTIONS.find((s) => s.id === sectionId);
    if (!sec) return;

    requestedSectionsRef.current.add(sectionId);
    setSectionLoadingMap((prev) => ({ ...prev, [sectionId]: true }));

    try {
      const filterParams = {
        ...DEFAULT_FILTERS,
        ...sec.filterParams,
        limit: 20
      };

      let fetched: Movie[] = [];
      try {
        const data = await fetchMovies(filterParams);
        const cleaned = validateAndCleanMovies(data.movies || []);
        fetched = filterMoviesByParams(cleaned, sec.filterParams);
      } catch {
        fetched = [];
      }

      const seen = seenSectionMovieIdsRef.current;
      for (const hid of featuredSeedIdsRef.current) {
        seen.add(hid);
      }

      const uniqueMovies = fetched.filter((m) => !seen.has(m.id));
      const combined = [...uniqueMovies];

      if (combined.length < 8) {
        const matchingFallbacks = filterMoviesByParams(FALLBACK_FEATURED_MOVIES, sec.filterParams);
        for (const fm of matchingFallbacks) {
          if (!seen.has(fm.id) && !combined.some((c) => c.id === fm.id)) {
            combined.push(fm);
          }
        }
      }

      const finalShelf = combined.slice(0, 12);
      finalShelf.forEach((m) => seen.add(m.id));

      if (finalShelf.length > 0) {
        setSectionMovies((prev) => ({ ...prev, [sectionId]: finalShelf }));
      }
    } catch (err) {
      console.error(`Error loading curated movie section ${sectionId}:`, err);
    } finally {
      setSectionLoadingMap((prev) => ({ ...prev, [sectionId]: false }));
    }
  }, [route.type]);

  // Fetch Main Movies Catalog
  const loadMovies = useCallback(async (isSilent = false, bypassCache = false) => {
    if (route.type !== 'browse') return;

    if (!isSilent) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsRefreshingSilently(true);
    }

    try {
      const data = await fetchMovies(filters, { bypassCache });
      const newMovies = data.movies || [];
      const newTotal = data.totalCount || 0;

      // If new movies arrived while browsing page 1 of recently added catalog
      if (
        isSilent &&
        filters.page === 1 &&
        filters.sort_by === 'date_added' &&
        newMovies.length > 0 &&
        previousFirstMovieIdRef.current &&
        newMovies[0].id !== previousFirstMovieIdRef.current
      ) {
        addToast('info', 'Catalog Updated', `New release added: "${newMovies[0].title}"`);
      }

      if (newMovies.length > 0) {
        previousFirstMovieIdRef.current = newMovies[0].id;
      }

      setMovies(newMovies);
      setTotalCount(newTotal);
      lastCatalogUpdateRef.current = Date.now();
    } catch (err: any) {
      if (!isSilent) {
        setError(err?.message || 'Failed to connect to movie library. Please try again.');
        setMovies([]);
        setTotalCount(0);
      } else {
        console.debug('[CineVault] Silent catalog refresh skipped due to network:', err?.message);
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      } else {
        setIsRefreshingSilently(false);
      }
    }
  }, [filters, route.type]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  // Periodic automatic refresh every 5 minutes for newly added movies
  useEffect(() => {
    if (route.type !== 'browse') return;

    const intervalId = setInterval(() => {
      // Refresh silently only when tab is active and viewing page 1
      if (typeof document !== 'undefined' && !document.hidden && filters.page === 1) {
        loadMovies(true, true);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [route.type, filters.page, loadMovies]);

  // Automatic silent catalog refresh when visitor returns to CineVault after >= 5 minutes
  useEffect(() => {
    const checkAndRefresh = () => {
      const elapsedSinceUpdate = Date.now() - lastCatalogUpdateRef.current;
      if (
        route.type === 'browse' &&
        filters.page === 1 &&
        elapsedSinceUpdate > 5 * 60 * 1000
      ) {
        loadMovies(true, true);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAndRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkAndRefresh);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkAndRefresh);
    };
  }, [route.type, filters.page, loadMovies]);

  // Handle Navigation Category switching
  const handleNavSelect = (nav: string) => {
    if (nav === 'watchlist') {
      handleNavigateWatchlist();
      return;
    }

    if (nav === 'series' || nav === 'tv') {
      handleNavigateSeries();
      return;
    }

    if (route.type !== 'browse') {
      setRoute({ type: 'browse' });
      if (window.location.pathname !== '/') {
        window.history.pushState({ type: 'browse' }, '', '/');
      }
      updateDocumentSeo({
        breadcrumbs: [{ name: 'Home', item: '/' }]
      });
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
      updateDocumentSeo({
        breadcrumbs: [{ name: 'Home', item: '/' }]
      });
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
    const trimmed = query.trim();
    if (currentNav === 'series' || route.type === 'series') {
      handleNavigateSeries(trimmed);
      return;
    }

    if (route.type !== 'browse') {
      setRoute({ type: 'browse' });
      if (window.location.pathname !== '/') {
        window.history.pushState({ type: 'browse' }, '', '/');
      }
      updateDocumentSeo({
        breadcrumbs: [{ name: 'Home', item: '/' }]
      });
    }

    setCurrentNav('browse');
    setFilters((prev) => ({
      ...prev,
      query_term: trimmed,
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

  const handleCopyMagnet = (magnetUrl: string, title: string) => {
    navigator.clipboard.writeText(magnetUrl);
    addToast('success', 'Magnet Link Copied!', title);
  };

  const handlePlayTrailer = (ytCode: string, title: string) => {
    setTrailerData({ ytCode, title });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-neutral-100 selection:bg-rose-600 selection:text-white overflow-x-clip">
      
      <Header
        searchQuery={filters.query_term}
        onSearchChange={(q) => setFilters((prev) => ({ ...prev, query_term: q }))}
        onSearchSubmit={handleSearchSubmit}
        currentNav={route.type === 'watchlist' ? 'watchlist' : currentNav}
        onNavSelect={handleNavSelect}
        watchlistCount={watchlist.length}
        onOpenGuide={() => setIsGuideOpen(true)}
        onSelectMovie={handleSelectMovie}
        onSelectTvShow={(show) => handleSelectSeries({ imdb: show.imdb_code, title: show.name, show })}
        onSelectGenre={(genre) => {
          if (route.type !== 'browse') {
            setRoute({ type: 'browse' });
            if (window.location.pathname !== '/') {
              window.history.pushState({ type: 'browse' }, '', `/?genre=${encodeURIComponent(genre)}`);
            }
            updateDocumentSeo({
              breadcrumbs: [{ name: 'Home', item: '/' }]
            });
          }
          setCurrentNav('browse');
          setFilters((prev) => ({
            ...prev,
            genre: genre,
            page: 1
          }));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenPolicy={(tab) => setPolicyModalTab(tab)}
        onOpenSpinner={() => setIsSpinnerOpen(true)}
        onOpenCineBot={() => setIsCineBotOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onRequestSearch={() => {
          if (route.type !== 'browse') {
            setRoute({ type: 'browse' });
            if (window.location.pathname !== '/') {
              window.history.pushState({ type: 'browse' }, '', '/');
            }
            updateDocumentSeo({
              breadcrumbs: [{ name: 'Home', item: '/' }]
            });
          }
          setCurrentNav('browse');
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {route.type === 'series' ? (
          <Suspense fallback={<RouteSuspenseFallback />}>
            <EztvView
              initialQuery={route.seriesQuery}
              initialImdb={route.seriesImdb}
              initialGenre={route.seriesGenre}
              onShowToast={(msg, type) => addToast(type || 'info', msg)}
              onOpenGuide={() => setIsGuideOpen(true)}
              onSelectSeries={handleSelectSeries}
            />
          </Suspense>
        ) : route.type === 'series_detail' ? (
          <Suspense fallback={<RouteSuspenseFallback />}>
            <SeriesDetailPage
              key={route.slug || route.seriesImdb || route.seriesQuery || 'series-detail'}
              seriesId={route.slug || route.seriesImdb || undefined}
              seriesTitle={route.seriesQuery}
              initialShow={route.seriesShow}
              initialTorrent={route.seriesTorrent}
              onBack={handleBack}
            onNavigateHome={handleNavigateHome}
            onNavigateToSeries={handleNavigateSeries}
            onSelectSeries={handleSelectSeries}
            onSelectGenre={(_genre) => {
              handleNavigateSeries(undefined, undefined);
            }}
            onPlayTrailer={handlePlayTrailer}
            onCopyMagnet={handleCopyMagnet}
            onShowToast={(msg, type) => addToast(type || 'info', msg)}
            onOpenGuide={() => setIsGuideOpen(true)}
            onOpenFilmography={handleOpenFilmography}
            onAskCineBot={handleOpenCineBotWithPrompt}
            isWatchlisted={(idOrImdb) => {
              return watchlist.some(
                (m) =>
                  String(m.id) === String(idOrImdb) ||
                  m.imdb_code === String(idOrImdb) ||
                  m.title.toLowerCase() === String(idOrImdb).toLowerCase()
              );
            }}
            onToggleWatchlist={(show) => {
              const asMovie: Movie = {
                id: show.id || Math.floor(Math.random() * 900000) + 100000,
                url: `https://yts.mx/movies/${show.imdb_code || 'tv-series'}`,
                imdb_code: show.imdb_code || '',
                title: show.name,
                title_english: show.name,
                title_long: `${show.name} (${show.year || 'Series'})`,
                slug: show.imdb_code || show.name.toLowerCase().replace(/\s+/g, '-'),
                year: show.year ? parseInt(show.year, 10) : new Date().getFullYear(),
                rating: show.rating || 8.0,
                runtime: 60,
                genres: show.genres || ['Drama'],
                summary: show.summary || '',
                description_full: show.summary || '',
                synopsis: show.summary || '',
                language: 'English',
                mpa_rating: 'TV-MA',
                background_image: show.image || '',
                background_image_original: show.image || '',
                small_cover_image: show.image || '',
                medium_cover_image: show.image || '',
                large_cover_image: show.image || '',
                yt_trailer_code: '',
                state: 'ok',
                torrents: [],
                date_uploaded: new Date().toISOString(),
                date_uploaded_unix: Math.floor(Date.now() / 1000)
              };
              handleToggleWatchlist(asMovie);
            }}
          />
          </Suspense>
        ) : route.type === 'movie' ? (
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
                  <span>Back</span>
                </button>
              </div>
            ) : route.movie ? (
              <Suspense fallback={<RouteSuspenseFallback />}>
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
                    updateDocumentSeo({
                      breadcrumbs: [{ name: 'Home', item: '/' }]
                    });
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
                  onOpenFilmography={handleOpenFilmography}
                  onAskCineBot={handleOpenCineBotWithPrompt}
                  onNavigateToSeries={handleNavigateSeries}
                  onSelectSeries={handleSelectSeries}
                />
              </Suspense>
            ) : null}
          </div>
        ) : route.type === 'watchlist' ? (
          <Suspense fallback={<RouteSuspenseFallback />}>
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
          </Suspense>
        ) : (
          <>
            {currentNav === 'browse' && !filters.query_term && filters.page === 1 && filters.quality === 'All' && (
              <FeaturedHero
                movies={featuredMovies}
                genreMovies={movies}
                selectedGenre={filters.genre}
                onSelectGenre={(genre) => {
                  setFilters((prev) => ({
                    ...prev,
                    genre,
                    page: 1
                  }));
                }}
                onSelectMovie={handleSelectMovie}
                onPlayTrailer={handlePlayTrailer}
                onCopyMagnet={handleCopyMagnet}
                isWatchlisted={isMovieWatchlisted}
                onToggleWatchlist={handleToggleWatchlist}
                onRefreshHero={loadFeatured}
              />
            )}

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

            <AdSenseSlot format="auto" responsive={true} className="my-6" />

            <div id="movie-catalog-section" className="space-y-4 my-8 [contain:layout_style]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className={`text-xl sm:text-2xl font-black font-display flex items-center gap-2.5 ${
                    isWhite ? 'text-slate-900' : 'text-white'
                  }`}>
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
                        : filters.sort_by === 'date_added'
                        ? 'Recently Added & Latest Films'
                        : 'Explore Films'}
                    </span>
                  </h1>
                  <p className={`text-xs sm:text-sm mt-0.5 ${isWhite ? 'text-slate-600' : 'text-neutral-400'}`}>
                    {filters.query_term
                      ? 'Displaying matching titles across all years from the full cinematic archive'
                      : 'Stream trailers, view metadata, and download high-quality files with magnet links'}
                  </p>
                </div>

                {/* Header Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <MovieSortDropdown
                    sortBy={filters.sort_by}
                    orderBy={filters.order_by}
                    totalResults={totalCount}
                    isLoading={isLoading}
                    onSortChange={(sort_by, order_by) => {
                      handleFilterChange({ sort_by, order_by, page: 1 });
                    }}
                  />
                </div>
              </div>

              <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                totalResults={totalCount}
                isLoading={isLoading}
                onReset={handleResetFilters}
              />

              {/* Results Count & Quick Sort Status Toolbar */}
              <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-colors shadow-xs ${
                isWhite
                  ? 'bg-white border-slate-200'
                  : colorMode === 'blue-black'
                  ? 'bg-[#091124] border-sky-900/40'
                  : 'bg-[#101010] border-white/10'
              }`}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={isWhite ? 'text-slate-700' : 'text-neutral-300'}>
                    Showing <strong className={isWhite ? 'text-slate-900 font-black' : 'text-white font-bold'}>{movies.length}</strong> of{' '}
                    <strong className={isWhite ? 'text-slate-900 font-black' : 'text-white font-bold'}>{totalCount.toLocaleString()}</strong> titles
                  </span>
                  {filters.genre && filters.genre !== 'All' && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                      {filters.genre}
                    </span>
                  )}
                  {filters.quality && filters.quality !== 'All' && (
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[11px] font-bold">
                      {filters.quality}
                    </span>
                  )}
                  {filters.minimum_rating > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                      ★ {filters.minimum_rating}+
                    </span>
                  )}
                  {filters.year && filters.year !== 'All' && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[11px] font-bold">
                      Year: {filters.year}
                    </span>
                  )}

                  {/* Live Catalog Status & Instant Refresh */}
                  <div className="flex items-center gap-1.5 ml-auto sm:ml-1">
                    <button
                      type="button"
                      onClick={() => loadMovies(true, true)}
                      disabled={isRefreshingSilently || isLoading}
                      title="Auto-refreshes every 5 minutes or on tab return. Click to check for new movies now."
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer select-none ${
                        isRefreshingSilently
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-xs'
                          : isWhite
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                          : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border-white/10'
                      }`}
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingSilently ? 'animate-spin text-emerald-400' : 'text-emerald-500'}`} />
                      <span>{isRefreshingSilently ? 'Updating...' : 'Live Catalog'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {/* Per-Page Selector */}
                  <div className={`hidden sm:flex items-center gap-1 px-1.5 py-1 rounded-xl border text-xs font-semibold ${
                    isWhite
                      ? 'bg-slate-100 border-slate-200 text-slate-700'
                      : colorMode === 'blue-black'
                      ? 'bg-sky-950/40 border-sky-900/40 text-neutral-300'
                      : 'bg-white/5 border-white/10 text-neutral-300'
                  }`}>
                    <span className="text-[11px] text-neutral-400 px-1">Per page:</span>
                    {[20, 30, 50].map((pageSize) => (
                      <button
                        key={pageSize}
                        type="button"
                        onClick={() => handleFilterChange({ limit: pageSize, page: 1 })}
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          filters.limit === pageSize
                            ? 'bg-rose-600 text-white shadow-xs'
                            : isWhite
                            ? 'hover:bg-slate-200 text-slate-600'
                            : 'hover:bg-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {pageSize}
                      </button>
                    ))}
                  </div>

                  <MovieSortDropdown
                    sortBy={filters.sort_by}
                    orderBy={filters.order_by}
                    totalResults={totalCount}
                    isLoading={isLoading}
                    onSortChange={(sort_by, order_by) => {
                      handleFilterChange({ sort_by, order_by, page: 1 });
                    }}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="my-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium">{error}</span>
                </div>
                <button
                  onClick={() => loadMovies()}
                  className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold rounded-full border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Retry</span>
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 my-6">
                {Array.from({ length: filters.limit || 20 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="movie-card-contain rounded-2xl bg-[#0a0a0a] border border-white/5 overflow-hidden flex flex-col select-none"
                  >
                    <div className="relative aspect-[2/3] w-full bg-[#050505] skeleton-shimmer" />
                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="h-3.5 w-10 rounded skeleton-shimmer" />
                          <div className="h-3.5 w-8 rounded skeleton-shimmer" />
                        </div>
                        <div className="h-4 w-4/5 rounded skeleton-shimmer" />
                        <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                      </div>
                      <div className="pt-2.5 border-t border-white/5 flex items-center justify-between">
                        <div className="h-3 w-20 rounded skeleton-shimmer" />
                        <div className="h-3 w-12 rounded skeleton-shimmer" />
                      </div>
                    </div>
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

            {!isLoading && totalCount > filters.limit && (
              <Pagination
                currentPage={filters.page}
                totalCount={totalCount}
                limit={filters.limit}
                onPageChange={(p) => handleFilterChange({ page: p })}
              />
            )}

            {/* Well-spaced Adsterra banner below main catalog */}
            <div className="my-10 py-3 border-y border-white/5 flex justify-center overflow-hidden [contain:layout_style]">
              <AdsterraBanner />
            </div>

            {currentNav === 'browse' && !filters.query_term && (watchlist.length > 0 || recentlyViewed.length > 0) && (
              <div className="my-10 pt-8 border-t border-white/5 min-h-[420px] [contain:layout_style]">
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

            {currentNav === 'browse' && !filters.query_term && filters.page === 1 && filters.genre === 'All' && filters.quality === 'All' && (
              <div className="space-y-6 my-10 border-t border-white/5 pt-8">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Curated Film Collections</h2>
                  <p className="text-xs text-neutral-400">Explore cinematic worlds categorized by prestigious themes and genres</p>
                </div>

                {CURATED_SECTIONS.map((section) => (
                  <MovieSectionRow
                    key={section.id}
                    section={section}
                    movies={sectionMovies[section.id] || []}
                    isLoading={sectionLoadingMap[section.id] ?? !(section.id in sectionMovies)}
                    onBecomeVisible={loadCuratedSection}
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

            {currentNav === 'browse' && !filters.query_term && filters.page === 1 && (
              <div className="my-10 border-t border-white/5 pt-8">
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
          </>
        )}

      </main>

      <Footer
        onNavigateHome={handleNavigateHome}
        onOpenPolicy={(tab) => setPolicyModalTab(tab)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <Suspense fallback={null}>
        {policyModalTab && (
          <AdSensePolicyModal
            initialTab={policyModalTab}
            onClose={() => setPolicyModalTab(null)}
          />
        )}

        <CookieConsentBanner
          onOpenPrivacy={() => setPolicyModalTab('privacy')}
        />

        {trailerData && (
          <TrailerModal
            ytTrailerCode={trailerData.ytCode}
            movieTitle={trailerData.title}
            onClose={() => setTrailerData(null)}
          />
        )}

        {isGuideOpen && (
          <DownloadGuideModal
            onClose={() => setIsGuideOpen(false)}
            onCopyAllTrackers={() => {
              addToast('success', 'Trackers Copied!', '10 high-speed trackers copied to clipboard');
            }}
          />
        )}

        {/* Comparison Drawer & Modal */}
        <MovieComparisonBar />
        {(isComparisonOpen || hasOpenedComparison) && (
          <MovieComparisonModal
            onSelectMovie={handleSelectMovie}
            onOpenFilmography={handleOpenFilmography}
            allMoviesPool={movies.length > 0 ? movies : (featuredMovies.length > 0 ? featuredMovies : [])}
          />
        )}

        {/* Filmography Explorer Modal */}
        {filmographyPerson && (
          <FilmographyModal
            personName={filmographyPerson?.name || null}
            role={filmographyPerson?.role || 'cast'}
            onClose={() => setFilmographyPerson(null)}
            onSelectMovie={handleSelectMovie}
          />
        )}

        {/* Offline Status Badge */}
        <OfflineIndicator />

        {/* Surprise Me / Movie Night Spinner */}
        {(isSpinnerOpen || hasOpenedSpinner) && (
          <MovieNightSpinnerModal
            isOpen={isSpinnerOpen}
            onClose={() => setIsSpinnerOpen(false)}
            moviesPool={movies.length > 0 ? movies : (featuredMovies.length > 0 ? featuredMovies : [])}
            onSelectMovie={handleSelectMovie}
            onWatchTrailer={(m) => {
              if (m.yt_trailer_code) {
                handlePlayTrailer(m.yt_trailer_code, m.title);
              }
            }}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
          />
        )}

        {/* CineBot AI Floating Launcher & Modal */}
        <CineBotLauncher
          isOpen={isCineBotOpen}
          onOpen={() => setIsCineBotOpen(true)}
        />

        {/* Floating Smooth Scroll to Top Button */}
        <ScrollToTopButton />

        {(isCineBotOpen || hasOpenedCineBot) && (
          <CineBotModal
            isOpen={isCineBotOpen}
            onClose={() => setIsCineBotOpen(false)}
            onSelectMovie={handleSelectMovie}
            onPlayTrailer={(ytCode, title) => {
              handlePlayTrailer(ytCode, title);
            }}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onApplyFilters={(newFilters) => {
              setFilters((prev) => ({
                ...prev,
                ...newFilters,
                page: 1
              }));
              setCurrentNav('browse');
              setRoute({ type: 'browse' });
              if (window.location.pathname !== '/') {
                window.history.pushState({ type: 'browse' }, '', '/');
              }
              addToast('info', 'Filters Applied', `Updated catalog: ${newFilters.genre || 'all genres'} ${newFilters.minimum_rating ? `(min ${newFilters.minimum_rating}★)` : ''}`);
            }}
            initialPrompt={cineBotInitialPrompt}
            onClearInitialPrompt={() => setCineBotInitialPrompt(null)}
            activeMovie={route.type === 'movie' ? route.movie : null}
            activeSeriesTitle={route.type === 'series_detail' ? (route.seriesQuery || route.seriesShow?.name) : undefined}
            activeSeriesImdb={route.type === 'series_detail' ? route.seriesImdb : undefined}
            onSelectSeries={handleSelectSeries}
            onNavigateToSeries={handleNavigateSeries}
          />
        )}

        {isShortcutsOpen && (
          <KeyboardShortcutsModal
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
            onTriggerSearch={handleFocusSearch}
            onTriggerSpinner={() => setIsSpinnerOpen(true)}
          />
        )}
      </Suspense>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}
