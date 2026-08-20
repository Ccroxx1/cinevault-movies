import React, { useState } from 'react';
import { Play, Eye, Star, Clock, Sparkles, Bookmark, Copy, Check, ChevronLeft, ChevronRight, HardDrive } from 'lucide-react';
import { Movie, buildMagnetLink } from '../types';

interface FeaturedHeroProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isWatchlisted: (movieId: number) => boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

export const FeaturedHero: React.FC<FeaturedHeroProps> = ({
  movies,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  isWatchlisted,
  onToggleWatchlist
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  if (!movies || movies.length === 0) return null;

  const currentMovie = movies[currentIndex] || movies[0];
  const primaryTorrent = currentMovie.torrents?.[0];
  const backdropUrl = currentMovie.background_image_original || currentMovie.background_image || currentMovie.large_screenshot_image1;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
  };

  const handleCopyMagnet = () => {
    if (!primaryTorrent) return;
    const magnetUrl = buildMagnetLink(primaryTorrent.hash, currentMovie.title_long || currentMovie.title);
    onCopyMagnet(magnetUrl, `${currentMovie.title} (${primaryTorrent.quality})`);
    setCopiedHash(primaryTorrent.hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden mb-8 border border-white/10 bg-[#050505] shadow-2xl min-h-[480px] md:min-h-[540px] flex flex-col justify-end">
      
      {/* Background Backdrop with Dynamic Dark Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt={currentMovie.title}
            className="w-full h-full object-cover object-top opacity-30 scale-105 transition-all duration-700 blur-[0.5px]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/75 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent z-10" />
      </div>

      {/* Content Container */}
      <div className="relative z-20 p-4 sm:p-8 md:p-12 max-w-4xl space-y-3 sm:space-y-4">
        
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-widest bg-rose-600 text-white shadow-lg shadow-rose-900/30">
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
            Editor's Choice
          </span>

          <div className="flex items-center gap-1 text-amber-400 bg-black/50 border border-white/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold backdrop-blur-md">
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400" />
            <span>IMDb {currentMovie.rating?.toFixed(1) || '7.5'}</span>
          </div>

          <span className="text-[11px] sm:text-xs font-semibold text-neutral-300 bg-black/50 border border-white/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg backdrop-blur-md">
            {currentMovie.year}
          </span>

          {currentMovie.runtime > 0 && (
            <span className="flex items-center gap-1 text-[11px] sm:text-xs font-medium text-neutral-400 bg-black/50 border border-white/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg backdrop-blur-md">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{Math.floor(currentMovie.runtime / 60)}h {currentMovie.runtime % 60}m</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="font-display font-black text-2xl sm:text-4xl md:text-6xl text-white tracking-tight leading-tight">
          {currentMovie.title}
        </h1>

        {/* Genres */}
        <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-0.5">
          {currentMovie.genres?.map((g) => (
            <span
              key={g}
              className="text-[10px] sm:text-xs font-semibold text-neutral-300 bg-white/5 border border-white/10 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full backdrop-blur-md"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Synopsis / Description */}
        <p className="text-neutral-300 text-xs sm:text-sm md:text-base line-clamp-2 sm:line-clamp-3 max-w-2xl leading-relaxed">
          {currentMovie.description_full || currentMovie.summary || currentMovie.synopsis || 'Explore full movie details, high-bitrate torrents, and magnet links.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2">
          <button
            onClick={() => onSelectMovie(currentMovie)}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-7 py-2 sm:py-3 bg-white text-black font-bold text-xs sm:text-sm rounded-full hover:bg-neutral-200 transition-all shadow-xl cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Details</span>
          </button>

          {currentMovie.yt_trailer_code && (
            <button
              onClick={() => onPlayTrailer(currentMovie.yt_trailer_code, currentMovie.title)}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2 sm:py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-xs sm:text-sm rounded-full hover:bg-white/20 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current text-rose-500" />
              <span>Trailer</span>
            </button>
          )}

          {primaryTorrent && (
            <button
              onClick={handleCopyMagnet}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2 sm:py-3 bg-[#6ac045]/20 hover:bg-[#6ac045]/30 border border-[#6ac045]/40 text-[#6ac045] font-bold text-xs sm:text-sm rounded-full backdrop-blur-md transition-all cursor-pointer"
              title="Copy Magnet Link for 1-Click Torrenting"
            >
              {copiedHash === primaryTorrent.hash ? (
                <>
                  <Check className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Magnet ({primaryTorrent.quality})</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => onToggleWatchlist(currentMovie)}
            className={`p-2 sm:p-3 rounded-full border transition-all cursor-pointer backdrop-blur-md ${
              isWatchlisted(currentMovie.id)
                ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-900/30'
                : 'bg-white/10 text-neutral-300 hover:text-white border-white/20 hover:bg-white/20'
            }`}
            title={isWatchlisted(currentMovie.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
            aria-label="Toggle Watchlist"
          >
            <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWatchlisted(currentMovie.id) ? 'fill-current' : ''}`} />
          </button>
        </div>

      </div>

      {/* Carousel Navigation Arrows & Indicators */}
      {movies.length > 1 && (
        <div className="absolute right-3 bottom-3 sm:right-6 sm:bottom-6 z-20 flex items-center gap-2 sm:gap-3">
          <button
            onClick={handlePrev}
            className="p-1.5 sm:p-2.5 bg-black/60 hover:bg-black/90 text-neutral-300 hover:text-white rounded-full border border-white/10 backdrop-blur-md transition-colors"
            aria-label="Previous Featured Movie"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="flex items-center gap-1 sm:gap-2 px-1">
            {movies.slice(0, 5).map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'w-5 sm:w-8 bg-rose-600' : 'w-2.5 sm:w-4 bg-neutral-800 hover:bg-neutral-600'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="p-1.5 sm:p-2.5 bg-black/60 hover:bg-black/90 text-neutral-300 hover:text-white rounded-full border border-white/10 backdrop-blur-md transition-colors"
            aria-label="Next Featured Movie"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
