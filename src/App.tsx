import React, { useState, useEffect, useCallback } from 'react';
import { Movie, FilterParams } from './types';
import { fetchMovies, fetchMovieBySlug, validateAndCleanMovies, filterMoviesByParams } from './services/movieApi';
import { FALLBACK_FEATURED_MOVIES } from './data/fallbackMovies';
import { Header } from './components/Header';
import { FeaturedHero } from './components/FeaturedHero';
import { MovieSectionRow, CURATED_SECTIONS } from './components/MovieSectionRow';
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
import { AdsterraBanner } from './components/AdsterraBanner';
import { Footer } from './components/Footer';
import { CuratedCollections } from './components/CuratedCollections';
import { RecentlyViewedStrip } from './components/RecentlyViewedStrip';
import { PersonalizedRecommendations } from './components/PersonalizedRecommendations';
import { MovieComparisonBar } from './components/MovieComparisonBar';
import { MovieComparisonModal } from './components/MovieComparisonModal';
import { MovieNightSpinnerModal } from './components/MovieNightSpinnerModal';
import { FilmographyModal } from './components/FilmographyModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CineBotModal } from './components/CineBotModal';
import { CineBotLauncher } from './components/CineBotLauncher';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { EztvView } from './components/EztvView';
import { SeriesDetailPage } from './components/SeriesDetailPage';
import { TvShowDetails, TvShowInfo, EztvTorrent } from './types';
import { getSeriesSlug, extractShowTitleFromRelease } from './services/eztvApi';
import { getMoviePath, getMovieSlug, updateDocumentSeo } from './utils/seo';
import { refreshEzoicAds } from './utils/ezoic';

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
    return {
      route: { type: 'series', seriesQuery: searchQuery, seriesImdb: imdbId },
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
  const [initialUrlState] = useState(() => parseCurrentUrl());
  const [filters, setFilters] = useState<FilterParams>(() => ({
    ...DEFAULT_FILTERS,
    ...(initialUrlState.initialFilters || {})
  }));
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [isFeaturedLoading, setIsFeaturedLoading] = useState<boolean>(() => initialUrlState.route.type === 'browse');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(() => initialUrlState.route.type === 'browse');
  const [error, setError] = useState<string | null>(null);

  // Router State
  const [route, setRoute] = useState<AppRoute>(() => initialUrlState.route);
  const [isMovieSlugLoading, setIsMovieSlugLoading] = useState<boolean>(false);
  const [movieSlugError, setMovieSlugError] = useState<string | null>(null);

  // Curated sections state map: sectionId -> Movie[]
  const [sectionMovies, setSectionMovies] = useState<Record<string, Movie[]>>({});
  const [isSectionsLoading, setIsSectionsLoading] = useState<boolean>(() => initialUrlState.route.type === 'browse');
  
  // Navigation & Modals
  const [currentNav, setCurrentNav] = useState<string>(() => initialUrlState.currentNav);
  const [trailerData, setTrailerData] = useState<{ ytCode: string; title: string } | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSpinnerOpen, setIsSpinnerOpen] = useState<boolean>(false);
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
  const [cineBotInitialPrompt, setCineBotInitialPrompt] = useState<string | null>(null);

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

  const handleNavigateSeries = (query?: unknown, imdbId?: unknown) => {
    const safeQuery = typeof query === 'string' ? query : undefined;
    const safeImdb = typeof imdbId === 'string' ? imdbId : undefined;
    setRoute({ type: 'series', seriesQuery: safeQuery, seriesImdb: safeImdb });
    setCurrentNav('series');
    setMovieSlugError(null);

    const params = new URLSearchParams();
    if (safeQuery) params.set('search', safeQuery);
    if (safeImdb) params.set('imdb', safeImdb);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const targetUrl = `/series${queryString}`;

    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.pushState({ type: 'series', seriesQuery: safeQuery, seriesImdb: safeImdb }, '', targetUrl);
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

  // Fetch a rich, diverse pool of Featured Movies from multiple streams
  const loadFeatured = useCallback(async () => {
    if (route.type !== 'browse') return;
    setIsFeaturedLoading(true);
    try {
      // Parallel fetch across different high-quality dimensions
      const [trendingRes, recentRes, topRatedRes, actionRes] = await Promise.allSettled([
        fetchMovies({ sort_by: 'download_count', limit: 25 }),
        fetchMovies({ query_term: '2024', sort_by: 'download_count', limit: 20 }),
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

  // Fetch all Curated Homepage Sections
  useEffect(() => {
    if (route.type !== 'browse') return;
    const loadCuratedSections = async () => {
      setIsSectionsLoading(true);
      try {
        const results = await Promise.allSettled(
          CURATED_SECTIONS.map(async (sec) => {
            const filterParams = {
              ...DEFAULT_FILTERS,
              ...sec.filterParams,
              limit: 12
            };

            let validMovies: Movie[] = [];

            try {
              const data = await fetchMovies(filterParams);
              const cleaned = validateAndCleanMovies(data.movies || []);
              validMovies = filterMoviesByParams(cleaned, sec.filterParams);
            } catch {
              validMovies = [];
            }

            if (validMovies.length < 4) {
              const matchingFallbacks = filterMoviesByParams(FALLBACK_FEATURED_MOVIES, sec.filterParams);
              const additional = matchingFallbacks.filter(
                fm => !validMovies.some(vm => vm.id === fm.id)
              );
              validMovies = [...validMovies, ...additional];
            }

            validMovies = filterMoviesByParams(validMovies, sec.filterParams);

            return {
              id: sec.id,
              movies: validMovies.slice(0, 12)
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

  // Fetch Main Movies Catalog
  const loadMovies = useCallback(async () => {
    if (route.type !== 'browse') return;

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
    <div className="min-h-screen flex flex-col bg-[#050505] text-neutral-100 selection:bg-rose-600 selection:text-white">
      
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
          document.getElementById('movie-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenPolicy={(tab) => setPolicyModalTab(tab)}
        onOpenSpinner={() => setIsSpinnerOpen(true)}
        onOpenCineBot={() => setIsCineBotOpen(true)}
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
          <EztvView
            initialQuery={route.seriesQuery}
            initialImdb={route.seriesImdb}
            onShowToast={(msg, type) => addToast(type || 'info', msg)}
            onOpenGuide={() => setIsGuideOpen(true)}
            onSelectSeries={handleSelectSeries}
          />
        ) : route.type === 'series_detail' ? (
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
            ) : null}
          </div>
        ) : route.type === 'watchlist' ? (
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
          <>
            {currentNav === 'browse' && !filters.query_term && filters.page === 1 && filters.genre === 'All' && filters.quality === 'All' && (
              <FeaturedHero
                movies={featuredMovies}
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
            <AdsterraBanner />

            <div id="movie-catalog-section" className="space-y-4 my-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black font-display text-white flex items-center gap-2.5">
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
                        : 'Explore Films'}
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                    Stream trailers, view metadata, and download high-quality files with magnet links
                  </p>
                </div>
              </div>

              <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                totalResults={totalCount}
                isLoading={isLoading}
                onReset={handleResetFilters}
              />
            </div>

            {error && (
              <div className="my-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium">{error}</span>
                </div>
                <button
                  onClick={loadMovies}
                  className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold rounded-full border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Retry</span>
                </button>
              </div>
            )}

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

            <AdSenseSlot format="auto" responsive={true} className="my-8" />

            {!isLoading && totalCount > filters.limit && (
              <Pagination
                currentPage={filters.page}
                totalCount={totalCount}
                limit={filters.limit}
                onPageChange={(p) => handleFilterChange({ page: p })}
              />
            )}

            {currentNav === 'browse' && !filters.query_term && (watchlist.length > 0 || recentlyViewed.length > 0) && (
              <div className="my-10 pt-8 border-t border-white/5">
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
      />

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
      <MovieComparisonModal
        onSelectMovie={handleSelectMovie}
        onOpenFilmography={handleOpenFilmography}
        allMoviesPool={movies.length > 0 ? movies : (featuredMovies.length > 0 ? featuredMovies : [])}
      />

      {/* Filmography Explorer Modal */}
      <FilmographyModal
        personName={filmographyPerson?.name || null}
        role={filmographyPerson?.role || 'cast'}
        onClose={() => setFilmographyPerson(null)}
        onSelectMovie={handleSelectMovie}
      />

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Surprise Me / Movie Night Spinner */}
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

      {/* CineBot AI Floating Launcher & Modal */}
      <CineBotLauncher
        isOpen={isCineBotOpen}
        onOpen={() => setIsCineBotOpen(true)}
      />

      {/* Floating Smooth Scroll to Top Button */}
      <ScrollToTopButton />

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

      <ToastContainer toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}
