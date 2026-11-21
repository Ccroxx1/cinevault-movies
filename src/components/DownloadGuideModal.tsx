import React, { useState } from 'react';
import { X, Server, Check, Copy } from 'lucide-react';
import { RECOMMENDED_TRACKERS } from '../types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface DownloadGuideModalProps {
  onClose: () => void;
  onCopyAllTrackers: () => void;
}

export const DownloadGuideModal: React.FC<DownloadGuideModalProps> = ({
  onClose,
  onCopyAllTrackers
}) => {
  useBodyScrollLock(true);
  const [copiedTrackers, setCopiedTrackers] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyTrackers = () => {
    const text = RECOMMENDED_TRACKERS.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedTrackers(true);
    setTimeout(() => setCopiedTrackers(false), 2000);
    onCopyAllTrackers();
  };

  return (
    <div
      className="fixed inset-0 z-60 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Download Guide"
    >
      <div className="modal-dialog-surface cv-surface-elevated border relative w-full max-w-2xl rounded-3xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b cv-border pb-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-display font-black cv-text">
                Magnet URIs &amp; Download Methods
              </h3>
              <p className="text-xs cv-text-muted">
                Direct magnet downloads, raw magnet URIs, debrid cloud tools, and .torrent files
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 cv-btn-secondary rounded-full transition-colors cursor-pointer"
            aria-label="Close guide"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3.5 text-sm cv-text-secondary">
          
          <div className="flex items-start gap-3.5 p-4 cv-card rounded-2xl border">
            <div className="w-7 h-7 rounded-full cv-badge-success border flex items-center justify-center font-bold text-xs shrink-0">
              1
            </div>
            <div>
              <div className="font-bold cv-text text-sm flex items-center gap-2">
                <span>Direct &quot;Magnet Download&quot; (One-Click Launch)</span>
              </div>
              <p className="text-xs cv-text-muted mt-1 leading-relaxed">
                Clicking the green <strong className="cv-text">&quot;Magnet Download&quot;</strong> button invokes your device's registered <code>magnet:</code> protocol handler directly, immediately opening your torrent client (e.g. <strong>qBittorrent</strong>, <strong>Transmission</strong>, <strong>LibreTorrent</strong>, or <strong>Flud</strong>) without needing to download separate files.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 cv-card rounded-2xl border">
            <div className="w-7 h-7 rounded-full cv-badge-success border flex items-center justify-center font-bold text-xs shrink-0">
              2
            </div>
            <div>
              <div className="font-bold cv-text text-sm flex items-center gap-2">
                <span>Raw Magnet URIs for Cloud &amp; Debrid Services</span>
              </div>
              <p className="text-xs cv-text-muted mt-1 leading-relaxed">
                Click <strong className="cv-text">&quot;Copy URI&quot;</strong> or <strong className="cv-text">&quot;URI Details&quot;</strong> to copy the complete raw URI string (<code>magnet:?xt=urn:btih:...</code>). You can paste this directly into cloud downloaders like <strong>Real-Debrid</strong>, <strong>Seedr.cc</strong>, <strong>Put.io</strong>, or <strong>Offcloud</strong> for high-speed cloud caching and direct streaming.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 cv-card rounded-2xl border">
            <div className="w-7 h-7 rounded-full cv-badge-success border flex items-center justify-center font-bold text-xs shrink-0">
              3
            </div>
            <div>
              <div className="font-bold cv-text text-sm">Direct .torrent Metadata Files</div>
              <p className="text-xs cv-text-muted mt-1 leading-relaxed">
                Click <strong className="cv-text">&quot;.Torrent&quot;</strong> to save the standard metadata file locally on your disk, useful for offline archiving or media servers like Plex/Jellyfin.
              </p>
            </div>
          </div>

        </div>

        {/* Recommended Trackers Box */}
        <div className="p-4 cv-card border rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold cv-text-secondary">
              <Server className="w-4 h-4" style={{ color: 'var(--cv-success-soft-fg)' }} />
              <span>Recommended Open BitTorrent Trackers ({RECOMMENDED_TRACKERS.length})</span>
            </div>

            <button
              onClick={handleCopyTrackers}
              className="flex items-center gap-1.5 text-xs cv-badge-success font-semibold px-3 py-1 rounded-full border transition-opacity hover:opacity-90 cursor-pointer"
            >
              {copiedTrackers ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied All Trackers</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All Trackers</span>
                </>
              )}
            </button>
          </div>

          <div className="p-2.5 cv-surface-muted rounded-xl font-mono text-[11px] cv-text-muted max-h-28 overflow-y-auto space-y-1 border cv-border-subtle">
            {RECOMMENDED_TRACKERS.map((t, idx) => (
              <div key={idx} className="truncate">{t}</div>
            ))}
          </div>
        </div>

        {/* Dismiss button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 cv-btn-magnet font-bold text-sm rounded-full shadow-lg transition-colors cursor-pointer"
          >
            Got it, Let's Explore Films
          </button>
        </div>

      </div>
    </div>
  );
};
