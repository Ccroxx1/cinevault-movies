import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'nav' | 'drawer' | 'banner' | 'menu';
  onAfterClick?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'nav',
  onAfterClick,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showGenericGuide, setShowGenericGuide] = useState(false);

  // If already running as an installed PWA
  if (isInstalled) {
    if (variant === 'menu') {
      return (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs cv-text-muted select-none">
          <div className="cv-badge-success border w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold" style={{ color: 'var(--cv-success-soft-fg)' }}>App Installed</div>
            <div className="text-[10px] cv-text-subtle">Standalone CineVault Active</div>
          </div>
        </div>
      );
    }
    return null;
  }

  // If not installable and not iOS
  if (!isInstallable && !isIOS) {
    if (variant === 'menu') {
      return (
        <>
          <button
            id="pwa-install-btn"
            type="button"
            onClick={() => {
              setShowGenericGuide(true);
              onAfterClick?.();
            }}
            aria-label="Install CineVault App"
            title="Install CineVault as desktop application"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left cv-text-secondary hover:text-[var(--cv-text)] hover:bg-[var(--cv-surface-muted)] transition-colors cursor-pointer group"
          >
            <div className="cv-nav-soft-active w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0">
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">Install App</div>
              <div className="text-[10px] cv-text-muted">Desktop & Mobile PWA</div>
            </div>
          </button>

          {showGenericGuide && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200"
              style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
              role="dialog"
              aria-modal="true"
              aria-label="Install CineVault"
            >
              <div className="modal-dialog-surface relative w-full max-w-sm rounded-2xl cv-surface-elevated border p-6 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowGenericGuide(false)}
                  className="absolute top-4 right-4 cv-text-muted hover:text-[var(--cv-text)] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl cv-btn-primary flex items-center justify-center font-black text-sm shadow-md">
                    CV
                  </div>
                  <div>
                    <h3 className="text-base font-bold cv-text">Install CineVault</h3>
                    <p className="text-xs cv-text-muted">Run as standalone application</p>
                  </div>
                </div>
                <p className="text-xs cv-text-secondary leading-relaxed">
                  To install CineVault directly on your device, look for the <strong className="cv-text">Install</strong> icon in your browser URL address bar, or open your browser menu and choose <strong className="cv-text">Install CineVault</strong> or <strong className="cv-text">Add to Home Screen</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowGenericGuide(false)}
                  className="cv-btn-primary w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </div>
          )}
        </>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      await install();
    }
    onAfterClick?.();
  };

  if (variant === 'menu') {
    return (
      <>
        <button
          id="pwa-install-btn"
          type="button"
          onClick={handleInstallClick}
          aria-label="Install CineVault App"
          title="Install CineVault as a desktop or mobile application"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left cv-text-secondary hover:text-[var(--cv-text)] hover:bg-[var(--cv-surface-muted)] transition-colors cursor-pointer group"
        >
          <div className="cv-nav-soft-active w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0">
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold">Install App</div>
            <div className="text-[10px] cv-text-muted">Desktop & Mobile PWA</div>
          </div>
        </button>

        {/* iOS Safari Guide Modal */}
        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200"
            style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Install CineVault"
          >
            <div className="modal-dialog-surface relative w-full max-w-sm rounded-2xl cv-surface-elevated border p-6 space-y-4">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 cv-text-muted hover:text-[var(--cv-text)] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl cv-btn-primary flex items-center justify-center font-black text-sm shadow-md">
                  CV
                </div>
                <div>
                  <h3 className="text-base font-bold cv-text">Install CineVault</h3>
                  <p className="text-xs cv-text-muted">Add to iPhone or iPad Home Screen</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs cv-text-secondary leading-relaxed">
                <div className="flex items-start gap-3 p-2.5 rounded-lg cv-surface-muted border">
                  <Share className="w-4 h-4 cv-text-accent shrink-0 mt-0.5" aria-hidden="true" />
                  <p>
                    1. Tap the <strong className="cv-text">Share</strong> icon in your Safari bottom navigation bar.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg cv-surface-muted border">
                  <PlusSquare className="w-4 h-4 cv-text-accent shrink-0 mt-0.5" aria-hidden="true" />
                  <p>
                    2. Scroll down and choose <strong className="cv-text">Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="cv-btn-primary w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

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
            ? 'cv-btn-primary w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer'
            : 'cv-nav-soft-active flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer')
        }
      >
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Install App</span>
      </button>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200"
          style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Install CineVault"
        >
          <div className="modal-dialog-surface relative w-full max-w-sm rounded-2xl cv-surface-elevated border p-6 space-y-4">
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 cv-text-muted hover:text-[var(--cv-text)] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl cv-btn-primary flex items-center justify-center font-black text-sm shadow-md">
                CV
              </div>
              <div>
                <h3 className="text-base font-bold cv-text">Install CineVault</h3>
                <p className="text-xs cv-text-muted">Add to iPhone or iPad Home Screen</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs cv-text-secondary leading-relaxed">
              <div className="flex items-start gap-3 p-2.5 rounded-lg cv-surface-muted border">
                <Share className="w-4 h-4 cv-text-accent shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  1. Tap the <strong className="cv-text">Share</strong> icon in your Safari bottom navigation bar.
                </p>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-lg cv-surface-muted border">
                <PlusSquare className="w-4 h-4 cv-text-accent shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  2. Scroll down and choose <strong className="cv-text">Add to Home Screen</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="cv-btn-primary w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
