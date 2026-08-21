import React, { useState } from 'react';
import { Star, Download, Play, Bookmark, Copy, Check, Eye, HardDrive } from 'lucide-react';
import { Movie, buildMagnetLink } from '../types';

interface MovieCardProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
  onPlayTrailer?: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onSelect,
  onPlayTrailer,
  onCopyMagnet,
  isWatchlisted,
  onToggleWatchlist
}) => {
  const [imgError, setImgError] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Available qualities
  const qualities: string[] = Array.from(new Set(movie.torrents?.map(t => t.quality) || []));
  const has4k = qualities.some(q => typeof q === 'string' && q.includes('2160p'));
  const has1080 = qualities.some(q => typeof q === 'string' && q.includes('1080p'));
  const has3d = qualities.some(q => typeof q === 'string' && q.includes('3D'));

  // Best available torrent
  const primaryTorrent = movie.torrents?.[0];

  const handleCopyPrimaryMagnet = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!primaryTorrent) return;
    const magnetUrl = buildMagnetLink(primaryTorrent.hash, movie.title_long || movie.title);
    onCopyMagnet(magnetUrl, `${movie.title} (${primaryTorrent.quality})`);
    setCopiedHash(primaryTorrent.hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleToggleWatchlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWatchlist(movie);
  };

  const handleTrailerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (movie.yt_trailer_code && onPlayTrailer) {
      onPlayTrailer(movie.yt_trailer_code, movie.title);
    }
  };

  return (
    <div
      onClick={() => onSelect(movie)}
      className="group relative bg-[#0a0a0a] hover:bg-[#111111] border border-white/5 hover:border-rose-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-rose-950/20 flex flex-col"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#050505]">
        {!imgError ? (
          <img
            src={movie.medium_cover_image || movie.large_cover_image || movie.small_cover_image}
            alt={movie.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-neutral-900 text-neutral-500">
            <span className="text-3xl mb-2">🎬</span>
            <span className="text-xs font-semibold text-neutral-400">{movie.title}</span>
          </div>
        )}

        {/* Top Badges: Quality & Watchlist Toggle */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex flex-wrap gap-1">
            {has4k && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white rounded shadow-md">
                4K UHD
              </span>
            )}
            {has1080 && !has4k && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-neutral-200 border border-white/10 rounded shadow-md">
                1080p
              </span>
            )}
            {has3d && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white rounded shadow-md">
                3D
              </span>
            )}
          </div>

          <button
            onClick={handleToggleWatchlistClick}
            className={`pointer-events-auto p-1.5 rounded-full backdrop-blur-md border transition-all shadow-md ${
              isWatchlisted
                ? 'bg-rose-600 text-white border-rose-500 shadow-rose-900/30'
                : 'bg-black/60 text-neutral-300 hover:text-white hover:bg-black/90 border-white/10'
            }`}
            title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
            aria-label="Toggle Watchlist"
          >
            <Bookmark className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Hover Quick Action Buttons Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5 gap-2">
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelect(movie)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white text-black font-bold text-xs rounded-full hover:bg-neutral-200 shadow-lg transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Details & Files</span>
            </button>

            {movie.yt_trailer_code && (
              <button
                onClick={handleTrailerClick}
                className="p-2 bg-white/10 hover:bg-white/20 text-rose-500 hover:text-rose-400 rounded-full border border-white/20 backdrop-blur-md shadow-lg transition-colors"
                title="Watch Trailer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
          </div>

          {primaryTorrent && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyPrimaryMagnet}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white/10 hover:bg-white/20 text-neutral-200 text-[11px] font-semibold rounded-full border border-white/10 backdrop-blur-md transition-colors"
                title="Copy Magnet Link for Primary Quality"
              >
                {copiedHash === primaryTorrent.hash ? (
                  <>
                    <Check className="w-3 h-3 text-rose-400" />
                    <span className="text-rose-400">Magnet Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-neutral-300" />
                    <span>Copy Magnet ({primaryTorrent.quality})</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Card Info Details */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
        <div>
          <div className="flex items-center justify-between gap-1.5 text-xs text-neutral-400 mb-1">
            <span className="font-medium text-neutral-300">{movie.year || 'N/A'}</span>
            
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{movie.rating ? movie.rating.toFixed(1) : 'NR'}</span>
            </div>
          </div>

          <h3 className="font-display font-bold text-sm text-neutral-100 group-hover:text-rose-500 transition-colors line-clamp-1">
            {movie.title}
          </h3>

          <div className="flex flex-wrap gap-1 mt-1.5">
            {movie.genres?.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="text-[10px] font-medium text-neutral-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>

        {/* Footer info: File size & Torrents count */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-neutral-400" />
            <span>{primaryTorrent?.size || 'Multi-size'}</span>
          </div>

          <div className="flex items-center gap-1 text-neutral-400">
            <span>{movie.torrents?.length || 0} files</span>
          </div>
        </div>
      </div>
    </div>
  );
};
