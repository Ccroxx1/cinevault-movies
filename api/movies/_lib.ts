const API_BASE_URLS = [
  'https://movies-api.accel.li/api/v2',
  'https://yts.mx/api/v2',
  'https://yts.lt/api/v2',
  'https://yts.am/api/v2',
];

const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;

type CacheEntry = {
  timestamp: number;
  data: unknown;
};

// Vercel may reuse a function instance between requests, so keep a small
// best-effort cache in memory. It is only an optimisation; the API remains
// fully functional when a new serverless instance is created.
const cache = new Map<string, CacheEntry>();

function isValidApiResponse(data: any): boolean {
  return Boolean(data && (data.status === 'ok' || data.data));
}

export async function fetchFromMovieApi(
  endpoint: string,
  queryParams: Record<string, string>,
): Promise<any> {
  const queryString = new URLSearchParams(queryParams).toString();
  const cacheKey = `${endpoint}?${queryString}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const requests = API_BASE_URLS.map(async (baseUrl) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const targetUrl = `${baseUrl}/${endpoint}?${queryString}`;
      const response = await fetch(targetUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CineVault-By-Sasuu/1.0',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`${baseUrl} returned HTTP ${response.status}`);
      }

      const json = await response.json();
      if (!isValidApiResponse(json)) {
        throw new Error(`${baseUrl} returned an invalid movie API response`);
      }

      return json;
    } finally {
      clearTimeout(timeoutId);
    }
  });

  try {
    // Try the mirrors concurrently. This is considerably safer for Vercel's
    // serverless execution limit than waiting 5–8 seconds on each mirror.
    const data = await Promise.any(requests);
    cache.set(cacheKey, { timestamp: Date.now(), data });
    return data;
  } catch (error: any) {
    if (cached) {
      return cached.data;
    }

    const errors = Array.isArray(error?.errors)
      ? error.errors.map((item: any) => item?.message).filter(Boolean)
      : [];

    throw new Error(
      errors.length
        ? `All movie API mirrors failed: ${errors.join(' | ')}`
        : 'Failed to fetch from all movie API mirrors',
    );
  }
}

export function queryParamsFromRequest(req: any): Record<string, string> {
  const url = new URL(req.url || '/', 'http://localhost');
  const params: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

export function sendJson(res: any, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.end(JSON.stringify(payload));
}
