import { Movie, FilterParams, ParentalGuide } from '../types';
import { slugify, parseMovieSlug } from '../utils/seo';
import { FALLBACK_FEATURED_MOVIES } from '../data/fallbackMovies';

export const GENRES = [
  'All',
  'Action',
  'Adventure',
  'Animation',
  'Biography',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'Film-Noir',
  'History',
  'Horror',
  'Music',
  'Musical',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Short',
  'Sport',
  'Thriller',
  'War',
  'Western'
] as const;

export const QUALITIES = [
  { label: 'All', value: 'All' },
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' },
  { label: '2160p (4K)', value: '2160p' },
  { label: '1080p.x265', value: '1080p.x265' },
  { label: '3D', value: '3D' }
] as const;

export const RATING_OPTIONS = [
  { label: 'All', value: 0 },
  { label: '9+', value: 9 },
  { label: '8+', value: 8 },
  { label: '7+', value: 7 },
  { label: '6+', value: 6 },
  { label: '5+', value: 5 },
  { label: '4+', value: 4 },
  { label: '3+', value: 3 },
  { label: '2+', value: 2 },
  { label: '1+', value: 1 }
] as const;

export const YEAR_OPTIONS = [
  { label: 'All', value: 'All' },
  { label: '2026', value: '2026' },
  { label: '2025', value: '2025' },
  { label: '2024', value: '2024' },
  { label: '2023', value: '2023' },
  { label: '2022', value: '2022' },
  { label: '2021', value: '2021' },
  { label: '2020', value: '2020' },
  { label: '2019', value: '2019' },
  { label: '2015-2018', value: '2015-2018' },
  { label: '2010-2014', value: '2010-2014' },
  { label: '2000-2009', value: '2000-2009' },
  { label: '1990-1999', value: '1990-1999' },
  { label: '1980-1989', value: '1980-1989' },
  { label: '1970-1979', value: '1970-1979' },
  { label: '1950-1969', value: '1950-1969' },
  { label: '1900-1949', value: '1900-1949' }
] as const;

export const LANGUAGE_OPTIONS = [
  { label: 'All', value: 'All' },
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Italian', value: 'it' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Chinese', value: 'zh' },
  { label: 'Russian', value: 'ru' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Turkish', value: 'tr' },
  { label: 'Telugu', value: 'te' },
  { label: 'Tamil', value: 'ta' },
  { label: 'Swedish', value: 'sv' }
] as const;

export const SORT_OPTIONS = [
  { label: 'Latest', value: 'date_added', order: 'desc' },
  { label: 'Oldest', value: 'date_added', order: 'asc' },
  { label: 'Featured', value: 'like_count', order: 'desc' },
  { label: 'Seeds', value: 'seeds', order: 'desc' },
  { label: 'Peers', value: 'peers', order: 'desc' },
  { label: 'Year', value: 'year', order: 'desc' },
  { label: 'Rating', value: 'rating', order: 'desc' },
  { label: 'Likes', value: 'like_count', order: 'desc' },
  { label: 'Alphabetical', value: 'title', order: 'asc' },
  { label: 'Downloads', value: 'download_count', order: 'desc' }
] as const;

// API mirror candidates to fetch data reliably across development, Vercel, and Blogger embeds
const PUBLIC_MIRRORS = [
  '/api/movies',
  'https://yts.mx/api/v2',
  'https://yts.am/api/v2',
  'https://yts.lt/api/v2',
  'https://yts.bz/api/v2',
  'https://movies-api.accel.li/api/v2'
];

async function fetchFromMirrors(
  endpointName: 'list' | 'details' | 'suggestions' | 'parental_guides',
  queryParams: Record<string, string>
): Promise<any> {
  const queryString = new URLSearchParams(queryParams).toString();
  let lastErrorMessage = 'Unable to connect to movie catalog';

  // Endpoint mapping
  const fileEndpointMap: Record<string, string> = {
    list: 'list_movies.json',
    details: 'movie_details.json',
    suggestions: 'movie_suggestions.json',
    parental_guides: 'movie_parental_guides.json'
  };

  const fileEndpoint = fileEndpointMap[endpointName] || 'list_movies.json';

  for (const mirror of PUBLIC_MIRRORS) {
    try {
      let targetUrl = '';
      if (mirror.startsWith('/api')) {
        targetUrl = `${mirror}/${endpointName}?${queryString}`;
      } else {
        targetUrl = `${mirror}/${fileEndpoint}?${queryString}`;
      }

      const controller = new AbortController();
      const timeoutMs = mirror.startsWith('/api') ? 12000 : 4000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        continue;
      }

      const text = await response.text();
      const trimmed = text ? text.trim() : '';

      // Ensure response is valid JSON and not an HTML error document
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && (parsed.status === 'ok' || parsed.data || parsed.movies)) {
            return parsed;
          }
        } catch {
          // JSON parsing failed for this mirror, proceed to next
        }
      }
    } catch (err: any) {
      lastErrorMessage = err?.message || lastErrorMessage;
      // Try next mirror
    }
  }

  throw new Error(lastErrorMessage);
}

