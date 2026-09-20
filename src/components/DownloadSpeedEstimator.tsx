import React, { useState } from 'react';
import { Gauge, Clock, Wifi } from 'lucide-react';
import { calculateEstimatedDownloadTime } from '../types';
import { useTheme } from '../context/ThemeContext';

interface DownloadSpeedEstimatorProps {
  sizeBytes?: number;
  fileSize?: string;
  sizeFormatted?: string;
  className?: string;
  selectedSpeed?: number;
  onSpeedChange?: (speed: number) => void;
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
  selectedSpeed: controlledSpeed,
  onSpeedChange,
}) => {
  const { colorMode } = useTheme();
  const isWhite = colorMode === 'white';

  const [internalSpeed, setInternalSpeed] = useState<number>(100); // default 100 Mbps
  const currentSpeed = controlledSpeed !== undefined ? controlledSpeed : internalSpeed;

  const handleSpeedSelect = (val: number) => {
    if (onSpeedChange) {
      onSpeedChange(val);
    } else {
      setInternalSpeed(val);
    }
  };

  const computedBytes = sizeBytes && sizeBytes > 0 
    ? sizeBytes 
    : parseFileSizeToBytes(fileSize || sizeFormatted);

  const estimatedTime = calculateEstimatedDownloadTime(computedBytes, currentSpeed);
  const activePreset = SPEED_PRESETS.find((p) => p.value === currentSpeed) || SPEED_PRESETS[2];

  return (
    <div className={`p-2.5 sm:p-3 rounded-xl space-y-2 border transition-colors ${
      isWhite
        ? 'bg-slate-50/80 border-slate-200/80'
        : 'bg-white/[0.03] border-white/5'
    } ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        {/* Left: Speed Indicator & Time Estimate */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1.5 font-semibold ${isWhite ? 'text-slate-700' : 'text-neutral-300'}`}>
            <Gauge className="w-3.5 h-3.5 text-rose-500" />
            <span>Est. Download:</span>
          </div>
          <div className={`flex items-center gap-1 font-mono font-bold ${isWhite ? 'text-emerald-600' : 'text-emerald-400'}`}>
            <Clock className="w-3 h-3" />
            <span>~{estimatedTime}</span>
          </div>
          {sizeFormatted && (
            <span className={`text-[11px] font-mono hidden md:inline ${isWhite ? 'text-slate-500' : 'text-neutral-500'}`}>
              ({sizeFormatted} @ {activePreset.name.split(' (')[0]})
            </span>
          )}
        </div>

        {/* Right: Presets */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className={`text-[10px] font-mono flex items-center gap-1 ${isWhite ? 'text-slate-500' : 'text-neutral-400'}`}>
            <Wifi className="w-3 h-3" /> Speed:
          </span>
          <div className="flex items-center gap-1">
            {SPEED_PRESETS.map((preset) => {
              const isActive = currentSpeed === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleSpeedSelect(preset.value)}
                  title={preset.name}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : isWhite
                      ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/90 shadow-2xs'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/5'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
