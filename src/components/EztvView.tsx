import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tv,
  Search,
  Magnet,
  Check,
  Sparkles,
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
  extractShowTitleAndYear
} from '../services/eztvApi';
import { CopyIcon } from './ActionIcons';
import { useTheme } from '../context/ThemeContext';
import { getSeriesPosterCandidates, getPrimarySeriesPoster, CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';

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

export const GENRE_FILTERS = ['Action', 'All', 'Crime', 'Adventure', 'Thriller', 'Mystery'];
const APPROVED_GENRES_SET = new Set(['action', 'crime', 'adventure', 'thriller', 'mystery']);
const QUALITY_FILTERS = ['All', '1080p', '720p', '4K UHD', 'x265 / HEVC', '480p'];

export interface SeriesCardData {
  title: string;
  year?: string;
  imdbId?: string;
  torrents: EztvTorrent[];
  maxSeeds: number;
  qualities: string[];
  latestSeason?: number;
  latestEpisode?: number;
  latestReleaseDate: number;
  sampleTorrent: EztvTorrent;
}

interface SeriesGridCardProps {
  series: SeriesCardData;
  isCopied: boolean;
  onSelectSeries: (torrent: EztvTorrent) => void;
  onLaunchMagnet: (torrent: EztvTorrent) => void;
  onCopyMagnet: (torrent: EztvTorrent) => void;
}

const SeriesGridCard: React.FC<SeriesGridCardProps> = ({
  series,
  isCopied,
  onSelectSeries,
  onLaunchMagnet,
  onCopyMagnet
}) => {
  const imdbParam = series.imdbId || (series.sampleTorrent.imdb_id && series.sampleTorrent.imdb_id !== '0' ? `tt${series.sampleTorrent.imdb_id}` : '');
  const posterCandidates = useMemo(() => {
    return getSeriesPosterCandidates({
      name: series.title,
      imdb_code: imdbParam,
      imdb_id: series.sampleTorrent.imdb_id,
      year: series.year,
      poster_url: series.sampleTorrent.poster_url
    });
  }, [series.title, imdbParam, series.sampleTorrent.imdb_id, series.year, series.sampleTorrent.poster_url]);

  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [series.title, series.imdbId]);

  const handleImageError = () => {
    if (candidateIndex + 1 < posterCandidates.length) {
      setCandidateIndex((prev) => prev + 1);
    }
  };

  const currentPosterSrc = posterCandidates[candidateIndex] || CINEVAULT_POSTER_FALLBACK;

  const episodeBadge = series.latestSeason && series.latestEpisode
    ? `S${String(series.latestSeason).padStart(2, '0')}E${String(series.latestEpisode).padStart(2, '0')}`
    : series.latestSeason
    ? `Season ${series.latestSeason}`
    : 'Series';

  return (
    <div
      onClick={() => onSelectSeries(series.sampleTorrent)}
      className="group rounded-2xl border border-white/10 bg-[#0f0f13] hover:border-rose-500/50 hover:bg-white/[0.04] transition-all duration-300 flex flex-col overflow-hidden cursor-pointer shadow-md hover:shadow-xl hover:shadow-rose-950/20 relative"
    >
      {/* Poster */}
      <div className="aspect-[2/3] w-full bg-neutral-900 relative overflow-hidden">
        <img
          src={currentPosterSrc}
          alt={series.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-rose-400 font-mono font-bold text-[10px] border border-rose-500/30">
            {episodeBadge}
          </span>
          {series.maxSeeds > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-xs text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {series.maxSeeds}
            </span>
          )}
        </div>

        {/* Bottom Poster Info */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-1">
          {series.qualities.slice(0, 2).map((q) => (
            <span key={q} className="px-1.5 py-0.2 rounded bg-white/15 backdrop-blur-xs text-[10px] font-semibold text-neutral-200 border border-white/10">
              {q}
            </span>
          ))}
          <span className="ml-auto text-[10px] font-mono text-neutral-300 bg-black/60 px-1.5 py-0.2 rounded">
            {series.torrents.length} {series.torrents.length === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-1 leading-snug">
            {series.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
            {series.year && <span>{series.year}</span>}
            {series.year && <span>•</span>}
            <span className="text-rose-400/90 font-medium text-[11px] group-hover:underline">Explore Series →</span>
          </div>
        </div>

        {/* Quick Magnet Action */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLaunchMagnet(series.sampleTorrent);
            }}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            title="Get Fast Magnet"
          >
            <Magnet size={13} />
            <span>Magnet</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyMagnet(series.sampleTorrent);
            }}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isCopied
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10'
            }`}
            title="Copy magnet URL"
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

  return (
    <div
      onClick={() => onSelectRelease(torrent)}
      className="group p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 eztv-release-row shadow-xs cursor-pointer hover:border-rose-500/50 hover:bg-white/[0.03]"
    >
      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
        {/* Real Official Show Poster Thumbnail */}
        <div className="w-12 h-16 sm:w-14 sm:h-20 bg-neutral-900 rounded-xl overflow-hidden shrink-0 border border-white/10 relative shadow-md">
          <img
            src={currentPosterSrc}
            alt={showTitle}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />
        </div>

        {/* Release Details */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Season / Episode Badge */}
            {torrent.season && torrent.episode && (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-500 font-bold border border-rose-500/30 text-xs font-mono">
                S{String(torrent.season).padStart(2, '0')}E{String(torrent.episode).padStart(2, '0')}
              </span>
            )}

            {/* Quality Badge */}
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-neutral-300 text-xs font-semibold border border-white/10">
              {quality}
            </span>

            {/* HEVC Badge */}
            {isHevc && (
              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold">
                x265 / HEVC
              </span>
            )}

            {/* Curated Genre Badge */}
            {torrent.genres && torrent.genres.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/25 text-xs font-semibold">
                {torrent.genres.slice(0, 2).join(' • ')}
              </span>
            )}

            {/* Seeds / Peers */}
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {torrent.seeds || 0} seeds
            </span>

            <span className="text-xs text-neutral-400 font-mono">
              {torrent.peers || 0} peers
            </span>

            <span className="text-[11px] text-rose-400 font-semibold group-hover:underline ml-auto hidden sm:inline-flex items-center gap-1">
              Series Details →
            </span>
          </div>

          {/* Torrent Title */}
          <h3 className="text-sm font-semibold text-white group-hover:text-rose-400 transition-colors break-all leading-snug">
            {torrent.title}
          </h3>

          {/* Meta Specs Strip */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
            <span>{formatEztvBytes(torrent.size_bytes)}</span>
            <span>•</span>
            <span>{formatEztvDate(torrent.date_released_unix)}</span>
            {torrent.filename && (
              <>
                <span>•</span>
                <span className="text-neutral-500 truncate max-w-xs">{torrent.filename}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 shrink-0 self-end lg:self-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* View Details Button */}
        <button
          onClick={() => onSelectRelease(torrent)}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-rose-600 hover:text-white text-neutral-200 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          title="View full TV series detail page"
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Details</span>
        </button>

        {/* Magnet Download */}
        <button
          onClick={() => onLaunchMagnet(torrent)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
          title="Launch BitTorrent client"
        >
          <Magnet className="w-4 h-4" />
          <span>Magnet Download</span>
        </button>

        {/* Copy Magnet */}
        <button
          onClick={() => onCopyMagnet(torrent)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
            isCopied
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-white/5 hover:bg-white/15 border-white/10 text-neutral-300 hover:text-white'
          }`}
          title={isCopied ? 'Copied to clipboard' : 'Copy raw magnet URI'}
          aria-label="Copy Magnet URI"
        >
          {isCopied ? <Check className="w-4 h-4 text-white" /> : <CopyIcon size={16} />}
        </button>
      </div>
    </div>
  );
};

