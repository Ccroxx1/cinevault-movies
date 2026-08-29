import React, { useState } from 'react';
import { Movie } from '../types';

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
      color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
    },
    {
      name: 'OpenSubtitles.org',
      badge: 'Massive Library',
      description: 'World’s largest multi-language subtitle database with hearing-impaired (SDH) support.',
      url: cleanImdb
        ? `https://www.opensubtitles.org/en/search/sublanguageid-${selectedLang}/imdbid-${cleanImdb}`
        : `https://www.opensubtitles.org/en/search/sublanguageid-${selectedLang}/moviename-${encodedTitle}`,
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-400'
    },
    {
      name: 'Subscene Archive',
      badge: 'Community Verified',
      description: 'High quality fan-submitted and synced SRT subtitles across international releases.',
      url: `https://subscene.com/subtitles/searchbytitle?query=${encodedTitle}`,
      color: 'border-blue-500/40 bg-blue-500/10 text-blue-400'
    },
    {
      name: 'Addic7ed TV & Cinema',
      badge: 'Fast Synced',
      description: 'Up-to-the-minute subtitle translations and hearing-impaired editions.',
      url: `https://www.addic7ed.com/search.php?search=${encodedTitle}&Submit=Search`,
      color: 'border-purple-500/40 bg-purple-500/10 text-purple-400'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0e0e0e] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-display font-black text-white">
                Download Subtitles
              </h3>
              <p className="text-xs text-neutral-400">
                {movie.title} ({movie.year}) • IMDb: {movie.imdb_code || 'N/A'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
                Close
              </button>
        </div>

        {/* Language Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
            <span aria-hidden="true" className="hidden" />
            <span>Target Language:</span>
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-thin">
            {commonLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedLang === lang.code
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#181818] hover:bg-[#222222] text-neutral-300 border border-white/5'
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
              className="group p-4 bg-[#141414] hover:bg-[#1a1a1a] border border-white/10 hover:border-white/20 rounded-2xl flex items-center justify-between gap-4 transition-all duration-200 block no-underline"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors">
                    {provider.name}
                  </h4>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${provider.color}`}>
                    {provider.badge}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {provider.description}
                </p>
              </div>
            </a>
          ))}
        </div>

        {/* Footer tip */}
        <div className="p-3 bg-neutral-900/60 rounded-xl border border-white/5 text-[11px] text-neutral-400 leading-relaxed">
           <strong className="text-neutral-200">Tip:</strong> Once downloaded, simply drag & drop the <code className="text-emerald-400">.srt</code> file directly into VLC Player, IINA, or MPC-HC during playback.
        </div>

      </div>
    </div>
  );
};
