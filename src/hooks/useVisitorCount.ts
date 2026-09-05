import { useState, useEffect } from 'react';
import { recordVisitorVisit, VisitorCountData } from '../services/visitorTracker';

let cachedData: VisitorCountData | null = null;
let activePromise: Promise<VisitorCountData> | null = null;

/**
 * Hook to retrieve and subscribe to the actual visitor count.
 * Deduplicates in-flight requests across multiple component mounts.
 */
export function useVisitorCount() {
  const [data, setData] = useState<VisitorCountData | null>(cachedData);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedData);

  useEffect(() => {
    let isMounted = true;

    if (!activePromise) {
      activePromise = recordVisitorVisit().then((result) => {
        cachedData = result;
        return result;
      });
    }

    activePromise
      .then((result) => {
        if (isMounted) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    count: data?.count ?? null,
    totalVisits: data?.totalVisits ?? null,
    isNewVisitor: data?.isNewVisitor ?? false,
    visitorId: data?.visitorId,
    isLoading,
  };
}
