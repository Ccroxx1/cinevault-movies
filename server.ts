import express from 'express';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { buildMovieHtml } from './src/utils/htmlBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent visitor counter setup
const STATS_FILE = path.join(process.cwd(), 'data', 'visitor_stats.json');

// Upstash Redis Cloud Database Configuration
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  console.warn('⚠️ UPSTASH_REDIS_REST_URL or TOKEN missing. Falling back to local storage only.');
}

async function runUpstashPipeline(commands: any[][]): Promise<any[] | null> {
  const url = UPSTASH_REDIS_REST_URL;
  const token = UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`Upstash Redis returned status ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    
    // Check if any command returned an error (e.g. NOPERM on read-only tokens)
    const hasError = data.some(item => item && item.error);
    if (hasError) {
      return null;
    }
    return data.map(item => item?.result);
  } catch (err: any) {
    console.warn('Upstash Redis sync deferred (falling back to local cache):', err?.message || err);
    return null;
  }
}

interface VisitorStats {
  totalVisitors: number;
  knownVisitorIds: string[];
  todayVisitors: number;
  todayVisitorIds: string[];
  lastDate: string;
}

let statsCache: VisitorStats = {
  totalVisitors: 0,
  knownVisitorIds: [],
  todayVisitors: 0,
  todayVisitorIds: [],
  lastDate: new Date().toISOString().split('T')[0]
};

function loadVisitorStats() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const today = new Date().toISOString().split('T')[0];
    if (fs.existsSync(STATS_FILE)) {
      const raw = fs.readFileSync(STATS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (typeof parsed.totalVisitors === 'number' || Array.isArray(parsed.knownVisitorIds)) {
        statsCache.knownVisitorIds = Array.isArray(parsed.knownVisitorIds) ? parsed.knownVisitorIds : [];
        statsCache.totalVisitors = Math.max(parsed.totalVisitors || 0, statsCache.knownVisitorIds.length);
        
        statsCache.lastDate = parsed.lastDate || today;
        if (statsCache.lastDate === today) {
          statsCache.todayVisitorIds = Array.isArray(parsed.todayVisitorIds) ? parsed.todayVisitorIds : [];
          statsCache.todayVisitors = Math.max(parsed.todayVisitors || 0, statsCache.todayVisitorIds.length);
        } else {
          statsCache.lastDate = today;
          statsCache.todayVisitors = 0;
          statsCache.todayVisitorIds = [];
        }
      }
    } else {
      saveVisitorStats();
    }
  } catch (err) {
    console.error('Error loading visitor stats:', err);
  }
}

let saveTimeout: NodeJS.Timeout | null = null;
function saveVisitorStats() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(STATS_FILE, JSON.stringify(statsCache, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving visitor stats:', err);
    }
  }, 100);
}

// Initialize on startup & sync with Upstash Redis or Global Cloud Hit Counter
loadVisitorStats();
(async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const redisResults = await runUpstashPipeline([
      ['SCARD', 'cinevault:visitors:all'],
      ['SCARD', `cinevault:visitors:daily:${today}`]
    ]);
    if (redisResults && typeof redisResults[0] === 'number' && redisResults[0] > 0) {
      statsCache.totalVisitors = Math.max(statsCache.totalVisitors, redisResults[0]);
      statsCache.todayVisitors = typeof redisResults[1] === 'number' ? Math.max(statsCache.todayVisitors, redisResults[1]) : statsCache.todayVisitors;
      saveVisitorStats();
      return;
    }

    // Fallback sync with global cloud counter if local stats are empty
    if (statsCache.totalVisitors === 0) {
      const allRes = await fetch('https://hits.dwyl.com/sasuu/cinevault-all.json');
      if (allRes.ok) {
        const allData = await allRes.json();
        const count = parseInt(allData?.message || '0', 10);
        if (count > 0) {
          statsCache.totalVisitors = Math.max(statsCache.totalVisitors, count);
          statsCache.todayVisitors = Math.max(1, statsCache.todayVisitors);
          saveVisitorStats();
        }
      }
    }
  } catch {
    // Graceful fallback to local cache
  }
})();


// API Base URLs to try in priority order with official & high-uptime mirrors
const API_BASE_URLS = [
  'https://yts.mx/api/v2',
  'https://yts.am/api/v2',
  'https://yts.lt/api/v2',
  'https://yts.bz/api/v2',
  'https://yts.do/api/v2',
  'https://yts.rs/api/v2',
  'https://movies-api.accel.li/api/v2'
];

// Simple in-memory cache to make browsing super fast and resilient
const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

// SEO Meta Tag Cache
const metaTagCache = new Map<string, { timestamp: number; html: string }>();
const META_TAG_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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
      const timeoutId = setTimeout(() => controller.abort(), 3500);

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
            const json = JSON.parse(trimmed);
            if (json && (json.status === 'ok' || json.data)) {
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

// Visitor Counter Endpoints with Upstash Redis Cloud Database & Local Fallback
app.get('/api/visitors/stats', async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Query Upstash Redis cloud database if available
    const redisResults = await runUpstashPipeline([
      ['SCARD', 'cinevault:visitors:all'],
      ['SCARD', `cinevault:visitors:daily:${today}`]
    ]);

    if (redisResults && typeof redisResults[0] === 'number' && redisResults[0] > 0) {
      const total = Math.max(statsCache.totalVisitors, redisResults[0]);
      const todayCount = typeof redisResults[1] === 'number' ? Math.max(statsCache.todayVisitors, redisResults[1]) : statsCache.todayVisitors;
      statsCache.totalVisitors = total;
      statsCache.todayVisitors = todayCount;
      statsCache.lastDate = today;
      saveVisitorStats();

      return res.json({
        totalVisitors: total,
        todayVisitors: todayCount,
        status: 'ok',
        source: 'cloud_redis'
      });
    }

    // Fallback to local memory / file cache
    if (statsCache.lastDate !== today) {
      statsCache.lastDate = today;
      statsCache.todayVisitors = 0;
      statsCache.todayVisitorIds = [];
      saveVisitorStats();
    }
    res.json({
      totalVisitors: statsCache.totalVisitors,
      todayVisitors: statsCache.todayVisitors,
      status: 'ok',
      source: 'local_fallback'
    });
  } catch (error: any) {
    console.error('Error fetching visitor stats:', error);
    res.status(500).json({ status: 'error', totalVisitors: statsCache.totalVisitors, todayVisitors: statsCache.todayVisitors });
  }
});

app.post('/api/visitors/hit', async (req, res) => {
  try {
    const visitorId = (req.body?.visitorId || req.ip || 'anon').toString().slice(0, 100);
    const today = new Date().toISOString().split('T')[0];

    // Pipeline to Upstash Redis for atomic set insertion and cardinality counts
    const redisResults = await runUpstashPipeline([
      ['SADD', 'cinevault:visitors:all', visitorId],
      ['SCARD', 'cinevault:visitors:all'],
      ['SADD', `cinevault:visitors:daily:${today}`, visitorId],
      ['EXPIRE', `cinevault:visitors:daily:${today}`, 604800], // 7 days retention
      ['SCARD', `cinevault:visitors:daily:${today}`]
    ]);

    if (redisResults && typeof redisResults[1] === 'number') {
      const isNewLifetime = redisResults[0] === 1;
      const total = redisResults[1];
      const todayCount = typeof redisResults[4] === 'number' ? redisResults[4] : 1;

      statsCache.totalVisitors = total;
      statsCache.todayVisitors = todayCount;
      statsCache.lastDate = today;
      if (!statsCache.knownVisitorIds.includes(visitorId)) {
        statsCache.knownVisitorIds.push(visitorId);
      }
      saveVisitorStats();

      return res.json({
        totalVisitors: total,
        todayVisitors: todayCount,
        isNew: isNewLifetime,
        status: 'ok',
        source: 'cloud_redis'
      });
    }

    // Fallback to local cache if cloud database is unreachable
    if (statsCache.lastDate !== today) {
      statsCache.lastDate = today;
      statsCache.todayVisitors = 0;
      statsCache.todayVisitorIds = [];
    }

    let modified = false;
    let isNewLifetime = false;

    // Check lifetime visitor
    if (!statsCache.knownVisitorIds.includes(visitorId)) {
      statsCache.totalVisitors += 1;
      statsCache.knownVisitorIds.push(visitorId);
      isNewLifetime = true;
      modified = true;
      
      if (statsCache.knownVisitorIds.length > 50000) {
        statsCache.knownVisitorIds = statsCache.knownVisitorIds.slice(-40000);
      }
    }

    // Check daily visitor
    if (!statsCache.todayVisitorIds.includes(visitorId)) {
      statsCache.todayVisitors += 1;
      statsCache.todayVisitorIds.push(visitorId);
      modified = true;
      if (statsCache.todayVisitorIds.length > 25000) {
        statsCache.todayVisitorIds = statsCache.todayVisitorIds.slice(-20000);
      }
    }

    if (modified) {
      saveVisitorStats();
    }

    res.json({
      totalVisitors: statsCache.totalVisitors,
      todayVisitors: statsCache.todayVisitors,
      isNew: isNewLifetime,
      status: 'ok',
      source: 'local_fallback'
    });
  } catch (error: any) {
    console.error('Error processing visitor hit:', error);
    res.status(500).json({ status: 'error', totalVisitors: statsCache.totalVisitors, todayVisitors: statsCache.todayVisitors });
  }
});


async function injectDynamicMetaTags(htmlTemplate: string, reqUrl: string): Promise<string> {
  const SITE_BASE_URL = 'https://cinevault-movies-one.vercel.app';
  
  // Return cached HTML if available and not expired
  const cached = metaTagCache.get(reqUrl);
  if (cached && Date.now() - cached.timestamp < META_TAG_CACHE_TTL) {
    return cached.html;
  }

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

      const listData = await fetchFromApi('list_movies.json', { query_term: queryTerm, limit: '10' });
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
        const finalHtml = buildMovieHtml(htmlTemplate, movie, relatedMovies);
        metaTagCache.set(reqUrl, { timestamp: Date.now(), html: finalHtml });
        return finalHtml;
      }
    }
  } catch (err) {
    console.warn('Meta tag injection skipped:', err);
  }

  return htmlTemplate;
}

async function startServer() {
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

    app.get('*', async (req, res) => {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 CineVault server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
