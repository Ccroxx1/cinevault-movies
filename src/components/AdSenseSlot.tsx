import React, { useEffect, useRef } from 'react';

const ADSENSE_CLIENT_ID = 'ca-pub-6128111645137702';

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
  layout,
  responsive = true,
  className = ''
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevent duplicate push calls in React StrictMode / re-renders
    if (pushedRef.current) return;

    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && adRef.current) {
          const isFilled = adRef.current.getAttribute('data-adsbygoogle-status');
          if (!isFilled) {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            pushedRef.current = true;
          }
        }
      } catch (err) {
        // Suppress expected script initialization delays during hydration
        console.debug('AdSense initialization notice:', err);
      }
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
      {/* AdSense Standard Labeling */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[10px] text-neutral-500 uppercase tracking-widest font-mono select-none">
        <span className="font-semibold text-neutral-400">Advertisement</span>
        <span className="text-neutral-600">Google AdSense</span>
      </div>

      {/* AdSense In-Page Ad Container */}
      <div className="w-full flex items-center justify-center overflow-hidden min-h-[60px]">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', textAlign: 'center' }}
          data-ad-client={ADSENSE_CLIENT_ID}
          {...(slotId ? { 'data-ad-slot': slotId } : {})}
          data-ad-format={format}
          {...(layout ? { 'data-ad-layout': layout } : {})}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      </div>
    </div>
  );
};

