import React, { useState, useEffect } from 'react';
import {
  Star, Clock, Download, Play, Copy, Check, ExternalLink, HardDrive,
  Users, Film, ShieldAlert, Sparkles, Bookmark, Share2, ArrowLeft,
  ChevronRight, Home, Flame, Image as ImageIcon, CheckCircle, AlertCircle,
  Magnet, ChevronDown, ChevronUp, Terminal, Zap, FileText, SlidersHorizontal
} from 'lucide-react';
import { Movie, Torrent, ParentalGuide, buildMagnetLink, RECOMMENDED_TRACKERS } from '../types';
import { fetchMovieDetails, fetchMovieSuggestions, fetchParentalGuides } from '../services/movieApi';
import { getMoviePath, getMovieCanonicalUrl, updateDocumentSeo } from '../utils/seo';
import { AdSenseSlot } from './AdSenseSlot';
import { MovieCard } from './MovieCard';
import { SubtitlesModal } from './SubtitlesModal';
import { BatchQualityModal } from './BatchQualityModal';

interface MovieDetailPageProps {
  movie: Movie;
  onBack?: () => void;
  onNavigateHome: () => void;
  onSelectMovie: (movie: Movie) => void;
  onSelectGenre: (genre: string) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isWatchlisted: (movieId: number) => boolean;
  onToggleWatchlist: (movie: Movie) => void;
  onOpenGuide: () => void;
}

