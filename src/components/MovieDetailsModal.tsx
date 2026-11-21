import React, { useState, useEffect } from 'react';
import { Movie, Torrent, ParentalGuide, buildMagnetLink, RECOMMENDED_TRACKERS } from '../types';
import { fetchMovieDetails, fetchMovieSuggestions, fetchParentalGuides } from '../services/movieApi';
import { downloadMoviePackage, handleBrandedMagnetDownload } from '../utils/downloadPack';
import { getSafeExternalUrl } from '../utils/safeUrl';
import { AdSenseSlot } from './AdSenseSlot';
import { SubtitlesModal } from './SubtitlesModal';
import { BatchQualityModal } from './BatchQualityModal';
import { 
  ArrowLeftRight, 
  Sparkles, 
  Star, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  ExternalLink,
  MessageSquare,
  Layers,
  Download,
  Users,
  Image as ImageIcon,
  ShieldAlert,
  Archive,
  Magnet,
  FileDown,
  Check,
  Share2
} from 'lucide-react';
import { BookmarkPlusIcon, BookmarkIcon, PlayIcon, CopyIcon } from './ActionIcons';
import { useMovieComparison } from '../context/MovieComparisonContext';
import { TorrentSwarmHealthBadge } from './TorrentSwarmHealthBadge';
import { DownloadSpeedEstimator } from './DownloadSpeedEstimator';
import { CINEVAULT_POSTER_FALLBACK, getPrimaryMoviePoster } from '../utils/imageFallback';
import { EztvMovieSection } from './EztvMovieSection';
import { ShareMovieModal } from './ShareMovieModal';

