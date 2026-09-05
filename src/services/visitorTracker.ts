export interface VisitorCountData {
  count: number | null;
  totalVisits: number | null;
  isNewVisitor?: boolean;
  isNewSession?: boolean;
  source?: string;
  lastUpdated?: number;
  isUnavailable?: boolean;
}

const SESSION_RECORDED_KEY = 'cv_session_verified_at';

/**
 * Records an actual visitor visit with the backend.
 * Zero client-supplied IDs or fake numbers - the server authenticates
 * and mints a cryptographically signed HttpOnly cookie.
 * Marks the browser session as verified ONLY after a 200 OK response.
 */
export async function recordVisitorVisit(): Promise<VisitorCountData> {
  try {
    const res = await fetch('/api/visitors/record', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      // Note: credentials 'same-origin' or 'include' is default for modern fetch on same origin
      credentials: 'same-origin',
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.count === 'number') {
        // Mark session as recorded only on success
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.setItem(SESSION_RECORDED_KEY, String(Date.now()));
          }
        } catch {
          // Ignore private browsing restrictions
        }

        return {
          count: data.count,
          totalVisits: data.totalVisits ?? data.count,
          isNewVisitor: Boolean(data.isNewVisitor),
          isNewSession: Boolean(data.isNewSession),
          source: data.source || 'redis-atomic',
          lastUpdated: data.timestamp || Date.now(),
          isUnavailable: false,
        };
      }
    } else if (res.status === 429 || res.status === 403) {
      // Rate limited or crawler response - read-only query fallback
      return fetchVisitorCount();
    }
  } catch (err) {
    console.warn('Visitor record request failed:', err);
  }

  // Gracefully fallback to read-only count query if record fails
  return fetchVisitorCount();
}

/**
 * Fetches the current actual visitor count without modifying session state.
 */
export async function fetchVisitorCount(): Promise<VisitorCountData> {
  try {
    const res = await fetch('/api/visitors/count', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.count === 'number') {
        return {
          count: data.count,
          totalVisits: data.totalVisits ?? data.count,
          source: data.source || 'redis-atomic',
          lastUpdated: data.timestamp || Date.now(),
          isUnavailable: false,
        };
      }
    }
  } catch (err) {
    console.warn('Visitor count query failed:', err);
  }

  return {
    count: null,
    totalVisits: null,
    isUnavailable: true,
  };
}
