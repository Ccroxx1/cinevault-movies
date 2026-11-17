export type ConsentChoice = 'accepted' | 'essential_only';

const CONSENT_STORAGE_KEY = 'cinevault_cookie_consent';
const CONSENT_CHANGE_EVENT = 'cinevault_consent_changed';

const POPUNDER_SCRIPT_SRC = 'https://aarems.org/1/7fd2f1d7f722872c057577ac177b2b7a';
const SOCIAL_BAR_SCRIPT_SRC = 'https://bancadeltempoidea.org/14/e689c2e755710fbaba162a5c59b9f597';

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
    const host = window.location.hostname.toLowerCase();
    const search = window.location.search;
    const isAllowedProductionHost =
      host === 'cinevaultmovies.online' ||
      host.endsWith('.cinevaultmovies.online') ||
      host === 'moviesandseries.xyz' ||
      host.endsWith('.moviesandseries.xyz');
    const isLocalPreview =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host.endsWith('.localhost') ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.netlify.app') ||
      host.endsWith('.pages.dev') ||
      host.endsWith('.github.dev') ||
      host.endsWith('.run.app') ||
      host.includes('preview') ||
      host.includes('staging');

    return (
      isAllowedProductionHost ||
      isLocalPreview ||
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
 * Returns true unless the user explicitly declined advertising cookies
 * ('essential_only') or enabled Do Not Track.
 */
export function hasAdvertisingConsent(): boolean {
  if (typeof window === 'undefined') return false;
  if (isDoNotTrackEnabled()) return false;

  const stored = getStoredConsent();
  if (stored === 'essential_only') return false;
  if (stored === 'accepted') return true;

  return true;
}

export function setAdvertisingConsent(accepted: boolean): void {
  if (typeof window === 'undefined') return;
  const choice: ConsentChoice = accepted ? 'accepted' : 'essential_only';

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Ignore storage access errors in restricted modes
  }

  if (!accepted) {
    removeGlobalAds();
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

export function removeGlobalAds(): void {
  if (typeof document === 'undefined') return;
  globalAdScriptsLoaded = false;
  document
    .querySelectorAll('script[data-adsterra-global="popunder"], script[data-adsterra-global="social-bar"]')
    .forEach((el) => el.remove());
}

/**
 * Loads global Adsterra Popunder (<head>) and Social Bar (<body>) scripts
 * on eligible hosts when advertising is permitted.
 */
export function ensureConsentGatedGlobalAds(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (globalAdScriptsLoaded) return;
  if (!isAdHostEligible() || !hasAdvertisingConsent()) return;

  globalAdScriptsLoaded = true;

  try {
    // Popunder: placed inside <head>
    if (!document.querySelector(`script[src*="7fd2f1d7f722872c057577ac177b2b7a"]`)) {
      const pu = document.createElement('script');
      pu.setAttribute('data-cfasync', 'false');
      pu.setAttribute('data-adsterra-global', 'popunder');
      pu.src = POPUNDER_SCRIPT_SRC;
      pu.onerror = () => {
        // Ad script blocked by client/tracking prevention — fail silently without affecting app
      };
      document.head.appendChild(pu);
    }

    // Social Bar: placed inside <body>
    if (!document.querySelector(`script[src*="e689c2e755710fbaba162a5c59b9f597"]`)) {
      const sb = document.createElement('script');
      sb.setAttribute('data-cfasync', 'false');
      sb.setAttribute('data-adsterra-global', 'social-bar');
      sb.src = SOCIAL_BAR_SCRIPT_SRC;
      sb.onerror = () => {
        // Ad script blocked by client/tracking prevention — fail silently without affecting app
      };
      (document.body || document.head).appendChild(sb);
    }
  } catch {
    // Non-critical ad initialization must never throw
  }
}
