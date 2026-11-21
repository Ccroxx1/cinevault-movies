import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    let lastVisible = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const next = window.scrollY > 380;
          if (next !== lastVisible) {
            lastVisible = next;
            setIsVisible(next);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div
      className={`fixed bottom-18 sm:bottom-24 right-4 sm:right-5 z-35 transition-all duration-300 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-3 scale-90 pointer-events-none'
      }`}
    >
      <button
        type="button"
        onClick={scrollToTop}
        className="group relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full cv-surface-elevated border hover:bg-[var(--cv-surface-hover)] hover:border-[var(--cv-border-hover)] cv-text-secondary hover:text-[var(--cv-accent-text)] transition-all duration-200 transform hover:-translate-y-1 active:scale-95 cursor-pointer backdrop-blur-md"
        aria-label="Scroll back to top"
        title="Back to top"
      >
        <ChevronUp className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
        
        {/* Subtle hover tooltip */}
        <span className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none cv-surface-elevated border cv-text">
          Back to top
        </span>
      </button>
    </div>
  );
};
