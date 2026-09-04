import React, { useState, useEffect } from 'react';
import { Movie } from '../types';
import { fetchMovies } from '../services/movieApi';
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
      const filtered = (res.movies || []).filter(m => !existingIds.has(m.id));
      setRecommendedMovies(filtered.length > 0 ? filtered.slice(0, 5) : (res.movies || []).slice(0, 5));
    } catch (err) {
      console.warn('Failed to load personalized recommendations:', err);
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
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-colors cursor-pointer"
          title="Refresh recommendations"
        >
          <span aria-hidden="true" className="hidden" />
          <span>Shuffle Picks</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-2xl bg-neutral-900 animate-pulse border border-white/5" />
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
