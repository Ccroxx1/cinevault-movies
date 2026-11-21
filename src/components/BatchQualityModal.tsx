import React, { useState } from 'react';
import { Archive, Magnet, Check, Copy, X } from 'lucide-react';
import { CopyIcon } from './ActionIcons';
import { Movie, Torrent, buildMagnetLink } from '../types';
import { downloadMoviePackage, handleBrandedMagnetDownload } from '../utils/downloadPack';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface BatchQualityModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
}

export const BatchQualityModal: React.FC<BatchQualityModalProps> = ({
  movie,
  isOpen,
  onClose,
  onCopyMagnet
}) => {
  useBodyScrollLock(isOpen && Boolean(movie && movie.torrents && movie.torrents.length > 0));
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [packagingHash, setPackagingHash] = useState<string | null>(null);

  if (!isOpen || !movie || !movie.torrents || movie.torrents.length === 0) return null;

  const handleCopySingle = (torrent: Torrent) => {
    const magnetUrl = buildMagnetLink(torrent.hash, movie.title_long || movie.title);
    onCopyMagnet(magnetUrl, `${movie.title} (${torrent.quality})`);
    setCopiedHash(torrent.hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const handleDownloadMagnet = (torrent: Torrent) => {
    handleBrandedMagnetDownload(movie, torrent, {
      onStart: () => {
        onCopyMagnet(
          buildMagnetLink(torrent.hash, movie.title_long || movie.title),
          `${movie.title} (${torrent.quality}) — Starting Download & CineVault Info`
        );
      }
    });
  };

  const handleDownloadPack = async (torrent: Torrent) => {
    setPackagingHash(torrent.hash);
    try {
      await downloadMoviePackage(movie, torrent);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setPackagingHash(null), 1500);
    }
  };

  const handleCopyAllMagnets = () => {
    const allMagnets = movie.torrents.map((t) => {
      const uri = buildMagnetLink(t.hash, movie.title_long || movie.title);
      return `# ${movie.title} [${t.quality} ${t.type || 'BluRay'} - ${t.size}]\n${uri}\n`;
    }).join('\n');

    navigator.clipboard.writeText(allMagnets);
    onCopyMagnet(allMagnets, `All qualities for ${movie.title}`);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
      style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Quality Comparison"
    >
      <div className="modal-dialog-surface cv-surface-elevated border relative w-full max-w-2xl rounded-3xl p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-display font-black cv-text">
                Quality Comparison &amp; Media Packs
              </h3>
              <p className="text-xs cv-text-muted">
                {movie.title} ({movie.year}) • {movie.torrents.length} Available Resolutions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full cv-btn-secondary transition-colors cursor-pointer"
            aria-label="Close quality comparison"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Matrix */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
          {movie.torrents.map((torrent) => {
            const isCopied = copiedHash === torrent.hash;
            const isHighRes = torrent.quality === '2160p' || torrent.quality === '4k';
            const isPackaging = packagingHash === torrent.hash;

            return (
              <div
                key={torrent.hash}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isHighRes
                    ? 'cv-4k-card'
                    : 'cv-card'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded uppercase tracking-wider ${
                      isHighRes
                        ? 'cv-rating-badge'
                        : 'cv-btn-primary'
                    }`}>
                      {torrent.quality}
                    </span>
                    <span className="text-xs font-mono uppercase cv-badge-neutral px-2 py-0.5 rounded border">
                      {torrent.type || 'BluRay'}
                    </span>
                    <span className="text-xs font-mono font-bold cv-text cv-surface-muted px-2 py-0.5 rounded border cv-border-subtle">
                      {torrent.size}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs cv-text-muted font-mono">
                    <span className="font-bold" style={{ color: 'var(--cv-success-soft-fg)' }}>
                       {torrent.seeds ?? 0} Seeds
                    </span>
                    <span>
                       {torrent.peers ?? 0} Peers
                    </span>
                    {torrent.video_codec && (
                      <span className="cv-text-subtle">
                        {torrent.video_codec}
                      </span>
                    )}
                    {torrent.audio_channels && (
                      <span className="cv-text-subtle">
                        {torrent.audio_channels}ch
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 cv-border-subtle">
                  {/* Download Pack (.zip) */}
                  <button
                    onClick={() => handleDownloadPack(torrent)}
                    disabled={isPackaging}
                    className="px-3 py-2 cv-rating-badge hover:opacity-90 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-opacity cursor-pointer disabled:opacity-60"
                    title="Download ZIP folder with Cover Photo & Site Info"
                  >
                    <Archive className={`w-3.5 h-3.5 ${isPackaging ? 'animate-spin' : ''}`} />
                    <span>Pack (.zip)</span>
                  </button>

                  <button
                    onClick={() => handleDownloadMagnet(torrent)}
                    className="px-3.5 py-2 cv-btn-magnet text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                    title="Launch BitTorrent Client & Download CineVault Branded Info"
                  >
                    <Magnet className="w-3.5 h-3.5" />
                    <span>Magnet</span>
                  </button>

                  <button
                    onClick={() => handleCopySingle(torrent)}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isCopied ? 'cv-badge-success border' : 'cv-btn-secondary'
                    }`}
                    title="Copy Magnet URI"
                  >
                    {isCopied ? (
                      <>
                        <Check size={14} />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions bar */}
        <div className="pt-3 border-t cv-border flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleCopyAllMagnets}
            className="flex items-center gap-2 px-5 py-2.5 cv-btn-primary text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all cursor-pointer"
          >
            {copiedAll ? (
              <>
                <Check className="w-4 h-4" />
                <span>All Magnets Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy All {movie.torrents.length} Magnet Links</span>
              </>
            )}
          </button>

          <span className="text-[11px] cv-text-muted font-mono">
            Direct P2P &amp; Media Pack Verified
          </span>
        </div>

      </div>
    </div>
  );
};
