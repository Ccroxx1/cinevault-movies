import React from 'react';
import { Zap, Activity, Radio } from 'lucide-react';
import { getSwarmHealth, SwarmHealth } from '../types';

interface TorrentSwarmHealthBadgeProps {
  seeds: number;
  peers: number;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const TorrentSwarmHealthBadge: React.FC<TorrentSwarmHealthBadgeProps> = ({
  seeds,
  peers,
  showDetails = false,
  compact = false,
  className = '',
}) => {
  const health: SwarmHealth = getSwarmHealth(seeds, peers);
  const safeSeeds = Number(seeds) || 0;
  const safePeers = Number(peers) || 0;

  const tooltipText = `${health.label}: ${health.description} (${safeSeeds} seeders, ${safePeers} peers)`;

  if (compact) {
    if (health.status === 'blazing') {
      return (
        <span
          title={tooltipText}
          className={`cv-badge-success inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-bold whitespace-nowrap shrink-0 transition-colors ${className}`}
        >
          <Zap className="w-2.5 h-2.5 fill-current shrink-0" aria-hidden="true" />
          <span>{safeSeeds >= 100 ? 'Fast' : `${safeSeeds}s`}</span>
        </span>
      );
    }

    if (health.status === 'healthy') {
      return (
        <span
          title={tooltipText}
          className={`cv-badge-success inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-semibold whitespace-nowrap shrink-0 transition-colors ${className}`}
        >
          <Activity className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
          <span>{safeSeeds}s</span>
        </span>
      );
    }

    if (health.status === 'moderate') {
      return (
        <span
          title={tooltipText}
          className={`cv-badge-info inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-semibold whitespace-nowrap shrink-0 transition-colors ${className}`}
        >
          <Activity className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
          <span>{safeSeeds > 0 ? `${safeSeeds}s` : 'Active'}</span>
        </span>
      );
    }

    return (
      <span
        title={tooltipText}
        className={`cv-badge-neutral inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono whitespace-nowrap shrink-0 transition-colors ${className}`}
      >
        <Radio className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
        <span>{safeSeeds > 0 ? `${safeSeeds}s` : 'Active'}</span>
      </span>
    );
  }

  const getIcon = () => {
    switch (health.status) {
      case 'blazing':
        return <Zap className="w-3 h-3 fill-current shrink-0" aria-hidden="true" />;
      case 'healthy':
      case 'moderate':
        return <Activity className="w-3 h-3 shrink-0" aria-hidden="true" />;
      case 'low':
      default:
        return <Radio className="w-3 h-3 shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <div
      title={tooltipText}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono font-semibold transition-all whitespace-nowrap ${health.badgeClass} ${className}`}
    >
      <span className="shrink-0">{getIcon()}</span>
      <span className="tracking-tight">{health.label}</span>
      {showDetails && (
        <span className="text-[10px] opacity-85 ml-1">
          ({safeSeeds}S / {safePeers}L)
        </span>
      )}
    </div>
  );
};
