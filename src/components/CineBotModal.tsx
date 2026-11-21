import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  X, 
  Send, 
  RotateCcw, 
  Star, 
  Play, 
  SlidersHorizontal, 
  Bookmark, 
  BookmarkCheck, 
  ExternalLink,
  ChevronDown,
  Minimize2,
  Maximize2,
  Film,
  Tv
} from 'lucide-react';
import { Movie, CineBotMessage, FilterParams, CineBotShowSuggestion, TvShowInfo } from '../types';
import { sendCineBotMessage, CINEBOT_QUICK_PROMPTS } from '../services/cinebotService';
import { CINEVAULT_POSTER_FALLBACK, normalizeImageUrl, getPrimaryMoviePoster, getPrimarySeriesPoster } from '../utils/imageFallback';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface CineBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
  onPlayTrailer?: (ytCode: string, title: string) => void;
  watchlist: Movie[];
  onToggleWatchlist: (movie: Movie) => void;
  onApplyFilters?: (filters: Partial<FilterParams>) => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
  activeMovie?: Movie | null;
  activeSeriesTitle?: string;
  activeSeriesImdb?: string;
  onSelectSeries?: (params: { imdb?: string; title?: string; torrent?: any; show?: any }) => void;
  onNavigateToSeries?: (query?: string, imdbId?: string) => void;
}

