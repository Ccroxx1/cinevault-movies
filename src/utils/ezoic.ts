declare global {
  interface Window {
    ezstandalone?: {
      cmd?: Array<() => void>;
      showAds?: (options?: any) => void;
      define?: (...args: any[]) => void;
      refresh?: () => void;
      destroyPlaceholders?: () => void;
      [key: string]: any;
    };
  }
}

/**
 * Checks if the current browser environment is on the authorized production domain
 * or running in explicit debug mode.
 */
export function isEzoicEligible(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const host = window.location.hostname;
    return (
      host === 'cinevaultmovies.online' ||
      host.endsWith('.cinevaultmovies.online') ||
      window.location.search.includes('ez_js_debugger=1') ||
      window.location.search.includes('force_ezoic=1')
    );
  } catch {
    return false;
  }
}

/**
 * Trigger Ezoic standalone ad rendering on authorized domains
 */
export function showEzoicAds(options?: any) {
  if (typeof window === 'undefined') return;
  if (!isEzoicEligible()) {
    return;
  }

  try {
    window.ezstandalone = window.ezstandalone || { cmd: [] };
    window.ezstandalone.cmd = window.ezstandalone.cmd || [];
    window.ezstandalone.cmd.push(() => {
      try {
        if (typeof window.ezstandalone?.showAds === 'function') {
          if (options && Object.keys(options).length > 0) {
            window.ezstandalone.showAds(options);
          } else {
            window.ezstandalone.showAds({});
          }
        }
      } catch (innerErr) {
        console.debug('Ezoic showAds execution notice:', innerErr);
      }
    });
  } catch (err) {
    console.debug('Ezoic showAds registration notice:', err);
  }
}

/**
 * Refresh Ezoic ads when changing routes / pages dynamically in SPA
 */
export function refreshEzoicAds() {
  if (typeof window === 'undefined') return;
  if (!isEzoicEligible()) {
    return;
  }

  try {
    window.ezstandalone = window.ezstandalone || { cmd: [] };
    window.ezstandalone.cmd = window.ezstandalone.cmd || [];
    window.ezstandalone.cmd.push(() => {
      try {
        if (typeof window.ezstandalone?.showAds === 'function') {
          window.ezstandalone.showAds();
        }
      } catch (innerErr) {
        console.debug('Ezoic dynamic refresh execution notice:', innerErr);
      }
    });
  } catch (err) {
    console.debug('Ezoic dynamic refresh notice:', err);
  }
}
