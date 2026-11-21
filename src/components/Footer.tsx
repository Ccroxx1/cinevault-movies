import React from 'react';
import { CineVaultLogo } from './CineVaultLogo';
import { VisitorCountBadge } from './VisitorCountBadge';

interface FooterProps {
  onNavigateHome?: () => void;
  onOpenPolicy?: (tab: 'privacy' | 'terms' | 'about' | 'contact' | 'dmca' | 'agreement') => void;
  onOpenGuide?: () => void;
  onOpenShortcuts?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateHome,
  onOpenPolicy,
  onOpenGuide,
  onOpenShortcuts
}) => {
  return (
    <footer id="cinevault-footer" className="cv-footer w-full border-t mt-16 py-10 text-xs" role="contentinfo">
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
              aria-label="CineVault Home"
            >
              <CineVaultLogo variant="header" size="sm" showTagline={true} />
            </a>
          </div>

          {/* Compliance & Policy Links (Crawlable Anchor Links for Search Engines) */}
          <nav aria-label="Legal and Navigation Links" className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4 text-xs cv-text-secondary">
            <a
              id="footer-link-privacy"
              href="/privacy-policy"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  onOpenPolicy && onOpenPolicy('privacy');
                }
              }}
              className="hover:text-[var(--cv-accent-text)] transition-colors cursor-pointer"
            >
              Privacy Policy
            </a>
            <span className="cv-text-subtle" aria-hidden="true">•</span>
            <a
              id="footer-link-terms"
              href="/privacy?tab=terms"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  onOpenPolicy && onOpenPolicy('terms');
                }
              }}
              className="hover:text-[var(--cv-accent-text)] transition-colors cursor-pointer"
            >
              Terms of Service
            </a>
            <span className="cv-text-subtle" aria-hidden="true">•</span>
            <a
              id="footer-link-dmca"
              href="/privacy?tab=dmca"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  onOpenPolicy && onOpenPolicy('dmca');
                }
              }}
              className="hover:text-[var(--cv-accent-text)] transition-colors cursor-pointer"
            >
              DMCA
            </a>
            <span className="cv-text-subtle" aria-hidden="true">•</span>
            <a
              id="footer-link-about"
              href="/privacy?tab=about"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  onOpenPolicy && onOpenPolicy('about');
                }
              }}
              className="hover:text-[var(--cv-accent-text)] transition-colors cursor-pointer"
            >
              About Us
            </a>
            <span className="cv-text-subtle" aria-hidden="true">•</span>
            <a
              id="footer-link-contact"
              href="/privacy?tab=contact"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  onOpenPolicy && onOpenPolicy('contact');
                }
              }}
              className="hover:text-[var(--cv-accent-text)] transition-colors cursor-pointer"
            >
              Contact
            </a>
            <span className="cv-text-subtle" aria-hidden="true">•</span>
            <a
              id="footer-link-sitemap"
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--cv-accent-text)] transition-colors"
            >
              Sitemap
            </a>
            <span className="cv-text-subtle" aria-hidden="true">•</span>
            <a
              id="footer-link-llms"
              href="/llms.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--cv-accent-text)] transition-colors"
              title="Machine-readable specification for AI crawlers"
            >
              llms.txt
            </a>
            <span className="cv-text-subtle" aria-hidden="true">•</span>
            <button
              id="footer-link-guides"
              onClick={() => onOpenGuide && onOpenGuide()}
              className="cv-text-accent hover:underline font-semibold transition-colors cursor-pointer"
            >
              Guides
            </button>
            {onOpenShortcuts && (
              <>
                <span className="cv-text-subtle" aria-hidden="true">•</span>
                <button
                  id="footer-link-shortcuts"
                  onClick={onOpenShortcuts}
                  className="hover:text-[var(--cv-text)] transition-colors cursor-pointer flex items-center gap-1 cv-text-secondary"
                  title="Keyboard Shortcuts (?)"
                >
                  <span>Shortcuts</span>
                  <kbd className="cv-kbd px-1 text-[9px] font-mono border rounded">?</kbd>
                </button>
              </>
            )}
          </nav>

        </div>

        {/* Middle Tier: Visitor Metrics */}
        <div id="footer-visitor-tier" className="pt-4 border-t cv-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <VisitorCountBadge variant="full" />
          <div className="cv-badge-success inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true"></span>
            <span>Status: Index Mirrors Operational</span>
          </div>
        </div>

        {/* Bottom Tier: Disclaimer, Copyright & User Agreement Notice */}
        <div className="pt-4 border-t cv-border-subtle space-y-3 text-[11px] text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="cv-text-muted max-w-2xl">
              CineVault operates strictly as a metadata directory and film indexer. Content is aggregated from public REST APIs for informational and discovery purposes.
            </p>
            <p className="cv-text-subtle whitespace-nowrap">
              CineVault By Sasuu © 2026. All rights reserved.
            </p>
          </div>

          <div className="pt-2 border-t cv-border-subtle cv-text-muted leading-relaxed text-center">
            <p id="footer-user-agreement-notice">
              By using this site you agree to and accept our User Agreement, which can be read{' '}
              <button
                type="button"
                id="footer-link-user-agreement"
                onClick={() => onOpenPolicy && onOpenPolicy('agreement')}
                className="cv-text-accent hover:underline font-semibold cursor-pointer transition-colors"
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
