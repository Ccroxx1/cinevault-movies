import React from 'react';
import { CineVaultLogo } from './CineVaultLogo';

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
  return (
    <footer id="cinevault-footer" className="w-full border-t border-white/10 bg-[#050505] mt-16 py-10 text-xs text-neutral-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Tier: Logo & Legal Nav */}
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
          </div>

          {/* Compliance & Policy Links */}
          <nav aria-label="Legal and Help Links" className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4 text-xs">
            <button
              id="footer-link-privacy"
              onClick={() => onOpenPolicy && onOpenPolicy('privacy')}
              className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span aria-hidden="true" className="hidden" />
              <span>Privacy Policy</span>
            </button>
            <span className="text-neutral-700">•</span>
            <button
              id="footer-link-terms"
              onClick={() => onOpenPolicy && onOpenPolicy('terms')}
              className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span aria-hidden="true" className="hidden" />
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
              <span aria-hidden="true" className="hidden" />
              <span>About Us</span>
            </button>
            <span className="text-neutral-700">•</span>
            <button
              id="footer-link-contact"
              onClick={() => onOpenPolicy && onOpenPolicy('contact')}
              className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span aria-hidden="true" className="hidden" />
              <span>Contact</span>
            </button>
            <span className="text-neutral-700">•</span>
            <button
              id="footer-link-guides"
              onClick={() => onOpenGuide && onOpenGuide()}
              className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1 text-rose-400/90 hover:text-rose-300"
            >
              <span aria-hidden="true" className="hidden" />
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
