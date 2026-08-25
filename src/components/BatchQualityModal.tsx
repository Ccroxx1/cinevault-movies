import React, { useState } from 'react';
import { X, Magnet, Copy, Check, HardDrive, Zap, Info, ShieldCheck, Download, FolderArchive, Loader2 } from 'lucide-react';
import { Movie, Torrent, buildMagnetLink } from '../types';
import { downloadMoviePackage, handleBrandedMagnetDownload } from '../utils/downloadPack';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e0e0e] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-display font-black text-white">
                Quality Comparison & Media Packs
              </h3>
              <p className="text-xs text-neutral-400">
                {movie.title} ({movie.year}) • {movie.torrents.length} Available Resolutions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Matrix */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
          {movie.torrents.map((torrent) => {
            const magnetUrl = buildMagnetLink(torrent.hash, movie.title_long || movie.title);
            const isCopied = copiedHash === torrent.hash;
            const isHighRes = torrent.quality === '2160p' || torrent.quality === '4k';
            const isPackaging = packagingHash === torrent.hash;

            return (
              <div
                key={torrent.hash}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isHighRes
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-[#141414] border-white/10'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded uppercase tracking-wider ${
                      isHighRes
                        ? 'bg-amber-500 text-black font-extrabold'
                        : 'bg-rose-600 text-white'
                    }`}>
                      {torrent.quality}
                    </span>
                    <span className="text-xs font-mono uppercase text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded border border-white/10">
                      {torrent.type || 'BluRay'}
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">
                      {torrent.size}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                    <span className="text-emerald-400 font-bold">
                      ● {torrent.seeds ?? 0} Seeds
                    </span>
                    <span>
                      ○ {torrent.peers ?? 0} Peers
                    </span>
                    {torrent.video_codec && (
                      <span className="text-neutral-500">
                        {torrent.video_codec}
                      </span>
                    )}
                    {torrent.audio_channels && (
                      <span className="text-neutral-500">
                        {torrent.audio_channels}ch
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  {/* Download Pack (.zip) */}
                  <button
                    onClick={() => handleDownloadPack(torrent)}
                    disabled={isPackaging}
                    className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 hover:text-white text-xs font-bold rounded-xl border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                    title="Download ZIP folder with Cover Photo & Site Info"
                  >
                    {isPackaging ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>Pack (.zip)</span>
                  </button>

                  <button
                    onClick={() => handleDownloadMagnet(torrent)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                    title="Launch BitTorrent Client & Download CineVault Branded Info"
                  >
                    <Magnet className="w-3.5 h-3.5" />
                    <span>Magnet</span>
                  </button>

                  <button
                    onClick={() => handleCopySingle(torrent)}
                    className="px-3 py-2 bg-[#222222] hover:bg-[#2c2c2c] text-neutral-200 hover:text-white text-xs font-semibold rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Copy Magnet URI"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
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
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleCopyAllMagnets}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-rose-900/30 transition-all cursor-pointer"
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

          <span className="text-[11px] text-neutral-400 font-mono">
            Direct P2P & Media Pack Verified
          </span>
        </div>

      </div>
    </div>
  );
};
