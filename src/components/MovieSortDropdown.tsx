import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  Check,
  Calendar,
  Star,
  ArrowDownAZ,
  ArrowUpZA,
  TrendingUp,
  Heart,
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  MOVIE_SORT_OPTIONS,
  SortOptionItem,
  getSortOptionKey,
  getSortOptionByKey
} from '../services/movieApi';
import { useTheme } from '../context/ThemeContext';

interface MovieSortDropdownProps {
  sortBy: string;
  orderBy?: 'desc' | 'asc';
  onSortChange: (sortBy: string, orderBy: 'desc' | 'asc') => void;
  className?: string;
  showDirectionToggle?: boolean;
  totalResults?: number;
  isLoading?: boolean;
}

const getSortIcon = (key: string) => {
  if (key.startsWith('year')) return <Calendar className="w-3.5 h-3.5 shrink-0" />;
  if (key.startsWith('rating')) return <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  if (key === 'title_asc') return <ArrowDownAZ className="w-3.5 h-3.5 shrink-0" />;
  if (key === 'title_desc') return <ArrowUpZA className="w-3.5 h-3.5 shrink-0" />;
  if (key.startsWith('download')) return <TrendingUp className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
  if (key.startsWith('like')) return <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  if (key.startsWith('seeds')) return <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  return <Clock className="w-3.5 h-3.5 shrink-0" />;
};

export const MovieSortDropdown: React.FC<MovieSortDropdownProps> = ({
  sortBy,
  orderBy = 'desc',
  onSortChange,
  className = '',
  showDirectionToggle = true,
  totalResults,
  isLoading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { colorMode } = useTheme();
  const isWhite = colorMode === 'white';
  const isBlueBlack = colorMode === 'blue-black';

  const currentKey = getSortOptionKey(sortBy, orderBy);
  const currentOption = getSortOptionByKey(currentKey);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectOption = useCallback((option: SortOptionItem) => {
    onSortChange(option.sortBy, option.orderBy);
    setIsOpen(false);
  }, [onSortChange]);

  const handleToggleDirection = useCallback(() => {
    // Invert the current direction for the active sort field
    const newOrder: 'desc' | 'asc' = orderBy === 'desc' ? 'asc' : 'desc';
    onSortChange(sortBy, newOrder);
  }, [sortBy, orderBy, onSortChange]);

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-flex items-center gap-1.5 ${className}`}
      aria-label="Sort movies"
    >
      {/* Main Sort Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Sort movie catalog"
        className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-xs select-none ${
          isWhite
            ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
            : isBlueBlack
            ? 'bg-[#0b1329] hover:bg-[#0f1b3b] text-sky-100 border-sky-900/40 hover:border-sky-700/60'
            : 'bg-[#141414] hover:bg-[#1a1a1a] text-neutral-200 hover:text-white border-white/10 hover:border-white/20'
        } ${isOpen ? 'ring-2 ring-rose-500/40' : ''}`}
      >
        <div className="flex items-center gap-1.5 text-rose-500">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span className={`text-[11px] font-bold uppercase tracking-wider ${
            isWhite ? 'text-slate-500' : 'text-neutral-400'
          }`}>
            Sort:
          </span>
        </div>

        <span className="font-bold tracking-tight truncate max-w-[130px] sm:max-w-[180px]">
          {currentOption.shortLabel}
        </span>

        {currentOption.badge && (
          <span className={`hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
            isWhite
              ? 'bg-rose-50 text-rose-600 border border-rose-200'
              : isBlueBlack
              ? 'bg-sky-950/60 text-sky-300 border border-sky-800/40'
              : 'bg-white/10 text-neutral-300 border border-white/10'
          }`}>
            {currentOption.badge}
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-rose-500' : ''
          }`}
        />
      </button>

      {/* Quick Direction Inverter Button (A-Z <-> Z-A, Newest <-> Oldest) */}
      {showDirectionToggle && (
        <button
          type="button"
          onClick={handleToggleDirection}
          title={orderBy === 'desc' ? 'Currently Descending (click to switch to Ascending)' : 'Currently Ascending (click to switch to Descending)'}
          aria-label={`Toggle sort order direction. Currently ${orderBy === 'desc' ? 'Descending' : 'Ascending'}`}
          className={`px-2.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer flex items-center justify-center shadow-xs ${
            isWhite
              ? 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200'
              : isBlueBlack
              ? 'bg-[#0b1329] hover:bg-[#0f1b3b] text-sky-200 border-sky-900/40'
              : 'bg-[#141414] hover:bg-[#1a1a1a] text-neutral-300 hover:text-white border-white/10'
          }`}
        >
          <span className="text-[11px] font-bold text-rose-500">
            {orderBy === 'desc' ? 'DESC ▾' : 'ASC ▴'}
          </span>
        </button>
      )}

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Movie sort options"
          className={`absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 ${
            isWhite
              ? 'bg-white/95 border-slate-200 divide-y divide-slate-100 text-slate-800'
              : isBlueBlack
              ? 'bg-[#091124]/95 border-sky-900/50 divide-y divide-sky-900/30 text-neutral-100'
              : 'bg-[#121212]/95 border-white/15 divide-y divide-white/5 text-neutral-100'
          }`}
        >
          {/* Header with Results Summary */}
          <div className="p-3 bg-black/10 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-rose-500" />
              <span>Sort Movies By</span>
            </span>
            {typeof totalResults === 'number' && (
              <span className="text-[10px] font-mono text-neutral-400">
                {isLoading ? 'Updating...' : `${totalResults.toLocaleString()} titles`}
              </span>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
            {MOVIE_SORT_OPTIONS.map((opt) => {
              const isSelected = opt.key === currentKey;
              return (
                <div
                  key={opt.key}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectOption(opt)}
                  className={`group px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? isWhite
                        ? 'bg-rose-50 text-rose-900 font-bold border border-rose-200'
                        : isBlueBlack
                        ? 'bg-sky-950/70 text-sky-200 font-bold border border-sky-800/50'
                        : 'bg-rose-600/20 text-white font-bold border border-rose-500/30'
                      : isWhite
                      ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                      : isBlueBlack
                      ? 'hover:bg-sky-900/30 text-sky-100/80 hover:text-white'
                      : 'hover:bg-white/5 text-neutral-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="mt-0.5 opacity-80">
                      {getSortIcon(opt.key)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate leading-tight">
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shrink-0 ${
                            isSelected
                              ? 'bg-rose-600 text-white'
                              : isWhite
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-white/10 text-neutral-400'
                          }`}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <p className={`text-[10px] line-clamp-1 mt-0.5 leading-tight ${
                          isSelected
                            ? isWhite ? 'text-rose-700/80' : 'text-rose-300/80'
                            : isWhite ? 'text-slate-500' : 'text-neutral-400'
                        }`}>
                          {opt.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-rose-500 shrink-0 self-center" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Shortcuts Footer */}
          <div className="p-2.5 bg-black/15 flex items-center justify-between gap-1 text-[11px] text-neutral-400">
            <span className="text-[10px]">Popular shortcuts:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSelectOption(getSortOptionByKey('rating_desc'))}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[10px] text-amber-400 font-semibold cursor-pointer transition-colors"
              >
                ★ Rating
              </button>
              <button
                type="button"
                onClick={() => handleSelectOption(getSortOptionByKey('year_desc'))}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[10px] text-rose-400 font-semibold cursor-pointer transition-colors"
              >
                Release Date
              </button>
              <button
                type="button"
                onClick={() => handleSelectOption(getSortOptionByKey('title_asc'))}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[10px] text-sky-400 font-semibold cursor-pointer transition-colors"
              >
                A - Z
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
