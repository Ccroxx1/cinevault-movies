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
  Film
} from 'lucide-react';
import { Movie, CineBotMessage, FilterParams } from '../types';
import { sendCineBotMessage, CINEBOT_QUICK_PROMPTS } from '../services/cinebotService';
import { CINEVAULT_POSTER_FALLBACK, normalizeImageUrl } from '../utils/imageFallback';

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
  activeMovie
}) => {
  const [messages, setMessages] = useState<CineBotMessage[]>(() => {
    return [
      {
        id: 'welcome-msg',
        sender: 'cinebot',
        text: "👋 Welcome to **CineBot**! I'm your AI movie concierge and resident cinephile.\n\nHere are some things you can ask me:\n- 🔍 **Forgotten Plots:** *\"What is the movie where magicians rob a bank during a show?\"*\n- 🍿 **Nuanced Vibes:** *\"Fast-paced 90s cyber thriller with practical effects\"*\n- 🍷 **Date Night:** *\"Sharp, funny, non-cringe romance under 100 minutes\"*\n- 🧠 **Themes & Directors:** *\"Movies with cosmic mystery like Interstellar or Arrival\"*",
        timestamp: Date.now(),
        followUpSuggestions: [
          "Suggest a mind-bending sci-fi with twist endings",
          "What are the best neo-noir thrillers?",
          "Find a fast-paced survival action film"
        ]
      }
    ];
  });

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

      const context = activeMovie ? {
        activeMovieTitle: activeMovie.title,
        activeMovieYear: activeMovie.year,
        activeMovieGenres: activeMovie.genres
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
      <div className="space-y-2.5 text-xs sm:text-[13px] leading-relaxed">
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
          <strong key={i} className="font-bold text-white tracking-wide">
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
          className="flex items-center gap-2.5 px-4 py-3 bg-[#0d0d0f] hover:bg-[#16161a] border border-rose-500/40 rounded-full shadow-[0_8px_30px_rgba(225,29,72,0.3)] text-white text-xs font-bold transition-all cursor-pointer group"
          title="Restore CineBot AI Concierge"
        >
          <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <span className="text-rose-300 group-hover:text-white transition-colors">CineBot AI</span>
          <span className="text-[10px] text-neutral-400 bg-white/5 px-2 py-0.5 rounded-full">
            {messages.length - 1} msgs
          </span>
          <Maximize2 className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white" />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[460px] sm:h-[660px] max-h-[100vh] sm:max-h-[calc(100vh-2rem)] z-50 flex flex-col bg-[#0b0b0e] border sm:border border-white/10 sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      role="dialog"
      aria-label="CineBot AI Movie Concierge"
    >
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#14141a] via-[#101015] to-[#14141a] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 shadow-md shadow-rose-900/30 text-white">
            <Sparkles className="w-4 h-4" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#14141a]" title="Online"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                <span>CineBot AI</span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Gemini AI
                </span>
              </h2>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">
              Film Concierge & Vibe Discovery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-neutral-400">
          <button
            onClick={handleClearHistory}
            className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            title="Reset conversation"
            aria-label="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="hidden sm:flex p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            title="Minimize to floating widget"
            aria-label="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            title="Close CineBot"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Active Context Banner (if viewing a movie) */}
      {activeMovie && (
        <div className="px-3.5 py-2 bg-rose-950/30 border-b border-rose-500/20 flex items-center justify-between text-xs text-rose-200">
          <span className="truncate">
            Targeting: <strong className="text-white">{activeMovie.title}</strong> ({activeMovie.year})
          </span>
          <button
            onClick={() => handleSendMessage(`What are the best movies with a similar vibe or theme to "${activeMovie.title}" (${activeMovie.year})?`)}
            className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2 py-0.5 rounded transition-colors shrink-0 ml-2 cursor-pointer"
          >
            Find Similar
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
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
                    ? 'bg-[#141419] border border-white/10 text-neutral-200 shadow-md'
                    : 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-950/40 rounded-br-xs'
                }`}
              >
                {isBot ? (
                  renderFormattedMarkdown(msg.text)
                ) : (
                  <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </p>
                )}

                {/* Filter recommendation button */}
                {isBot && msg.recommendedFilters && onApplyFilters && (
                  <div className="mt-3 pt-2.5 border-t border-white/10">
                    <button
                      onClick={() => {
                        const filtersToApply: Partial<FilterParams> = {};
                        if (msg.recommendedFilters?.genre) filtersToApply.genre = msg.recommendedFilters.genre;
                        if (msg.recommendedFilters?.minimum_rating) filtersToApply.minimum_rating = msg.recommendedFilters.minimum_rating;
                        if (msg.recommendedFilters?.decade) filtersToApply.decade = msg.recommendedFilters.decade;
                        onApplyFilters(filtersToApply);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                      title="Apply recommended filters to main catalog"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-rose-400" />
                      <span>
                        Apply Catalog Filter {msg.recommendedFilters.genre ? `(${msg.recommendedFilters.genre})` : ''}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Suggested Movies Carousel / Mini Cards */}
              {isBot && msg.suggestedMovies && msg.suggestedMovies.length > 0 && (
                <div className="w-full mt-2.5 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1 pl-1">
                    <Film className="w-3 h-3 text-rose-400" />
                    <span>Recommended Films</span>
                  </div>

                  <div className="space-y-2">
                    {msg.suggestedMovies.map((sugg, sIdx) => {
                      const movieObj = sugg.movieData;
                      const isBookmarked = movieObj ? watchlist.some((w) => w.id === movieObj.id) : false;
                      const posterUrl = movieObj?.medium_cover_image || movieObj?.small_cover_image || CINEVAULT_POSTER_FALLBACK;

                      return (
                        <div
                          key={sIdx}
                          className="flex items-center gap-3 p-2.5 bg-[#121216] hover:bg-[#18181f] border border-white/10 hover:border-rose-500/30 rounded-xl transition-all group"
                        >
                          {/* Movie Poster */}
                          <div 
                            onClick={() => {
                              if (movieObj) {
                                onSelectMovie(movieObj);
                              }
                            }}
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
                                onClick={() => {
                                  if (movieObj) onSelectMovie(movieObj);
                                }}
                                className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors truncate cursor-pointer"
                              >
                                {sugg.title}
                              </h4>
                              {sugg.year && (
                                <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                                  {sugg.year}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-neutral-300 line-clamp-2 mt-0.5">
                              {sugg.reason}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 mt-2">
                              {movieObj && (
                                <button
                                  onClick={() => onSelectMovie(movieObj)}
                                  className="text-[10px] font-semibold text-neutral-200 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/10 transition-colors cursor-pointer"
                                >
                                  Details
                                </button>
                              )}

                              {movieObj?.yt_trailer_code && onPlayTrailer && (
                                <button
                                  onClick={() => onPlayTrailer(movieObj.yt_trailer_code, movieObj.title)}
                                  className="flex items-center gap-1 text-[10px] font-semibold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/20 transition-colors cursor-pointer"
                                >
                                  <Play className="w-2.5 h-2.5 fill-rose-300" />
                                  <span>Trailer</span>
                                </button>
                              )}

                              {movieObj && (
                                <button
                                  onClick={() => onToggleWatchlist(movieObj)}
                                  className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                    isBookmarked
                                      ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                                      : 'text-neutral-400 hover:text-white bg-white/5 border border-white/10'
                                  }`}
                                  title={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
                                >
                                  {isBookmarked ? (
                                    <>
                                      <BookmarkCheck className="w-2.5 h-2.5 text-amber-400" />
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

              {/* Follow-up Question Chips */}
              {isBot && msg.followUpSuggestions && msg.followUpSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pl-1 max-w-[95%]">
                  {msg.followUpSuggestions.map((suggestion, sugIdx) => (
                    <button
                      key={sugIdx}
                      onClick={() => handleSendMessage(suggestion)}
                      className="text-[11px] text-neutral-300 hover:text-white bg-white/5 hover:bg-rose-600/20 hover:border-rose-500/40 border border-white/10 px-2.5 py-1 rounded-full text-left transition-all cursor-pointer"
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
          <div className="flex items-center gap-2 text-neutral-400 text-xs px-3 py-2 bg-[#141419] rounded-2xl border border-white/10 w-max animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-spin" />
            <span>CineBot is researching films...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starting Prompts Bar (when only welcome message exists) */}
      {messages.length <= 1 && (
        <div className="px-3 py-2 bg-[#0e0e12] border-t border-white/5 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5 px-1">
            Quick Prompts
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CINEBOT_QUICK_PROMPTS.map((qp, qIdx) => (
              <button
                key={qIdx}
                onClick={() => handleSendMessage(qp.prompt)}
                className="flex items-center gap-1.5 text-[11px] text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                <span>{qp.icon}</span>
                <span>{qp.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form Bar */}
      <footer className="p-3 bg-[#111116] border-t border-white/10 shrink-0">
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
              placeholder="Ask CineBot (e.g. 'thrillers like Prisoners', '80s sci-fi')..."
              className="w-full bg-[#181820] text-white placeholder-neutral-500 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-white/10 focus:border-rose-500 focus:outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={!inputVal.trim() || isLoading}
            className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              inputVal.trim() && !isLoading
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30'
                : 'bg-white/5 text-neutral-500 cursor-not-allowed'
            }`}
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-1.5 text-center text-[10px] text-neutral-400">
          Powered by Gemini 3.8 Flash • Real catalog sync & smart mood recommendations
        </div>
      </footer>
    </div>
  );
};
