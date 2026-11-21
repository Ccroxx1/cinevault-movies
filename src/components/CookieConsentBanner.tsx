import React, { useState, useEffect } from 'react';
import {
  getStoredConsent,
  hasCookieHubMarketingConsent,
  setAdvertisingConsent,
  ensureConsentGatedGlobalAds
} from '../utils/consent';

interface CookieConsentBannerProps {
  onOpenPrivacy: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenPrivacy }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored === 'accepted') {
      ensureConsentGatedGlobalAds();
      return;
    }
    if (stored === 'essential_only') {
      return;
    }

    // Wait briefly for CookieHub on production; if CookieHub hasn't resolved or was blocked,
    // show the resilient first-party consent banner.
    const timer = setTimeout(() => {
      const chConsent = hasCookieHubMarketingConsent();
      if (chConsent === true) {
        setAdvertisingConsent(true);
        ensureConsentGatedGlobalAds();
        return;
      }
      if (!getStoredConsent()) {
        setIsVisible(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    setAdvertisingConsent(true);
    ensureConsentGatedGlobalAds();
    setIsVisible(false);
  };

  const handleDecline = () => {
    setAdvertisingConsent(false);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie and Privacy Consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 cv-surface-elevated border backdrop-blur-xl p-4 sm:p-5 rounded-2xl animate-slideUp"
    >
      <div className="flex items-start gap-3">
        <div className="space-y-2 flex-1">
          <h4 className="text-xs sm:text-sm font-bold cv-text flex items-center justify-between">
            <span>Cookie & Privacy Consent</span>
            <button
              type="button"
              onClick={handleDecline}
              className="cv-text-muted hover:text-[var(--cv-text)] p-1 text-xs font-medium cursor-pointer rounded-md hover:bg-[var(--cv-surface-muted)] transition-colors"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </h4>
          <p className="text-[11px] cv-text-secondary leading-relaxed">
            We use essential storage to maintain your watchlist and preferences. Optional advertising cookies are only enabled if you accept.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleAccept}
              className="cv-btn-primary px-3.5 py-1.5 font-bold text-xs rounded-lg transition-colors shadow-md cursor-pointer"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="cv-btn-secondary px-3 py-1.5 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="text-[11px] cv-text-muted hover:text-[var(--cv-accent-text)] underline transition-colors ml-auto cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
