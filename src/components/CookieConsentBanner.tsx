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
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#121212]/95 border border-white/15 backdrop-blur-xl p-4 sm:p-5 rounded-2xl shadow-2xl animate-slideUp">
      <div className="flex items-start gap-3">
        <div className="space-y-2 flex-1">
          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center justify-between">
            <span>Cookie & Privacy Consent</span>
            <button
              onClick={handleDecline}
              className="text-neutral-400 hover:text-white p-1"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </h4>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            We use essential storage to maintain your watchlist and preferences. Optional advertising cookies are only enabled if you accept.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleAccept}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-colors shadow-md shadow-rose-900/30"
            >
              Accept All
            </button>
            <button
              onClick={handleDecline}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-neutral-300 font-semibold text-xs rounded-lg transition-colors"
            >
              Essential Only
            </button>
            <button
              onClick={onOpenPrivacy}
              className="text-[11px] text-neutral-400 hover:text-rose-400 underline transition-colors ml-auto"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
