import React, { useEffect, useRef } from 'react';

interface AdSenseSlotProps {
  slotId?: string;
  format?: 'auto' | 'horizontal' | 'rectangle' | 'vertical';
  className?: string;
}

export const AdSenseSlot: React.FC<AdSenseSlotProps> = ({
  slotId = '1234567890',
  format = 'horizontal',
  className = ''
}) => {
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch {
      // Ignore initial render errors if AdSense script is not yet active
    }
  }, []);

  return (
    <div
      className={`relative w-full rounded-2xl bg-[#0c0c0c] border border-white/10 p-3 flex flex-col items-center justify-center overflow-hidden my-6 transition-all ${className}`}
    >
      {/* Subtle Ad Disclaimer compliant with Google AdSense Policies */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[10px] text-neutral-400 uppercase tracking-widest font-mono">
        <span>Advertisement</span>
        <span>Sponsored</span>
      </div>

      {/* Actual AdSense Slot container */}
      <div className="w-full flex items-center justify-center min-h-[90px] overflow-hidden">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', textAlign: 'center' }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
};
