import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Share2,
  Check,
  Tv,
  Magnet,
  Download,
  FileDown,
  Layers,
  Calendar,
  Clock,
  Star,
  ExternalLink,
  Film,
  Search,
  Filter,
  User,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  FolderArchive,
  ListFilter,
  Layers2,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Bot,
  Radio,
  FileText
} from 'lucide-react';
import { TvShowDetails, TvShowInfo, EztvTorrent, EztvApiResponse, Movie } from '../types';
import {
  fetchTvShowDetails,
  fetchEztvTorrents,
  formatEztvBytes,
  formatEztvDate,
  parseQualityFromEztv,
  getSeriesPath,
  getSeriesSlug,
  extractShowTitleFromRelease
} from '../services/eztvApi';
import { updateDocumentSeo } from '../utils/seo';
import { AdSenseSlot } from './AdSenseSlot';
import { TorrentSwarmHealthBadge } from './TorrentSwarmHealthBadge';
import { DownloadSpeedEstimator } from './DownloadSpeedEstimator';
import { BookmarkPlusIcon, BookmarkIcon, PlayIcon, CopyIcon } from './ActionIcons';
import { getSeriesPosterCandidates, getPrimarySeriesPoster, CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';
import { getSafeExternalUrl } from '../utils/safeUrl';
import { ShareMovieModal } from './ShareMovieModal';

/**
 * Robust parsing of season, episode, packs, and quality from EZTV release titles
 */
export interface ParsedReleaseMeta {
  season: number | null;
  episode: number | null;
  isSeasonPack: boolean;
  epTag: string | null;
  qualityInfo: {
    quality: string;
    is4k: boolean;
    is1080p: boolean;
    is720p: boolean;
    isHevc: boolean;
  };
}

export function parseReleaseMeta(torrent: EztvTorrent): ParsedReleaseMeta {
  const text = `${torrent.title || ''} ${torrent.filename || ''}`;
  let sNum = parseInt(torrent.season || '0', 10);
  let eNum: number | null = null;

  // Explicit single episode patterns: S03E00, S01E05, 3x00, 1x05, Episode 00
  const seMatch = text.match(/\bS(\d{1,2})E(\d{1,3})\b/i);
  const xMatch = text.match(/\b(\d{1,2})x(\d{1,3})\b/i);
  const epMatch = text.match(/\b(?:Episode|Ep)[\s._]*(\d{1,3})\b/i) || text.match(/\bE(\d{1,3})\b/i);
  const isEpisodeRange = /\b(?:S\d{1,2})?E\d{1,2}[-–]E?\d{1,2}\b/i.test(text);
  const isExplicitPack = /\b(complete|season[\s._]*pack|full[\s._]*season|all[\s._]*episodes|entire[\s._]*season|seasons?[\s._]*\d+[\s._]*complete|series[\s._]*complete|s\d{1,2}[\s._]*complete|s\d{1,2}[-–]s\d{1,2}|series[\s._]*pack)\b/i.test(text);

  if (seMatch) {
    sNum = parseInt(seMatch[1], 10);
    eNum = parseInt(seMatch[2], 10);
  } else if (xMatch) {
    sNum = parseInt(xMatch[1], 10);
    eNum = parseInt(xMatch[2], 10);
  } else if (epMatch) {
    eNum = parseInt(epMatch[1], 10);
    if (isNaN(sNum) || sNum <= 0) {
      const sOnly = text.match(/\bS(\d{1,2})\b/i) || text.match(/\bSeason[\s._]*(\d{1,2})\b/i);
      if (sOnly) sNum = parseInt(sOnly[1], 10);
    }
  } else if (torrent.episode && torrent.episode !== '0') {
    const parsed = parseInt(torrent.episode, 10);
    if (!isNaN(parsed) && parsed > 0) eNum = parsed;
  }

  if (isNaN(sNum) || sNum <= 0) {
    const sOnly = text.match(/\bS(\d{1,2})\b/i) || text.match(/\bSeason[\s._]*(\d{1,2})\b/i);
    if (sOnly) sNum = parseInt(sOnly[1], 10);
  }

  const hasSingleEpisode = eNum !== null && !isEpisodeRange;
  const isSeasonPack = !hasSingleEpisode && (
    isExplicitPack ||
    isEpisodeRange ||
    (sNum > 0 && eNum === null && (isExplicitPack || parseInt(String(torrent.size_bytes || '0'), 10) > 1500000000))
  );

  const finalSeason = sNum > 0 ? sNum : null;
  const finalEpisode = eNum !== null && !isNaN(eNum) ? eNum : null;

  let epTag: string | null = null;
  if (finalSeason !== null && finalEpisode !== null) {
    epTag = `S${String(finalSeason).padStart(2, '0')}E${String(finalEpisode).padStart(2, '0')}`;
  } else if (isSeasonPack) {
    epTag = 'Season Pack';
  } else if (finalEpisode !== null) {
    epTag = `E${String(finalEpisode).padStart(2, '0')}`;
  }

  const qualityInfo = parseQualityFromEztv(torrent.title, torrent.filename);

  return {
    season: finalSeason,
    episode: finalEpisode,
    isSeasonPack,
    epTag,
    qualityInfo
  };
}

interface SeriesDetailPageProps {
  seriesId?: string; // IMDb ID (e.g. tt5753856) or slug
  seriesTitle?: string;
  initialShow?: TvShowDetails | TvShowInfo | null;
  initialTorrent?: EztvTorrent | null;
  onBack?: () => void;
  onNavigateHome: () => void;
  onNavigateToSeries: (query?: string, imdbId?: string) => void;
  onSelectSeries?: (params: { imdb?: string; title?: string; torrent?: EztvTorrent; show?: TvShowInfo }) => void;
  onSelectGenre?: (genre: string) => void;
  onPlayTrailer?: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenGuide: () => void;
  onOpenFilmography?: (name: string, role?: 'director' | 'actor' | 'cast') => void;
  onAskCineBot?: (prompt: string) => void;
  isWatchlisted?: (idOrImdb: string | number) => boolean;
  onToggleWatchlist?: (show: TvShowInfo) => void;
}

const POPULAR_RECOMMENDED_SHOWS = [
  { name: 'Dark', imdb: 'tt5753856', year: '2017', genre: 'Sci-Fi', rating: 8.7, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/504/1262352.jpg' },
  { name: 'Loki', imdb: 'tt9140554', year: '2021', genre: 'Action', rating: 8.2, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/478/1195717.jpg' },
  { name: 'Breaking Bad', imdb: 'tt0903747', year: '2008', genre: 'Crime', rating: 9.5, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/501/1253519.jpg' },
  { name: 'Stranger Things', imdb: 'tt4574334', year: '2016', genre: 'Drama', rating: 8.6, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/595/1489169.jpg' },
  { name: 'Severance', imdb: 'tt11280740', year: '2022', genre: 'Mystery', rating: 8.7, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/548/1371406.jpg' },
  { name: 'The Boys', imdb: 'tt1190634', year: '2019', genre: 'Action', rating: 8.7, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/619/1547768.jpg' },
  { name: 'House of the Dragon', imdb: 'tt11198330', year: '2022', genre: 'Fantasy', rating: 8.4, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/627/1568449.jpg' },
  { name: 'The Last of Us', imdb: 'tt3581920', year: '2023', genre: 'Adventure', rating: 8.8, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/563/1409008.jpg' },
  { name: 'Fallout', imdb: 'tt12637874', year: '2024', genre: 'Sci-Fi', rating: 8.4, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/599/1499142.jpg' },
  { name: 'The Bear', imdb: 'tt14452776', year: '2022', genre: 'Comedy', rating: 8.6, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/629/1574642.jpg' }
];

export const SeriesDetailTorrentsSkeleton: React.FC<{
  hideToolbar?: boolean;
}> = ({
  hideToolbar = false
}) => {
  return (
    <div
      aria-label="Loading torrent releases..."
      className="space-y-4 animate-in fade-in duration-200"
    >
      {/* Filter Toolbar Skeleton */}
      {!hideToolbar && (
        <div className="p-4 rounded-2xl border cv-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg skeleton-shimmer" />
              <div className="h-4 w-32 rounded skeleton-shimmer" />
            </div>
            <div className="h-8 w-56 rounded-xl skeleton-shimmer" />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="h-4 w-14 rounded skeleton-shimmer mr-2" />
            <div className="h-7 w-24 rounded-xl skeleton-shimmer" />
            <div className="h-7 w-20 rounded-xl skeleton-shimmer" />
            <div className="h-7 w-20 rounded-xl skeleton-shimmer" />
            <div className="h-7 w-28 rounded-xl skeleton-shimmer" />
          </div>
        </div>
      )}

      {/* Releases List Skeleton Items */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`series-torrent-skel-${i}`}
            className="p-4 rounded-2xl border cv-card flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xs"
          >
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-5 w-16 rounded-md skeleton-shimmer" />
                <div className="h-5 w-14 rounded-md skeleton-shimmer" />
                <div className="h-5 w-14 rounded-md skeleton-shimmer" />
                <div className="h-5 w-20 rounded-md skeleton-shimmer" />
                <div className="h-4 w-24 rounded skeleton-shimmer" />
              </div>

              <div className="h-5 w-4/5 sm:w-2/3 rounded-lg skeleton-shimmer" />

              <div className="flex items-center gap-2 pt-0.5">
                <div className="h-4 w-24 rounded-full skeleton-shimmer" />
                <div className="h-3.5 w-32 rounded skeleton-shimmer" />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <div className="h-9 w-24 rounded-xl skeleton-shimmer" />
              <div className="h-9 w-16 rounded-xl skeleton-shimmer" />
              <div className="h-9 w-9 rounded-xl skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SeriesDetailEpisodesSkeleton: React.FC = () => {
  return (
    <div
      aria-label="Loading episodes..."
      className="space-y-4 animate-in fade-in duration-200"
    >
      <div className="flex items-center gap-2 pb-3 border-b cv-border-subtle">
        <div className="h-4 w-16 rounded skeleton-shimmer" />
        <div className="h-8 w-24 rounded-xl skeleton-shimmer" />
        <div className="h-8 w-24 rounded-xl skeleton-shimmer" />
        <div className="h-8 w-24 rounded-xl skeleton-shimmer" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`ep-skel-${i}`}
            className="p-4 rounded-2xl border cv-card flex flex-col sm:flex-row gap-4"
          >
            <div className="sm:w-36 aspect-video rounded-xl skeleton-shimmer shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4.5 w-16 rounded-md skeleton-shimmer" />
                <div className="h-4 w-24 rounded skeleton-shimmer" />
              </div>
              <div className="h-5 w-4/5 rounded-lg skeleton-shimmer" />
              <div className="h-3.5 w-full rounded skeleton-shimmer" />
              <div className="h-3.5 w-2/3 rounded skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SeriesDetailCastSkeleton: React.FC = () => {
  return (
    <div
      aria-label="Loading cast members..."
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4 animate-in fade-in duration-200"
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={`cast-skel-${i}`}
          className="p-3 rounded-2xl border cv-card text-center space-y-2.5"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto skeleton-shimmer border cv-border" />
          <div className="space-y-1">
            <div className="h-4 w-20 mx-auto rounded skeleton-shimmer" />
            <div className="h-3 w-16 mx-auto rounded skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SeriesDetailHeroSkeleton: React.FC<{
  onBack?: () => void;
  onNavigateHome: () => void;
  onNavigateToSeries: () => void;
}> = ({
  onBack,
  onNavigateHome,
  onNavigateToSeries
}) => {
  return (
    <article className="w-full space-y-8 animate-in fade-in duration-300" aria-label="Loading television series details...">
      {/* Top Breadcrumb Navigation Skeleton */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs cv-text-muted py-2 border-b cv-border-subtle overflow-x-auto whitespace-nowrap">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
          className="flex items-center gap-1 hover:text-[var(--cv-text)] transition-colors"
        >
          <span>Home</span>
        </a>
        <span aria-hidden="true">/</span>
        <a
          href="/series"
          onClick={(e) => {
            e.preventDefault();
            onNavigateToSeries();
          }}
          className="hover:text-[var(--cv-text)] transition-colors"
        >
          TV Series
        </a>
        <span aria-hidden="true">/</span>
        <div className="h-4 w-32 rounded-md skeleton-shimmer inline-block" />
      </nav>

      {/* Hero Series Presentation Header Skeleton (Dark Cinema Stage) */}
      <header className="movie-detail-hero hero-cinema-container relative rounded-3xl overflow-hidden border shadow-2xl">
        <div className="relative h-72 sm:h-96 md:h-[420px] w-full overflow-hidden bg-[#050505]">
          <div className="w-full h-full skeleton-shimmer opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]/80" />

          {/* Top Quick Actions Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-black/70 text-neutral-100 rounded-full border border-white/15 text-xs font-semibold shadow-lg cursor-pointer"
            >
              <ArrowLeft size={15} />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 rounded-full skeleton-shimmer" />
            </div>
          </div>
        </div>

        {/* Hero Content Section */}
        <div className="relative px-4 sm:px-8 md:px-10 pb-8 sm:pb-10 -mt-36 sm:-mt-52 md:-mt-64 z-20">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
            {/* Poster Card */}
            <div className="w-40 sm:w-56 md:w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/15 shrink-0 bg-neutral-900 skeleton-shimmer" />

            {/* Title, Badges, CTAs, and Overview */}
            <div className="flex-1 min-w-0 w-full space-y-5 pt-2 sm:pt-4">
              <div className="space-y-3">
                <div className="h-8 sm:h-11 w-3/4 max-w-lg rounded-2xl skeleton-shimmer" />
                <div className="h-4 w-44 rounded-md skeleton-shimmer" />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="h-6 w-20 rounded-md skeleton-shimmer" />
                  <div className="h-6 w-24 rounded-md skeleton-shimmer" />
                  <div className="h-6 w-28 rounded-md skeleton-shimmer" />
                  <div className="h-6 w-16 rounded-md skeleton-shimmer" />
                  <div className="h-6 w-20 rounded-md skeleton-shimmer" />
                </div>
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="h-11 w-36 rounded-full skeleton-shimmer" />
                <div className="h-11 w-44 rounded-full skeleton-shimmer" />
                <div className="h-11 w-11 rounded-full skeleton-shimmer" />
                <div className="h-11 w-11 rounded-full skeleton-shimmer" />
              </div>

              {/* Plot Summary Lines */}
              <div className="space-y-2.5 max-w-3xl pt-2">
                <div className="h-3.5 w-full rounded-md skeleton-shimmer" />
                <div className="h-3.5 w-11/12 rounded-md skeleton-shimmer" />
                <div className="h-3.5 w-4/5 rounded-md skeleton-shimmer" />
              </div>

              {/* Tech Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 max-w-3xl">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="h-3 w-14 rounded skeleton-shimmer" />
                    <div className="h-4 w-20 rounded-md skeleton-shimmer" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Row Skeleton */}
      <div className="flex items-center gap-2 border-b cv-border-subtle pb-3">
        <div className="h-10 w-36 rounded-xl skeleton-shimmer" />
        <div className="h-10 w-32 rounded-xl skeleton-shimmer" />
        <div className="h-10 w-28 rounded-xl skeleton-shimmer" />
        <div className="h-10 w-24 rounded-xl skeleton-shimmer" />
      </div>

      {/* Release List Content Skeleton */}
      <SeriesDetailTorrentsSkeleton />
    </article>
  );
};

export const SeriesDetailPage: React.FC<SeriesDetailPageProps> = ({
  seriesId,
  seriesTitle,
  initialShow,
  initialTorrent,
  onBack,
  onNavigateHome,
  onNavigateToSeries,
  onSelectSeries,
  onSelectGenre,
  onPlayTrailer,
  onCopyMagnet,
  onShowToast,
  onOpenGuide,
  onOpenFilmography,
  onAskCineBot,
  isWatchlisted,
  onToggleWatchlist
}) => {
  // Target IMDb or title
  const effectiveImdb = useMemo(() => {
    if (initialShow?.imdb_code) return initialShow.imdb_code;
    if (initialShow?.imdb_id) return `tt${initialShow.imdb_id}`;
    if (initialTorrent?.imdb_id && initialTorrent.imdb_id !== '0') return `tt${initialTorrent.imdb_id}`;
    if (seriesId && /^tt\d+/i.test(seriesId)) {
      const match = seriesId.match(/^(tt\d+)/i);
      if (match) return match[1];
    }
    return undefined;
  }, [initialShow, initialTorrent, seriesId]);

  const cleanInitialTitle = useMemo(() => {
    if (initialShow?.name) return initialShow.name;
    if (seriesTitle) return seriesTitle;
    if (initialTorrent?.title) return extractShowTitleFromRelease(initialTorrent.title);
    if (seriesId) {
      const match = seriesId.match(/^tt\d+-?(.*)/i);
      if (match && match[1]) return match[1].replace(/-/g, ' ').trim();
      return seriesId.replace(/^(tt\d+-?)/i, '').replace(/-/g, ' ').trim();
    }
    return '';
  }, [initialShow, seriesTitle, initialTorrent, seriesId]);

  const [show, setShow] = useState<TvShowDetails | null>(() => {
    if (initialShow && (initialShow as TvShowDetails).episodes) return initialShow as TvShowDetails;
    if (initialShow?.name) {
      return {
        id: initialShow.id || 0,
        name: initialShow.name,
        imdb_code: initialShow.imdb_code || (initialShow.imdb_id ? `tt${initialShow.imdb_id}` : ''),
        imdb_id: initialShow.imdb_id || (initialShow.imdb_code ? initialShow.imdb_code.replace(/^tt/i, '') : ''),
        year: initialShow.year,
        rating: initialShow.rating || 7.9,
        image: initialShow.image,
        summary: initialShow.summary,
        genres: initialShow.genres || ['TV Series'],
        network: initialShow.network,
        cast: [],
        episodes: []
      };
    }
    if (cleanInitialTitle) {
      return {
        id: 0,
        name: cleanInitialTitle,
        imdb_code: effectiveImdb || '',
        imdb_id: effectiveImdb ? effectiveImdb.replace(/^tt/i, '') : '',
        year: initialTorrent?.date_released_unix ? new Date(initialTorrent.date_released_unix * 1000).getFullYear().toString() : undefined,
        rating: 7.9,
        genres: ['TV Series', 'Drama'],
        summary: `Explore and download high-speed television series releases for ${cleanInitialTitle}. Complete seasons and individual episodes verified in 1080p, 720p, and HEVC.`,
        cast: [],
        episodes: []
      };
    }
    return null;
  });

  const [torrents, setTorrents] = useState<EztvTorrent[]>(() => {
    return initialTorrent ? [initialTorrent] : [];
  });
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(() => {
    return !initialShow?.name && !cleanInitialTitle;
  });
  const [isLoadingTorrents, setIsLoadingTorrents] = useState<boolean>(!initialTorrent);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'torrents' | 'episodes' | 'cast' | 'overview'>('torrents');

  // Filters within torrents
  const [selectedSeason, setSelectedSeason] = useState<string>('All');
  const [selectedQuality, setSelectedQuality] = useState<string>('All');
  const [releaseSearch, setReleaseSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'seeds' | 'season_ep' | 'size_desc' | 'size_asc'>('latest');
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [collapsedSeasons, setCollapsedSeasons] = useState<Record<string, boolean>>({});
  const [isSearchingSeason, setIsSearchingSeason] = useState<boolean>(false);
  const [showAllGuideSeasons, setShowAllGuideSeasons] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Selected episode filter for episode guide tab
  const [guideSeason, setGuideSeason] = useState<number>(1);

  // Persistent episode watch tracking
  const storageKey = useMemo(() => {
    const identifier = show?.imdb_code || effectiveImdb || (show?.id ? `show_${show.id}` : cleanInitialTitle.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    return `cv_watched_episodes_${identifier}`;
  }, [show?.imdb_code, effectiveImdb, show?.id, cleanInitialTitle]);

  const [watchedEpisodes, setWatchedEpisodes] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(storageKey);
      setWatchedEpisodes(raw ? JSON.parse(raw) : {});
    } catch {
      setWatchedEpisodes({});
    }
  }, [storageKey]);

  const toggleEpisodeWatched = (epTag: string) => {
    setWatchedEpisodes((prev) => {
      const isNowWatched = !prev[epTag];
      const next = { ...prev };
      if (isNowWatched) {
        next[epTag] = true;
      } else {
        delete next[epTag];
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const markSeasonWatched = (seasonNum: number, markAsWatched: boolean) => {
    if (!show?.episodes) return;
    setWatchedEpisodes((prev) => {
      const next = { ...prev };
      show.episodes?.forEach((ep) => {
        if (ep.season === seasonNum) {
          const epTag = `S${String(ep.season).padStart(2, '0')}E${String(ep.number).padStart(2, '0')}`;
          if (markAsWatched) {
            next[epTag] = true;
          } else {
            delete next[epTag];
          }
        }
      });
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Next up to watch episode detection
  const nextUpEpisode = useMemo(() => {
    if (!show?.episodes || show.episodes.length === 0) return null;
    const sorted = [...show.episodes].sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      return a.number - b.number;
    });
    for (const ep of sorted) {
      const epTag = `S${String(ep.season).padStart(2, '0')}E${String(ep.number).padStart(2, '0')}`;
      if (!watchedEpisodes[epTag]) {
        // Find best seeder torrent for this episode
        const matchingTorrents = torrents.filter((t) => {
          const meta = parseReleaseMeta(t);
          return meta.season === ep.season && meta.episode === ep.number;
        }).sort((a, b) => (b.seeds || 0) - (a.seeds || 0));
        return {
          ep,
          tag: epTag,
          matchingTorrent: matchingTorrents[0] || null,
          allTorrents: matchingTorrents
        };
      }
    }
    return null;
  }, [show?.episodes, watchedEpisodes, torrents]);

  // Overall watch stats
  const totalWatchedCount = useMemo(() => {
    if (!show?.episodes || show.episodes.length === 0) return 0;
    return show.episodes.filter(ep => {
      const tag = `S${String(ep.season).padStart(2, '0')}E${String(ep.number).padStart(2, '0')}`;
      return Boolean(watchedEpisodes[tag]);
    }).length;
  }, [show?.episodes, watchedEpisodes]);

  const overallWatchPercent = useMemo(() => {
    if (!show?.episodes || show.episodes.length === 0) return 0;
    return Math.round((totalWatchedCount / show.episodes.length) * 100);
  }, [totalWatchedCount, show?.episodes]);

  // Copy all season magnets helper
  const handleCopySeasonMagnets = (seasonNum: number) => {
    const seasonTorrents = torrents.filter(t => {
      const meta = parseReleaseMeta(t);
      return meta.season === seasonNum;
    });

    const magnetUrls = seasonTorrents
      .map(t => t.magnet_url)
      .filter((url): url is string => Boolean(url));

    if (magnetUrls.length === 0) {
      onShowToast(`No magnet links available for Season ${seasonNum}`, 'info');
      return;
    }

    const uniqueMagnets = Array.from(new Set(magnetUrls));
    const textToCopy = uniqueMagnets.join('\n');
    navigator.clipboard.writeText(textToCopy);
    onShowToast(`Copied ${uniqueMagnets.length} magnet links for Season ${seasonNum} to clipboard!`, 'success');
  };

  // Concurrently load TV show details and torrent releases in parallel for ultra-fast loading
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!show?.episodes || show.episodes.length === 0) {
        setIsLoadingDetails((prev) => (prev ? prev : true));
      }
      setIsLoadingTorrents((prev) => (prev ? prev : true));
      setError(null);

      // 1. Fetch TV show metadata
      const detailsPromise = (async () => {
        try {
          let details: TvShowDetails | null = null;
          if (effectiveImdb) {
            details = await fetchTvShowDetails({ imdb: effectiveImdb });
          }
          if (!details && cleanInitialTitle) {
            details = await fetchTvShowDetails({ title: cleanInitialTitle });
          }
          if (!details && seriesId) {
            const match = seriesId.match(/^(tt\d+)/i);
            if (match) {
              details = await fetchTvShowDetails({ imdb: match[1] });
            } else {
              details = await fetchTvShowDetails({ title: seriesId.replace(/-/g, ' ') });
            }
          }
          if (!details && initialTorrent?.title) {
            details = await fetchTvShowDetails({ title: initialTorrent.title });
          }
          return details;
        } catch (err) {
          console.error('Error fetching TV details:', err);
          return null;
        }
      })();

      // 2. Concurrently fetch EZTV releases for the show
      const releasesPromise = (async () => {
        try {
          const imdbToUse = effectiveImdb || initialTorrent?.imdb_id;
          let res: EztvApiResponse | null = null;

          if (imdbToUse && imdbToUse !== '0') {
            res = await fetchEztvTorrents({ imdb_id: imdbToUse, limit: 100 });
          }

          if ((!res || !res.torrents || res.torrents.length === 0) && cleanInitialTitle) {
            res = await fetchEztvTorrents({ search: cleanInitialTitle, limit: 100 });
          }

          return res;
        } catch (err) {
          console.warn('Could not fetch releases for series:', err);
          return null;
        }
      })();

      const [detailsResult, releasesResult] = await Promise.all([detailsPromise, releasesPromise]);

      if (!isMounted) return;

      if (detailsResult) {
        setShow(detailsResult);
        setIsLoadingDetails(false);
      } else if (initialShow) {
        setShow(initialShow as TvShowDetails);
        setIsLoadingDetails(false);
      } else {
        setIsLoadingDetails(false);
        if (!cleanInitialTitle) {
          setError('Television series information could not be located.');
        }
      }

      if (releasesResult && releasesResult.torrents && releasesResult.torrents.length > 0) {
        const allTorrents = [...releasesResult.torrents];
        if (initialTorrent && !allTorrents.some((t) => t.hash === initialTorrent.hash)) {
          allTorrents.unshift(initialTorrent);
        }
        setTorrents(allTorrents);
      } else if (initialTorrent) {
        setTorrents([initialTorrent]);
      }
      setIsLoadingTorrents(false);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [effectiveImdb, seriesId, cleanInitialTitle]);

  // Dynamic SEO head tags
  useEffect(() => {
    if (!show) return;

    const seoTitle = `${show.name} (${show.year || 'TV Series'}) — Watch Series Details & Torrents | CineVault By Sasuu`;
    const seoDescription = show.summary || `Download & stream ${show.name} TV episodes in 1080p, 720p, and HEVC. High-speed EZTV magnets and complete season guides on CineVault.`;
    const canonicalPath = getSeriesPath(show);

    updateDocumentSeo({
      title: seoTitle,
      description: seoDescription.slice(0, 160),
      canonicalUrl: window.location.origin + canonicalPath,
      ogImage: show.backdropImage || show.image,
      ogType: 'video.tv_show',
      breadcrumbs: [
        { name: 'Home', item: '/' },
        { name: 'TV Series', item: '/series' },
        ...(show.genres?.[0] ? [{ name: show.genres[0], item: `/series?genre=${encodeURIComponent(show.genres[0])}` }] : []),
        { name: show.name, item: canonicalPath }
      ]
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [show]);

  // Map of release hash to parsed meta
  const torrentsWithMeta = useMemo(() => {
    return torrents.map((t) => ({
      torrent: t,
      meta: parseReleaseMeta(t)
    }));
  }, [torrents]);

  // Season statistics & list
  const seasonStats = useMemo(() => {
    const counts: Record<number, number> = {};
    let packsCount = 0;
    const seasonsWithReleasesSet = new Set<number>();

    torrentsWithMeta.forEach(({ meta }) => {
      if (meta.isSeasonPack) {
        packsCount++;
      }
      if (meta.season && meta.season > 0) {
        counts[meta.season] = (counts[meta.season] || 0) + 1;
        seasonsWithReleasesSet.add(meta.season);
      }
    });

    const seasonsWithReleases = Array.from(seasonsWithReleasesSet).sort((a, b) => a - b);

    // Guide seasons from show.episodes
    const guideSeasonsSet = new Set<number>();
    show?.episodes?.forEach((e) => {
      if (e.season > 0) guideSeasonsSet.add(e.season);
    });
    const guideSeasons = Array.from(guideSeasonsSet).sort((a, b) => a - b);

    // Seasons in guide that have 0 releases
    const seasonsWithoutReleases = guideSeasons.filter((s) => !seasonsWithReleasesSet.has(s));

    // Combined unique seasons known to the show
    const allKnownSeasons = Array.from(new Set([...seasonsWithReleases, ...guideSeasons])).sort((a, b) => a - b);

    return {
      counts,
      packsCount,
      seasonsWithReleases,
      guideSeasons,
      seasonsWithoutReleases,
      allKnownSeasons
    };
  }, [torrentsWithMeta, show?.episodes]);

  // Quality statistics across current torrents
  const qualityCounts = useMemo(() => {
    const qCounts: Record<string, number> = {
      'All': torrents.length,
      '1080p': 0,
      '720p': 0,
      '4K UHD': 0,
      'x265 / HEVC': 0,
      '480p': 0
    };

    torrentsWithMeta.forEach(({ meta }) => {
      if (meta.qualityInfo.is1080p) qCounts['1080p']++;
      if (meta.qualityInfo.is720p) qCounts['720p']++;
      if (meta.qualityInfo.is4k) qCounts['4K UHD']++;
      if (meta.qualityInfo.isHevc) qCounts['x265 / HEVC']++;
      if (!meta.qualityInfo.is1080p && !meta.qualityInfo.is720p && !meta.qualityInfo.is4k) {
        qCounts['480p']++;
      }
    });

    return qCounts;
  }, [torrentsWithMeta, torrents.length]);

  // Filtered & sorted torrent releases
  const filteredTorrents = useMemo(() => {
    const result = torrentsWithMeta.filter(({ torrent, meta }) => {
      // Season filter
      if (selectedSeason !== 'All') {
        if (selectedSeason === 'Packs') {
          if (!meta.isSeasonPack) return false;
        } else {
          const sNum = parseInt(selectedSeason, 10);
          if (meta.season !== sNum) return false;
        }
      }

      // Quality filter
      if (selectedQuality !== 'All') {
        if (selectedQuality === '1080p' && !meta.qualityInfo.is1080p) return false;
        if (selectedQuality === '720p' && !meta.qualityInfo.is720p) return false;
        if (selectedQuality === '4K UHD' && !meta.qualityInfo.is4k) return false;
        if (selectedQuality === 'x265 / HEVC' && !meta.qualityInfo.isHevc) return false;
        if (selectedQuality === '480p' && (meta.qualityInfo.is1080p || meta.qualityInfo.is720p || meta.qualityInfo.is4k)) return false;
      }

      // Text search inside releases
      if (releaseSearch.trim()) {
        const needle = releaseSearch.toLowerCase().trim();
        const haystack = `${torrent.title} ${torrent.filename || ''} S${meta.season || ''}E${meta.episode || ''} ${meta.qualityInfo.quality}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'seeds') {
        return (b.torrent.seeds || 0) - (a.torrent.seeds || 0);
      }
      if (sortBy === 'season_ep') {
        const sDiff = (a.meta.season || 999) - (b.meta.season || 999);
        if (sDiff !== 0) return sDiff;
        return (a.meta.episode || 999) - (b.meta.episode || 999);
      }
      if (sortBy === 'size_desc') {
        const sizeA = parseInt(String(a.torrent.size_bytes || '0'), 10);
        const sizeB = parseInt(String(b.torrent.size_bytes || '0'), 10);
        return sizeB - sizeA;
      }
      if (sortBy === 'size_asc') {
        const sizeA = parseInt(String(a.torrent.size_bytes || '0'), 10);
        const sizeB = parseInt(String(b.torrent.size_bytes || '0'), 10);
        return sizeA - sizeB;
      }
      // 'latest' default
      return (b.torrent.date_released_unix || 0) - (a.torrent.date_released_unix || 0);
    });

    return result.map(item => item.torrent);
  }, [torrentsWithMeta, selectedSeason, selectedQuality, releaseSearch, sortBy]);

  // Grouped torrents by season for Grouped View
  const groupedTorrents = useMemo(() => {
    const groups: { [key: string]: { seasonLabel: string; seasonNum: number | null; torrents: EztvTorrent[]; totalBytes: number; maxSeeds: number } } = {};

    filteredTorrents.forEach((t) => {
      const meta = parseReleaseMeta(t);
      const key = meta.isSeasonPack
        ? 'packs'
        : meta.season
        ? `season_${meta.season}`
        : 'other';

      const label = meta.isSeasonPack
        ? 'Complete Season Packs & Bundles'
        : meta.season
        ? `Season ${meta.season}`
        : 'Other Releases & Specials';

      if (!groups[key]) {
        groups[key] = {
          seasonLabel: label,
          seasonNum: meta.isSeasonPack ? null : meta.season,
          torrents: [],
          totalBytes: 0,
          maxSeeds: 0
        };
      }

      groups[key].torrents.push(t);
      const b = parseInt(String(t.size_bytes || '0'), 10);
      if (!isNaN(b)) groups[key].totalBytes += b;
      if (t.seeds > groups[key].maxSeeds) groups[key].maxSeeds = t.seeds;
    });

    return Object.entries(groups).sort(([, a], [, b]) => {
      if (a.seasonNum && b.seasonNum) return a.seasonNum - b.seasonNum;
      if (a.seasonNum) return -1;
      if (b.seasonNum) return 1;
      return 0;
    });
  }, [filteredTorrents]);

  // Search alternative title on EZTV for missing season
  const handleSearchAlternativeSeason = async (seasonNum: number) => {
    const titleToSearch = show?.name || cleanInitialTitle;
    if (!titleToSearch) return;
    setIsSearchingSeason(true);
    onShowToast(`Searching tracker for Season ${seasonNum} releases...`, 'info');

    try {
      const sPadded = `S${String(seasonNum).padStart(2, '0')}`;
      const query = `${titleToSearch} ${sPadded}`;
      const res = await fetchEztvTorrents({ search: query, limit: 100 });

      if (res && res.torrents && res.torrents.length > 0) {
        setTorrents(prev => {
          const existingHashes = new Set(prev.map(t => t.hash));
          const newReleases = res.torrents.filter(t => !existingHashes.has(t.hash));
          if (newReleases.length === 0) {
            onShowToast(`No additional torrents found for Season ${seasonNum}`, 'info');
            return prev;
          }
          onShowToast(`Found ${newReleases.length} new releases for Season ${seasonNum}!`, 'success');
          return [...prev, ...newReleases];
        });
        setSelectedSeason(String(seasonNum));
      } else {
        onShowToast(`No releases found on EZTV for Season ${seasonNum}`, 'info');
      }
    } catch {
      onShowToast(`Search query failed for Season ${seasonNum}`, 'error');
    } finally {
      setIsSearchingSeason(false);
    }
  };

  // Primary release for quick action (e.g. S01E01 or latest)
  const primaryTorrent = useMemo(() => {
    if (initialTorrent) return initialTorrent;
    return torrents[0] || null;
  }, [torrents, initialTorrent]);

  const handleCopyMagnetLink = (torrent: EztvTorrent) => {
    if (!torrent.magnet_url) {
      onShowToast('Magnet link is unavailable for this release', 'error');
      return;
    }
    navigator.clipboard.writeText(torrent.magnet_url)
      .then(() => {
        setCopiedHash(torrent.hash);
        onShowToast('Magnet link copied to clipboard!', 'success');
        setTimeout(() => setCopiedHash(null), 3000);
      })
      .catch(() => {
        onCopyMagnet(torrent.magnet_url, torrent.title);
      });
  };

  const handleDirectDownload = (e: React.MouseEvent, torrent: EztvTorrent) => {
    e.stopPropagation();
    if (!torrent.magnet_url) {
      onShowToast('Magnet link unavailable', 'error');
      return;
    }
    window.location.href = torrent.magnet_url;
    onShowToast(`Launching BitTorrent client for ${torrent.title}...`, 'info');
  };

  const handleSharePage = () => {
    setIsShareModalOpen(true);
  };

  const isCurrentWatchlisted = useMemo(() => {
    if (!isWatchlisted || !show) return false;
    const target = show.imdb_code || show.imdb_id || (show.id ? String(show.id) : '');
    return isWatchlisted(target) || isWatchlisted(show.name);
  }, [isWatchlisted, show]);

  const seriesPosterCandidates = useMemo(() => {
    return getSeriesPosterCandidates({
      ...show,
      name: show?.name || cleanInitialTitle,
      title: show?.name || cleanInitialTitle,
      imdb_code: effectiveImdb,
      image: show?.image
    });
  }, [show, cleanInitialTitle, effectiveImdb]);

  const [posterIndex, setPosterIndex] = useState(0);

  useEffect(() => {
    setPosterIndex(0);
  }, [seriesPosterCandidates]);

  const handlePosterError = () => {
    if (posterIndex + 1 < seriesPosterCandidates.length) {
      setPosterIndex((prev) => prev + 1);
    }
  };

  const currentPosterSrc = seriesPosterCandidates[posterIndex] || CINEVAULT_POSTER_FALLBACK;
  const backdropImage = show?.backdropImage || show?.image || currentPosterSrc || null;

  if (isLoadingDetails && !show) {
    return (
      <SeriesDetailHeroSkeleton
        onBack={onBack}
        onNavigateHome={onNavigateHome}
        onNavigateToSeries={onNavigateToSeries}
      />
    );
  }

  return (
    <article className="w-full space-y-8 animate-in fade-in duration-300">
      
      {/* Top Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs cv-text-muted py-2 border-b cv-border-subtle overflow-x-auto whitespace-nowrap">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
          className="flex items-center gap-1 hover:text-[var(--cv-text)] transition-colors"
        >
          <span>Home</span>
        </a>
        <span aria-hidden="true">/</span>
        <a
          href="/series"
          onClick={(e) => {
            e.preventDefault();
            onNavigateToSeries();
          }}
          className="hover:text-[var(--cv-text)] transition-colors"
        >
          TV Series
        </a>
        {show?.genres?.[0] && (
          <>
            <span aria-hidden="true">/</span>
            <button
              onClick={() => onSelectGenre && onSelectGenre(show.genres![0])}
              className="hover:text-[var(--cv-accent-text)] transition-colors cursor-pointer"
            >
              {show.genres[0]}
            </button>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="cv-text font-semibold truncate max-w-xs sm:max-w-md">
          {show ? `${show.name} (${show.year || 'Series'})` : 'Loading...'}
        </span>
      </nav>

      {/* Hero Series Presentation Header - Identical to MovieDetailPage Cinema Layout */}
      <header className="movie-detail-hero hero-cinema-container relative rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl">
        
        {/* Backdrop Banner */}
        <div className="relative h-72 sm:h-96 md:h-[420px] w-full overflow-hidden bg-[#050505]">
          {backdropImage ? (
            <img
              src={backdropImage}
              alt={`${show?.name || 'TV Series'} Backdrop Still`}
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
              onClick={onBack || (() => onNavigateToSeries())}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-black/75 hover:bg-black/90 text-neutral-100 hover:text-white rounded-full border border-white/15 text-xs font-semibold shadow-lg transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft size={15} />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSharePage}
                className="flex items-center gap-1.5 px-3 py-2 bg-black/75 hover:bg-black/90 text-neutral-100 hover:text-white rounded-full border border-white/15 text-xs font-semibold shadow-lg transition-colors cursor-pointer"
                title="Share this series URL"
                aria-label="Share series link"
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

              {onToggleWatchlist && show && (
                <button
                  onClick={() => onToggleWatchlist(show)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold shadow-lg transition-colors cursor-pointer ${
                    isCurrentWatchlisted
                      ? 'cv-btn-playback'
                      : 'bg-black/75 hover:bg-black/90 text-neutral-100 hover:text-white border-white/15'
                  }`}
                >
                  {isCurrentWatchlisted ? <BookmarkIcon size={16} /> : <BookmarkPlusIcon size={16} />}
                  <span>{isCurrentWatchlisted ? 'Watchlisted' : 'Add to Watchlist'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Overlap Banner */}
        <div className="relative px-4 sm:px-8 pb-8 -mt-36 sm:-mt-48 z-10">
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
            
            {/* Poster Card */}
            <div className="shrink-0 mx-auto md:mx-0 w-48 sm:w-56 md:w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 bg-[#050505] relative group">
              <img
                key={`series-poster-${show?.name || effectiveImdb || 'series'}-${posterIndex}`}
                src={currentPosterSrc}
                alt={`${show?.name || 'TV Series'} Official Poster`}
                width="256"
                height="384"
                loading="eager"
                referrerPolicy="no-referrer"
                onError={handlePosterError}
                className="w-full h-full object-cover transition-opacity duration-300"
              />

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white pointer-events-none">
                <Tv size={32} className="text-rose-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Television Series</span>
              </div>
            </div>

            {/* Title & Metadata Header */}
            <div className="flex-1 space-y-4 text-center md:text-left">
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="movie-hero-badge px-2.5 py-1 text-xs font-black uppercase tracking-wider cv-btn-primary rounded-lg shadow-md">
                  {show?.year || 'Series'}
                </span>

                {show?.network && (
                  <span className="movie-hero-badge px-2.5 py-1 text-xs font-bold tracking-wider bg-neutral-800/90 text-neutral-100 border border-white/15 rounded-lg">
                    {show.network}
                  </span>
                )}

                {show?.status && (
                  <span className={`movie-hero-badge px-2.5 py-1 text-xs font-bold tracking-wider rounded-lg border inline-flex items-center gap-1.5 ${
                    show.status.toLowerCase() === 'running'
                      ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500/40'
                      : show.status.toLowerCase() === 'ended'
                      ? 'bg-neutral-800/90 text-neutral-200 border-white/15'
                      : 'bg-amber-950/80 text-amber-200 border-amber-500/40'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      show.status.toLowerCase() === 'running'
                        ? 'bg-emerald-400 animate-pulse'
                        : show.status.toLowerCase() === 'ended'
                        ? 'bg-neutral-400'
                        : 'bg-amber-400'
                    }`} />
                    <span>
                      {show.status.toLowerCase() === 'running'
                        ? (show.schedule?.days && show.schedule.days.length > 0
                            ? `Currently Airing (${show.schedule.days.join(', ')}${show.schedule.time ? ` • ${show.schedule.time}` : ''})`
                            : 'Currently Airing')
                        : show.status.toLowerCase() === 'ended'
                        ? 'Series Complete'
                        : show.status}
                    </span>
                  </span>
                )}

                {torrents.some(t => parseQualityFromEztv(t.title, t.filename).is4k) && (
                  <span className="movie-hero-badge px-2 py-1 text-xs font-extrabold uppercase tracking-wider bg-amber-950/80 text-amber-200 border border-amber-500/40 rounded-lg">
                    4K Ultra HD
                  </span>
                )}

                {torrents.some(t => parseQualityFromEztv(t.title, t.filename).isHevc) && (
                  <span className="movie-hero-badge px-2 py-1 text-xs font-bold uppercase tracking-wider bg-indigo-950/80 text-indigo-200 border border-indigo-400/40 rounded-lg">
                    x265 / HEVC
                  </span>
                )}
              </div>

              <div>
                <h1 className="movie-hero-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight drop-shadow-md">
                  {show?.name || 'Loading Series...'}
                </h1>
                {show?.language && (
                  <p className="movie-hero-subtitle text-sm text-neutral-200 font-medium mt-1">
                    Language: {show.language} {show.type ? `• ${show.type}` : ''}
                  </p>
                )}
              </div>

              <div className="movie-hero-meta-row flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6 py-2 text-xs sm:text-sm text-neutral-100">
                <div className="movie-imdb-badge flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/35 px-3 py-1.5 rounded-xl text-amber-300 font-bold">
                  <span className="text-base font-extrabold">
                    {show?.rating ? show.rating.toFixed(1) : (torrents.length > 0 ? '7.9' : 'NR')}
                  </span>
                  <span className="text-[10px] text-amber-200/90 font-medium">/10 Rating</span>
                </div>

                {show?.averageRuntime && (
                  <div className="movie-meta-pill flex items-center gap-1.5 text-neutral-100 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                    <Clock size={14} className="text-neutral-200" />
                    <span>~{show.averageRuntime} min / episode</span>
                  </div>
                )}

                {seasonStats.allKnownSeasons.length > 0 && (
                  <div className="movie-meta-pill flex items-center gap-1.5 text-neutral-100 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                    <span>{seasonStats.allKnownSeasons.length} Season{seasonStats.allKnownSeasons.length > 1 ? 's' : ''}</span>
                  </div>
                )}

                <div className="movie-meta-pill flex items-center gap-1.5 text-neutral-100 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                  <span>{torrents.length} Download Releases</span>
                </div>
              </div>

              {show?.genres && show.genres.length > 0 && (
                <div className="movie-hero-genres flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                  {show.genres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => onSelectGenre && onSelectGenre(genre)}
                      className="movie-genre-chip px-3 py-1 text-xs font-semibold text-neutral-100 bg-white/10 hover:bg-rose-600/40 hover:text-white hover:border-rose-500/50 rounded-full border border-white/15 transition-colors cursor-pointer backdrop-blur-sm"
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 pt-2">
                {onPlayTrailer && (
                  <button
                    onClick={() => onPlayTrailer('', `${show?.name || cleanInitialTitle} Official Trailer`)}
                    className="movie-trailer-btn px-4 sm:px-5 py-2.5 cv-btn-playback font-bold text-xs sm:text-sm rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                    title="Watch Official Trailer"
                  >
                    <PlayIcon size={16} />
                    <span>Watch Trailer</span>
                  </button>
                )}

                {primaryTorrent && (
                  <>
                    <button
                      onClick={(e) => handleDirectDownload(e, primaryTorrent)}
                      className="px-4 sm:px-5 py-2.5 cv-btn-magnet font-bold text-xs sm:text-sm rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                      title={`Launch ${primaryTorrent.title} Magnet Download directly`}
                    >
                      <Magnet size={16} />
                      <span>Magnet Download</span>
                    </button>

                    <button
                      onClick={() => handleCopyMagnetLink(primaryTorrent)}
                      className="px-4 py-2.5 bg-white text-slate-900 hover:bg-neutral-200 font-bold text-xs sm:text-sm rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                      title="Copy complete Magnet URI"
                    >
                      <CopyIcon size={16} />
                      {copiedHash === primaryTorrent.hash ? (
                        <span className="text-emerald-700 font-semibold">URI Copied!</span>
                      ) : (
                        <span>Copy URI</span>
                      )}
                    </button>
                  </>
                )}

                <button
                  onClick={onOpenGuide}
                  className="movie-action-pill px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm rounded-full border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
                >
                  <Info size={14} />
                  <span>How to Download</span>
                </button>

                {onAskCineBot && show && (
                  <button
                    onClick={() => onAskCineBot(`Tell me about the television series "${show.name}" (${show.year || ''}) and recommend 3 similar binge-worthy shows.`)}
                    className="px-4 py-2.5 cv-nav-soft-active font-bold text-xs sm:text-sm rounded-full transition-all flex items-center cursor-pointer shadow-sm"
                    title="Ask CineBot AI about this series"
                  >
                    <span>Ask CineBot AI</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mid-Page AdSlot */}
      <AdSenseSlot format="auto" responsive={true} />

      {/* Main Content Tabs */}
      <div className="space-y-6">
        
        {/* Navigation Tabs Bar */}
        <nav
          aria-label="Series Navigation Tabs"
          role="tablist"
          className="flex items-center gap-2 border-b cv-border overflow-x-auto pb-2"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'torrents'}
            onClick={() => setActiveTab('torrents')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'torrents' ? 'cv-nav-pill-active shadow-md' : 'cv-nav-pill'
            }`}
          >
            <Magnet className="w-4 h-4" />
            <span>Episodes & Releases ({torrents.length})</span>
          </button>

          {show?.episodes && show.episodes.length > 0 && (
            <button
              role="tab"
              aria-selected={activeTab === 'episodes'}
              onClick={() => setActiveTab('episodes')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'episodes' ? 'cv-nav-pill-active shadow-md' : 'cv-nav-pill'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Episode Guide ({show.episodes.length})</span>
            </button>
          )}

          {show?.cast && show.cast.length > 0 && (
            <button
              role="tab"
              aria-selected={activeTab === 'cast'}
              onClick={() => setActiveTab('cast')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'cast' ? 'cv-nav-pill-active shadow-md' : 'cv-nav-pill'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Cast & Characters ({show.cast.length})</span>
            </button>
          )}

          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview' ? 'cv-nav-pill-active shadow-md' : 'cv-nav-pill'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Series Synopsis & Tech</span>
          </button>
        </nav>

        {/* Watch Progress & Next Up Queue Card */}
        {show?.episodes && show.episodes.length > 0 && (
          <div className="space-y-3.5">
            {/* Overall Progress Bar */}
            <div className="p-3.5 sm:px-5 rounded-2xl border cv-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold cv-text">
                    Series Watch Progress: {totalWatchedCount} of {show.episodes.length} episodes watched
                  </span>
                  <span className="font-mono font-bold cv-text-accent">{overallWatchPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full cv-surface-muted border cv-border-subtle overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${overallWatchPercent}%`,
                      background: 'linear-gradient(90deg, var(--cv-nav-active-bg), var(--cv-rating-text))'
                    }}
                  />
                </div>
              </div>

              {totalWatchedCount > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Reset your watch progress for this series?')) {
                      setWatchedEpisodes({});
                      try {
                        localStorage.removeItem(storageKey);
                      } catch {}
                    }
                  }}
                  className="text-[11px] cv-text-muted hover:text-[var(--cv-accent-text)] underline cursor-pointer shrink-0"
                >
                  Reset Progress
                </button>
              )}
            </div>

            {/* Next Up to Watch Card */}
            {nextUpEpisode ? (
              <div className="p-4 sm:p-5 rounded-2xl border border-[var(--cv-nav-active-border)] cv-surface-elevated flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                  <div className="w-20 h-14 sm:w-28 sm:h-18 rounded-xl overflow-hidden cv-surface-muted shrink-0 border cv-border relative">
                    <img
                      src={nextUpEpisode.ep.image?.medium || currentPosterSrc}
                      alt={nextUpEpisode.ep.name}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/85 font-mono font-bold text-[10px] text-white">
                      {nextUpEpisode.tag}
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md cv-nav-soft-active text-[10px] font-bold uppercase tracking-wider">
                        Next Up
                      </span>
                      {nextUpEpisode.ep.airdate && (
                        <span className="text-[11px] cv-text-muted">
                          Aired: {nextUpEpisode.ep.airdate}
                        </span>
                      )}
                      {nextUpEpisode.ep.runtime && (
                        <span className="text-[11px] cv-text-muted font-mono">
                          • {nextUpEpisode.ep.runtime} min
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold cv-text truncate">
                      {nextUpEpisode.ep.number}. {nextUpEpisode.ep.name}
                    </h3>
                    {nextUpEpisode.ep.summary && (
                      <p className="text-xs cv-text-secondary line-clamp-1 max-w-2xl">
                        {nextUpEpisode.ep.summary.replace(/<[^>]*>?/gm, '')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                  {nextUpEpisode.matchingTorrent ? (
                    <button
                      onClick={() => {
                        if (nextUpEpisode.matchingTorrent?.magnet_url) {
                          onCopyMagnet(nextUpEpisode.matchingTorrent.magnet_url, nextUpEpisode.matchingTorrent.title);
                          window.location.href = nextUpEpisode.matchingTorrent.magnet_url;
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl cv-btn-playback font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                      title="Launch magnet in torrent client"
                    >
                      <Magnet size={14} />
                      <span>Play / Magnet</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedSeason(String(nextUpEpisode.ep.season));
                        setReleaseSearch(nextUpEpisode.tag);
                        setActiveTab('torrents');
                      }}
                      className="px-3 py-1.5 rounded-xl cv-btn-secondary font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Search size={13} />
                      <span>Find Torrents</span>
                    </button>
                  )}

                  <button
                    onClick={() => toggleEpisodeWatched(nextUpEpisode.tag)}
                    className="px-3 py-2 rounded-xl cv-badge-success border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-90"
                    title="Mark this episode as watched"
                  >
                    <CheckCircle2 size={14} />
                    <span>Mark Watched</span>
                  </button>

                  {onAskCineBot && (
                    <button
                      onClick={() => onAskCineBot(`Tell me about episode ${nextUpEpisode.tag} of "${show.name}" titled "${nextUpEpisode.ep.name}". Give me a spoiler-free vibe check and themes!`)}
                      className="p-2 rounded-xl cv-btn-secondary text-xs cursor-pointer"
                      title="Ask CineBot about this episode"
                      aria-label="Ask CineBot about this episode"
                    >
                      <Bot size={15} />
                    </button>
                  )}
                </div>
              </div>
            ) : totalWatchedCount > 0 && totalWatchedCount === show.episodes.length ? (
              <div className="p-4 rounded-2xl border cv-badge-success flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <span>You're all caught up! You've watched every episode of {show.name}.</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
        {activeTab === 'torrents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left 2 Columns: Releases List & Filters */}
            <section className="lg:col-span-2 space-y-4">
              
              {/* Filter Controls Header */}
              <div className="p-4 sm:p-5 rounded-2xl border cv-card space-y-3.5 transition-all">
                {/* Top Row: Title, Quick Actions & Search */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg cv-nav-soft-active flex items-center justify-center">
                      <Filter className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider cv-text">
                        Release Filters
                      </h3>
                      <p className="text-[11px] cv-text-muted">
                        Filter by season, resolution, and release tags
                      </p>
                    </div>
                  </div>

                  {/* Search inside releases with clear button */}
                  <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none cv-text-muted" />
                    <label htmlFor="series-release-search" className="sr-only">Search releases</label>
                    <input
                      id="series-release-search"
                      name="seriesReleaseSearch"
                      type="text"
                      value={releaseSearch}
                      onChange={(e) => setReleaseSearch(e.target.value)}
                      placeholder="Search releases (e.g. S01E01, 1080p)..."
                      className="w-full pl-8.5 pr-8 py-2 text-xs rounded-xl font-medium border cv-input transition-all focus:outline-none"
                    />
                    {releaseSearch && (
                      <button
                        aria-label="Clear release search"
                        onClick={() => setReleaseSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full cv-text-muted hover:text-[var(--cv-text)] cursor-pointer"
                        title="Clear search"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Season Filter Pills */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold cv-text-secondary">
                      Season:
                    </span>
                    {seasonStats.seasonsWithoutReleases.length > 0 && (
                      <button
                        onClick={() => setShowAllGuideSeasons(!showAllGuideSeasons)}
                        className="text-[11px] font-semibold cv-text-accent hover:opacity-80 cursor-pointer transition-opacity"
                      >
                        {showAllGuideSeasons
                          ? 'Hide Unreleased Seasons'
                          : `+ View All Show Seasons (${seasonStats.seasonsWithoutReleases.length} more)`}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* All Seasons */}
                    <button
                      onClick={() => setSelectedSeason('All')}
                      aria-pressed={selectedSeason === 'All'}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        selectedSeason === 'All' ? 'cv-nav-pill-active shadow-sm' : 'cv-btn-secondary'
                      }`}
                    >
                      <span>All Seasons</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                        selectedSeason === 'All' ? 'bg-black/25 text-white' : 'cv-badge-neutral border'
                      }`}>
                        {torrents.length}
                      </span>
                    </button>

                    {/* Seasons with active releases */}
                    {seasonStats.seasonsWithReleases.map((s) => {
                      const count = seasonStats.counts[s] || 0;
                      const isSelected = selectedSeason === String(s);
                      return (
                        <button
                          key={`season-${s}`}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedSeason(String(s))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            isSelected ? 'cv-nav-pill-active shadow-sm' : 'cv-btn-secondary'
                          }`}
                        >
                          <span>Season {s}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                            isSelected ? 'bg-black/25 text-white' : 'cv-badge-neutral border'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}

                    {/* Complete Packs Pill if available */}
                    {seasonStats.packsCount > 0 && (
                      <button
                        onClick={() => setSelectedSeason('Packs')}
                        aria-pressed={selectedSeason === 'Packs'}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                          selectedSeason === 'Packs' ? 'cv-nav-pill-active shadow-sm' : 'cv-nav-soft-active'
                        }`}
                      >
                        <FolderArchive className="w-3.5 h-3.5" />
                        <span>Season Packs</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                          selectedSeason === 'Packs' ? 'bg-black/25 text-white' : 'cv-badge-neutral border'
                        }`}>
                          {seasonStats.packsCount}
                        </span>
                      </button>
                    )}

                    {/* Expanded list of unreleased seasons from the show's episode guide */}
                    {showAllGuideSeasons && seasonStats.seasonsWithoutReleases.map((s) => {
                      const isSelected = selectedSeason === String(s);
                      return (
                        <button
                          key={`guide-season-${s}`}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedSeason(String(s))}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                            isSelected
                              ? 'cv-nav-pill-active border-solid'
                              : 'cv-btn-secondary border-dashed opacity-75'
                          }`}
                          title={`Season ${s} is listed in Episode Guide (0 torrents indexed currently)`}
                        >
                          <span>Season {s}</span>
                          <span className="text-[10px] opacity-80 font-mono">0</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quality Filter Pills */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold cv-text-secondary">
                    Quality:
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { key: 'All', label: 'All Qualities', count: torrents.length },
                      { key: '1080p', label: '1080p FHD', count: qualityCounts['1080p'] },
                      { key: '720p', label: '720p HD', count: qualityCounts['720p'] },
                      { key: '4K UHD', label: '4K UHD', count: qualityCounts['4K UHD'] },
                      { key: 'x265 / HEVC', label: 'x265 / HEVC', count: qualityCounts['x265 / HEVC'] },
                      { key: '480p', label: '480p SD', count: qualityCounts['480p'] }
                    ].map(({ key, label, count }) => {
                      const isSelected = selectedQuality === key;
                      const hasTorrents = count > 0;

                      return (
                        <button
                          key={key}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedQuality(key)}
                          className={`px-2.5 py-1.2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            isSelected
                              ? 'cv-nav-pill-active shadow-sm'
                              : !hasTorrents
                              ? 'cv-btn-secondary opacity-60'
                              : 'cv-btn-secondary'
                          }`}
                        >
                          <span>{label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                            isSelected ? 'bg-black/25 text-white' : 'cv-badge-neutral border'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sort By & View Layout Bar */}
                <div className="pt-3 border-t cv-border flex flex-wrap items-center justify-between gap-3">
                  {/* Sort selector */}
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-3.5 h-3.5 cv-text-muted" />
                    <label htmlFor="series-release-sort" className="text-xs font-medium cv-text-muted">
                      Sort:
                    </label>
                    <select
                      id="series-release-sort"
                      name="seriesReleaseSort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      aria-label="Sort releases by"
                      className="text-xs font-semibold py-1 px-2.5 rounded-lg border cv-select cursor-pointer focus:outline-none"
                    >
                      <option value="latest">Latest Release Date</option>
                      <option value="seeds">Most Seeders (Fastest)</option>
                      <option value="season_ep">Season & Episode (S01E01 → End)</option>
                      <option value="size_desc">File Size (Largest First)</option>
                      <option value="size_asc">File Size (Smallest First)</option>
                    </select>
                  </div>

                  {/* View layout mode (Flat vs Grouped by Season) */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium mr-1 cv-text-muted">
                      View:
                    </span>
                    <button
                      aria-pressed={viewMode === 'flat'}
                      onClick={() => setViewMode('flat')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                        viewMode === 'flat' ? 'cv-nav-pill-active shadow-xs' : 'cv-btn-secondary'
                      }`}
                      title="View all releases in a continuous list"
                    >
                      <ListFilter size={13} />
                      <span>List</span>
                    </button>
                    <button
                      aria-pressed={viewMode === 'grouped'}
                      onClick={() => setViewMode('grouped')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                        viewMode === 'grouped' ? 'cv-nav-pill-active shadow-xs' : 'cv-btn-secondary'
                      }`}
                      title="Group releases by Season headers"
                    >
                      <Layers2 size={13} />
                      <span>By Season</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filter Badges & Results Count Summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="cv-text-muted">
                    Showing <strong className="cv-text font-bold">{filteredTorrents.length}</strong> of{' '}
                    <strong className="cv-text font-bold">{torrents.length}</strong> releases
                  </span>

                  {/* Active Filter Chips */}
                  {selectedSeason !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md cv-nav-soft-active text-[11px] font-bold">
                      <span>Season {selectedSeason}</span>
                      <button aria-label="Remove season filter" onClick={() => setSelectedSeason('All')} className="hover:opacity-75 cursor-pointer">
                        <X size={11} />
                      </button>
                    </span>
                  )}

                  {selectedQuality !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md cv-badge-info border text-[11px] font-bold">
                      <span>{selectedQuality}</span>
                      <button aria-label="Remove quality filter" onClick={() => setSelectedQuality('All')} className="hover:opacity-75 cursor-pointer">
                        <X size={11} />
                      </button>
                    </span>
                  )}

                  {releaseSearch && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md cv-badge-warning border text-[11px] font-bold">
                      <span>"{releaseSearch}"</span>
                      <button aria-label="Remove search filter" onClick={() => setReleaseSearch('')} className="hover:opacity-75 cursor-pointer">
                        <X size={11} />
                      </button>
                    </span>
                  )}
                </div>

                {(selectedSeason !== 'All' || selectedQuality !== 'All' || releaseSearch || sortBy !== 'latest') && (
                  <button
                    onClick={() => {
                      setSelectedSeason('All');
                      setSelectedQuality('All');
                      setReleaseSearch('');
                      setSortBy('latest');
                    }}
                    className="cv-text-accent hover:opacity-80 font-bold underline cursor-pointer text-xs transition-opacity"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>

              {/* Releases List */}
              {isLoadingTorrents ? (
                <div className="py-2">
                  <SeriesDetailTorrentsSkeleton hideToolbar={true} />
                </div>
              ) : filteredTorrents.length > 0 ? (
                viewMode === 'grouped' ? (
                  /* Grouped by Season View */
                  <div className="space-y-5">
                    {groupedTorrents.map(([groupKey, group]) => {
                      const isCollapsed = collapsedSeasons[groupKey];
                      return (
                        <div
                          key={groupKey}
                          className="rounded-2xl cv-card border overflow-hidden transition-all"
                        >
                          {/* Season Group Header */}
                          <div
                            onClick={() => {
                              setCollapsedSeasons(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
                            }}
                            className="p-3.5 sm:px-4.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors cv-surface-muted border-b cv-border"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: group.seasonNum ? 'var(--cv-playback-bg)' : 'var(--cv-info-soft-fg)',
                                }}
                              />
                              <h4 className="text-sm font-black tracking-wide cv-text">
                                {group.seasonLabel}
                              </h4>
                              <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold border cv-badge-neutral">
                                {group.torrents.length} {group.torrents.length === 1 ? 'Release' : 'Releases'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5">
                              {group.seasonNum && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopySeasonMagnets(group.seasonNum!);
                                  }}
                                  className="px-2.5 py-1 rounded-lg cv-btn-playback-soft hover:brightness-110 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                  title={`Copy all magnet links for ${group.seasonLabel}`}
                                >
                                  <Magnet size={13} />
                                  <span className="hidden sm:inline">Copy All Magnets</span>
                                </button>
                              )}
                              <span className="text-xs font-mono hidden md:inline-block cv-text-muted">
                                Total: {formatEztvBytes(group.totalBytes)} • Peak Seeds:{' '}
                                <span className="font-bold" style={{ color: 'var(--cv-success-soft-fg)' }}>{group.maxSeeds}</span>
                              </span>
                              {isCollapsed ? (
                                <ChevronDown size={16} className="cv-text-muted" />
                              ) : (
                                <ChevronUp size={16} className="cv-text-muted" />
                              )}
                            </div>
                          </div>

                          {/* Group Releases */}
                          {!isCollapsed && (
                            <div className="p-2 space-y-2">
                              {group.torrents.map((torrent) => {
                                const q = parseQualityFromEztv(torrent.title, torrent.filename);
                                const meta = parseReleaseMeta(torrent);
                                const epTag = meta.epTag;
                                const isCopied = copiedHash === torrent.hash;
                                const isSelectedInitial = initialTorrent && torrent.hash === initialTorrent.hash;

                                return (
                                  <div
                                    key={torrent.id || torrent.hash}
                                    className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                      isSelectedInitial
                                        ? 'cv-nav-soft-active ring-1'
                                        : 'cv-surface-elevated cv-border-subtle'
                                    }`}
                                  >
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        {epTag && (
                                          <span className="px-2 py-0.5 rounded-md cv-btn-playback-soft text-xs font-mono font-bold">
                                            {epTag}
                                          </span>
                                        )}
                                        <span
                                          className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                                            q.is4k
                                              ? 'cv-rating-badge font-extrabold'
                                              : q.is1080p
                                              ? 'cv-nav-pill-active'
                                              : 'cv-badge-neutral'
                                          }`}
                                        >
                                          {q.quality}
                                        </span>
                                        {q.isHevc && (
                                          <span className="px-2 py-0.5 rounded-md border cv-badge-info text-[11px] font-bold">
                                            x265
                                          </span>
                                        )}
                                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border cv-badge-neutral">
                                          {formatEztvBytes(torrent.size_bytes)}
                                        </span>
                                        <span className="text-xs cv-text-muted">
                                          {formatEztvDate(torrent.date_released_unix)}
                                        </span>
                                      </div>

                                      <h3 className="text-xs sm:text-sm font-semibold truncate cv-text" title={torrent.title}>
                                        {torrent.title}
                                      </h3>

                                      <div className="flex items-center gap-2 pt-0.5">
                                        <TorrentSwarmHealthBadge seeds={torrent.seeds} peers={torrent.peers} showDetails />
                                        <span className="text-xs font-mono cv-text-muted">
                                          <span className="font-semibold" style={{ color: 'var(--cv-success-soft-fg)' }}>{torrent.seeds} Seeds</span>
                                          <span className="mx-1 cv-text-subtle">•</span>
                                          <span>{torrent.peers} Peers</span>
                                        </span>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center pt-1 sm:pt-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleDirectDownload(e, torrent)}
                                        className="px-3.5 py-2 rounded-xl text-xs font-bold cv-btn-magnet shadow-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                        title="Direct BitTorrent Client Magnet Download"
                                      >
                                        <Magnet className="w-3.5 h-3.5" />
                                        <span>Magnet</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleCopyMagnetLink(torrent)}
                                        className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer cv-btn-secondary"
                                        title="Copy Magnet URI link"
                                      >
                                        <CopyIcon size={14} />
                                        {isCopied ? (
                                          <span className="font-bold" style={{ color: 'var(--cv-success-soft-fg)' }}>Copied!</span>
                                        ) : (
                                          <span>URI</span>
                                        )}
                                      </button>

                                      {getSafeExternalUrl(torrent.torrent_url) && (
                                        <a
                                          href={getSafeExternalUrl(torrent.torrent_url)!}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cv-btn-secondary"
                                          title="Download .torrent file mirror"
                                        >
                                          <FileDown className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Flat List View */
                  <div className="space-y-3">
                    {filteredTorrents.map((torrent) => {
                      const q = parseQualityFromEztv(torrent.title, torrent.filename);
                      const meta = parseReleaseMeta(torrent);
                      const epTag = meta.epTag;
                      const isCopied = copiedHash === torrent.hash;
                      const isSelectedInitial = initialTorrent && torrent.hash === initialTorrent.hash;

                      return (
                        <div
                          key={torrent.id || torrent.hash}
                          className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                            isSelectedInitial
                              ? 'cv-nav-soft-active shadow-lg ring-2'
                              : q.is4k
                              ? 'cv-4k-card shadow-md'
                              : 'cv-card'
                          }`}
                        >
                          {/* Left: Metadata and Title */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {isSelectedInitial && (
                                <span className="px-2 py-0.5 rounded-md cv-btn-playback font-extrabold text-[11px] shadow-xs animate-pulse tracking-wide">
                                  Selected File
                                </span>
                              )}

                              {epTag && (
                                <span className="px-2 py-0.5 rounded-md cv-btn-playback-soft text-xs font-mono font-bold">
                                  {epTag}
                                </span>
                              )}

                              <span
                                className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                                  q.is4k
                                    ? 'cv-rating-badge font-extrabold'
                                    : q.is1080p
                                    ? 'cv-nav-pill-active'
                                    : 'cv-badge-neutral'
                                }`}
                              >
                                {q.quality}
                              </span>

                              {q.isHevc && (
                                <span className="px-2 py-0.5 rounded-md border cv-badge-info text-[11px] font-bold">
                                  x265
                                </span>
                              )}

                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border cv-badge-neutral">
                                {formatEztvBytes(torrent.size_bytes)}
                              </span>

                              <span className="text-xs cv-text-muted">
                                {formatEztvDate(torrent.date_released_unix)}
                              </span>
                            </div>

                            <h3 className="text-xs sm:text-sm font-semibold truncate cv-text" title={torrent.title}>
                              {torrent.title}
                            </h3>

                            <div className="flex items-center gap-2 pt-0.5">
                              <TorrentSwarmHealthBadge seeds={torrent.seeds} peers={torrent.peers} showDetails />
                              <span className="text-xs font-mono cv-text-muted">
                                <span className="font-semibold" style={{ color: 'var(--cv-success-soft-fg)' }}>{torrent.seeds} Seeds</span>
                                <span className="mx-1 cv-text-subtle">•</span>
                                <span>{torrent.peers} Peers</span>
                              </span>
                            </div>
                          </div>

                          {/* Right: Actions Toolbar */}
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={(e) => handleDirectDownload(e, torrent)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold cv-btn-magnet shadow-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                              title="Direct BitTorrent Client Magnet Download"
                            >
                              <Magnet className="w-3.5 h-3.5" />
                              <span>Magnet</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyMagnetLink(torrent)}
                              className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer cv-btn-secondary"
                              title="Copy Magnet URI link"
                            >
                              <CopyIcon size={14} />
                              {isCopied ? (
                                <span className="font-bold" style={{ color: 'var(--cv-success-soft-fg)' }}>Copied!</span>
                              ) : (
                                <span>URI</span>
                              )}
                            </button>

                            {getSafeExternalUrl(torrent.torrent_url) && (
                              <a
                                href={getSafeExternalUrl(torrent.torrent_url)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cv-btn-secondary"
                                title="Download .torrent file mirror"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Empty Filter State with helpful recovery actions */
                <div className="text-center py-12 px-6 rounded-3xl border cv-card space-y-4">
                  <div className="w-12 h-12 rounded-2xl cv-btn-playback-soft flex items-center justify-center mx-auto">
                    <Tv className="w-6 h-6" />
                  </div>
                  
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="text-base font-bold cv-text">
                      {selectedSeason !== 'All' && !isNaN(parseInt(selectedSeason, 10))
                        ? `No torrents indexed for Season ${selectedSeason}`
                        : 'No matching releases found'}
                    </h3>
                    <p className="text-xs leading-relaxed cv-text-muted">
                      {selectedSeason !== 'All' && !isNaN(parseInt(selectedSeason, 10))
                        ? `This tracker does not currently list verified releases tagged specifically under Season ${selectedSeason}. You can search for alternative naming or browse the episode guide.`
                        : 'No releases matched your active season, quality, or title keyword filters.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    {selectedSeason !== 'All' && !isNaN(parseInt(selectedSeason, 10)) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSearchAlternativeSeason(parseInt(selectedSeason, 10))}
                          disabled={isSearchingSeason}
                          className="px-4 py-2.5 cv-btn-primary disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                        >
                          {isSearchingSeason ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                          <span>Search Tracker for Season {selectedSeason}</span>
                        </button>

                        {show?.episodes && show.episodes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setGuideSeason(parseInt(selectedSeason, 10));
                              setActiveTab('episodes');
                            }}
                            className="px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 cv-btn-secondary"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Browse Season {selectedSeason} in Episode Guide</span>
                          </button>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSeason('All');
                        setSelectedQuality('All');
                        setReleaseSearch('');
                        setSortBy('latest');
                      }}
                      className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        selectedSeason === 'All'
                          ? 'cv-btn-primary shadow-md'
                          : 'cv-btn-secondary'
                      }`}
                    >
                      View All Releases ({torrents.length})
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Right 1 Column: Series Synopsis, Estimator, and Details */}
            <aside className="space-y-6">
              
              {/* Synopsis Card */}
              <div className="p-5 rounded-2xl cv-card border space-y-3">
                <h3 className="text-sm font-bold cv-text flex items-center gap-2">
                  <Film className="w-4 h-4 cv-text-accent" />
                  <span>Series Synopsis</span>
                </h3>
                <p className="text-xs sm:text-sm cv-text-secondary leading-relaxed">
                  {show?.summary || 'No overview synopsis currently recorded for this television series.'}
                </p>
                {getSafeExternalUrl(show?.officialSite) && (
                  <div className="pt-2 border-t cv-border-subtle">
                    <a
                      href={getSafeExternalUrl(show?.officialSite)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs cv-text-accent hover:underline font-semibold"
                    >
                      <span>Visit Official Broadcast Site</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              {/* Download Speed Estimator */}
              {primaryTorrent && (
                <div className="p-5 rounded-2xl cv-card border space-y-3">
                  <h3 className="text-sm font-bold cv-text flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: 'var(--cv-success-soft-fg)' }} />
                    <span>Download Time Estimator</span>
                  </h3>
                  <p className="text-xs cv-text-muted">
                    Calculated for standard episode size ({formatEztvBytes(primaryTorrent.size_bytes)}):
                  </p>
                  <DownloadSpeedEstimator sizeBytes={Number(primaryTorrent.size_bytes) || 1400000000} />
                </div>
              )}

              {/* Quick Tech Specs */}
              <div className="p-5 rounded-2xl cv-card border space-y-3 text-xs">
                <h3 className="text-sm font-bold cv-text flex items-center gap-2">
                  <Info className="w-4 h-4 cv-text-muted" />
                  <span>Technical Overview</span>
                </h3>
                <div className="space-y-2 cv-text-secondary">
                  <div className="flex justify-between py-1 border-b cv-border-subtle">
                    <span className="cv-text-muted">Network / Stream:</span>
                    <span className="font-semibold cv-text">{show?.network || 'Broadcasting'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b cv-border-subtle">
                    <span className="cv-text-muted">Premiered:</span>
                    <span className="font-semibold cv-text">{show?.premiered || show?.year || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b cv-border-subtle">
                    <span className="cv-text-muted">Status:</span>
                    <span className="font-semibold cv-text">{show?.status || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b cv-border-subtle">
                    <span className="cv-text-muted">IMDb Reference:</span>
                    <span className="font-mono cv-text-accent font-semibold">{show?.imdb_code || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="cv-text-muted">Indexer Source:</span>
                    <span className="font-semibold cv-text">EZTV API / BitTorrent</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Tab 2: Episode Guide */}
        {activeTab === 'episodes' && (
          isLoadingDetails && (!show?.episodes || show.episodes.length === 0) ? (
            <SeriesDetailEpisodesSkeleton />
          ) : show?.episodes && show.episodes.length > 0 ? (
            <div className="space-y-4">
              
              {/* Season Filter for Guide (Wrap smoothly - NO ugly horizontal scrollbar) */}
              <div className="flex flex-wrap items-center gap-2 pb-3 border-b cv-border">
                <span className="text-xs font-bold uppercase tracking-wider mr-1 cv-text-muted">
                  Season:
                </span>
                {(seasonStats.allKnownSeasons.length > 0 ? seasonStats.allKnownSeasons : [1]).map((sNum) => {
                  const epCount = show.episodes?.filter(e => e.season === sNum).length || 0;
                  const isSelected = guideSeason === sNum;
                  return (
                    <button
                      type="button"
                      key={`guide-season-tab-${sNum}`}
                      onClick={() => setGuideSeason(sNum)}
                      aria-pressed={isSelected}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'cv-nav-pill-active shadow-md'
                          : 'cv-btn-secondary'
                      }`}
                    >
                      <span>Season {sNum}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                          isSelected
                            ? 'bg-black/25 text-white'
                            : 'cv-badge-neutral'
                        }`}
                      >
                        {epCount} eps
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Season Progress & Action Toolbar */}
              {(() => {
                const seasonEps = show.episodes?.filter((ep) => ep.season === guideSeason) || [];
                const watchedInSeason = seasonEps.filter(ep => {
                  const tag = `S${String(ep.season).padStart(2, '0')}E${String(ep.number).padStart(2, '0')}`;
                  return Boolean(watchedEpisodes[tag]);
                }).length;
                const seasonPercent = seasonEps.length > 0 ? Math.round((watchedInSeason / seasonEps.length) * 100) : 0;

                return (
                  <div className="p-3.5 sm:px-4.5 rounded-2xl border cv-surface-muted cv-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Season Progress */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold cv-text">
                          Season {guideSeason}: {watchedInSeason} of {seasonEps.length} watched
                        </span>
                        <span className="font-mono font-bold cv-text-accent">{seasonPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full cv-surface-elevated border cv-border-subtle overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${seasonPercent}%`,
                            background: 'linear-gradient(90deg, var(--cv-playback-bg), var(--cv-success-soft-fg))',
                          }}
                        />
                      </div>
                    </div>

                    {/* Season Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => markSeasonWatched(guideSeason, watchedInSeason < seasonEps.length)}
                        className="px-2.5 py-1.5 rounded-lg border cv-badge-success hover:brightness-110 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title={watchedInSeason < seasonEps.length ? `Mark all ${seasonEps.length} episodes in Season ${guideSeason} as watched` : `Reset watch status for Season ${guideSeason}`}
                      >
                        <CheckCircle2 size={13} />
                        <span>{watchedInSeason < seasonEps.length ? 'Mark All Watched' : 'Reset Season'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopySeasonMagnets(guideSeason)}
                        className="px-2.5 py-1.5 rounded-lg cv-btn-playback-soft hover:brightness-110 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title={`Copy all magnet links for Season ${guideSeason}`}
                      >
                        <Magnet size={13} />
                        <span>Copy Season Magnets</span>
                      </button>

                      {guideSeason > 1 && onAskCineBot && (
                        <button
                          type="button"
                          onClick={() => onAskCineBot(`Can you give me a punchy, spoiler-free recap of Season ${guideSeason - 1} of "${show.name}" so I am caught up for Season ${guideSeason}?`)}
                          className="px-2.5 py-1.5 rounded-lg border cv-badge-warning hover:brightness-110 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title={`Spoiler-free recap of previous seasons before watching Season ${guideSeason}`}
                        >
                          <Bot size={13} />
                          <span>Recap S{guideSeason - 1}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Episodes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {show.episodes
                  .filter((ep) => ep.season === guideSeason)
                  .map((ep) => {
                    const epTag = `S${String(ep.season).padStart(2, '0')}E${String(ep.number).padStart(2, '0')}`;
                    const isEpWatched = Boolean(watchedEpisodes[epTag]);

                    // Find all torrents matching this episode
                    const matchingTorrents = torrents.filter((t) => {
                      const meta = parseReleaseMeta(t);
                      return meta.season === ep.season && meta.episode === ep.number;
                    });

                    // Deduplicate by quality
                    const qualityMap = new Map<string, EztvTorrent>();
                    for (const t of matchingTorrents) {
                      const q = parseQualityFromEztv(t.title, t.filename);
                      const qKey = q.is4k ? '4K UHD' : q.isHevc ? '1080p x265' : q.quality;
                      if (!qualityMap.has(qKey) || (t.seeds || 0) > (qualityMap.get(qKey)?.seeds || 0)) {
                        qualityMap.set(qKey, t);
                      }
                    }
                    const qualityOptions = Array.from(qualityMap.entries());

                    return (
                      <div
                        key={ep.id}
                        className="p-4 rounded-2xl border cv-card transition-all flex flex-col gap-3.5"
                        style={isEpWatched ? { borderColor: 'var(--cv-success-border)' } : undefined}
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Thumbnail Still */}
                          <div className="sm:w-36 aspect-video rounded-xl overflow-hidden cv-surface-muted shrink-0 relative">
                            {ep.image?.medium || ep.image?.original ? (
                              <img
                                src={ep.image.medium || ep.image.original!}
                                alt={`${ep.name} still`}
                                className="w-full h-full object-cover"
                                loading="eager"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center cv-surface-muted cv-text-subtle">
                                <Tv size={24} />
                              </div>
                            )}
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-xs text-[10px] font-mono font-bold text-white border border-white/15">
                              {epTag}
                            </span>
                            {isEpWatched && (
                              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md cv-btn-magnet font-bold text-[10px] flex items-center gap-0.5 shadow-md">
                                <Check size={11} className="stroke-[3]" />
                                <span>Watched</span>
                              </span>
                            )}
                          </div>

                          {/* Episode Content */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold truncate flex-1 cv-text">
                                {ep.number}. {ep.name}
                              </h4>

                              {/* Toggle Watched Button */}
                              <button
                                type="button"
                                onClick={() => toggleEpisodeWatched(epTag)}
                                aria-pressed={isEpWatched}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                  isEpWatched
                                    ? 'cv-badge-success hover:brightness-110'
                                    : 'cv-btn-secondary'
                                }`}
                                title={isEpWatched ? 'Mark as unwatched' : 'Mark as watched'}
                              >
                                {isEpWatched ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                              </button>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] cv-text-muted">
                              {ep.airdate && <span>Aired: {ep.airdate}</span>}
                              {ep.runtime && <span>• {ep.runtime} min</span>}
                            </div>

                            <p className="text-xs line-clamp-2 leading-relaxed cv-text-secondary">
                              {ep.summary ? ep.summary.replace(/<[^>]*>?/gm, '') : 'No detailed episode synopsis available.'}
                            </p>
                          </div>
                        </div>

                        {/* Multi-Quality Downloads & Action Strip */}
                        <div className="pt-2 border-t cv-border-subtle flex flex-wrap items-center justify-between gap-2">
                          {qualityOptions.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold cv-text-muted uppercase tracking-wider mr-0.5">
                                Torrents:
                              </span>
                              {qualityOptions.map(([label, t]) => (
                                <button
                                  type="button"
                                  key={label}
                                  onClick={() => {
                                    if (t.magnet_url) {
                                      onCopyMagnet(t.magnet_url, t.title);
                                      window.location.href = t.magnet_url;
                                    }
                                  }}
                                  className="px-2 py-0.5 rounded-md cv-btn-secondary text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                  title={`Download ${label} (${formatEztvBytes(t.size_bytes)} • ${t.seeds || 0} seeds)`}
                                >
                                  <Magnet size={11} className="cv-text-accent" />
                                  <span>{label}</span>
                                  <span className="text-[10px] cv-text-muted font-mono">({formatEztvBytes(t.size_bytes)})</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSeason(String(ep.season));
                                setReleaseSearch(epTag);
                                setActiveTab('torrents');
                              }}
                              className="text-xs cv-text-accent hover:underline font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>Search Torrents for {epTag}</span>
                              <ChevronRight size={13} />
                            </button>
                          )}

                          {/* Quick Tools: Subtitles & CineBot */}
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => {
                                const subQuery = `${show.name} ${epTag} subtitles`;
                                navigator.clipboard.writeText(subQuery);
                                onShowToast(`Copied subtitle search query: "${subQuery}"`, 'info');
                              }}
                              className="px-2 py-0.5 rounded-md cv-btn-secondary text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                              title="Copy subtitle search term"
                            >
                              <FileText size={11} />
                              <span>Subtitles</span>
                            </button>

                            {onAskCineBot && (
                              <button
                                type="button"
                                onClick={() => onAskCineBot(`Tell me about episode ${epTag} of "${show.name}" titled "${ep.name}". Give me a spoiler-free review and what to look out for!`)}
                                className="p-1 rounded-md cv-btn-secondary text-xs cursor-pointer"
                                title="Ask CineBot about this episode"
                              >
                                <Bot size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border cv-card">
              <p className="text-sm cv-text-muted">No episode guide details available for this series.</p>
            </div>
          )
        )}

        {/* Tab 3: Cast & Characters */}
        {activeTab === 'cast' && (
          isLoadingDetails && (!show?.cast || show.cast.length === 0) ? (
            <SeriesDetailCastSkeleton />
          ) : show?.cast && show.cast.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {show.cast.map((c) => (
                <button
                  type="button"
                  key={c.person.id}
                  onClick={() => onOpenFilmography && onOpenFilmography(c.person.name, 'actor')}
                  className="group p-3 rounded-2xl border cv-card-interactive transition-all text-center space-y-2.5 cursor-pointer"
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden cv-surface-muted relative">
                    {c.person.image?.medium || c.person.image?.original ? (
                      <img
                        src={c.person.image.medium || c.person.image.original!}
                        alt={c.person.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="eager"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center cv-surface-muted cv-text-subtle">
                        <User size={32} />
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold transition-colors truncate cv-text cv-group-hover-accent">
                      {c.person.name}
                    </h4>
                    {c.character?.name && (
                      <p className="text-[11px] truncate cv-text-muted">
                        as {c.character.name}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border cv-card">
              <p className="text-sm cv-text-muted">No cast information available for this series.</p>
            </div>
          )
        )}

        {/* Tab 4: Overview */}
        {activeTab === 'overview' && (
          <div className="max-w-3xl space-y-6">
            <div className="p-6 rounded-3xl cv-card border space-y-4">
              <h3 className="text-lg font-bold cv-text flex items-center gap-2">
                <Info className="w-5 h-5 cv-text-accent" />
                <span>About {show?.name}</span>
              </h3>
              <p className="text-sm cv-text-secondary leading-relaxed">
                {show?.summary || 'No synopsis recorded.'}
              </p>
              {getSafeExternalUrl(show?.officialSite) && (
                <div className="pt-2">
                  <a
                    href={getSafeExternalUrl(show?.officialSite)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs cv-text-accent hover:underline font-semibold"
                  >
                    <span>Visit Official Website</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recommended & Acclaimed TV Series Row */}
      <section className="space-y-4 pt-8 border-t cv-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold cv-text">Popular Television Series</h2>
            <p className="text-xs cv-text-muted">Explore other acclaimed shows available on CineVault</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToSeries && onNavigateToSeries()}
            className="text-xs cv-text-accent hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Browse All Series</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {POPULAR_RECOMMENDED_SHOWS.map((pop) => (
            <button
              type="button"
              key={pop.imdb}
              onClick={() => onSelectSeries && onSelectSeries({ imdb: pop.imdb, title: pop.name })}
              className="p-2.5 sm:p-3 rounded-2xl cv-card-interactive border transition-all text-left space-y-2.5 cursor-pointer group shadow-sm hover:shadow-xl"
            >
              <div className="aspect-[2/3] rounded-xl cv-surface-muted overflow-hidden relative border cv-border-subtle">
                <img
                  src={getPrimarySeriesPoster(pop)}
                  alt={pop.name}
                  loading="eager"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = CINEVAULT_POSTER_FALLBACK;
                  }}
                />
                <div className="tv-fallback-box hidden absolute inset-0 flex flex-col items-center justify-center cv-surface-muted cv-text-muted p-2 text-center">
                  <Tv size={28} className="cv-text-accent mb-1 opacity-70" />
                  <span className="text-[10px] font-bold cv-text line-clamp-1">{pop.name}</span>
                </div>
                <div className="poster-badge absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-xs text-[10px] font-bold text-amber-400 flex items-center gap-0.5 border border-white/15 shadow-xs">
                  <span className="cv-rating-overlay">★</span>
                  <span className="cv-rating-overlay">{pop.rating}</span>
                </div>
                <div className="poster-badge absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[9px] font-bold text-white border border-white/15">
                  {pop.genre}
                </div>
              </div>

              <div className="space-y-0.5">
                <h4 className="text-xs font-bold cv-text cv-group-hover-accent transition-colors truncate">
                  {pop.name}
                </h4>
                <p className="text-[11px] cv-text-muted">
                  {pop.year} • {pop.genre}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <ShareMovieModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        customTitle={show?.name || cleanInitialTitle}
        customYear={show?.year}
        customRating={show?.rating ? Number(show.rating) : undefined}
        customGenres={show?.genres}
        customSynopsis={show?.summary}
        customPosterUrl={currentPosterSrc}
        customShareUrl={typeof window !== 'undefined' ? (window.location.origin + getSeriesPath(show || { name: cleanInitialTitle })) : undefined}
      />

    </article>
  );
};
