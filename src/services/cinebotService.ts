import { CineBotMessage, Movie } from '../types';

export interface CineBotContext {
  activeMovieTitle?: string;
  activeMovieYear?: number;
  activeMovieGenres?: string[];
  currentGenre?: string;
  watchlistTitles?: string[];
}

export interface CineBotChatPayload {
  message: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  context?: CineBotContext;
}

export interface CineBotChatResponse {
  status: 'ok' | 'error';
  reply: string;
  suggestedMovies?: Array<{
    title: string;
    year?: number;
    reason: string;
    searchTerm?: string;
    movieData?: Movie;
  }>;
  recommendedFilters?: {
    genre?: string | null;
    minimum_rating?: number | null;
    decade?: string | null;
    quality?: string | null;
  };
  followUpSuggestions?: string[];
  source?: string;
}

export const CINEBOT_QUICK_PROMPTS = [
  {
    icon: '🔍',
    label: 'Identify Vague Plot',
    prompt: 'Can you help me find a movie where a group of magicians pull off bank heists during their shows?'
  },
  {
    icon: '🧠',
    label: 'Mind-Bending Sci-Fi',
    prompt: 'Give me complex, mind-bending sci-fi films with puzzle plots and twist endings like Arrival and Primer.'
  },
  {
    icon: '🍷',
    label: 'Date Night Decider',
    prompt: 'We need a witty, charming, fast-paced movie under 110 minutes with great chemistry and no cringe.'
  },
  {
    icon: '🌧️',
    label: 'Atmospheric Neo-Noir',
    prompt: 'Atmospheric, rain-soaked crime mysteries with brooding detectives and stylish visuals like Blade Runner or Se7en.'
  },
  {
    icon: '🍿',
    label: 'Adrenaline Rush',
    prompt: 'High-octane survival action movies with minimal CGI and relentless pacing like Mad Max: Fury Road.'
  },
  {
    icon: '💎',
    label: 'Hidden 90s Gems',
    prompt: 'Underrated 90s thriller and crime gems with high ratings that most people haven’t seen.'
  }
];

export async function sendCineBotMessage(payload: CineBotChatPayload): Promise<CineBotChatResponse> {
  try {
    const res = await fetch('/api/cinebot/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) {
        return data as CineBotChatResponse;
      }
    }
  } catch (err) {
    console.warn('[CineBot] Fetch error:', err);
  }

  // Fallback if network or server endpoint is unreachable
  return {
    status: 'ok',
    reply: "I'm temporarily operating in offline cinephile mode. I love films with razor-sharp direction and unforgettable atmosphere. Tell me a favorite director, genre, or the exact feeling you want to experience tonight!",
    suggestedMovies: [
      {
        title: 'Inception',
        year: 2010,
        reason: 'Masterclass in cerebral sci-fi heists and practical set-pieces.'
      },
      {
        title: 'Prisoners',
        year: 2013,
        reason: 'Relentless atmospheric tension and haunting performances.'
      }
    ],
    recommendedFilters: {
      genre: 'Thriller',
      minimum_rating: 8
    },
    followUpSuggestions: [
      'Show me movies with unexpected twist endings',
      'What are the best Christopher Nolan movies?',
      'Recommend an intense survival thriller'
    ],
    source: 'cinevault-curated'
  };
}
