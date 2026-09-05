import { useState, useEffect, useCallback } from 'react';
import { recordVisitorVisit, fetchVisitorCount, VisitorCountData } from '../services/visitorTracker';

let cachedData: VisitorCountData | null = null;
let activePromise: Promise<VisitorCountData> | null = null;
let lastFetchTime = 0;
const subscribers = new Set<(data: VisitorCountData) => void>();

function notifySubscribers(data: VisitorCountData) {
  cachedData = data;
  lastFetchTime = Date.now();
  subscribers.forEach((callback) => callback(data));
}

/**
 * Hook to retrieve and subscribe to the verified visitor count.
 * Features:
 * - Real-time polling every 60s
 * - Background tab refocus refresh
 * - Graceful handling of unavailable / error states (does not pretend to be 0)
 * - Module-level subscriber synchronization across all mounted badge instances
 */
export function useVisitorCount() {
  const [data, setData] = useState<VisitorCountData | null>(cachedData);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedData);

  const refreshCount = useCallback(async (isInitial = false) => {
    // Prevent spamming if refreshed within 10 seconds
    if (!isInitial && Date.now() - lastFetchTime < 10000) {
      return;
    }

    try {
      const result = isInitial
        ? await (activePromise || (activePromise = recordVisitorVisit().finally(() => { activePromise = null; })))
        : await fetchVisitorCount();

      notifySubscribers(result);
    } catch {
      if (!cachedData) {
        notifySubscribers({
          count: null,
          totalVisits: null,
          isUnavailable: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const listener = (fresh: VisitorCountData) => {
      if (isMounted) {
        setData(fresh);
        setIsLoading(false);
      }
    };
    subscribers.add(listener);

    // Initial record/fetch
    if (!cachedData) {
      refreshCount(true);
    } else {
      setIsLoading(false);
    }

    // Refresh count on tab refocus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshCount(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic refresh every 60 seconds
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshCount(false);
      }
    }, 60000);

    return () => {
      isMounted = false;
      subscribers.delete(listener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [refreshCount]);

  return {
    count: data?.count ?? null,
    totalVisits: data?.totalVisits ?? null,
    isNewVisitor: data?.isNewVisitor ?? false,
    isNewSession: data?.isNewSession ?? false,
    isUnavailable: Boolean(data?.isUnavailable || (data?.count === null && !isLoading)),
    source: data?.source,
    lastUpdated: data?.lastUpdated,
    isLoading,
    refresh: () => refreshCount(false),
  };
}
