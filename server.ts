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
    return Array.isArray(data) ? data.map(item => item?.result) : null;
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
    if (fs.existsSync(STATS_FILE)) {
      const raw = fs.readFileSync(STATS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (typeof parsed.totalVisitors === 'number') {
        statsCache.totalVisitors = parsed.totalVisitors;
        statsCache.knownVisitorIds = Array.isArray(parsed.knownVisitorIds) ? parsed.knownVisitorIds : [];
        statsCache.todayVisitors = typeof parsed.todayVisitors === 'number' ? parsed.todayVisitors : 0;
        statsCache.todayVisitorIds = Array.isArray(parsed.todayVisitorIds) ? parsed.todayVisitorIds : [];
        statsCache.lastDate = parsed.lastDate || new Date().toISOString().split('T')[0];
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
  }, 300);
}

// Initialize on startup & sync with Upstash Redis
loadVisitorStats();
(async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const redisResults = await runUpstashPipeline([
      ['SCARD', 'cinevault:visitors:all'],
      ['SCARD', `cinevault:visitors:daily:${today}`]
    ]);
    if (redisResults && typeof redisResults[0] === 'number') {
      statsCache.totalVisitors = redisResults[0];
      statsCache.todayVisitors = typeof redisResults[1] === 'number' ? redisResults[1] : statsCache.todayVisitors;
      saveVisitorStats();
    }
  } catch {
    // Graceful fallback to local cache
  }
})();


// API Base URLs to try in priority order
const API_BASE_URLS = [
  'https://movies-api.accel.li/api/v2',
  'https://yts.am/api/v2',
  'https://yts.lt/api/v2',
  'https://yts.bz/api/v2',
  'https://yts.mx/api/v2'
];

// Simple in-memory cache to make browsing super fast and resilient
const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

    // Query Upstash Redis cloud database
    const redisResults = await runUpstashPipeline([
      ['SCARD', 'cinevault:visitors:all'],
      ['SCARD', `cinevault:visitors:daily:${today}`]
    ]);

    if (redisResults && typeof redisResults[0] === 'number') {
      const total = redisResults[0];
      const todayCount = typeof redisResults[1] === 'number' ? redisResults[1] : 0;
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


async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 CineVault server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
