import React from 'react';
import { Sparkles, Bot } from 'lucide-react';

interface CineBotLauncherProps {
  onOpen: () => void;
  isOpen: boolean;
}

export const CineBotLauncher: React.FC<CineBotLauncherProps> = ({ onOpen, isOpen }) => {
  if (isOpen) return null;

  return (
    <aside
      aria-label="CineBot AI Concierge Launcher"
      className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <button
        onClick={onOpen}
        className="group relative flex items-center gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-[#121218] via-[#1a131b] to-[#121218] hover:from-[#1c1824] hover:to-[#1a121d] text-white rounded-full border border-rose-500/40 shadow-[0_8px_30px_rgba(225,29,72,0.35)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.5)] transition-all transform hover:-translate-y-0.5 cursor-pointer"
        title="Open CineBot AI Movie Concierge"
      >
        {/* Pulsing indicator aura */}
        <div className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-md shadow-rose-950/40 shrink-0">
          <Sparkles className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#121218] animate-pulse"></span>
        </div>

        <div className="flex flex-col items-start pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
              CineBot AI
            </span>
            <span className="text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.2 rounded bg-rose-500/25 text-rose-300 border border-rose-500/30">
              Gemini
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 leading-none hidden sm:inline">
            Ask for movie recommendations
          </span>
        </div>
      </button>
    </aside>
  );
};
