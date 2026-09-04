import React, { useState } from 'react';

interface AdSensePolicyModalProps {
  initialTab?: 'privacy' | 'terms' | 'about' | 'contact' | 'dmca' | 'agreement';
  onClose: () => void;
}

export const AdSensePolicyModal: React.FC<AdSensePolicyModalProps> = ({
  initialTab = 'privacy',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'about' | 'contact' | 'dmca' | 'agreement'>(initialTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn" role="dialog" aria-labelledby="modal-heading">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#101010] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#141414]">
          <div>
            <h2 id="modal-heading" className="text-base font-bold text-white">
              Legal & Compliance Center
            </h2>
            <p className="text-xs text-neutral-400">
              CineVault Site Policies & Authoritative Information
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            Close
          </button>
        </div>

        <nav className="flex border-b border-white/10 bg-[#0d0d0d] px-4 overflow-x-auto gap-1" aria-label="Policy tabs">
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
              className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-neutral-300 leading-relaxed flex-1">
          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white">Privacy Policy</h3>
              <p>Last updated: August 2026.</p>
              <p>At CineVault, accessible from our official website, we prioritize the privacy of our visitors. This policy outlines how we handle data.</p>
              <h4 className="text-sm font-bold text-white pt-2">1. Cookies & Tracking</h4>
              <p>We use standard client-side web storage (LocalStorage) to maintain your personalized watchlist and browsing preferences. We do not use these to track you across other websites.</p>
              <h4 className="text-sm font-bold text-white pt-2">2. Third-Party Advertising</h4>
              <p>Google, as a third-party vendor, uses cookies (DART cookies) to serve ads based on your visit to this and other sites. You can opt out of these by visiting the Google Ad and Content Network Privacy Policy.</p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white">Terms of Service</h3>
              <p>By using CineVault, you agree to comply with all applicable local and international laws. CineVault is provided "as is" without warranty.</p>
              <h4 className="text-sm font-bold text-white pt-2">Metadata Indexing Only</h4>
              <p>CineVault operates strictly as a metadata directory and film indexer. We aggregate data from public REST APIs for informational and educational purposes. We do not host, store, or upload media files on our servers.</p>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white">About CineVault</h3>
              <p>CineVault is an authoritative cinematic directory dedicated to simplifying movie discovery. Our platform is built and maintained by Sasuu, an independent developer focused on creating high-performance web experiences.</p>
              <p>Our core mission is to provide a clean, ad-compliant, and feature-rich interface for exploring the world of cinema through legitimate public metadata APIs.</p>
              <h4 className="text-sm font-bold text-white pt-2">Our Standards</h4>
              <ul className="list-disc list-inside space-y-1 text-neutral-300 pl-2">
                <li>High-quality metadata verification</li>
                <li>Full mobile responsiveness and accessibility</li>
                <li>Strict adherence to web standards and user privacy</li>
                <li>Zero hosting of copyrighted media</li>
              </ul>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white">Contact & Support</h3>
              <p>For inquiries, support, or feedback, please contact our administrative team. We aim to respond to all legitimate requests within 48 hours.</p>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <p className="text-white font-semibold">Official Contact Email:</p>
                <p className="font-mono text-rose-400">prospersasuu808@gmail.com</p>
                <p className="text-[11px] text-neutral-400">Publisher: CineVault by Sasuu</p>
              </div>
            </div>
          )}

          {activeTab === 'dmca' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white">DMCA & Copyright Notice</h3>
              <p>CineVault respects intellectual property rights. All content displayed (posters, trailers, synopses) is sourced from public APIs for identification and review purposes.</p>
              <p>If you represent a copyright owner and have concerns about specific metadata indexed on our site, please send a formal DMCA notification to <span className="text-rose-400 font-mono">prospersasuu808@gmail.com</span> with specific URLs and proof of ownership.</p>
            </div>
          )}

          {activeTab === 'agreement' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white">User Agreement</h3>
              <p>By using this website, you acknowledge that CineVault is a search engine and directory. You are responsible for how you use the information provided. Use of third-party services linked from this site is subject to their own respective terms and policies.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-[#141414] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
