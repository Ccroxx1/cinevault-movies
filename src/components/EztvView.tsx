import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tv,
  Search,
  Magnet,
  Check,
  ArrowUpDown,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Star,
  X,
  Film,
  Info,
  Calendar,
  ExternalLink,
  LayoutGrid,
  List
} from 'lucide-react';
import { EztvTorrent, TvShowInfo } from '../types';
import {
  fetchEztvTorrents,
  searchTvShows,
  formatEztvBytes,
  formatEztvDate,
  parseQualityFromEztv,
  extractShowTitleFromRelease,
  extractShowTitleAndYear,
  getSeriesPath,
  getCachedEztvTorrents
} from '../services/eztvApi';
import { CopyIcon } from './ActionIcons';
import { AdSenseSlot } from './AdSenseSlot';
import { getSeriesPosterCandidates, getPrimarySeriesPoster, CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';
import { useIntersectionLazyLoad } from '../hooks/useIntersectionLazyLoad';

interface EztvViewProps {
  initialQuery?: string;
  initialImdb?: string;
  initialGenre?: string;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenGuide: () => void;
  onSelectSeries?: (params: { imdb?: string; title?: string; torrent?: EztvTorrent; show?: TvShowInfo }) => void;
}

const POPULAR_SHOWS = [
  { name: 'Dark', imdb: 'tt5753856' },
  { name: 'Loki', imdb: 'tt9140554' },
  { name: 'Breaking Bad', imdb: 'tt0903747' },
  { name: 'Stranger Things', imdb: 'tt4574334' },
  { name: 'Severance', imdb: 'tt11280740' },
  { name: 'The Boys', imdb: 'tt1190634' },
  { name: 'House of the Dragon', imdb: 'tt11198330' },
  { name: 'The Last of Us', imdb: 'tt3581920' },
  { name: 'Fallout', imdb: 'tt12637874' },
  { name: 'The Bear', imdb: 'tt14452776' },
  { name: 'Friends', imdb: 'tt0108778' }
];

export const GENRE_FILTERS = ['All', 'Action', 'Crime', 'Adventure', 'Thriller', 'Mystery'];
const EZTV_PAGE_SIZE = 50;
const QUALITY_FILTERS = ['All', '1080p', '720p', '4K UHD', 'x265 / HEVC', '480p'];

interface ReleaseGridCardProps {
  torrent: EztvTorrent;
  index?: number;
  showMeta?: TvShowInfo | null;
  isCopied: boolean;
  onSelectRelease: (torrent: EztvTorrent) => void;
  onLaunchMagnet: (torrent: EztvTorrent) => void;
  onCopyMagnet: (torrent: EztvTorrent) => void;
}

const ReleaseGridCard: React.FC<ReleaseGridCardProps> = ({
  torrent,
  index,
  showMeta,
  isCopied,
  onSelectRelease,
  onLaunchMagnet,
  onCopyMagnet
}) => {
  const { quality, isHevc } = parseQualityFromEztv(torrent.title, torrent.filename);
  const { title: showTitle, year: showYear } = extractShowTitleAndYear(torrent.title);
  const cleanTitle = (torrent.clean_title || showTitle || torrent.title).trim();
  const imdbParam = (torrent.imdb_id && torrent.imdb_id !== '0')
    ? `tt${torrent.imdb_id}`
    : (showMeta?.imdb_code || '');

  const posterCandidates = useMemo(() => {
    return getSeriesPosterCandidates({
      name: cleanTitle,
      imdb_code: imdbParam,
      imdb_id: torrent.imdb_id,
      year: showYear,
      poster_url: torrent.poster_url,
      image: showMeta?.image
    });
  }, [cleanTitle, imdbParam, torrent.imdb_id, showYear, torrent.poster_url, showMeta?.image]);

  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [torrent.id, torrent.hash]);

  const handleImageError = () => {
    if (candidateIndex + 1 < posterCandidates.length) {
      setCandidateIndex((prev) => prev + 1);
    }
  };

  const currentPosterSrc = posterCandidates[candidateIndex] || CINEVAULT_POSTER_FALLBACK;

  const episodeBadge = torrent.season && torrent.episode
    ? `S${String(torrent.season).padStart(2, '0')}E${String(torrent.episode).padStart(2, '0')}`
    : torrent.season
    ? `Season ${torrent.season}`
    : 'Release';

  const isTopCard = index !== undefined && index < 6;
  const [cardRef, isObserved] = useIntersectionLazyLoad<HTMLDivElement>({
    rootMargin: '250px 0px 250px 0px',
  });
  const shouldRenderImage = isTopCard || isObserved;

  return (
    <div
      ref={cardRef}
      onClick={() => onSelectRelease(torrent)}
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 340px' }}
      className="group rounded-2xl border cv-card-interactive transition-all duration-300 flex flex-col overflow-hidden cursor-pointer shadow-md hover:shadow-xl relative"
    >
      {/* Poster */}
      <div className="aspect-[2/3] w-full cv-surface-muted relative overflow-hidden">
        {shouldRenderImage && (
          <img
            src={currentPosterSrc}
            alt={cleanTitle}
            loading="eager"
            {...(isTopCard ? { fetchPriority: 'high' } : {})}
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges (Dark poster overlays stay high-contrast white/emerald/rose) */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <span className="poster-badge px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white font-mono font-bold text-[10px] border border-white/20">
            {episodeBadge}
          </span>
          {Number(torrent.seeds || 0) > 0 && (
            <span className="poster-badge px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/40 flex items-center gap-1">
              <span>{torrent.seeds} seeds</span>
            </span>
          )}
        </div>

        {/* Bottom Poster Info */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-1">
          <span className="poster-badge px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-semibold text-white border border-white/15">
            {quality}
          </span>
          {isHevc && (
            <span className="poster-badge px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-semibold text-sky-300 border border-sky-400/40">
              x265
            </span>
          )}
          <span className="poster-badge ml-auto text-[10px] font-mono text-white bg-black/75 px-1.5 py-0.5 rounded border border-white/15">
            {formatEztvBytes(torrent.size_bytes)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold cv-text cv-group-hover-accent transition-colors line-clamp-1 leading-snug">
            {cleanTitle}
          </h3>
          <div className="flex items-center gap-1.5 cv-text-muted mt-0.5 font-mono text-[11px]">
            <span>{episodeBadge}</span>
            <span>•</span>
            <span>{formatEztvDate(torrent.date_released_unix)}</span>
          </div>
        </div>

        {/* Quick Magnet Action */}
        <div className="pt-2 border-t cv-border-subtle flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLaunchMagnet(torrent);
            }}
            className="flex-1 py-1.5 px-2.5 rounded-lg cv-btn-magnet text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            title="Get Fast Magnet"
          >
            <Magnet size={13} />
            <span>Magnet</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopyMagnet(torrent);
            }}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isCopied ? 'cv-badge-success' : 'cv-btn-secondary'
            }`}
            title="Copy magnet URL"
            aria-label="Copy magnet URL"
          >
            {isCopied ? <Check size={14} /> : <CopyIcon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

interface EztvReleaseRowProps {
  torrent: EztvTorrent;
  showMeta?: TvShowInfo | null;
  isCopied: boolean;
  onSelectRelease: (torrent: EztvTorrent) => void;
  onLaunchMagnet: (torrent: EztvTorrent) => void;
  onCopyMagnet: (torrent: EztvTorrent) => void;
}

const EztvReleaseRow: React.FC<EztvReleaseRowProps> = ({
  torrent,
  showMeta,
  isCopied,
  onSelectRelease,
  onLaunchMagnet,
  onCopyMagnet
}) => {
  const { quality, isHevc } = parseQualityFromEztv(torrent.title, torrent.filename);
  const { title: showTitle, year: showYear } = extractShowTitleAndYear(torrent.title);
  const imdbParam = (torrent.imdb_id && torrent.imdb_id !== '0') ? `tt${torrent.imdb_id}` : (showMeta?.imdb_code || '');

  const posterCandidates = useMemo(() => {
    return getSeriesPosterCandidates({
      name: showTitle,
      imdb_code: imdbParam,
      imdb_id: torrent.imdb_id,
      year: showYear,
      poster_url: torrent.poster_url,
      image: showMeta?.image
    });
  }, [showTitle, imdbParam, torrent.imdb_id, showYear, torrent.poster_url, showMeta?.image]);

  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [torrent.id, torrent.hash]);

  const handleImageError = () => {
    if (candidateIndex + 1 < posterCandidates.length) {
      setCandidateIndex((prev) => prev + 1);
    }
  };

  const currentPosterSrc = posterCandidates[candidateIndex] || CINEVAULT_POSTER_FALLBACK;
  const [rowRef, isRowVisible] = useIntersectionLazyLoad<HTMLDivElement>({
    rootMargin: '250px 0px 250px 0px',
  });

  return (
    <div
      ref={rowRef}
      onClick={() => onSelectRelease(torrent)}
      className="group p-3.5 sm:p-4 rounded-2xl border cv-card-interactive transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs cursor-pointer"
    >
      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
        {/* Real Official Show Poster Thumbnail */}
        <div className="w-12 h-16 sm:w-14 sm:h-20 cv-surface-muted rounded-xl overflow-hidden shrink-0 border cv-border relative shadow-md">
          {isRowVisible && (
            <img
              src={currentPosterSrc}
              alt={showTitle}
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
          )}
        </div>

        {/* Release Details */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Season / Episode Badge */}
            {torrent.season && torrent.episode && (
              <span className="px-2 py-0.5 rounded-md cv-nav-soft-active font-bold text-xs font-mono">
                S{String(torrent.season).padStart(2, '0')}E{String(torrent.episode).padStart(2, '0')}
              </span>
            )}

            {/* Quality Badge */}
            <span className="px-2 py-0.5 rounded-md cv-badge-neutral text-xs font-semibold border">
              {quality}
            </span>

            {/* HEVC Badge */}
            {isHevc && (
              <span className="px-2 py-0.5 rounded-md cv-badge-info border text-xs font-semibold">
                x265 / HEVC
              </span>
            )}

            {/* Curated Genre Badge */}
            {torrent.genres && torrent.genres.length > 0 && (
              <span className="px-2 py-0.5 rounded-md cv-nav-soft-active text-xs font-semibold">
                {torrent.genres.slice(0, 2).join(' • ')}
              </span>
            )}

            {/* Seeds / Peers */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border cv-badge-success text-xs font-semibold">
              <span>{torrent.seeds || 0} seeds</span>
            </span>

            <span className="text-xs cv-text-muted font-mono">
              {torrent.peers || 0} peers
            </span>

            <span className="text-[11px] cv-text-accent font-semibold group-hover:underline ml-auto hidden sm:inline-flex items-center gap-1">
              Series Details →
            </span>
          </div>

          {/* Torrent Title */}
          <h3 className="text-sm font-semibold cv-text cv-group-hover-accent transition-colors break-all leading-snug">
            {torrent.title}
          </h3>

          {/* Meta Specs Strip */}
          <div className="flex flex-wrap items-center gap-3 text-xs cv-text-muted font-mono">
            <span>{formatEztvBytes(torrent.size_bytes)}</span>
            <span>•</span>
            <span>{formatEztvDate(torrent.date_released_unix)}</span>
            {torrent.filename && (
              <>
                <span>•</span>
                <span className="cv-text-subtle truncate max-w-xs">{torrent.filename}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex flex-wrap items-center justify-end gap-2 shrink-0 w-full lg:w-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* View Details Button */}
        <button
          type="button"
          onClick={() => onSelectRelease(torrent)}
          className="px-3 py-2 rounded-xl text-xs font-semibold cv-btn-secondary flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          title="View full TV series detail page"
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Details</span>
        </button>

        {/* Magnet Download */}
        <button
          type="button"
          onClick={() => onLaunchMagnet(torrent)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold cv-btn-magnet shadow-md flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
          title="Launch BitTorrent client"
        >
          <Magnet className="w-4 h-4" />
          <span>Magnet Download</span>
        </button>

        {/* Copy Magnet */}
        <button
          type="button"
          onClick={() => onCopyMagnet(torrent)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
            isCopied ? 'cv-btn-primary' : 'cv-btn-secondary'
          }`}
          title={isCopied ? 'Copied to clipboard' : 'Copy raw magnet URI'}
          aria-label="Copy Magnet URI"
        >
          {isCopied ? <Check className="w-4 h-4" /> : <CopyIcon size={16} />}
        </button>
      </div>
    </div>
  );
};

