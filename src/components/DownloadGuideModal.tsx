import React, { useState } from 'react';
import { RECOMMENDED_TRACKERS } from '../types';

interface DownloadGuideModalProps {
  onClose: () => void;
  onCopyAllTrackers: () => void;
}

export const DownloadGuideModal: React.FC<DownloadGuideModalProps> = ({
  onClose,
  onCopyAllTrackers
}) => {
  const [copiedTrackers, setCopiedTrackers] = useState(false);

  const handleCopyTrackers = () => {
    const text = RECOMMENDED_TRACKERS.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedTrackers(true);
    setTimeout(() => setCopiedTrackers(false), 2000);
    onCopyAllTrackers();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-display font-black text-white">
                Magnet URIs & Download Methods
              </h3>
              <p className="text-xs text-neutral-400">
                Direct magnet downloads, raw magnet URIs, debrid cloud tools, and .torrent files
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
                Close
              </button>
        </div>

        {/* Steps */}
        <div className="space-y-3.5 text-sm text-neutral-300">
          
          <div className="flex items-start gap-3.5 p-4 bg-[#050505] rounded-2xl border border-white/10">
            <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              1
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>Direct "Magnet Download" (One-Click Launch)</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Clicking the green <strong>"Magnet Download"</strong> button invokes your device's registered <code>magnet:</code> protocol handler directly, immediately opening your torrent client (e.g. <strong>qBittorrent</strong>, <strong>Transmission</strong>, <strong>LibreTorrent</strong>, or <strong>Flud</strong>) without needing to download separate files.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 bg-[#050505] rounded-2xl border border-white/10">
            <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              2
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>Raw Magnet URIs for Cloud & Debrid Services</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Click <strong>"Copy URI"</strong> or <strong>"URI Details"</strong> to copy the complete raw URI string (<code>magnet:?xt=urn:btih:...</code>). You can paste this directly into cloud downloaders like <strong>Real-Debrid</strong>, <strong>Seedr.cc</strong>, <strong>Put.io</strong>, or <strong>Offcloud</strong> for high-speed cloud caching and direct streaming.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 bg-[#050505] rounded-2xl border border-white/10">
            <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              3
            </div>
            <div>
              <div className="font-bold text-white text-sm">Direct .torrent Metadata Files</div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Click <strong>".Torrent"</strong> to save the standard metadata file locally on your disk, useful for offline archiving or media servers like Plex/Jellyfin.
              </p>
            </div>
          </div>

        </div>

        {/* Recommended Trackers Box */}
        <div className="p-4 bg-[#050505] border border-white/10 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300">
              <span aria-hidden="true" className="hidden" />
              <span>Recommended Open BitTorrent Trackers ({RECOMMENDED_TRACKERS.length})</span>
            </div>

            <button
              onClick={handleCopyTrackers}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-3 py-1 bg-emerald-600/10 rounded-full border border-emerald-500/20 transition-colors cursor-pointer"
            >
              {copiedTrackers ? (
                <>
                  <span aria-hidden="true" className="hidden" />
                  <span>Copied All Trackers</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="hidden" />
                  <span>Copy All Trackers</span>
                </>
              )}
            </button>
          </div>

          <div className="p-2.5 bg-[#0a0a0a] rounded-xl font-mono text-[11px] text-neutral-400 max-h-28 overflow-y-auto space-y-1 border border-white/5">
            {RECOMMENDED_TRACKERS.map((t, idx) => (
              <div key={idx} className="truncate">{t}</div>
            ))}
          </div>
        </div>

        {/* Dismiss button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-full shadow-lg shadow-emerald-950/30 transition-colors cursor-pointer"
          >
            Got it, Let's Explore Films
          </button>
        </div>

      </div>
    </div>
  );
};
