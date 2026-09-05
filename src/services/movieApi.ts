import { Movie, FilterParams, ParentalGuide } from '../types';
import { slugify, parseMovieSlug } from '../utils/seo';
import { FALLBACK_FEATURED_MOVIES } from '../data/fallbackMovies';
import { normalizeImageUrl } from '../utils/imageFallback';

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

export const DECADE_OPTIONS = [
  { label: 'All Eras', value: 'All' },
  { label: '2020s', value: '2020-2026' },
  { label: '2010s', value: '2010-2019' },
  { label: '2000s', value: '2000-2009' },
  { label: '1990s', value: '1990-1999' },
  { label: '1980s', value: '1980-1989' },
  { label: '1970s', value: '1970-1979' },
  { label: 'Classics (<1970)', value: '1900-1969' }
] as const;

export const RUNTIME_OPTIONS = [
  { label: 'All Runtimes', value: 'all' },
  { label: 'Quick (< 90m)', value: 'short' },
  { label: 'Standard (90-120m)', value: 'medium' },
  { label: 'Long (120-150m)', value: 'long' },
  { label: 'Epic (150m+)', value: 'epic' }
] as const;

export const CODEC_AUDIO_OPTIONS = [
  { label: 'All Formats', value: 'all' },
  { label: 'x265 HEVC (Data Saver)', value: 'x265' },
  { label: '5.1 / 7.1 Surround Sound', value: 'surround' },
  { label: '4K Ultra HD Only', value: '4k' }
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

// API mirror candidates prioritizing yts.gg for superior reliability and image delivery
const PUBLIC_MIRRORS = [
  'https://yts.gg/api/v2',
  'https://movies-api.accel.li/api/v2',
  '/api/movies',
  'https://yts.am/api/v2',
  'https://yts.lt/api/v2',
  'https://yts.bz/api/v2',
  'https://yts.ag/api/v2'
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
      const timeoutMs = mirror.startsWith('/api') ? 12000 : 5000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*'
        },
        signal: controller.signal,
        redirect: 'follow'
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
          if (endpointName === 'list') {
            const movies = parsed?.data?.movies || parsed?.movies;
            if (Array.isArray(movies) && movies.length > 0) {
              return parsed;
            }
            // If empty array for list query, try next mirror
            continue;
          } else if (parsed && (parsed.status === 'ok' || parsed.data || parsed.movie)) {
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

/**
 * Helper to check if a raw movie object has minimal required fields and valid poster/image sources
 * Used specifically for homepage UI card rendering (MovieCard, MovieSectionRow, PopularTopFive, FeaturedHero)
 */
export function isUsableMovie(m: any): boolean {
  if (!m || typeof m !== 'object') return false;
  const id = Number(m.id);
  if (!id || isNaN(id) || id <= 0) return false;

  const title = (m.title || m.title_english || '').trim();
  if (!title) return false;

  // Validate image sources: accept medium, large, small, or background image
  const hasImage = Boolean(
    m.medium_cover_image ||
    m.large_cover_image ||
    m.small_cover_image ||
    m.background_image ||
    m.background_image_original
  );

  return hasImage;
}

/**
 * Prerender validation: less restrictive than homepage card validation.
 * Verifies valid movie ID and non-empty title so canonical slug can be generated.
 * Optional metadata (posters, year, synopsis, torrents) uses fallbacks if absent.
 */
export function isPrerenderableMovie(m: any): boolean {
  if (!m || typeof m !== 'object') return false;
  const id = Number(m.id);
  if (!id || isNaN(id) || id <= 0) return false;

  const title = (m.title || m.title_english || '').trim();
  if (!title) return false;

  return true;
}

// Helper to validate, clean, deduplicate, and normalize image URLs to yts.gg
export function validateAndCleanMovies(movies: any[]): Movie[] {
  if (!Array.isArray(movies)) return [];
  const seenIds = new Set<number>();
  const cleanList: Movie[] = [];

  for (const m of movies) {
    if (!isUsableMovie(m)) continue;
    const id = Number(m.id);
    if (seenIds.has(id)) continue;

    const title = (m.title || m.title_english || '').trim();
    seenIds.add(id);

    // Normalize all image URLs from yts.mx to yts.gg
    const small_cover_image = normalizeImageUrl(m.small_cover_image);
    const medium_cover_image = normalizeImageUrl(m.medium_cover_image);
    const large_cover_image = normalizeImageUrl(m.large_cover_image);
    const background_image = normalizeImageUrl(m.background_image);
    const background_image_original = normalizeImageUrl(m.background_image_original);

    // Extract base directory for YTS movies to auto-populate high-resolution screenshots
    const anyUrl = background_image_original || background_image || large_cover_image || medium_cover_image || '';
    const match = anyUrl.match(/(https?:\/\/[^\/]+\/assets\/images\/movies\/[^\/]+)/i);
    const ytsBaseDir = match ? match[1] : '';

    const large_screenshot_image1 = normalizeImageUrl(m.large_screenshot_image1) || (ytsBaseDir ? `${ytsBaseDir}/large-screenshot1.jpg` : '');
    const large_screenshot_image2 = normalizeImageUrl(m.large_screenshot_image2) || (ytsBaseDir ? `${ytsBaseDir}/large-screenshot2.jpg` : '');
    const large_screenshot_image3 = normalizeImageUrl(m.large_screenshot_image3) || (ytsBaseDir ? `${ytsBaseDir}/large-screenshot3.jpg` : '');

    const medium_screenshot_image1 = normalizeImageUrl(m.medium_screenshot_image1) || (ytsBaseDir ? `${ytsBaseDir}/medium-screenshot1.jpg` : '');
    const medium_screenshot_image2 = normalizeImageUrl(m.medium_screenshot_image2) || (ytsBaseDir ? `${ytsBaseDir}/medium-screenshot2.jpg` : '');
    const medium_screenshot_image3 = normalizeImageUrl(m.medium_screenshot_image3) || (ytsBaseDir ? `${ytsBaseDir}/medium-screenshot3.jpg` : '');

    const cast = Array.isArray(m.cast)
      ? m.cast.map((c: any) => ({
          ...c,
          url_small_image: normalizeImageUrl(c.url_small_image)
        }))
      : [];

    cleanList.push({
      ...m,
      id,
      title,
      small_cover_image,
      medium_cover_image,
      large_cover_image,
      background_image,
      background_image_original,
      large_screenshot_image1,
      large_screenshot_image2,
      large_screenshot_image3,
      medium_screenshot_image1,
      medium_screenshot_image2,
      medium_screenshot_image3,
      cast,
      year: typeof m.year === 'number' && m.year >= 1880 ? m.year : undefined,
      rating: typeof m.rating === 'number' && !isNaN(m.rating) && m.rating >= 0 ? Math.min(m.rating, 10) : 0,
      genres: Array.isArray(m.genres) ? m.genres.filter(Boolean) : [],
      torrents: Array.isArray(m.torrents) ? m.torrents.filter(Boolean) : []
    });
  }

  return cleanList;
}

/**
 * Robust in-memory filtering and sorting matching all API filter parameters.
 * Used for curated sections, fallbacks, and local refinements.
 */
export function filterMoviesByParams(movies: Movie[], params: Partial<FilterParams> = {}): Movie[] {
  let list = validateAndCleanMovies(movies);

  // 1. Search Query
  if (params.query_term && params.query_term.trim() && params.query_term !== 'All') {
    const q = params.query_term.toLowerCase().trim();
    list = list.filter(m => 
      (m.title && m.title.toLowerCase().includes(q)) || 
      (m.title_english && m.title_english.toLowerCase().includes(q)) ||
      (m.summary && m.summary.toLowerCase().includes(q)) ||
      (m.description_full && m.description_full.toLowerCase().includes(q))
    );
  }

  // 2. Genre
  if (params.genre && params.genre !== 'All') {
    const gTarget = params.genre.toLowerCase();
    list = list.filter(m => m.genres?.some(g => g.toLowerCase() === gTarget));
  }

  // 3. Quality
  if (params.quality && params.quality !== 'All') {
    const qTarget = params.quality.toLowerCase();
    list = list.filter(m => m.torrents?.some(t => t.quality?.toLowerCase().includes(qTarget)));
  }

  // 4. Rating (minimum)
  if (typeof params.minimum_rating === 'number' && params.minimum_rating > 0) {
    list = list.filter(m => (m.rating || 0) >= params.minimum_rating!);
  }

  // 5. Year (exact or range like 1990-2005, or min_year/max_year)
  if (typeof params.min_year === 'number' && params.min_year > 0) {
    list = list.filter(m => (m.year || 0) >= params.min_year!);
  }
  if (typeof params.max_year === 'number' && params.max_year > 0) {
    list = list.filter(m => (m.year || 0) <= params.max_year!);
  }
  if (params.year && params.year !== 'All') {
    if (params.year.includes('-')) {
      const [start, end] = params.year.split('-').map(Number);
      list = list.filter(m => m.year && m.year >= start && m.year <= end);
    } else {
      const targetYear = Number(params.year);
      if (!isNaN(targetYear)) {
        list = list.filter(m => m.year === targetYear);
      }
    }
  }

  // 6. Language
  if (params.language && params.language !== 'All') {
    const langTarget = params.language.toLowerCase();
    list = list.filter(m => m.language?.toLowerCase() === langTarget);
  }

  // 7. Decade
  if (params.decade && params.decade !== 'All') {
    if (params.decade.includes('-')) {
      const [start, end] = params.decade.split('-').map(Number);
      list = list.filter(m => m.year && m.year >= start && m.year <= end);
    }
  }

  // 8. Runtime Bracket
  if (params.runtime_bracket && params.runtime_bracket !== 'all') {
    if (params.runtime_bracket === 'short') {
      list = list.filter(m => (m.runtime || 0) > 0 && (m.runtime || 0) < 90);
    } else if (params.runtime_bracket === 'medium') {
      list = list.filter(m => (m.runtime || 0) >= 90 && (m.runtime || 0) <= 120);
    } else if (params.runtime_bracket === 'long') {
      list = list.filter(m => (m.runtime || 0) > 120 && (m.runtime || 0) <= 150);
    } else if (params.runtime_bracket === 'epic') {
      list = list.filter(m => (m.runtime || 0) > 150);
    }
  }

  // 9. Codec & Audio
  if (params.codec && params.codec !== 'all') {
    if (params.codec === 'x265') {
      list = list.filter(m => m.torrents?.some(t => t.video_codec?.includes('x265') || t.quality?.includes('x265')));
    } else if (params.codec === 'surround') {
      list = list.filter(m => m.torrents?.some(t => t.audio_channels === '5.1' || t.audio_channels === '7.1'));
    } else if (params.codec === '4k') {
      list = list.filter(m => m.torrents?.some(t => t.quality === '2160p'));
    }
  }

  // 10. Sorting
  const sortField = params.sort_by || 'date_added';
  const isAsc = params.order_by === 'asc';
  list.sort((a, b) => {
    let valA: any = 0;
    let valB: any = 0;
    if (sortField === 'title') {
      valA = (a.title || '').toLowerCase();
      valB = (b.title || '').toLowerCase();
      return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else if (sortField === 'rating') {
      valA = a.rating || 0;
      valB = b.rating || 0;
    } else if (sortField === 'year') {
      valA = a.year || 0;
      valB = b.year || 0;
    } else if (sortField === 'download_count') {
      valA = a.download_count || 0;
      valB = b.download_count || 0;
    } else if (sortField === 'like_count') {
      valA = a.like_count || 0;
      valB = b.like_count || 0;
    } else {
      valA = a.date_uploaded_unix || a.id || 0;
      valB = b.date_uploaded_unix || b.id || 0;
    }
    return isAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
  });

  return list;
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
    let rawMovies = data.movies || [];
    let movies: Movie[] = validateAndCleanMovies(rawMovies);

    // Optional client-side refinements if year range, runtime, codec, or language were selected
    if (typeof params.min_year === 'number' && params.min_year > 0) {
      movies = movies.filter(m => (m.year || 0) >= params.min_year!);
    }
    if (typeof params.max_year === 'number' && params.max_year > 0) {
      movies = movies.filter(m => (m.year || 0) <= params.max_year!);
    }
    if (params.year && params.year !== 'All') {
      if (params.year.includes('-')) {
        const [start, end] = params.year.split('-').map(Number);
        movies = movies.filter(m => m.year && m.year >= start && m.year <= end);
      } else {
        const targetYear = Number(params.year);
        if (!isNaN(targetYear)) {
          movies = movies.filter(m => m.year === targetYear);
        }
      }
    }

    if (params.decade && params.decade !== 'All' && params.decade.includes('-')) {
      const [start, end] = params.decade.split('-').map(Number);
      movies = movies.filter(m => m.year && m.year >= start && m.year <= end);
    }

    if (params.runtime_bracket && params.runtime_bracket !== 'all') {
      if (params.runtime_bracket === 'short') {
        movies = movies.filter(m => (m.runtime || 0) > 0 && (m.runtime || 0) < 90);
      } else if (params.runtime_bracket === 'medium') {
        movies = movies.filter(m => (m.runtime || 0) >= 90 && (m.runtime || 0) <= 120);
      } else if (params.runtime_bracket === 'long') {
        movies = movies.filter(m => (m.runtime || 0) > 120 && (m.runtime || 0) <= 150);
      } else if (params.runtime_bracket === 'epic') {
        movies = movies.filter(m => (m.runtime || 0) > 150);
      }
    }

    if (params.codec && params.codec !== 'all') {
      if (params.codec === 'x265') {
        movies = movies.filter(m => m.torrents?.some(t => t.video_codec?.includes('x265') || t.quality?.includes('x265')));
      } else if (params.codec === 'surround') {
        movies = movies.filter(m => m.torrents?.some(t => t.audio_channels === '5.1' || t.audio_channels === '7.1'));
      } else if (params.codec === '4k') {
        movies = movies.filter(m => m.torrents?.some(t => t.quality === '2160p'));
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
    const filteredFallback = filterMoviesByParams(FALLBACK_FEATURED_MOVIES, params);

    // Pagination
    const totalCount = filteredFallback.length;
    const limit = params.limit || 20;
    const page = params.page || 1;
    const startIndex = (page - 1) * limit;
    const paginatedMovies = filteredFallback.slice(startIndex, startIndex + limit);

    return {
      movies: paginatedMovies,
      totalCount,
      limit,
      page
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
    const movie = json?.data?.movie;
    if (!movie || typeof movie !== 'object') return null;
    const validated = validateAndCleanMovies([movie]);
    return validated[0] || null;
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
    const rawList = json?.data?.movies || [];
    return validateAndCleanMovies(rawList);
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

    // If no verified match found by slug or title, do not display an unrelated movie
    if (!matchedMovie) {
      return null;
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

/**
 * Fetches filmography for an actor or director.
 * Uses the CineVault backend proxy (Wikidata graph + mirror index resolution)
 * with a resilient client-side Wikidata SPARQL + mirror fallback.
 */
export async function fetchFilmography(
  personName: string,
  role: 'director' | 'actor' | 'cast' = 'cast'
): Promise<Movie[]> {
  const trimmed = personName?.trim();
  if (!trimmed) return [];

  // 1. Primary: CineVault server API endpoint
  try {
    const res = await fetch(
      `/api/movies/filmography?name=${encodeURIComponent(trimmed)}&role=${encodeURIComponent(role)}`
    );
    if (res.ok) {
      const json = await res.json();
      const list = json?.data?.movies;
      if (Array.isArray(list) && list.length > 0) {
        return validateAndCleanMovies(list);
      }
    }
  } catch (err) {
    console.warn('Backend filmography fetch failed, attempting client fallback:', err);
  }

  // 2. Client-side fallback via Wikidata SPARQL
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?origin=*&action=wbsearchentities&search=${encodeURIComponent(
      trimmed
    )}&type=item&language=en&limit=1&format=json`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const qid = searchData?.search?.[0]?.id;
      if (qid) {
        const sparql = `SELECT DISTINCT ?movieLabel ?imdb ?year WHERE { VALUES ?prop { wdt:P161 wdt:P57 wdt:P725 } ?movie ?prop wd:${qid} ; wdt:P345 ?imdb . OPTIONAL { ?movie wdt:P577 ?pubDate . BIND(YEAR(?pubDate) AS ?year) } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } ORDER BY DESC(?year) LIMIT 20`;
        const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
        const sparqlRes = await fetch(sparqlUrl);
        if (sparqlRes.ok) {
          const sparqlData = await sparqlRes.json();
          const bindings = sparqlData?.results?.bindings || [];
          const imdbs: string[] = [];
          const seen = new Set<string>();
          for (const b of bindings) {
            const id = b.imdb?.value;
            if (id && /^tt\d+$/.test(id) && !seen.has(id)) {
              seen.add(id);
              imdbs.push(id);
            }
          }

          if (imdbs.length > 0) {
            const movieLookups = await Promise.all(
              imdbs.slice(0, 15).map(async (imdbId) => {
                try {
                  const res = await fetchMovies({ query_term: imdbId, limit: 1 });
                  return res.movies?.[0] || null;
                } catch {
                  return null;
                }
              })
            );
            const found = movieLookups.filter((m): m is Movie => Boolean(m));
            if (found.length > 0) {
              return validateAndCleanMovies(found);
            }
          }
        }
      }
    }
  } catch (clientErr) {
    console.warn('Client-side Wikidata search failed:', clientErr);
  }

  // 3. Fallback: Search direct title matches in CineVault catalog
  try {
    const directRes = await fetchMovies({ query_term: trimmed, limit: 20 });
    return directRes.movies || [];
  } catch {
    return [];
  }
}

