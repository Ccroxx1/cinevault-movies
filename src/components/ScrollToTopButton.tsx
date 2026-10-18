import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { colorMode } = useTheme();

  const isWhite = colorMode === 'white';
  const isBlueBlack = colorMode === 'blue-black';

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsVisible(window.scrollY > 380);
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
      className={`fixed bottom-20 sm:bottom-24 right-5 sm:right-6 z-35 transition-all duration-300 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-3 scale-90 pointer-events-none'
      }`}
    >
      <button
        onClick={scrollToTop}
        className={`group relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full border transition-all duration-200 transform hover:-translate-y-1 active:scale-95 cursor-pointer backdrop-blur-md ${
          isWhite
            ? 'bg-white/95 hover:bg-slate-50 text-slate-700 hover:text-rose-600 border-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_28px_rgba(225,29,72,0.18)]'
            : isBlueBlack
            ? 'bg-[#091124]/90 hover:bg-[#0f1d3d] text-slate-300 hover:text-sky-300 border-sky-400/25 shadow-[0_8px_24px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_32px_rgba(56,189,248,0.25)]'
            : 'bg-[#121216]/90 hover:bg-[#1c1c24] text-neutral-300 hover:text-rose-400 border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.7)] hover:shadow-[0_12px_32px_rgba(225,29,72,0.25)]'
        }`}
        aria-label="Scroll back to top"
        title="Back to top"
      >
        <ChevronUp className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
        
        {/* Subtle hover tooltip */}
        <span
          className={`absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-md ${
            isWhite
              ? 'bg-slate-900 text-white'
              : isBlueBlack
              ? 'bg-[#060b17] border border-sky-400/20 text-sky-200'
              : 'bg-[#0a0a0a] border border-white/10 text-neutral-200'
          }`}
        >
          Back to top
        </span>
      </button>
    </div>
  );
};
