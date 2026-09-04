import React from 'react';
import { ArrowLeftRight, X, Sparkles, Film } from 'lucide-react';
import { useMovieComparison } from '../context/MovieComparisonContext';

export const MovieComparisonBar: React.FC = () => {
  const { comparisonList, removeFromComparison, clearComparison, setIsOpen } = useMovieComparison();

  if (comparisonList.length === 0) return null;

  return (
    <aside
      aria-label="Movie Comparison Tray"
      className="fixed bottom-6 right-6 z-40 max-w-lg w-full px-4 sm:px-0 animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="bg-[#0e0e0e]/95 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-black/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight">
                Versus Mode ({comparisonList.length}/3)
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-600/30 text-rose-300">
                Active
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {comparisonList.map((m) => (
                <div
                  key={m.id}
                  className="group relative flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-neutral-300 max-w-[120px]"
                >
                  <Film className="w-3 h-3 text-rose-400 shrink-0" />
                  <span className="truncate">{m.title}</span>
                  <button
                    onClick={() => removeFromComparison(m.id)}
                    className="text-neutral-400 hover:text-white p-0.5 transition cursor-pointer"
                    title={`Remove ${m.title}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Compare</span>
          </button>
          <button
            onClick={clearComparison}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 text-xs transition cursor-pointer"
            title="Clear all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
