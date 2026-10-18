import { EztvApiResponse, EztvTorrent, TvShowInfo, TvShowDetails } from '../types';

export interface EztvFetchParams {
  imdb_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Search television series metadata via /api/tv/shows (TVmaze proxy with fallback)
 */
export async function searchTvShows(query: string): Promise<TvShowInfo[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const res = await fetch(`/api/tv/shows?q=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.shows)) {
        return data.shows;
      }
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError' && err?.name !== 'TimeoutError') {
      console.debug('Query /api/tv/shows notice, trying direct fallback:', err?.message || err);
    }
  }

  // Direct client fallback to TVmaze in case proxy is slow or down
  try {
    const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const data: any[] = await res.json();
      return data
        .filter((item) => {
          const imdb = item?.show?.externals?.imdb;
          return item?.show?.name && imdb && /^tt\d{5,9}$/i.test(imdb);
        })
        .map((item) => {
          const s = item.show;
          const imdb: string = s.externals.imdb;
          return {
            id: s.id,
            name: s.name,
            imdb_code: imdb,
            imdb_id: imdb.replace(/^tt/i, ''),
            year: s.premiered ? s.premiered.slice(0, 4) : undefined,
            rating: s.rating?.average || undefined,
            image: s.image?.medium || s.image?.original || undefined,
            summary: s.summary ? s.summary.replace(/<[^>]*>?/gm, '').trim() : undefined,
            genres: s.genres || [],
            network: s.network?.name || s.webChannel?.name || undefined
          };
        })
        .slice(0, 8);
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError' && err?.name !== 'TimeoutError') {
      console.debug('Direct TVmaze query notice:', err?.message || err);
    }
  }

  return [];
}

const CLIENT_EZTV_MIRRORS = [
  'https://eztvx.to/api/get-torrents',
  'https://eztv.wf/api/get-torrents',
  'https://eztv.tf/api/get-torrents',
  'https://eztv.yt/api/get-torrents',
  'https://eztv.ag/api/get-torrents'
];

/**
 * Fetch torrents from the EZTV API (proxied via /api/eztv with direct client-side fallback)
 * Documentation: https://eztvx.to/api/get-torrents
 */
export async function fetchEztvTorrents(params: EztvFetchParams = {}): Promise<EztvApiResponse> {
  const query = new URLSearchParams();

  if (params.imdb_id) {
    // Strip leading 'tt' if present since EZTV expects numeric ID
    const cleanId = params.imdb_id.replace(/^tt/i, '').trim();
    query.set('imdb_id', cleanId);
  }

  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }

  if (params.page && params.page > 0) {
    query.set('page', String(Math.min(100, Math.max(1, params.page))));
  }

  if (params.limit && params.limit > 0) {
    query.set('limit', String(Math.min(100, Math.max(1, params.limit))));
  }

  const queryString = query.toString();
  const url = `/api/eztv${queryString ? `?${queryString}` : ''}`;

  let backendError: Error | null = null;
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data: EztvApiResponse = await response.json();
      return {
        torrents_count: data.torrents_count || (data.torrents ? data.torrents.length : 0),
        limit: data.limit || params.limit || 30,
        page: data.page || params.page || 1,
        imdb_id: data.imdb_id || params.imdb_id,
        resolved_title: data.resolved_title,
        show_meta: data.show_meta || null,
        message: data.message,
        torrents: Array.isArray(data.torrents) ? data.torrents : []
      };
    } else {
      let msg = `EZTV proxy error (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.status_message) msg = errJson.status_message;
      } catch {
        // ignore
      }
      backendError = new Error(msg);
    }
  } catch (err: any) {
    backendError = err instanceof Error ? err : new Error(String(err));
  }

  // Dual-layer fallback: Direct fetch to CORS-enabled EZTV mirrors from browser
  console.warn('Backend EZTV proxy unavailable, attempting direct mirror query...', backendError?.message);
  
  let targetImdbId = params.imdb_id ? params.imdb_id.replace(/^tt/i, '').trim() : '';
  let resolvedTitle: string | undefined = undefined;
  let showMeta: TvShowInfo | null = null;

  if (!targetImdbId && params.search && params.search.trim()) {
    try {
      const shows = await searchTvShows(params.search.trim());
      if (shows && shows.length > 0) {
        showMeta = shows[0];
        targetImdbId = shows[0].imdb_id;
        resolvedTitle = shows[0].name;
      }
    } catch {
      // ignore
    }
  }

  const directParams = new URLSearchParams();
  if (targetImdbId) {
    directParams.set('imdb_id', targetImdbId);
  }
  if (params.page && params.page > 0) {
    directParams.set('page', String(params.page));
  }
  if (params.limit && params.limit > 0) {
    directParams.set('limit', String(params.limit));
  }

  const directQuery = directParams.toString();
  for (const mirror of CLIENT_EZTV_MIRRORS) {
    try {
      const res = await fetch(`${mirror}?${directQuery}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.torrents)) {
          return {
            torrents_count: data.torrents_count || data.torrents.length,
            limit: data.limit || params.limit || 30,
            page: data.page || params.page || 1,
            imdb_id: targetImdbId || params.imdb_id,
            resolved_title: resolvedTitle,
            show_meta: showMeta,
            torrents: data.torrents
          };
        }
      }
    } catch {
      // continue to next mirror
    }
  }

  throw backendError || new Error('All EZTV mirrors failed to respond. Please try again.');
}

/**
 * Convenience helper to fetch EZTV releases for a movie or TV show by its IMDb code
 */
export async function fetchEztvByImdb(imdbCode: string, page: number = 1, limit: number = 50): Promise<EztvApiResponse> {
  return fetchEztvTorrents({ imdb_id: imdbCode, page, limit });
}

/**
 * Format bytes into human readable string (e.g. 1.45 GB)
 */
export function formatEztvBytes(bytes: string | number): string {
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (!num || isNaN(num) || num <= 0) return 'Unknown Size';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = num;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

/**
 * Format release timestamp
 */
export function formatEztvDate(unixTimestamp: number): string {
  if (!unixTimestamp) return 'Recent';
  try {
    const d = new Date(unixTimestamp * 1000);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Recent';
  }
}

/**
 * Parse resolution & codec flags from title
 */
export function parseQualityFromEztv(title: string, filename?: string): {
  quality: string;
  is4k: boolean;
  is1080p: boolean;
  is720p: boolean;
  isHevc: boolean;
} {
  const target = `${title} ${filename || ''}`.toLowerCase();

  const is4k = target.includes('2160p') || target.includes('4k') || target.includes('uhd');
  const is1080p = target.includes('1080p');
  const is720p = target.includes('720p');
  const is480p = target.includes('480p') || target.includes('hdtv');
  const isHevc = target.includes('x265') || target.includes('hevc') || target.includes('h.265');

  let quality = 'HD';
  if (is4k) quality = '4K UHD';
  else if (is1080p) quality = '1080p';
  else if (is720p) quality = '720p';
  else if (is480p) quality = '480p';

  return { quality, is4k, is1080p, is720p, isHevc };
}

/**
 * Clean TV Series Name and extract Year from raw EZTV release title
 * e.g. "Dark.Matter.2024.S02E06.1080p.HEVC..." -> { title: "Dark Matter", year: "2024" }
 * e.g. "War.2026.S01E01.1080p.HEVC..." -> { title: "War", year: "2026" }
 */
export function extractShowTitleAndYear(rawTitle: string): { title: string; year?: string } {
  if (!rawTitle) return { title: '', year: undefined };
  let cleaned = rawTitle;

  // Cut off at S01E01, S01, Season 1, etc.
  cleaned = cleaned.replace(/\bS\d{1,2}(?:E\d{1,2})?\b.*$/i, '');
  cleaned = cleaned.replace(/\bseason\s*\d{1,2}\b.*$/i, '');
  cleaned = cleaned.replace(/\bepisode\s*\d{1,2}\b.*$/i, '');

  // Cut off common release tags and scene group names
  cleaned = cleaned.replace(/\b(1080p|720p|2160p|4k|uhd|hevc|x265|x264|web-?dl|webrip|hdtv|bluray|eztv|xvid|afg|megusta|msd)\b.*$/gi, '');

  // Replace dots, underscores with spaces
  cleaned = cleaned.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract year if present at the end: e.g. "Dark Matter 2024" or "Dark Matter (2024)"
  let year: string | undefined;
  const yearMatch = cleaned.match(/\s+(?:\()?((?:19|20)\d{2})(?:\))?$/);
  if (yearMatch) {
    year = yearMatch[1];
    cleaned = cleaned.replace(yearMatch[0], '').trim();
  }

  return { title: cleaned || rawTitle, year };
}

export function extractShowTitleFromRelease(rawTitle: string): string {
  return extractShowTitleAndYear(rawTitle).title;
}

/**
 * Generate a clean URL slug for a TV show
 */
export function getSeriesSlug(title: string, imdbId?: string): string {
  const cleanTitle = (title || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-');

  const cleanImdb = imdbId ? imdbId.replace(/^tt/i, '').trim() : '';
  if (cleanImdb && cleanTitle) {
    return `tt${cleanImdb}-${cleanTitle}`;
  } else if (cleanImdb) {
    return `tt${cleanImdb}`;
  }
  return cleanTitle || 'tv-series';
}

/**
 * Get canonical path for a TV series
 */
export function getSeriesPath(showOrTitle: { name?: string; title?: string; imdb_code?: string; imdb_id?: string } | string): string {
  if (typeof showOrTitle === 'string') {
    const slug = getSeriesSlug(showOrTitle);
    return `/series/${slug}`;
  }
  const name = showOrTitle.name || showOrTitle.title || '';
  const imdb = showOrTitle.imdb_code || showOrTitle.imdb_id;
  const slug = getSeriesSlug(name, imdb);
  return `/series/${slug}`;
}

/**
 * Fetch full TV show details (metadata, cast, episodes) via /api/tv/details
 */
export async function fetchTvShowDetails(params: { imdb?: string; id?: number; title?: string }): Promise<TvShowDetails | null> {
  const query = new URLSearchParams();
  if (params.imdb) query.set('imdb', params.imdb.trim());
  if (params.id) query.set('id', String(params.id));
  
  const cleanedTitle = params.title ? extractShowTitleFromRelease(params.title) : undefined;
  if (cleanedTitle) {
    query.set('title', cleanedTitle.trim());
  } else if (params.title) {
    query.set('title', params.title.trim());
  }

  const queryString = query.toString();
  if (!queryString) return null;

  try {
    const res = await fetch(`/api/tv/details?${queryString}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.show) {
        return data.show as TvShowDetails;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch from /api/tv/details, checking fallback:', err);
  }

  // Client-side fallback if direct TVmaze is needed
  try {
    let rawShow: any = null;
    if (params.imdb) {
      const imdbCode = params.imdb.startsWith('tt') ? params.imdb : `tt${params.imdb}`;
      const lookupRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbCode}`, { redirect: 'follow' });
      if (lookupRes.ok) rawShow = await lookupRes.json();
    } else if (params.id) {
      const idRes = await fetch(`https://api.tvmaze.com/shows/${params.id}`);
      if (idRes.ok) rawShow = await idRes.json();
    } else if (cleanedTitle || params.title) {
      const searchTitle = cleanedTitle || params.title || '';
      const searchRes = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(searchTitle)}`);
      if (searchRes.ok) {
        const results = await searchRes.json();
        if (results?.[0]?.show) rawShow = results[0].show;
      }
    }

    if (!rawShow) return null;

    const [castRes, epRes] = await Promise.allSettled([
      fetch(`https://api.tvmaze.com/shows/${rawShow.id}/cast`),
      fetch(`https://api.tvmaze.com/shows/${rawShow.id}/episodes`)
    ]);

    const castList = (castRes.status === 'fulfilled' && castRes.value.ok) ? await castRes.value.json() : [];
    const epList = (epRes.status === 'fulfilled' && epRes.value.ok) ? await epRes.value.json() : [];

    return {
      id: rawShow.id,
      name: rawShow.name,
      imdb_code: rawShow.externals?.imdb || params.imdb || '',
      imdb_id: (rawShow.externals?.imdb || params.imdb || '').replace(/^tt/i, ''),
      year: rawShow.premiered ? rawShow.premiered.slice(0, 4) : undefined,
      rating: rawShow.rating?.average || undefined,
      image: rawShow.image?.original || rawShow.image?.medium || undefined,
      summary: rawShow.summary ? rawShow.summary.replace(/<[^>]*>?/gm, '').trim() : undefined,
      genres: rawShow.genres || [],
      network: rawShow.network?.name || rawShow.webChannel?.name || undefined,
      status: rawShow.status,
      runtime: rawShow.runtime || rawShow.averageRuntime,
      averageRuntime: rawShow.averageRuntime,
      premiered: rawShow.premiered,
      ended: rawShow.ended,
      officialSite: rawShow.officialSite,
      type: rawShow.type,
      language: rawShow.language,
      cast: Array.isArray(castList) ? castList.slice(0, 16) : [],
      episodes: Array.isArray(epList) ? epList : []
    };
  } catch (err) {
    console.error('Direct fallback TV details error:', err);
  }

  return null;
}
