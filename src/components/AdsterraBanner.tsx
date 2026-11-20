import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { hasAdvertisingConsent, isAdHostEligible, onConsentChange } from '../utils/consent';

const invokeScriptUrl = 'https://eagerdazzle.com/a62700da0f74191791572095727853bc/invoke.js';
const desktopBannerWidth = 728;
const bannerHeight = 90;

export const AdsterraBanner: React.FC = () => {
  const bannerViewportRef = useRef<HTMLDivElement | null>(null);
  const adContainerRef = useRef<HTMLDivElement | null>(null);
  const [bannerScale, setBannerScale] = useState(1);
  const [adsEnabled, setAdsEnabled] = useState<boolean>(
    () => isAdHostEligible() && hasAdvertisingConsent()
  );

  useLayoutEffect(() => {
    const updateBannerScale = () => {
      const availableWidth = bannerViewportRef.current?.clientWidth ?? window.innerWidth;
      setBannerScale(Math.min(1, availableWidth / desktopBannerWidth));
    };

    updateBannerScale();
    const viewport = bannerViewportRef.current;
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateBannerScale)
      : null;

    if (viewport && resizeObserver) resizeObserver.observe(viewport);
    window.addEventListener('resize', updateBannerScale);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateBannerScale);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let invokeScript: HTMLScriptElement | null = null;

    const mountBannerScript = () => {
      const eligible = isAdHostEligible() && hasAdvertisingConsent();
      setAdsEnabled(eligible);
      if (!mounted || invokeScript || !eligible) return;

      const adContainer = adContainerRef.current;
      if (!adContainer) return;

      try {
        // Assign atOptions directly instead of injecting an inline <script> tag
        (window as any).atOptions = {
          key: 'a62700da0f74191791572095727853bc',
          format: 'iframe',
          height: bannerHeight,
          width: desktopBannerWidth,
          params: {},
        };

        invokeScript = document.createElement('script');
        invokeScript.src = invokeScriptUrl;
        invokeScript.async = true;
        invokeScript.setAttribute('data-cfasync', 'false');
        invokeScript.onerror = () => {
          // Ad banner blocked or unavailable — fail silently without affecting layout or app
        };

        adContainer.append(invokeScript);
      } catch {
        // Non-critical ad initialization must never break React rendering
      }
    };

    mountBannerScript();
    const unsubscribe = onConsentChange((accepted) => {
      setAdsEnabled(isAdHostEligible() && accepted);
      if (accepted) {
        mountBannerScript();
      } else if (invokeScript) {
        invokeScript.remove();
        invokeScript = null;
        adContainerRef.current?.replaceChildren();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
      invokeScript?.remove();
      adContainerRef.current?.replaceChildren();
    };
  }, [adsEnabled]);

  if (!adsEnabled) {
    return null;
  }

  return (
    <aside className="my-6 w-full rounded-2xl border border-white/10 bg-[#0a0a0a]/80 p-3 sm:p-4 [contain:layout_style]">
      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2 text-[10px] font-mono uppercase tracking-widest text-neutral-500">
        <span className="font-semibold text-neutral-400">Advertisement</span>
        <span>Sponsored Content</span>
      </div>
      <div className="flex w-full flex-col items-center gap-3">
        <a
          href="https://beta.publishers.adsterra.com/referral/BYyJkzF7DE"
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="block w-full max-w-[728px] aspect-[728/90] overflow-hidden rounded-lg bg-neutral-900/40"
        >
          <img
            src="https://landings-cdn.adsterratech.com/referralBanners/png/728%20x%2090%20px.png"
            alt="Adsterra publisher referral banner"
            width={728}
            height={90}
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-contain"
          />
        </a>
        <div
          ref={bannerViewportRef}
          className="flex w-full max-w-[728px] justify-center overflow-hidden"
          style={{ height: Math.max(40, Math.round(bannerHeight * bannerScale)) }}
        >
          <div
            ref={adContainerRef}
            className="h-[90px] w-[728px] shrink-0 overflow-hidden"
            style={{
              transform: `scale(${bannerScale})`,
              transformOrigin: 'top center',
            }}
            aria-label="Advertisement"
          />
        </div>
      </div>
    </aside>
  );
};