export const EztvShowcaseSkeleton: React.FC = () => {
  const { colorMode } = useTheme();
  const isWhite = colorMode === 'white';
  const isBlueBlack = colorMode === 'blue-black';

  return (
    <div
      aria-label="Loading series information..."
      className={`relative overflow-hidden rounded-3xl p-5 sm:p-7 border shadow-xl flex flex-col md:flex-row gap-6 items-start animate-in fade-in duration-200 ${
        isWhite
          ? 'border-slate-200 bg-white'
          : isBlueBlack
          ? 'border-sky-900/40 bg-[#091124]'
          : 'border-white/10 bg-[#0c0c12]/80'
      }`}
    >
      <div className="w-28 sm:w-36 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shrink-0 skeleton-shimmer" />

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
  const { colorMode } = useTheme();
  const isWhite = colorMode === 'white';
  const isBlueBlack = colorMode === 'blue-black';

  return (
    <div
      aria-label="Loading TV torrent releases..."
      className="space-y-2.5 animate-in fade-in duration-200"
    >
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={`eztv-release-skel-${i}`}
          className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 shadow-xs ${
            isWhite
              ? 'border-slate-200 bg-white'
              : isBlueBlack
              ? 'border-sky-900/30 bg-[#0b1329]'
              : 'border-white/10 bg-[#0d0d12]/70'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0 w-full">
            <div className="w-10 h-14 sm:w-12 sm:h-16 rounded-xl shrink-0 border border-white/10 skeleton-shimmer" />

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

  const [torrents, setTorrents] = useState<EztvTorrent[]>([]);
  const [totalTorrentsCount, setTotalTorrentsCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  // Filters & Sorting - 'Action' is default genre
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
    return 'Action';
  });
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

  // Fetch torrents from EZTV API (automatically genre-filtered for Action, Crime, Adventure, Thriller, Mystery)
  const loadTorrents = async (
    page: number,
    imdbId?: string | null,
    search?: string | null,
    genreFilter?: string
  ) => {
    setIsLoading(true);
    setError(null);
    setServerMessage(null);

    try {
      const res = await fetchEztvTorrents({
        page,
        limit: 40,
        imdb_id: imdbId || undefined,
        search: search || undefined,
        genre: genreFilter || 'Action'
      });

      setTorrents(res.torrents || []);
      setTotalTorrentsCount(res.torrents_count || (res.torrents ? res.torrents.length : 0));
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
        } else if (!activeImdbId && !activeQuery && t.genres && t.genres.length > 0) {
          const genres = t.genres.map((g) => g.toLowerCase());
          const isApproved = genres.some((g) => APPROVED_GENRES_SET.has(g));
          if (!isApproved) return false;
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

  // Group filtered torrents by TV series for the visual Series Grid mode
  const groupedSeries = useMemo(() => {
    const map = new Map<string, {
      title: string;
      year?: string;
      imdbId?: string;
      torrents: EztvTorrent[];
      maxSeeds: number;
      qualities: Set<string>;
      latestSeason?: number;
      latestEpisode?: number;
      latestReleaseDate: number;
      sampleTorrent: EztvTorrent;
    }>();

    for (const t of filteredTorrents) {
      const { title: showTitle, year: showYear } = extractShowTitleAndYear(t.title);
      const cleanTitle = (showTitle || t.title).trim();
      const imdbKey = (t.imdb_id && t.imdb_id !== '0') ? `tt${t.imdb_id}` : cleanTitle.toLowerCase();
      
      const { quality } = parseQualityFromEztv(t.title, t.filename);
      const seeds = t.seeds || 0;
      const releaseDate = t.date_released_unix || 0;
      const sNum = t.season ? parseInt(t.season, 10) : undefined;
      const eNum = t.episode ? parseInt(t.episode, 10) : undefined;

      if (!map.has(imdbKey)) {
        map.set(imdbKey, {
          title: cleanTitle,
          year: showYear,
          imdbId: (t.imdb_id && t.imdb_id !== '0') ? `tt${t.imdb_id}` : undefined,
          torrents: [t],
          maxSeeds: seeds,
          qualities: new Set([quality]),
          latestSeason: sNum,
          latestEpisode: eNum,
          latestReleaseDate: releaseDate,
          sampleTorrent: t
        });
      } else {
        const item = map.get(imdbKey)!;
        item.torrents.push(t);
        if (seeds > item.maxSeeds) {
          item.maxSeeds = seeds;
          item.sampleTorrent = t;
        }
        item.qualities.add(quality);
        if (releaseDate > item.latestReleaseDate) {
          item.latestReleaseDate = releaseDate;
          if (sNum) item.latestSeason = sNum;
          if (eNum) item.latestEpisode = eNum;
        }
      }
    }

    return Array.from(map.values()).map(item => ({
      ...item,
      qualities: Array.from(item.qualities)
    })).sort((a, b) => {
      if (sortBy === 'seeds') return b.maxSeeds - a.maxSeeds;
      return b.latestReleaseDate - a.latestReleaseDate;
    });
  }, [filteredTorrents, sortBy]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative z-20 rounded-3xl p-6 sm:p-10 border eztv-hero-banner shadow-2xl">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider eztv-hero-badge">
              <Tv className="w-3.5 h-3.5" />
              <span>EZTV Television Index</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-neutral-200 border border-white/15 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Action (Default) • Crime • Adventure • Thriller • Mystery
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight eztv-hero-title">
            TV Series, Seasons & Episode Releases
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed eztv-hero-sub">
            Live television torrent index powered directly by the official EZTV API and TVmaze.
            Defaulting to newest Action series episode releases, with verified filters for Crime, Adventure, Thriller, and Mystery series with magnet links and full seasons.
          </p>

          {/* Search Form with Live Autocomplete */}
          <div className="relative pt-2">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setIsSuggestionsOpen(true);
                  }}
                  placeholder="Search TV series (e.g. Dark, Loki, Stranger Things) or IMDb ID..."
                  className="w-full pl-10 pr-10 py-3 text-sm rounded-2xl focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all shadow-inner eztv-search-box"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSuggestions([]);
                      setIsSuggestionsOpen(false);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Live Autocomplete Suggestions Dropdown - Cleanly anchored below the input */}
                {isSuggestionsOpen && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-2 bg-[#0d0d12] border border-white/20 rounded-2xl shadow-2xl shadow-black overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 eztv-suggestions-menu"
                  >
                    <div className="p-2.5 bg-neutral-900/90 border-b border-white/10 text-[11px] font-semibold text-neutral-400 flex items-center justify-between suggestion-header">
                      <span className="flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-rose-500" />
                        Matching TV Series
                      </span>
                      {isSearchingSuggestions && <span className="text-rose-400 animate-pulse">Searching...</span>}
                    </div>
                    <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                      {suggestions.map((show) => (
                        <button
                          key={show.imdb_code || show.id}
                          onClick={() => handleSelectSuggestion(show)}
                          className="w-full text-left p-3 hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer group"
                        >
                          <div className="w-10 h-14 bg-neutral-800 rounded-lg overflow-hidden shrink-0 border border-white/10 relative">
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
                              <h4 className="text-sm font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                                {show.name}
                              </h4>
                              {show.year && (
                                <span className="text-xs text-neutral-400 font-mono">({show.year})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                              {show.rating && (
                                <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  {show.rating}
                                </span>
                              )}
                              {show.network && (
                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-medium">
                                  {show.network}
                                </span>
                              )}
                              {show.genres && show.genres.length > 0 && (
                                <span className="truncate hidden sm:inline text-neutral-500">
                                  {show.genres.slice(0, 2).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-neutral-400 font-mono px-2 py-1 bg-white/5 rounded border border-white/10">
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
                className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span>Search Series</span>
              </button>
              {(activeQuery || activeImdbId) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-neutral-300 hover:text-white font-semibold text-sm transition-all cursor-pointer"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Popular Suggestions */}
          <div className="pt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Popular Series:
            </span>
            {POPULAR_SHOWS.map((show) => {
              const isSelected = activeImdbId === show.imdb || (typeof activeQuery === 'string' && !!activeQuery && activeQuery.toLowerCase() === show.name.toLowerCase());
              return (
                <button
                  key={show.imdb}
                  onClick={() => handleSelectPopularShow(show)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer eztv-tag-btn ${
                    isSelected ? 'is-active font-bold' : ''
                  }`}
                >
                  {show.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Decorative background TV icon safely contained inside clipped wrapper */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-5 pointer-events-none">
            <Tv className="w-96 h-96 text-white" />
          </div>
        </div>
      </div>

      {/* TV Show Metadata Card (When a show is active and resolved) */}
      {showMeta ? (
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 border eztv-showcase-card shadow-xl flex flex-col md:flex-row gap-6 items-start">
          <div className="w-28 sm:w-36 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 bg-neutral-900">
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
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {showMeta.name}
                  </h2>
                  {showMeta.year && (
                    <span className="text-sm font-semibold text-neutral-400 font-mono">
                      ({showMeta.year})
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {showMeta.rating && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{showMeta.rating} / 10</span>
                    </div>
                  )}

                  {showMeta.network && (
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-neutral-200 text-xs font-semibold border border-white/10">
                      {showMeta.network}
                    </span>
                  )}

                  {showMeta.imdb_code && (
                    <a
                      href={`https://www.imdb.com/title/${showMeta.imdb_code}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 text-xs font-bold transition-colors"
                    >
                      <span>IMDb {showMeta.imdb_code}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {showMeta.genres?.map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-xs border border-white/5"
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
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>View Series Page →</span>
                  </button>
                )}

                <button
                  onClick={handleClearSearch}
                  className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Show All Releases</span>
                </button>
              </div>
            </div>

            {showMeta.summary && (
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-4xl line-clamp-3">
                {showMeta.summary}
              </p>
            )}

            {/* Quick Season Jumpers */}
            {availableSeasons.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-neutral-400 flex items-center gap-1 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5" />
                  Seasons:
                </span>
                <button
                  onClick={() => setSelectedSeason('All')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer eztv-tag-btn ${
                    selectedSeason === 'All' ? 'is-active' : ''
                  }`}
                >
                  All ({torrents.length})
                </button>
                {availableSeasons.map((s) => {
                  const seasonCount = torrents.filter((t) => String(t.season) === s).length;
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSeason(s)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer eztv-tag-btn ${
                        selectedSeason === s ? 'is-active' : ''
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
      <div className="p-4 rounded-2xl bg-[#0f0f13] border border-white/10 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Genre Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Genre:</span>
            <div className="flex flex-wrap gap-1">
              {GENRE_FILTERS.map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setSelectedGenre(g);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer eztv-tag-btn ${
                    selectedGenre === g ? 'is-active font-bold' : ''
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Filter */}
          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Quality:</span>
            <div className="flex flex-wrap gap-1">
              {QUALITY_FILTERS.map((q) => (
                <button
                  key={q}
                  onClick={() => setSelectedQuality(q)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer eztv-tag-btn ${
                    selectedQuality === q ? 'is-active font-bold' : ''
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Season Filter (if any) */}
          {availableSeasons.length > 0 && !showMeta && (
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Season:</span>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="bg-[#18181c] border border-white/15 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-hidden focus:border-rose-500 cursor-pointer"
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

        {/* View Mode Toggle, Sort selector & Count */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Browse as TV Series Cards"
            >
              <LayoutGrid size={14} />
              <span>Series Grid</span>
            </button>
            <button
              onClick={() => setViewMode('feed')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'feed'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="View Raw Torrent Feed"
            >
              <List size={14} />
              <span>Torrent Feed</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
            <HardDrive className="w-3.5 h-3.5" />
            <span>
              {viewMode === 'grid' ? `${groupedSeries.length} Series` : `${filteredTorrents.length} Releases`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#18181c] border border-white/15 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-hidden focus:border-rose-500 cursor-pointer"
            >
              <option value="date">Newest Released</option>
              <option value="seeds">Most Seeds (Fastest)</option>
              <option value="size">Largest Size (High Bitrate)</option>
            </select>
          </div>

          <button
            onClick={() => loadTorrents(currentPage, activeImdbId, activeQuery)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh EZTV torrents"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadTorrents(currentPage, activeImdbId, activeQuery)}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Server Notice Message */}
      {serverMessage && !error && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="w-4 h-4 shrink-0" />
            <span>{serverMessage}</span>
          </div>
          <button
            onClick={handleClearSearch}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
          >
            View All Shows
          </button>
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {isLoading && <EztvReleasesSkeleton />}

      {/* Torrents Release List vs Series Grid */}
      {!isLoading && !error && filteredTorrents.length > 0 && (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {groupedSeries.map((series) => (
              <SeriesGridCard
                key={series.imdbId || series.title}
                series={series}
                isCopied={copiedHash === series.sampleTorrent.hash}
                onSelectSeries={handleSelectRelease}
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
        <div className="text-center py-16 px-4 rounded-3xl bg-[#0f0f13] border border-white/10 space-y-4">
          <Tv className="w-12 h-12 text-neutral-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {activeShowName ? `No Releases Found for "${activeShowName}"` : 'No EZTV Torrents Found'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
              {activeShowName
                ? `EZTV does not currently have torrent releases matching this query or season filter. Try selecting "All Seasons" or explore another popular TV series.`
                : 'No releases match the current filters on EZTV. Try clearing your filters or searching for another TV title.'}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={handleClearSearch}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              Browse Latest TV Releases
            </button>
            {POPULAR_SHOWS.slice(0, 4).map((s) => (
              <button
                key={s.imdb}
                onClick={() => handleSelectPopularShow(s)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer eztv-tag-btn"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && !error && filteredTorrents.length > 0 && (
        <div className="pt-4 flex items-center justify-between border-t border-white/10">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-4 py-2 rounded-xl eztv-tag-btn text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Page</span>
          </button>

          <span className="text-xs font-mono text-neutral-400">
            Page <strong className="text-rose-500">{currentPage}</strong> of 100
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(100, p + 1))}
            disabled={currentPage >= 100}
            className="px-4 py-2 rounded-xl eztv-tag-btn text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <span>Next Page</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Legal & Safety Helper Strip */}
      <div className="p-4 rounded-2xl bg-[#0f0f13] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-rose-500 shrink-0" />
          <span>EZTV API integration • Live TV broadcasts, full seasons, and episode torrents</span>
        </div>
        <button
          onClick={onOpenGuide}
          className="text-rose-400 hover:text-rose-300 font-semibold underline cursor-pointer"
        >
          How to download safely with VPN
        </button>
      </div>
    </div>
  );
};
