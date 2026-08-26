import React, { useEffect, useState } from 'react';
import { Users, Flame, Shield, FileText, Info, Mail, BookOpen } from 'lucide-react';
import { CineVaultLogo } from './CineVaultLogo';
import { trackVisitorHit, getCachedVisitorCount, getCachedTodayVisitorCount } from '../utils/visitor';

interface FooterProps {
  onNavigateHome?: () => void;
  onOpenPolicy?: (tab: 'privacy' | 'terms' | 'about' | 'contact' | 'dmca' | 'agreement') => void;
  onOpenGuide?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateHome,
  onOpenPolicy,
  onOpenGuide
}) => {
  const [totalVisitors, setTotalVisitors] = useState<number>(() => getCachedVisitorCount());
  const [todayVisitors, setTodayVisitors] = useState<number>(() => getCachedTodayVisitorCount());
  const [isLiveLoaded, setIsLiveLoaded] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function syncVisitorStats() {
      try {
        const stats = await trackVisitorHit();
        if (isMounted) {
          const rawTotal = typeof stats.totalVisitors === 'number' ? stats.totalVisitors : 0;
          const today = typeof stats.todayVisitors === 'number' ? stats.todayVisitors : 0;
          const total = Math.max(rawTotal, today);

          setTotalVisitors(total);
          setTodayVisitors(today);
          setIsLiveLoaded(true);
        }
      } catch (err) {
        if (isMounted) {
          setIsLiveLoaded(true);
        }
      }
    }

    syncVisitorStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer id="cinevault-footer" className="w-full border-t border-white/10 bg-[#050505] mt-16 py-10 text-xs text-neutral-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Tier: Logo, Visitor Metrics Badges, Legal Nav */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto justify-between sm:justify-start">
            <a
              href="/"
              id="footer-brand-link"
              onClick={(e) => {
                e.preventDefault();
                if (onNavigateHome) onNavigateHome();
              }}
              className="cursor-pointer"
            >
              <CineVaultLogo variant="header" size="sm" showTagline={true} />
            </a>

            {/* Clean, Minimal Dual-Layer Visitor Counter */}
            <div
              id="footer-visitor-counter"
              className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 select-none text-xs"
              title={`CineVault By Sasuu — Total Visitors: ${totalVisitors.toLocaleString('en-US')} · Today's Hits: ${todayVisitors.toLocaleString('en-US')}`}
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${isLiveLoaded ? 'opacity-75' : 'opacity-30'}`} />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>

              {/* Total Visitors */}
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-neutral-400" />
                <span className="text-neutral-500 text-[11px]">Total:</span>
                <span id="footer-total-visitors-count" className="font-mono text-neutral-200 font-semibold tracking-tight">
                  {totalVisitors.toLocaleString('en-US')}
                </span>
              </div>

              <span className="text-neutral-600">·</span>

              {/* Today's Hits */}
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-400" />
                <span className="text-neutral-500 text-[11px]">Today:</span>
                <span id="footer-today-visitors-count" className="font-mono text-rose-300 font-medium tracking-tight">
                  {todayVisitors.toLocaleString('en-US')}
                </span>
              </div>
            </div>
          </div>

          {/* Compliance & Policy Links */}
          <nav aria-label="Legal and Help Links" className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4 text-xs">
            <button
              id="footer-link-privacy"
              onClick={() => onOpenPolicy && onOpenPolicy('privacy')}
              className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              <span>Privacy Policy</span>
            </button>
            <span className="text-neutral-700">•</span>
            <button
              id="footer-link-terms"
              onClick={() => onOpenPolicy && onOpenPolicy('terms')}
              className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              <span>Terms of Service</span>
            </button>
            <span className="text-neutral-700">•</span>
            <button
              id="footer-link-dmca"
              onClick={() => onOpenPolicy && onOpenPolicy('dmca')}
              className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>DMCA</span>
            </button>
            <span className="text-neutral-700">•</span>
            <button
              id="footer-link-about"
              onClick={() => onOpenPolicy && onOpenPolicy('about')}
              className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              <span>About Us</span>
            </button>
            <span className="text-neutral-700">•</span>
            <button
              id="footer-link-contact"
              onClick={() => onOpenPolicy && onOpenPolicy('contact')}
              className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Mail className="w-3 h-3" />
              <span>Contact</span>
            </button>
            <span className="text-neutral-700">•</span>
            <button
              id="footer-link-guides"
              onClick={() => onOpenGuide && onOpenGuide()}
              className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1 text-rose-400/90 hover:text-rose-300"
            >
              <BookOpen className="w-3 h-3" />
              <span>Guides</span>
            </button>
          </nav>

        </div>

        {/* Bottom Tier: Disclaimer, Copyright & User Agreement Notice */}
        <div className="pt-4 border-t border-white/5 space-y-3 text-[11px] text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-neutral-500 max-w-2xl">
              CineVault operates strictly as a metadata directory and film indexer. Content is aggregated from public REST APIs for informational and discovery purposes.
            </p>
            <p className="text-neutral-600 whitespace-nowrap">
              CineVault By Sasuu © 2026. All rights reserved.
            </p>
          </div>

          <div className="pt-2 border-t border-white/[0.03] text-neutral-500 leading-relaxed text-center">
            <p id="footer-user-agreement-notice">
              By using this site you agree to and accept our User Agreement, which can be read{' '}
              <button
                type="button"
                id="footer-link-user-agreement"
                onClick={() => onOpenPolicy && onOpenPolicy('agreement')}
                className="text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer transition-colors"
              >
                here
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
