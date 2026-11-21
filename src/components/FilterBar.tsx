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
  MOVIE_SORT_OPTIONS,
  getSortOptionKey,
  getSortOptionByKey
} from '../services/movieApi';
import { SlidersHorizontal, RotateCcw, Search, Clock, Film, Sparkles, Volume2, CalendarRange, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterBarProps {
  filters: FilterParams;
  onFilterChange: (newFilters: Partial<FilterParams>) => void;
  totalResults: number;
  isLoading: boolean;
  onReset: () => void;
}

const POPULAR_QUICK_FILTERS = [
  { label: 'All Movies', type: 'reset' },
  { label: '4K Ultra HD', type: 'quality', value: '2160p' },
  { label: '1080p BluRay', type: 'quality', value: '1080p' },
  { label: '★ 8.0+ Masterpieces', type: 'rating', value: 8 },
  { label: 'Action & Heroes', type: 'genre', value: 'Action' },
  { label: 'Sci-Fi & Cyber', type: 'genre', value: 'Sci-Fi' },
  { label: 'Top Dramas', type: 'genre', value: 'Drama' },
  { label: 'Comedy', type: 'genre', value: 'Comedy' },
  { label: 'Animation', type: 'genre', value: 'Animation' },
  { label: 'Thrillers', type: 'genre', value: 'Thriller' }
];

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

  const currentSortKey = getSortOptionKey(filters.sort_by, filters.order_by);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedKey = e.target.value;
    const sortOption = getSortOptionByKey(selectedKey);
    onFilterChange({
      sort_by: sortOption.sortBy,
      order_by: sortOption.orderBy,
      page: 1
    });
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
    filters.sort_by !== 'date_added' || filters.order_by !== 'desc',
  ].filter(Boolean).length;

  return (
    <div id="movie-search-filters" className="w-full space-y-3 mb-8">
      <div className="cv-card border rounded-2xl p-4 sm:p-5 shadow-xl transition-colors">
        {/* Search Header Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <label htmlFor="main-search-input" className="text-sm sm:text-base font-bold cv-text-secondary">
            Search & Filter <span className="cv-text font-extrabold">CineVault Catalog</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                showAdvanced || activeFilterCount > 0
                  ? 'cv-nav-soft-active'
                  : 'cv-btn-secondary'
              }`}
              aria-expanded={showAdvanced}
              aria-controls="advanced-filters-drawer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Filters' : 'Filters & Sorting'}</span>
              {activeFilterCount > 0 && (
                <span className="cv-btn-primary px-1.5 py-0.2 rounded-full font-bold text-[10px]">
                  {activeFilterCount}
                </span>
              )}
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={onReset}
                className="cv-nav-soft-active flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition cursor-pointer"
                title="Reset all filters to default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5 mb-3.5" role="search">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 cv-text-muted pointer-events-none" />
            <label htmlFor="main-search-input" className="sr-only">Search movies</label>
            <input
              id="main-search-input"
              name="movieSearch"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search movie title, IMDb code, actor, director..."
              className="cv-input w-full h-11 border rounded-xl pl-11 pr-10 text-xs sm:text-sm transition-colors outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  onFilterChange({ query_term: '', page: 1 });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 cv-text-muted hover:text-[var(--cv-text)] p-1 rounded-full hover:bg-[var(--cv-surface-hover)]"
                aria-label="Clear search term"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="cv-btn-primary h-11 px-7 font-bold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        {/* High-Frequency Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {POPULAR_QUICK_FILTERS.map((item) => {
            let isSelected = false;
            if (item.type === 'reset') {
              isSelected = activeFilterCount === 0;
            } else if (item.type === 'quality') {
              isSelected = filters.quality === item.value;
            } else if (item.type === 'rating') {
              isSelected = filters.minimum_rating === item.value;
            } else if (item.type === 'genre') {
              isSelected = filters.genre === item.value;
            }

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (item.type === 'reset') {
                    onReset();
                  } else if (item.type === 'quality') {
                    onFilterChange({ quality: filters.quality === item.value ? 'All' : (item.value as string), page: 1 });
                  } else if (item.type === 'rating') {
                    onFilterChange({ minimum_rating: filters.minimum_rating === item.value ? 0 : (item.value as number), page: 1 });
                  } else if (item.type === 'genre') {
                    onFilterChange({ genre: filters.genre === item.value ? 'All' : (item.value as string), page: 1 });
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'cv-btn-primary shadow-sm'
                    : 'cv-btn-secondary'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Active Filter Dismissal Bar (When filters are active) */}
        {activeFilterCount > 0 && (
          <div className="mt-3 pt-3 border-t cv-border-subtle flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold cv-text-muted uppercase tracking-wider mr-1">Active:</span>

            {filters.query_term && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  onFilterChange({ query_term: '', page: 1 });
                }}
                className="cv-badge-neutral inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold transition cursor-pointer"
              >
                <span>Query: "{filters.query_term}"</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {filters.genre && filters.genre !== 'All' && (
              <button
                type="button"
                onClick={() => onFilterChange({ genre: 'All', page: 1 })}
                className="cv-nav-soft-active inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold transition cursor-pointer"
              >
                <span>Genre: {filters.genre}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {filters.quality && filters.quality !== 'All' && (
              <button
                type="button"
                onClick={() => onFilterChange({ quality: 'All', page: 1 })}
                className="cv-badge-info inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold transition cursor-pointer"
              >
                <span>Quality: {filters.quality}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {filters.minimum_rating > 0 && (
              <button
                type="button"
                onClick={() => onFilterChange({ minimum_rating: 0, page: 1 })}
                className="cv-rating-badge inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold transition cursor-pointer"
              >
                <span>Rating: ★ {filters.minimum_rating}+</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {filters.year && filters.year !== 'All' && (
              <button
                type="button"
                onClick={() => onFilterChange({ year: 'All', page: 1 })}
                className="cv-badge-neutral inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold transition cursor-pointer"
              >
                <span>Year: {filters.year}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {filters.language && filters.language !== 'All' && (
              <button
                type="button"
                onClick={() => onFilterChange({ language: 'All', page: 1 })}
                className="cv-badge-neutral inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold transition cursor-pointer"
              >
                <span>Language: {filters.language}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            <button
              type="button"
              onClick={onReset}
              className="text-[11px] cv-text-muted hover:text-[var(--cv-text)] underline cursor-pointer ml-1"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Collapsible Filters & Sorting Matrix Drawer */}
        {showAdvanced && (
          <div id="advanced-filters-drawer" className="mt-4 pt-4 border-t cv-border space-y-4 animate-in fade-in duration-200">
            {/* Primary Dropdown Matrix */}
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
                  <label htmlFor={`filter-${field.key}`} className="block text-xs font-semibold cv-text-muted">{field.label}:</label>
                  <select
                    id={`filter-${field.key}`}
                    name={field.key}
                    value={field.value}
                    onChange={(e) =>
                      onFilterChange({
                        [field.key]: field.key === 'minimum_rating' ? Number(e.target.value) : e.target.value,
                        page: 1,
                      })
                    }
                    className="cv-select w-full border rounded-lg px-3 py-2 text-xs focus:border-[var(--cv-input-border-focus)] cursor-pointer"
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
                <label htmlFor="filter-order-by" className="block text-xs font-semibold cv-text-muted">Order By:</label>
                <select
                  id="filter-order-by"
                  name="orderBy"
                  value={currentSortKey}
                  onChange={handleSortChange}
                  className="cv-select w-full border rounded-lg px-3 py-2 text-xs focus:border-[var(--cv-input-border-focus)] cursor-pointer"
                >
                  {MOVIE_SORT_OPTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Decade & Year Range Dual Slider */}
            <div className="cv-surface-muted p-3.5 rounded-xl border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold cv-text-secondary flex items-center gap-1.5">
                  <CalendarRange className="w-3.5 h-3.5 cv-rating" />
                  <span>Decade & Year Range:</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="cv-rating-badge font-mono text-xs font-bold px-2 py-0.5 rounded border">
                    {filters.min_year || 1950} — {filters.max_year || 2026}
                  </span>
                  {(filters.min_year || filters.max_year) && (
                    <button
                      type="button"
                      onClick={() => onFilterChange({ min_year: undefined, max_year: undefined, decade: 'All', page: 1 })}
                      className="text-[10px] cv-text-muted hover:text-[var(--cv-text)] underline cursor-pointer"
                    >
                      Clear Range
                    </button>
                  )}
                </div>
              </div>

              {/* Dual Range Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] cv-text-muted">
                    <label htmlFor="filter-min-year">From Year:</label>
                    <span className="font-mono font-bold cv-text">{filters.min_year || 1950}</span>
                  </div>
                  <input
                    id="filter-min-year"
                    name="min_year"
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
                    className="w-full accent-[var(--cv-nav-active-bg)] cursor-pointer h-1.5 bg-[var(--cv-border)] rounded-lg appearance-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] cv-text-muted">
                    <label htmlFor="filter-max-year">To Year:</label>
                    <span className="font-mono font-bold cv-text">{filters.max_year || 2026}</span>
                  </div>
                  <input
                    id="filter-max-year"
                    name="max_year"
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
                    className="w-full accent-[var(--cv-nav-active-bg)] cursor-pointer h-1.5 bg-[var(--cv-border)] rounded-lg appearance-none"
                  />
                </div>
              </div>

              {/* Quick Era Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold cv-text-muted mr-1">Presets:</span>
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
                          ? 'cv-rating-badge font-bold'
                          : 'cv-btn-secondary'
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
              <div className="cv-surface-muted p-3 rounded-xl border space-y-2">
                <label className="block text-xs font-bold cv-text-secondary flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 cv-text-accent" />
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
                            ? 'cv-nav-soft-active'
                            : 'cv-btn-secondary'
                        }`}
                      >
                        {rt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Codec & Surround Sound Filter */}
              <div className="cv-surface-muted p-3 rounded-xl border space-y-2">
                <label className="block text-xs font-bold cv-text-secondary flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-[var(--cv-success-soft-fg)]" />
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
                            ? 'cv-badge-success'
                            : 'cv-btn-secondary'
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

        <div className="mt-4 pt-3 border-t cv-border-subtle flex flex-wrap items-center justify-between gap-2 text-xs cv-text-muted">
          <span>
            Results:{' '}
            {isLoading ? (
              <span className="cv-text-accent animate-pulse">Loading...</span>
            ) : (
              <span className="cv-text font-bold">{totalResults.toLocaleString()} titles</span>
            )}
          </span>
          {activeFilterCount > 0 && (
            <span className="text-[11px] cv-rating font-mono font-semibold">
              {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
            </span>
          )}
        </div>
      </div>

      {/* Quick Filter Pills */}
      <nav className="space-y-2" aria-label="Quick filters">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          <span className="text-[11px] font-bold cv-text-muted uppercase shrink-0 mr-1">Genre:</span>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => onFilterChange({ genre: g, page: 1 })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer border ${
                filters.genre.toLowerCase() === g.toLowerCase()
                  ? 'cv-btn-primary shadow-sm'
                  : 'cv-btn-secondary'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          <span className="text-[11px] font-bold cv-text-muted uppercase shrink-0 mr-1">Era:</span>
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
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer border ${
                (filters.year || 'All') === era.value
                  ? 'cv-rating-badge font-bold'
                  : 'cv-btn-secondary'
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