export const CineBotModal: React.FC<CineBotModalProps> = ({
  isOpen,
  onClose,
  onSelectMovie,
  onPlayTrailer,
  watchlist,
  onToggleWatchlist,
  onApplyFilters,
  initialPrompt,
  onClearInitialPrompt,
  activeMovie,
  activeSeriesTitle,
  activeSeriesImdb,
  onSelectSeries,
  onNavigateToSeries
}) => {
  const [messages, setMessages] = useState<CineBotMessage[]>(() => {
    return [
      {
        id: 'welcome-msg',
        sender: 'cinebot',
        text: "👋 Welcome to **CineBot**! I'm your AI cinema and TV series concierge.\n\nHere are some things you can ask me:\n- 📺 **TV Series & Shows:** *\"Search Loki series\"*, *\"Shows like Dark or Severance\"*, *\"Best HBO crime drama\"*\n- 🔍 **Forgotten Plots:** *\"What is the movie where magicians rob a bank during a show?\"*\n- 🍿 **Nuanced Vibes:** *\"Fast-paced 90s cyber thriller\"* or *\"Binge-worthy mini-series\"*\n- 🍷 **Date Night:** *\"Sharp, funny, non-cringe romance under 100 minutes\"*",
        timestamp: Date.now(),
        followUpSuggestions: [
          "Tell me about the Loki TV series",
          "Suggest a mind-bending sci-fi series with twist endings",
          "What are the best prestige crime dramas?",
          "Find a fast-paced survival action film"
        ]
      }
    ];
  });

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  useBodyScrollLock(isOpen && !isMinimized && isMobile);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close CineBot on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Hydrate any suggested movies and TV series missing catalog data in background
  useEffect(() => {
    let isMounted = true;
    const missingMovies: { msgId: string; suggIdx: number; term: string }[] = [];
    const missingShows: { msgId: string; suggIdx: number; term: string; imdb?: string }[] = [];

    messages.forEach((msg) => {
      if (msg.suggestedMovies && Array.isArray(msg.suggestedMovies)) {
        msg.suggestedMovies.forEach((sugg, idx) => {
          if (!sugg.movieData && (sugg.searchTerm || sugg.title)) {
            missingMovies.push({
              msgId: msg.id,
              suggIdx: idx,
              term: sugg.searchTerm || sugg.title
            });
          }
        });
      }

      if (msg.suggestedShows && Array.isArray(msg.suggestedShows)) {
        msg.suggestedShows.forEach((sugg, idx) => {
          if (!sugg.showData && (sugg.imdb_code || sugg.searchTerm || sugg.title)) {
            missingShows.push({
              msgId: msg.id,
              suggIdx: idx,
              term: sugg.searchTerm || sugg.title,
              imdb: sugg.imdb_code
            });
          }
        });
      }
    });

    if (missingMovies.length > 0) {
      missingMovies.forEach(async ({ msgId, suggIdx, term }) => {
        try {
          const res = await fetch(`/api/movies?query_term=${encodeURIComponent(term)}&limit=1`);
          if (res.ok) {
            const data = await res.json();
            const found = data?.data?.movies?.[0];
            if (found && isMounted) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== msgId || !m.suggestedMovies) return m;
                  const updated = [...m.suggestedMovies];
                  if (updated[suggIdx]) {
                    updated[suggIdx] = {
                      ...updated[suggIdx],
                      movieData: found
                    };
                  }
                  return { ...m, suggestedMovies: updated };
                })
              );
            }
          }
        } catch {
          // ignore lookup error
        }
      });
    }

    if (missingShows.length > 0) {
      missingShows.forEach(async ({ msgId, suggIdx, term, imdb }) => {
        try {
          const queryParam = imdb ? `imdb=${encodeURIComponent(imdb)}` : `title=${encodeURIComponent(term)}`;
          const res = await fetch(`/api/tv/details?${queryParam}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.status === 'ok' && data?.show && isMounted) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== msgId || !m.suggestedShows) return m;
                  const updated = [...m.suggestedShows];
                  if (updated[suggIdx]) {
                    updated[suggIdx] = {
                      ...updated[suggIdx],
                      imdb_code: data.show.imdb_code || updated[suggIdx].imdb_code,
                      showData: data.show
                    };
                  }
                  return { ...m, suggestedShows: updated };
                })
              );
            }
          }
        } catch {
          // ignore lookup error
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [messages]);

  // Safe movie click handler that resolves movieData on demand if not already loaded
  const handleMovieClick = async (sugg: { title: string; searchTerm?: string; movieData?: Movie }) => {
    if (sugg.movieData) {
      onSelectMovie(sugg.movieData);
      return;
    }
    try {
      const res = await fetch(`/api/movies?query_term=${encodeURIComponent(sugg.searchTerm || sugg.title)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        const found = data?.data?.movies?.[0];
        if (found) {
          onSelectMovie(found);
          return;
        }
      }
    } catch (err) {
      console.warn('[CineBot] Could not resolve movie:', err);
    }
  };

  // Safe TV series click handler that resolves showData on demand and opens SeriesDetailPage
  const handleSeriesClick = async (sugg: CineBotShowSuggestion) => {
    if (onSelectSeries) {
      if (sugg.showData) {
        onSelectSeries({
          imdb: sugg.imdb_code || sugg.showData.imdb_code,
          title: sugg.title || sugg.showData.name,
          show: sugg.showData
        });
        onClose();
        return;
      }
      try {
        const queryParam = sugg.imdb_code 
          ? `imdb=${encodeURIComponent(sugg.imdb_code)}` 
          : `title=${encodeURIComponent(sugg.searchTerm || sugg.title)}`;
        const res = await fetch(`/api/tv/details?${queryParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ok' && data.show) {
            onSelectSeries({
              imdb: data.show.imdb_code || sugg.imdb_code,
              title: data.show.name || sugg.title,
              show: data.show
            });
            onClose();
            return;
          }
        }
      } catch {}

      onSelectSeries({
        imdb: sugg.imdb_code,
        title: sugg.title
      });
      onClose();
    } else if (onNavigateToSeries) {
      onNavigateToSeries(sugg.title);
      onClose();
    }
  };

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen, isMinimized]);

  // Handle incoming initial prompt
  useEffect(() => {
    if (isOpen && initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim());
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [isOpen, initialPrompt]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isLoading) return;

    const userMessage: CineBotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputVal('');
    setIsLoading(true);

    try {
      // Build previous turn history for conversation context
      const history = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text
      }));

      const context = (activeMovie || activeSeriesTitle || activeSeriesImdb) ? {
        activeMovieTitle: activeMovie?.title,
        activeMovieYear: activeMovie?.year,
        activeMovieGenres: activeMovie?.genres,
        activeSeriesTitle: activeSeriesTitle,
        activeSeriesImdb: activeSeriesImdb
      } : undefined;

      const res = await sendCineBotMessage({
        message: text,
        history,
        context
      });

      const botMessage: CineBotMessage = {
        id: `cinebot-${Date.now()}`,
        sender: 'cinebot',
        text: res.reply,
        timestamp: Date.now(),
        suggestedMovies: res.suggestedMovies,
        suggestedShows: res.suggestedShows,
        recommendedFilters: res.recommendedFilters,
        followUpSuggestions: res.followUpSuggestions,
        source: res.source
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: CineBotMessage = {
        id: `err-${Date.now()}`,
        sender: 'cinebot',
        text: "I ran into a temporary hiccup connecting to the film archives. Let's try another movie query or genre!",
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'cinebot',
        text: "Fresh slate! What cinematic journey are we embarking on next? Ask me for recommendations, vague plot memories, or specific director styles.",
        timestamp: Date.now(),
        followUpSuggestions: [
          "Atmospheric neo-noir crime thrillers",
          "Best psychological horror movies of the 2010s",
          "Under-the-radar sci-fi gems"
        ]
      }
    ]);
  };

  const renderFormattedMarkdown = (text: string) => {
    // Split by paragraphs
    const paragraphs = text.split(/\n\n+/);

    return (
      <div className="space-y-2.5 text-xs sm:text-[13px] leading-relaxed cv-text-secondary">
        {paragraphs.map((para, idx) => {
          // Check for bullet lists
          if (para.startsWith('- ') || para.startsWith('* ')) {
            const listItems = para.split(/\n[-*]\s+/).filter(Boolean);
            return (
              <ul key={idx} className="space-y-1.5 pl-4 list-disc marker:text-[var(--cv-accent-text)]">
                {listItems.map((item, itemIdx) => (
                  <li key={itemIdx}>
                    {renderInlineFormatting(item.replace(/^[-*]\s+/, ''))}
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <p key={idx}>
              {renderInlineFormatting(para)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInlineFormatting = (text: string) => {
    // Bold formatting: **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold tracking-wide cv-text">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  if (!isOpen) return null;

  // Minimized Floating Pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full text-xs font-bold transition-all cursor-pointer group cv-surface-elevated border hover:bg-[var(--cv-surface-hover)] hover:border-[var(--cv-border-hover)]"
          title="Restore CineBot AI Concierge"
        >
          <div className="relative flex items-center justify-center w-6 h-6 rounded-full cv-btn-primary">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: 'var(--cv-success-soft-fg)' }}
              aria-hidden="true"
            />
          </div>
          <span className="cv-text-accent font-bold">
            CineBot AI
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full cv-surface-muted cv-text-muted">
            {messages.length - 1} msgs
          </span>
          <Maximize2 className="w-3.5 h-3.5 cv-text-muted group-hover:text-[var(--cv-text)]" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div 
      id="cinebot-modal-window"
      className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[460px] sm:h-[660px] max-h-[100vh] sm:max-h-[calc(100vh-2rem)] z-50 flex flex-col sm:border sm:rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 cinebot-modal-window cv-surface-elevated modal-dialog-surface"
      role="dialog"
      aria-modal="true"
      aria-label="CineBot AI Movie Concierge"
    >
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b shrink-0 cinebot-header cv-surface-muted cv-border-subtle">
        <div className="flex items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-tight flex items-center gap-1.5 cinebot-header-title cv-text">
                <span>CineBot AI</span>
                <span className="cv-nav-soft-active text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded">
                  Gemini AI
                </span>
              </h2>
            </div>
            <p className="text-[11px] leading-tight cinebot-header-sub cv-text-muted">
              Film Concierge & Vibe Discovery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 cv-text-muted">
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg transition-colors cursor-pointer cinebot-header-btn hover:text-[var(--cv-text)] hover:bg-[var(--cv-surface-hover)]"
            title="Reset conversation"
            aria-label="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="hidden sm:flex p-1.5 rounded-lg transition-colors cursor-pointer cinebot-header-btn hover:text-[var(--cv-text)] hover:bg-[var(--cv-surface-hover)]"
            title="Minimize to floating widget"
            aria-label="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors cursor-pointer cinebot-header-btn hover:text-[var(--cv-text)] hover:bg-[var(--cv-surface-hover)]"
            title="Close CineBot"
            aria-label="Close"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Active Context Banner (if viewing a movie) */}
      {activeMovie && (
        <div className="px-3.5 py-2 border-b flex items-center justify-between text-xs cv-nav-soft-active">
          <span className="truncate">
            Targeting: <strong className="cv-text font-bold">{activeMovie.title}</strong> ({activeMovie.year})
          </span>
          <button
            type="button"
            onClick={() => handleSendMessage(`What are the best movies with a similar vibe or theme to "${activeMovie.title}" (${activeMovie.year})?`)}
            className="cv-btn-primary text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-colors shrink-0 ml-2 cursor-pointer"
          >
            Find Similar
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 scrollbar-thin cinebot-messages-area cv-shell">
        {messages.map((msg) => {
          const isBot = msg.sender === 'cinebot';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} animate-in fade-in duration-200`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                  isBot
                    ? 'cv-card border shadow-sm cinebot-bubble-bot'
                    : 'cv-btn-primary shadow-lg rounded-br-xs cinebot-bubble-user'
                }`}
              >
                {isBot ? (
                  renderFormattedMarkdown(msg.text)
                ) : (
                  <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap font-medium">
                    {msg.text}
                  </p>
                )}

                {/* Filter recommendation button */}
                {isBot && msg.recommendedFilters && (
                  <div className="mt-3 pt-2.5 border-t cv-border-subtle">
                    {msg.recommendedFilters.format === 'tv' && onNavigateToSeries ? (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateToSeries(msg.suggestedShows?.[0]?.title);
                          onClose();
                        }}
                        className="cv-badge-info flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer cinebot-filter-btn"
                        title="Explore TV Series Catalog"
                      >
                        <Tv className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Explore TV Series Catalog</span>
                      </button>
                    ) : onApplyFilters ? (
                      <button
                        type="button"
                        onClick={() => {
                          const filtersToApply: Partial<FilterParams> = {};
                          if (msg.recommendedFilters?.genre) filtersToApply.genre = msg.recommendedFilters.genre;
                          if (msg.recommendedFilters?.minimum_rating) filtersToApply.minimum_rating = msg.recommendedFilters.minimum_rating;
                          if (msg.recommendedFilters?.decade) filtersToApply.decade = msg.recommendedFilters.decade;
                          onApplyFilters(filtersToApply);
                          onClose();
                        }}
                        className="cv-nav-soft-active flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer cinebot-filter-btn"
                        title="Apply recommended filters to main catalog"
                      >
                        <SlidersHorizontal className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>
                          Apply Catalog Filter {msg.recommendedFilters.genre ? `(${msg.recommendedFilters.genre})` : ''}
                        </span>
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Suggested Movies Carousel / Mini Cards */}
              {isBot && msg.suggestedMovies && msg.suggestedMovies.length > 0 && (
                <div className="w-full mt-2.5 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 pl-1 cv-text-muted">
                    <Film className="w-3 h-3 cv-text-accent" aria-hidden="true" />
                    <span>Recommended Films</span>
                  </div>

                  <div className="space-y-2">
                    {msg.suggestedMovies.map((sugg, sIdx) => {
                      const movieObj = sugg.movieData;
                      const isBookmarked = movieObj ? watchlist.some((w) => w.id === movieObj.id) : false;
                      const posterUrl = getPrimaryMoviePoster(movieObj);

                      return (
                        <div
                          key={sIdx}
                          className="flex items-center gap-3 p-2.5 rounded-xl border transition-all group cinebot-movie-card cv-card-interactive shadow-xs"
                        >
                          {/* Movie Poster */}
                          <div 
                            onClick={() => handleMovieClick(sugg)}
                            className="relative w-11 h-16 rounded-lg overflow-hidden shrink-0 bg-neutral-900 cursor-pointer shadow-sm"
                          >
                            <img
                              src={normalizeImageUrl(posterUrl)}
                              alt={sugg.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = CINEVAULT_POSTER_FALLBACK;
                              }}
                            />
                            {movieObj?.rating ? (
                              <div className="poster-badge absolute bottom-0 inset-x-0 bg-black/85 backdrop-blur-xs py-0.5 text-center text-[9px] font-bold cv-rating-overlay flex items-center justify-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                                <span>{movieObj.rating.toFixed(1)}</span>
                              </div>
                            ) : null}
                          </div>

                          {/* Movie Details & Actions */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1">
                              <h4 
                                onClick={() => handleMovieClick(sugg)}
                                className="text-xs font-bold truncate cursor-pointer transition-colors cinebot-movie-title cv-text cv-group-hover-accent"
                              >
                                {sugg.title}
                              </h4>
                              {sugg.year && (
                                <span className="text-[10px] font-mono shrink-0 cinebot-movie-year cv-text-muted">
                                  {sugg.year}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] line-clamp-2 mt-0.5 cinebot-movie-reason cv-text-secondary">
                              {sugg.reason}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => handleMovieClick(sugg)}
                                className="cv-btn-secondary text-[10px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer cinebot-action-btn-neutral"
                              >
                                Details
                              </button>

                              {movieObj?.yt_trailer_code && onPlayTrailer && (
                                <button
                                  type="button"
                                  onClick={() => onPlayTrailer(movieObj.yt_trailer_code, movieObj.title)}
                                  className="cv-btn-playback-soft flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer cinebot-trailer-btn"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
                                  <span>Trailer</span>
                                </button>
                              )}

                              {movieObj && (
                                <button
                                  type="button"
                                  onClick={() => onToggleWatchlist(movieObj)}
                                  className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer cinebot-save-btn ${
                                    isBookmarked ? 'is-saved cv-rating-badge' : 'cv-btn-secondary'
                                  }`}
                                  title={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
                                >
                                  {isBookmarked ? (
                                    <>
                                      <BookmarkCheck className="w-2.5 h-2.5" aria-hidden="true" />
                                      <span>Saved</span>
                                    </>
                                  ) : (
                                    <>
                                      <Bookmark className="w-2.5 h-2.5" aria-hidden="true" />
                                      <span>Save</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Suggested TV Series Cards */}
              {isBot && msg.suggestedShows && msg.suggestedShows.length > 0 && (
                <div className="w-full mt-2.5 space-y-2">
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 pl-1"
                    style={{ color: 'var(--cv-info-soft-fg)' }}
                  >
                    <Tv className="w-3 h-3" aria-hidden="true" />
                    <span>Recommended TV Series & Shows</span>
                  </div>

                  <div className="space-y-2">
                    {msg.suggestedShows.map((showSugg, showIdx) => {
                      const showObj = showSugg.showData;
                      const posterUrl = getPrimarySeriesPoster(showObj || {
                        name: showSugg.title,
                        imdb_code: showSugg.imdb_code,
                        year: showSugg.year
                      });
                      const networkName = showObj?.network;
                      const ratingVal = showObj?.rating;
                      const displayYear = showSugg.year || showObj?.year;

                      return (
                        <div
                          key={showIdx}
                          className="flex items-center gap-3 p-2.5 rounded-xl border transition-all group cinebot-movie-card cv-card-interactive shadow-xs"
                        >
                          {/* Series Poster */}
                          <div 
                            onClick={() => handleSeriesClick(showSugg)}
                            className="relative w-11 h-16 rounded-lg overflow-hidden shrink-0 bg-neutral-900 cursor-pointer shadow-sm"
                          >
                            <img
                              src={normalizeImageUrl(posterUrl)}
                              alt={showSugg.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = CINEVAULT_POSTER_FALLBACK;
                              }}
                            />
                            <div className="absolute top-0 right-0 bg-sky-700 text-[8px] font-bold text-white px-1 py-0.5 rounded-bl">
                              TV
                            </div>
                            {ratingVal ? (
                              <div className="poster-badge absolute bottom-0 inset-x-0 bg-black/85 backdrop-blur-xs py-0.5 text-center text-[9px] font-bold cv-rating-overlay flex items-center justify-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                                <span>{Number(ratingVal).toFixed(1)}</span>
                              </div>
                            ) : null}
                          </div>

                          {/* Series Details & Actions */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1">
                              <h4 
                                onClick={() => handleSeriesClick(showSugg)}
                                className="text-xs font-bold truncate cursor-pointer transition-colors cinebot-movie-title cv-text cv-group-hover-accent"
                              >
                                {showSugg.title}
                              </h4>
                              <div className="flex items-center gap-1 shrink-0">
                                {displayYear && (
                                  <span className="text-[10px] font-mono cv-text-muted">
                                    {String(displayYear).slice(0, 4)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {networkName && (
                              <div
                                className="text-[9px] font-medium"
                                style={{ color: 'var(--cv-info-soft-fg)' }}
                              >
                                {networkName}
                              </div>
                            )}

                            <p className="text-[11px] line-clamp-2 mt-0.5 cinebot-movie-reason cv-text-secondary">
                              {showSugg.reason || showObj?.summary?.replace(/<[^>]*>/g, '') || 'Critically acclaimed television series.'}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => handleSeriesClick(showSugg)}
                                className="cv-badge-info flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer"
                              >
                                <Tv className="w-2.5 h-2.5" aria-hidden="true" />
                                <span>Episodes & Torrents</span>
                              </button>

                              {onNavigateToSeries && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onNavigateToSeries(showSugg.title, showSugg.imdb_code);
                                    onClose();
                                  }}
                                  className="cv-btn-secondary text-[10px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer cinebot-action-btn-neutral"
                                >
                                  Search TV Tab
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Follow-up Question Chips */}
              {isBot && msg.followUpSuggestions && msg.followUpSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pl-1 max-w-[95%]">
                  {msg.followUpSuggestions.map((suggestion, sugIdx) => (
                    <button
                      type="button"
                      key={sugIdx}
                      onClick={() => handleSendMessage(suggestion)}
                      className="cv-btn-secondary text-[11px] px-2.5 py-1 rounded-full text-left transition-all cursor-pointer cinebot-chip-btn"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-2xl border cv-card cv-text-muted w-max animate-pulse">
            <Sparkles className="w-3.5 h-3.5 cv-text-accent animate-spin" aria-hidden="true" />
            <span>CineBot is researching films...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starting Prompts Bar (when only welcome message exists) */}
      {messages.length <= 1 && (
        <div className="px-3 py-2 border-t shrink-0 cinebot-quick-prompts-bar cv-surface-muted cv-border-subtle">
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1 cv-text-muted">
            Quick Prompts
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CINEBOT_QUICK_PROMPTS.map((qp, qIdx) => (
              <button
                type="button"
                key={qIdx}
                onClick={() => handleSendMessage(qp.prompt)}
                className="cv-btn-secondary flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                <span aria-hidden="true">{qp.icon}</span>
                <span>{qp.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form Bar */}
      <footer className="p-3 border-t shrink-0 cinebot-footer-area cv-card cv-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <label htmlFor="cinebot-chat-input" className="sr-only">
              Ask CineBot
            </label>
            <input
              id="cinebot-chat-input"
              name="cinebotPrompt"
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask CineBot (e.g. 'Loki series', 'shows like Dark', '90s sci-fi')..."
              className="cv-input w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none transition-colors cinebot-input-field"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={!inputVal.trim() || isLoading}
            className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
              inputVal.trim() && !isLoading
                ? 'cv-btn-primary shadow-md cursor-pointer'
                : 'cv-surface-muted cv-text-subtle cursor-not-allowed'
            }`}
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
        <div className="mt-1.5 text-center text-[10px] cinebot-footer-caption cv-text-muted">
          Powered by Gemini 3.8 Flash • Real catalog sync & smart mood recommendations
        </div>
      </footer>
    </div>
  );
};
