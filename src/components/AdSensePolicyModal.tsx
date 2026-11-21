import React, { useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface AdSensePolicyModalProps {
  initialTab?: 'privacy' | 'terms' | 'about' | 'contact' | 'dmca' | 'agreement';
  onClose: () => void;
}

export const AdSensePolicyModal: React.FC<AdSensePolicyModalProps> = ({
  initialTab = 'privacy',
  onClose
}) => {
  useBodyScrollLock(true);
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'about' | 'contact' | 'dmca' | 'agreement'>(initialTab);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-fadeIn"
      style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
    >
      <div className="modal-dialog-surface cv-surface-elevated border relative w-full max-w-3xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between px-5 py-4 border-b cv-border cv-surface-muted">
          <div>
            <h2 id="modal-heading" className="text-base font-bold cv-text">
              Legal &amp; Compliance Center
            </h2>
            <p className="text-xs cv-text-muted">
              CineVault Site Policies &amp; Authoritative Information
            </p>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg cv-btn-secondary transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            Close
          </button>
        </div>

        <nav className="flex border-b cv-border cv-card px-4 overflow-x-auto gap-1" aria-label="Policy tabs">
          {[
            { id: 'privacy', label: 'Privacy Policy' },
            { id: 'terms', label: 'Terms of Service' },
            { id: 'agreement', label: 'User Agreement' },
            { id: 'dmca', label: 'DMCA' },
            { id: 'about', label: 'About Us' },
            { id: 'contact', label: 'Contact' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[var(--cv-nav-active-bg)] cv-text-accent'
                  : 'border-transparent cv-text-muted hover:text-[var(--cv-text)]'
              }`}
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm cv-text-secondary leading-relaxed flex-1">
          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold cv-text">Privacy Policy</h3>
              <p className="cv-text-muted">Last updated: September 2026.</p>
              <p>At CineVault (<a href="https://www.moviesandseries.xyz" className="cv-text-accent underline">moviesandseries.xyz</a>), accessible from our official website, the privacy of our visitors is one of our top priorities. This Privacy Policy document outlines the types of information collected and recorded by CineVault and how we use it.</p>
              
              <h4 className="text-sm font-bold cv-text pt-2">1. Ezoic Service Privacy Policy &amp; Ad Serving</h4>
              <p>This website uses the services of Ezoic Inc. (&quot;Ezoic&quot;) for advertising optimization, analytics, and site personalization. Ezoic employs various technologies to serve tailored advertisements and enhance user experience. A comprehensive overview of Ezoic’s privacy practices and how your data is processed by Ezoic can be found at <a href="https://www.ezoic.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="cv-text-accent underline">https://www.ezoic.com/privacy-policy/</a>.</p>
              
              <h4 className="text-sm font-bold cv-text pt-2">2. Cookies, Consent &amp; Gatekeeper CMP</h4>
              <p>We use cookies, web beacons, and local browser storage (LocalStorage) to remember your movie watchlist, dark mode preferences, and session state. Third-party vendors, including Ezoic and Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</p>
              <p>Our website utilizes the Gatekeeper Consent Management Platform (CMP) to collect and manage user consent in accordance with the EU General Data Protection Regulation (GDPR) and the ePrivacy Directive. You can review or modify your consent choices at any time through the on-site consent tool.</p>

              <h4 className="text-sm font-bold cv-text pt-2">3. Advertising Partners (Adsterra &amp; Third-Party Networks)</h4>
              <p>We partner with third-party advertising networks, including Adsterra and programmatic advertising partners, to display non-intrusive native banner, social bar, and sponsored links. These partners may use cookies or similar technologies to measure ad effectiveness and personalize ad frequency. You can manage or disable cookies via your browser settings.</p>

              <h4 className="text-sm font-bold cv-text pt-2">4. CCPA &amp; GDPR Privacy Rights</h4>
              <p>Under the GDPR and CCPA (California Consumer Privacy Act), users have the right to request access to personal data collected, request rectification or erasure of their personal data, and opt out of the sale or sharing of personal data. We do not sell personal identification information to third parties.</p>

              <h4 className="text-sm font-bold cv-text pt-2">5. Contact Information</h4>
              <p>If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us at <span className="font-mono cv-text-accent">prospersasuu808@gmail.com</span>.</p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold cv-text">Terms of Service</h3>
              <p>By using CineVault, you agree to comply with all applicable local and international laws. CineVault is provided &quot;as is&quot; without warranty.</p>
              <h4 className="text-sm font-bold cv-text pt-2">Metadata Indexing Only</h4>
              <p>CineVault operates strictly as a metadata directory and film indexer. We aggregate data from public REST APIs for informational and educational purposes. We do not host, store, or upload media files on our servers.</p>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold cv-text">About CineVault</h3>
              <p>CineVault is an authoritative cinematic directory dedicated to simplifying movie discovery. Our platform is built and maintained by Sasuu, an independent developer focused on creating high-performance web experiences.</p>
              <p>Our core mission is to provide a clean, ad-compliant, and feature-rich interface for exploring the world of cinema through legitimate public metadata APIs.</p>
              <h4 className="text-sm font-bold cv-text pt-2">Our Standards</h4>
              <ul className="list-disc list-inside space-y-1 cv-text-secondary pl-2">
                <li>High-quality metadata verification</li>
                <li>Full mobile responsiveness and accessibility</li>
                <li>Strict adherence to web standards and user privacy</li>
                <li>Zero hosting of copyrighted media</li>
              </ul>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold cv-text">Contact &amp; Support</h3>
              <p>For inquiries, support, or feedback, please contact our administrative team. We aim to respond to all legitimate requests within 48 hours.</p>
              <div className="p-4 rounded-xl cv-surface-muted border space-y-2">
                <p className="cv-text font-semibold">Official Contact Email:</p>
                <p className="font-mono cv-text-accent">prospersasuu808@gmail.com</p>
                <p className="text-[11px] cv-text-muted">Publisher: CineVault by Sasuu</p>
              </div>
            </div>
          )}

          {activeTab === 'dmca' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold cv-text">DMCA &amp; Copyright Notice</h3>
              <p>CineVault respects intellectual property rights. All content displayed (posters, trailers, synopses) is sourced from public APIs for identification and review purposes.</p>
              <p>If you represent a copyright owner and have concerns about specific metadata indexed on our site, please send a formal DMCA notification to <span className="cv-text-accent font-mono">prospersasuu808@gmail.com</span> with specific URLs and proof of ownership.</p>
            </div>
          )}

          {activeTab === 'agreement' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold cv-text">User Agreement</h3>
              <p>By using this website, you acknowledge that CineVault is a search engine and directory. You are responsible for how you use the information provided. Use of third-party services linked from this site is subject to their own respective terms and policies.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t cv-border cv-surface-muted flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl cv-btn-primary font-bold text-xs transition-colors cursor-pointer"
          >
            Acknowledge &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
