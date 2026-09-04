import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  Trash2,
  Sparkles,
  Check,
  Film,
  Share2,
  Copy,
  FileText,
} from 'lucide-react';
import { Movie } from '../types';
import { MovieCard } from './MovieCard';

interface WatchlistViewProps {
  watchlist: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer: (ytCode: string, title: string) => void;
  onCopyMagnet: (magnetUrl: string, title: string) => void;
  onToggleWatchlist: (movie: Movie) => void;
  onClearWatchlist: () => void;
  onImportWatchlist: (importedMovies: Movie[]) => void;
  onExploreCatalog?: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlist,
  onSelectMovie,
  onPlayTrailer,
  onCopyMagnet,
  onToggleWatchlist,
  onClearWatchlist,
  onImportWatchlist,
  onExploreCatalog,
}) => {
  const [sortBy, setSortBy] = useState<'added' | 'rating' | 'year' | 'title'>('added');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyMarkdown = () => {
    if (watchlist.length === 0) return;
    const lines = [
      `### 🎬 CineVault Watchlist (${watchlist.length} films)`,
      ...watchlist.map(
        (m, idx) =>
          `${idx + 1}. **${m.title}** (${m.year || 'N/A'}) — ★ ${m.rating ? m.rating.toFixed(1) : 'N/A'}/10 [${(m.genres || []).slice(0, 2).join(', ')}]`
      ),
      '',
      `_Curated on CineVault_`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    showToast('Markdown list copied to clipboard!');
    setShowShareMenu(false);
  };

  const handleCopyPlainText = () => {
    if (watchlist.length === 0) return;
    const lines = [
      `CineVault Watchlist (${watchlist.length} films):`,
      ...watchlist.map(
        (m, idx) =>
          `${idx + 1}. ${m.title} (${m.year || 'N/A'}) - Rating: ${m.rating ? m.rating.toFixed(1) : 'N/A'}/10 - ${m.runtime ? `${m.runtime}m` : ''}`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    showToast('Plain text list copied to clipboard!');
    setShowShareMenu(false);
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(watchlist, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cinevault_watchlist_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${watchlist.length} movies to JSON backup.`);
  };

  const handleExportCsv = () => {
    if (watchlist.length === 0) return;
    const headers = ['Title', 'Year', 'IMDb Rating', 'Runtime', 'Genres', 'IMDb Code'];
    const rows = watchlist.map((m) => [
      `"${(m.title || '').replace(/"/g, '""')}"`,
      m.year || '',
      m.rating || '',
      m.runtime ? `${m.runtime} min` : '',
      `"${(m.genres || []).join(', ')}"`,
      m.imdb_code || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cinevault_watchlist_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${watchlist.length} movies to CSV.`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCsv = file.name.endsWith('.csv');
    const isJson = file.name.endsWith('.json');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;

        if (isJson) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((m: any) => m && (m.id || m.title));
            if (valid.length > 0) {
              const existingIds = new Set(watchlist.map((w) => w.id));
              const existingTitles = new Set(watchlist.map((w) => w.title.toLowerCase().trim()));
              const fresh = valid.filter((m) => !existingIds.has(m.id) && !existingTitles.has(m.title.toLowerCase().trim()));
              const dupes = valid.length - fresh.length;

              onImportWatchlist(valid);
              showToast(
                dupes > 0
                  ? `Imported ${fresh.length} new movies (${dupes} duplicates skipped).`
                  : `Imported ${fresh.length} movies from JSON backup.`
              );
            } else {
              alert('No valid movie objects found in JSON file.');
            }
          }
        } else if (isCsv) {
          // Parse CSV (Letterboxd, IMDb, or generic watchlist CSV)
          const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length <= 1) {
            alert('CSV file is empty or missing data rows.');
            return;
          }

          const headerLine = lines[0].toLowerCase();
          const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

          let titleIdx = headers.findIndex((h) => h.includes('name') || h.includes('title'));
          let yearIdx = headers.findIndex((h) => h.includes('year') || h.includes('release'));
          let ratingIdx = headers.findIndex((h) => h.includes('rating'));

          if (titleIdx === -1) titleIdx = 0;

          const importedList: Movie[] = [];
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
            if (cols.length > titleIdx) {
              const rawTitle = cols[titleIdx]?.replace(/^["']|["']$/g, '').trim();
              if (!rawTitle) continue;

              const rawYear = yearIdx !== -1 ? parseInt(cols[yearIdx]?.replace(/\D/g, '') || '0', 10) : 0;
              const rawRating = ratingIdx !== -1 ? parseFloat(cols[ratingIdx]?.replace(/[^0-9.]/g, '') || '0') : 0;

              const generatedId = Math.abs(
                rawTitle.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
              );

              importedList.push({
                id: generatedId,
                url: '',
                imdb_code: '',
                title: rawTitle,
                title_english: rawTitle,
                title_long: `${rawTitle} (${rawYear || ''})`,
                slug: rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                year: rawYear || new Date().getFullYear(),
                rating: rawRating || 7.0,
                runtime: 110,
                genres: ['Drama', 'Featured'],
                summary: 'Imported from external watchlist.',
                description_full: 'Imported movie record from CSV.',
                yt_trailer_code: '',
                language: 'en',
                mpa_rating: 'PG-13',
                background_image: '',
                background_image_original: '',
                small_cover_image: '',
                medium_cover_image: '',
                large_cover_image: '',
                torrents: [],
                date_uploaded: new Date().toISOString(),
                date_uploaded_unix: Math.floor(Date.now() / 1000),
              });
            }
          }

          if (importedList.length > 0) {
            const existingTitles = new Set(watchlist.map((w) => w.title.toLowerCase().trim()));
            const fresh = importedList.filter((m) => !existingTitles.has(m.title.toLowerCase().trim()));
            const dupes = importedList.length - fresh.length;

            onImportWatchlist(fresh);
            showToast(
              dupes > 0
                ? `Imported ${fresh.length} films from CSV (${dupes} duplicates skipped).`
                : `Imported ${fresh.length} films from CSV.`
            );
          } else {
            alert('Could not extract valid film rows from this CSV file.');
          }
        }
      } catch (err) {
        alert('Could not parse uploaded file. Please verify format.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const sortedMovies = [...watchlist].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'year') return (b.year || 0) - (a.year || 0);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <section className="space-y-6" aria-labelledby="watchlist-heading">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xl shadow-emerald-950/40 border border-emerald-400/30 animate-in slide-in-from-top-3 duration-200"
        >
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Container */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-[#0a0a0a] border border-white/10 p-4 sm:p-6 rounded-2xl">
        <div>
          <h1 id="watchlist-heading" className="text-xl sm:text-2xl font-black font-display text-white">
            My Watchlist & Library
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400">
            {watchlist.length} {watchlist.length === 1 ? 'film' : 'films'} saved locally • Sync with Letterboxd or CSV
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-2" aria-label="Watchlist actions">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,.csv"
            className="hidden"
          />

          {/* Import Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#141414] hover:bg-[#1f1f1f] text-neutral-200 border border-white/10 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Import CineVault JSON backup or Letterboxd / IMDb CSV"
          >
            <Upload className="w-3.5 h-3.5 text-rose-400" />
            <span>Import JSON / CSV</span>
          </button>

          {watchlist.length > 0 && (
            <>
              {/* Share Summary Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] hover:bg-[#1f1f1f] text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition cursor-pointer"
                  title="Share or copy list for friends"
                >
                  <Share2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Share List</span>
                </button>

                {showShareMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#121212] border border-white/15 shadow-2xl p-1.5 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={handleCopyMarkdown}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-xs text-neutral-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-rose-400" />
                      <div>
                        <div className="font-semibold">Copy as Markdown</div>
                        <div className="text-[10px] text-neutral-400">Great for Discord / Reddit</div>
                      </div>
                    </button>
                    <button
                      onClick={handleCopyPlainText}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-xs text-neutral-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <div>
                        <div className="font-semibold">Copy as Plain Text</div>
                        <div className="text-[10px] text-neutral-400">Formatted text message</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Export JSON */}
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 border border-white/10 rounded-xl text-xs font-semibold transition cursor-pointer"
                title="Backup full library with torrent hashes"
              >
                <FileJson className="w-3.5 h-3.5 text-amber-400" />
                <span>Export JSON</span>
              </button>

              {/* Export CSV */}
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 border border-white/10 rounded-xl text-xs font-semibold transition cursor-pointer"
                title="Export spreadsheet compatible with Excel and Letterboxd"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              {/* Clear All */}
              <button
                onClick={onClearWatchlist}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] hover:bg-rose-950/40 text-neutral-400 hover:text-rose-300 border border-white/10 rounded-xl text-xs font-semibold transition cursor-pointer"
                title="Clear all saved movies"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </>
          )}
        </nav>
      </header>

      {watchlist.length > 1 && (
        <nav className="flex items-center gap-3 text-xs text-neutral-400 px-1" aria-label="Sorting">
          <span>Sort By:</span>
          <div className="flex items-center gap-1">
            {[
              { id: 'added', label: 'Recently Added' },
              { id: 'rating', label: 'Top Rated' },
              { id: 'year', label: 'Release Year' },
              { id: 'title', label: 'Alphabetical' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  sortBy === opt.id ? 'bg-rose-600 text-white shadow-sm' : 'bg-white/5 hover:bg-white/10 text-neutral-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {watchlist.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {sortedMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onSelect={onSelectMovie}
              onPlayTrailer={onPlayTrailer}
              onCopyMagnet={onCopyMagnet}
              isWatchlisted={true}
              onToggleWatchlist={onToggleWatchlist}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-[#0a0a0a]/50 border border-dashed border-white/10 rounded-3xl p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500">
            <Film className="w-7 h-7 text-neutral-400" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h2 className="text-lg font-bold text-neutral-200">Your watchlist is empty</h2>
            <p className="text-xs text-neutral-400">
              Save films from the catalog for quick access, or import your saved watchlist from Letterboxd or CSV.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onExploreCatalog && (
              <button
                onClick={onExploreCatalog}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                Explore Catalog
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/10 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-rose-400" />
              <span>Import Letterboxd / JSON Backup</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
