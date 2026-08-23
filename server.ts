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

interface VisitorStats {
  totalVisitors: number;
  knownVisitorIds: string[];
  todayVisitors: number;
  lastDate: string;
}

let statsCache: VisitorStats = {
  totalVisitors: 0,
  knownVisitorIds: [],
  todayVisitors: 0,
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

// Initialize on startup
loadVisitorStats();

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

// Visitor Counter Endpoints
app.get('/api/visitors/stats', (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    if (statsCache.lastDate !== today) {
      statsCache.lastDate = today;
      statsCache.todayVisitors = 0;
      saveVisitorStats();
    }
    res.json({
      totalVisitors: statsCache.totalVisitors,
      todayVisitors: statsCache.todayVisitors,
      status: 'ok'
    });
  } catch (error: any) {
    console.error('Error fetching visitor stats:', error);
    res.status(500).json({ status: 'error', totalVisitors: statsCache.totalVisitors });
  }
});

app.post('/api/visitors/hit', (req, res) => {
  try {
    const visitorId = (req.body?.visitorId || req.ip || 'anon').toString().slice(0, 100);
    const today = new Date().toISOString().split('T')[0];

    // Reset daily count if date changed
    if (statsCache.lastDate !== today) {
      statsCache.lastDate = today;
      statsCache.todayVisitors = 0;
    }

    const isKnown = statsCache.knownVisitorIds.includes(visitorId);
    let isNew = false;

    if (!isKnown) {
      statsCache.totalVisitors += 1;
      statsCache.todayVisitors += 1;
      isNew = true;
      statsCache.knownVisitorIds.push(visitorId);
      
      // Limit array size to prevent unbounded memory growth while keeping a large unique pool
      if (statsCache.knownVisitorIds.length > 25000) {
        statsCache.knownVisitorIds = statsCache.knownVisitorIds.slice(-20000);
      }
      saveVisitorStats();
    }

    res.json({
      totalVisitors: statsCache.totalVisitors,
      todayVisitors: statsCache.todayVisitors,
      isNew,
      status: 'ok'
    });
  } catch (error: any) {
    console.error('Error processing visitor hit:', error);
    res.status(500).json({ status: 'error', totalVisitors: statsCache.totalVisitors });
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
