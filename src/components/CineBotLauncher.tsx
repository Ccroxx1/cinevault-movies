import React from 'react';
import { Sparkles } from 'lucide-react';
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
      className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <button
        id="cinebot-launcher-button"
        onClick={onOpen}
        className={`cinebot-launcher-btn group relative flex items-center gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full border transition-all transform hover:-translate-y-0.5 cursor-pointer ${
          isWhite
            ? 'bg-white hover:bg-slate-50 text-slate-900 border-rose-500/40 shadow-[0_8px_30px_rgba(225,29,72,0.2)] hover:shadow-[0_12px_36px_rgba(225,29,72,0.3)]'
            : isBlueBlack
            ? 'bg-gradient-to-r from-[#0b142c] via-[#0f1d3d] to-[#0b142c] hover:from-[#112248] hover:to-[#101f3e] text-white border-sky-400/40 shadow-[0_8px_30px_rgba(56,189,248,0.25)] hover:shadow-[0_12px_40px_rgba(56,189,248,0.4)]'
            : 'bg-gradient-to-r from-[#121218] via-[#1a131b] to-[#121218] hover:from-[#1c1824] hover:to-[#1a121d] text-white border-rose-500/40 shadow-[0_8px_30px_rgba(225,29,72,0.35)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.5)]'
        }`}
        title="Open CineBot AI Movie Concierge"
      >
        {/* Pulsing indicator aura */}
        <div className={`relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-md shrink-0 ${
          isWhite
            ? 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-rose-500/30'
            : isBlueBlack
            ? 'bg-gradient-to-tr from-sky-500 to-rose-500 text-white shadow-sky-950/50'
            : 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-rose-950/40'
        }`}>
          <Sparkles className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
          <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 animate-pulse ${
            isWhite ? 'border-white' : isBlueBlack ? 'border-[#0b142c]' : 'border-[#121218]'
          }`}></span>
        </div>

        <div className="flex flex-col items-start pr-1">
          <div className="flex items-center gap-1.5">
            <span className={`cinebot-launcher-title text-xs sm:text-sm font-bold transition-colors ${
              isWhite
                ? 'text-slate-900 group-hover:text-rose-600'
                : isBlueBlack
                ? 'text-white group-hover:text-sky-300'
                : 'text-white group-hover:text-rose-300'
            }`}>
              CineBot AI
            </span>
            <span className={`cinebot-launcher-badge text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.2 rounded border ${
              isWhite
                ? 'bg-rose-100 text-rose-700 border-rose-300'
                : isBlueBlack
                ? 'bg-sky-500/25 text-sky-300 border-sky-400/30'
                : 'bg-rose-500/25 text-rose-300 border-rose-500/30'
            }`}>
              Gemini
            </span>
          </div>
          <span className={`cinebot-launcher-sub text-[10px] leading-none hidden sm:inline ${
            isWhite
              ? 'text-slate-500'
              : isBlueBlack
              ? 'text-slate-400'
              : 'text-neutral-400'
          }`}>
            Ask for movie recommendations
          </span>
        </div>
      </button>
    </aside>
  );
};
