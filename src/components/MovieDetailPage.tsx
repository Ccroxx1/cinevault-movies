import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, Check, Archive, Magnet, FileDown, Layers, Sparkles } from 'lucide-react';
import { Movie, Torrent, ParentalGuide, buildMagnetLink, RECOMMENDED_TRACKERS } from '../types';
import { fetchMovieDetails, fetchMovieSuggestions, fetchParentalGuides } from '../services/movieApi';
import { getMoviePath, getMovieCanonicalUrl, updateDocumentSeo } from '../utils/seo';
import { downloadMoviePackage, downloadBrandedCompanionFile, handleBrandedMagnetDownload } from '../utils/downloadPack';
import { AdSenseSlot } from './AdSenseSlot';
import { MovieCard } from './MovieCard';
import { SubtitlesModal } from './SubtitlesModal';
import { BatchQualityModal } from './BatchQualityModal';
import { TorrentSwarmHealthBadge } from './TorrentSwarmHealthBadge';
import { DownloadSpeedEstimator } from './DownloadSpeedEstimator';
import { BookmarkPlusIcon, BookmarkIcon, PlayIcon, CopyIcon } from './ActionIcons';
import { getPosterCandidates, CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';
import { EztvMovieSection } from './EztvMovieSection';
import { useTheme } from '../context/ThemeContext';

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
  onOpenFilmography?: (name: string, role?: 'director' | 'actor' | 'cast') => void;
  onAskCineBot?: (prompt: string) => void;
  onNavigateToSeries?: () => void;
  onSelectSeries?: (params: { imdb?: string; title?: string; torrent?: any }) => void;
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
  onOpenGuide,
  onOpenFilmography,
  onAskCineBot,
  onNavigateToSeries,
  onSelectSeries
}) => {
  const { colorMode } = useTheme();
  const isWhite = colorMode === 'white';
  const isBlueBlack = colorMode === 'blue-black';

  const [movie, setMovie] = useState<Movie>(initialMovie);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [parentalGuides, setParentalGuides] = useState<ParentalGuide[]>([]);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'torrents' | 'cast' | 'screenshots' | 'guides'>('torrents');
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState<number | null>(null);
  const [isSubtitlesOpen, setIsSubtitlesOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [packagingHash, setPackagingHash] = useState<string | null>(null);
  const [packageProgress, setPackageProgress] = useState<string | null>(null);
  const [globalSpeed, setGlobalSpeed] = useState<number>(100);

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

    const breadcrumbs = [
      { name: 'Home', item: '/' },
      { name: 'Movies', item: '/' }
    ];
    if (movie.genres?.[0]) {
      breadcrumbs.push({ name: movie.genres[0], item: `/?genre=${encodeURIComponent(movie.genres[0])}` });
    }
    breadcrumbs.push({ name: movie.title, item: getMoviePath(movie) });

    updateDocumentSeo({
      title: seoTitle,
      description: seoDescription.slice(0, 160),
      canonicalUrl: canonicalUrl,
      ogImage: movie.large_cover_image || movie.background_image_original || movie.medium_cover_image,
      ogType: 'video.movie',
      movie: movie,
      breadcrumbs
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

  const handleDownloadMediaPack = async (torrent?: Torrent) => {
    const hashKey = torrent?.hash || 'primary';
    setPackagingHash(hashKey);
    setPackageProgress('Preparing Media Pack...');
    try {
      await downloadMoviePackage(movie, torrent, (msg) => {
        setPackageProgress(msg);
      });
    } catch (err) {
      console.error('Failed to download media pack:', err);
    } finally {
      setTimeout(() => {
        setPackagingHash(null);
        setPackageProgress(null);
      }, 1500);
    }
  };

  const handleDirectMagnetDownload = (e: React.MouseEvent, torrent: Torrent) => {
    e.preventDefault();
    handleBrandedMagnetDownload(movie, torrent, {
      onStart: () => {
        onCopyMagnet(
          buildMagnetLink(torrent.hash, movie.title_long || movie.title),
          `${movie.title} (${torrent.quality}) — Starting Download & CineVault Branded Info`
        );
      },
      autoCompanion: true
    });
  };

  const primaryTorrent = movie.torrents?.[0];
  const isCurrentWatchlisted = isWatchlisted(movie.id);

  const screenshots = [
    movie.large_screenshot_image1 || movie.medium_screenshot_image1,
    movie.large_screenshot_image2 || movie.medium_screenshot_image2,
    movie.large_screenshot_image3 || movie.medium_screenshot_image3,
    movie.background_image_original || movie.background_image
  ].filter((s) => typeof s === 'string' && s.trim().length > 0) as string[];

  // Keyboard navigation for screenshot lightbox preview
  useEffect(() => {
    if (selectedScreenshotIndex === null || screenshots.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedScreenshotIndex(null);
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setSelectedScreenshotIndex((prev) =>
          prev === null ? 0 : (prev + 1) % screenshots.length
        );
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedScreenshotIndex((prev) =>
          prev === null ? 0 : (prev - 1 + screenshots.length) % screenshots.length
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedScreenshotIndex, screenshots.length]);

  const rawBackdrop = movie.background_image_original || movie.background_image || screenshots[0];
  const backdropImage = (typeof rawBackdrop === 'string' && rawBackdrop.trim().length > 0) ? rawBackdrop : null;

  const posterCandidates = getPosterCandidates(movie);
  const [posterIndex, setPosterIndex] = useState(0);

  useEffect(() => {
    setPosterIndex(0);
  }, [movie.id]);

  const handlePosterError = () => {
    if (posterIndex + 1 < posterCandidates.length) {
      setPosterIndex((prev) => prev + 1);
    }
  };

  const currentPosterSrc = posterCandidates[posterIndex] || CINEVAULT_POSTER_FALLBACK;

  return (
    <article className="w-full space-y-8 animate-in fade-in duration-300">
      
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
          <span>Home</span>
        </a>
        <span aria-hidden="true">/</span>
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
            <span aria-hidden="true">/</span>
            <button
              onClick={() => onSelectGenre(movie.genres[0])}
              className="hover:text-rose-400 transition-colors cursor-pointer"
            >
              {movie.genres[0]}
            </button>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="text-neutral-200 font-semibold truncate max-w-xs sm:max-w-md">
          {movie.title} ({movie.year})
        </span>
      </nav>

      {/* Hero Movie Presentation Header */}
      <header className="movie-detail-hero hero-cinema-container relative rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl">
        
        {/* Backdrop Banner */}
        <div className="relative h-72 sm:h-96 md:h-[420px] w-full overflow-hidden bg-[#050505]">
          {backdropImage ? (
            <img
              src={backdropImage}
              alt={`${movie.title} Backdrop Still`}
              loading="eager"
              width="1280"
              height="720"
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
              className="flex items-center gap-1.5 px-3.5 py-2 bg-black/60 hover:bg-black/80 text-neutral-200 hover:text-white rounded-full border border-white/10 backdrop-blur-md text-xs font-semibold shadow-lg transition-all cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft size={15} />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSharePage}
                className="flex items-center gap-1.5 px-3 py-2 bg-black/60 hover:bg-black/80 text-neutral-200 hover:text-white rounded-full border border-white/10 backdrop-blur-md text-xs font-semibold shadow-lg transition-all cursor-pointer"
                title="Share this movie URL"
                aria-label="Share movie link"
              >
                {copiedLink ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 size={14} />
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
                {isCurrentWatchlisted ? <BookmarkIcon size={16} /> : <BookmarkPlusIcon size={16} />}
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
                key={`detail-poster-${movie.id}-${posterIndex}`}
                src={currentPosterSrc}
                alt={`${movie.title} (${movie.year}) Official Poster`}
                width="256"
                height="384"
                loading="eager"
                referrerPolicy="no-referrer"
                onError={handlePosterError}
                className="w-full h-full object-cover transition-opacity duration-300"
              />

              {movie.yt_trailer_code && (
                <button
                  onClick={() => onPlayTrailer(movie.yt_trailer_code, movie.title)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white cursor-pointer"
                >
                  <PlayIcon size={32} />
                  <span className="text-xs font-bold uppercase tracking-wider">Play Trailer</span>
                </button>
              )}
            </div>

            {/* Movie Title & Metadata Header */}
            <div className="flex-1 space-y-4 text-center md:text-left">
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="movie-hero-badge px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-rose-600 text-white rounded-lg shadow-md shadow-rose-900/30">
                  {movie.year || 'HD'}
                </span>

                {movie.mpa_rating && (
                  <span className="movie-hero-badge px-2 py-1 text-xs font-bold tracking-wider bg-neutral-800 text-neutral-200 border border-white/10 rounded-lg">
                    {movie.mpa_rating}
                  </span>
                )}

                {movie.language && (
                  <span className="movie-hero-badge px-2 py-1 text-xs font-semibold uppercase tracking-wider bg-white/5 text-neutral-300 border border-white/10 rounded-lg">
                    {movie.language}
                  </span>
                )}

                {movie.torrents?.some(t => t.quality?.includes('2160p')) && (
                  <span className="movie-hero-badge px-2 py-1 text-xs font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg">
                    4K Ultra HD
                  </span>
                )}
              </div>

              <div>
                <h1 className="movie-hero-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight drop-shadow-md">
                  {movie.title}
                </h1>
                {movie.title_english && movie.title_english !== movie.title && (
                  <p className="movie-hero-subtitle text-sm text-neutral-300 font-medium mt-1">
                    English: {movie.title_english}
                  </p>
                )}
              </div>

              <div className="movie-hero-meta-row flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6 py-2 text-xs sm:text-sm text-neutral-200">
                <div className="movie-imdb-badge flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/35 px-3 py-1.5 rounded-xl text-amber-300 font-bold">
                  <span className="text-base font-extrabold">{movie.rating ? movie.rating.toFixed(1) : 'NR'}</span>
                  <span className="text-[10px] text-amber-200/90 font-medium">/10 IMDb</span>
                </div>

                {movie.runtime > 0 && (
                  <div className="movie-meta-pill flex items-center gap-1.5 text-neutral-100 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                    <span>{movie.runtime} min ({Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m)</span>
                  </div>
                )}

                <div className="movie-meta-pill flex items-center gap-1.5 text-neutral-100 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                  <span>{movie.torrents?.length || 0} Download Formats</span>
                </div>
              </div>

              <div className="movie-hero-genres flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                {movie.genres?.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => onSelectGenre(genre)}
                    className="movie-genre-chip px-3 py-1 text-xs font-semibold text-neutral-200 bg-white/10 hover:bg-rose-600/30 hover:text-white hover:border-rose-500/40 rounded-full border border-white/15 transition-colors cursor-pointer backdrop-blur-sm"
                  >
                    {genre}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 pt-2">
                {movie.yt_trailer_code && (
                  <button
                    onClick={() => onPlayTrailer(movie.yt_trailer_code, movie.title)}
                    className="px-4 sm:px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-full shadow-lg shadow-rose-900/40 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <PlayIcon size={16} />
                    <span>Watch Trailer</span>
                  </button>
                )}

                {primaryTorrent && (
                  <>
                    <button
                      onClick={(e) => handleDirectMagnetDownload(e, primaryTorrent)}
                      className="px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-full shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all cursor-pointer"
                      title={`Launch ${primaryTorrent.quality} Magnet Download directly`}
                    >
                      <PlayIcon size={16} className="rotate-90" />
                      <span>Magnet Download ({primaryTorrent.quality})</span>
                    </button>

                    <button
                      onClick={() => handleDownloadMediaPack(primaryTorrent)}
                      disabled={packagingHash === (primaryTorrent.hash || 'primary')}
                      className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs sm:text-sm rounded-full shadow-lg shadow-amber-950/50 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-75"
                      title="Download complete folder with .Torrent file and Poster Photo"
                    >
                      {packagingHash === (primaryTorrent.hash || 'primary') ? (
                        <span>{packageProgress || 'Creating Pack...'}</span>
                      ) : (
                        <span>Download Pack + Photo (.zip)</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleCopyMagnet(primaryTorrent)}
                      className="px-4 py-2.5 bg-white text-black hover:bg-neutral-200 font-bold text-xs sm:text-sm rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                      title="Copy complete raw Magnet URI"
                    >
                      <CopyIcon size={16} />
                      {copiedHash === primaryTorrent.hash ? (
                        <span className="text-emerald-700">URI Copied!</span>
                      ) : (
                        <span>Copy Magnet URI</span>
                      )}
                    </button>
                  </>
                )}

                <button
                  onClick={() => setIsSubtitlesOpen(true)}
                  className="movie-action-pill px-4 py-2.5 bg-white/10 hover:bg-white/20 text-neutral-100 hover:text-white font-semibold text-xs sm:text-sm rounded-full border border-white/15 transition-colors flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
                >
                  <span>Subtitles</span>
                </button>

                <button
                  onClick={onOpenGuide}
                  className="movie-action-pill px-4 py-2.5 bg-white/10 hover:bg-white/20 text-neutral-100 hover:text-white font-semibold text-xs sm:text-sm rounded-full border border-white/15 transition-colors flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
                >
                  <span>How to Download</span>
                </button>

                {onAskCineBot && (
                  <button
                    onClick={() => onAskCineBot(`Recommend 3 films that share a similar mood, tension, or cinematic style with "${movie.title}" (${movie.year})`)}
                    className="px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white font-bold text-xs sm:text-sm rounded-full border border-rose-500/35 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-rose-950/30"
                    title="Ask CineBot AI for movies like this"
                  >
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    <span>Ask CineBot AI</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mid-Page AdSense */}
      <AdSenseSlot format="auto" responsive={true} />

      {/* Main Content Sections */}
      <div className="space-y-6">
        
        {/* Tabs Navigation */}
        <nav aria-label="Movie Details Navigation" className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('torrents')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'torrents' ? 'bg-rose-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Torrents & Magnets ({movie.torrents?.length || 0})</span>
          </button>

          {movie.cast && movie.cast.length > 0 && (
            <button
              onClick={() => setActiveTab('cast')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'cast' ? 'bg-rose-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>Cast & Characters ({movie.cast.length})</span>
            </button>
          )}

          {screenshots.length > 0 && (
            <button
              onClick={() => setActiveTab('screenshots')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'screenshots' ? 'bg-rose-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>Screenshots ({screenshots.length})</span>
            </button>
          )}

          {parentalGuides.length > 0 && (
            <button
              onClick={() => setActiveTab('guides')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'guides' ? 'bg-rose-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>Parental Guide ({parentalGuides.length})</span>
            </button>
          )}
        </nav>

        {/* Tab 1: Torrents & Synopsis */}
        {activeTab === 'torrents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Available Download Formats</span>
                  <span className="text-xs font-normal text-neutral-400 font-mono">
                    ({movie.torrents?.length || 0})
                  </span>
                </h2>
                {movie.torrents && movie.torrents.length > 1 && (
                  <button
                    onClick={() => setIsBatchModalOpen(true)}
                    className="text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Compare all resolutions and formats"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Compare Qualities</span>
                  </button>
                )}
              </div>

              {movie.torrents && movie.torrents.length > 0 ? (
                <div className="space-y-3">
                  {movie.torrents.map((torrent, idx) => {
                    const is4k = torrent.quality?.includes('2160p');
                    const isCopied = copiedHash === torrent.hash;
                    return (
                      <div
                        key={`${torrent.hash}-${idx}`}
                        className={`rounded-2xl border transition-all p-4 sm:p-5 flex flex-col justify-between gap-3.5 ${
                          is4k
                            ? isWhite
                              ? 'bg-amber-50/70 border-amber-300/80 shadow-xs'
                              : isBlueBlack
                              ? 'bg-gradient-to-r from-amber-950/20 via-[#0e1834] to-[#0b1328] border-amber-500/35 shadow-lg shadow-amber-950/10'
                              : 'bg-gradient-to-r from-amber-950/20 via-[#111111] to-[#0e0e0e] border-amber-500/35 shadow-lg shadow-amber-950/10'
                            : isWhite
                            ? 'bg-white hover:border-slate-300 border-slate-200 shadow-xs'
                            : isBlueBlack
                            ? 'bg-[#0b1329] border-sky-900/40 hover:border-sky-800/60'
                            : 'bg-[#0f0f0f] border-white/5 hover:border-white/15'
                        }`}
                      >
                        {/* Primary Format Bar: Technical Details & Action Toolbar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                          {/* Left: Resolution, Source, Codec, Size, and Swarm */}
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2.5 py-1 text-xs font-black rounded-lg uppercase tracking-wider ${
                                  is4k
                                    ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                                    : isWhite
                                    ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                    : 'bg-neutral-800 text-neutral-100 border border-white/10'
                                }`}
                              >
                                {torrent.quality}
                              </span>
                              <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-lg border ${
                                isWhite
                                  ? 'text-slate-700 bg-white/90 border-slate-200 shadow-2xs'
                                  : 'text-neutral-300 bg-white/5 border-white/10'
                              }`}>
                                {torrent.type || 'WEB'}
                              </span>
                              {torrent.video_codec && (
                                <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                                  isWhite
                                    ? 'text-slate-600 bg-white/90 border-slate-200'
                                    : 'text-neutral-400 bg-white/5 border-white/5'
                                }`}>
                                  {torrent.video_codec}
                                </span>
                              )}
                              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                                isWhite
                                  ? 'text-slate-900 bg-white border-slate-200 shadow-2xs'
                                  : 'text-neutral-100 bg-white/10 border-white/10'
                              }`}>
                                {torrent.size}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                              <TorrentSwarmHealthBadge seeds={torrent.seeds} peers={torrent.peers} showDetails />
                              <span className={`text-xs font-mono ${isWhite ? 'text-slate-600' : 'text-neutral-400'}`}>
                                <span className="text-emerald-500 font-semibold">{torrent.seeds} Seeds</span>
                                <span className={`mx-1.5 ${isWhite ? 'text-slate-300' : 'text-neutral-600'}`}>•</span>
                                <span>{torrent.peers} Peers</span>
                              </span>
                            </div>
                          </div>

                          {/* Right: Uniform Action Toolbar */}
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            {/* 1. Media Pack */}
                            <button
                              onClick={() => handleDownloadMediaPack(torrent)}
                              disabled={packagingHash === torrent.hash}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap ${
                                isWhite
                                  ? 'bg-amber-100 hover:bg-amber-200/80 text-amber-900 border-amber-300 shadow-2xs'
                                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                              }`}
                              title="Download ZIP media package with cover art & specs"
                            >
                              <Archive className={`w-3.5 h-3.5 ${packagingHash === torrent.hash ? 'animate-spin' : ''}`} />
                              <span>{packagingHash === torrent.hash ? 'Packaging...' : 'Media Pack'}</span>
                            </button>

                            {/* 2. Magnet Download */}
                            <button
                              onClick={(e) => handleDirectMagnetDownload(e, torrent)}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/30 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                              title="Launch BitTorrent client"
                            >
                              <Magnet className="w-3.5 h-3.5" />
                              <span>Magnet Download</span>
                            </button>

                            {/* 3. Copy URI */}
                            <button
                              onClick={() => handleCopyMagnet(torrent)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                                isCopied
                                  ? 'bg-rose-600 text-white border-rose-500'
                                  : isWhite
                                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
                                  : 'bg-white/5 hover:bg-white/15 border-white/10 text-neutral-300 hover:text-white'
                              }`}
                              title={isCopied ? 'Copied to clipboard' : 'Copy raw magnet URI'}
                              aria-label="Copy Magnet URI"
                            >
                              {isCopied ? <Check size={16} className="text-white" /> : <CopyIcon size={16} />}
                            </button>

                            {/* 4. Direct .torrent file download */}
                            {torrent.url && (
                              <a
                                href={torrent.url}
                                target="_blank"
                                rel="noreferrer noopener"
                                download
                                className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                                  isWhite
                                    ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
                                    : 'bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white'
                                }`}
                                title="Download .torrent file"
                                aria-label="Download .torrent file"
                              >
                                <FileDown className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Uniform Download Speed Estimator Strip */}
                        <div className={`pt-2.5 border-t ${isWhite ? 'border-slate-200/80' : 'border-white/5'}`}>
                          <DownloadSpeedEstimator
                            sizeBytes={torrent.size_bytes}
                            sizeFormatted={torrent.size}
                            selectedSpeed={globalSpeed}
                            onSpeedChange={setGlobalSpeed}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-neutral-500 text-sm">No files indexed for this title.</p>
              )}
            </section>

            {/* EZTV TV & Episode Releases Section */}
            {movie.imdb_code && (
              <section className="space-y-3">
                <EztvMovieSection
                  imdbCode={movie.imdb_code}
                  movieTitle={movie.title}
                  onShowToast={(msg, type) => {
                    // Feedback handled within or passed
                  }}
                  onNavigateToSeries={onNavigateToSeries}
                  onSelectSeries={onSelectSeries}
                />
              </section>
            )}

            <section className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Synopsis</h2>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  {movie.description_full || movie.summary || movie.synopsis || 'No synopsis available.'}
                </p>
                {movie.imdb_code && (
                  <div className="pt-3 border-t border-white/5">
                    <a href={`https://www.imdb.com/title/${movie.imdb_code}`} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:underline font-semibold">
                      View on IMDb ({movie.imdb_code})
                    </a>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Cast */}
        {activeTab === 'cast' && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white">Full Cast & Billing</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {movie.cast?.map((actor, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onOpenFilmography && onOpenFilmography(actor.name, 'actor')}
                  className="p-3 rounded-2xl bg-[#0e0e0e] hover:bg-[#161616] border border-white/5 hover:border-rose-500/40 flex flex-col items-center text-center gap-2 transition group cursor-pointer text-left w-full"
                  title={`Explore filmography for ${actor.name}`}
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-neutral-900 border border-white/10 group-hover:border-rose-500/50 transition flex items-center justify-center">
                    {actor.url_small_image && actor.url_small_image.trim().length > 0 ? (
                      <img
                        src={actor.url_small_image}
                        alt={actor.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-800 text-rose-400 font-bold text-lg flex items-center justify-center">
                        {actor.name ? actor.name.charAt(0) : '?'}
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <h4 className="text-xs font-bold text-neutral-200 group-hover:text-rose-400 transition-colors truncate">
                      {actor.name}
                    </h4>
                    <p className="text-[10px] text-neutral-400 truncate">{actor.character_name || 'Cast'}</p>
                    <span className="inline-block mt-1 text-[9px] text-rose-400/80 group-hover:text-rose-300 font-semibold underline">
                      View Filmography
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Tab 3: Screenshots */}
        {activeTab === 'screenshots' && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white">Movie Stills & Screenshots</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {screenshots.map((src, i) => (
                <div key={i} onClick={() => setSelectedScreenshotIndex(i)} className="aspect-video rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer group">
                  <img src={src} alt={`Screenshot ${i + 1}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 4: Parental Guide */}
        {activeTab === 'guides' && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white">Parental Advisory</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parentalGuides.map((guide, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase">{guide.type}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">{guide.severity}</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{guide.parental_guide_text}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <section className="pt-8 border-t border-white/10 space-y-4">
          <h2 className="text-lg font-bold text-white">Recommended Movies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {suggestions.slice(0, 5).map((sug) => (
              <MovieCard key={sug.id} movie={sug} onSelect={onSelectMovie} isWatchlisted={isWatchlisted(sug.id)} onToggleWatchlist={onToggleWatchlist} onPlayTrailer={onPlayTrailer} onCopyMagnet={onCopyMagnet} />
            ))}
          </div>
        </section>
      )}

      {/* Lightbox Screenshot Modal */}
      {selectedScreenshotIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedScreenshotIndex(null)}>
           <img src={screenshots[selectedScreenshotIndex]} alt="Full Screenshot" className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
           <button onClick={() => setSelectedScreenshotIndex(null)} className="mt-6 px-6 py-2 bg-rose-600 text-white font-bold rounded-full">Close Preview</button>
        </div>
      )}

      <SubtitlesModal movie={movie} isOpen={isSubtitlesOpen} onClose={() => setIsSubtitlesOpen(false)} />
      <BatchQualityModal movie={movie} isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} onCopyMagnet={onCopyMagnet} />

    </article>
  );
};
