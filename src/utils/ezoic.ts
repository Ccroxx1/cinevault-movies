import { hasAdvertisingConsent, isAdHostEligible } from './consent';

declare global {
  interface Window {
    ezstandalone?: {
      cmd?: Array<() => void>;
      showAds?: (...args: any[]) => void;
      define?: (...args: any[]) => void;
      refresh?: () => void;
      destroyPlaceholders?: () => void;
      [key: string]: any;
    };
  }
}

let lastRefreshTimestamp = 0;
const REFRESH_COOLDOWN_MS = 1000;

/**
 * Checks if the current browser environment is on the authorized production domain
 * or running in explicit debug mode, AND has user advertising consent.
 */
export function isEzoicEligible(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const host = window.location.hostname.toLowerCase();
    const isDebug =
      window.location.search.includes('ez_js_debugger=1') ||
      window.location.search.includes('force_ezoic=1');
    const isEligibleHost =
      host === 'cinevaultmovies.online' ||
      host.endsWith('.cinevaultmovies.online') ||
      host === 'moviesandseries.xyz' ||
      host.endsWith('.moviesandseries.xyz') ||
      isDebug;

    if (!isEligibleHost || !isAdHostEligible()) return false;
    return hasAdvertisingConsent();
  } catch {
    return false;
  }
}

/**
 * Checks whether actual Ezoic placeholder containers exist in the DOM.
 * Prevents firing empty ezstandalone.showAds() calls that trigger unneeded
 * g.ezoic.net/sa.go requests and third-party storage errors.
 */
function hasEzoicPlaceholders(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('[id^="ezoic-pub-ad-placeholder-"]'));
}

/**
 * Trigger Ezoic standalone ad rendering only when consented and placeholders exist.
 */
export function showEzoicAds(options?: any) {
  if (typeof window === 'undefined') return;
  if (!isEzoicEligible()) return;
  if (!hasEzoicPlaceholders() && !options) return;

  try {
    if (typeof window.ezstandalone?.showAds !== 'function') return;
    window.ezstandalone.cmd = window.ezstandalone.cmd || [];
    window.ezstandalone.cmd.push(function () {
      try {
        if (typeof window.ezstandalone?.showAds === 'function') {
          if (options !== undefined) {
            window.ezstandalone.showAds(options);
          } else {
            window.ezstandalone.showAds();
          }
        }
      } catch {
        // Ad errors must never propagate to React
      }
    });
  } catch {
    // Non-critical
  }
}

/**
 * Refresh Ezoic ads when changing routes / pages dynamically in SPA,
 * strictly gated by consent, active placeholders, and cooldown deduplication.
 */
export function refreshEzoicAds() {
  if (typeof window === 'undefined') return;
  if (!isEzoicEligible()) return;
  if (!hasEzoicPlaceholders()) return;

  const now = Date.now();
  if (now - lastRefreshTimestamp < REFRESH_COOLDOWN_MS) return;
  lastRefreshTimestamp = now;

  try {
    if (typeof window.ezstandalone?.showAds !== 'function') return;
    window.ezstandalone.cmd = window.ezstandalone.cmd || [];
    window.ezstandalone.cmd.push(() => {
      try {
        if (typeof window.ezstandalone?.showAds === 'function') {
          window.ezstandalone.showAds();
        }
      } catch {
        // Non-critical
      }
    });
  } catch {
    // Non-critical
  }
}
