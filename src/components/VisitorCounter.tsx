import React, { useEffect, useState } from 'react';
import { trackVisitorHit, getCachedVisitorCount, getCachedTodayVisitorCount } from '../utils/visitor';

interface VisitorCounterProps {
  className?: string;
}

export const VisitorCounter: React.FC<VisitorCounterProps> = ({
  className = ''
}) => {
  const [totalVisitors, setTotalVisitors] = useState<number>(() => getCachedVisitorCount());
  const [todayVisitors, setTodayVisitors] = useState<number>(() => getCachedTodayVisitorCount());
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function recordVisit() {
      try {
        const stats = await trackVisitorHit();
        if (isMounted) {
          if (typeof stats.totalVisitors === 'number') {
            setTotalVisitors(stats.totalVisitors);
          }
          if (typeof stats.todayVisitors === 'number') {
            setTodayVisitors(stats.todayVisitors);
          }
          setIsLoaded(true);
        }
      } catch {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    }

    recordVisit();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      id="cinevault-visitor-counter"
      className={`inline-flex items-center gap-2 text-xs text-neutral-400 font-normal select-none px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 ${className}`}
      title={`CineVault By Sasuu — Total Visitors: ${totalVisitors.toLocaleString('en-US')} · Today: ${todayVisitors.toLocaleString('en-US')}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${isLoaded ? 'opacity-75' : 'opacity-40'}`}></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>

      <span className="text-neutral-500">Visitors:</span>
      <span className="font-mono text-neutral-200 font-semibold">{totalVisitors.toLocaleString('en-US')}</span>

      <span className="text-neutral-600">·</span>

      <span className="text-neutral-500">Today:</span>
      <span className="font-mono text-rose-300 font-medium">{todayVisitors.toLocaleString('en-US')}</span>
    </div>
  );
};

export default VisitorCounter;
