import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const invokeScriptUrl = 'https://eagerdazzle.com/a62700da0f74191791572095727853bc/invoke.js';
const desktopBannerWidth = 728;
const bannerHeight = 90;

export const AdsterraBanner: React.FC = () => {
  const bannerViewportRef = useRef<HTMLDivElement | null>(null);
  const adContainerRef = useRef<HTMLDivElement | null>(null);
  const [bannerScale, setBannerScale] = useState(1);

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
    const host = window.location.hostname;
    const isProd = host === 'cinevaultmovies.online' || host.endsWith('.cinevaultmovies.online');
    const isDebug =
      window.location.search.includes('force_ads=1') ||
      window.location.search.includes('force_adsterra=1') ||
      window.location.search.includes('ez_js_debugger=1');

    if (!isProd && !isDebug) return;

    const adContainer = adContainerRef.current;
    if (!adContainer) return;

    const optionsScript = document.createElement('script');
    optionsScript.textContent = `window.atOptions = ${JSON.stringify({
      key: 'a62700da0f74191791572095727853bc',
      format: 'iframe',
      height: bannerHeight,
      width: desktopBannerWidth,
      params: {},
    })};`;

    const invokeScript = document.createElement('script');
    invokeScript.src = invokeScriptUrl;
    invokeScript.async = false;
    invokeScript.setAttribute('data-cfasync', 'false');
    invokeScript.onerror = () => console.warn('Adsterra banner failed to load.');

    adContainer.append(optionsScript, invokeScript);

    return () => {
      optionsScript.remove();
      invokeScript.remove();
      adContainer.replaceChildren();
    };
  }, []);

  return (
    <aside className="my-6 w-full rounded-2xl border border-white/10 bg-[#0a0a0a]/80 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2 text-[10px] font-mono uppercase tracking-widest text-neutral-500">
        <span className="font-semibold text-neutral-400">Advertisement</span>
        <span>Sponsored Content</span>
      </div>
      <div className="flex w-full flex-col items-center gap-3">
        <a
          href="https://beta.publishers.adsterra.com/referral/BYyJkzF7DE"
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="block w-full max-w-[728px]"
        >
          <img
            src="https://landings-cdn.adsterratech.com/referralBanners/png/728%20x%2090%20px.png"
            alt="Adsterra publisher referral banner"
            width={728}
            height={90}
            className="block h-auto w-full"
          />
        </a>
        <div
          ref={bannerViewportRef}
          className="flex w-full justify-center overflow-hidden"
          style={{ height: bannerHeight * bannerScale }}
        >
          <div
            ref={adContainerRef}
            className="h-[90px] w-[728px] shrink-0"
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
