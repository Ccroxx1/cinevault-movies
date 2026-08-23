import React, { useEffect, useState } from 'react';
import { trackVisitorHit, getCachedVisitorCount } from '../utils/visitor';

interface VisitorCounterProps {
  className?: string;
}

export const VisitorCounter: React.FC<VisitorCounterProps> = ({
  className = ''
}) => {
  const [totalVisitors, setTotalVisitors] = useState<number>(() => getCachedVisitorCount());
  const [todayVisitors, setTodayVisitors] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function recordVisit() {
      try {
        const stats = await trackVisitorHit();
        if (isMounted) {
          setTotalVisitors(stats.totalVisitors ?? 0);
          setTodayVisitors(stats.todayVisitors ?? 0);
        }
      } catch {
        // Fallback is handled in trackVisitorHit
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
      className={`inline-flex items-center gap-1.5 text-xs text-neutral-500 font-normal select-none ${className}`}
      title={`CineVault By Sasuu — Total Visitors: ${totalVisitors.toLocaleString('en-US')} · Today: ${todayVisitors.toLocaleString('en-US')}`}
    >
      <span>Visitors:</span>
      <span className="font-mono text-neutral-300 font-medium">{totalVisitors.toLocaleString('en-US')}</span>
      <span className="text-neutral-600">·</span>
      <span>Today:</span>
      <span className="font-mono text-neutral-300 font-medium">{todayVisitors.toLocaleString('en-US')}</span>
    </div>
  );
};

export default VisitorCounter;
