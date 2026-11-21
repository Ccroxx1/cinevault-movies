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
  if (key.startsWith('rating')) return <Star className="w-3.5 h-3.5 cv-rating shrink-0" />;
  if (key === 'title_asc') return <ArrowDownAZ className="w-3.5 h-3.5 shrink-0" />;
  if (key === 'title_desc') return <ArrowUpZA className="w-3.5 h-3.5 shrink-0" />;
  if (key.startsWith('download')) return <TrendingUp className="w-3.5 h-3.5 cv-text-accent shrink-0" />;
  if (key.startsWith('like')) return <Heart className="w-3.5 h-3.5 cv-text-accent shrink-0" />;
  if (key.startsWith('seeds')) return <Zap className="w-3.5 h-3.5 text-[var(--cv-success-soft-fg)] shrink-0" />;
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
        className={`cv-card-interactive group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border shadow-xs select-none ${
          isOpen ? 'ring-2 ring-[var(--cv-focus-ring)]' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 cv-text-accent">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold uppercase tracking-wider cv-text-muted">
            Sort:
          </span>
        </div>

        <span className="font-bold tracking-tight truncate max-w-[130px] sm:max-w-[180px] cv-text">
          {currentOption.shortLabel}
        </span>

        {currentOption.badge && (
          <span className="cv-nav-soft-active hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border">
            {currentOption.badge}
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 cv-text-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180 cv-text-accent' : ''
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
          className="cv-card-interactive px-2.5 py-2 rounded-xl text-xs font-mono font-bold border cursor-pointer flex items-center justify-center shadow-xs"
        >
          <span className="text-[11px] font-bold cv-text-accent">
            {orderBy === 'desc' ? 'DESC ▾' : 'ASC ▴'}
          </span>
        </button>
      )}

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Movie sort options"
          className="cv-surface-elevated absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border z-50 overflow-hidden divide-y divide-[var(--cv-border-subtle)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header with Results Summary */}
          <div className="cv-surface-muted p-3 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider cv-text-muted flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 cv-text-accent" />
              <span>Sort Movies By</span>
            </span>
            {typeof totalResults === 'number' && (
              <span className="text-[10px] font-mono cv-text-muted">
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
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => handleSelectOption(opt)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectOption(opt);
                    }
                  }}
                  className={`group px-3 py-2.5 rounded-xl cursor-pointer transition-colors flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'cv-nav-soft-active font-bold border'
                      : 'cv-nav-pill'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="mt-0.5 opacity-90">
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
                              ? 'cv-btn-primary'
                              : 'cv-badge-neutral border'
                          }`}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <p className="text-[10px] line-clamp-1 mt-0.5 leading-tight cv-text-muted">
                          {opt.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 cv-text-accent shrink-0 self-center" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Shortcuts Footer */}
          <div className="cv-surface-muted p-2.5 flex items-center justify-between gap-1 text-[11px] cv-text-muted">
            <span className="text-[10px]">Popular shortcuts:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSelectOption(getSortOptionByKey('rating_desc'))}
                className="cv-rating-badge px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer transition-colors"
              >
                ★ Rating
              </button>
              <button
                type="button"
                onClick={() => handleSelectOption(getSortOptionByKey('year_desc'))}
                className="cv-nav-soft-active px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer transition-colors"
              >
                Release Date
              </button>
              <button
                type="button"
                onClick={() => handleSelectOption(getSortOptionByKey('title_asc'))}
                className="cv-badge-info px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer transition-colors"
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
