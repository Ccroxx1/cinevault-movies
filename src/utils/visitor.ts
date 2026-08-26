/**
 * Visitor Tracking Utility for CineVault By Sasuu
 * Handles unique visitor identification, persistent server synchronisation,
 * and reliable local caching without third-party counters.
 */

const VISITOR_ID_KEY = 'cinevault_visitor_uuid';
const VISITOR_CACHE_TOTAL_KEY = 'cinevault_last_visitor_count';
const VISITOR_CACHE_TODAY_KEY = 'cinevault_today_visitor_count';
const VISITOR_LAST_HIT_DATE_KEY = 'cinevault_last_hit_date';
const SESSION_RECORDED_KEY = 'cinevault_session_hit_recorded';

export interface VisitorStatsResult {
  totalVisitors: number;
  todayVisitors: number;
  isNew?: boolean;
  source?: 'cloud_redis' | 'local_fallback';
}

/**
 * Get or generate a persistent unique anonymous ID for this browser / visitor.
 * Uses crypto.randomUUID() when available.
 */
export function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        id = `cv_${crypto.randomUUID()}`;
      } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        id = `cv_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
      } else {
        id = `cv_${Date.now().toString(36)}_${(Date.now() ^ 0x5f3759df).toString(36)}`;
      }
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return 'cv_anon_visitor';
  }
}

/**
 * Get cached visitor count if available
 */
export function getCachedVisitorCount(): number {
  try {
    const cached = localStorage.getItem(VISITOR_CACHE_TOTAL_KEY);
    if (cached) {
      const num = parseInt(cached, 10);
      if (!isNaN(num) && num >= 0) return num;
    }
  } catch {
    // Ignore storage issues
  }
  return 0;
}

/**
 * Get cached today visitor count if available
 */
export function getCachedTodayVisitorCount(): number {
  try {
    const todayUtc = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem(VISITOR_LAST_HIT_DATE_KEY);
    if (lastDate === todayUtc) {
      const cached = localStorage.getItem(VISITOR_CACHE_TODAY_KEY);
      if (cached) {
        const num = parseInt(cached, 10);
        if (!isNaN(num) && num >= 0) return num;
      }
    }
  } catch {
    // Ignore storage issues
  }
  return 0;
}

/**
 * Save cached count to localStorage
 */
export function setCachedVisitorCount(total: number, todayCount?: number): void {
  try {
    const todayUtc = new Date().toISOString().split('T')[0];
    if (typeof total === 'number' && total >= 0) {
      localStorage.setItem(VISITOR_CACHE_TOTAL_KEY, total.toString());
    }
    if (typeof todayCount === 'number' && todayCount >= 0) {
      localStorage.setItem(VISITOR_CACHE_TODAY_KEY, todayCount.toString());
      localStorage.setItem(VISITOR_LAST_HIT_DATE_KEY, todayUtc);
    }
  } catch {
    // Ignore storage issues
  }
}

/**
 * Register visitor hit with the CineVault backend API.
 * Automatically deduplicates sessions and handles serverless / local fallbacks.
 */
export async function trackVisitorHit(): Promise<VisitorStatsResult> {
  const visitorId = getOrCreateVisitorId();
  const todayUtc = new Date().toISOString().split('T')[0];
  const lastRecordedDate = localStorage.getItem(VISITOR_LAST_HIT_DATE_KEY);
  const sessionRecorded = sessionStorage.getItem(SESSION_RECORDED_KEY);
  
  const isNewDailyVisit = lastRecordedDate !== todayUtc;
  const isNewSession = !sessionRecorded;
  const shouldIncrement = isNewDailyVisit || isNewSession;

  try {
    const endpoint = shouldIncrement ? '/api/visitors/hit' : '/api/visitors/stats';
    const method = shouldIncrement ? 'POST' : 'GET';
    const body = shouldIncrement ? JSON.stringify({ visitorId }) : undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

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

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (typeof data.totalVisitors === 'number') {
        try {
          sessionStorage.setItem(SESSION_RECORDED_KEY, 'true');
          localStorage.setItem(VISITOR_LAST_HIT_DATE_KEY, todayUtc);
        } catch {
          // ignore storage error
        }

        const rawTotal = data.totalVisitors;
        const todayCount = typeof data.todayVisitors === 'number' ? data.todayVisitors : 0;
        const total = Math.max(rawTotal, todayCount);
        setCachedVisitorCount(total, todayCount);

        return {
          totalVisitors: total,
          todayVisitors: todayCount,
          isNew: !!data.isNew,
          source: data.source
        };
      }
    }
  } catch (err) {
    // API endpoint temporarily unreachable or aborted
  }

  // Graceful fallback: return last known valid statistics from local storage
  const cachedTotal = getCachedVisitorCount();
  const cachedToday = getCachedTodayVisitorCount();

  return {
    totalVisitors: cachedTotal,
    todayVisitors: cachedToday,
    isNew: false,
    source: 'local_fallback'
  };
}
