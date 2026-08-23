import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent visitor counter setup
const STATS_FILE = path.join(process.cwd(), 'data', 'visitor_stats.json');

// Upstash Redis Cloud Database Configuration
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://relaxing-flounder-42041.upstash.io';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'AqQ5AAIgcDG6sdewCbB8RVIClvvFRhx-qV5AxGKoy6NUZFNOcbj1qw';

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

// Initialize on startup & sync with Upstash Redis if read-write is available
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

      const listData = await fetchFromApi('list_movies.json', { query_term: queryTerm, limit: '5' });
      let movie = null;
      if (listData?.data?.movies?.length > 0) {
        if (queryYear) {
          movie = listData.data.movies.find((m: any) => m.year === queryYear) || listData.data.movies[0];
        } else {
          movie = listData.data.movies[0];
        }
      }

      if (movie) {
        const title = `${movie.title} (${movie.year || 'HD'}) — Watch & Download | CineVault By Sasuu`;
        const synopsis = (movie.description_full || movie.summary || movie.synopsis || `Download & stream ${movie.title} (${movie.year}) in 720p, 1080p, and 4K on CineVault.`).slice(0, 180).replace(/"/g, '&quot;');
        const canonicalUrl = `${SITE_BASE_URL}/movies/${rawSlug}`;
        const image = movie.large_cover_image || movie.background_image_original || movie.medium_cover_image || `${SITE_BASE_URL}/favicon.svg`;
        const rating = movie.rating ? `${movie.rating.toFixed(1)} / 10 ★` : 'HD';
        const qualities = movie.torrents?.map((t: any) => t.quality).filter((v: any, i: number, a: any[]) => a.indexOf(v) === i).join(', ') || '720p, 1080p, 4K';

        let modifiedHtml = htmlTemplate;

        // Clean out static meta tags that we will override
        modifiedHtml = modifiedHtml
          .replace(/<title>.*?<\/title>/i, `<title>${title}</title>`)
          .replace(/<meta\s+name=["']description["'].*?>/gi, `<meta name="description" content="${synopsis}" />`)
          .replace(/<link\s+rel=["']canonical["'].*?>/gi, `<link rel="canonical" href="${canonicalUrl}" />`)
          .replace(/<meta\s+property=["']og:title["'].*?>/gi, `<meta property="og:title" content="${title}" />`)
          .replace(/<meta\s+property=["']og:description["'].*?>/gi, `<meta property="og:description" content="${synopsis}" />`)
          .replace(/<meta\s+property=["']og:url["'].*?>/gi, `<meta property="og:url" content="${canonicalUrl}" />`)
          .replace(/<meta\s+property=["']og:type["'].*?>/gi, `<meta property="og:type" content="video.movie" />`)
          .replace(/<meta\s+property=["']og:image["'].*?>/gi, `<meta property="og:image" content="${image}" />`)
          .replace(/<meta\s+name=["']twitter:title["'].*?>/gi, `<meta name="twitter:title" content="${title}" />`)
          .replace(/<meta\s+name=["']twitter:description["'].*?>/gi, `<meta name="twitter:description" content="${synopsis}" />`)
          .replace(/<meta\s+name=["']twitter:image["'].*?>/gi, `<meta name="twitter:image" content="${image}" />`);

        const extraTags = `
    <!-- Dynamic Social Media & Bot Tags -->
    <meta property="og:site_name" content="CineVault By Sasuu" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:alt" content="${movie.title} (${movie.year}) Artwork" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="en_US" />
    ${movie.year ? `<meta property="video:release_date" content="${movie.year}" />` : ''}
    ${movie.runtime ? `<meta property="video:duration" content="${movie.runtime * 60}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@CineVault" />
    <meta name="twitter:creator" content="@Sasuu" />
    <meta name="twitter:label1" content="IMDb Rating" />
    <meta name="twitter:data1" content="${rating}" />
    <meta name="twitter:label2" content="Available Format" />
    <meta name="twitter:data2" content="${qualities}" />
        `;

        modifiedHtml = modifiedHtml.replace('</head>', `${extraTags}\n  </head>`);
        return modifiedHtml;
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
