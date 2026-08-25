import React from 'react';
import { History, X, Trash2, Play, Download, Star, ChevronRight } from 'lucide-react';
import { Movie, Torrent, buildMagnetLink } from '../types';
import { getMoviePath } from '../utils/seo';

interface RecentlyViewedStripProps {
  recentMovies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  onClearRecent: () => void;
}

export const RecentlyViewedStrip = React.memo<RecentlyViewedStripProps>(({
  recentMovies,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  onClearRecent
}) => {
  if (!recentMovies || recentMovies.length === 0) return null;

  return (
    <section className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-rose-500">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Recently Inspected Titles</span>
              <span className="text-xs font-normal text-neutral-400 font-mono">
                ({recentMovies.length})
              </span>
            </h3>
          </div>
        </div>

        <button
          onClick={onClearRecent}
          className="text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
          title="Clear recent browsing history"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin no-scrollbar">
        {recentMovies.map((movie) => {
          const primaryTorrent = movie.torrents?.[0];
          const magnetUrl = primaryTorrent
            ? buildMagnetLink(primaryTorrent.hash, movie.title_long || movie.title)
            : null;

          return (
            <div
              key={`recent-${movie.id}`}
              className="group shrink-0 w-36 sm:w-44 bg-[#141414] hover:bg-[#1a1a1a] border border-white/10 hover:border-rose-500/40 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col justify-between"
              onClick={() => onSelectMovie(movie)}
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                <img
                  src={movie.medium_cover_image || movie.large_cover_image}
                  alt={movie.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400 flex items-center gap-0.5 border border-white/10">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  <span>{movie.rating?.toFixed(1) || 'N/A'}</span>
                </div>

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  {movie.yt_trailer_code && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrailer(movie.yt_trailer_code, movie.title);
                      }}
                      className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg cursor-pointer transition-transform hover:scale-110"
                      title="Play Trailer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}

                  {magnetUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyMagnet(magnetUrl, `${movie.title} (${primaryTorrent?.quality})`);
                      }}
                      className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer transition-transform hover:scale-110"
                      title="Copy Magnet Link"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-2.5">
                <h4 className="text-xs font-bold text-neutral-100 truncate group-hover:text-rose-400 transition-colors">
                  {movie.title}
                </h4>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1">
                  <span>{movie.year}</span>
                  <span className="truncate max-w-[70px]">{movie.genres?.[0] || 'Movie'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});
