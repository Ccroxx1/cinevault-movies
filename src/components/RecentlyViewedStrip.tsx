import React from 'react';
import { Movie, buildMagnetLink } from '../types';
import { PlayIcon } from './ActionIcons';
import { CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';

interface RecentlyViewedStripProps {
  recentMovies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  onClearRecent: () => void;
}

export const RecentlyViewedStrip: React.FC<RecentlyViewedStripProps> = ({
  recentMovies,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  onClearRecent
}) => {
  if (!recentMovies || recentMovies.length === 0) return null;

  return (
    <section className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3" aria-labelledby="recent-view-heading">
      <div className="flex items-center justify-between">
        <h2 id="recent-view-heading" className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <span>Recently Inspected Titles</span>
          <span className="text-xs font-normal text-neutral-400 font-mono">
            ({recentMovies.length})
          </span>
        </h2>

        <button
          onClick={onClearRecent}
          className="text-xs text-neutral-400 hover:text-rose-400 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
          aria-label="Clear recent browsing history"
        >
          Clear History
        </button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin no-scrollbar">
        {recentMovies.map((movie) => {
          const primaryTorrent = movie.torrents?.[0];
          const magnetUrl = primaryTorrent
            ? buildMagnetLink(primaryTorrent.hash, movie.title_long || movie.title)
            : null;

          return (
            <article
              key={`recent-${movie.id}`}
              className="group shrink-0 w-36 sm:w-44 bg-[#141414] hover:bg-[#1a1a1a] border border-white/10 hover:border-rose-500/40 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col justify-between"
              onClick={() => onSelectMovie(movie)}
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                <img
                  src={movie.medium_cover_image || movie.large_cover_image || CINEVAULT_POSTER_FALLBACK}
                  alt={`${movie.title} Poster`}
                  loading="lazy"
                  width="176"
                  height="264"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400 border border-white/10">
                  {movie.rating?.toFixed(1) || 'N/A'}
                </div>

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  {movie.yt_trailer_code && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrailer(movie.yt_trailer_code, movie.title);
                      }}
                      className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-transform hover:scale-110"
                      title="Play Trailer"
                      aria-label="Play Trailer"
                    >
                      <PlayIcon size={15} />
                    </button>
                  )}

                  {magnetUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyMagnet(magnetUrl, `${movie.title} (${primaryTorrent?.quality})`);
                      }}
                      className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-transform hover:scale-110"
                      title="Copy Magnet Link"
                      aria-label="Copy Magnet Link"
                    >
                      <span className="font-bold text-[10px]">M</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-2.5">
                <h3 className="text-xs font-bold text-neutral-100 truncate group-hover:text-rose-400 transition-colors">
                  {movie.title}
                </h3>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1">
                  <span>{movie.year}</span>
                  <span className="truncate max-w-[70px]">{movie.genres?.[0] || 'Movie'}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
