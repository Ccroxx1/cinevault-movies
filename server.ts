import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { buildMovieHtml } from './src/utils/htmlBuilder.js';
import { recordVisitorHit, getVisitorStats, loadBaselineStats, getCorsOrigin } from './src/server/visitorTracker.js';

const currentFilename = typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : (typeof __filename !== 'undefined' ? __filename : '');
const currentDirname = currentFilename ? path.dirname(currentFilename) : process.cwd();

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize visitor tracking baseline on startup
loadBaselineStats();


// API Base URLs to try in priority order with official & high-uptime mirrors
const API_BASE_URLS = [
  'https://movies-api.accel.li/api/v2',
  'https://yts.gg/api/v2',
  'https://yts.am/api/v2',
  'https://yts.lt/api/v2',
  'https://yts.bz/api/v2',
  'https://yts.do/api/v2',
  'https://yts.rs/api/v2'
];

// Helper to normalize any yts.mx URLs inside API responses to yts.gg
function sanitizeMovieImages(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return obj
      .replace(/https?:\/\/img\.yts\.mx\//gi, 'https://img.yts.gg/')
      .replace(/https?:\/\/yts\.mx\//gi, 'https://yts.gg/')
      .replace(/img\.yts\.mx/gi, 'img.yts.gg')
      .replace(/yts\.mx/gi, 'yts.gg');
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeMovieImages);
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      cleaned[k] = sanitizeMovieImages(v);
    }
    return cleaned;
  }
  return obj;
}

// Simple in-memory cache to make browsing super fast and resilient
const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

async function fetchFromApi(endpoint: string, queryParams: Record<string, string>): Promise<any> {
  const queryString = new URLSearchParams(queryParams).toString();
  const cacheKey = `${endpoint}?${queryString}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let lastErrorMessage = 'Failed to fetch from all movie API mirrors';

  for (const baseUrl of API_BASE_URLS) {
    try {
      const targetUrl = `${baseUrl}/${endpoint}?${queryString}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        const trimmed = text ? text.trim() : '';

        // Verify response contains valid JSON structure
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            const rawJson = JSON.parse(trimmed);
            if (rawJson && (rawJson.status === 'ok' || rawJson.data)) {
              const json = sanitizeMovieImages(rawJson);
              cache.set(cacheKey, { timestamp: Date.now(), data: json });
              return json;
            }
          } catch {
            // Malformed JSON from this mirror; try next mirror
          }
        }
      }
    } catch (err: any) {
      lastErrorMessage = err?.message || lastErrorMessage;
      // continue to next base URL
    }
  }

  // If cached data is available even if stale, fallback to it
  if (cached) {
    return cached.data;
  }

  throw new Error(lastErrorMessage);
}

// API Routes
app.get('/api/movies/list', async (req, res) => {
  try {
    const params: Record<string, string> = {};
    for (const [key, val] of Object.entries(req.query)) {
      if (typeof val === 'string') {
        params[key] = val;
      }
    }
    
    // Set sensible defaults if not provided
    if (!params.limit) params.limit = '20';
    if (!params.page) params.page = '1';
    
    const data = await fetchFromApi('list_movies.json', params);
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching movies list:', error.message);
    res.status(500).json({ status: 'error', status_message: error.message, data: { movie_count: 0, movies: [] } });
  }
});

app.get('/api/movies/details', async (req, res) => {
  try {
    const params: Record<string, string> = {
      with_images: 'true',
      with_cast: 'true'
    };
    for (const [key, val] of Object.entries(req.query)) {
      if (typeof val === 'string') {
        params[key] = val;
      }
    }
    
    if (!params.movie_id && !params.imdb_id) {
      return res.status(400).json({ status: 'error', status_message: 'movie_id or imdb_id is required' });
    }

    const data = await fetchFromApi('movie_details.json', params);
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching movie details:', error.message);
    res.status(500).json({ status: 'error', status_message: error.message });
  }
});

app.get('/api/movies/suggestions', async (req, res) => {
  try {
    const movieId = req.query.movie_id as string;
    if (!movieId) {
      return res.status(400).json({ status: 'error', status_message: 'movie_id is required' });
    }
    const data = await fetchFromApi('movie_suggestions.json', { movie_id: movieId });
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching suggestions:', error.message);
    res.status(500).json({ status: 'error', status_message: error.message, data: { movies: [] } });
  }
});

app.get('/api/movies/parental_guides', async (req, res) => {
  try {
    const movieId = req.query.movie_id as string;
    if (!movieId) {
      return res.status(400).json({ status: 'error', status_message: 'movie_id is required' });
    }
    const data = await fetchFromApi('movie_parental_guides.json', { movie_id: movieId });
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching parental guides:', error.message);
    res.status(500).json({ status: 'error', status_message: error.message, data: { parent_guides: [] } });
  }
});

// Media & Torrent Proxy Endpoints for Download Packaging
function isSafePublicUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.3') ||
      hostname.startsWith('169.254.')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

