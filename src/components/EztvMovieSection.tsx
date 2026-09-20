import React, { useState, useEffect } from 'react';
import { Tv, Magnet, Check, ExternalLink, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { EztvTorrent } from '../types';
import { fetchEztvByImdb, formatEztvBytes, formatEztvDate, parseQualityFromEztv } from '../services/eztvApi';
import { CopyIcon } from './ActionIcons';

interface EztvMovieSectionProps {
  imdbCode: string;
  movieTitle: string;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  onNavigateToSeries?: () => void;
  onSelectSeries?: (params: { imdb?: string; title?: string; torrent?: EztvTorrent }) => void;
}

export const EztvMovieSection: React.FC<EztvMovieSectionProps> = ({
  imdbCode,
  movieTitle,
  onShowToast,
  onNavigateToSeries,
  onSelectSeries
}) => {
  const [torrents, setTorrents] = useState<EztvTorrent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!imdbCode) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchEztvByImdb(imdbCode, 1, 40)
      .then((res) => {
        if (isMounted) {
          setTorrents(res.torrents || []);
          // Auto-expand if TV episodes/torrents are found
          if (res.torrents && res.torrents.length > 0) {
            setIsExpanded(true);
          }
        }
      })
      .catch(() => {
        if (isMounted) setTorrents([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [imdbCode]);

  const handleCopyMagnet = (torrent: EztvTorrent) => {
    if (!torrent.magnet_url) return;
    navigator.clipboard.writeText(torrent.magnet_url).then(() => {
      setCopiedHash(torrent.hash);
      onShowToast?.('Magnet link copied to clipboard!', 'success');
      setTimeout(() => setCopiedHash(null), 3000);
    });
  };

  const handleLaunchMagnet = (torrent: EztvTorrent) => {
    if (!torrent.magnet_url) return;
    window.location.href = torrent.magnet_url;
    onShowToast?.(`Launching magnet for ${torrent.title}...`, 'info');
  };

  if (isLoading) {
    return (
      <div className="p-4 rounded-2xl bg-[#0c0c10] border border-white/10 flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-2.5">
          <Tv className="w-4 h-4 text-neutral-500" />
          <div className="h-4 w-44 bg-white/10 rounded"></div>
        </div>
        <div className="h-4 w-20 bg-white/5 rounded"></div>
      </div>
    );
  }

  // If no torrents on EZTV for this title
  if (!torrents || torrents.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-[#0c0c10] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-neutral-400">
          <Tv className="w-4 h-4 text-rose-500/70 shrink-0" />
          <span>EZTV TV releases: No TV broadcast feeds recorded for this standalone film.</span>
        </div>
        {onNavigateToSeries && (
          <button
            onClick={() => onNavigateToSeries()}
            className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Browse TV Series Catalog</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#0c0c10] border border-rose-500/30 overflow-hidden shadow-lg transition-all">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between bg-rose-500/10 hover:bg-rose-500/15 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          <Tv className="w-5 h-5 text-rose-500 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                EZTV Series & Episode Torrents
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-full bg-rose-500 text-white">
                {torrents.length} {torrents.length === 1 ? 'Release' : 'Releases'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Matched from EZTV database via IMDb ID ({imdbCode})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
          <span>{isExpanded ? 'Hide' : 'View Releases'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-4 space-y-2.5 divide-y divide-white/5 max-h-96 overflow-y-auto">
          {torrents.map((torrent) => {
            const { quality, is4k, isHevc } = parseQualityFromEztv(torrent.title, torrent.filename);
            const isCopied = copiedHash === torrent.hash;
            const seasonNum = torrent.season && torrent.season !== '0' ? parseInt(torrent.season, 10) : null;
            const episodeNum = torrent.episode && torrent.episode !== '0' ? parseInt(torrent.episode, 10) : null;

            return (
              <div
                key={torrent.id || torrent.hash}
                onClick={() => {
                  if (onSelectSeries) {
                    onSelectSeries({
                      imdb: imdbCode,
                      title: movieTitle,
                      torrent
                    });
                  }
                }}
                className={`pt-2.5 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs group p-2 rounded-xl transition-all ${
                  onSelectSeries ? 'cursor-pointer hover:bg-white/[0.04]' : ''
                }`}
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {seasonNum !== null && (
                      <span className="px-2 py-0.5 font-mono font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {episodeNum !== null
                          ? `S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}`
                          : `S${seasonNum}`}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 font-mono font-bold rounded ${
                        is4k ? 'bg-amber-500 text-black' : 'bg-white/10 text-white'
                      }`}
                    >
                      {quality}
                    </span>
                    {isHevc && (
                      <span className="px-1.5 py-0.5 font-mono text-[10px] rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        x265
                      </span>
                    )}
                    <span className="font-mono text-neutral-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      {formatEztvBytes(torrent.size_bytes)}
                    </span>
                    <span className="text-neutral-500 font-mono text-[11px]">
                      {formatEztvDate(torrent.date_released_unix)}
                    </span>
                    {onSelectSeries && (
                      <span className="text-[10px] font-semibold text-rose-400 group-hover:underline ml-auto hidden sm:inline">
                        Series Details →
                      </span>
                    )}
                  </div>

                  <p className="text-neutral-200 font-semibold truncate group-hover:text-rose-400 transition-colors" title={torrent.title}>
                    {torrent.title}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                    <span className="text-emerald-400 font-bold">{torrent.seeds ?? 0} Seeds</span>
                    <span>•</span>
                    <span>{torrent.peers ?? 0} Peers</span>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 shrink-0 self-start sm:self-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onSelectSeries && (
                    <button
                      onClick={() => onSelectSeries({ imdb: imdbCode, title: movieTitle, torrent })}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-rose-600 hover:text-white text-neutral-300 font-semibold flex items-center gap-1 transition-all cursor-pointer text-xs"
                      title="View full TV series details"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleLaunchMagnet(torrent)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    title="Launch Magnet link"
                  >
                    <Magnet className="w-3.5 h-3.5" />
                    <span>Magnet</span>
                  </button>

                  <button
                    onClick={() => handleCopyMagnet(torrent)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isCopied
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300 hover:text-white'
                    }`}
                    title={isCopied ? 'Copied' : 'Copy Magnet URI'}
                    aria-label="Copy Magnet URI"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <CopyIcon size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
