import React, { useState, useEffect, useCallback } from 'react';
import { Film, Sparkles, Flame, Star, Search, RefreshCw, AlertCircle, Bookmark, Clapperboard, Heart } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { Movie, FilterParams } from './types';
import { fetchMovies } from './services/movieApi';
import { Header } from './components/Header';
import { FeaturedHero } from './components/FeaturedHero';
import { FilterBar } from './components/FilterBar';
import { MovieCard } from './components/MovieCard';
import { MovieDetailsModal } from './components/MovieDetailsModal';
import { TrailerModal } from './components/TrailerModal';
import { WatchlistView } from './components/WatchlistView';
import { DownloadGuideModal } from './components/DownloadGuideModal';
import { Pagination } from './components/Pagination';
import { ToastContainer, ToastMessage } from './components/Toast';

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

export default function App() {
  const [filters, setFilters] = useState<FilterParams>(DEFAULT_FILTERS);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation & Views
  const [currentNav, setCurrentNav] = useState<string>('browse');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [trailerData, setTrailerData] = useState<{ ytCode: string; title: string } | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  
  // Watchlist Persistence
  const [watchlist, setWatchlist] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem('cinevault_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  // Fetch Featured Carousel Movies once on mount
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const data = await fetchMovies({ sort_by: 'download_count', limit: 5 });
        if (data.movies && data.movies.length > 0) {
          setFeaturedMovies(data.movies);
        }
      } catch (err) {
        console.error('Error loading featured movies:', err);
      }
    };
    loadFeatured();
  }, []);

  // Fetch Main Movies Catalog based on active filters
  const loadMovies = useCallback(async () => {
    if (currentNav === 'watchlist') return;

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
  }, [filters, currentNav]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  // Handle Navigation Category switching
  const handleNavSelect = (nav: string) => {
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
    setFilters((prev) => ({
      ...prev,
      ...newFilters
    }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleSearchSubmit = (query: string) => {
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
        currentNav={currentNav}
        onNavSelect={handleNavSelect}
        watchlistCount={watchlist.length}
        onOpenGuide={() => setIsGuideOpen(true)}
        onSelectMovie={(m) => setSelectedMovie(m)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Watchlist View */}
        {currentNav === 'watchlist' ? (
          <WatchlistView
            watchlist={watchlist}
            onSelectMovie={(m) => setSelectedMovie(m)}
            onPlayTrailer={handlePlayTrailer}
            onCopyMagnet={handleCopyMagnet}
            onToggleWatchlist={handleToggleWatchlist}
            onClearWatchlist={() => {
              setWatchlist([]);
              addToast('info', 'Watchlist Cleared');
            }}
          />
        ) : (
          <>
            {/* Featured Hero Premiere Carousel (Only on browse homepage when no search active) */}
            {currentNav === 'browse' && !filters.query_term && filters.page === 1 && filters.genre === 'All' && filters.quality === 'All' && (
              <FeaturedHero
                movies={featuredMovies}
                onSelectMovie={(m) => setSelectedMovie(m)}
                onPlayTrailer={handlePlayTrailer}
                onCopyMagnet={handleCopyMagnet}
                isWatchlisted={isMovieWatchlisted}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}

            {/* Section Heading & Filter Bar */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black font-display text-white flex items-center gap-2.5">
                    {currentNav === 'trending' && <Flame className="w-6 h-6 text-rose-500" />}
                    {currentNav === '4k' && <Sparkles className="w-6 h-6 text-rose-400" />}
                    {currentNav === 'top' && <Star className="w-6 h-6 text-amber-400" />}
                    {currentNav === 'browse' && <Clapperboard className="w-6 h-6 text-rose-500" />}
                    
                    <span>
                      {filters.query_term
                        ? `Search: "${filters.query_term}"`
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
                    onSelect={(m) => setSelectedMovie(m)}
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

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-[#050505] mt-16 py-10 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold shadow-md shadow-rose-900/40">
                <Film className="w-4 h-4" />
              </div>
              <span className="font-display font-black text-sm text-neutral-200">
                CineVault By Sasuu
              </span>
              <span className="text-[11px] text-neutral-500 hidden sm:inline">
                — Curated High-Definition Film Discovery & Downloads
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <button
                onClick={() => setIsGuideOpen(true)}
                className="hover:text-rose-400 transition-colors cursor-pointer"
              >
                Download Guide & Trackers
              </button>
              <span>•</span>
              <button
                onClick={() => handleNavSelect('browse')}
                className="hover:text-rose-400 transition-colors cursor-pointer"
              >
                Browse All
              </button>
              <span>•</span>
              <button
                onClick={() => handleNavSelect('4k')}
                className="hover:text-rose-400 transition-colors cursor-pointer"
              >
                4K UHD
              </button>
            </div>

          </div>

          <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <p>
              Powered by the YTS REST API v2. High-speed metadata, trailers, IMDb data & magnet URIs.
            </p>
            <p className="text-neutral-600">
              CineVault By Sasuu © 2026. All film posters and stills belong to their respective copyright holders.
            </p>
          </div>
        </div>
      </footer>

      {/* Movie Details Modal */}
      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onSelectSuggestion={(sug) => setSelectedMovie(sug)}
          onPlayTrailer={handlePlayTrailer}
          onCopyMagnet={handleCopyMagnet}
          isWatchlisted={isMovieWatchlisted(selectedMovie.id)}
          onToggleWatchlist={handleToggleWatchlist}
        />
      )}

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

      {/* Vercel Web Analytics */}
      <Analytics />

    </div>
  );
}
