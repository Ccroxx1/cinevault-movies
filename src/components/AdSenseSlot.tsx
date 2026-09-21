import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

interface AdSenseSlotProps {
  slotId?: string;
  format?: 'auto' | 'horizontal' | 'rectangle' | 'vertical' | 'fluid';
  layout?: string;
  responsive?: boolean;
  className?: string;
}

export const AdSenseSlot: React.FC<AdSenseSlotProps> = ({
  slotId,
  format = 'auto',
  className = ''
}) => {
  const { colorMode } = useTheme();
  const isWhite = colorMode === 'white';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    try {
      const host = window.location.hostname;
      const isProd = host === 'cinevaultmovies.online' || host.endsWith('.cinevaultmovies.online');
      const isDebug =
        window.location.search.indexOf('force_ads=1') !== -1 ||
        window.location.search.indexOf('force_adsterra=1') !== -1 ||
        window.location.search.indexOf('ez_js_debugger=1') !== -1;

      if (isProd || isDebug) {
        // Load Adsterra Native Banner script if not already present
        const scriptSrc = 'https://pl31437220.profitableratecpmnetwork.com/2e2c5aa1814513310d921e06208ff111/invoke.js';
        if (!document.querySelector(`script[src*="2e2c5aa1814513310d921e06208ff111"]`)) {
          const script = document.createElement('script');
          script.async = true;
          script.setAttribute('data-cfasync', 'false');
          script.src = scriptSrc;
          document.head.appendChild(script);
        }
      }
    } catch (e) {}
  }, []);

  // Format-specific sizing constraints to avoid Cumulative Layout Shift (CLS)
  const getContainerStyles = () => {
    switch (format) {
      case 'rectangle':
        return 'max-w-[336px] min-h-[250px] sm:min-h-[280px] mx-auto';
      case 'horizontal':
        return 'w-full max-w-[970px] min-h-[90px] mx-auto';
      case 'vertical':
        return 'w-[160px] sm:w-[300px] min-h-[600px] mx-auto';
      default:
        return 'w-full min-h-[90px] sm:min-h-[100px]';
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl border p-3 sm:p-4 flex flex-col items-center justify-center overflow-hidden my-6 transition-all ${
        isWhite
          ? 'bg-slate-50 border-slate-200 shadow-xs'
          : 'bg-[#0a0a0a]/80 border-white/10'
      } ${getContainerStyles()} ${className}`}
    >
      {/* Standard Advertisement Labeling */}
      <div
        className={`w-full flex items-center justify-between pb-2 mb-2 border-b text-[10px] uppercase tracking-widest font-mono select-none ${
          isWhite ? 'border-slate-200 text-slate-500' : 'border-white/5 text-neutral-500'
        }`}
      >
        <span className={`font-semibold ${isWhite ? 'text-slate-700' : 'text-neutral-400'}`}>Advertisement</span>
        <span className={isWhite ? 'text-slate-400' : 'text-neutral-600'}>Sponsored Content</span>
      </div>

      {/* Adsterra Native Banner Container */}
      <div
        ref={containerRef}
        id="container-2e2c5aa1814513310d921e06208ff111"
        className="w-full flex items-center justify-center overflow-hidden min-h-[60px]"
        {...(slotId ? { 'data-slot-id': slotId } : {})}
      />
    </div>
  );
};

export const AdSlot = AdSenseSlot;



