import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Info, Mail, Lock } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#101010] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#141414]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Legal & Compliance Center
              </h3>
              <p className="text-xs text-neutral-400">
                Google AdSense & Web Standards Compliance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#0d0d0d] px-4 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </button>

          <button
            onClick={() => setActiveTab('agreement')}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'agreement'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>User Agreement</span>
          </button>

          <button
            onClick={() => setActiveTab('dmca')}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'dmca'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>DMCA & Copyright</span>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'about'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>About Us</span>
          </button>

          <button
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'contact'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Contact</span>
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-neutral-300 leading-relaxed flex-1">
          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <h4 className="text-base font-bold text-white">Privacy Policy</h4>
              <p>
                Last updated: January 2026. At <strong>CineVault By Sasuu</strong>, accessible from our official website and mirrors, one of our main priorities is the privacy of our visitors. This Privacy Policy document outlines the types of information that is collected and recorded by CineVault and how we use it.
              </p>
              <h5 className="text-sm font-bold text-white pt-2">1. Log Files & Analytics</h5>
              <p>
                CineVault follows a standard procedure of using log files and client-side web storage (LocalStorage). These files log visitors when they visit websites for analytics, performance, and preserving your custom Watchlist.
              </p>
              <h5 className="text-sm font-bold text-white pt-2">2. Google DoubleClick DART Cookie & Advertising Partners</h5>
              <p>
                Google is one of the third-party vendors on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to www.website.com and other sites on the internet. You may choose to decline the use of DART cookies by visiting the Google ad and content network Privacy Policy.
              </p>
              <h5 className="text-sm font-bold text-white pt-2">3. GDPR & CCPA Compliance</h5>
              <p>
                We do not collect personally identifiable information (PII) without your consent. Users have the right to request deletion of any cached preferences at any time.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3">
              <h4 className="text-base font-bold text-white">Terms of Service</h4>
              <p>
                By accessing this website, you agree to be bound by these website Terms of Use, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
              </p>
              <h5 className="text-sm font-bold text-white pt-2">Educational & Indexing Disclaimer</h5>
              <p>
                CineVault By Sasuu operates strictly as a metadata directory and film indexer utilizing open REST APIs. We do not host, store, or upload media files on our own servers. All content provided is for informational, review, and educational discovery purposes.
              </p>
              <h5 className="text-sm font-bold text-white pt-2">Permitted Use</h5>
              <p>
                You may browse movie summaries, watch trailers, review age ratings, and organize personal bookmarks for personal non-commercial viewing.
              </p>
            </div>
          )}

          {activeTab === 'agreement' && (
            <div className="space-y-3">
              <h4 className="text-base font-bold text-white">CineVault User Agreement</h4>
              <p className="text-rose-400 font-medium">
                By using this site, you agree to and accept our User Agreement.
              </p>
              <p>
                CineVault provides movie information, descriptions, trailers, images, ratings, and links to third-party services for informational and entertainment purposes.
              </p>
              <p>
                You agree to use CineVault only for lawful purposes and in accordance with applicable laws. You must not use the site to infringe copyright, distribute unauthorized content, interfere with the operation of the site, or attempt to gain unauthorized access to our systems.
              </p>
              <p>
                CineVault does not claim ownership of third-party content, trademarks, movie titles, images, or other materials that belong to their respective copyright and trademark owners. Where applicable, such materials are used for identification, informational, or promotional purposes.
              </p>
              <p>
                Links to third-party websites or services are provided for convenience. CineVault does not control or guarantee the availability, accuracy, security, or content of external websites, and your use of those services is subject to their own terms and policies.
              </p>
              <p>
                CineVault may update, modify, suspend, or remove features or content at any time without prior notice.
              </p>
              <p className="text-neutral-400 font-medium">
                If you do not agree with this User Agreement, please discontinue using CineVault.
              </p>
              <p className="p-3 rounded-xl bg-white/5 border border-white/10 text-neutral-300 text-xs sm:text-sm">
                By continuing to use CineVault, you acknowledge that you have read, understood, and accepted these terms.
              </p>
            </div>
          )}

          {activeTab === 'dmca' && (
            <div className="space-y-3">
              <h4 className="text-base font-bold text-white">DMCA & Copyright Notice</h4>
              <p>
                CineVault respects the intellectual property rights of others and complies with the Digital Millennium Copyright Act (DMCA).
              </p>
              <p>
                We do not host any copyrighted video files or media on our servers. All information displayed (titles, descriptions, posters, and YouTube trailer links) is aggregated from public web APIs.
              </p>
              <h5 className="text-sm font-bold text-white pt-2">Takedown Inquiries</h5>
              <p>
                If you are a copyright owner or an agent thereof and believe that any content indexed on this platform infringes upon your copyright, you may submit a notification pursuant to the DMCA to our contact email: <span className="text-rose-400 font-mono">prospersasuu808@gmail.com</span> with specific URLs and documentation.
              </p>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-3">
              <h4 className="text-base font-bold text-white">About CineVault By Sasuu</h4>
              <p>
                CineVault By Sasuu is an online cinematic directory crafted to make movie discovery fast, clean, and accessible.
              </p>
              <p>
                Our platform delivers:
              </p>
              <ul className="list-disc list-inside space-y-1 text-neutral-300 pl-2">
                <li>Instant access to official high-definition movie trailers and teasers</li>
                <li>Comprehensive IMDb audience ratings and Rotten Tomatoes data</li>
                <li>Curated genre indexing (Action, Sci-Fi, Drama, Documentary, 4K UHD, and more)</li>
                <li>Cast lists, directors, plot synopses, and parental certification guides</li>
                <li>Client-side personal Watchlist management</li>
              </ul>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-3">
              <h4 className="text-base font-bold text-white">Contact & Inquiries</h4>
              <p>
                Have questions, feature suggestions, or feedback about CineVault By Sasuu? We'd love to hear from you.
              </p>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Mail className="w-4 h-4 text-rose-500" />
                  <span>Email Support:</span>
                </div>
                <p className="font-mono text-rose-400 text-xs sm:text-sm">
                  prospersasuu808@gmail.com
                </p>
                <p className="text-[11px] text-neutral-400 pt-1">
                  Response time: Usually within 24–48 hours.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#141414] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
          >
            I Understand & Close
          </button>
        </div>

      </div>
    </div>
  );
};
