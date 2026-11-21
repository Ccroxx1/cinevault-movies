import React from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { useVisitorCount } from '../hooks/useVisitorCount';

interface VisitorCountBadgeProps {
  variant?: 'full' | 'compact';
  className?: string;
}

export const VisitorCountBadge: React.FC<VisitorCountBadgeProps> = ({
  variant = 'full',
  className = '',
}) => {
  const { count, totalVisits, isLoading, isUnavailable, source, lastUpdated } = useVisitorCount();

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  const tooltip = isUnavailable
    ? 'Visitor count service temporarily unavailable'
    : totalVisits
    ? `Total visits: ${totalVisits.toLocaleString()} (deduplicated sessions) • Unique visitors: ${count?.toLocaleString()} • Source: ${source || 'Redis'} • Updated at ${formattedTime}`
    : `Unique visitors: ${count?.toLocaleString()} • Updated at ${formattedTime}`;

  if (variant === 'compact') {
    if (isUnavailable) {
      return (
        <div
          id="visitor-count-badge-compact"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full cv-surface-muted border text-xs cv-text-muted ${className}`}
          title={tooltip}
        >
          <AlertCircle className="w-3 h-3 cv-text-subtle shrink-0" aria-hidden="true" />
          <span className="text-[11px] cv-text-muted">Unavailable</span>
        </div>
      );
    }

    return (
      <div
        id="visitor-count-badge-compact"
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full cv-surface-muted border text-xs cv-text-secondary ${className}`}
        title={tooltip}
      >
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: 'var(--cv-success-soft-fg)' }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: 'var(--cv-success-soft-fg)' }}
          />
        </span>
        <Users className="w-3.5 h-3.5 cv-text-muted shrink-0" aria-hidden="true" />
        <div className="flex items-center gap-1 font-mono">
          {isLoading ? (
            <span className="w-6 h-3 skeleton-shimmer rounded" />
          ) : (
            <span className="font-bold cv-text tracking-tight">
              {count !== null ? count.toLocaleString() : '—'}
            </span>
          )}
          <span className="font-sans text-[11px] cv-text-muted">
            {count === 1 ? 'visitor' : 'visitors'}
          </span>
        </div>
      </div>
    );
  }

  if (isUnavailable) {
    return (
      <div
        id="visitor-count-badge"
        className={`inline-flex items-center gap-2.5 ${className}`}
      >
        <div
          id="visitor-count-pill"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full cv-surface-muted border cv-text-muted transition-colors"
          title={tooltip}
        >
          <AlertCircle className="w-3.5 h-3.5 cv-text-subtle shrink-0" aria-hidden="true" />
          <span className="font-sans text-xs cv-text-muted">
            Visitor count unavailable
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
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full cv-surface-muted border hover:border-[var(--cv-border-hover)] transition-colors"
        title={tooltip}
      >
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: 'var(--cv-success-soft-fg)' }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: 'var(--cv-success-soft-fg)' }}
          />
        </span>
        <Users className="w-3.5 h-3.5 cv-text-muted shrink-0" aria-hidden="true" />
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {isLoading ? (
            <span className="w-8 h-3.5 skeleton-shimmer rounded" />
          ) : (
            <span id="visitor-count-number" className="font-bold cv-text tracking-tight">
              {count !== null ? count.toLocaleString() : '—'}
            </span>
          )}
          <span className="font-sans text-[11px] cv-text-muted font-normal">
            {count === 1 ? 'visitor' : 'visitors'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VisitorCountBadge;
