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
import { useTheme } from '../context/ThemeContext';
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
  const { colorMode } = useTheme();
  const isWhite = colorMode === 'white';
  const isBlueBlack = colorMode === 'blue-black';

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
      <div className={`space-y-2.5 text-xs sm:text-[13px] leading-relaxed ${isWhite ? 'text-slate-800' : isBlueBlack ? 'text-slate-200' : 'text-neutral-200'}`}>
        {paragraphs.map((para, idx) => {
          // Check for bullet lists
          if (para.startsWith('- ') || para.startsWith('* ')) {
            const listItems = para.split(/\n[-*]\s+/).filter(Boolean);
            return (
              <ul key={idx} className="space-y-1.5 pl-4 list-disc marker:text-rose-500">
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
          <strong key={i} className={`font-bold tracking-wide ${isWhite ? 'text-slate-950 font-black' : 'text-white font-bold'}`}>
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
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-full text-xs font-bold transition-all cursor-pointer group shadow-lg ${
            isWhite
              ? 'bg-white hover:bg-slate-50 border border-rose-400/50 text-slate-900 shadow-rose-950/10'
              : isBlueBlack
              ? 'bg-[#0b142c] hover:bg-[#0f1d40] border border-sky-400/40 text-white shadow-sky-950/40'
              : 'bg-[#0d0d0f] hover:bg-[#16161a] border border-rose-500/40 text-white shadow-rose-950/30'
          }`}
          title="Restore CineBot AI Concierge"
        >
          <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <span className={isWhite ? 'text-rose-600 font-bold group-hover:text-rose-700' : 'text-rose-300 group-hover:text-white transition-colors'}>
            CineBot AI
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isWhite ? 'text-slate-600 bg-slate-100' : 'text-neutral-400 bg-white/5'}`}>
            {messages.length - 1} msgs
          </span>
          <Maximize2 className={`w-3.5 h-3.5 ${isWhite ? 'text-slate-500 group-hover:text-slate-900' : 'text-neutral-400 group-hover:text-white'}`} />
        </button>
      </div>
    );
  }

  return (
    <div 
      id="cinebot-modal-window"
      className={`fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[460px] sm:h-[660px] max-h-[100vh] sm:max-h-[calc(100vh-2rem)] z-50 flex flex-col sm:border sm:rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 cinebot-modal-window ${
        isWhite
          ? 'bg-white border-slate-200 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.18)]'
          : isBlueBlack
          ? 'bg-[#080e1e] border-sky-400/25 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.85)]'
          : 'bg-[#0b0b0e] border-white/10 text-neutral-200 shadow-[0_20px_60px_rgba(0,0,0,0.85)]'
      }`}
      role="dialog"
      aria-label="CineBot AI Movie Concierge"
    >
      {/* Top Header */}
      <header className={`flex items-center justify-between px-4 py-3 border-b shrink-0 cinebot-header ${
        isWhite
          ? 'bg-slate-50 border-slate-200'
          : isBlueBlack
          ? 'bg-[#0b142c] border-sky-400/20'
          : 'bg-gradient-to-r from-[#14141a] via-[#101015] to-[#14141a] border-white/10'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 shadow-md shadow-rose-900/30 text-white">
            <Sparkles className="w-4 h-4" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#14141a]" title="Online"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-black tracking-tight flex items-center gap-1.5 cinebot-header-title ${isWhite ? 'text-slate-950' : 'text-white'}`}>
                <span>CineBot AI</span>
                <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                  isWhite ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  Gemini AI
                </span>
              </h2>
            </div>
            <p className={`text-[11px] leading-tight cinebot-header-sub ${
              isWhite ? 'text-slate-500' : isBlueBlack ? 'text-sky-200/70' : 'text-neutral-400'
            }`}>
              Film Concierge & Vibe Discovery
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-1 ${isWhite ? 'text-slate-600' : 'text-neutral-400'}`}>
          <button
            onClick={handleClearHistory}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer cinebot-header-btn ${
              isWhite ? 'hover:text-slate-950 hover:bg-slate-200/70' : isBlueBlack ? 'hover:text-white hover:bg-sky-400/10' : 'hover:text-white hover:bg-white/5'
            }`}
            title="Reset conversation"
            aria-label="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className={`hidden sm:flex p-1.5 rounded-lg transition-colors cursor-pointer cinebot-header-btn ${
              isWhite ? 'hover:text-slate-950 hover:bg-slate-200/70' : isBlueBlack ? 'hover:text-white hover:bg-sky-400/10' : 'hover:text-white hover:bg-white/5'
            }`}
            title="Minimize to floating widget"
            aria-label="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer cinebot-header-btn ${
              isWhite ? 'hover:text-slate-950 hover:bg-slate-200/70' : isBlueBlack ? 'hover:text-white hover:bg-sky-400/10' : 'hover:text-white hover:bg-white/5'
            }`}
            title="Close CineBot"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Active Context Banner (if viewing a movie) */}
      {activeMovie && (
        <div className={`px-3.5 py-2 border-b flex items-center justify-between text-xs ${
          isWhite ? 'bg-rose-50/90 border-rose-200 text-rose-900' : 'bg-rose-950/30 border-rose-500/20 text-rose-200'
        }`}>
          <span className="truncate">
            Targeting: <strong className={isWhite ? 'text-rose-950 font-bold' : 'text-white'}>{activeMovie.title}</strong> ({activeMovie.year})
          </span>
          <button
            onClick={() => handleSendMessage(`What are the best movies with a similar vibe or theme to "${activeMovie.title}" (${activeMovie.year})?`)}
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors shrink-0 ml-2 cursor-pointer ${
              isWhite ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300'
            }`}
          >
            Find Similar
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className={`flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 scrollbar-thin cinebot-messages-area ${
        isWhite ? 'bg-[#f8fafc] scrollbar-thumb-slate-300' : isBlueBlack ? 'bg-[#060b17] scrollbar-thumb-sky-900' : 'bg-[#0b0b0e] scrollbar-thumb-white/10'
      }`}>
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
                    ? isWhite
                      ? 'bg-white border border-slate-200 text-slate-800 shadow-sm cinebot-bubble-bot'
                      : isBlueBlack
                      ? 'bg-[#0e1938] border border-sky-400/20 text-slate-200 shadow-md cinebot-bubble-bot'
                      : 'bg-[#141419] border border-white/10 text-neutral-200 shadow-md cinebot-bubble-bot'
                    : 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-950/40 rounded-br-xs cinebot-bubble-user'
                }`}
              >
                {isBot ? (
                  renderFormattedMarkdown(msg.text)
                ) : (
                  <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap font-medium text-white">
                    {msg.text}
                  </p>
                )}

                {/* Filter recommendation button */}
                {isBot && msg.recommendedFilters && (
                  <div className={`mt-3 pt-2.5 border-t ${isWhite ? 'border-slate-100' : 'border-white/10'}`}>
                    {msg.recommendedFilters.format === 'tv' && onNavigateToSeries ? (
                      <button
                        onClick={() => {
                          onNavigateToSeries(msg.suggestedShows?.[0]?.title);
                          onClose();
                        }}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer cinebot-filter-btn ${
                          isWhite
                            ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'
                            : isBlueBlack
                            ? 'bg-sky-950/60 hover:bg-sky-900/70 text-sky-200 border-sky-400/30'
                            : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30'
                        }`}
                        title="Explore TV Series Catalog"
                      >
                        <Tv className="w-3.5 h-3.5 text-sky-400" />
                        <span>Explore TV Series Catalog</span>
                      </button>
                    ) : onApplyFilters ? (
                      <button
                        onClick={() => {
                          const filtersToApply: Partial<FilterParams> = {};
                          if (msg.recommendedFilters?.genre) filtersToApply.genre = msg.recommendedFilters.genre;
                          if (msg.recommendedFilters?.minimum_rating) filtersToApply.minimum_rating = msg.recommendedFilters.minimum_rating;
                          if (msg.recommendedFilters?.decade) filtersToApply.decade = msg.recommendedFilters.decade;
                          onApplyFilters(filtersToApply);
                          onClose();
                        }}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer cinebot-filter-btn ${
                          isWhite
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30'
                        }`}
                        title="Apply recommended filters to main catalog"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-rose-500" />
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
                  <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 pl-1 ${
                    isWhite ? 'text-slate-500' : isBlueBlack ? 'text-sky-300/70' : 'text-neutral-400'
                  }`}>
                    <Film className="w-3 h-3 text-rose-500" />
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
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all group cinebot-movie-card ${
                            isWhite
                              ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-rose-300 shadow-xs'
                              : isBlueBlack
                              ? 'bg-[#0d1633] hover:bg-[#121e44] border-sky-400/20 hover:border-sky-400/40 shadow-sm'
                              : 'bg-[#121216] hover:bg-[#18181f] border-white/10 hover:border-rose-500/30'
                          }`}
                        >
                          {/* Movie Poster */}
                          <div 
                            onClick={() => handleMovieClick(sugg)}
                            className="relative w-11 h-16 rounded-lg overflow-hidden shrink-0 bg-neutral-800 cursor-pointer shadow-sm"
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
                              <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs py-0.5 text-center text-[9px] font-bold text-amber-400 flex items-center justify-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                <span>{movieObj.rating.toFixed(1)}</span>
                              </div>
                            ) : null}
                          </div>

                          {/* Movie Details & Actions */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1">
                              <h4 
                                onClick={() => handleMovieClick(sugg)}
                                className={`text-xs font-bold truncate cursor-pointer transition-colors cinebot-movie-title ${
                                  isWhite ? 'text-slate-900 group-hover:text-rose-600' : 'text-white group-hover:text-rose-400'
                                }`}
                              >
                                {sugg.title}
                              </h4>
                              {sugg.year && (
                                <span className={`text-[10px] font-mono shrink-0 cinebot-movie-year ${
                                  isWhite ? 'text-slate-500' : isBlueBlack ? 'text-sky-300/70' : 'text-neutral-400'
                                }`}>
                                  {sugg.year}
                                </span>
                              )}
                            </div>

                            <p className={`text-[11px] line-clamp-2 mt-0.5 cinebot-movie-reason ${
                              isWhite ? 'text-slate-600' : isBlueBlack ? 'text-slate-300' : 'text-neutral-300'
                            }`}>
                              {sugg.reason}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handleMovieClick(sugg)}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer cinebot-action-btn-neutral ${
                                  isWhite
                                    ? 'text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border-slate-200'
                                    : isBlueBlack
                                    ? 'text-sky-200 hover:text-white bg-sky-950/40 hover:bg-sky-900/50 border-sky-400/30'
                                    : 'text-neutral-200 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
                                }`}
                              >
                                Details
                              </button>

                              {movieObj?.yt_trailer_code && onPlayTrailer && (
                                <button
                                  onClick={() => onPlayTrailer(movieObj.yt_trailer_code, movieObj.title)}
                                  className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer cinebot-trailer-btn ${
                                    isWhite
                                      ? 'text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                      : 'text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20'
                                  }`}
                                >
                                  <Play className="w-2.5 h-2.5 fill-rose-500" />
                                  <span>Trailer</span>
                                </button>
                              )}

                              {movieObj && (
                                <button
                                  onClick={() => onToggleWatchlist(movieObj)}
                                  className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer cinebot-save-btn ${
                                    isBookmarked ? 'is-saved' : ''
                                  } ${
                                    isBookmarked
                                      ? isWhite
                                        ? 'text-amber-700 bg-amber-50 border border-amber-300'
                                        : 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                                      : isWhite
                                      ? 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                                      : isBlueBlack
                                      ? 'text-sky-200 hover:text-white bg-sky-950/40 hover:bg-sky-900/50 border border-sky-400/20'
                                      : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
                                  }`}
                                  title={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
                                >
                                  {isBookmarked ? (
                                    <>
                                      <BookmarkCheck className="w-2.5 h-2.5 text-amber-500" />
                                      <span>Saved</span>
                                    </>
                                  ) : (
                                    <>
                                      <Bookmark className="w-2.5 h-2.5" />
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
                  <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 pl-1 ${
                    isWhite ? 'text-sky-700' : isBlueBlack ? 'text-sky-300' : 'text-sky-400'
                  }`}>
                    <Tv className="w-3 h-3 text-sky-400" />
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
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all group cinebot-movie-card ${
                            isWhite
                              ? 'bg-white hover:bg-sky-50/40 border-slate-200 hover:border-sky-300 shadow-xs'
                              : isBlueBlack
                              ? 'bg-[#0d1633] hover:bg-[#121e44] border-sky-400/20 hover:border-sky-400/40 shadow-sm'
                              : 'bg-[#121216] hover:bg-[#141b2b] border-white/10 hover:border-sky-500/30'
                          }`}
                        >
                          {/* Series Poster */}
                          <div 
                            onClick={() => handleSeriesClick(showSugg)}
                            className="relative w-11 h-16 rounded-lg overflow-hidden shrink-0 bg-neutral-800 cursor-pointer shadow-sm"
                          >
                            <img
                              src={normalizeImageUrl(posterUrl)}
                              alt={showSugg.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = CINEVAULT_POSTER_FALLBACK;
                              }}
                            />
                            <div className="absolute top-0 right-0 bg-sky-600/90 text-[8px] font-bold text-white px-1 py-0.2 rounded-bl">
                              TV
                            </div>
                            {ratingVal ? (
                              <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs py-0.5 text-center text-[9px] font-bold text-amber-400 flex items-center justify-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                <span>{Number(ratingVal).toFixed(1)}</span>
                              </div>
                            ) : null}
                          </div>

                          {/* Series Details & Actions */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1">
                              <h4 
                                onClick={() => handleSeriesClick(showSugg)}
                                className={`text-xs font-bold truncate cursor-pointer transition-colors cinebot-movie-title ${
                                  isWhite ? 'text-slate-900 group-hover:text-sky-600' : 'text-white group-hover:text-sky-400'
                                }`}
                              >
                                {showSugg.title}
                              </h4>
                              <div className="flex items-center gap-1 shrink-0">
                                {displayYear && (
                                  <span className={`text-[10px] font-mono ${
                                    isWhite ? 'text-slate-500' : isBlueBlack ? 'text-sky-300/70' : 'text-neutral-400'
                                  }`}>
                                    {String(displayYear).slice(0, 4)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {networkName && (
                              <div className={`text-[9px] font-medium ${
                                isWhite ? 'text-sky-600' : 'text-sky-300'
                              }`}>
                                {networkName}
                              </div>
                            )}

                            <p className={`text-[11px] line-clamp-2 mt-0.5 cinebot-movie-reason ${
                              isWhite ? 'text-slate-600' : isBlueBlack ? 'text-slate-300' : 'text-neutral-300'
                            }`}>
                              {showSugg.reason || showObj?.summary?.replace(/<[^>]*>/g, '') || 'Critically acclaimed television series.'}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handleSeriesClick(showSugg)}
                                className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                  isWhite
                                    ? 'text-sky-800 hover:text-sky-950 bg-sky-50 hover:bg-sky-100 border-sky-200'
                                    : isBlueBlack
                                    ? 'text-sky-200 hover:text-white bg-sky-950/60 hover:bg-sky-900/70 border-sky-400/30'
                                    : 'text-sky-300 hover:text-sky-100 bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/20'
                                }`}
                              >
                                <Tv className="w-2.5 h-2.5 text-sky-400" />
                                <span>Episodes & Torrents</span>
                              </button>

                              {onNavigateToSeries && (
                                <button
                                  onClick={() => {
                                    onNavigateToSeries(showSugg.title, showSugg.imdb_code);
                                    onClose();
                                  }}
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer cinebot-action-btn-neutral ${
                                    isWhite
                                      ? 'text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border-slate-200'
                                      : isBlueBlack
                                      ? 'text-sky-200 hover:text-white bg-sky-950/40 hover:bg-sky-900/50 border-sky-400/30'
                                      : 'text-neutral-200 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
                                  }`}
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
                      key={sugIdx}
                      onClick={() => handleSendMessage(suggestion)}
                      className={`text-[11px] px-2.5 py-1 rounded-full text-left transition-all cursor-pointer border cinebot-chip-btn ${
                        isWhite
                          ? 'text-slate-700 hover:text-slate-950 bg-white hover:bg-rose-50 hover:border-rose-300 border-slate-200 shadow-2xs'
                          : isBlueBlack
                          ? 'text-sky-100 hover:text-white bg-sky-950/40 hover:bg-sky-900/50 hover:border-sky-400/40 border-sky-400/20'
                          : 'text-neutral-300 hover:text-white bg-white/5 hover:bg-rose-600/20 hover:border-rose-500/40 border-white/10'
                      }`}
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
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-2xl border w-max animate-pulse ${
            isWhite
              ? 'bg-white border-slate-200 text-slate-600 shadow-sm'
              : isBlueBlack
              ? 'bg-[#0e1938] border-sky-400/20 text-sky-200'
              : 'bg-[#141419] border-white/10 text-neutral-400'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-spin" />
            <span>CineBot is researching films...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starting Prompts Bar (when only welcome message exists) */}
      {messages.length <= 1 && (
        <div className={`px-3 py-2 border-t shrink-0 cinebot-quick-prompts-bar ${
          isWhite ? 'bg-slate-50 border-slate-200' : isBlueBlack ? 'bg-[#0a1226] border-sky-400/15' : 'bg-[#0e0e12] border-white/5'
        }`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1 ${
            isWhite ? 'text-slate-500' : isBlueBlack ? 'text-sky-300/70' : 'text-neutral-400'
          }`}>
            Quick Prompts
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CINEBOT_QUICK_PROMPTS.map((qp, qIdx) => (
              <button
                key={qIdx}
                onClick={() => handleSendMessage(qp.prompt)}
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-xl border whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  isWhite
                    ? 'text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border-slate-200 shadow-2xs'
                    : isBlueBlack
                    ? 'text-sky-100 hover:text-white bg-[#0e1834] hover:bg-sky-900/40 border-sky-400/20'
                    : 'text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
                }`}
              >
                <span>{qp.icon}</span>
                <span>{qp.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form Bar */}
      <footer className={`p-3 border-t shrink-0 cinebot-footer-area ${
        isWhite ? 'bg-white border-slate-200' : isBlueBlack ? 'bg-[#091024] border-sky-400/20' : 'bg-[#111116] border-white/10'
      }`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask CineBot (e.g. 'Loki series', 'shows like Dark', '90s sci-fi')..."
              className={`w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none transition-colors cinebot-input-field ${
                isWhite
                  ? 'bg-slate-50 text-slate-900 placeholder-slate-400 border-slate-300 focus:bg-white focus:border-rose-500'
                  : isBlueBlack
                  ? 'bg-[#0e1834] text-white placeholder-sky-300/40 border-sky-400/25 focus:border-sky-400'
                  : 'bg-[#181820] text-white placeholder-neutral-500 border-white/10 focus:border-rose-500'
              }`}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={!inputVal.trim() || isLoading}
            className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              inputVal.trim() && !isLoading
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30'
                : isWhite
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-white/5 text-neutral-500 cursor-not-allowed'
            }`}
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className={`mt-1.5 text-center text-[10px] cinebot-footer-caption ${
          isWhite ? 'text-slate-500' : isBlueBlack ? 'text-sky-300/60' : 'text-neutral-400'
        }`}>
          Powered by Gemini 3.8 Flash • Real catalog sync & smart mood recommendations
        </div>
      </footer>
    </div>
  );
};
