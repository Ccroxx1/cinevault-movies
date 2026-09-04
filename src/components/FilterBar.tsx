import React, { useState, useEffect } from 'react';
import { FilterParams } from '../types';
import {
  GENRES,
  QUALITIES,
  RATING_OPTIONS,
  YEAR_OPTIONS,
  DECADE_OPTIONS,
  RUNTIME_OPTIONS,
  CODEC_AUDIO_OPTIONS,
  LANGUAGE_OPTIONS,
  SORT_OPTIONS,
} from '../services/movieApi';
import { SlidersHorizontal, RotateCcw, Search, Clock, Film, Sparkles, Volume2, CalendarRange } from 'lucide-react';

interface FilterBarProps {
  filters: FilterParams;
  onFilterChange: (newFilters: Partial<FilterParams>) => void;
  totalResults: number;
  isLoading: boolean;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  totalResults,
  isLoading,
  onReset,
}) => {
  const [searchTerm, setSearchTerm] = useState(filters.query_term || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setSearchTerm(filters.query_term || '');
  }, [filters.query_term]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onFilterChange({ query_term: searchTerm.trim(), page: 1 });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSortValue = e.target.value;
    const sortOption = SORT_OPTIONS.find((s) => s.value === selectedSortValue);
    if (sortOption) {
      onFilterChange({ sort_by: sortOption.value, order_by: sortOption.order as 'desc' | 'asc', page: 1 });
    } else {
      onFilterChange({ sort_by: selectedSortValue, page: 1 });
    }
  };

  const activeFilterCount = [
    filters.query_term.trim() !== '',
    filters.genre !== 'All',
    filters.quality !== 'All',
    filters.minimum_rating > 0,
    filters.year && filters.year !== 'All',
    (typeof filters.min_year === 'number' && filters.min_year > 1950) || (typeof filters.max_year === 'number' && filters.max_year < 2026),
    filters.decade && filters.decade !== 'All',
    filters.runtime_bracket && filters.runtime_bracket !== 'all',
    filters.codec && filters.codec !== 'all',
    filters.language && filters.language !== 'All',
    filters.sort_by !== 'date_added',
  ].filter(Boolean).length;

  return (
    <div id="movie-search-filters" className="w-full space-y-4 mb-8">
      <div className="bg-[#101010] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 mb-3">
          <label htmlFor="main-search-input" className="text-base sm:text-lg font-bold text-neutral-300">
            Search Term on <span className="text-white font-extrabold">CineVault</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                showAdvanced || (filters.runtime_bracket && filters.runtime_bracket !== 'all') || (filters.codec && filters.codec !== 'all')
                  ? 'bg-rose-600/20 text-rose-300 border-rose-500/40'
                  : 'bg-white/5 text-neutral-400 hover:text-white border-white/10'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Advanced' : 'Advanced Filters'}</span>
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={onReset}
                className="flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-5" role="search">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              id="main-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search movie title, IMDb code, actor, director..."
              className="w-full h-12 bg-[#1c1c1c] border border-neutral-700/60 focus:border-rose-500 rounded-xl pl-11 pr-4 text-sm sm:text-base text-neutral-100 transition-all outline-none"
            />
          </div>
          <button
            type="submit"
            className="h-12 px-8 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-950/40 transition cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Primary Filter Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Quality', value: filters.quality, key: 'quality', options: QUALITIES },
            {
              label: 'Genre',
              value: filters.genre,
              key: 'genre',
              options: GENRES.map((g) => ({ label: g, value: g })),
            },
            { label: 'Rating', value: filters.minimum_rating, key: 'minimum_rating', options: RATING_OPTIONS },
            { label: 'Year', value: filters.year || 'All', key: 'year', options: YEAR_OPTIONS },
            { label: 'Language', value: filters.language || 'All', key: 'language', options: LANGUAGE_OPTIONS },
          ].map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-400">{field.label}:</label>
              <select
                value={field.value}
                onChange={(e) =>
                  onFilterChange({
                    [field.key]: field.key === 'minimum_rating' ? Number(e.target.value) : e.target.value,
                    page: 1,
                  })
                }
                className="w-full bg-[#1c1c1c] border border-neutral-700/60 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:border-rose-500 cursor-pointer"
              >
                {field.options.map((opt: any) => (
                  <option
                    key={typeof opt === 'string' ? opt : opt.value}
                    value={typeof opt === 'string' ? opt : opt.value}
                  >
                    {typeof opt === 'string' ? opt : opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-400">Order By:</label>
            <select
              value={filters.sort_by}
              onChange={handleSortChange}
              className="w-full bg-[#1c1c1c] border border-neutral-700/60 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:border-rose-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.label} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Filters Expandable Drawer */}
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
            {/* Decade & Year Range Dual Slider */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <CalendarRange className="w-3.5 h-3.5 text-amber-400" />
                  <span>Decade & Year Range:</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    {filters.min_year || 1950} — {filters.max_year || 2026}
                  </span>
                  {(filters.min_year || filters.max_year) && (
                    <button
                      type="button"
                      onClick={() => onFilterChange({ min_year: undefined, max_year: undefined, decade: 'All', page: 1 })}
                      className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
                    >
                      Clear Range
                    </button>
                  )}
                </div>
              </div>

              {/* Dual Range Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>From Year:</span>
                    <span className="font-mono font-bold text-white">{filters.min_year || 1950}</span>
                  </div>
                  <input
                    type="range"
                    min="1950"
                    max="2026"
                    step="1"
                    value={filters.min_year || 1950}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const currentMax = filters.max_year || 2026;
                      onFilterChange({
                        min_year: val > currentMax ? currentMax : val,
                        decade: 'All',
                        page: 1,
                      });
                    }}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>To Year:</span>
                    <span className="font-mono font-bold text-white">{filters.max_year || 2026}</span>
                  </div>
                  <input
                    type="range"
                    min="1950"
                    max="2026"
                    step="1"
                    value={filters.max_year || 2026}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const currentMin = filters.min_year || 1950;
                      onFilterChange({
                        max_year: val < currentMin ? currentMin : val,
                        decade: 'All',
                        page: 1,
                      });
                    }}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                  />
                </div>
              </div>

              {/* Quick Era Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-neutral-500 mr-1">Presets:</span>
                {[
                  { label: 'Classic Cinema (1970–1999)', min: 1970, max: 1999 },
                  { label: 'Modern Era (2000–2019)', min: 2000, max: 2019 },
                  { label: 'New Releases (2020–2026)', min: 2020, max: 2026 },
                  { label: 'Golden Age (1950–1969)', min: 1950, max: 1969 },
                ].map((preset) => {
                  const isActive = filters.min_year === preset.min && filters.max_year === preset.max;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => onFilterChange({ min_year: preset.min, max_year: preset.max, decade: 'All', page: 1 })}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-white/5 text-neutral-400 hover:text-white border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Runtime & Codec Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Runtime Filter */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                <label className="block text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Runtime Length:</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {RUNTIME_OPTIONS.map((rt) => {
                    const isActive = (filters.runtime_bracket || 'all') === rt.value;
                    return (
                      <button
                        key={rt.value}
                        type="button"
                        onClick={() => onFilterChange({ runtime_bracket: rt.value, page: 1 })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition cursor-pointer border ${
                          isActive
                            ? 'bg-rose-600/20 text-rose-300 border-rose-500/40'
                            : 'bg-neutral-900/60 text-neutral-400 hover:text-white border-white/5 hover:bg-white/5'
                        }`}
                      >
                        {rt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Codec & Surround Sound Filter */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                <label className="block text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Audio & Codec Filter:</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CODEC_AUDIO_OPTIONS.map((ca) => {
                    const isActive = (filters.codec || 'all') === ca.value;
                    return (
                      <button
                        key={ca.value}
                        type="button"
                        onClick={() => onFilterChange({ codec: ca.value, page: 1 })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition cursor-pointer border ${
                          isActive
                            ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-neutral-900/60 text-neutral-400 hover:text-white border-white/5 hover:bg-white/5'
                        }`}
                      >
                        {ca.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
          <span>
            Results:{' '}
            {isLoading ? (
              <span className="text-rose-400 animate-pulse">Loading...</span>
            ) : (
              <span className="text-white font-bold">{totalResults.toLocaleString()} titles</span>
            )}
          </span>
          {activeFilterCount > 0 && (
            <span className="text-[11px] text-amber-400 font-mono">
              {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
            </span>
          )}
        </div>
      </div>

      {/* Quick Filter Pills */}
      <nav className="space-y-2" aria-label="Quick filters">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[11px] font-bold text-neutral-500 uppercase shrink-0 mr-1">Genre:</span>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => onFilterChange({ genre: g, page: 1 })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                filters.genre.toLowerCase() === g.toLowerCase()
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-[#101010] text-neutral-400 border border-white/10 hover:text-white'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[11px] font-bold text-neutral-500 uppercase shrink-0 mr-1">Era:</span>
          {[
            { label: 'All', value: 'All' },
            { label: '2026', value: '2026' },
            { label: '2025', value: '2025' },
            { label: '2024', value: '2024' },
            { label: '2010s', value: '2010-2019' },
            { label: '2000s', value: '2000-2009' },
            { label: '90s', value: '1990-1999' },
            { label: '80s', value: '1980-1989' },
          ].map((era) => (
            <button
              key={era.label}
              onClick={() => onFilterChange({ year: era.value, page: 1 })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                (filters.year || 'All') === era.value
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-[#0d0d0d] text-neutral-400 border border-white/5 hover:text-white'
              }`}
            >
              {era.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
