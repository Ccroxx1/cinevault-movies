/**
 * Visitor Tracking Utility for CineVault By Sasuu
 * Handles unique visitor identification, persistent server synchronisation,
 * multi-tier cloud fallbacks, and reliable local caching.
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
}

/**
 * Get or generate a persistent unique ID for this browser / visitor
 */
export function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
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
 * Get cached visitor count if available
 */
export function getCachedVisitorCount(): number {
  try {
    const cached = localStorage.getItem(VISITOR_CACHE_TOTAL_KEY);
    if (cached) {
      const num = parseInt(cached, 10);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch {
    // Ignore storage issues
  }
  return 1;
}

/**
 * Get cached today visitor count if available
 */
export function getCachedTodayVisitorCount(): number {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem(VISITOR_LAST_HIT_DATE_KEY);
    if (lastDate === today) {
      const cached = localStorage.getItem(VISITOR_CACHE_TODAY_KEY);
      if (cached) {
        const num = parseInt(cached, 10);
        if (!isNaN(num) && num > 0) return num;
      }
    }
  } catch {
    // Ignore storage issues
  }
  return 1;
}

/**
 * Save cached count
 */
export function setCachedVisitorCount(total: number, todayCount?: number): void {
  try {
    const today = new Date().toISOString().split('T')[0];
    if (typeof total === 'number' && total > 0) {
      localStorage.setItem(VISITOR_CACHE_TOTAL_KEY, total.toString());
    }
    if (typeof todayCount === 'number' && todayCount > 0) {
      localStorage.setItem(VISITOR_CACHE_TODAY_KEY, todayCount.toString());
      localStorage.setItem(VISITOR_LAST_HIT_DATE_KEY, today);
    }
  } catch {
    // Ignore storage issues
  }
}

/**
 * Fetch from Global Cloud Hit Counter Service
 */
async function fetchGlobalCloudCounter(isNewHit: boolean): Promise<VisitorStatsResult | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    // If isNewHit is true, we record hits on the global endpoints
    const allUrl = 'https://hits.dwyl.com/sasuu/cinevault-all.json';
    const todayUrl = `https://hits.dwyl.com/sasuu/cinevault-${today}.json`;

    const [allRes, todayRes] = await Promise.all([
      fetch(allUrl, { signal: controller.signal }),
      fetch(todayUrl, { signal: controller.signal })
    ]);

    clearTimeout(timer);

    if (allRes.ok) {
      const allJson = await allRes.json();
      const totalCount = parseInt(allJson?.message || '0', 10);

      let todayCount = 1;
      if (todayRes.ok) {
        try {
          const todayJson = await todayRes.json();
          todayCount = parseInt(todayJson?.message || '1', 10) || 1;
        } catch {
          todayCount = Math.max(1, Math.min(totalCount, 12));
        }
      }

      if (totalCount > 0) {
        setCachedVisitorCount(totalCount, todayCount);
        return {
          totalVisitors: totalCount,
          todayVisitors: todayCount,
          isNew: isNewHit
        };
      }
    }
  } catch (err) {
    console.warn('Global cloud counter request note:', err);
  }
  return null;
}

/**
 * Register visitor hit with the backend API / Cloud Counter
 * Automatically deduplicates sessions and handles serverless / static CDN fallbacks
 */
export async function trackVisitorHit(): Promise<VisitorStatsResult> {
  const visitorId = getOrCreateVisitorId();
  const today = new Date().toISOString().split('T')[0];
  const lastRecordedDate = localStorage.getItem(VISITOR_LAST_HIT_DATE_KEY);
  const sessionRecorded = sessionStorage.getItem(SESSION_RECORDED_KEY);
  
  const isNewDailyVisit = lastRecordedDate !== today;
  const isNewSession = !sessionRecorded;
  const shouldIncrement = isNewDailyVisit || isNewSession;

  // 1. Try local server API first
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
      if (typeof data.totalVisitors === 'number' && data.totalVisitors > 0) {
        try {
          sessionStorage.setItem(SESSION_RECORDED_KEY, 'true');
          localStorage.setItem(VISITOR_LAST_HIT_DATE_KEY, today);
        } catch {
          // ignore
        }
        const todayCount = typeof data.todayVisitors === 'number' ? data.todayVisitors : 1;
        setCachedVisitorCount(data.totalVisitors, todayCount);
        return {
          totalVisitors: data.totalVisitors,
          todayVisitors: todayCount,
          isNew: !!data.isNew
        };
      }
    }
  } catch (err) {
    // API endpoint unreachable or non-JSON returned (e.g. static hosting on Vercel)
  }

  // 2. Multi-tier fallback: Global Cloud Counter
  const cloudResult = await fetchGlobalCloudCounter(shouldIncrement);
  if (cloudResult && cloudResult.totalVisitors > 0) {
    try {
      sessionStorage.setItem(SESSION_RECORDED_KEY, 'true');
      localStorage.setItem(VISITOR_LAST_HIT_DATE_KEY, today);
    } catch {
      // ignore
    }
    return cloudResult;
  }

  // 3. Graceful fallback to cached store
  const cachedTotal = getCachedVisitorCount();
  const cachedToday = getCachedTodayVisitorCount();
  return {
    totalVisitors: Math.max(1, cachedTotal),
    todayVisitors: Math.max(1, cachedToday),
    isNew: false
  };
}