interface MovieDetailsModalProps {
  movie: Movie;
  onClose: () => void;
  onSelectSuggestion: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (movie: Movie) => void;
  onOpenFilmography?: (personName: string, role: 'director' | 'actor') => void;
  onAskCineBot?: (prompt: string) => void;
  onNavigateToSeries?: () => void;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({
  movie: initialMovie,
  onClose,
  onSelectSuggestion,
  onPlayTrailer,
  onCopyMagnet,
  isWatchlisted,
  onToggleWatchlist,
  onOpenFilmography,
  onAskCineBot,
  onNavigateToSeries
}) => {
  const { addToComparison, removeFromComparison, isInComparison } = useMovieComparison();
  const [movie, setMovie] = useState<Movie>(initialMovie);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [parentalGuides, setParentalGuides] = useState<ParentalGuide[]>([]);
  const [copiedTorrentHash, setCopiedTorrentHash] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'torrents' | 'cast' | 'screenshots' | 'guides'>('torrents');
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState<number | null>(null);
  const [packagingHash, setPackagingHash] = useState<string | null>(null);
  const [isSubtitlesOpen, setIsSubtitlesOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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

  const handleDownloadMediaPack = async (torrent: Torrent) => {
    setPackagingHash(torrent.hash);
    try {
      await downloadMoviePackage(movie, torrent);
    } catch (err) {
      console.error('Failed to create media pack in modal:', err);
    } finally {
      setPackagingHash(null);
    }
  };

  const handleDirectMagnet = (e: React.MouseEvent, torrent: Torrent) => {
    e.preventDefault();
    handleBrandedMagnetDownload(movie, torrent);
  };

  const screenshots = [
    movie.large_screenshot_image1 || movie.medium_screenshot_image1,
    movie.large_screenshot_image2 || movie.medium_screenshot_image2,
    movie.large_screenshot_image3 || movie.medium_screenshot_image3,
    movie.background_image_original || movie.background_image
  ].filter((s) => typeof s === 'string' && s.trim().length > 0) as string[];

  // Keyboard navigation for screenshot preview lightbox
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

  const posterUrl = getPrimaryMoviePoster(movie);

  return (
    <div
      style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={movie.title}
    >
      {/* Modal Card */}
      <div className="modal-dialog-surface relative w-full max-w-5xl cv-surface-elevated border rounded-3xl overflow-hidden my-auto flex flex-col max-h-[92vh]">

        {/* Header Backdrop Banner */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden shrink-0 bg-[#070709]">
          {backdropImage && (
            <img
              src={backdropImage}
              alt={movie.title}
              className="w-full h-full object-cover opacity-40"
            />
          )}
          <div
            style={{
              background:
                'linear-gradient(to top, var(--cv-surface-elevated) 4%, rgba(7, 7, 9, 0.52) 55%, transparent 100%)',
            }}
            className="absolute inset-0"
          />

          {/* Close & Action Buttons at top right */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="p-2.5 rounded-full border bg-black/75 text-white border-white/20 hover:bg-black/90 transition-colors cursor-pointer"
              title="Share movie poster, title & synopsis across social media"
              aria-label="Share movie"
            >
              <Share2 size={17} />
            </button>

            <button
              type="button"
              onClick={() => onToggleWatchlist(movie)}
              aria-pressed={isWatchlisted}
              className={`p-2.5 rounded-full border transition-colors cursor-pointer ${
                isWatchlisted
                  ? 'cv-btn-primary shadow-lg'
                  : 'bg-black/75 text-white border-white/20 hover:bg-black/90'
              }`}
              title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
              aria-label={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              {isWatchlisted ? <BookmarkIcon size={17} /> : <BookmarkPlusIcon size={17} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 bg-black/75 hover:bg-black/90 text-white rounded-full border border-white/20 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body Container (Scrollable) */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-6 sm:space-y-8 -mt-28 sm:-mt-40 relative z-10">

          {/* Top Intro Section: Poster + Main Details */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start text-center sm:text-left">

            {/* Movie Poster */}
            <div className="relative w-36 sm:w-44 md:w-52 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border cv-border cv-surface-muted mx-auto sm:mx-0">
              <img
                src={posterUrl}
                alt={movie.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title & Metadata Details */}
            <div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3">

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                {movie.mpa_rating && (
                  <span className="px-2 py-0.5 text-xs font-bold cv-badge-neutral border rounded">
                    {movie.mpa_rating}
                  </span>
                )}
                <span className="text-xs sm:text-sm font-semibold cv-text-muted">
                  {movie.year}
                </span>
                {movie.runtime > 0 && (
                  <>
                    <span className="cv-text-subtle">•</span>
                    <span className="flex items-center gap-1 text-xs sm:text-sm cv-text-muted">
                      <Clock className="w-3.5 h-3.5 cv-text-subtle" />
                      {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                    </span>
                  </>
                )}
                {movie.language && (
                  <>
                    <span className="cv-text-subtle">•</span>
                    <span className="text-[10px] sm:text-xs uppercase font-mono cv-badge-neutral px-2 py-0.5 rounded border">
                      {movie.language}
                    </span>
                  </>
                )}
              </div>

              <h2 className="font-display font-black text-xl sm:text-3xl md:text-4xl cv-text tracking-tight leading-snug">
                {movie.title}
              </h2>

              {/* Ratings & IMDb Link */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 pt-1">
                <div className="flex items-center gap-1.5 cv-rating-badge px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full font-bold">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm sm:text-base">{movie.rating?.toFixed(1) || 'N/A'}</span>
                  <span className="text-[10px] sm:text-xs opacity-80 font-normal">/ 10</span>
                </div>

                {movie.imdb_code && (
                  <a
                    href={`https://www.imdb.com/title/${movie.imdb_code}/`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1.5 text-xs font-semibold cv-btn-secondary px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full transition-colors"
                  >
                    <span>IMDb</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {movie.yt_trailer_code && (
                  <button
                    type="button"
                    onClick={() => onPlayTrailer(movie.yt_trailer_code, movie.title)}
                    className="flex items-center gap-1.5 text-xs font-bold cv-btn-playback px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg transition-colors cursor-pointer"
                  >
                    <PlayIcon size={16} />
                    <span>Watch Trailer</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsSubtitlesOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold cv-btn-secondary px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full transition-colors cursor-pointer"
                  title="Search and download synchronized subtitles"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Subtitles</span>
                </button>

                <button
                  type="button"
                  onClick={() => isInComparison(movie.id) ? removeFromComparison(movie.id) : addToComparison(movie)}
                  aria-pressed={isInComparison(movie.id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border transition-colors cursor-pointer ${
                    isInComparison(movie.id) ? 'cv-rating-badge' : 'cv-btn-secondary'
                  }`}
                  title="Add to Versus Mode side-by-side comparison"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 cv-rating" />
                  <span>{isInComparison(movie.id) ? 'In Versus' : 'Versus Mode'}</span>
                </button>

                {movie.torrents && movie.torrents.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold cv-badge-success border px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full transition-colors cursor-pointer hover:opacity-90"
                    title="Compare all resolutions and copy batch magnet links"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Compare Qualities ({movie.torrents.length})</span>
                  </button>
                )}

                {onAskCineBot && (
                  <button
                    type="button"
                    onClick={() => onAskCineBot(`Recommend 3 films that share a similar mood, tension, or cinematic style with "${movie.title}" (${movie.year})`)}
                    className="flex items-center text-xs font-bold cv-nav-soft-active px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full transition-all cursor-pointer shadow-sm"
                    title="Ask CineBot AI for movies like this"
                  >
                    <span>Ask CineBot AI</span>
                  </button>
                )}
              </div>

              {/* Genre Pills */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 sm:gap-1.5 pt-1">
                {movie.genres?.map((g) => (
                  <span
                    key={g}
                    className="text-[10px] sm:text-xs font-semibold cv-badge-neutral border px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Synopsis / Description */}
              <div className="pt-1 sm:pt-2">
                <p className="cv-text-secondary text-xs sm:text-sm md:text-base leading-relaxed line-clamp-4 sm:line-clamp-none">
                  {movie.description_full || movie.summary || movie.synopsis || 'No description available for this title.'}
                </p>
              </div>

            </div>
          </div>

          {/* Tab Navigation Controls */}
          <div className="border-b cv-border flex items-center gap-6 overflow-x-auto pb-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'torrents'}
              onClick={() => setActiveTab('torrents')}
              className={`flex items-center gap-2 pb-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'torrents'
                  ? 'border-[var(--cv-nav-active-bg)] cv-text-accent'
                  : 'border-transparent cv-text-muted hover:text-[var(--cv-text)]'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Downloads & Magnet Links ({movie.torrents?.length || 0})</span>
            </button>

            {movie.cast && movie.cast.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'cast'}
                onClick={() => setActiveTab('cast')}
                className={`flex items-center gap-2 pb-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'cast'
                    ? 'border-[var(--cv-nav-active-bg)] cv-text-accent'
                    : 'border-transparent cv-text-muted hover:text-[var(--cv-text)]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Cast & Characters ({movie.cast.length})</span>
              </button>
            )}

            {screenshots.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'screenshots'}
                onClick={() => setActiveTab('screenshots')}
                className={`flex items-center gap-2 pb-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'screenshots'
                    ? 'border-[var(--cv-nav-active-bg)] cv-text-accent'
                    : 'border-transparent cv-text-muted hover:text-[var(--cv-text)]'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Screenshots ({screenshots.length})</span>
              </button>
            )}

            {parentalGuides.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'guides'}
                onClick={() => setActiveTab('guides')}
                className={`flex items-center gap-2 pb-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'guides'
                    ? 'border-[var(--cv-nav-active-bg)] cv-text-accent'
                    : 'border-transparent cv-text-muted hover:text-[var(--cv-text)]'
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
                <h3 className="text-base font-bold cv-text flex items-center gap-2">
                  <span>Available Qualities & Formats</span>
                </h3>
                <span className="text-xs cv-text-muted font-mono">
                  {movie.torrents?.length || 0} file versions available
                </span>
              </div>

              {movie.torrents && movie.torrents[0] && (
                <DownloadSpeedEstimator
                  sizeBytes={movie.torrents[0].size_bytes}
                  sizeFormatted={movie.torrents[0].size}
                />
              )}

              {movie.torrents && movie.torrents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {movie.torrents.map((torrent) => {
                    const isCopied = copiedTorrentHash === torrent.hash;
                    const isPackaging = packagingHash === torrent.hash;
                    const is4k = torrent.quality.includes('2160') || torrent.quality.toLowerCase().includes('4k');

                    return (
                      <div
                        key={torrent.hash}
                        className={`${is4k ? 'cv-4k-card' : 'cv-card'} border rounded-2xl p-4 transition-all flex flex-col justify-between gap-4 shadow-sm`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 text-xs font-bold rounded uppercase tracking-wider ${is4k ? 'cv-rating-badge' : 'cv-btn-primary'}`}>
                                {torrent.quality}
                              </span>
                              <span className="text-xs font-mono uppercase cv-badge-neutral px-2 py-0.5 rounded border">
                                {torrent.type || 'WEB'}
                              </span>
                              {torrent.video_codec && (
                                <span className="text-[11px] font-mono cv-text-muted">
                                  {torrent.video_codec}
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-semibold cv-text-secondary mt-2">
                              File Size: <span className="cv-text font-mono">{torrent.size}</span>
                            </div>
                          </div>

                          {/* Health: Seeds / Peers & Swarm Badge */}
                          <div className="text-right flex flex-col items-end gap-1 font-mono">
                            <TorrentSwarmHealthBadge seeds={torrent.seeds ?? 0} peers={torrent.peers ?? 0} />
                            <div className="text-[11px] cv-text-muted">
                              {torrent.seeds ?? 0}S / {torrent.peers ?? 0}P
                            </div>
                          </div>
                        </div>

                        {/* Technical specs badges */}
                        <div className="flex flex-wrap gap-2 text-[11px] font-mono cv-text-muted">
                          {torrent.audio_channels && (
                            <span className="cv-badge-neutral px-2 py-0.5 rounded border">
                              Audio: {torrent.audio_channels} CH
                            </span>
                          )}
                          {torrent.bit_depth && (
                            <span className="cv-badge-neutral px-2 py-0.5 rounded border">
                              {torrent.bit_depth}-bit
                            </span>
                          )}
                          {torrent.date_uploaded && (
                            <span className="cv-badge-neutral px-2 py-0.5 rounded border">
                              Uploaded: {torrent.date_uploaded.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons for this Torrent */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t cv-border-subtle">
                          {/* 1. Media Pack (.zip) */}
                          <button
                            type="button"
                            onClick={() => handleDownloadMediaPack(torrent)}
                            disabled={isPackaging}
                            className="px-3 py-2 cv-rating-badge rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                            title="Download full media pack (.zip) with metadata & cover art"
                          >
                            <Archive className={`w-3.5 h-3.5 ${isPackaging ? 'animate-spin' : ''}`} />
                            <span>{isPackaging ? 'Packaging...' : 'Media Pack'}</span>
                          </button>

                          {/* 2. Direct Magnet Download */}
                          <button
                            type="button"
                            onClick={(e) => handleDirectMagnet(e, torrent)}
                            className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 cv-btn-magnet font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                            title="Direct Magnet Download (Opens your BitTorrent client)"
                          >
                            <Magnet className="w-3.5 h-3.5" />
                            <span>Magnet</span>
                          </button>

                          {/* 3. Copy Magnet URI Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyMagnet(torrent)}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 font-semibold text-xs rounded-xl transition-colors cursor-pointer ${
                              isCopied ? 'cv-btn-primary' : 'cv-btn-secondary'
                            }`}
                            title="Copy raw magnet URI to clipboard"
                          >
                            {isCopied ? (
                              <>
                                <Check size={14} />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <CopyIcon size={14} />
                                <span>Copy URI</span>
                              </>
                            )}
                          </button>

                          {/* 4. Direct .torrent Download Button */}
                          {getSafeExternalUrl(torrent.url) && (
                            <a
                              href={getSafeExternalUrl(torrent.url)!}
                              target="_blank"
                              rel="noreferrer noopener"
                              download
                              className="p-2 cv-btn-secondary rounded-xl transition-colors flex items-center justify-center"
                              title="Download .torrent file"
                              aria-label="Download .torrent file"
                            >
                              <FileDown className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center cv-text-muted cv-surface-muted rounded-2xl border cv-border">
                  No torrent files currently available for this movie.
                </div>
              )}

              {/* EZTV Series & Episode Torrents */}
              {movie.imdb_code && (
                <div className="pt-2">
                  <EztvMovieSection
                    imdbCode={movie.imdb_code}
                    movieTitle={movie.title}
                    onShowToast={(msg) => onCopyMagnet('', msg)}
                    onNavigateToSeries={() => {
                      onClose();
                      onNavigateToSeries?.();
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Cast & Characters */}
          {activeTab === 'cast' && movie.cast && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold cv-text">Cast Members</h3>
                <span className="text-xs cv-text-muted">Click any artist to explore filmography</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {movie.cast.map((actor, idx) => (
                  <button
                    type="button"
                    key={`${actor.name}-${idx}`}
                    onClick={() => onOpenFilmography && onOpenFilmography(actor.name, 'actor')}
                    className="flex items-center gap-3 p-3 cv-card-interactive border rounded-2xl cursor-pointer transition group text-left"
                    title={`Explore ${actor.name}'s filmography`}
                  >
                    {actor.url_small_image && actor.url_small_image.trim().length > 0 ? (
                      <img
                        src={actor.url_small_image}
                        alt={actor.name}
                        className="w-12 h-12 rounded-full object-cover shrink-0 cv-surface-muted border cv-border transition-all"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full cv-badge-neutral border flex items-center justify-center font-bold shrink-0 transition-colors">
                        {actor.name ? actor.name.charAt(0) : '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold cv-text-secondary cv-group-hover-accent transition-colors truncate">
                        {actor.name}
                      </div>
                      <div className="text-xs cv-text-muted truncate">{actor.character_name || 'Actor'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Screenshot Gallery */}
          {activeTab === 'screenshots' && screenshots.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold cv-text">Movie Stills & Screenshots</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {screenshots.map((src, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setSelectedScreenshotIndex(idx)}
                    className="aspect-video rounded-2xl overflow-hidden border cv-border cv-surface-muted cursor-pointer hover:border-[var(--cv-border-hover)] transition-all group relative shadow-lg"
                  >
                    <img
                      src={src}
                      alt={`Screenshot ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs font-semibold text-white bg-black/80 px-3 py-1.5 rounded-full border border-white/20">
                        Preview Still ({idx + 1}/{screenshots.length})
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Parental Guidance */}
          {activeTab === 'guides' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold cv-text">Parental Guide & Content Ratings</h3>
              <div className="space-y-3">
                {parentalGuides.map((guide, idx) => (
                  <div
                    key={idx}
                    className="p-4 cv-card border rounded-2xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm cv-text">{guide.type}</span>
                      {guide.severity && (
                        <span className={`text-xs px-2.5 py-0.5 rounded border font-semibold ${
                          guide.severity.toLowerCase() === 'severe'
                            ? 'cv-badge-error'
                            : guide.severity.toLowerCase() === 'moderate'
                            ? 'cv-badge-warning'
                            : 'cv-badge-success'
                        }`}>
                          {guide.severity}
                        </span>
                      )}
                    </div>
                    {guide.parental_guide_text && (
                      <p className="text-xs cv-text-muted leading-relaxed">
                        {guide.parental_guide_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Responsive In-Modal Ad Placement */}
          <div className="pt-4 border-t cv-border-subtle">
            <AdSenseSlot format="auto" responsive={true} className="my-2" />
          </div>

          {/* Similar Movie Suggestions Section */}
          {suggestions.length > 0 && (
            <div className="pt-6 border-t cv-border space-y-4">
              <h3 className="text-base font-bold cv-text flex items-center gap-2">
                <Sparkles className="w-4 h-4 cv-text-accent" />
                <span>You Might Also Like</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {suggestions.map((sug) => (
                  <button
                    type="button"
                    key={sug.id}
                    onClick={() => onSelectSuggestion(sug)}
                    className="group cv-card-interactive border rounded-2xl overflow-hidden cursor-pointer p-2.5 flex flex-col gap-2 text-left"
                  >
                    <div className="aspect-[2/3] w-full rounded-xl overflow-hidden cv-surface-muted">
                      <img
                        src={getPrimaryMoviePoster(sug)}
                        alt={sug.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="w-full">
                      <div className="text-xs font-bold cv-text-secondary cv-group-hover-accent truncate">
                        {sug.title}
                      </div>
                      <div className="flex items-center justify-between text-[11px] cv-text-muted mt-0.5">
                        <span>{sug.year}</span>
                        <div className="flex items-center gap-1 cv-rating font-semibold">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{sug.rating?.toFixed(1) || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Screenshot Lightbox Carousel Modal */}
      {selectedScreenshotIndex !== null && screenshots[selectedScreenshotIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedScreenshotIndex(null)}
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-3 sm:p-6 cursor-pointer select-none animate-in fade-in duration-200"
        >
          {/* Top Bar with Counter and Close */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl flex items-center justify-between py-2 text-white shrink-0 cursor-default"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-bold bg-rose-600/90 text-white px-3 py-1 rounded-full shadow-md">
                Still {selectedScreenshotIndex + 1} of {screenshots.length}
              </span>
              <span className="text-xs text-neutral-400 hidden sm:inline">
                {movie.title} • Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">←</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">→</kbd> or Click Next
              </span>
            </div>

            <button
              onClick={() => setSelectedScreenshotIndex(null)}
              className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-rose-400 transition-colors cursor-pointer border border-white/15"
              title="Close Preview (Escape)"
              aria-label="Close screenshot preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Stage with Image and Floating Next / Previous Buttons */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl flex-1 flex items-center justify-center min-h-0 my-2 cursor-default"
          >
            <img
              key={screenshots[selectedScreenshotIndex]}
              src={screenshots[selectedScreenshotIndex]}
              alt={`${movie.title} Still ${selectedScreenshotIndex + 1}`}
              className="max-w-full max-h-[70vh] sm:max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/15 transition-all animate-in fade-in zoom-in-95 duration-200"
            />

            {/* Previous Button */}
            {screenshots.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedScreenshotIndex((prev) =>
                    prev === null ? 0 : (prev - 1 + screenshots.length) % screenshots.length
                  );
                }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-black/80 hover:bg-rose-600 text-white border border-white/20 hover:border-rose-500 shadow-2xl transition-all cursor-pointer group hover:scale-110 active:scale-95"
                title="Previous Still (Left Arrow)"
                aria-label="Previous screenshot"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next Button */}
            {screenshots.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedScreenshotIndex((prev) =>
                    prev === null ? 0 : (prev + 1) % screenshots.length
                  );
                }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-black/80 hover:bg-rose-600 text-white border border-white/20 hover:border-rose-500 shadow-2xl transition-all cursor-pointer group hover:scale-110 active:scale-95"
                title="Next Still (Right Arrow or Space)"
                aria-label="Next screenshot"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Selector Strip */}
          {screenshots.length > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto py-2 shrink-0 cursor-default"
            >
              {screenshots.map((thumb, idx) => (
                <button
                  key={`thumb-modal-${idx}`}
                  onClick={() => setSelectedScreenshotIndex(idx)}
                  className={`w-16 sm:w-20 aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    idx === selectedScreenshotIndex
                      ? 'border-rose-500 scale-105 shadow-lg shadow-rose-900/40 opacity-100'
                      : 'border-white/20 opacity-50 hover:opacity-100 hover:border-white/50'
                  }`}
                  title={`Jump to still ${idx + 1}`}
                  aria-label={`Jump to screenshot ${idx + 1}`}
                >
                  <img
                    src={thumb}
                    alt={`Thumb ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
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

      {/* Social Media Share Modal */}
      <ShareMovieModal
        movie={movie}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

    </div>
  );
};
