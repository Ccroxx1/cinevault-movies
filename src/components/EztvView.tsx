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
  ExternalLink
} from 'lucide-react';
import { EztvTorrent, TvShowInfo } from '../types';
import {
  fetchEztvTorrents,
  searchTvShows,
  formatEztvBytes,
  formatEztvDate,
  parseQualityFromEztv,
  extractShowTitleFromRelease
} from '../services/eztvApi';
import { CopyIcon } from './ActionIcons';

interface EztvViewProps {
  initialQuery?: string;
  initialImdb?: string;
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

const QUALITY_FILTERS = ['All', '1080p', '720p', '4K UHD', 'x265 / HEVC', '480p'];

export const EztvView: React.FC<EztvViewProps> = ({
  initialQuery,
  initialImdb,
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

  // Filters & Sorting
  const [selectedQuality, setSelectedQuality] = useState<string>('All');
  const [selectedSeason, setSelectedSeason] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'seeds' | 'size'>('date');
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
  }, [initialQuery, initialImdb]);

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

  // Click outside suggestions to close dropdown
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch torrents from EZTV API
  const loadTorrents = async (page: number, imdbId?: string | null, search?: string | null) => {
    setIsLoading(true);
    setError(null);
    setServerMessage(null);

    try {
      const res = await fetchEztvTorrents({
        page,
        limit: 40,
        imdb_id: imdbId || undefined,
        search: search || undefined
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
    loadTorrents(currentPage, activeImdbId, activeQuery);
  }, [currentPage, activeImdbId, activeQuery]);

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
  }, [torrents, selectedSeason, selectedQuality, sortBy]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 border eztv-hero-banner shadow-2xl">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider eztv-hero-badge">
            <Tv className="w-3.5 h-3.5" />
            <span>EZTV Television Index</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight eztv-hero-title">
            TV Series, Seasons & Episode Releases
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed eztv-hero-sub">
            Live television torrent index powered directly by the official EZTV API and TVmaze.
            Search any series (like Dark, Loki, Breaking Bad, Stranger Things) or IMDb ID to browse full seasons and verified episode releases.
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

            {/* Live Autocomplete Suggestions Dropdown */}
            {isSuggestionsOpen && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 sm:right-32 mt-2 bg-[#0d0d12] border border-white/20 rounded-2xl shadow-2xl shadow-black overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 eztv-suggestions-menu"
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
                        {show.image ? (
                          <img
                            src={show.image}
                            alt={show.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-600">
                            <Tv className="w-5 h-5" />
                          </div>
                        )}
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

        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-5 pointer-events-none">
          <Tv className="w-96 h-96 text-white" />
        </div>
      </div>

      {/* TV Show Metadata Card (When a show is active and resolved) */}
      {showMeta && (
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 border eztv-showcase-card shadow-xl flex flex-col md:flex-row gap-6 items-start">
          {showMeta.image && (
            <div className="w-28 sm:w-36 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 bg-neutral-900">
              <img
                src={showMeta.image}
                alt={showMeta.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

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
      )}

      {/* Filter & Sort Controls Bar */}
      <div className="p-4 rounded-2xl bg-[#0f0f13] border border-white/10 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quality Filter */}
          <div className="flex items-center gap-2">
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

        {/* Sort selector & Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
            <HardDrive className="w-3.5 h-3.5" />
            <span>
              {filteredTorrents.length}{' '}
              {filteredTorrents.length === 1 ? 'Release' : 'Releases'}
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
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="h-20 rounded-2xl bg-neutral-900/40 border border-white/5 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Torrents Release List */}
      {!isLoading && !error && filteredTorrents.length > 0 && (
        <div className="space-y-2.5">
          {filteredTorrents.map((torrent) => {
            const { quality, isHevc } = parseQualityFromEztv(torrent.title, torrent.filename);
            const isCopied = copiedHash === torrent.hash;

            return (
              <div
                key={torrent.id || torrent.hash}
                onClick={() => handleSelectRelease(torrent)}
                className="group p-4 rounded-2xl border transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 eztv-release-row shadow-xs cursor-pointer hover:border-rose-500/50 hover:bg-white/[0.03]"
              >
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

                {/* Actions */}
                <div
                  className="flex items-center gap-2 shrink-0 self-end lg:self-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* View Details Button */}
                  <button
                    onClick={() => handleSelectRelease(torrent)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-rose-600 hover:text-white text-neutral-200 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                    title="View full TV series detail page"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>

                  {/* Magnet Download */}
                  <button
                    onClick={() => handleLaunchMagnet(torrent)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                    title="Launch BitTorrent client"
                  >
                    <Magnet className="w-4 h-4" />
                    <span>Magnet Download</span>
                  </button>

                  {/* Copy Magnet */}
                  <button
                    onClick={() => handleCopyMagnet(torrent)}
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
          })}
        </div>
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
