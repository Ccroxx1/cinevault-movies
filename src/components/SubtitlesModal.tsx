import React, { useState } from 'react';
import { Globe, X, ExternalLink } from 'lucide-react';
import { Movie } from '../types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface SubtitlesModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SubtitlesModal: React.FC<SubtitlesModalProps> = ({
  movie,
  isOpen,
  onClose
}) => {
  useBodyScrollLock(isOpen && Boolean(movie));
  const [selectedLang, setSelectedLang] = useState<string>('all');

  if (!isOpen || !movie) return null;

  const encodedTitle = encodeURIComponent(movie.title);
  const cleanImdb = movie.imdb_code?.replace('tt', '') || '';

  const subtitleProviders = [
    {
      name: 'YTS Subtitles (Official)',
      badge: 'Recommended',
      description: 'Synchronized specifically for YIFY/YTS 720p, 1080p, and 4K rips in 40+ languages.',
      url: movie.imdb_code
        ? `https://yifysubtitles.ch/movie-imdb/${movie.imdb_code}`
        : `https://yifysubtitles.ch/movie-imdb/tt${cleanImdb}`,
      badgeClass: 'cv-badge-success'
    },
    {
      name: 'OpenSubtitles.org',
      badge: 'Massive Library',
      description: 'World’s largest multi-language subtitle database with hearing-impaired (SDH) support.',
      url: cleanImdb
        ? `https://www.opensubtitles.org/en/search/sublanguageid-${selectedLang}/imdbid-${cleanImdb}`
        : `https://www.opensubtitles.org/en/search/sublanguageid-${selectedLang}/moviename-${encodedTitle}`,
      badgeClass: 'cv-badge-warning'
    },
    {
      name: 'Subscene Archive',
      badge: 'Community Verified',
      description: 'High quality fan-submitted and synced SRT subtitles across international releases.',
      url: `https://subscene.com/subtitles/searchbytitle?query=${encodedTitle}`,
      badgeClass: 'cv-badge-info'
    },
    {
      name: 'Addic7ed TV & Cinema',
      badge: 'Fast Synced',
      description: 'Up-to-the-minute subtitle translations and hearing-impaired editions.',
      url: `https://www.addic7ed.com/search.php?search=${encodedTitle}&Submit=Search`,
      badgeClass: 'cv-nav-soft-active'
    }
  ];

  const commonLanguages = [
    { code: 'all', label: 'All Languages' },
    { code: 'eng', label: 'English (EN)' },
    { code: 'spa', label: 'Spanish (ES)' },
    { code: 'fre', label: 'French (FR)' },
    { code: 'ger', label: 'German (DE)' },
    { code: 'ita', label: 'Italian (IT)' },
    { code: 'por', label: 'Portuguese (PT)' },
    { code: 'ara', label: 'Arabic (AR)' },
    { code: 'chi', label: 'Chinese (ZH)' },
    { code: 'jpn', label: 'Japanese (JA)' },
    { code: 'kor', label: 'Korean (KO)' }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
      style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Download Subtitles"
    >
      <div className="modal-dialog-surface cv-surface-elevated border relative w-full max-w-xl rounded-3xl p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-display font-black cv-text">
                Download Subtitles
              </h3>
              <p className="text-xs cv-text-muted">
                {movie.title} ({movie.year}) • IMDb: {movie.imdb_code || 'N/A'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 cv-btn-secondary rounded-full transition-colors cursor-pointer"
            aria-label="Close subtitles dialog"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold cv-text-secondary flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 cv-text-accent" />
            <span>Target Language:</span>
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-thin">
            {commonLanguages.map((lang) => (
              <button
                key={lang.code}
                aria-pressed={selectedLang === lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedLang === lang.code
                    ? 'cv-nav-pill-active'
                    : 'cv-btn-secondary'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subtitle Provider Links */}
        <div className="space-y-3">
          {subtitleProviders.map((provider) => (
            <a
              key={provider.name}
              href={provider.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group p-4 cv-card-interactive border rounded-2xl flex items-center justify-between gap-4 transition-all duration-200 block no-underline"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold cv-text cv-group-hover-accent transition-colors">
                    {provider.name}
                  </h4>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${provider.badgeClass}`}>
                    {provider.badge}
                  </span>
                </div>
                <p className="text-xs cv-text-muted leading-relaxed">
                  {provider.description}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 cv-text-muted cv-group-hover-accent shrink-0 transition-colors" />
            </a>
          ))}
        </div>

        {/* Footer tip */}
        <div className="p-3 cv-surface-muted rounded-xl border text-[11px] cv-text-muted leading-relaxed">
           <strong className="cv-text">Tip:</strong> Once downloaded, simply drag &amp; drop the <code className="font-mono font-bold" style={{ color: 'var(--cv-success-soft-fg)' }}>.srt</code> file directly into VLC Player, IINA, or MPC-HC during playback.
        </div>

      </div>
    </div>
  );
};
