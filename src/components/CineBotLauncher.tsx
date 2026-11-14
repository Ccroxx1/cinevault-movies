import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface CineBotLauncherProps {
  onOpen: () => void;
  isOpen: boolean;
}

export const CineBotLauncher: React.FC<CineBotLauncherProps> = ({ onOpen, isOpen }) => {
  const { colorMode } = useTheme();
  if (isOpen) return null;

  const isWhite = colorMode === 'white';
  const isBlueBlack = colorMode === 'blue-black';

  return (
    <aside
      aria-label="CineBot AI Concierge Launcher"
      className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <button
        id="cinebot-launcher-button"
        onClick={onOpen}
        aria-label="Open CineBot AI"
        title="Open CineBot AI"
        className={`cinebot-launcher-btn group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 aspect-square rounded-full border transition-all transform hover:-translate-y-0.5 hover:scale-105 active:scale-95 cursor-pointer shadow-lg select-none ${
          isWhite
            ? 'bg-white text-rose-600 border-rose-300 shadow-[0_10px_28px_rgba(225,29,72,0.2)] hover:bg-rose-50 hover:border-rose-400'
            : isBlueBlack
            ? 'bg-gradient-to-tr from-sky-600 via-sky-500 to-indigo-600 text-white border-sky-400/40 shadow-[0_8px_24px_rgba(56,189,248,0.35)] hover:shadow-[0_12px_32px_rgba(56,189,248,0.55)]'
            : 'bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-600 text-white border-rose-400/40 shadow-[0_8px_24px_rgba(225,29,72,0.45)] hover:shadow-[0_12px_32px_rgba(225,29,72,0.65)]'
        }`}
      >
        {/* Center text CB only */}
        <span
          className={`font-mono font-black text-xs sm:text-sm tracking-wider group-hover:scale-110 transition-transform leading-none ${
            isWhite ? 'text-rose-600' : 'text-white'
          }`}
        >
          CB
        </span>
      </button>
    </aside>
  );
};

