import React, { useState, useEffect } from 'react';
import {
  X, Star, Clock, Download, Play, Copy, Check, ExternalLink, HardDrive,
  Users, Film, ShieldAlert, Sparkles, Bookmark, Share2, ArrowDownToLine, Image as ImageIcon
} from 'lucide-react';
import { Movie, Torrent, ParentalGuide, buildMagnetLink, RECOMMENDED_TRACKERS } from '../types';
import { fetchMovieDetails, fetchMovieSuggestions, fetchParentalGuides } from '../services/movieApi';

interface MovieDetailsModalProps {
  movie: Movie;
  onClose: () => void;
  onSelectSuggestion: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({
  movie: initialMovie,
  onClose,
  onSelectSuggestion,
  onPlayTrailer,
  onCopyMagnet,
  isWatchlisted,
  onToggleWatchlist
}) => {
  const [movie, setMovie] = useState<Movie>(initialMovie);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [parentalGuides, setParentalGuides] = useState<ParentalGuide[]>([]);
  const [copiedTorrentHash, setCopiedTorrentHash] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'torrents' | 'cast' | 'screenshots' | 'guides'>('torrents');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  // Fetch full details (cast, screenshots, etc.), suggestions, and parental guides
  useEffect(() => {
    let isMounted = true;
    setLoadingDetails(true);
    setActiveTab('torrents');

    const loadData = async () => {
      try {
        const [fullDetails, sugg, guides] = await Promise.all([
          fetchMovieDetails(initialMovie.id),
          fetchMovieSuggestions(initialMovie.id),
          fetchParentalGuides(initialMovie.id)
        ]);

        if (isMounted) {
          if (fullDetails) setMovie(fullDetails);
          setSuggestions(sugg);
          setParentalGuides(guides);
        }
      } catch (err) {
        console.error('Error loading movie modal data:', err);
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [initialMovie.id]);

  // Lock background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleCopyMagnet = (torrent: Torrent) => {
    const magnetUrl = buildMagnetLink(torrent.hash, movie.title_long || movie.title);
    onCopyMagnet(magnetUrl, `${movie.title} (${torrent.quality})`);
    setCopiedTorrentHash(torrent.hash);
    setTimeout(() => setCopiedTorrentHash(null), 2500);
  };

  const screenshots = [
    movie.large_screenshot_image1 || movie.medium_screenshot_image1,
    movie.large_screenshot_image2 || movie.medium_screenshot_image2,
    movie.large_screenshot_image3 || movie.medium_screenshot_image3
  ].filter(Boolean) as string[];

  const backdropImage = movie.background_image_original || movie.background_image || screenshots[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      
      {/* Modal Card */}
      <div className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[92vh]">
        
        {/* Header Backdrop Banner */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden shrink-0 bg-[#050505]">
          {backdropImage && (
            <img
              src={backdropImage}
              alt={movie.title}
              className="w-full h-full object-cover opacity-35 blur-[0.5px]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
          
          {/* Close & Action Buttons at top right */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              onClick={() => onToggleWatchlist(movie)}
              className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                isWatchlisted
                  ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-900/30'
                  : 'bg-black/60 text-neutral-300 hover:text-white border-white/10 hover:bg-black/80'
              }`}
              title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Bookmark className={`w-4 h-4 ${isWatchlisted ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2.5 bg-black/60 hover:bg-black/80 text-neutral-400 hover:text-white rounded-full border border-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Container (Scrollable) */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-6 sm:space-y-8 -mt-28 sm:-mt-40 relative z-10">
          
          {/* Top Intro Section: Poster + Main Details */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start text-center sm:text-left">
            
            {/* Movie Poster */}
            <div className="relative w-36 sm:w-44 md:w-52 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#050505] mx-auto sm:mx-0">
              <img
                src={movie.large_cover_image || movie.medium_cover_image || movie.small_cover_image}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title & Metadata Details */}
            <div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3">
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                {movie.mpa_rating && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-neutral-800 text-neutral-300 border border-white/10 rounded">
                    {movie.mpa_rating}
                  </span>
                )}
                <span className="text-xs sm:text-sm font-semibold text-neutral-400">
                  {movie.year}
                </span>
                {movie.runtime > 0 && (
                  <>
                    <span className="text-neutral-600">•</span>
                    <span className="flex items-center gap-1 text-xs sm:text-sm text-neutral-400">
                      <Clock className="w-3.5 h-3.5" />
                      {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                    </span>
                  </>
                )}
                {movie.language && (
                  <>
                    <span className="text-neutral-600">•</span>
                    <span className="text-[10px] sm:text-xs uppercase font-mono text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-white/10">
                      {movie.language}
                    </span>
                  </>
                )}
              </div>

              <h2 className="font-display font-black text-xl sm:text-3xl md:text-4xl text-white tracking-tight leading-snug">
                {movie.title}
              </h2>

              {/* Ratings & IMDb Link */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 pt-1">
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm sm:text-base">{movie.rating?.toFixed(1) || 'N/A'}</span>
                  <span className="text-[10px] sm:text-xs text-amber-400/70 font-normal">/ 10</span>
                </div>

                {movie.imdb_code && (
                  <a
                    href={`https://www.imdb.com/title/${movie.imdb_code}/`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-amber-400 bg-white/5 hover:bg-white/10 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full border border-white/10 transition-colors"
                  >
                    <span>IMDb</span>
                    <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </a>
                )}

                {movie.yt_trailer_code && (
                  <button
                    onClick={() => onPlayTrailer(movie.yt_trailer_code, movie.title)}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg shadow-rose-900/30 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                    <span>Watch Trailer</span>
                  </button>
                )}
              </div>

              {/* Genre Pills */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 sm:gap-1.5 pt-1">
                {movie.genres?.map((g) => (
                  <span
                    key={g}
                    className="text-[10px] sm:text-xs font-semibold text-neutral-300 bg-white/5 border border-white/10 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Synopsis / Description */}
              <div className="pt-1 sm:pt-2">
                <p className="text-neutral-300 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-4 sm:line-clamp-none">
                  {movie.description_full || movie.summary || movie.synopsis || 'No description available for this title.'}
                </p>
              </div>

            </div>
          </div>

          {/* Tab Navigation Controls */}
          <div className="border-b border-white/10 flex items-center gap-6 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('torrents')}
              className={`flex items-center gap-2 pb-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'torrents'
                  ? 'border-rose-500 text-rose-500'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Downloads & Magnet Links ({movie.torrents?.length || 0})</span>
            </button>

            {movie.cast && movie.cast.length > 0 && (
              <button
                onClick={() => setActiveTab('cast')}
                className={`flex items-center gap-2 pb-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'cast'
                    ? 'border-rose-500 text-rose-500'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Cast & Characters ({movie.cast.length})</span>
              </button>
            )}

            {screenshots.length > 0 && (
              <button
                onClick={() => setActiveTab('screenshots')}
                className={`flex items-center gap-2 pb-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'screenshots'
                    ? 'border-rose-500 text-rose-500'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Screenshots ({screenshots.length})</span>
              </button>
            )}

            {parentalGuides.length > 0 && (
              <button
                onClick={() => setActiveTab('guides')}
                className={`flex items-center gap-2 pb-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'guides'
                    ? 'border-rose-500 text-rose-500'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Parental Guide ({parentalGuides.length})</span>
              </button>
            )}
          </div>

          {/* TAB 1: Torrents & Downloads Matrix */}
          {activeTab === 'torrents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Available Qualities & Formats</span>
                </h3>
                <span className="text-xs text-neutral-400 font-mono">
                  {movie.torrents?.length || 0} file versions available
                </span>
              </div>

              {movie.torrents && movie.torrents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {movie.torrents.map((torrent) => {
                    const magnetUrl = buildMagnetLink(torrent.hash, movie.title_long || movie.title);
                    const isCopied = copiedTorrentHash === torrent.hash;

                    return (
                      <div
                        key={torrent.hash}
                        className="bg-[#050505] border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-600 text-white rounded uppercase tracking-wider">
                                {torrent.quality}
                              </span>
                              <span className="text-xs font-mono uppercase text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded border border-white/10">
                                {torrent.type || 'WEB'}
                              </span>
                              {torrent.video_codec && (
                                <span className="text-[11px] font-mono text-neutral-500">
                                  {torrent.video_codec}
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-semibold text-neutral-200 mt-2">
                              File Size: <span className="text-white font-mono">{torrent.size}</span>
                            </div>
                          </div>

                          {/* Health: Seeds / Peers */}
                          <div className="text-right text-xs font-mono space-y-0.5">
                            <div className="text-emerald-400 font-bold">
                              Seeds: <span>{torrent.seeds ?? 0}</span>
                            </div>
                            <div className="text-neutral-500">
                              Peers: {torrent.peers ?? 0}
                            </div>
                          </div>
                        </div>

                        {/* Technical specs badges */}
                        <div className="flex flex-wrap gap-2 text-[11px] font-mono text-neutral-400">
                          {torrent.audio_channels && (
                            <span className="bg-[#0f0f0f] px-2 py-0.5 rounded border border-white/10">
                              Audio: {torrent.audio_channels}
                            </span>
                          )}
                          {torrent.bit_depth && (
                            <span className="bg-[#0f0f0f] px-2 py-0.5 rounded border border-white/10">
                              {torrent.bit_depth}-bit
                            </span>
                          )}
                          {torrent.date_uploaded && (
                            <span className="bg-[#0f0f0f] px-2 py-0.5 rounded border border-white/10">
                              Uploaded: {torrent.date_uploaded.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons for this Torrent */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                          
                          {/* Direct .torrent Download Button */}
                          <a
                            href={torrent.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            download
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-full shadow-md transition-colors"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                            <span>Download .torrent</span>
                          </a>

                          {/* Copy Magnet URL Button */}
                          <button
                            onClick={() => handleCopyMagnet(torrent)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-neutral-200 font-semibold text-xs rounded-full border border-white/10 transition-colors cursor-pointer"
                            title="Copy magnet link to clipboard"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-rose-400" />
                                <span className="text-rose-400 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-neutral-300" />
                                <span>Copy Magnet</span>
                              </>
                            )}
                          </button>

                          {/* Open Magnet Link Directly */}
                          <a
                            href={magnetUrl}
                            className="p-2.5 bg-white/10 hover:bg-white/20 text-rose-400 hover:text-rose-300 rounded-full border border-white/10 transition-colors"
                            title="Open Magnet in Default Torrent Client"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-400 bg-[#050505] rounded-2xl border border-white/10">
                  No torrent files currently available for this movie.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Cast & Characters */}
          {activeTab === 'cast' && movie.cast && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Cast Members</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {movie.cast.map((actor, idx) => (
                  <div
                    key={`${actor.name}-${idx}`}
                    className="flex items-center gap-3 p-3 bg-[#050505] border border-white/10 rounded-2xl"
                  >
                    {actor.url_small_image ? (
                      <img
                        src={actor.url_small_image}
                        alt={actor.name}
                        className="w-12 h-12 rounded-full object-cover shrink-0 bg-neutral-800"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-neutral-400 shrink-0">
                        {actor.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-neutral-200 truncate">{actor.name}</div>
                      <div className="text-xs text-neutral-400 truncate">{actor.character_name || 'Actor'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Screenshot Gallery */}
          {activeTab === 'screenshots' && screenshots.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Movie Stills & Screenshots</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {screenshots.map((src, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedScreenshot(src)}
                    className="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-[#050505] cursor-pointer hover:border-rose-500/60 transition-all group relative"
                  >
                    <img
                      src={src}
                      alt={`Screenshot ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs font-semibold text-white bg-black/80 px-3 py-1.5 rounded-full border border-white/20">
                        Click to enlarge
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Parental Guidance */}
          {activeTab === 'guides' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Parental Guide & Content Ratings</h3>
              <div className="space-y-3">
                {parentalGuides.map((guide, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#050505] border border-white/10 rounded-2xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-neutral-200">{guide.type}</span>
                      {guide.severity && (
                        <span className={`text-xs px-2.5 py-0.5 rounded font-semibold ${
                          guide.severity.toLowerCase() === 'severe'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : guide.severity.toLowerCase() === 'moderate'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {guide.severity}
                        </span>
                      )}
                    </div>
                    {guide.parental_guide_text && (
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {guide.parental_guide_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar Movie Suggestions Section */}
          {suggestions.length > 0 && (
            <div className="pt-6 border-t border-white/10 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-500" />
                <span>You Might Also Like</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {suggestions.map((sug) => (
                  <div
                    key={sug.id}
                    onClick={() => onSelectSuggestion(sug)}
                    className="group bg-[#050505] hover:bg-[#111111] border border-white/10 hover:border-rose-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all p-2.5 flex flex-col gap-2"
                  >
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900">
                      <img
                        src={sug.medium_cover_image || sug.small_cover_image}
                        alt={sug.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-neutral-200 group-hover:text-rose-500 truncate">
                        {sug.title}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-0.5">
                        <span>{sug.year}</span>
                        <div className="flex items-center gap-0.5 text-amber-400 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{sug.rating?.toFixed(1) || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Screenshot Lightbox Modal */}
      {selectedScreenshot && (
        <div
          onClick={() => setSelectedScreenshot(null)}
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img
              src={selectedScreenshot}
              alt="Expanded Screenshot"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl border border-white/20 shadow-2xl"
            />
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-4 right-4 p-2.5 bg-black/80 text-white rounded-full hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
