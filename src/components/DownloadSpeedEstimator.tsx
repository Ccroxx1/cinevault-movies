import React, { useState } from 'react';
import { Gauge, Clock, Wifi } from 'lucide-react';
import { calculateEstimatedDownloadTime } from '../types';

interface DownloadSpeedEstimatorProps {
  sizeBytes?: number;
  fileSize?: string;
  sizeFormatted?: string;
  className?: string;
}

const SPEED_PRESETS = [
  { label: '10M', value: 10, name: 'Mobile / DSL (10 Mbps)' },
  { label: '50M', value: 50, name: 'Standard Broadband (50 Mbps)' },
  { label: '100M', value: 100, name: 'Fast Fiber (100 Mbps)' },
  { label: '500M', value: 500, name: 'Ultra Fiber (500 Mbps)' },
  { label: '1G', value: 1000, name: 'Gigabit Fiber (1 Gbps)' },
];

function parseFileSizeToBytes(str?: string): number {
  if (!str) return 0;
  const match = str.match(/([0-9.]+)\s*(GB|MB|KB|B)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'GB') return val * 1024 * 1024 * 1024;
  if (unit === 'MB') return val * 1024 * 1024;
  if (unit === 'KB') return val * 1024;
  return val;
}

export const DownloadSpeedEstimator: React.FC<DownloadSpeedEstimatorProps> = ({
  sizeBytes,
  fileSize,
  sizeFormatted,
  className = '',
}) => {
  const [selectedSpeed, setSelectedSpeed] = useState<number>(100); // default 100 Mbps

  const computedBytes = sizeBytes && sizeBytes > 0 
    ? sizeBytes 
    : parseFileSizeToBytes(fileSize || sizeFormatted);

  const estimatedTime = calculateEstimatedDownloadTime(computedBytes, selectedSpeed);

  return (
    <div className={`p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
          <Gauge className="w-3.5 h-3.5 text-rose-400" />
          <span>Download Speed Estimator</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
          <Clock className="w-3 h-3" />
          <span>~{estimatedTime}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 pt-1">
        <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
          <Wifi className="w-3 h-3" /> Speed:
        </span>
        <div className="flex items-center gap-1">
          {SPEED_PRESETS.map((preset) => {
            const isActive = selectedSpeed === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => setSelectedSpeed(preset.value)}
                title={preset.name}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/5'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
      {sizeFormatted && (
        <p className="text-[10px] text-neutral-400/80 font-mono text-right">
          Total payload: <span className="text-neutral-200">{sizeFormatted}</span> @{' '}
          {SPEED_PRESETS.find((p) => p.value === selectedSpeed)?.name.split(' (')[0]}
        </p>
      )}
    </div>
  );
};
