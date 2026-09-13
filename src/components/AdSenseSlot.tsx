import React, { useEffect, useRef } from 'react';
import { showEzoicAds } from '../utils/ezoic';

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
  const adRef = useRef<HTMLDivElement | null>(null);
  const pushedRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevent duplicate calls in React StrictMode / re-renders
    if (pushedRef.current) return;
    pushedRef.current = true;

    const timer = setTimeout(() => {
      // Trigger Ezoic standalone ad placement as instructed in Ezoic documentation
      showEzoicAds({});
    }, 150);

    return () => clearTimeout(timer);
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
      className={`relative w-full rounded-2xl bg-[#0a0a0a]/80 border border-white/10 p-3 sm:p-4 flex flex-col items-center justify-center overflow-hidden my-6 transition-all ${getContainerStyles()} ${className}`}
    >
      {/* Standard Advertisement Labeling */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[10px] text-neutral-500 uppercase tracking-widest font-mono select-none">
        <span className="font-semibold text-neutral-400">Advertisement</span>
        <span className="text-neutral-600">Sponsor</span>
      </div>

      {/* Ezoic In-Page Ad Container */}
      <div
        ref={adRef}
        className="w-full flex items-center justify-center overflow-hidden min-h-[60px] ezoic-ad"
        {...(slotId ? { id: `ezoic-pub-ad-placeholder-${slotId}` } : {})}
      />
    </div>
  );
};

export const AdSlot = AdSenseSlot;


