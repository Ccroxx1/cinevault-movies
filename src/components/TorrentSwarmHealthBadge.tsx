import React from 'react';
import { Zap, Activity, AlertTriangle, AlertCircle } from 'lucide-react';
import { getSwarmHealth, SwarmHealth } from '../types';

interface TorrentSwarmHealthBadgeProps {
  seeds: number;
  peers: number;
  showDetails?: boolean;
  className?: string;
}

export const TorrentSwarmHealthBadge: React.FC<TorrentSwarmHealthBadgeProps> = ({
  seeds,
  peers,
  showDetails = false,
  className = '',
}) => {
  const health: SwarmHealth = getSwarmHealth(seeds, peers);

  const getIcon = () => {
    switch (health.status) {
      case 'blazing':
        return <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400/30" />;
      case 'healthy':
        return <Activity className="w-3 h-3 text-green-400" />;
      case 'moderate':
        return <AlertTriangle className="w-3 h-3 text-amber-400" />;
      case 'low':
      default:
        return <AlertCircle className="w-3 h-3 text-rose-400" />;
    }
  };

  return (
    <div
      title={`${health.label}: ${health.description} (${seeds} seeders, ${peers} leechers)`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono font-semibold transition-all ${health.badgeClass} ${className}`}
    >
      <span className="shrink-0">{getIcon()}</span>
      <span className="tracking-tight">{health.label}</span>
      {showDetails && (
        <span className="text-[10px] opacity-75 ml-1">
          ({seeds}S / {peers}L)
        </span>
      )}
    </div>
  );
};
