import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'nav' | 'drawer' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'nav',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide
  if (isInstalled) {
    return null;
  }

  // Not installable on standard browser unless beforeinstallprompt fired or iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      await install();
    }
  };

  return (
    <>
      <button
        id="pwa-install-btn"
        type="button"
        onClick={handleInstallClick}
        aria-label="Install CineVault App"
        title="Install CineVault as a desktop or mobile application"
        className={
          className ||
          (variant === 'drawer'
            ? 'w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-950/30 transition-all cursor-pointer'
            : 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-semibold transition-all cursor-pointer')
        }
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#0e0e0e] border border-white/15 p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center font-black text-white text-sm shadow-md">
                CV
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install CineVault</h3>
                <p className="text-xs text-neutral-400">Add to iPhone or iPad Home Screen</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs text-neutral-300 leading-relaxed">
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10">
                <Share className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>
                  1. Tap the <strong className="text-white">Share</strong> icon in your Safari bottom navigation bar.
                </p>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10">
                <PlusSquare className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>
                  2. Scroll down and choose <strong className="text-white">Add to Home Screen</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
