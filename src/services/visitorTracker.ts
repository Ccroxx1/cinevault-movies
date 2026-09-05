export interface VisitorCountData {
  count: number;
  totalVisits: number;
  isNewVisitor?: boolean;
  visitorId?: string;
}

const VISITOR_STORAGE_KEY = 'cinevault_visitor_id';
const SESSION_STORAGE_KEY = 'cv_session_counted';

/**
 * Returns or generates a persistent, unique client visitor identifier.
 * Format: cv_<timestamp>_<random>
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return '';

  try {
    let id = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!id || !/^cv_[a-zA-Z0-9_-]{8,64}$/.test(id)) {
      const entropy = Math.random().toString(36).substring(2, 10);
      const timeTag = Date.now().toString(36);
      id = `cv_${timeTag}_${entropy}`;
      localStorage.setItem(VISITOR_STORAGE_KEY, id);
    }
    return id;
  } catch {
    // If localStorage is blocked by browser privacy modes
    return `cv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
  }
}

/**
 * Records an actual visitor visit with the backend.
 * Uses sessionStorage to accurately record unique sessions vs unique visitors.
 * Strictly actual verified visits - zero simulated counts.
 */
export async function recordVisitorVisit(): Promise<VisitorCountData> {
  const visitorId = getOrCreateVisitorId();
  let isNewSession = true;

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      isNewSession = !sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (isNewSession) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, '1');
      }
    }
  } catch {
    isNewSession = false;
  }

  try {
    const res = await fetch('/api/visitors/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visitorId,
        isNewSession,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.count === 'number') {
        return {
          count: data.count,
          totalVisits: data.totalVisits ?? data.count,
          isNewVisitor: Boolean(data.isNewVisitor),
          visitorId: data.visitorId || visitorId,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to record actual visitor:', err);
  }

  // Graceful fallback to read-only count query if record fails
  return fetchVisitorCount();
}

/**
 * Fetches the current actual visitor count without recording a new visit.
 */
export async function fetchVisitorCount(): Promise<VisitorCountData> {
  try {
    const res = await fetch('/api/visitors/count');
    if (res.ok) {
      const data = await res.json();
      if (typeof data.count === 'number') {
        return {
          count: data.count,
          totalVisits: data.totalVisits ?? data.count,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to fetch actual visitor count:', err);
  }

  return {
    count: 0,
    totalVisits: 0,
  };
}
