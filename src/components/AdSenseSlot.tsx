import React, { useEffect, useRef, useState } from 'react';
import { hasAdvertisingConsent, isAdHostEligible, onConsentChange } from '../utils/consent';

interface AdSenseSlotProps {
  slotId?: string;
  format?: 'auto' | 'horizontal' | 'rectangle' | 'vertical' | 'fluid';
  layout?: string;
  responsive?: boolean;
  className?: string;
}

const NATIVE_BANNER_ID = '345a61a2efd686e177ae1dfa713937e8';
const NATIVE_BANNER_SRC = `https://bancadeltempoidea.org/21/${NATIVE_BANNER_ID}`;
const NATIVE_CONTAINER_ID = `container-${NATIVE_BANNER_ID}`;

export const AdSenseSlot: React.FC<AdSenseSlotProps> = ({
  slotId,
  format = 'auto',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [adsEnabled, setAdsEnabled] = useState<boolean>(
    () => isAdHostEligible() && hasAdvertisingConsent()
  );

  useEffect(() => {
    const syncAndLoad = () => {
      const eligible = isAdHostEligible() && hasAdvertisingConsent();
      setAdsEnabled(eligible);

      const container = containerRef.current;
      if (!container) return;

      if (!eligible) {
        container.replaceChildren();
        document
          .querySelectorAll(`script[data-adsterra-native="${NATIVE_BANNER_ID}"]`)
          .forEach((el) => el.remove());
        return;
      }

      try {
        // Remove any prior invocation script so SPA route transitions re-populate the newly mounted container
        document
          .querySelectorAll(`script[data-adsterra-native="${NATIVE_BANNER_ID}"]`)
          .forEach((el) => el.remove());

        const script = document.createElement('script');
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        script.setAttribute('data-adsterra-native', NATIVE_BANNER_ID);
        script.src = NATIVE_BANNER_SRC;
        script.onerror = () => {
          // Ad network blocked by tracking prevention or ad blocker — fail gracefully
        };
        document.body.appendChild(script);
      } catch {
        // Never allow ad script issues to disrupt rendering
      }
    };

    syncAndLoad();
    return onConsentChange(() => {
      syncAndLoad();
    });
  }, [adsEnabled]);

  if (!adsEnabled) {
    return null;
  }

  // Format-specific sizing constraints to avoid Cumulative Layout Shift (CLS)
  const getContainerStyles = () => {
    switch (format) {
      case 'rectangle':
        return 'max-w-[336px] min-h-[280px] max-h-[340px] mx-auto';
      case 'horizontal':
        return 'w-full max-w-[970px] min-h-[140px] max-h-[200px] mx-auto';
      case 'vertical':
        return 'w-[160px] sm:w-[300px] min-h-[600px] mx-auto';
      default:
        return 'w-full h-[270px] sm:h-[250px] max-h-[270px] sm:max-h-[250px]';
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl cv-card border p-3 sm:p-4 flex flex-col items-center justify-between overflow-hidden my-6 [contain:layout_style] ${getContainerStyles()} ${className}`}
    >
      {/* Standard Advertisement Labeling */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b cv-border-subtle text-[10px] uppercase tracking-widest font-mono select-none shrink-0">
        <span className="font-semibold cv-text-muted">Advertisement</span>
        <span className="cv-text-subtle">Sponsored Content</span>
      </div>

      {/* Adsterra Native Banner Container */}
      <div
        ref={containerRef}
        id={NATIVE_CONTAINER_ID}
        className="w-full flex-1 flex items-center justify-center overflow-hidden h-[200px] sm:h-[185px] max-h-[200px]"
        {...(slotId ? { 'data-slot-id': slotId } : {})}
      />
    </div>
  );
};

export const AdSlot = AdSenseSlot;
