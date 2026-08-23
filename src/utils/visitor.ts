/**
 * Visitor Tracking Utility for CineVault By Sasuu
 * Handles unique visitor identification, persistent server synchronisation,
 * and reliable fallback persistence.
 */

const VISITOR_ID_KEY = 'cinevault_visitor_uuid';
const VISITOR_CACHE_COUNT_KEY = 'cinevault_last_visitor_count';
const SESSION_RECORDED_KEY = 'cinevault_session_hit_recorded';

export interface VisitorStatsResult {
  totalVisitors: number;
  todayVisitors: number;
  isNew?: boolean;
}

/**
 * Get or generate a persistent unique ID for this browser / visitor
 */
export function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      // Generate a crypto random unique identifier
      const randomPart = Math.random().toString(36).substring(2, 11);
      const timePart = Date.now().toString(36);
      id = `cv_${timePart}_${randomPart}`;
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon_guest_' + Math.floor(Math.random() * 100000);
  }
}

/**
 * Get cached count if available
 */
export function getCachedVisitorCount(): number {
  try {
    const cached = localStorage.getItem(VISITOR_CACHE_COUNT_KEY);
    if (cached) {
      const num = parseInt(cached, 10);
      if (!isNaN(num) && num >= 0) return num;
    }
  } catch {
    // Ignore storage issues
  }
  return 0; // Starts from 0 until real visitors are recorded
}

/**
 * Save cached count
 */
export function setCachedVisitorCount(count: number): void {
  try {
    if (typeof count === 'number' && count >= 0) {
      localStorage.setItem(VISITOR_CACHE_COUNT_KEY, count.toString());
    }
  } catch {
    // Ignore storage issues
  }
}

/**
 * Register visitor hit with the backend API
 * Only increments on server if it is genuinely a new unique visitor
 */
export async function trackVisitorHit(): Promise<VisitorStatsResult> {
  const visitorId = getOrCreateVisitorId();
  const alreadyHitThisSession = sessionStorage.getItem(SESSION_RECORDED_KEY);

  try {
    // If already recorded in this active tab session, just fetch latest stats without redundant hit
    const endpoint = alreadyHitThisSession ? '/api/visitors/stats' : '/api/visitors/hit';
    const method = alreadyHitThisSession ? 'GET' : 'POST';
    const body = alreadyHitThisSession ? undefined : JSON.stringify({ visitorId });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (typeof data.totalVisitors === 'number') {
        try {
          sessionStorage.setItem(SESSION_RECORDED_KEY, 'true');
        } catch {
          // ignore
        }
        setCachedVisitorCount(data.totalVisitors);
        return {
          totalVisitors: data.totalVisitors,
          todayVisitors: typeof data.todayVisitors === 'number' ? data.todayVisitors : 0,
          isNew: !!data.isNew
        };
      }
    }
  } catch (err) {
    console.warn('Visitor counter network sync deferred; using cached local store:', err);
  }

  // Graceful fallback to cached store starting from 0
  const cachedCount = getCachedVisitorCount();
  return {
    totalVisitors: cachedCount,
    todayVisitors: 0,
    isNew: false
  };
}