export const EztvShowcaseSkeleton: React.FC = () => {
  return (
    <div
      aria-label="Loading series information..."
      className="relative overflow-hidden rounded-3xl p-5 sm:p-7 border cv-card shadow-xl flex flex-col md:flex-row gap-6 items-start animate-in fade-in duration-200"
    >
      <div className="w-28 sm:w-36 aspect-[2/3] rounded-2xl overflow-hidden border cv-border shrink-0 skeleton-shimmer" />

      <div className="flex-1 min-w-0 w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2.5">
            <div className="h-7 sm:h-8 w-48 sm:w-64 rounded-xl skeleton-shimmer" />
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-6 w-20 rounded-md skeleton-shimmer" />
              <div className="h-6 w-24 rounded-md skeleton-shimmer" />
              <div className="h-6 w-16 rounded-md skeleton-shimmer" />
              <div className="h-6 w-20 rounded-md skeleton-shimmer" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-36 rounded-lg skeleton-shimmer" />
          </div>
        </div>

        <div className="space-y-2 max-w-3xl">
          <div className="h-3.5 w-full rounded-md skeleton-shimmer" />
          <div className="h-3.5 w-11/12 rounded-md skeleton-shimmer" />
          <div className="h-3.5 w-4/5 rounded-md skeleton-shimmer" />
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-2">
          <div className="h-5 w-20 rounded-md skeleton-shimmer" />
          <div className="h-7 w-20 rounded-lg skeleton-shimmer" />
          <div className="h-7 w-24 rounded-lg skeleton-shimmer" />
          <div className="h-7 w-24 rounded-lg skeleton-shimmer" />
          <div className="h-7 w-24 rounded-lg skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
};

export const EztvReleasesSkeleton: React.FC = () => {
  return (
    <div
      aria-label="Loading TV torrent releases..."
      className="space-y-2.5 animate-in fade-in duration-200"
    >
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={`eztv-release-skel-${i}`}
          className="p-3.5 sm:p-4 rounded-2xl border cv-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 shadow-xs"
        >
          <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0 w-full">
            <div className="w-10 h-14 sm:w-12 sm:h-16 rounded-xl shrink-0 border cv-border skeleton-shimmer" />

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-5 w-16 rounded-md skeleton-shimmer" />
                <div className="h-5 w-12 rounded-md skeleton-shimmer" />
                <div className="h-5 w-24 rounded-md skeleton-shimmer" />
                <div className="h-4 w-16 rounded-md skeleton-shimmer hidden sm:block" />
              </div>

              <div className="h-4.5 w-4/5 sm:w-3/5 rounded-lg skeleton-shimmer" />

              <div className="flex items-center gap-2">
                <div className="h-3.5 w-20 rounded skeleton-shimmer" />
                <div className="h-3.5 w-24 rounded skeleton-shimmer" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            <div className="h-9 w-20 rounded-xl skeleton-shimmer" />
            <div className="h-9 w-36 rounded-xl skeleton-shimmer" />
            <div className="h-9 w-9 rounded-xl skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const EztvView: React.FC<EztvViewProps> = ({
  initialQuery,
  initialImdb,
  initialGenre,
  onShowToast,
  onOpenGuide,
  onSelectSeries
}) => {
  const [searchInput, setSearchInput] = useState(typeof initialQuery === 'string' ? initialQuery : '');
  const [activeQuery, setActiveQuery] = useState<string>(typeof initialQuery === 'string' ? initialQuery : '');
  const [activeImdbId, setActiveImdbId] = useState<string | null>(typeof initialImdb === 'string' ? initialImdb : null);
  const [activeShowName, setActiveShowName] = useState<string | null>(typeof initialQuery === 'string' ? initialQuery : null);
  const [showMeta, setShowMeta] = useState<TvShowInfo | null>(null);

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState<TvShowInfo[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filters & Sorting - initial genre determination
  const [selectedGenre, setSelectedGenre] = useState<string>(() => {
    if (initialGenre) {
      const match = GENRE_FILTERS.find((g) => g.toLowerCase() === initialGenre.toLowerCase());
      if (match) return match;
    }
    if (typeof window !== 'undefined') {
      const urlGenre = new URLSearchParams(window.location.search).get('genre');
      if (urlGenre) {
        const match = GENRE_FILTERS.find((g) => g.toLowerCase() === urlGenre.toLowerCase());
        if (match) return match;
      }
    }
    return 'All';
  });

  // Fast-path: Check for cached torrents immediately for 0ms initial render
  const initialCache = useMemo(() => {
    return getCachedEztvTorrents({
      page: 1,
      limit: EZTV_PAGE_SIZE,
      imdb_id: initialImdb || undefined,
      search: initialQuery || undefined,
      genre: selectedGenre
    });
  }, [initialImdb, initialQuery, selectedGenre]);

  const [torrents, setTorrents] = useState<EztvTorrent[]>(() => initialCache?.torrents || []);
  const [totalTorrentsCount, setTotalTorrentsCount] = useState<number>(() => initialCache?.torrents_count ?? (initialCache?.torrents?.length || 0));
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = Math.max(1, Math.ceil(totalTorrentsCount / EZTV_PAGE_SIZE));
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialCache || initialCache.torrents.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const [selectedQuality, setSelectedQuality] = useState<string>('All');
  const [selectedSeason, setSelectedSeason] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'seeds' | 'size'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Sync props changes (e.g. from Header or URL updates)
  useEffect(() => {
    const safeQuery = typeof initialQuery === 'string' ? initialQuery : '';
    const safeImdb = typeof initialImdb === 'string' ? initialImdb : null;
    if (initialQuery !== undefined && safeQuery !== activeQuery) {
      setSearchInput(safeQuery);
      setActiveQuery(safeQuery);
      setActiveImdbId(safeImdb);
      setActiveShowName(safeQuery || null);
      setCurrentPage(1);
    } else if (initialImdb !== undefined && safeImdb !== activeImdbId) {
      setActiveImdbId(safeImdb);
      setCurrentPage(1);
    }
    if (initialGenre) {
      const match = GENRE_FILTERS.find((g) => g.toLowerCase() === initialGenre.toLowerCase());
      if (match) setSelectedGenre(match);
    }
  }, [initialQuery, initialImdb, initialGenre]);

  // Live TV show autocomplete when typing
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (!trimmed || trimmed.length < 2 || /^tt\d+$/i.test(trimmed)) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const results = await searchTvShows(trimmed);
        setSuggestions(results);
        setIsSuggestionsOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Click outside suggestions or press Escape to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsSuggestionsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSuggestionsOpen) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSuggestionsOpen]);

  // Fetch all EZTV releases; the server handles genre filtering and pagination (50 displays per page).
  const loadTorrents = async (
    page: number,
    imdbId?: string | null,
    search?: string | null,
    genreFilter?: string
  ) => {
    const cached = getCachedEztvTorrents({
      page,
      limit: EZTV_PAGE_SIZE,
      imdb_id: imdbId || undefined,
      search: search || undefined,
      genre: genreFilter || 'All'
    });

    if (cached && Array.isArray(cached.torrents) && cached.torrents.length > 0) {
      setTorrents(cached.torrents);
      setTotalTorrentsCount(cached.torrents_count ?? cached.torrents.length);
      if (cached.show_meta) setShowMeta(cached.show_meta);
      if (cached.resolved_title) setActiveShowName(cached.resolved_title);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    setError(null);
    setServerMessage(null);

    try {
      const res = await fetchEztvTorrents({
        page,
        limit: EZTV_PAGE_SIZE,
        imdb_id: imdbId || undefined,
        search: search || undefined,
        genre: genreFilter || 'All'
      });

      const resultCount = res.torrents_count ?? res.torrents?.length ?? 0;
      const resultPageCount = Math.max(1, Math.ceil(resultCount / (res.limit || EZTV_PAGE_SIZE)));
      setTotalTorrentsCount(resultCount);
      if (page > resultPageCount) {
        setCurrentPage(resultPageCount);
        return;
      }

      setTorrents(res.torrents || []);
      if (res.show_meta) {
        setShowMeta(res.show_meta);
      } else if (!imdbId && !search) {
        setShowMeta(null);
      }

      if (res.resolved_title) {
        setActiveShowName(res.resolved_title);
      }
      if (res.message) {
        setServerMessage(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to fetch TV torrents from EZTV');
      setTorrents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger search on parameter change
  useEffect(() => {
    loadTorrents(currentPage, activeImdbId, activeQuery, selectedGenre);
  }, [currentPage, activeImdbId, activeQuery, selectedGenre]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuggestionsOpen(false);
    const query = searchInput.trim();
    if (!query) {
      handleClearSearch();
      return;
    }

    if (/^tt\d{5,9}$/i.test(query)) {
      setActiveImdbId(query);
      setActiveQuery('');
      setActiveShowName(`IMDb: ${query}`);
      setShowMeta(null);
    } else {
      setActiveImdbId(null);
      setActiveQuery(query);
      setActiveShowName(query);
    }
    setSelectedSeason('All');
    setCurrentPage(1);
  };

  const handleSelectSuggestion = (show: TvShowInfo) => {
    setSearchInput(show.name);
    setIsSuggestionsOpen(false);
    setShowMeta(show);
    setActiveShowName(show.name);
    setActiveImdbId(show.imdb_code);
    setActiveQuery('');
    setSelectedSeason('All');
    setCurrentPage(1);
  };

  const handleSelectPopularShow = (show: { name: string; imdb: string }) => {
    setSearchInput(show.name);
    setIsSuggestionsOpen(false);
    setActiveImdbId(show.imdb);
    setActiveQuery('');
    setActiveShowName(show.name);
    setSelectedSeason('All');
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setIsSuggestionsOpen(false);
    setActiveImdbId(null);
    setActiveQuery('');
    setActiveShowName(null);
    setShowMeta(null);
    setSelectedSeason('All');
    setSelectedGenre('Action');
    setCurrentPage(1);
  };

  const handleSelectRelease = (torrent: EztvTorrent) => {
    if (!onSelectSeries) return;
    const showTitle = showMeta?.name || extractShowTitleFromRelease(torrent.title);
    const imdbCode = (torrent.imdb_id && torrent.imdb_id !== '0')
      ? (torrent.imdb_id.startsWith('tt') ? torrent.imdb_id : `tt${torrent.imdb_id}`)
      : (showMeta?.imdb_code || undefined);

    onSelectSeries({
      imdb: imdbCode,
      title: showTitle,
      torrent,
      show: showMeta || undefined
    });
  };

  const handleCopyMagnet = (torrent: EztvTorrent) => {
    if (!torrent.magnet_url) {
      onShowToast('Magnet link unavailable for this release', 'error');
      return;
    }

    navigator.clipboard.writeText(torrent.magnet_url)
      .then(() => {
        setCopiedHash(torrent.hash);
        onShowToast('Magnet link copied to clipboard!', 'success');
        setTimeout(() => setCopiedHash(null), 3000);
      })
      .catch(() => {
        onShowToast('Failed to copy magnet link to clipboard', 'error');
      });
  };

  const handleLaunchMagnet = (torrent: EztvTorrent) => {
    if (!torrent.magnet_url) {
      onShowToast('Magnet link unavailable for this release', 'error');
      return;
    }
    window.location.href = torrent.magnet_url;
    onShowToast(`Launching BitTorrent client for "${torrent.title}"...`, 'info');
  };

  // Extract unique seasons from current results
  const availableSeasons = useMemo(() => {
    const seasons = new Set<string>();
    torrents.forEach((t) => {
      const s = String(t.season || '').trim();
      if (s && s !== '0') {
        seasons.add(s);
      }
    });
    return Array.from(seasons).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [torrents]);

  // Filter & Sort torrents
  const filteredTorrents = useMemo(() => {
    return torrents
      .filter((t) => {
        // Genre filter (Active when browsing latest releases or when specific genre is selected)
        if (selectedGenre !== 'All') {
          const target = selectedGenre.toLowerCase();
          const genres = (t.genres || []).map((g) => g.toLowerCase());
          if (!genres.includes(target)) return false;
        }

        // Season filter
        if (selectedSeason !== 'All') {
          const s = String(t.season || '').trim();
          if (s !== selectedSeason) return false;
        }

        // Quality filter
        if (selectedQuality !== 'All') {
          const { quality, isHevc } = parseQualityFromEztv(t.title, t.filename);
          if (selectedQuality === '1080p' && quality !== '1080p') return false;
          if (selectedQuality === '720p' && quality !== '720p') return false;
          if (selectedQuality === '4K UHD' && quality !== '4K UHD') return false;
          if (selectedQuality === '480p' && quality !== '480p') return false;
          if (selectedQuality === 'x265 / HEVC' && !isHevc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'seeds') {
          return (b.seeds || 0) - (a.seeds || 0);
        }
        if (sortBy === 'size') {
          const sizeA = typeof a.size_bytes === 'string' ? parseInt(a.size_bytes, 10) || 0 : (a.size_bytes || 0);
          const sizeB = typeof b.size_bytes === 'string' ? parseInt(b.size_bytes, 10) || 0 : (b.size_bytes || 0);
          return sizeB - sizeA;
        }
        // Default: date released descending
        return (b.date_released_unix || 0) - (a.date_released_unix || 0);
      });
  }, [torrents, selectedSeason, selectedQuality, selectedGenre, sortBy, activeImdbId, activeQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative z-20 rounded-2xl sm:rounded-3xl p-4 sm:p-10 border cv-card shadow-xl">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <h1 className="text-xl sm:text-4xl font-black cv-text tracking-tight leading-tight">
            TV Series, Seasons & Episode Releases
          </h1>

          {/* Search Form with Live Autocomplete */}
          <div className="relative pt-2">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 cv-text-muted pointer-events-none" />
                <label htmlFor="eztv-series-search" className="sr-only">
                  Search TV series or IMDb ID
                </label>
                <input
                  id="eztv-series-search"
                  name="seriesSearch"
                  ref={searchInputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setIsSuggestionsOpen(true);
                  }}
                  placeholder="Search TV series (e.g. Dark, Loki, Stranger Things) or IMDb ID..."
                  className="w-full pl-10 pr-10 py-3 text-sm rounded-2xl border cv-input focus:outline-hidden transition-all shadow-inner"
                />
                {searchInput && (
                  <button
                    type="button"
                    aria-label="Clear TV series search"
                    onClick={() => {
                      setSearchInput('');
                      setSuggestions([]);
                      setIsSuggestionsOpen(false);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cv-text-muted hover:text-[var(--cv-text)] rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Live Autocomplete Suggestions Dropdown - Cleanly anchored below the input */}
                {isSuggestionsOpen && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-2 cv-surface-elevated border rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="p-2.5 cv-surface-muted border-b cv-border text-[11px] font-semibold cv-text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 cv-text-accent" />
                        Matching TV Series
                      </span>
                      {isSearchingSuggestions && <span className="cv-text-accent animate-pulse">Searching...</span>}
                    </div>
                    <div className="divide-y divide-[var(--cv-border-subtle)] max-h-80 overflow-y-auto">
                      {suggestions.map((show) => (
                        <button
                          key={show.imdb_code || show.id}
                          onClick={() => handleSelectSuggestion(show)}
                          className="w-full text-left p-3 hover:bg-[var(--cv-surface-hover)] flex items-center gap-3 transition-colors cursor-pointer group"
                        >
                          <div className="w-10 h-14 cv-surface-muted rounded-lg overflow-hidden shrink-0 border cv-border relative">
                            <img
                              src={show.image || `/api/poster?imdb=${show.imdb_code}&title=${encodeURIComponent(show.name)}&type=tv&size=small`}
                              alt={show.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.currentTarget;
                                const fallback = `/api/poster?imdb=${show.imdb_code}&title=${encodeURIComponent(show.name)}&type=tv&size=small`;
                                if (target.src !== fallback) {
                                  target.src = fallback;
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold cv-text truncate cv-group-hover-accent transition-colors">
                                {show.name}
                              </h4>
                              {show.year && (
                                <span className="text-xs cv-text-muted font-mono">({show.year})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] cv-text-muted">
                              {show.rating && (
                                <span className="flex items-center gap-0.5 cv-rating font-semibold">
                                  <Star className="w-3 h-3 fill-current" />
                                  {show.rating}
                                </span>
                              )}
                              {show.network && (
                                <span className="px-1.5 py-0.5 rounded cv-badge-neutral border font-medium">
                                  {show.network}
                                </span>
                              )}
                              {show.genres && show.genres.length > 0 && (
                                <span className="truncate hidden sm:inline cv-text-subtle">
                                  {show.genres.slice(0, 2).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs cv-badge-neutral font-mono px-2 py-1 rounded border">
                            {show.imdb_code}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl cv-btn-primary font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span>Search Series</span>
              </button>
              {(activeQuery || activeImdbId) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-3 rounded-2xl cv-btn-secondary font-semibold text-sm transition-all cursor-pointer"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Popular Suggestions */}
          <div className="pt-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
            <span className="text-xs font-semibold cv-text-muted shrink-0">
              Popular Series:
            </span>
            {POPULAR_SHOWS.map((show) => {
              const isSelected = activeImdbId === show.imdb || (typeof activeQuery === 'string' && !!activeQuery && activeQuery.toLowerCase() === show.name.toLowerCase());
              return (
                <button
                  key={show.imdb}
                  onClick={() => handleSelectPopularShow(show)}
                  aria-pressed={isSelected}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isSelected ? 'cv-nav-pill-active font-bold shadow-xs' : 'cv-btn-secondary font-medium'
                  }`}
                >
                  {show.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Decorative background TV icon safely contained inside clipped wrapper */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none" aria-hidden="true">
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-5 pointer-events-none">
            <Tv className="w-96 h-96 cv-text" />
          </div>
        </div>
      </div>

      {/* TV Show Metadata Card (When a show is active and resolved) */}
      {showMeta ? (
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 border cv-card shadow-xl flex flex-col md:flex-row gap-6 items-start">
          <div className="w-28 sm:w-36 aspect-[2/3] rounded-2xl overflow-hidden shadow-xl border cv-border shrink-0 cv-surface-muted">
            <img
              src={getPrimarySeriesPoster(showMeta)}
              alt={showMeta.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = CINEVAULT_POSTER_FALLBACK;
              }}
            />
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black cv-text tracking-tight">
                    {showMeta.name}
                  </h2>
                  {showMeta.year && (
                    <span className="text-sm font-semibold cv-text-muted font-mono">
                      ({showMeta.year})
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {showMeta.rating && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md cv-rating-badge text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{showMeta.rating} / 10</span>
                    </div>
                  )}

                  {showMeta.network && (
                    <span className="px-2 py-0.5 rounded-md cv-badge-neutral text-xs font-semibold border">
                      {showMeta.network}
                    </span>
                  )}

                  {showMeta.imdb_code && (
                    <a
                      href={`https://www.imdb.com/title/${showMeta.imdb_code}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md cv-rating-badge hover:opacity-90 text-xs font-bold transition-opacity"
                    >
                      <span>IMDb {showMeta.imdb_code}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {showMeta.genres?.map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded-md cv-badge-neutral text-xs border"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onSelectSeries && (
                  <button
                    onClick={() => onSelectSeries({ imdb: showMeta.imdb_code, title: showMeta.name, show: showMeta })}
                    className="px-3.5 py-1.5 rounded-lg cv-btn-primary font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>View Series Page →</span>
                  </button>
                )}

                <button
                  onClick={handleClearSearch}
                  className="text-xs cv-btn-secondary px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Show All Releases</span>
                </button>
              </div>
            </div>

            {showMeta.summary && (
              <p className="text-xs sm:text-sm cv-text-secondary leading-relaxed max-w-4xl line-clamp-3">
                {showMeta.summary}
              </p>
            )}

            {/* Quick Season Jumpers */}
            {availableSeasons.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold cv-text-muted flex items-center gap-1 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5" />
                  Seasons:
                </span>
                <button
                  onClick={() => setSelectedSeason('All')}
                  aria-pressed={selectedSeason === 'All'}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                    selectedSeason === 'All' ? 'cv-nav-pill-active shadow-xs' : 'cv-btn-secondary'
                  }`}
                >
                  All ({torrents.length})
                </button>
                {availableSeasons.map((s) => {
                  const seasonCount = torrents.filter((t) => String(t.season) === s).length;
                  const isActive = selectedSeason === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSeason(s)}
                      aria-pressed={isActive}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                        isActive ? 'cv-nav-pill-active shadow-xs' : 'cv-btn-secondary'
                      }`}
                    >
                      Season {s} ({seasonCount})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (isLoading && (activeShowName || activeImdbId || initialQuery || initialImdb)) ? (
        <EztvShowcaseSkeleton />
      ) : null}

      {/* Filter & Sort Controls Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl cv-card border flex flex-col gap-3.5 backdrop-blur-sm">
        {/* Top Filters Group: Genre, Quality & Season */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full">
          {/* Genre Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full lg:w-auto">
            <span className="text-[11px] sm:text-xs font-bold cv-text-muted uppercase tracking-wider shrink-0">
              Genre:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 sm:flex-wrap -mx-1 px-1 sm:mx-0 sm:px-0">
              {GENRE_FILTERS.map((g) => {
                const isActive = selectedGenre === g;
                return (
                  <button
                    key={g}
                    aria-pressed={isActive}
                    onClick={() => {
                      setSelectedGenre(g);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 sm:px-2.5 sm:py-1 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive ? 'cv-nav-pill-active font-bold shadow-xs' : 'cv-btn-secondary font-semibold'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full lg:w-auto lg:border-l lg:border-[var(--cv-border)] lg:pl-3 pt-2 lg:pt-0 border-t border-[var(--cv-border-subtle)] lg:border-t-0">
            <div className="flex items-center gap-1 cv-text-muted shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Quality:</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 sm:flex-wrap -mx-1 px-1 sm:mx-0 sm:px-0">
              {QUALITY_FILTERS.map((q) => {
                const isActive = selectedQuality === q;
                return (
                  <button
                    key={q}
                    aria-pressed={isActive}
                    onClick={() => setSelectedQuality(q)}
                    className={`px-3 py-1.5 sm:px-2.5 sm:py-1 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive ? 'cv-nav-pill-active font-bold shadow-xs' : 'cv-btn-secondary font-semibold'
                    }`}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Season Filter (if any) */}
          {availableSeasons.length > 0 && !showMeta && (
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full lg:w-auto lg:border-l lg:border-[var(--cv-border)] lg:pl-3 pt-2 lg:pt-0 border-t border-[var(--cv-border-subtle)] lg:border-t-0">
              <label htmlFor="eztv-season-filter" className="flex items-center gap-1.5 cv-text-muted shrink-0">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Season:</span>
              </label>
              <select
                id="eztv-season-filter"
                name="season"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="cv-select border rounded-lg px-2.5 py-1 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Seasons</option>
                {availableSeasons.map((s) => (
                  <option key={s} value={s}>
                    Season {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Bottom Bar: View Mode, Release Count, Sort & Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full pt-3 border-t cv-border">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-xl cv-surface-muted border cv-border flex-1 sm:flex-initial">
              <button
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'cv-nav-pill-active shadow-xs'
                    : 'cv-text-muted hover:text-[var(--cv-text)]'
                }`}
                title="Browse as TV Series Cards"
              >
                <LayoutGrid size={14} />
                <span>Series Grid</span>
              </button>
              <button
                onClick={() => setViewMode('feed')}
                aria-pressed={viewMode === 'feed'}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'feed'
                    ? 'cv-nav-pill-active shadow-xs'
                    : 'cv-text-muted hover:text-[var(--cv-text)]'
                }`}
                title="View Raw Torrent Feed"
              >
                <List size={14} />
                <span>Torrent Feed</span>
              </button>
            </div>

            {/* Releases Count */}
            <div className="flex items-center gap-1.5 text-xs cv-text-muted font-mono shrink-0">
              <HardDrive className="w-3.5 h-3.5 cv-text-accent" />
              <span>{filteredTorrents.length} Releases</span>
            </div>
          </div>

          {/* Sort selector & Refresh button */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <label htmlFor="eztv-sort-by" className="sr-only">Sort TV releases</label>
              <ArrowUpDown className="w-3.5 h-3.5 cv-text-muted shrink-0" />
              <select
                id="eztv-sort-by"
                name="sortBy"
                aria-label="Sort TV releases"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto cv-select border rounded-lg px-2.5 py-1.5 sm:py-1 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="date">Newest Released</option>
                <option value="seeds">Most Seeds (Fastest)</option>
                <option value="size">Largest Size (High Bitrate)</option>
              </select>
            </div>

            <button
              onClick={() => loadTorrents(currentPage, activeImdbId, activeQuery, selectedGenre)}
              className="p-2 rounded-lg cv-btn-secondary transition-colors cursor-pointer shrink-0"
              title="Refresh EZTV torrents"
              aria-label="Refresh EZTV torrents"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-2xl cv-badge-error border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadTorrents(currentPage, activeImdbId, activeQuery, selectedGenre)}
            className="px-3 py-1 cv-btn-primary text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}


      {/* Loading Skeleton Grid */}
      {isLoading && <EztvReleasesSkeleton />}

      {/* Torrents Release List vs Releases Grid (both displaying 50 releases) */}
      {!isLoading && !error && filteredTorrents.length > 0 && (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {filteredTorrents.map((torrent, idx) => (
              <ReleaseGridCard
                key={torrent.id || torrent.hash || idx}
                torrent={torrent}
                index={idx}
                showMeta={showMeta}
                isCopied={copiedHash === torrent.hash}
                onSelectRelease={handleSelectRelease}
                onLaunchMagnet={handleLaunchMagnet}
                onCopyMagnet={handleCopyMagnet}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTorrents.map((torrent) => (
              <EztvReleaseRow
                key={torrent.id || torrent.hash}
                torrent={torrent}
                showMeta={showMeta}
                isCopied={copiedHash === torrent.hash}
                onSelectRelease={handleSelectRelease}
                onLaunchMagnet={handleLaunchMagnet}
                onCopyMagnet={handleCopyMagnet}
              />
            ))}
          </div>
        )
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredTorrents.length === 0 && (
        <div className="text-center py-16 px-4 rounded-3xl cv-card border space-y-4">
          <Tv className="w-12 h-12 cv-text-muted opacity-50 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold cv-text">
              {activeShowName ? `No Releases Found for "${activeShowName}"` : 'No EZTV Torrents Found'}
            </h3>
            <p className="text-xs sm:text-sm cv-text-muted max-w-md mx-auto">
              {activeShowName
                ? `EZTV does not currently have torrent releases matching this query or season filter. Try selecting "All Seasons" or explore another popular TV series.`
                : 'No releases match the current filters on EZTV. Try clearing your filters or searching for another TV title.'}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={handleClearSearch}
              className="px-5 py-2.5 rounded-xl cv-btn-primary text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              Browse Latest TV Releases
            </button>
            {POPULAR_SHOWS.slice(0, 4).map((s) => (
              <button
                key={s.imdb}
                onClick={() => handleSelectPopularShow(s)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer cv-btn-secondary"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="pt-4 flex items-center justify-between gap-2 border-t cv-border">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 sm:px-4 py-2 rounded-xl cv-btn-secondary text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="sm:hidden">Prev</span>
            <span className="hidden sm:inline">Previous Page</span>
          </button>

          <span className="text-xs font-mono cv-text-muted text-center">
            Page <strong className="cv-text-accent">{currentPage}</strong> of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 sm:px-4 py-2 rounded-xl cv-btn-secondary text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0"
          >
            <span className="sm:hidden">Next</span>
            <span className="hidden sm:inline">Next Page</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Native Banner Ad Placement */}
      <AdSenseSlot format="auto" responsive={true} className="my-6" />

      {/* Legal & Safety Helper Strip */}
      <div className="p-4 rounded-2xl cv-card border cv-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs cv-text-muted">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 cv-text-accent shrink-0" />
          <span>EZTV API integration • Live TV broadcasts, full seasons, and episode torrents</span>
        </div>
        <button
          onClick={onOpenGuide}
          className="cv-text-accent hover:opacity-80 font-semibold underline cursor-pointer"
        >
          How to download safely with VPN
        </button>
      </div>
    </div>
  );
};
