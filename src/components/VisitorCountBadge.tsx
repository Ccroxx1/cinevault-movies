import React from 'react';
import { Users } from 'lucide-react';
import { useVisitorCount } from '../hooks/useVisitorCount';

interface VisitorCountBadgeProps {
  variant?: 'full' | 'compact';
  className?: string;
}

export const VisitorCountBadge: React.FC<VisitorCountBadgeProps> = ({
  variant = 'full',
  className = '',
}) => {
  const { count, totalVisits, isLoading } = useVisitorCount();

  if (variant === 'compact') {
    return (
      <div
        id="visitor-count-badge-compact"
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-neutral-300 ${className}`}
        title={totalVisits ? `Total visits: ${totalVisits.toLocaleString()} (Verified)` : 'Live actual visitor counter'}
      >
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Users className="w-3.5 h-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
        <div className="flex items-center gap-1 font-mono">
          {isLoading ? (
            <span className="w-6 h-3 bg-white/10 animate-pulse rounded"></span>
          ) : (
            <span className="font-bold text-white tracking-tight">
              {count !== null ? count.toLocaleString() : '—'}
            </span>
          )}
          <span className="font-sans text-[11px] text-neutral-400">
            {count === 1 ? 'visitor' : 'visitors'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="visitor-count-badge"
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <div
        id="visitor-count-pill"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-colors"
        title={totalVisits ? `Total visits: ${totalVisits.toLocaleString()} • Unique visitors: ${count?.toLocaleString() || 0}` : 'Visitor counter'}
      >
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Users className="w-3.5 h-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {isLoading ? (
            <span className="w-8 h-3.5 bg-white/10 animate-pulse rounded"></span>
          ) : (
            <span id="visitor-count-number" className="font-bold text-white tracking-tight">
              {count !== null ? count.toLocaleString() : '—'}
            </span>
          )}
          <span className="font-sans text-[11px] text-neutral-400 font-normal">
            {count === 1 ? 'visitor' : 'visitors'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VisitorCountBadge;
