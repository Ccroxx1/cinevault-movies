import React, { useState, useEffect } from 'react';
import { Shuffle } from 'lucide-react';
import { Movie } from '../types';
import { fetchMovies } from '../services/movieApi';
import { FALLBACK_FEATURED_MOVIES } from '../data/fallbackMovies';
import { MovieCard } from './MovieCard';

interface PersonalizedRecommendationsProps {
  watchlist: Movie[];
  recentlyViewed: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isWatchlisted: (movieId: number) => boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

export const PersonalizedRecommendations: React.FC<PersonalizedRecommendationsProps> = ({
  watchlist,
  recentlyViewed,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  isWatchlisted,
  onToggleWatchlist
}) => {
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [recommendationBasis, setRecommendationBasis] = useState<string>('Trending Discoveries');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const computeAndFetchRecommendations = async () => {
    setIsLoading(true);
    try {
      // Analyze user's favorite genres from watchlist + recently viewed
      const combined = [...watchlist, ...recentlyViewed];
      const genreCounts: Record<string, number> = {};
      
      combined.forEach(m => {
        m.genres?.forEach(g => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      });

      const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
      const topGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : null;

      let res;
      if (topGenre) {
        setRecommendationBasis(`Based on your affinity for ${topGenre} cinema`);
        res = await fetchMovies({
          genre: topGenre,
          minimum_rating: 7.0,
          sort_by: 'download_count',
          limit: 10
        });
      } else {
        setRecommendationBasis('Curated critically-acclaimed trending highlights');
        res = await fetchMovies({
          minimum_rating: 7.8,
          sort_by: 'rating',
          limit: 10
        });
      }

      // Filter out movies already in watchlist or recently viewed
      const existingIds = new Set(combined.map(m => m.id));
      const fetched = res.movies || [];
      const filtered = fetched.filter(m => !existingIds.has(m.id));
      const chosen = filtered.length > 0 ? filtered.slice(0, 5) : fetched.slice(0, 5);
      setRecommendedMovies(chosen.length > 0 ? chosen : FALLBACK_FEATURED_MOVIES.slice(0, 5));
    } catch (err) {
      console.warn('Failed to load personalized recommendations:', err);
      setRecommendedMovies((prev) => prev.length > 0 ? prev : FALLBACK_FEATURED_MOVIES.slice(0, 5));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    computeAndFetchRecommendations();
  }, [watchlist.length, recentlyViewed.length]);

  if (!isLoading && recommendedMovies.length === 0) return null;

  return (
    <section className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-display font-black text-white">
            Personalized Recommendations
          </h2>
          <p className="text-xs text-neutral-400">
            {recommendationBasis}
          </p>
        </div>

        <button
          onClick={computeAndFetchRecommendations}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh recommendations"
        >
          <Shuffle className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Shuffle Picks</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[#0a0a0a] border border-white/5 overflow-hidden flex flex-col select-none"
            >
              <div className="aspect-[2/3] w-full bg-[#050505] skeleton-shimmer" />
              <div className="p-3.5 min-h-[112px] flex-1 flex flex-col justify-between gap-2">
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
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {recommendedMovies.map((movie) => (
            <MovieCard
              key={`rec-${movie.id}`}
              movie={movie}
              onSelect={onSelectMovie}
              onPlayTrailer={onPlayTrailer}
              onCopyMagnet={onCopyMagnet}
              isWatchlisted={isWatchlisted(movie.id)}
              onToggleWatchlist={onToggleWatchlist}
            />
          ))}
        </div>
      )}
    </section>
  );
};
