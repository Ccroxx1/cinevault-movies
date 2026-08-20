import React, { useState } from 'react';
import { X, HelpCircle, Download, Copy, Check, ShieldCheck, Terminal, HardDrive, Sparkles } from 'lucide-react';
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
            <div className="p-2.5 bg-rose-600/10 border border-rose-500/20 text-rose-500 rounded-xl">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-display font-black text-white">
                How to Browse & Download Films
              </h3>
              <p className="text-xs text-neutral-400">
                Guide to magnet links, .torrent files, and high-speed trackers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3.5 text-sm text-neutral-300">
          
          <div className="flex items-start gap-3.5 p-4 bg-[#050505] rounded-2xl border border-white/10">
            <div className="w-7 h-7 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              1
            </div>
            <div>
              <div className="font-bold text-white text-sm">Install a Modern Client</div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                To download films via peer-to-peer or magnet URIs, use a clean, ad-free client such as <strong>qBittorrent</strong>, <strong>Transmission</strong>, or <strong>LibreTorrent</strong> (Android).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 bg-[#050505] rounded-2xl border border-white/10">
            <div className="w-7 h-7 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              2
            </div>
            <div>
              <div className="font-bold text-white text-sm">One-Click Magnet Links</div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Click <strong>"Copy Magnet"</strong> on any movie card or detail view to instantly copy a magnet URI configured with the high-speed tracker list, or click the link icon to open your client directly.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 bg-[#050505] rounded-2xl border border-white/10">
            <div className="w-7 h-7 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              3
            </div>
            <div>
              <div className="font-bold text-white text-sm">Direct .torrent Files</div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Click <strong>"Download .torrent"</strong> in the movie file matrix to download the standard metadata file and drag it into your player or client.
              </p>
            </div>
          </div>

        </div>

        {/* Recommended Trackers Box */}
        <div className="p-4 bg-[#050505] border border-white/10 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300">
              <Terminal className="w-3.5 h-3.5 text-rose-500" />
              <span>Recommended Open BitTorrent Trackers ({RECOMMENDED_TRACKERS.length})</span>
            </div>

            <button
              onClick={handleCopyTrackers}
              className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1 bg-rose-600/10 rounded-full border border-rose-500/20 transition-colors cursor-pointer"
            >
              {copiedTrackers ? (
                <>
                  <Check className="w-3 h-3 text-rose-400" />
                  <span>Copied All Trackers</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-rose-400" />
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
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-full shadow-lg shadow-rose-900/30 transition-colors cursor-pointer"
          >
            Got it, Let's Explore Films
          </button>
        </div>

      </div>
    </div>
  );
};