app.get('/api/download/proxy-image', async (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).send('Image URL required');
  }

  if (!isSafePublicUrl(imageUrl)) {
    return res.status(400).send('Invalid or restricted image URL');
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).send('Error proxying image: ' + err.message);
  }
});

app.get('/api/download/proxy-file', async (req, res) => {
  const fileUrl = req.query.url as string;
  if (!fileUrl) {
    return res.status(400).send('File URL required');
  }

  if (!isSafePublicUrl(fileUrl)) {
    return res.status(400).send('Invalid or restricted file URL');
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(fileUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch file');
    }

    const contentType = response.headers.get('content-type') || 'application/x-bittorrent';
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).send('Error proxying file: ' + err.message);
  }
});

// Dual-Layer Visitor Counter Endpoints with Upstash Redis & Local JSON Baseline Fallback
app.get('/api/visitors/stats', async (req, res) => {
  const allowedOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  try {
    const result = await getVisitorStats();
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching visitor stats:', error);
    const baseline = loadBaselineStats();
    res.status(200).json({ status: 'ok', totalVisitors: baseline.totalVisitors, todayVisitors: baseline.todayVisitors, source: 'local_fallback' });
  }
});

app.post('/api/visitors/hit', async (req, res) => {
  const allowedOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  try {
    const result = await recordVisitorHit(req);
    res.json(result);
  } catch (error: any) {
    console.error('Error processing visitor hit:', error);
    const baseline = loadBaselineStats();
    res.status(200).json({ status: 'ok', totalVisitors: baseline.totalVisitors, todayVisitors: baseline.todayVisitors, isNew: false, source: 'local_fallback' });
  }
});

// Favicon fallback to stop 404s
app.get('/favicon.ico', (req, res) => {
  res.redirect('/favicon.svg');
});



async function injectDynamicMetaTags(htmlTemplate: string, reqUrl: string): Promise<string> {
  const SITE_BASE_URL = 'https://cinevault-movies-one.vercel.app';
  
  try {
    const urlObj = new URL(reqUrl, SITE_BASE_URL);
    const pathname = urlObj.pathname;

    // Check if this is a movie path: /movies/:slug
    const movieMatch = pathname.match(/^\/movies\/([a-zA-Z0-9_-]+)/);
    if (movieMatch) {
      const rawSlug = movieMatch[1];
      const yearMatch = rawSlug.match(/^(.*?)-(\d{4})$/);
      const queryTerm = yearMatch ? yearMatch[1].replace(/-/g, ' ') : rawSlug.replace(/-/g, ' ');
      const queryYear = yearMatch ? parseInt(yearMatch[2], 10) : null;

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
      const fetchPromise = fetchFromApi('list_movies.json', { query_term: queryTerm, limit: '10' }).catch(() => null);

      const listData = await Promise.race([fetchPromise, timeoutPromise]);
      let movie = null;
      let relatedMovies: any[] = [];

      if (listData?.data?.movies?.length > 0) {
        if (queryYear) {
          movie = listData.data.movies.find((m: any) => m.year === queryYear) || listData.data.movies[0];
        } else {
          movie = listData.data.movies[0];
        }
        relatedMovies = listData.data.movies.filter((m: any) => m.id !== movie?.id);
      }

      if (movie) {
        return buildMovieHtml(htmlTemplate, movie, relatedMovies);
      }
    }
  } catch (err) {
    console.warn('Meta tag injection skipped:', err);
  }

  return htmlTemplate;
}

async function setupApp() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    // Explicit SSR route for movie URLs in development
    app.get('/movies/:slug', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.join(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        const html = await injectDynamicMetaTags(template, url);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

    app.use(vite.middlewares);

    // Fallback for HTML navigation with dynamic SEO tags
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) return next();

      try {
        const indexPath = path.join(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        const html = await injectDynamicMetaTags(template, url);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexHtmlPath = path.join(distPath, 'index.html');
    app.use(express.static(distPath, { index: false }));

    app.all('*', async (req, res) => {
      const pathname = req.path;
      const movieMatch = pathname.match(/^\/movies\/([a-zA-Z0-9_-]+)/);

      // If pre-rendered static movie page exists, serve directly
      if (movieMatch) {
        const slug = movieMatch[1];
        const staticMoviePath = path.join(distPath, 'movies', slug, 'index.html');
        if (fs.existsSync(staticMoviePath)) {
          return res.sendFile(staticMoviePath);
        }
      }

      try {
        if (fs.existsSync(indexHtmlPath)) {
          const rawTemplate = fs.readFileSync(indexHtmlPath, 'utf-8');
          const html = await injectDynamicMetaTags(rawTemplate, req.originalUrl);
          return res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
        }
        res.sendFile(indexHtmlPath);
      } catch {
        res.sendFile(indexHtmlPath);
      }
    });
  }
}

// Ensure routes are set up
await setupApp();

if (process.env.NODE_ENV !== 'production' || process.env.VITE_DEV_SERVER) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 CineVault server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