export const MovieDetailPage: React.FC<MovieDetailPageProps> = ({
  movie: initialMovie,
  onBack,
  onNavigateHome,
  onSelectMovie,
  onSelectGenre,
  onPlayTrailer,
  onCopyMagnet,
  isWatchlisted,
  onToggleWatchlist,
  onOpenGuide
}) => {
  const [movie, setMovie] = useState<Movie>(initialMovie);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [parentalGuides, setParentalGuides] = useState<ParentalGuide[]>([]);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'torrents' | 'cast' | 'screenshots' | 'guides'>('torrents');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [expandedMagnetHash, setExpandedMagnetHash] = useState<string | null>(null);
  const [isSubtitlesOpen, setIsSubtitlesOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Sync state if initialMovie changes
  useEffect(() => {
    setMovie(initialMovie);
  }, [initialMovie]);

  // Update dynamic SEO head tags & Schema.org JSON-LD whenever movie changes
  useEffect(() => {
    const canonicalUrl = getMovieCanonicalUrl(movie);
    const seoTitle = `${movie.title} (${movie.year || 'HD'}) — Watch Movie Details | CineVault By Sasuu`;
    const seoDescription = movie.description_full || movie.summary || movie.synopsis || 
      `Download & stream ${movie.title} (${movie.year}) in 720p, 1080p, and 4K Ultra HD. View cast, trailers, IMDb ratings, and high-speed magnet links on CineVault.`;

    updateDocumentSeo({
      title: seoTitle,
      description: seoDescription.slice(0, 160),
      canonicalUrl: canonicalUrl,
      ogImage: movie.large_cover_image || movie.background_image_original || movie.medium_cover_image,
      ogType: 'video.movie',
      movie: movie
    });

    // Scroll to top on page mount
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [movie]);

  // Fetch full details (cast, screenshots, etc.), suggestions, and parental guides
  useEffect(() => {
    let isMounted = true;
    setLoadingDetails(true);

    const loadData = async () => {
      try {
        const [fullDetails, sugg, guides] = await Promise.all([
          fetchMovieDetails(movie.id),
          fetchMovieSuggestions(movie.id),
          fetchParentalGuides(movie.id)
        ]);

        if (isMounted) {
          if (fullDetails) setMovie(fullDetails);
          setSuggestions(sugg);
          setParentalGuides(guides);
        }
      } catch (err) {
        console.error('Error loading movie page details:', err);
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [movie.id]);

  const handleCopyMagnet = (torrent: Torrent) => {
    const magnetUrl = buildMagnetLink(torrent.hash, movie.title_long || movie.title);
    onCopyMagnet(magnetUrl, `${movie.title} (${torrent.quality})`);
    setCopiedHash(torrent.hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const handleSharePage = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const primaryTorrent = movie.torrents?.[0];
  const isCurrentWatchlisted = isWatchlisted(movie.id);

  const screenshots = [
    movie.large_screenshot_image1 || movie.medium_screenshot_image1,
    movie.large_screenshot_image2 || movie.medium_screenshot_image2,
    movie.large_screenshot_image3 || movie.medium_screenshot_image3
  ].filter(Boolean) as string[];

  const backdropImage = movie.background_image_original || movie.background_image || screenshots[0];

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      
      {/* Top Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-400 py-2 border-b border-white/5 overflow-x-auto whitespace-nowrap">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </a>
        <ChevronRight className="w-3 h-3 text-neutral-600 shrink-0" />
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            if (onBack) {
              onBack();
            } else {
              onNavigateHome();
            }
          }}
          className="hover:text-white transition-colors"
        >
          Movies
        </a>
        {movie.genres?.[0] && (
          <>
            <ChevronRight className="w-3 h-3 text-neutral-600 shrink-0" />
            <button
              onClick={() => onSelectGenre(movie.genres[0])}
              className="hover:text-rose-400 transition-colors cursor-pointer"
            >
              {movie.genres[0]}
            </button>
          </>
        )}
        <ChevronRight className="w-3 h-3 text-neutral-600 shrink-0" />
        <span className="text-neutral-200 font-semibold truncate max-w-xs sm:max-w-md">
          {movie.title} ({movie.year})
        </span>
      </nav>

      {/* Hero Movie Presentation Header */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl">
        
        {/* Backdrop Banner */}
        <div className="relative h-72 sm:h-96 md:h-[420px] w-full overflow-hidden bg-[#050505]">
          {backdropImage ? (
            <img
              src={backdropImage}
              alt={`${movie.title} Backdrop`}
              className="w-full h-full object-cover object-center filter brightness-40 blur-[1px] transform scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-rose-950/40 via-neutral-900 to-[#0a0a0a]" />
          )}

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]/80" />

          {/* Top Quick Actions Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
            <button
              onClick={onBack || onNavigateHome}
              className="flex items-center gap-2 px-3.5 py-2 bg-black/60 hover:bg-black/80 text-neutral-200 hover:text-white rounded-full border border-white/10 backdrop-blur-md text-xs font-semibold shadow-lg transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSharePage}
                className="flex items-center gap-1.5 px-3 py-2 bg-black/60 hover:bg-black/80 text-neutral-200 hover:text-white rounded-full border border-white/10 backdrop-blur-md text-xs font-semibold shadow-lg transition-all cursor-pointer"
                title="Share this movie URL"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-400">URL Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Share</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onToggleWatchlist(movie)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold shadow-lg transition-all cursor-pointer ${
                  isCurrentWatchlisted
                    ? 'bg-rose-600 text-white border-rose-500 shadow-rose-900/40'
                    : 'bg-black/60 hover:bg-black/80 text-neutral-200 hover:text-white border-white/10 backdrop-blur-md'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isCurrentWatchlisted ? 'fill-current' : ''}`} />
                <span>{isCurrentWatchlisted ? 'Watchlisted' : 'Add to Watchlist'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Overlap Banner */}
        <div className="relative px-4 sm:px-8 pb-8 -mt-36 sm:-mt-48 z-10">
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
            
            {/* Poster Card */}
            <div className="shrink-0 mx-auto md:mx-0 w-48 sm:w-56 md:w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 bg-[#050505] relative group">
              <img
                src={movie.large_cover_image || movie.medium_cover_image || movie.small_cover_image}
                alt={`${movie.title} Poster`}
                className="w-full h-full object-cover"
              />

              {movie.yt_trailer_code && (
                <button
                  onClick={() => onPlayTrailer(movie.yt_trailer_code, movie.title)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-900/50">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Play Trailer</span>
                </button>
              )}
            </div>

            {/* Movie Title & Metadata Header */}
            <div className="flex-1 space-y-4 text-center md:text-left">
              
              {/* Badges row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-rose-600 text-white rounded-lg shadow-md shadow-rose-900/30">
                  {movie.year || 'HD'}
                </span>

                {movie.mpa_rating && (
                  <span className="px-2 py-1 text-xs font-bold tracking-wider bg-neutral-800 text-neutral-200 border border-white/10 rounded-lg">
                    {movie.mpa_rating}
                  </span>
                )}

                {movie.language && (
                  <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wider bg-white/5 text-neutral-300 border border-white/10 rounded-lg">
                    {movie.language}
                  </span>
                )}

                {movie.torrents?.some(t => t.quality?.includes('2160p')) && (
                  <span className="px-2 py-1 text-xs font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg">
                    4K Ultra HD
                  </span>
                )}
              </div>

              {/* Title & English Alternate */}
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight">
                  {movie.title}
                </h1>
                {movie.title_english && movie.title_english !== movie.title && (
                  <p className="text-sm text-neutral-400 font-medium mt-1">
                    English: {movie.title_english}
                  </p>
                )}
              </div>

              {/* Stats Strip: Rating, Runtime, Torrents, Likes */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6 py-2 text-xs sm:text-sm text-neutral-300">
                
                {/* IMDb Rating */}
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-amber-400 font-bold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="text-base">{movie.rating ? movie.rating.toFixed(1) : 'NR'}</span>
                  <span className="text-[10px] text-amber-400/70 font-normal">/10 IMDb</span>
                </div>

                {/* Runtime */}
                {movie.runtime > 0 && (
                  <div className="flex items-center gap-1.5 text-neutral-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    <span>{movie.runtime} min ({Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m)</span>
                  </div>
                )}

                {/* Available Files */}
                <div className="flex items-center gap-1.5 text-neutral-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                  <HardDrive className="w-4 h-4 text-rose-400" />
                  <span>{movie.torrents?.length || 0} Download Formats</span>
                </div>
              </div>

              {/* Genres List */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                {movie.genres?.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => onSelectGenre(genre)}
                    className="px-3 py-1 text-xs font-semibold text-neutral-300 bg-white/5 hover:bg-rose-600/20 hover:text-rose-400 hover:border-rose-500/30 rounded-full border border-white/10 transition-colors cursor-pointer"
                  >
                    {genre}
                  </button>
                ))}
              </div>

              {/* Action Buttons: Trailer, Magnet Download, Copy URI, Guide */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 pt-2">
                {movie.yt_trailer_code && (
                  <button
                    onClick={() => onPlayTrailer(movie.yt_trailer_code, movie.title)}
                    className="px-4 sm:px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-full shadow-lg shadow-rose-900/40 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Watch Trailer</span>
                  </button>
                )}

                {primaryTorrent && (
                  <>
                    <a
                      href={buildMagnetLink(primaryTorrent.hash, movie.title_long || movie.title)}
                      className="px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-full shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all cursor-pointer"
                      title={`Launch ${primaryTorrent.quality} Magnet Download directly in your torrent client`}
                    >
                      <Magnet className="w-4 h-4 text-emerald-200" />
                      <span>Magnet Download ({primaryTorrent.quality})</span>
                    </a>

                    <button
                      onClick={() => handleCopyMagnet(primaryTorrent)}
                      className="px-4 py-2.5 bg-white text-black hover:bg-neutral-200 font-bold text-xs sm:text-sm rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                      title="Copy complete raw Magnet URI to clipboard"
                    >
                      {copiedHash === primaryTorrent.hash ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">Magnet URI Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Magnet URI</span>
                        </>
                      )}
                    </button>
                  </>
                )}

                <button
                  onClick={() => setIsSubtitlesOpen(true)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white font-semibold text-xs sm:text-sm rounded-full border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Search & Download Synced Subtitles (YIFY, OpenSubtitles, Subscene)"
                >
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span>Subtitles</span>
                </button>

                {movie.torrents && movie.torrents.length > 1 && (
                  <button
                    onClick={() => setIsBatchModalOpen(true)}
                    className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white font-semibold text-xs sm:text-sm rounded-full border border-emerald-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Compare all resolutions & batch copy magnets"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                    <span>Compare Qualities ({movie.torrents.length})</span>
                  </button>
                )}

                <button
                  onClick={onOpenGuide}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white font-semibold text-xs sm:text-sm rounded-full border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>How to Download</span>
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Mid-Page Responsive AdSense Unit */}
      <AdSenseSlot format="auto" responsive={true} />

      {/* Main Content Tabs & Information Architecture */}
      <div className="space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('torrents')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'torrents'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Download Torrents & Magnet URIs ({movie.torrents?.length || 0})</span>
          </button>

          {movie.cast && movie.cast.length > 0 && (
            <button
              onClick={() => setActiveTab('cast')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'cast'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Cast & Characters ({movie.cast.length})</span>
            </button>
          )}

          {screenshots.length > 0 && (
            <button
              onClick={() => setActiveTab('screenshots')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'screenshots'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Screenshots ({screenshots.length})</span>
            </button>
          )}

          {parentalGuides.length > 0 && (
            <button
              onClick={() => setActiveTab('guides')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'guides'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Parental Advisory ({parentalGuides.length})</span>
            </button>
          )}
        </div>

        {/* Tab 1: Torrents & Downloads + Synopsis */}
        {activeTab === 'torrents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Torrents Table & Downloads */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-rose-500" />
                    <span>Available Download Qualities & Magnet URIs</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Direct Magnet URI downloads, 1-click clipboard URIs, and .torrent files with health indicators
                  </p>
                </div>
              </div>

              {movie.torrents && movie.torrents.length > 0 ? (
                <div className="space-y-3">
                  {movie.torrents.map((torrent, idx) => {
                    const is4k = torrent.quality?.includes('2160p');
                    const is1080 = torrent.quality?.includes('1080p');
                    const isCopied = copiedHash === torrent.hash;
                    const magnetUrl = buildMagnetLink(torrent.hash, movie.title_long || movie.title);
                    const isExpanded = expandedMagnetHash === torrent.hash;

                    return (
                      <div
                        key={`${torrent.hash}-${idx}`}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          is4k
                            ? 'bg-gradient-to-r from-amber-950/20 via-[#0e0e0e] to-[#0e0e0e] border-amber-500/30'
                            : is1080
                            ? 'bg-[#0e0e0e] border-white/10 hover:border-rose-500/40'
                            : 'bg-[#0e0e0e] border-white/5'
                        }`}
                      >
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          {/* Quality & Specs */}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 text-xs font-black rounded ${
                                  is4k
                                    ? 'bg-amber-500 text-black'
                                    : is1080
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-neutral-700 text-neutral-200'
                                }`}
                              >
                                {torrent.quality}
                              </span>
                              <span className="text-xs font-semibold text-neutral-300 uppercase">
                                {torrent.type || 'WEB-DL'}
                              </span>
                              {torrent.video_codec && (
                                <span className="text-[10px] font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                  {torrent.video_codec}
                                </span>
                              )}
                              {torrent.audio_channels && (
                                <span className="text-[10px] font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                  {torrent.audio_channels} CH
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono pt-1">
                              <span className="text-neutral-200 font-semibold">{torrent.size}</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-semibold">{torrent.seeds} Seeds</span>
                              <span>•</span>
                              <span className="text-neutral-400">{torrent.peers} Peers</span>
                            </div>
                          </div>

                          {/* Action Buttons: Magnet Download, Copy URI, Inspect URI, .Torrent */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {/* 1. Direct Magnet Download (Triggers Client) */}
                            <a
                              href={magnetUrl}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Direct Magnet Download — Click to open in qBittorrent, uTorrent, or Transmission immediately"
                            >
                              <Magnet className="w-3.5 h-3.5 text-emerald-200" />
                              <span>Magnet Download</span>
                            </a>

                            {/* 2. Copy Magnet URI */}
                            <button
                              onClick={() => handleCopyMagnet(torrent)}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                                isCopied
                                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/40'
                                  : 'bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white border-white/10'
                              }`}
                              title="Copy raw Magnet URI to clipboard"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied URI</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy URI</span>
                                </>
                              )}
                            </button>

                            {/* 3. Toggle Raw URI Inspector */}
                            <button
                              onClick={() => setExpandedMagnetHash(isExpanded ? null : torrent.hash)}
                              className={`px-2.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                                isExpanded
                                  ? 'bg-neutral-800 text-white border-white/20'
                                  : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10'
                              }`}
                              title="Inspect full Magnet URI, BTIH Hash, and Trackers"
                            >
                              <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                              <span className="hidden sm:inline">URI Details</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 text-neutral-400" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-neutral-400" />
                              )}
                            </button>

                            {/* 4. Direct .Torrent File */}
                            <a
                              href={torrent.url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Download static .torrent metadata file"
                            >
                              <Download className="w-3.5 h-3.5 text-neutral-400" />
                              <span>.Torrent</span>
                            </a>
                          </div>
                        </div>

                        {/* Collapsible Magnet URI Inspector Panel */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 bg-black/40 border-t border-white/5 space-y-3 animate-in fade-in duration-150">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
                                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Raw Magnet URI ({torrent.quality} {torrent.type})</span>
                              </div>
                              <span className="text-[11px] font-mono text-neutral-400">
                                BTIH: {torrent.hash}
                              </span>
                            </div>

                            {/* Monospace URI Text Box with Easy Selection */}
                            <div className="relative">
                              <textarea
                                readOnly
                                rows={3}
                                value={magnetUrl}
                                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                className="w-full p-2.5 bg-[#050505] text-emerald-300/90 font-mono text-[11px] rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500/50 resize-none select-all"
                              />
                            </div>

                            {/* Quick Actions inside inspector */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <div className="flex items-center gap-2">
                                <a
                                  href={magnetUrl}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                >
                                  <Magnet className="w-3 h-3" />
                                  <span>Open in Torrent Client</span>
                                </a>
                                <button
                                  onClick={() => handleCopyMagnet(torrent)}
                                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>{isCopied ? 'Copied to Clipboard' : 'Copy Full URI'}</span>
                                </button>
                              </div>

                              <p className="text-[11px] text-neutral-400">
                                Compatible with qBittorrent, Real-Debrid, Seedr, Transmission & Put.io
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#0e0e0e] border border-white/10 text-center text-xs text-neutral-400">
                  No direct files indexed for this title yet. Check back soon.
                </div>
              )}

              {/* BitTorrent Trackers Reference Card */}
              <div className="p-4 rounded-2xl bg-[#0c0c0c] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Included High-Speed Peer Trackers ({RECOMMENDED_TRACKERS.length})</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 uppercase font-mono">
                    Auto-injected into Magnet URIs
                  </span>
                </div>
                <div className="p-2.5 bg-[#050505] rounded-xl font-mono text-[10px] text-neutral-400 max-h-20 overflow-y-auto space-y-0.5 border border-white/5">
                  {RECOMMENDED_TRACKERS.map((tracker, tIdx) => (
                    <div key={tIdx} className="truncate">{tracker}</div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right 1 Col: Synopsis & Film Storyline */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Film className="w-4 h-4 text-rose-500" />
                  <span>Storyline & Synopsis</span>
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  {movie.description_full || movie.summary || movie.synopsis || 'No full synopsis provided for this title.'}
                </p>

                {movie.imdb_code && (
                  <div className="pt-3 border-t border-white/5">
                    <a
                      href={`https://www.imdb.com/title/${movie.imdb_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors font-semibold"
                    >
                      <span>View on IMDb ({movie.imdb_code})</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Cast & Characters */}
        {activeTab === 'cast' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-500" />
              <span>Full Cast & Star Billing</span>
            </h3>

            {movie.cast && movie.cast.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {movie.cast.map((actor, i) => (
                  <div
                    key={`${actor.name}-${i}`}
                    className="p-3 rounded-2xl bg-[#0e0e0e] border border-white/5 flex flex-col items-center text-center gap-2 group hover:border-white/20 transition-all"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-neutral-900 border border-white/10 shrink-0">
                      {actor.url_small_image ? (
                        <img
                          src={actor.url_small_image}
                          alt={actor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold">
                          {actor.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200 group-hover:text-rose-400 transition-colors line-clamp-1">
                        {actor.name}
                      </h4>
                      <p className="text-[10px] text-neutral-400 line-clamp-1">
                        {actor.character_name || 'Cast'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">No cast members recorded for this film.</p>
            )}
          </div>
        )}

        {/* Tab 3: Screenshots Gallery */}
        {activeTab === 'screenshots' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-rose-500" />
              <span>Film Gallery & High-Res Screen Stills</span>
            </h3>

            {screenshots.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {screenshots.map((src, i) => (
                  <div
                    key={`screenshot-${i}`}
                    onClick={() => setSelectedScreenshot(src)}
                    className="aspect-video rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 group cursor-pointer hover:border-rose-500/50 transition-all shadow-lg"
                  >
                    <img
                      src={src}
                      alt={`${movie.title} Still ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">No screen stills available for this film.</p>
            )}
          </div>
        )}

        {/* Tab 4: Parental Advisory */}
        {activeTab === 'guides' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Parental Advisory & Content Severity</span>
            </h3>

            {parentalGuides.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parentalGuides.map((guide, i) => (
                  <div
                    key={`guide-${i}`}
                    className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {guide.type}
                      </span>
                      {guide.severity && (
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            guide.severity.toLowerCase().includes('high') || guide.severity.toLowerCase().includes('severe')
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : guide.severity.toLowerCase().includes('moderate')
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
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
            ) : (
              <p className="text-xs text-neutral-500">No content advisories logged for this title.</p>
            )}
          </div>
        )}

      </div>

      {/* Related & Suggested Movies Section with Crawlable Links */}
      {suggestions.length > 0 && (
        <section className="pt-8 border-t border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  More Films Like {movie.title}
                </h3>
                <p className="text-xs text-neutral-400">
                  Recommended based on shared genres, actors, directors, and critical reception
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {suggestions.slice(0, 5).map((sug) => (
              <MovieCard
                key={`sug-${sug.id}`}
                movie={sug}
                onSelect={(m) => onSelectMovie(m)}
                onPlayTrailer={onPlayTrailer}
                onCopyMagnet={onCopyMagnet}
                isWatchlisted={isWatchlisted(sug.id)}
                onToggleWatchlist={onToggleWatchlist}
              />
            ))}
          </div>
        </section>
      )}

      {/* Lightbox Modal for Full Screenshot View */}
      {selectedScreenshot && (
        <div
          onClick={() => setSelectedScreenshot(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={selectedScreenshot}
            alt="Full Movie Still"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/20"
          />
        </div>
      )}

      {/* Subtitles Search Modal */}
      <SubtitlesModal
        movie={movie}
        isOpen={isSubtitlesOpen}
        onClose={() => setIsSubtitlesOpen(false)}
      />

      {/* Batch Quality Comparison Modal */}
      <BatchQualityModal
        movie={movie}
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onCopyMagnet={onCopyMagnet}
      />

    </div>
  );
};
