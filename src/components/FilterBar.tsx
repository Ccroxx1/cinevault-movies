import React, { useState, useEffect } from 'react';
import { Search, X, RotateCcw, ArrowUpDown, Filter, Sparkles } from 'lucide-react';
import { FilterParams } from '../types';
import {
  GENRES,
  QUALITIES,
  RATING_OPTIONS,
  YEAR_OPTIONS,
  LANGUAGE_OPTIONS,
  SORT_OPTIONS
} from '../services/movieApi';

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
  onReset
}) => {
  const [searchTerm, setSearchTerm] = useState(filters.query_term || '');

  // Keep local searchTerm in sync if filters.query_term is changed from outside (e.g. header search)
  useEffect(() => {
    setSearchTerm(filters.query_term || '');
  }, [filters.query_term]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onFilterChange({
      query_term: searchTerm.trim(),
      page: 1
    });
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    onFilterChange({
      query_term: '',
      page: 1
    });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSortValue = e.target.value;
    const sortOption = SORT_OPTIONS.find((s) => s.value === selectedSortValue);
    if (sortOption) {
      onFilterChange({
        sort_by: sortOption.value,
        order_by: sortOption.order as 'desc' | 'asc',
        page: 1
      });
    } else {
      onFilterChange({
        sort_by: selectedSortValue,
        page: 1
      });
    }
  };

  const activeFilterCount = [
    filters.query_term.trim() !== '',
    filters.genre !== 'All',
    filters.quality !== 'All',
    filters.minimum_rating > 0,
    filters.year && filters.year !== 'All',
    filters.language && filters.language !== 'All',
    filters.sort_by !== 'date_added'
  ].filter(Boolean).length;

  return (
    <div id="movie-search-filters" className="w-full space-y-4 mb-8">
      {/* Dedicated YTS-Style Search & 6-Filter Control Box */}
      <div className="bg-[#101010] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
        
        {/* Title Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <label
            htmlFor="main-search-input"
            className="text-base sm:text-lg font-bold text-neutral-300 flex items-center gap-2"
          >
            <span>Search Term on</span>
            <span className="text-white font-extrabold tracking-tight">CineVault By Sasuu</span>
          </label>

          {activeFilterCount > 0 && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All ({activeFilterCount})</span>
            </button>
          )}
        </div>

        {/* Search Bar Row with Big Green Search Button */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-5">
          <div className="relative flex-1">
            <input
              id="main-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search movie title, IMDb code, actor, director..."
              className="w-full h-12 bg-[#1c1c1c] hover:bg-[#222222] border border-neutral-700/60 focus:border-[#6ac045] focus:ring-1 focus:ring-[#6ac045] rounded-lg px-4 pr-10 text-sm sm:text-base text-neutral-100 placeholder:text-neutral-500 transition-colors focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            id="main-search-submit-btn"
            className="h-12 px-8 bg-[#6ac045] hover:bg-[#5ca63c] active:bg-[#4f9232] text-white font-bold text-sm sm:text-base rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
            <span>Search</span>
          </button>
        </form>

        {/* 6 Dropdown Selectors Grid (Quality, Genre, Rating, Year, Language, Order By) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* 1. Quality Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-400">Quality:</label>
            <select
              value={filters.quality}
              onChange={(e) => onFilterChange({ quality: e.target.value, page: 1 })}
              className="w-full bg-[#1c1c1c] hover:bg-[#242424] border border-neutral-700/60 focus:border-[#6ac045] focus:ring-1 focus:ring-[#6ac045] rounded-lg px-3 py-2 text-xs font-medium text-neutral-200 transition-colors focus:outline-none cursor-pointer"
            >
              {QUALITIES.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Genre Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-400">Genre:</label>
            <select
              value={filters.genre}
              onChange={(e) => onFilterChange({ genre: e.target.value, page: 1 })}
              className="w-full bg-[#1c1c1c] hover:bg-[#242424] border border-neutral-700/60 focus:border-[#6ac045] focus:ring-1 focus:ring-[#6ac045] rounded-lg px-3 py-2 text-xs font-medium text-neutral-200 transition-colors focus:outline-none cursor-pointer"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Rating Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-400">Rating:</label>
            <select
              value={filters.minimum_rating}
              onChange={(e) => onFilterChange({ minimum_rating: Number(e.target.value), page: 1 })}
              className="w-full bg-[#1c1c1c] hover:bg-[#242424] border border-neutral-700/60 focus:border-[#6ac045] focus:ring-1 focus:ring-[#6ac045] rounded-lg px-3 py-2 text-xs font-medium text-neutral-200 transition-colors focus:outline-none cursor-pointer"
            >
              {RATING_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Year Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-400">Year:</label>
            <select
              value={filters.year || 'All'}
              onChange={(e) => onFilterChange({ year: e.target.value, page: 1 })}
              className="w-full bg-[#1c1c1c] hover:bg-[#242424] border border-neutral-700/60 focus:border-[#6ac045] focus:ring-1 focus:ring-[#6ac045] rounded-lg px-3 py-2 text-xs font-medium text-neutral-200 transition-colors focus:outline-none cursor-pointer"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Language Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-400">Language:</label>
            <select
              value={filters.language || 'All'}
              onChange={(e) => onFilterChange({ language: e.target.value, page: 1 })}
              className="w-full bg-[#1c1c1c] hover:bg-[#242424] border border-neutral-700/60 focus:border-[#6ac045] focus:ring-1 focus:ring-[#6ac045] rounded-lg px-3 py-2 text-xs font-medium text-neutral-200 transition-colors focus:outline-none cursor-pointer"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Order By Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-400">Order By:</label>
            <select
              value={filters.sort_by}
              onChange={handleSortChange}
              className="w-full bg-[#1c1c1c] hover:bg-[#242424] border border-neutral-700/60 focus:border-[#6ac045] focus:ring-1 focus:ring-[#6ac045] rounded-lg px-3 py-2 text-xs font-medium text-neutral-200 transition-colors focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.label} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Results Count & Quick Status Footer */}
        <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span>Showing results:</span>
            {isLoading ? (
              <span className="text-[#6ac045] font-semibold animate-pulse">Loading catalog...</span>
            ) : (
              <span className="text-white font-bold bg-[#1c1c1c] px-2 py-0.5 rounded border border-white/10">
                {totalResults.toLocaleString()} titles
              </span>
            )}
          </div>

          {filters.query_term && (
            <span className="text-neutral-400">
              Query: <strong className="text-white">"{filters.query_term}"</strong>
            </span>
          )}
        </div>

      </div>

      {/* Genre Horizontal Pill Bar for fast one-tap browsing */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider shrink-0 mr-1">
            Genre:
          </span>
          <button
            onClick={() => onFilterChange({ genre: 'All', page: 1 })}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              filters.genre === 'All'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                : 'bg-[#101010] hover:bg-[#1c1c1c] text-neutral-400 hover:text-white border border-white/10'
            }`}
          >
            All
          </button>

          {GENRES.filter((g) => g !== 'All').map((g) => (
            <button
              key={g}
              onClick={() => onFilterChange({ genre: g, page: 1 })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                filters.genre.toLowerCase() === g.toLowerCase()
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                  : 'bg-[#101010] hover:bg-[#1c1c1c] text-neutral-400 hover:text-white border border-white/10'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Quick Era / Decade Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider shrink-0 mr-1">
            Era:
          </span>
          {[
            { label: 'All Years', value: 'All' },
            { label: '2026', value: '2026' },
            { label: '2025', value: '2025' },
            { label: '2024', value: '2024' },
            { label: '2020-2023', value: '2020' },
            { label: '2010s', value: '2010-2014' },
            { label: '2000s', value: '2000-2009' },
            { label: '90s Classics', value: '1990-1999' },
            { label: '80s Retro', value: '1980-1989' },
            { label: 'Vintage Pre-80s', value: '1950-1969' }
          ].map((era) => (
            <button
              key={era.label}
              onClick={() => onFilterChange({ year: era.value, page: 1 })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                (filters.year || 'All') === era.value
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-[#0d0d0d] hover:bg-[#181818] text-neutral-400 hover:text-neutral-200 border border-white/5'
              }`}
            >
              {era.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
