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
      <div className="cv-surface-elevated backdrop-blur-xl border rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="cv-nav-soft-active w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold cv-text tracking-tight">
                Versus Mode ({comparisonList.length}/3)
              </span>
              <span className="cv-nav-soft-active text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold">
                Active
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {comparisonList.map((m) => (
                <div
                  key={m.id}
                  className="group relative flex items-center gap-1.5 px-2 py-0.5 rounded-lg cv-surface-muted border text-[11px] cv-text-secondary max-w-[120px]"
                >
                  <Film className="w-3 h-3 cv-text-accent shrink-0" aria-hidden="true" />
                  <span className="truncate">{m.title}</span>
                  <button
                    type="button"
                    onClick={() => removeFromComparison(m.id)}
                    className="cv-text-muted hover:text-[var(--cv-text)] p-0.5 transition cursor-pointer"
                    title={`Remove ${m.title}`}
                    aria-label={`Remove ${m.title}`}
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
            type="button"
            onClick={() => setIsOpen(true)}
            className="cv-btn-primary flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs shadow-lg transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Compare</span>
          </button>
          <button
            type="button"
            onClick={clearComparison}
            className="cv-btn-secondary p-2 rounded-xl text-xs transition cursor-pointer"
            title="Clear all"
            aria-label="Clear all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
