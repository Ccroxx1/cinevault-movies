import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { buildMovieHtml } from './src/utils/htmlBuilder.js';

const currentFilename = typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : (typeof __filename !== 'undefined' ? __filename : '');
const currentDirname = currentFilename ? path.dirname(currentFilename) : process.cwd();

export const app = express();
const PORT = 3000;

app.use(express.json());

// Synchronous Path Detection for Vercel & Local Production
const possibleDistPaths = [
  path.resolve(currentDirname, 'dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(currentDirname, '..', 'dist'),
  path.join('/var/task', 'dist')
];

let detectedDistPath = '';
for (const p of possibleDistPaths) {
  try {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      detectedDistPath = p;
      break;
    }
  } catch (e) { /* ignore */ }
}

if (!detectedDistPath) {
  detectedDistPath = path.resolve(currentDirname, 'dist');
}

const detectedIndexHtmlPath = path.resolve(detectedDistPath, 'index.html');

// API Proxy Configuration
const API_BASE_URLS = [
  'https://movies-api.accel.li/api/v2',
  'https://yts.gg/api/v2',
  'https://yts.am/api/v2',
  'https://yts.lt/api/v2',
  'https://yts.bz/api/v2',
  'https://yts.do/api/v2',
  'https://yts.rs/api/v2'
];

function sanitizeMovieImages(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return obj
      .replace(/https?:\/\/img\.yts\.mx\//gi, 'https://img.yts.gg/')
      .replace(/https?:\/\/yts\.mx\//gi, 'https://yts.gg/')
      .replace(/img\.yts\.mx/gi, 'img.yts.gg')
      .replace(/yts\.mx/gi, 'yts.gg');
  }
  if (Array.isArray(obj)) return obj.map(sanitizeMovieImages);
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) cleaned[k] = sanitizeMovieImages(v);
    return cleaned;
  }
  return obj;
}

const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchFromApi(endpoint: string, queryParams: Record<string, string>): Promise<any> {
  const normalizedParams = Object.entries(queryParams).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value !== undefined && value !== null) acc[key] = String(value);
    return acc;
  }, {});

  const queryString = new URLSearchParams(normalizedParams).toString();
  const cacheKey = `${endpoint}?${queryString}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Keep serverless requests bounded. A slow upstream API must never prevent
  // Vercel from returning the CineVault application.
  const timeoutMs = 1400;
  const mirrors = API_BASE_URLS.slice(0, 3);

  const fetchOne = async (baseUrl: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${baseUrl}/${endpoint}?${queryString}`, {
        headers: {
          'User-Agent': 'CineVault/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`Upstream API returned ${res.status}`);
      }

      return sanitizeMovieImages(await res.json());
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    // Race a small number of mirrors instead of waiting for every mirror
    // sequentially. This keeps Vercel execution short and predictable.
    const data = await Promise.any(mirrors.map(fetchOne));
    cache.set(cacheKey, { timestamp: Date.now(), data });
    return data;
  } catch (error: any) {
    // A stale cached response is preferable to taking down the page.
    if (cached) return cached.data;
    throw new Error(error?.message || 'Movie API temporarily unavailable');
  }
}

// Common API Routes
app.get('/api/health', (req, res) => res.send('CineVault OK'));

app.get('/api/movies/list', async (req, res) => {
  try {
    const data = await fetchFromApi('list_movies.json', req.query as any);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ status: 'error', status_message: e.message });
  }
});

app.get('/api/movies/details', async (req, res) => {
  try {
    const data = await fetchFromApi('movie_details.json', { ...req.query, with_images: 'true', with_cast: 'true' } as any);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ status: 'error', status_message: e.message });
  }
});

app.get('/favicon.ico', (req, res) => {
  const favPath = path.resolve(detectedDistPath, 'favicon.svg');
  if (fs.existsSync(favPath)) return res.redirect('/favicon.svg');
  res.status(404).end();
});

// Dynamic SEO Meta Tag Injection
async function injectDynamicMetaTags(htmlTemplate: string, reqUrl: string): Promise<string> {
  try {
    const pathname = new URL(reqUrl, 'http://localhost').pathname;
    const movieMatch = pathname.match(/^\/movies\/([a-zA-Z0-9_-]+)$/);

    if (!movieMatch) return htmlTemplate;

    const slug = movieMatch[1];
    const yearMatch = slug.match(/^(.*?)-(\d{4})$/);
    const queryTerm = yearMatch
      ? yearMatch[1].replace(/-/g, ' ')
      : slug.replace(/-/g, ' ');

    // SEO is an enhancement, never a hard dependency for a movie page.
    const seoTimeoutMs = 1800;
    const seoPromise = fetchFromApi('list_movies.json', {
      query_term: queryTerm,
      limit: '5'
    });

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), seoTimeoutMs);
    });

    const listData = await Promise.race([seoPromise, timeoutPromise]);

    if (listData?.data?.movies?.length > 0) {
      const movie = listData.data.movies[0];
      const related = listData.data.movies.slice(1);

      try {
        return buildMovieHtml(htmlTemplate, movie, related);
      } catch (error) {
        console.warn('Movie SEO HTML generation failed:', error);
      }
    }
  } catch (error) {
    console.warn('Dynamic SEO lookup skipped:', error);
  }

  // Always return the normal React application when SEO/API enhancement fails.
  return htmlTemplate;
}

// Development vs Production Setup
async function start() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
    app.use('*', async (req, res) => {
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(await injectDynamicMetaTags(template, req.originalUrl));
      } catch (e: any) { res.status(500).end(e.stack); }
    });
  } else {
    app.use(express.static(detectedDistPath, { index: false }));
    app.all('*', async (req, res) => {
      try {
        if (!fs.existsSync(detectedIndexHtmlPath)) {
          return res.status(404).send('Cinema Vault: Not Found');
        }

        const template = fs.readFileSync(detectedIndexHtmlPath, 'utf-8');
        const html = await injectDynamicMetaTags(template, req.originalUrl);

        return res
          .status(200)
          .set({ 'Content-Type': 'text/html; charset=utf-8' })
          .send(html);
      } catch (error) {
        console.error('Production page render failed:', error);

        // Last-resort static fallback. Dynamic SEO must never turn a valid
        // frontend route into a server error.
        try {
          if (fs.existsSync(detectedIndexHtmlPath)) {
            return res
              .status(200)
              .set({ 'Content-Type': 'text/html; charset=utf-8' })
              .send(fs.readFileSync(detectedIndexHtmlPath, 'utf-8'));
          }
        } catch (fallbackError) {
          console.error('Static HTML fallback failed:', fallbackError);
        }

        return res.status(500).send('Internal Server Error');
      }
    });
  }

  // Bind server after middlewares are registered (only if not running as serverless function on Vercel)
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🎬 CineVault running on http://0.0.0.0:${PORT}`);
    });
  }
}

// Execute setup
start().catch((err) => console.error('Startup Error:', err));

export default app;
