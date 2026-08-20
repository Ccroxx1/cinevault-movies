import { Movie, FilterParams, ParentalGuide } from '../types';

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
  'https://movies-api.accel.li/api/v2',
  'https://yts.mx/api/v2',
  'https://yts.lt/api/v2',
  'https://yts.am/api/v2'
];

async function fetchFromMirrors(
  endpointName: 'list' | 'details' | 'suggestions' | 'parental_guides',
  queryParams: Record<string, string>
): Promise<any> {
  const queryString = new URLSearchParams(queryParams).toString();
  let lastError: Error | null = null;

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
      const timeoutId = setTimeout(() => controller.abort(), 6000);

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
      const trimmed = text.trim();

      // Ensure response is valid JSON and not an HTML error document
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        if (parsed && (parsed.status === 'ok' || parsed.data || parsed.movies)) {
          return parsed;
        }
      }
    } catch (err: any) {
      lastError = err;
      // Try next mirror
    }
  }

  throw new Error(lastError?.message || 'Unable to connect to movie catalog. Please check your internet connection or retry in a moment.');
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
}

export async function fetchMovieDetails(movieId: number | string): Promise<Movie | null> {
  const json = await fetchFromMirrors('details', {
    movie_id: movieId.toString(),
    with_images: 'true',
    with_cast: 'true'
  });
  return json?.data?.movie || null;
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
