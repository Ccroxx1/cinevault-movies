export type ConsentChoice = 'accepted' | 'essential_only';

const CONSENT_STORAGE_KEY = 'cinevault_cookie_consent';
const CONSENT_CHANGE_EVENT = 'cinevault_consent_changed';

declare global {
  interface Window {
    cookiehub?: {
      load?: (config?: Record<string, any>) => void;
      hasConsented?: (category: string) => boolean;
      openSettings?: () => void;
      [key: string]: any;
    };
  }
}

export function isAdHostEligible(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const host = window.location.hostname;
    const search = window.location.search;
    return (
      host === 'cinevaultmovies.online' ||
      host.endsWith('.cinevaultmovies.online') ||
      search.includes('force_ads=1') ||
      search.includes('force_adsterra=1') ||
      search.includes('force_ezoic=1') ||
      search.includes('ez_js_debugger=1')
    );
  } catch {
    return false;
  }
}

export function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const dnt =
    navigator.doNotTrack ||
    (window as any).doNotTrack ||
    (navigator as any).msDoNotTrack;
  return dnt === '1' || dnt === 'yes';
}

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw === 'accepted' || raw === 'essential_only') {
      return raw;
    }
  } catch {
    // Ignore storage access restrictions (e.g. strict InPrivate mode)
  }
  return null;
}

export function hasCookieHubMarketingConsent(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    if (window.cookiehub && typeof window.cookiehub.hasConsented === 'function') {
      return Boolean(window.cookiehub.hasConsented('marketing'));
    }
  } catch {
    // CookieHub unavailable or blocked
  }
  return null;
}

/**
 * Returns true ONLY when the user has explicitly granted advertising consent
 * (via CookieHub marketing category or first-party consent banner) and DNT is not active.
 */
export function hasAdvertisingConsent(): boolean {
  if (typeof window === 'undefined') return false;
  if (isDoNotTrackEnabled()) return false;

  const stored = getStoredConsent();
  if (stored === 'essential_only') return false;

  const chConsent = hasCookieHubMarketingConsent();
  if (chConsent !== null) {
    return chConsent;
  }

  return stored === 'accepted';
}

export function setAdvertisingConsent(accepted: boolean): void {
  if (typeof window === 'undefined') return;
  const choice: ConsentChoice = accepted ? 'accepted' : 'essential_only';

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Ignore storage access errors in restricted modes
  }

  try {
    window.dispatchEvent(
      new CustomEvent(CONSENT_CHANGE_EVENT, { detail: { choice, accepted } })
    );
  } catch {
    // Ignore CustomEvent failure
  }
}

export function onConsentChange(callback: (accepted: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    callback(hasAdvertisingConsent());
  };

  window.addEventListener(CONSENT_CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

let globalAdScriptsLoaded = false;

/**
 * Loads global non-slot Adsterra scripts ONLY after explicit consent on eligible hosts.
 */
export function ensureConsentGatedGlobalAds(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (globalAdScriptsLoaded) return;
  if (!isAdHostEligible() || !hasAdvertisingConsent()) return;

  globalAdScriptsLoaded = true;

  try {
    if (!document.querySelector('script[src*="0626bb7ebab6d2671706e9b94ba2b96f.js"]')) {
      const sb = document.createElement('script');
      sb.async = true;
      sb.setAttribute('data-cfasync', 'false');
      sb.src = 'https://pl31437221.profitableratecpmnetwork.com/06/26/bb/0626bb7ebab6d2671706e9b94ba2b96f.js';
      sb.onerror = () => {
        // Ad script blocked by client/tracking prevention — fail silently without affecting app
      };
      document.head.appendChild(sb);
    }

    if (!document.querySelector('script[src*="145a579d83e9caaf18d1d1f81ab75ab8.js"]')) {
      const pu = document.createElement('script');
      pu.async = true;
      pu.setAttribute('data-cfasync', 'false');
      pu.src = 'https://eagerdazzle.com/14/5a/57/145a579d83e9caaf18d1d1f81ab75ab8.js';
      pu.onerror = () => {
        // Ad script blocked by client/tracking prevention — fail silently without affecting app
      };
      document.head.appendChild(pu);
    }
  } catch {
    // Non-critical ad initialization must never throw
  }
}
