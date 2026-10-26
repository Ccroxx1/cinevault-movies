import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Share2,
  Check,
  Tv,
  Magnet,
  Sparkles,
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
  Layers2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
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
  isWhite?: boolean;
  isBlueBlack?: boolean;
  hideToolbar?: boolean;
}> = ({
  isWhite,
  isBlueBlack,
  hideToolbar = false
}) => {
  return (
    <div
      aria-label="Loading torrent releases..."
      className="space-y-4 animate-in fade-in duration-200"
    >
      {/* Filter Toolbar Skeleton */}
      {!hideToolbar && (
        <div className={`p-4 rounded-2xl border space-y-3 ${
          isWhite ? 'bg-white border-slate-200' : isBlueBlack ? 'bg-[#091124] border-sky-900/40' : 'bg-[#0e0e0e] border-white/10'
        }`}>
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
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xs ${
              isWhite
                ? 'bg-white border-slate-200'
                : isBlueBlack
                ? 'bg-[#0b1329] border-sky-900/30'
                : 'bg-[#0e0e0e] border-white/10'
            }`}
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

export const SeriesDetailEpisodesSkeleton: React.FC<{ isWhite?: boolean; isBlueBlack?: boolean }> = ({
  isWhite,
  isBlueBlack
}) => {
  return (
    <div
      aria-label="Loading episodes..."
      className="space-y-4 animate-in fade-in duration-200"
    >
      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
        <div className="h-4 w-16 rounded skeleton-shimmer" />
        <div className="h-8 w-24 rounded-xl skeleton-shimmer" />
        <div className="h-8 w-24 rounded-xl skeleton-shimmer" />
        <div className="h-8 w-24 rounded-xl skeleton-shimmer" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`ep-skel-${i}`}
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row gap-4 ${
              isWhite ? 'bg-white border-slate-200' : isBlueBlack ? 'bg-[#0b1329] border-sky-900/40' : 'bg-[#0e0e0e] border-white/10'
            }`}
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

export const SeriesDetailCastSkeleton: React.FC<{ isWhite?: boolean; isBlueBlack?: boolean }> = ({
  isWhite,
  isBlueBlack
}) => {
  return (
    <div
      aria-label="Loading cast members..."
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4 animate-in fade-in duration-200"
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={`cast-skel-${i}`}
          className={`p-3 rounded-2xl border text-center space-y-2.5 ${
            isWhite ? 'bg-white border-slate-200' : isBlueBlack ? 'bg-[#0b1329] border-sky-900/40' : 'bg-[#0e0e0e] border-white/10'
          }`}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto skeleton-shimmer border border-white/10" />
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
  isWhite?: boolean;
  isBlueBlack?: boolean;
  onBack?: () => void;
  onNavigateHome: () => void;
  onNavigateToSeries: () => void;
}> = ({
  isWhite,
  isBlueBlack,
  onBack,
  onNavigateHome,
  onNavigateToSeries
}) => {
  return (
    <article className="w-full space-y-8 animate-in fade-in duration-300" aria-label="Loading television series details...">
      {/* Top Breadcrumb Navigation Skeleton */}
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
          href="/series"
          onClick={(e) => {
            e.preventDefault();
            onNavigateToSeries();
          }}
          className="hover:text-white transition-colors"
        >
          TV Series
        </a>
        <span aria-hidden="true">/</span>
        <div className="h-4 w-32 rounded-md skeleton-shimmer inline-block" />
      </nav>

      {/* Hero Series Presentation Header Skeleton */}
      <header className={`movie-detail-hero hero-cinema-container relative rounded-3xl overflow-hidden border shadow-2xl ${
        isWhite ? 'border-slate-200 bg-white' : isBlueBlack ? 'border-sky-900/40 bg-[#070d1e]' : 'border-white/10 bg-[#0a0a0a]'
      }`}>
        <div className="relative h-72 sm:h-96 md:h-[420px] w-full overflow-hidden bg-[#050505]">
          <div className="w-full h-full skeleton-shimmer opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]/80" />

          {/* Top Quick Actions Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-black/60 text-neutral-200 rounded-full border border-white/10 text-xs font-semibold shadow-lg cursor-pointer"
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
                  <div key={i} className="space-y-1.5 p-2.5 rounded-xl bg-white/5 border border-white/5">
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
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <div className="h-10 w-36 rounded-xl skeleton-shimmer" />
        <div className="h-10 w-32 rounded-xl skeleton-shimmer" />
        <div className="h-10 w-28 rounded-xl skeleton-shimmer" />
        <div className="h-10 w-24 rounded-xl skeleton-shimmer" />
      </div>

      {/* Release List Content Skeleton */}
      <SeriesDetailTorrentsSkeleton isWhite={isWhite} isBlueBlack={isBlueBlack} />
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

  const { colorMode } = useTheme();
  const isWhite = colorMode === 'white';
  const isBlueBlack = colorMode === 'blue-black';

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

  // Load TV show details and episodes
  useEffect(() => {
    let isMounted = true;

    const loadShowData = async () => {
      if (!show?.episodes || show.episodes.length === 0) {
        setIsLoadingDetails((prev) => (prev ? prev : true));
      }
      setError(null);

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

        if (isMounted) {
          if (details) {
            setShow(details);
          } else if (initialShow) {
            setShow(initialShow as TvShowDetails);
          } else if (!cleanInitialTitle) {
            setError('Television series information could not be located.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching TV details:', err);
          if (!show) {
            setError('Failed to load series details. Please check your connection.');
          }
        }
      } finally {
        if (isMounted) setIsLoadingDetails(false);
      }
    };

    loadShowData();

    return () => {
      isMounted = false;
    };
  }, [effectiveImdb, seriesId, initialTorrent, cleanInitialTitle]);

  // Load torrents for this TV show
  useEffect(() => {
    let isMounted = true;

    const loadReleases = async () => {
      setIsLoadingTorrents((prev) => (prev ? prev : true));

      try {
        let res: EztvApiResponse | null = null;
        const imdbToUse = show?.imdb_code || effectiveImdb;

        if (imdbToUse) {
          res = await fetchEztvTorrents({ imdb_id: imdbToUse, limit: 100 });
        }

        // If no torrents returned by IMDb ID or no IMDb ID, fallback to title search
        if ((!res || !res.torrents || res.torrents.length === 0) && (show?.name || cleanInitialTitle)) {
          const searchTitle = show?.name || cleanInitialTitle;
          if (searchTitle) {
            res = await fetchEztvTorrents({ search: searchTitle, limit: 100 });
          }
        }

        if (isMounted && res && res.torrents && res.torrents.length > 0) {
          const allTorrents = [...res.torrents];
          if (initialTorrent && !allTorrents.some(t => t.hash === initialTorrent.hash)) {
            allTorrents.unshift(initialTorrent);
          }
          setTorrents(allTorrents);
        } else if (isMounted && initialTorrent) {
          setTorrents([initialTorrent]);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Could not fetch releases for series:', err);
        }
      } finally {
        if (isMounted) setIsLoadingTorrents(false);
      }
    };

    if (show?.imdb_code || show?.name || effectiveImdb || cleanInitialTitle) {
      loadReleases();
    } else {
      setIsLoadingTorrents((prev) => (prev ? false : prev));
    }

    return () => {
      isMounted = false;
    };
  }, [show?.imdb_code, show?.name, effectiveImdb, seriesId, cleanInitialTitle]);

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
        isWhite={isWhite}
        isBlueBlack={isBlueBlack}
        onBack={onBack}
        onNavigateHome={onNavigateHome}
        onNavigateToSeries={onNavigateToSeries}
      />
    );
  }

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
          href="/series"
          onClick={(e) => {
            e.preventDefault();
            onNavigateToSeries();
          }}
          className="hover:text-white transition-colors"
        >
          TV Series
        </a>
        {show?.genres?.[0] && (
          <>
            <span aria-hidden="true">/</span>
            <button
              onClick={() => onSelectGenre && onSelectGenre(show.genres![0])}
              className="hover:text-rose-400 transition-colors cursor-pointer"
            >
              {show.genres[0]}
            </button>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="text-neutral-200 font-semibold truncate max-w-xs sm:max-w-md">
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
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold shadow-lg transition-all cursor-pointer ${
                    isCurrentWatchlisted
                      ? 'bg-rose-600 text-white border-rose-500 shadow-rose-900/40'
                      : 'bg-black/60 hover:bg-black/80 text-neutral-200 hover:text-white border-white/10 backdrop-blur-md'
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
                <span className="movie-hero-badge px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-rose-600 text-white rounded-lg shadow-md shadow-rose-900/30">
                  {show?.year || 'Series'}
                </span>

                {show?.network && (
                  <span className="movie-hero-badge px-2.5 py-1 text-xs font-bold tracking-wider bg-neutral-800 text-neutral-200 border border-white/10 rounded-lg">
                    {show.network}
                  </span>
                )}

                {show?.status && (
                  <span className={`movie-hero-badge px-2.5 py-1 text-xs font-bold tracking-wider rounded-lg border ${
                    show.status.toLowerCase() === 'running'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-neutral-800 text-neutral-300 border-white/10'
                  }`}>
                    {show.status}
                  </span>
                )}

                {torrents.some(t => parseQualityFromEztv(t.title, t.filename).is4k) && (
                  <span className="movie-hero-badge px-2 py-1 text-xs font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg">
                    4K Ultra HD
                  </span>
                )}

                {torrents.some(t => parseQualityFromEztv(t.title, t.filename).isHevc) && (
                  <span className="movie-hero-badge px-2 py-1 text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg">
                    x265 / HEVC
                  </span>
                )}
              </div>

              <div>
                <h1 className="movie-hero-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight drop-shadow-md">
                  {show?.name || 'Loading Series...'}
                </h1>
                {show?.language && (
                  <p className="movie-hero-subtitle text-sm text-neutral-300 font-medium mt-1">
                    Language: {show.language} {show.type ? `• ${show.type}` : ''}
                  </p>
                )}
              </div>

              <div className="movie-hero-meta-row flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6 py-2 text-xs sm:text-sm text-neutral-200">
                <div className="movie-imdb-badge flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/35 px-3 py-1.5 rounded-xl text-amber-300 font-bold">
                  <span className="text-base font-extrabold">
                    {show?.rating ? show.rating.toFixed(1) : (torrents.length > 0 ? '7.9' : 'NR')}
                  </span>
                  <span className="text-[10px] text-amber-200/90 font-medium">/10 Rating</span>
                </div>

                {show?.averageRuntime && (
                  <div className="movie-meta-pill flex items-center gap-1.5 text-neutral-100 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                    <Clock size={14} className="text-neutral-300" />
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
                      className="movie-genre-chip px-3 py-1 text-xs font-semibold text-neutral-200 bg-white/10 hover:bg-rose-600/30 hover:text-white hover:border-rose-500/40 rounded-full border border-white/15 transition-colors cursor-pointer backdrop-blur-sm"
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
                    className="movie-trailer-btn px-4 sm:px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-full shadow-lg shadow-rose-950/50 flex items-center gap-2 transition-all cursor-pointer"
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
                      className="px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-full shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all cursor-pointer"
                      title={`Launch ${primaryTorrent.title} Magnet Download directly`}
                    >
                      <Magnet size={16} />
                      <span>Magnet Download</span>
                    </button>

                    <button
                      onClick={() => handleCopyMagnetLink(primaryTorrent)}
                      className="px-4 py-2.5 bg-white text-black hover:bg-neutral-200 font-bold text-xs sm:text-sm rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer"
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
                  className="movie-action-pill px-4 py-2.5 bg-white/10 hover:bg-white/20 text-neutral-100 hover:text-white font-semibold text-xs sm:text-sm rounded-full border border-white/15 transition-colors flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
                >
                  <Info size={14} />
                  <span>How to Download</span>
                </button>

                {onAskCineBot && show && (
                  <button
                    onClick={() => onAskCineBot(`Tell me about the television series "${show.name}" (${show.year || ''}) and recommend 3 similar binge-worthy shows.`)}
                    className="px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white font-bold text-xs sm:text-sm rounded-full border border-rose-500/35 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-rose-950/30"
                    title="Ask CineBot AI about this series"
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

      {/* Mid-Page AdSlot */}
      <AdSenseSlot format="auto" responsive={true} />

      {/* Main Content Tabs */}
      <div className="space-y-6">
        
        {/* Navigation Tabs Bar */}
        <nav aria-label="Series Navigation Tabs" className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('torrents')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'torrents' ? 'bg-rose-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Magnet className="w-4 h-4" />
            <span>Episodes & Releases ({torrents.length})</span>
          </button>

          {show?.episodes && show.episodes.length > 0 && (
            <button
              onClick={() => setActiveTab('episodes')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'episodes' ? 'bg-rose-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Episode Guide ({show.episodes.length})</span>
            </button>
          )}

          {show?.cast && show.cast.length > 0 && (
            <button
              onClick={() => setActiveTab('cast')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'cast' ? 'bg-rose-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Cast & Characters ({show.cast.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-rose-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Series Synopsis & Tech</span>
          </button>
        </nav>

        {/* Tab 1: Torrents & Magnets */}
        {activeTab === 'torrents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left 2 Columns: Releases List & Filters */}
            <section className="lg:col-span-2 space-y-4">
              
              {/* Filter Controls Header */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 transition-all ${
                isWhite
                  ? 'bg-white border-slate-200 shadow-sm'
                  : isBlueBlack
                  ? 'bg-[#0b1329] border-sky-900/40'
                  : 'bg-[#0e0e0e] border-white/10'
              }`}>
                {/* Top Row: Title, Quick Actions & Search */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-600/15 border border-rose-500/30 flex items-center justify-center">
                      <Filter className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <div>
                      <h3 className={`text-xs font-black uppercase tracking-wider ${
                        isWhite ? 'text-slate-900' : 'text-white'
                      }`}>
                        Release Filters
                      </h3>
                      <p className={`text-[11px] ${
                        isWhite ? 'text-slate-500' : 'text-neutral-400'
                      }`}>
                        Filter by season, resolution, and release tags
                      </p>
                    </div>
                  </div>

                  {/* Search inside releases with clear button */}
                  <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                    <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                      isWhite ? 'text-slate-400' : 'text-neutral-400'
                    }`} />
                    <input
                      type="text"
                      value={releaseSearch}
                      onChange={(e) => setReleaseSearch(e.target.value)}
                      placeholder="Search releases (e.g. S01E01, 1080p)..."
                      className={`w-full pl-8.5 pr-8 py-2 text-xs rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/30 ${
                        isWhite
                          ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-rose-500'
                          : isBlueBlack
                          ? 'bg-[#070d1e] border border-sky-800/40 text-white placeholder-sky-400/50 focus:border-rose-500'
                          : 'bg-black/50 border border-white/10 text-white placeholder-neutral-500 focus:border-rose-500'
                      }`}
                    />
                    {releaseSearch && (
                      <button
                        onClick={() => setReleaseSearch('')}
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10 cursor-pointer ${
                          isWhite ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-400 hover:text-white'
                        }`}
                        title="Clear search"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Season Filter Pills (Wrap smoothly with real release counts - NO ugly horizontal scrollbar) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      isWhite ? 'text-slate-700' : 'text-neutral-300'
                    }`}>
                      Season:
                    </span>
                    {seasonStats.seasonsWithoutReleases.length > 0 && (
                      <button
                        onClick={() => setShowAllGuideSeasons(!showAllGuideSeasons)}
                        className="text-[11px] font-semibold text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        selectedSeason === 'All'
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 ring-1 ring-rose-500'
                          : isWhite
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          : isBlueBlack
                          ? 'bg-sky-950/40 hover:bg-sky-900/50 text-sky-200 border border-sky-800/40'
                          : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5'
                      }`}
                    >
                      <span>All Seasons</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                        selectedSeason === 'All'
                          ? 'bg-black/30 text-white'
                          : isWhite
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-white/10 text-neutral-300'
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
                          onClick={() => setSelectedSeason(String(s))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 ring-1 ring-rose-500'
                              : isWhite
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                              : isBlueBlack
                              ? 'bg-sky-950/40 hover:bg-sky-900/50 text-sky-200 border border-sky-800/40'
                              : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5'
                          }`}
                        >
                          <span>Season {s}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                            isSelected
                              ? 'bg-black/30 text-white'
                              : isWhite
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-white/10 text-neutral-300'
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                          selectedSeason === 'Packs'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500'
                            : isWhite
                            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-indigo-950/30 hover:bg-indigo-900/40 text-indigo-300 border border-indigo-500/20'
                        }`}
                      >
                        <FolderArchive className="w-3.5 h-3.5" />
                        <span>Season Packs</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono bg-black/30 text-white">
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
                          onClick={() => setSelectedSeason(String(s))}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 border border-dashed ${
                            isSelected
                              ? 'bg-rose-600 text-white border-solid'
                              : isWhite
                              ? 'bg-slate-50 text-slate-500 border-slate-300 hover:text-slate-800 hover:bg-slate-100'
                              : 'bg-white/5 text-neutral-400 border-white/20 hover:text-white hover:bg-white/10'
                          }`}
                          title={`Season ${s} is listed in Episode Guide (0 torrents indexed currently)`}
                        >
                          <span>Season {s}</span>
                          <span className="text-[10px] opacity-70 font-mono">0</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quality Filter Pills (Wrap smoothly with live torrent counts) */}
                <div className="space-y-1.5 pt-1">
                  <span className={`text-xs font-bold ${
                    isWhite ? 'text-slate-700' : 'text-neutral-300'
                  }`}>
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
                          onClick={() => setSelectedQuality(key)}
                          className={`px-2.5 py-1.2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 ring-1 ring-rose-500'
                              : !hasTorrents
                              ? isWhite
                                ? 'bg-slate-50 text-slate-400 border border-slate-200 opacity-60'
                                : 'bg-white/5 text-neutral-500 border border-white/5 opacity-50'
                              : isWhite
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                              : isBlueBlack
                              ? 'bg-sky-950/30 hover:bg-sky-900/40 text-sky-200 border border-sky-800/30'
                              : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5'
                          }`}
                        >
                          <span>{label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                            isSelected
                              ? 'bg-black/30 text-white'
                              : isWhite
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-white/10 text-neutral-400'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sort By & View Layout Bar */}
                <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${
                  isWhite ? 'border-slate-200' : 'border-white/10'
                }`}>
                  {/* Sort selector */}
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className={`w-3.5 h-3.5 ${isWhite ? 'text-slate-500' : 'text-neutral-400'}`} />
                    <span className={`text-xs font-medium ${isWhite ? 'text-slate-600' : 'text-neutral-400'}`}>
                      Sort:
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      aria-label="Sort releases by"
                      className={`text-xs font-semibold py-1 px-2.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                        isWhite
                          ? 'bg-slate-100 border-slate-300 text-slate-800'
                          : isBlueBlack
                          ? 'bg-[#070d1e] border-sky-800/40 text-sky-200'
                          : 'bg-[#141414] border-white/10 text-neutral-200'
                      }`}
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
                    <span className={`text-xs font-medium mr-1 ${isWhite ? 'text-slate-600' : 'text-neutral-400'}`}>
                      View:
                    </span>
                    <button
                      onClick={() => setViewMode('flat')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                        viewMode === 'flat'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : isWhite
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                      }`}
                      title="View all releases in a continuous list"
                    >
                      <ListFilter size={13} />
                      <span>List</span>
                    </button>
                    <button
                      onClick={() => setViewMode('grouped')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                        viewMode === 'grouped'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : isWhite
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'bg-white/5 text-neutral-400 hover:bg-white/10'
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
                  <span className={isWhite ? 'text-slate-700' : 'text-neutral-400'}>
                    Showing <strong className={isWhite ? 'text-slate-900 font-black' : 'text-white font-bold'}>{filteredTorrents.length}</strong> of{' '}
                    <strong className={isWhite ? 'text-slate-900 font-black' : 'text-white font-bold'}>{torrents.length}</strong> releases
                  </span>

                  {/* Active Filter Chips */}
                  {selectedSeason !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                      <span>Season {selectedSeason}</span>
                      <button onClick={() => setSelectedSeason('All')} className="hover:text-white cursor-pointer">
                        <X size={11} />
                      </button>
                    </span>
                  )}

                  {selectedQuality !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[11px] font-bold">
                      <span>{selectedQuality}</span>
                      <button onClick={() => setSelectedQuality('All')} className="hover:text-white cursor-pointer">
                        <X size={11} />
                      </button>
                    </span>
                  )}

                  {releaseSearch && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                      <span>"{releaseSearch}"</span>
                      <button onClick={() => setReleaseSearch('')} className="hover:text-white cursor-pointer">
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
                    className="text-rose-500 hover:text-rose-400 font-bold underline cursor-pointer text-xs transition-colors"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>

              {/* Releases List */}
              {isLoadingTorrents ? (
                <div className="py-2">
                  <SeriesDetailTorrentsSkeleton isWhite={isWhite} isBlueBlack={isBlueBlack} hideToolbar={true} />
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
                          className={`rounded-2xl border overflow-hidden transition-all ${
                            isWhite
                              ? 'bg-white border-slate-200 shadow-xs'
                              : isBlueBlack
                              ? 'bg-[#0b1329] border-sky-900/40'
                              : 'bg-[#0e0e0e] border-white/10'
                          }`}
                        >
                          {/* Season Group Header */}
                          <div
                            onClick={() => {
                              setCollapsedSeasons(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
                            }}
                            className={`p-3.5 sm:px-4.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                              isWhite
                                ? 'bg-slate-50 hover:bg-slate-100 border-b border-slate-200'
                                : 'bg-white/5 hover:bg-white/10 border-b border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2 h-2 rounded-full ${
                                group.seasonNum ? 'bg-rose-500' : 'bg-indigo-500'
                              }`} />
                              <h4 className={`text-sm font-black tracking-wide ${
                                isWhite ? 'text-slate-900' : 'text-white'
                              }`}>
                                {group.seasonLabel}
                              </h4>
                              <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-bold ${
                                isWhite
                                  ? 'bg-slate-200 text-slate-800'
                                  : 'bg-white/10 text-neutral-300'
                              }`}>
                                {group.torrents.length} {group.torrents.length === 1 ? 'Release' : 'Releases'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-mono hidden sm:inline-block ${
                                isWhite ? 'text-slate-500' : 'text-neutral-400'
                              }`}>
                                Total: {formatEztvBytes(group.totalBytes)} • Peak Seeds: <span className="text-emerald-500 font-bold">{group.maxSeeds}</span>
                              </span>
                              {isCollapsed ? <ChevronDown size={16} className="text-neutral-400" /> : <ChevronUp size={16} className="text-neutral-400" />}
                            </div>
                          </div>

                          {/* Group Releases */}
                          {!isCollapsed && (
                            <div className="divide-y divide-white/5 p-2 space-y-2">
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
                                        ? 'bg-rose-950/30 border-rose-500/70 shadow-md shadow-rose-950/20 ring-1 ring-rose-500/60'
                                        : isWhite
                                        ? 'bg-white hover:bg-slate-50 border-slate-200'
                                        : isBlueBlack
                                        ? 'bg-[#080f24] hover:bg-[#0c1634] border-sky-900/30'
                                        : 'bg-[#111111] hover:bg-[#161616] border-white/5'
                                    }`}
                                  >
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        {epTag && (
                                          <span className="px-2 py-0.5 rounded-md bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold">
                                            {epTag}
                                          </span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                          q.is4k
                                            ? 'bg-amber-500 text-black font-extrabold'
                                            : q.is1080p
                                            ? isWhite
                                              ? 'bg-slate-800 text-white'
                                              : 'bg-neutral-800 text-white border border-white/10'
                                            : isWhite
                                            ? 'bg-slate-100 text-slate-700'
                                            : 'bg-white/5 text-neutral-300'
                                        }`}>
                                          {q.quality}
                                        </span>
                                        {q.isHevc && (
                                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-bold">
                                            x265
                                          </span>
                                        )}
                                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                                          isWhite
                                            ? 'bg-slate-100 text-slate-800 border-slate-200'
                                            : 'bg-white/10 text-neutral-200 border-white/10'
                                        }`}>
                                          {formatEztvBytes(torrent.size_bytes)}
                                        </span>
                                        <span className={`text-xs ${isWhite ? 'text-slate-500' : 'text-neutral-400'}`}>
                                          {formatEztvDate(torrent.date_released_unix)}
                                        </span>
                                      </div>

                                      <h3 className={`text-xs sm:text-sm font-semibold truncate ${
                                        isWhite ? 'text-slate-900' : 'text-white'
                                      }`} title={torrent.title}>
                                        {torrent.title}
                                      </h3>

                                      <div className="flex items-center gap-2 pt-0.5">
                                        <TorrentSwarmHealthBadge seeds={torrent.seeds} peers={torrent.peers} showDetails />
                                        <span className="text-xs font-mono text-neutral-400">
                                          <span className="text-emerald-500 font-semibold">{torrent.seeds} Seeds</span>
                                          <span className="mx-1 text-neutral-600">•</span>
                                          <span>{torrent.peers} Peers</span>
                                        </span>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center pt-1 sm:pt-0">
                                      <button
                                        onClick={(e) => handleDirectDownload(e, torrent)}
                                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/30 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                        title="Direct BitTorrent Client Magnet Download"
                                      >
                                        <Magnet className="w-3.5 h-3.5" />
                                        <span>Magnet</span>
                                      </button>

                                      <button
                                        onClick={() => handleCopyMagnetLink(torrent)}
                                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                          isWhite
                                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                                            : 'bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white border border-white/10'
                                        }`}
                                        title="Copy Magnet URI link"
                                      >
                                        <CopyIcon size={14} />
                                        {isCopied ? <span className="text-emerald-500 font-bold">Copied!</span> : <span>URI</span>}
                                      </button>

                                      {torrent.torrent_url && (
                                        <a
                                          href={torrent.torrent_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                                            isWhite
                                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                                              : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10'
                                          }`}
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
                              ? 'bg-rose-950/30 border-rose-500/70 shadow-lg shadow-rose-950/20 ring-2 ring-rose-500/60'
                              : q.is4k
                              ? isWhite
                                ? 'bg-amber-50/60 border-amber-400/40 shadow-xs'
                                : 'bg-gradient-to-r from-amber-950/20 via-[#111111] to-[#0e0e0e] border-amber-500/35 shadow-lg shadow-amber-950/10'
                              : isWhite
                              ? 'bg-white hover:border-slate-300 border-slate-200 shadow-xs'
                              : isBlueBlack
                              ? 'bg-[#0b1329] border-sky-900/40 hover:border-sky-800/60'
                              : 'bg-[#0e0e0e] border-white/10 hover:border-white/20'
                          }`}
                        >
                          {/* Left: Metadata and Title */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {isSelectedInitial && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-extrabold text-[11px] shadow-xs animate-pulse tracking-wide">
                                  Selected File
                                </span>
                              )}

                              {epTag && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold">
                                  {epTag}
                                </span>
                              )}

                              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                q.is4k
                                  ? 'bg-amber-500 text-black font-extrabold'
                                  : q.is1080p
                                  ? isWhite
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-neutral-800 text-white border border-white/10'
                                  : isWhite
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-white/5 text-neutral-300 border border-white/5'
                              }`}>
                                {q.quality}
                              </span>

                              {q.isHevc && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-bold">
                                  x265
                                </span>
                              )}

                              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                                isWhite
                                  ? 'bg-slate-100 text-slate-800 border-slate-200'
                                  : 'bg-white/10 text-neutral-200 border border-white/10'
                              }`}>
                                {formatEztvBytes(torrent.size_bytes)}
                              </span>

                              <span className={`text-xs ${isWhite ? 'text-slate-500' : 'text-neutral-400'}`}>
                                {formatEztvDate(torrent.date_released_unix)}
                              </span>
                            </div>

                            <h3 className={`text-xs sm:text-sm font-semibold truncate ${
                              isWhite ? 'text-slate-900' : 'text-white'
                            }`} title={torrent.title}>
                              {torrent.title}
                            </h3>

                            <div className="flex items-center gap-2 pt-0.5">
                              <TorrentSwarmHealthBadge seeds={torrent.seeds} peers={torrent.peers} showDetails />
                              <span className={`text-xs font-mono ${isWhite ? 'text-slate-500' : 'text-neutral-400'}`}>
                                <span className="text-emerald-500 font-semibold">{torrent.seeds} Seeds</span>
                                <span className="mx-1 text-neutral-500">•</span>
                                <span>{torrent.peers} Peers</span>
                              </span>
                            </div>
                          </div>

                          {/* Right: Actions Toolbar */}
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <button
                              onClick={(e) => handleDirectDownload(e, torrent)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/30 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                              title="Direct BitTorrent Client Magnet Download"
                            >
                              <Magnet className="w-3.5 h-3.5" />
                              <span>Magnet</span>
                            </button>

                            <button
                              onClick={() => handleCopyMagnetLink(torrent)}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isWhite
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                                  : 'bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white border border-white/10'
                              }`}
                              title="Copy Magnet URI link"
                            >
                              <CopyIcon size={14} />
                              {isCopied ? <span className="text-emerald-500 font-bold">Copied!</span> : <span>URI</span>}
                            </button>

                            {torrent.torrent_url && (
                              <a
                                href={torrent.torrent_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                                  isWhite
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10'
                                }`}
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
                <div className={`text-center py-12 px-6 rounded-3xl border space-y-4 ${
                  isWhite
                    ? 'bg-white border-slate-200 shadow-sm'
                    : isBlueBlack
                    ? 'bg-[#0b1329] border-sky-900/40'
                    : 'bg-[#0e0e0e] border-white/10'
                }`}>
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
                    <Tv className="w-6 h-6" />
                  </div>
                  
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className={`text-base font-bold ${isWhite ? 'text-slate-900' : 'text-white'}`}>
                      {selectedSeason !== 'All' && !isNaN(parseInt(selectedSeason, 10))
                        ? `No torrents indexed for Season ${selectedSeason}`
                        : 'No matching releases found'}
                    </h3>
                    <p className={`text-xs leading-relaxed ${isWhite ? 'text-slate-500' : 'text-neutral-400'}`}>
                      {selectedSeason !== 'All' && !isNaN(parseInt(selectedSeason, 10))
                        ? `This tracker does not currently list verified releases tagged specifically under Season ${selectedSeason}. You can search for alternative naming or browse the episode guide.`
                        : 'No releases matched your active season, quality, or title keyword filters.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    {selectedSeason !== 'All' && !isNaN(parseInt(selectedSeason, 10)) && (
                      <>
                        <button
                          onClick={() => handleSearchAlternativeSeason(parseInt(selectedSeason, 10))}
                          disabled={isSearchingSeason}
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-rose-950/30 flex items-center gap-1.5"
                        >
                          {isSearchingSeason ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                          <span>Search Tracker for Season {selectedSeason}</span>
                        </button>

                        {show?.episodes && show.episodes.length > 0 && (
                          <button
                            onClick={() => {
                              setGuideSeason(parseInt(selectedSeason, 10));
                              setActiveTab('episodes');
                            }}
                            className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isWhite
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                                : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Browse Season {selectedSeason} in Episode Guide</span>
                          </button>
                        )}
                      </>
                    )}

                    <button
                      onClick={() => {
                        setSelectedSeason('All');
                        setSelectedQuality('All');
                        setReleaseSearch('');
                        setSortBy('latest');
                      }}
                      className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        selectedSeason === 'All'
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                          : isWhite
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          : 'bg-white/10 hover:bg-white/20 text-white'
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
              <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-rose-500" />
                  <span>Series Synopsis</span>
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  {show?.summary || 'No overview synopsis currently recorded for this television series.'}
                </p>
                {show?.officialSite && (
                  <div className="pt-2 border-t border-white/5">
                    <a
                      href={show.officialSite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold"
                    >
                      <span>Visit Official Broadcast Site</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              {/* Download Speed Estimator */}
              {primaryTorrent && (
                <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Download Time Estimator</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Calculated for standard episode size ({formatEztvBytes(primaryTorrent.size_bytes)}):
                  </p>
                  <DownloadSpeedEstimator sizeBytes={Number(primaryTorrent.size_bytes) || 1400000000} />
                </div>
              )}

              {/* Quick Tech Specs */}
              <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-3 text-xs">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-neutral-400" />
                  <span>Technical Overview</span>
                </h3>
                <div className="space-y-2 text-neutral-300">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-neutral-400">Network / Stream:</span>
                    <span className="font-semibold text-white">{show?.network || 'Broadcasting'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-neutral-400">Premiered:</span>
                    <span className="font-semibold text-white">{show?.premiered || show?.year || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-neutral-400">Status:</span>
                    <span className="font-semibold text-white">{show?.status || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-neutral-400">IMDb Reference:</span>
                    <span className="font-mono text-rose-400 font-semibold">{show?.imdb_code || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400">Indexer Source:</span>
                    <span className="font-semibold text-white">EZTV API / BitTorrent</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Tab 2: Episode Guide */}
        {activeTab === 'episodes' && (
          isLoadingDetails && (!show?.episodes || show.episodes.length === 0) ? (
            <SeriesDetailEpisodesSkeleton isWhite={isWhite} isBlueBlack={isBlueBlack} />
          ) : show?.episodes && show.episodes.length > 0 ? (
            <div className="space-y-4">
              
              {/* Season Filter for Guide (Wrap smoothly - NO ugly horizontal scrollbar) */}
              <div className={`flex flex-wrap items-center gap-2 pb-3 border-b ${
                isWhite ? 'border-slate-200' : 'border-white/10'
              }`}>
                <span className={`text-xs font-bold uppercase tracking-wider mr-1 ${
                  isWhite ? 'text-slate-600' : 'text-neutral-400'
                }`}>
                  Season:
                </span>
                {(seasonStats.allKnownSeasons.length > 0 ? seasonStats.allKnownSeasons : [1]).map((sNum) => {
                  const epCount = show.episodes?.filter(e => e.season === sNum).length || 0;
                  const isSelected = guideSeason === sNum;
                  return (
                    <button
                      key={`guide-season-tab-${sNum}`}
                      onClick={() => setGuideSeason(sNum)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 ring-1 ring-rose-500'
                          : isWhite
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          : isBlueBlack
                          ? 'bg-[#0b1329] hover:bg-sky-900/40 text-sky-200 border border-sky-900/40'
                          : 'bg-[#0e0e0e] text-neutral-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <span>Season {sNum}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                        isSelected
                          ? 'bg-black/30 text-white'
                          : isWhite
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-white/10 text-neutral-400'
                      }`}>
                        {epCount} eps
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Episodes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {show.episodes
                  .filter((ep) => ep.season === guideSeason)
                  .map((ep) => {
                    const epTag = `S${String(ep.season).padStart(2, '0')}E${String(ep.number).padStart(2, '0')}`;
                    
                    return (
                      <div
                        key={ep.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row gap-4 ${
                          isWhite
                            ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                            : isBlueBlack
                            ? 'bg-[#0b1329] border-sky-900/40 hover:border-sky-800/60'
                            : 'bg-[#0e0e0e] border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Thumbnail Still */}
                        <div className="sm:w-36 aspect-video rounded-xl overflow-hidden bg-black/40 shrink-0 relative">
                          {ep.image?.medium || ep.image?.original ? (
                            <img
                              src={ep.image.medium || ep.image.original!}
                              alt={`${ep.name} still`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              isWhite ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-neutral-600'
                            }`}>
                              <Tv size={24} />
                            </div>
                          )}
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] font-mono font-bold text-white border border-white/10">
                            {epTag}
                          </span>
                        </div>

                        {/* Episode Content */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`text-sm font-bold truncate ${
                              isWhite ? 'text-slate-900' : 'text-white'
                            }`}>
                              {ep.number}. {ep.name}
                            </h4>
                            {ep.runtime && (
                              <span className={`text-[11px] font-mono shrink-0 ${
                                isWhite ? 'text-slate-500' : 'text-neutral-400'
                              }`}>
                                {ep.runtime} min
                              </span>
                            )}
                          </div>

                          {ep.airdate && (
                            <p className={`text-[11px] ${isWhite ? 'text-slate-500' : 'text-neutral-400'}`}>
                              Aired: {ep.airdate}
                            </p>
                          )}

                          <p className={`text-xs line-clamp-3 leading-relaxed ${
                            isWhite ? 'text-slate-600' : 'text-neutral-300'
                          }`}>
                            {ep.summary || 'No detailed episode synopsis available.'}
                          </p>

                          <div className="pt-2">
                            <button
                              onClick={() => {
                                setSelectedSeason(String(ep.season));
                                setReleaseSearch(epTag);
                                setActiveTab('torrents');
                              }}
                              className="text-xs text-rose-500 hover:text-rose-400 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>Find Torrents for {epTag}</span>
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className={`p-12 text-center rounded-2xl border ${
              isWhite ? 'bg-white border-slate-200' : isBlueBlack ? 'bg-[#091124] border-sky-900/40' : 'bg-[#0e0e0e] border-white/10'
            }`}>
              <p className="text-sm text-neutral-400">No episode guide details available for this series.</p>
            </div>
          )
        )}

        {/* Tab 3: Cast & Characters */}
        {activeTab === 'cast' && (
          isLoadingDetails && (!show?.cast || show.cast.length === 0) ? (
            <SeriesDetailCastSkeleton isWhite={isWhite} isBlueBlack={isBlueBlack} />
          ) : show?.cast && show.cast.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {show.cast.map((c) => (
                <div
                  key={c.person.id}
                  onClick={() => onOpenFilmography && onOpenFilmography(c.person.name, 'actor')}
                  className={`group p-3 rounded-2xl border transition-all text-center space-y-2.5 cursor-pointer ${
                    isWhite
                      ? 'bg-white border-slate-200 hover:border-rose-500/40'
                      : isBlueBlack
                      ? 'bg-[#0b1329] border-sky-900/40 hover:border-sky-500/50'
                      : 'bg-[#0e0e0e] border-white/10 hover:border-rose-500/40'
                  }`}
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-black/40 relative">
                    {c.person.image?.medium || c.person.image?.original ? (
                      <img
                        src={c.person.image.medium || c.person.image.original!}
                        alt={c.person.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5 text-neutral-600">
                        <User size={32} />
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold transition-colors truncate ${
                      isWhite ? 'text-slate-900 group-hover:text-rose-600' : 'text-white group-hover:text-rose-400'
                    }`}>
                      {c.person.name}
                    </h4>
                    {c.character?.name && (
                      <p className={`text-[11px] truncate ${isWhite ? 'text-slate-500' : 'text-neutral-400'}`}>
                        as {c.character.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`p-12 text-center rounded-2xl border ${
              isWhite ? 'bg-white border-slate-200' : isBlueBlack ? 'bg-[#091124] border-sky-900/40' : 'bg-[#0e0e0e] border-white/10'
            }`}>
              <p className="text-sm text-neutral-400">No cast information available for this series.</p>
            </div>
          )
        )}

        {/* Tab 4: Overview */}
        {activeTab === 'overview' && (
          <div className="max-w-3xl space-y-6">
            <div className="p-6 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-rose-500" />
                <span>About {show?.name}</span>
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {show?.summary || 'No synopsis recorded.'}
              </p>
              {show?.officialSite && (
                <div className="pt-2">
                  <a
                    href={show.officialSite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold"
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
      <section className="space-y-4 pt-8 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Popular Television Series</h2>
            <p className="text-xs text-neutral-400">Explore other acclaimed shows available on CineVault</p>
          </div>
          <button
            onClick={() => onNavigateToSeries && onNavigateToSeries()}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Browse All Series</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {POPULAR_RECOMMENDED_SHOWS.map((pop) => (
            <button
              key={pop.imdb}
              onClick={() => onSelectSeries && onSelectSeries({ imdb: pop.imdb, title: pop.name })}
              className="p-2.5 sm:p-3 rounded-2xl bg-[#0e0e0e] border border-white/10 hover:border-rose-500/40 hover:bg-white/5 transition-all text-left space-y-2.5 cursor-pointer group shadow-sm hover:shadow-xl"
            >
              <div className="aspect-[2/3] rounded-xl bg-neutral-900 overflow-hidden relative border border-white/5">
                <img
                  src={getPrimarySeriesPoster(pop)}
                  alt={pop.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = CINEVAULT_POSTER_FALLBACK;
                  }}
                />
                <div className="tv-fallback-box hidden absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 text-neutral-500 p-2 text-center">
                  <Tv size={28} className="text-rose-500/60 mb-1" />
                  <span className="text-[10px] font-bold text-neutral-300 line-clamp-1">{pop.name}</span>
                </div>
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[10px] font-bold text-amber-400 flex items-center gap-0.5 border border-white/10 shadow-xs">
                  <span>★</span>
                  <span>{pop.rating}</span>
                </div>
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[9px] font-bold text-neutral-300 border border-white/10">
                  {pop.genre}
                </div>
              </div>

              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-neutral-200 group-hover:text-rose-400 transition-colors truncate">
                  {pop.name}
                </h4>
                <p className="text-[11px] text-neutral-400">
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