export async function fetchMovies(params: Partial<FilterParams> = {}): Promise<{
  movies: Movie[];
  totalCount: number;
  limit: number;
  page: number;
}> {
  const queryParams: Record<string, string> = {};

  if (params.page) queryParams.page = params.page.toString();
  if (params.limit) queryParams.limit = params.limit.toString();
  
  if (params.query_term && params.query_term.trim()) {
    queryParams.query_term = params.query_term.trim();
  } else if (params.year && params.year !== 'All' && !params.year.includes('-')) {
    queryParams.query_term = params.year;
  }

  if (params.genre && params.genre !== 'All') {
    queryParams.genre = params.genre.toLowerCase();
  }
  if (params.quality && params.quality !== 'All') {
    queryParams.quality = params.quality;
  }
  if (params.minimum_rating && params.minimum_rating > 0) {
    queryParams.minimum_rating = params.minimum_rating.toString();
  }
  if (params.sort_by) {
    queryParams.sort_by = params.sort_by;
  }
  if (params.order_by) {
    queryParams.order_by = params.order_by;
  }

  queryParams.with_rt_ratings = 'true';

  try {
    const json = await fetchFromMirrors('list', queryParams);
    const data = json?.data || {};
    let movies: Movie[] = data.movies || [];

    // Optional client-side refinements if year range or language were selected
    if (params.year && params.year !== 'All') {
      if (params.year.includes('-')) {
        const [start, end] = params.year.split('-').map(Number);
        movies = movies.filter(m => m.year >= start && m.year <= end);
      } else {
        const targetYear = Number(params.year);
        if (!isNaN(targetYear)) {
          movies = movies.filter(m => m.year === targetYear);
        }
      }
    }

    if (params.language && params.language !== 'All') {
      movies = movies.filter(m => m.language?.toLowerCase() === params.language?.toLowerCase());
    }

    return {
      movies,
      totalCount: data.movie_count || movies.length,
      limit: data.limit || 20,
      page: data.page_number || 1
    };
  } catch (err) {
    console.warn('Live API list fetch failed, utilizing resilient fallback dataset:', err);
    // If live API is down, filter fallback movies so user can still browse and test
    let fallback = [...FALLBACK_FEATURED_MOVIES];
    if (params.query_term) {
      const q = params.query_term.toLowerCase();
      fallback = fallback.filter(m => m.title.toLowerCase().includes(q) || m.summary?.toLowerCase().includes(q));
    }
    if (params.genre && params.genre !== 'All') {
      fallback = fallback.filter(m => m.genres?.some(g => g.toLowerCase() === params.genre?.toLowerCase()));
    }
    return {
      movies: fallback,
      totalCount: fallback.length,
      limit: params.limit || 20,
      page: params.page || 1
    };
  }
}

export async function fetchMovieDetails(movieId: number | string): Promise<Movie | null> {
  try {
    const json = await fetchFromMirrors('details', {
      movie_id: movieId.toString(),
      with_images: 'true',
      with_cast: 'true'
    });
    return json?.data?.movie || null;
  } catch (err) {
    console.warn(`Movie details could not be retrieved for ID ${movieId}:`, err);
    return null;
  }
}

export async function fetchMovieSuggestions(movieId: number | string): Promise<Movie[]> {
  try {
    const json = await fetchFromMirrors('suggestions', {
      movie_id: movieId.toString()
    });
    return json?.data?.movies || [];
  } catch {
    return [];
  }
}

export async function fetchParentalGuides(movieId: number | string): Promise<ParentalGuide[]> {
  try {
    const json = await fetchFromMirrors('parental_guides', {
      movie_id: movieId.toString()
    });
    return json?.data?.parent_guides || [];
  } catch {
    return [];
  }
}

// In-memory cache for slug to movie resolution
const slugCache = new Map<string, Movie>();

export async function fetchMovieBySlug(slug: string): Promise<Movie | null> {
  const normalizedSlug = slugify(slug);
  if (!normalizedSlug) return null;

  if (slugCache.has(normalizedSlug)) {
    return slugCache.get(normalizedSlug)!;
  }

  try {
    const { titleQuery, year } = parseMovieSlug(normalizedSlug);
    if (!titleQuery) return null;

    // First attempt: search by parsed title query + year
    let searchRes = await fetchMovies({
      query_term: titleQuery,
      year: year ? String(year) : undefined,
      limit: 15
    });

    let movies = searchRes.movies || [];

    // If not found with year filter, try searching without year constraint
    if (movies.length === 0 && year) {
      searchRes = await fetchMovies({
        query_term: titleQuery,
        limit: 20
      });
      movies = searchRes.movies || [];
    }

    if (movies.length === 0) {
      // Direct search using full slug
      searchRes = await fetchMovies({
        query_term: normalizedSlug.replace(/-/g, ' '),
        limit: 20
      });
      movies = searchRes.movies || [];
    }

    if (movies.length === 0) return null;

    // Find closest exact match
    let matchedMovie = movies.find(m => {
      const mSlug = slugify(m.slug || '');
      const computedSlug = slugify(`${m.title}-${m.year}`);
      const computedEnglishSlug = slugify(`${m.title_english || ''}-${m.year}`);
      return (
        mSlug === normalizedSlug ||
        computedSlug === normalizedSlug ||
        computedEnglishSlug === normalizedSlug
      );
    });

    // Fallback: match by title and year
    if (!matchedMovie && year) {
      matchedMovie = movies.find(m => {
        const titleMatch = slugify(m.title) === slugify(titleQuery) || slugify(m.title_english || '') === slugify(titleQuery);
        return titleMatch && m.year === year;
      });
    }

    // Fallback: match by title alone
    if (!matchedMovie) {
      matchedMovie = movies.find(m => slugify(m.title) === slugify(titleQuery));
    }

    // Fallback: first movie in list
    if (!matchedMovie) {
      matchedMovie = movies[0];
    }

    // Fetch full details with cast, screenshots, etc.
    const fullMovie = await fetchMovieDetails(matchedMovie.id);
    const finalMovie = fullMovie || matchedMovie;

    slugCache.set(normalizedSlug, finalMovie);
    return finalMovie;
  } catch (err) {
    console.error(`Failed to fetch movie for slug ${slug}:`, err);
    return null;
  }
}

