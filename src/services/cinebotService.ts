import { CineBotMessage, Movie, TvShowInfo, CineBotShowSuggestion } from '../types';

export interface CineBotContext {
  activeMovieTitle?: string;
  activeMovieYear?: number;
  activeMovieGenres?: string[];
  activeSeriesTitle?: string;
  activeSeriesImdb?: string;
  currentGenre?: string;
  watchlistTitles?: string[];
  preferredFormat?: 'movie' | 'tv' | 'all';
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
  suggestedShows?: Array<{
    title: string;
    year?: number | string;
    reason: string;
    searchTerm?: string;
    imdb_code?: string;
    showData?: TvShowInfo;
  }>;
  recommendedFilters?: {
    genre?: string | null;
    minimum_rating?: number | null;
    decade?: string | null;
    quality?: string | null;
    format?: 'movie' | 'tv' | 'all' | null;
  };
  followUpSuggestions?: string[];
  source?: string;
}

export const CINEBOT_QUICK_PROMPTS = [
  {
    icon: '📺',
    label: 'Search Loki & TV Series',
    prompt: 'Tell me about the Loki TV series and other mind-bending sci-fi shows like Dark, Severance, and Fallout.'
  },
  {
    icon: '🔍',
    label: 'Identify Vague Plot',
    prompt: 'Can you help me find a movie or show where a group of magicians pull off bank heists during their shows?'
  },
  {
    icon: '🧠',
    label: 'Mind-Bending Sci-Fi',
    prompt: 'Give me complex, mind-bending sci-fi films with puzzle plots and twist endings like Arrival and Primer.'
  },
  {
    icon: '🔥',
    label: 'Binge-Worthy TV Series',
    prompt: 'Recommend prestige, addictive drama series with incredible season arcs like Breaking Bad, Succession, and The Bear.'
  },
  {
    icon: '🍷',
    label: 'Date Night Decider',
    prompt: 'We need a witty, charming, fast-paced movie under 110 minutes with great chemistry and no cringe.'
  },
  {
    icon: '🌧️',
    label: 'Atmospheric Neo-Noir',
    prompt: 'Atmospheric, rain-soaked crime mysteries with brooding detectives and stylish visuals like Blade Runner or True Detective.'
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

// Fallback curated movie records with verified images and trailers
export const CINEBOT_FALLBACK_INCEPTION_MOVIE: Movie = {
  id: 1606,
  url: 'https://yts.gg/movies/inception-2010',
  imdb_code: 'tt1375666',
  title: 'Inception',
  title_english: 'Inception',
  title_long: 'Inception (2010)',
  slug: 'inception-2010',
  year: 2010,
  rating: 8.8,
  runtime: 148,
  genres: ['Action', 'Adventure', 'Sci-Fi', 'Thriller'],
  summary: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.',
  description_full: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO, but his tragic past may doom the project and his team to disaster.',
  yt_trailer_code: 'cdx31ak4KbQ',
  language: 'en',
  mpa_rating: 'PG-13',
  medium_cover_image: 'https://img.yts.gg/assets/images/movies/Inception_2010/medium-cover.jpg',
  large_cover_image: 'https://img.yts.gg/assets/images/movies/Inception_2010/large-cover.jpg',
  small_cover_image: 'https://img.yts.gg/assets/images/movies/Inception_2010/small-cover.jpg',
  background_image: 'https://img.yts.gg/assets/images/movies/Inception_2010/background.jpg',
  background_image_original: 'https://img.yts.gg/assets/images/movies/Inception_2010/background.jpg',
  torrents: [],
  date_uploaded: '2015-10-21 00:00:00',
  date_uploaded_unix: 1445385600
};

export const CINEBOT_FALLBACK_PRISONERS_MOVIE: Movie = {
  id: 2407,
  url: 'https://yts.gg/movies/prisoners-2013',
  imdb_code: 'tt1392214',
  title: 'Prisoners',
  title_english: 'Prisoners',
  title_long: 'Prisoners (2013)',
  slug: 'prisoners-2013',
  year: 2013,
  rating: 8.2,
  runtime: 153,
  genres: ['Crime', 'Drama', 'Mystery', 'Thriller'],
  summary: 'A desperate father takes the law into his own hands after police fail to find two kidnapped girls.',
  description_full: 'A desperate father takes the law into his own hands after police fail to find two kidnapped girls.',
  yt_trailer_code: 'yszyHq-S9W8',
  language: 'en',
  mpa_rating: 'R',
  medium_cover_image: 'https://img.yts.gg/assets/images/movies/Prisoners_2013/medium-cover.jpg',
  large_cover_image: 'https://img.yts.gg/assets/images/movies/Prisoners_2013/large-cover.jpg',
  small_cover_image: 'https://img.yts.gg/assets/images/movies/Prisoners_2013/small-cover.jpg',
  background_image: 'https://img.yts.gg/assets/images/movies/Prisoners_2013/background.jpg',
  background_image_original: 'https://img.yts.gg/assets/images/movies/Prisoners_2013/background.jpg',
  torrents: [],
  date_uploaded: '2015-10-21 00:00:00',
  date_uploaded_unix: 1445385600
};

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
        // Ensure any suggested movies without movieData are looked up if possible
        if (Array.isArray(data.suggestedMovies) && data.suggestedMovies.length > 0) {
          const hydrated = await Promise.all(
            data.suggestedMovies.map(async (sugg: any) => {
              if (sugg.movieData) return sugg;
              try {
                const searchRes = await fetch(`/api/movies?query_term=${encodeURIComponent(sugg.searchTerm || sugg.title)}&limit=1`);
                if (searchRes.ok) {
                  const mJson = await searchRes.json();
                  const found = mJson?.data?.movies?.[0];
                  if (found) {
                    return { ...sugg, movieData: found };
                  }
                }
              } catch {
                // Keep original
              }
              return sugg;
            })
          );
          data.suggestedMovies = hydrated;
        }

        // Ensure any suggested TV series without showData are hydrated with poster & details
        if (Array.isArray(data.suggestedShows) && data.suggestedShows.length > 0) {
          const hydratedShows = await Promise.all(
            data.suggestedShows.map(async (sugg: any) => {
              if (sugg.showData) return sugg;
              try {
                const queryParam = sugg.imdb_code 
                  ? `imdb=${encodeURIComponent(sugg.imdb_code)}` 
                  : `title=${encodeURIComponent(sugg.searchTerm || sugg.title)}`;
                const res = await fetch(`/api/tv/details?${queryParam}`);
                if (res.ok) {
                  const sJson = await res.json();
                  if (sJson.status === 'ok' && sJson.show) {
                    return {
                      ...sugg,
                      imdb_code: sJson.show.imdb_code || sugg.imdb_code,
                      showData: sJson.show
                    };
                  }
                }
              } catch {
                // Keep original
              }
              return sugg;
            })
          );
          data.suggestedShows = hydratedShows;
        }

        return data as CineBotChatResponse;
      }
    } else {
      console.warn(`[CineBot] Server responded with status ${res.status}: ${res.statusText}`);
    }
  } catch (err) {
    console.warn('[CineBot] Fetch error:', err);
  }

  // Fallback if network or server endpoint is unreachable
  return {
    status: 'ok',
    reply: "I'm operating in offline cinephile mode with full access to our curated cinema vault. Here are two unforgettable tension masterclasses to explore, or tell me your favorite genre, director, or the feeling you want to experience!",
    suggestedMovies: [
      {
        title: 'Inception',
        year: 2010,
        reason: 'Masterclass in cerebral sci-fi heists and practical set-pieces.',
        searchTerm: 'Inception 2010',
        movieData: CINEBOT_FALLBACK_INCEPTION_MOVIE
      },
      {
        title: 'Prisoners',
        year: 2013,
        reason: 'Relentless atmospheric tension and haunting performances.',
        searchTerm: 'tt1392214',
        movieData: CINEBOT_FALLBACK_PRISONERS_MOVIE
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
