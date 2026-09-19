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
  ChevronRight
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
import { CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';

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
  { name: 'Loki', imdb: 'tt9140554', year: '2021', genre: 'Action', rating: 8.2, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/482/1206173.jpg' },
  { name: 'Breaking Bad', imdb: 'tt0903747', year: '2008', genre: 'Crime', rating: 9.5, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/501/1253519.jpg' },
  { name: 'Stranger Things', imdb: 'tt4574334', year: '2016', genre: 'Drama', rating: 8.6, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/394/986060.jpg' },
  { name: 'Severance', imdb: 'tt11280740', year: '2022', genre: 'Mystery', rating: 8.7, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/402/1005273.jpg' },
  { name: 'The Boys', imdb: 'tt1190634', year: '2019', genre: 'Action', rating: 8.7, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/499/1248464.jpg' },
  { name: 'House of the Dragon', imdb: 'tt11198330', year: '2022', genre: 'Fantasy', rating: 8.4, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/482/1206103.jpg' },
  { name: 'The Last of Us', imdb: 'tt3581920', year: '2023', genre: 'Adventure', rating: 8.8, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/444/1110904.jpg' },
  { name: 'Fallout', imdb: 'tt12637874', year: '2024', genre: 'Sci-Fi', rating: 8.4, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/504/1260846.jpg' },
  { name: 'The Bear', imdb: 'tt14452792', year: '2022', genre: 'Comedy', rating: 8.6, image: 'https://static.tvmaze.com/uploads/images/medium_portrait/482/1206126.jpg' }
];

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
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Selected episode filter for episode guide tab
  const [guideSeason, setGuideSeason] = useState<number>(1);

  // Load TV show details and episodes
  useEffect(() => {
    let isMounted = true;

    const loadShowData = async () => {
      if (!show?.episodes || show.episodes.length === 0) {
        setIsLoadingDetails(true);
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
      setIsLoadingTorrents(true);

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
      setIsLoadingTorrents(false);
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

  // Available Seasons list from torrents and episodes
  const seasonsList = useMemo(() => {
    const set = new Set<string>();
    torrents.forEach((t) => {
      const s = parseInt(t.season, 10);
      if (!isNaN(s) && s > 0) set.add(String(s));
    });
    show?.episodes?.forEach((e) => {
      if (e.season > 0) set.add(String(e.season));
    });
    return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [torrents, show?.episodes]);

  // Filtered torrent releases
  const filteredTorrents = useMemo(() => {
    return torrents.filter((t) => {
      // Season filter
      if (selectedSeason !== 'All') {
        const sNum = parseInt(selectedSeason, 10);
        const tNum = parseInt(t.season, 10);
        if (tNum !== sNum) return false;
      }

      // Quality filter
      const q = parseQualityFromEztv(t.title, t.filename);
      if (selectedQuality === '1080p' && !q.is1080p) return false;
      if (selectedQuality === '720p' && !q.is720p) return false;
      if (selectedQuality === '4K UHD' && !q.is4k) return false;
      if (selectedQuality === 'x265 / HEVC' && !q.isHevc) return false;
      if (selectedQuality === '480p' && (q.is1080p || q.is720p || q.is4k)) return false;

      // Text search inside releases
      if (releaseSearch.trim()) {
        const needle = releaseSearch.toLowerCase().trim();
        const haystack = `${t.title} ${t.filename} S${t.season}E${t.episode}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  }, [torrents, selectedSeason, selectedQuality, releaseSearch]);

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
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      onShowToast('Page link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const isCurrentWatchlisted = useMemo(() => {
    if (!isWatchlisted || !show) return false;
    const target = show.imdb_code || show.imdb_id || (show.id ? String(show.id) : '');
    return isWatchlisted(target) || isWatchlisted(show.name);
  }, [isWatchlisted, show]);

  const posterUrl = show?.image || CINEVAULT_POSTER_FALLBACK;
  const backdropImage = show?.backdropImage || show?.image || null;

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
                src={posterUrl}
                alt={`${show?.name || 'TV Series'} Official Poster`}
                width="256"
                height="384"
                loading="eager"
                className="w-full h-full object-cover"
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

                {seasonsList.length > 0 && (
                  <div className="movie-meta-pill flex items-center gap-1.5 text-neutral-100 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                    <span>{seasonsList.length} Season{seasonsList.length > 1 ? 's' : ''}</span>
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
              <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Release Filters</span>
                  </div>

                  {/* Search inside releases */}
                  <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={releaseSearch}
                      onChange={(e) => setReleaseSearch(e.target.value)}
                      placeholder="Filter releases (e.g. S01E01)..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Season Filter Pills */}
                {seasonsList.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <span className="text-xs font-medium text-neutral-400 mr-1 shrink-0">Season:</span>
                    <button
                      onClick={() => setSelectedSeason('All')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedSeason === 'All'
                          ? 'bg-rose-600 text-white'
                          : 'bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white border border-white/5'
                      }`}
                    >
                      All Seasons
                    </button>
                    {seasonsList.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSeason(s)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          selectedSeason === s
                            ? 'bg-rose-600 text-white'
                            : 'bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white border border-white/5'
                        }`}
                      >
                        Season {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quality Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-xs font-medium text-neutral-400 mr-1 shrink-0">Quality:</span>
                  {['All', '1080p', '720p', '4K UHD', 'x265 / HEVC', '480p'].map((q) => (
                    <button
                      key={q}
                      onClick={() => setSelectedQuality(q)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        selectedQuality === q
                          ? 'bg-neutral-200 text-black font-bold'
                          : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/5'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Releases Results Count */}
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <span>Showing <strong>{filteredTorrents.length}</strong> of <strong>{torrents.length}</strong> releases</span>
                {(selectedSeason !== 'All' || selectedQuality !== 'All' || releaseSearch) && (
                  <button
                    onClick={() => {
                      setSelectedSeason('All');
                      setSelectedQuality('All');
                      setReleaseSearch('');
                    }}
                    className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Releases List */}
              {isLoadingTorrents ? (
                <div className="space-y-3 py-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-20 bg-[#0e0e0e] border border-white/5 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredTorrents.length > 0 ? (
                <div className="space-y-3">
                  {filteredTorrents.map((torrent) => {
                    const q = parseQualityFromEztv(torrent.title, torrent.filename);
                    const sNum = parseInt(torrent.season, 10);
                    const eNum = parseInt(torrent.episode, 10);
                    const epTag = !isNaN(sNum) && !isNaN(eNum) && sNum > 0
                      ? `S${String(sNum).padStart(2, '0')}E${String(eNum).padStart(2, '0')}`
                      : null;
                    const isCopied = copiedHash === torrent.hash;
                    const isSelectedInitial = initialTorrent && torrent.hash === initialTorrent.hash;

                    return (
                      <div
                        key={torrent.id || torrent.hash}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                          isSelectedInitial
                            ? 'bg-rose-950/30 border-rose-500/70 shadow-lg shadow-rose-950/20 ring-2 ring-rose-500/60'
                            : q.is4k
                            ? 'bg-gradient-to-r from-amber-950/20 via-[#111111] to-[#0e0e0e] border-amber-500/35 shadow-lg shadow-amber-950/10'
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
                              <span className="px-2 py-0.5 rounded-md bg-rose-600/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold">
                                {epTag}
                              </span>
                            )}

                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              q.is4k
                                ? 'bg-amber-500 text-black font-extrabold'
                                : q.is1080p
                                ? 'bg-neutral-800 text-white border border-white/10'
                                : 'bg-white/5 text-neutral-300 border border-white/5'
                            }`}>
                              {q.quality}
                            </span>

                            {q.isHevc && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                                x265
                              </span>
                            )}

                            <span className="text-xs font-mono font-bold text-neutral-200 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                              {formatEztvBytes(torrent.size_bytes)}
                            </span>

                            <span className="text-xs text-neutral-400">
                              {formatEztvDate(torrent.date_released_unix)}
                            </span>
                          </div>

                          <h3 className="text-xs sm:text-sm font-semibold text-white truncate" title={torrent.title}>
                            {torrent.title}
                          </h3>

                          <div className="flex items-center gap-2 pt-0.5">
                            <TorrentSwarmHealthBadge seeds={torrent.seeds} peers={torrent.peers} showDetails />
                            <span className="text-xs font-mono text-neutral-400">
                              <span className="text-emerald-400 font-semibold">{torrent.seeds} Seeds</span>
                              <span className="mx-1 text-neutral-600">•</span>
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
                            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Copy Magnet URI link"
                          >
                            <CopyIcon size={14} />
                            {isCopied ? <span className="text-emerald-400 font-bold">Copied!</span> : <span>URI</span>}
                          </button>

                          {torrent.torrent_url && (
                            <a
                              href={torrent.torrent_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 flex items-center gap-1 transition-all"
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
              ) : (
                <div className="text-center py-12 px-4 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-3">
                  <Tv className="w-10 h-10 text-neutral-600 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">No matching releases found</h3>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                      No torrents matched the current season or quality filters. Try resetting the filters to view all releases.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSeason('All');
                      setSelectedQuality('All');
                      setReleaseSearch('');
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    View All Releases
                  </button>
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
        {activeTab === 'episodes' && show?.episodes && (
          <div className="space-y-4">
            
            {/* Season Filter for Guide */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mr-2">Season:</span>
              {seasonsList.map((s) => {
                const sNum = parseInt(s, 10);
                return (
                  <button
                    key={s}
                    onClick={() => setGuideSeason(sNum)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      guideSeason === sNum
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-[#0e0e0e] text-neutral-300 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    Season {s}
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
                      className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row gap-4"
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
                          <div className="w-full h-full flex items-center justify-center bg-white/5 text-neutral-600">
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
                          <h4 className="text-sm font-bold text-white truncate">
                            {ep.number}. {ep.name}
                          </h4>
                          {ep.runtime && (
                            <span className="text-[11px] text-neutral-400 font-mono shrink-0">
                              {ep.runtime} min
                            </span>
                          )}
                        </div>

                        {ep.airdate && (
                          <p className="text-[11px] text-neutral-400">
                            Aired: {ep.airdate}
                          </p>
                        )}

                        <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed">
                          {ep.summary || 'No detailed episode synopsis available.'}
                        </p>

                        <div className="pt-2">
                          <button
                            onClick={() => {
                              setSelectedSeason(String(ep.season));
                              setReleaseSearch(epTag);
                              setActiveTab('torrents');
                            }}
                            className="text-xs text-rose-400 hover:text-rose-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
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
        )}

        {/* Tab 3: Cast & Characters */}
        {activeTab === 'cast' && show?.cast && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {show.cast.map((c) => (
              <div
                key={c.person.id}
                onClick={() => onOpenFilmography && onOpenFilmography(c.person.name, 'actor')}
                className="group p-3 rounded-2xl bg-[#0e0e0e] border border-white/10 hover:border-rose-500/40 transition-all text-center space-y-2.5 cursor-pointer"
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
                  <h4 className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors truncate">
                    {c.person.name}
                  </h4>
                  {c.character?.name && (
                    <p className="text-[11px] text-neutral-400 truncate">
                      as {c.character.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
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
                  src={pop.image}
                  alt={pop.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.tv-fallback-box');
                    if (fallback) fallback.classList.remove('hidden');
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

    </article>
  );
};
