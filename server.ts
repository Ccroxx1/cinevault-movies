import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { buildMovieHtml } from './src/utils/htmlBuilder.js';

const currentFilename = typeof __filename !== 'undefined' ? __filename : '';
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : (currentFilename ? path.dirname(currentFilename) : process.cwd());

export const app = express();
const PORT = 3000;

app.use(express.json());

// Synchronous Path Detection for Vercel & Local Production
const possibleDistPaths = [
  path.resolve(process.cwd(), 'dist'),
  currentDirname,
  path.resolve(currentDirname, 'dist'),
  path.resolve(currentDirname, '..', 'dist'),
  path.join('/var/task', 'dist')
];

let detectedDistPath = '';
for (const p of possibleDistPaths) {
  try {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'index.html'))) {
      detectedDistPath = p;
      break;
    }
  } catch (e) { /* ignore */ }
}

if (!detectedDistPath) {
  detectedDistPath = path.resolve(process.cwd(), 'dist');
}

const detectedIndexHtmlPath = path.resolve(detectedDistPath, 'index.html');

// API Proxy Configuration - ordered by stability and latency
const API_BASE_URLS = [
  'https://yts.gg/api/v2',
  'https://movies-api.accel.li/api/v2',
  'https://yts.am/api/v2',
  'https://yts.lt/api/v2',
  'https://yts.bz/api/v2'
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

async function fetchFromApi(endpoint: string, queryParams: Record<string, any>): Promise<any> {
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
  const timeoutMs = 3500;
  const mirrors = API_BASE_URLS.slice(0, 4);

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

      const json = await res.json();
      if (!json || json.status === 'error') {
        throw new Error('Upstream API returned error payload');
      }

      // If list query returns movies, verify at least one has an id or title
      if (endpoint === 'list_movies.json') {
        const movies = json?.data?.movies;
        if (Array.isArray(movies) && movies.length > 0 && !movies[0]?.title && !movies[0]?.id) {
          throw new Error('Upstream API returned blank movie payload');
        }
      }

      return sanitizeMovieImages(json);
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

app.get(['/api/movies', '/api/movies/list'], async (req, res) => {
  try {
    const data = await fetchFromApi('list_movies.json', req.query as any);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ status: 'error', status_message: e.message });
  }
});

app.get(['/api/movie_details', '/api/movies/details'], async (req, res) => {
  try {
    const data = await fetchFromApi('movie_details.json', { ...req.query, with_images: 'true', with_cast: 'true' } as any);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ status: 'error', status_message: e.message });
  }
});

app.get(['/api/movie_suggestions', '/api/movies/suggestions'], async (req, res) => {
  try {
    const data = await fetchFromApi('movie_suggestions.json', req.query as any);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ status: 'error', status_message: e.message });
  }
});

app.get(['/api/movie_parental_guides', '/api/movies/parental_guides'], async (req, res) => {
  try {
    const data = await fetchFromApi('movie_parental_guides.json', req.query as any);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ status: 'error', status_message: e.message });
  }
});

app.get('/api/movies/filmography', async (req, res) => {
  const personName = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  const role = typeof req.query.role === 'string' ? req.query.role : 'cast';
  if (!personName) {
    return res.status(400).json({ status: 'error', status_message: 'Person name is required' });
  }

  const cacheKey = `filmography:${personName.toLowerCase()}:${role}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    return res.json(cached.data);
  }

  try {
    let imdbIds: string[] = [];

    // 1. Resolve person name via Wikidata Entity Search
    try {
      const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(personName)}&type=item&language=en&limit=3&format=json`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'CineVault/1.0 (https://cinevault.app; contact@cinevault.app)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(3000)
      });

      if (searchRes.ok) {
        const searchData: any = await searchRes.json();
        const qid = searchData.search?.[0]?.id;

        if (qid) {
          // 2. Query Wikidata SPARQL for movies with IMDb IDs
          const sparql = `SELECT DISTINCT ?movieLabel ?imdb ?year WHERE { VALUES ?prop { wdt:P161 wdt:P57 wdt:P725 } ?movie ?prop wd:${qid} ; wdt:P345 ?imdb . OPTIONAL { ?movie wdt:P577 ?pubDate . BIND(YEAR(?pubDate) AS ?year) } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } ORDER BY DESC(?year) LIMIT 25`;
          const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
          const sparqlRes = await fetch(sparqlUrl, {
            headers: {
              'User-Agent': 'CineVault/1.0 (https://cinevault.app; contact@cinevault.app)',
              'Accept': 'application/sparql-results+json'
            },
            signal: AbortSignal.timeout(4000)
          });

          if (sparqlRes.ok) {
            const sparqlData: any = await sparqlRes.json();
            const bindings = sparqlData.results?.bindings || [];
            const seen = new Set<string>();
            for (const b of bindings) {
              const imdbVal = b.imdb?.value;
              if (imdbVal && /^tt\d+$/.test(imdbVal) && !seen.has(imdbVal)) {
                seen.add(imdbVal);
                imdbIds.push(imdbVal);
              }
            }
          }
        }
      }
    } catch (wikiErr) {
      console.warn(`Wikidata resolution failed for ${personName}:`, wikiErr);
    }

    const movies: any[] = [];
    const seenMovieIds = new Set<number>();

    // 3. Look up titles in CineVault mirror index by IMDb IDs
    if (imdbIds.length > 0) {
      const fetchMovieByImdb = async (imdbId: string) => {
        try {
          const res: any = await fetchFromApi('list_movies.json', { query_term: imdbId, limit: 1 });
          return res?.data?.movies?.[0] || null;
        } catch {
          return null;
        }
      };

      // Query the top 18 IMDb titles concurrently
      const movieResults = await Promise.all(imdbIds.slice(0, 18).map(fetchMovieByImdb));
      for (const m of movieResults) {
        if (m && !seenMovieIds.has(m.id)) {
          seenMovieIds.add(m.id);
          movies.push(m);
        }
      }
    }

    // 4. Fallback or supplemental: Query direct search on movie catalog
    if (movies.length < 8) {
      try {
        const directRes: any = await fetchFromApi('list_movies.json', { query_term: personName, limit: 20 });
        const directMovies = directRes?.data?.movies || [];
        for (const m of directMovies) {
          if (!seenMovieIds.has(m.id)) {
            seenMovieIds.add(m.id);
            movies.push(m);
          }
        }
      } catch {}
    }

    const payload = {
      status: 'ok',
      status_message: 'Query was successful',
      data: {
        person: personName,
        movie_count: movies.length,
        movies
      }
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: payload });
    res.json(payload);
  } catch (err: any) {
    // If upstream failure, attempt fallback direct search
    try {
      const fallbackRes = await fetchFromApi('list_movies.json', { query_term: personName, limit: 20 });
      return res.json(fallbackRes);
    } catch {
      res.status(500).json({ status: 'error', status_message: err.message || 'Filmography unavailable' });
    }
  }
});

// ==========================================
// Genuine Visitor Tracker (Upstash Redis + Durable File Fallback)
// Strictly actual verified visitors - zero simulated counts
// ==========================================
const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_VISITOR_FILE = path.join(DATA_DIR, 'visitors.json');

function getLocalVisitors(): { unique: Set<string>; totalVisits: number } {
  try {
    if (fs.existsSync(LOCAL_VISITOR_FILE)) {
      const raw = fs.readFileSync(LOCAL_VISITOR_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        unique: new Set(Array.isArray(parsed.unique) ? parsed.unique : []),
        totalVisits: typeof parsed.totalVisits === 'number' ? parsed.totalVisits : 0,
      };
    }
  } catch (err) {
    console.warn('Could not read local visitor file:', err);
  }
  return { unique: new Set(), totalVisits: 0 };
}

function saveLocalVisitors(unique: Set<string>, totalVisits: number) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      LOCAL_VISITOR_FILE,
      JSON.stringify({ unique: Array.from(unique), totalVisits }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.warn('Could not save local visitor file:', err);
  }
}

async function queryRedisVisitors(): Promise<{ count: number; totalVisits: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['SCARD', 'cinevault:visitors:unique'],
        ['GET', 'cinevault:visitors:total'],
      ]),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;
    const data: any = await res.json();
    const count = typeof data[0]?.result === 'number' ? data[0].result : 0;
    const rawTotal = parseInt(data[1]?.result || '0', 10);
    const totalVisits = Number.isFinite(rawTotal) ? Math.max(rawTotal, count) : count;
    return { count, totalVisits };
  } catch (err) {
    console.warn('Redis visitor query error:', err);
    return null;
  }
}

async function recordRedisVisitor(
  visitorId: string,
  isNewSession: boolean
): Promise<{ count: number; totalVisits: number; isNewVisitor: boolean } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const commands: any[] = [
      ['SADD', 'cinevault:visitors:unique', visitorId],
    ];
    if (isNewSession) {
      commands.push(['INCR', 'cinevault:visitors:total']);
    } else {
      commands.push(['GET', 'cinevault:visitors:total']);
    }
    commands.push(['SCARD', 'cinevault:visitors:unique']);

    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) return null;
    const data: any = await res.json();
    const isNewVisitor = data[0]?.result === 1;
    const rawTotal = parseInt(data[1]?.result || '0', 10);
    const count = typeof data[2]?.result === 'number' ? data[2].result : 0;
    const totalVisits = Number.isFinite(rawTotal) ? Math.max(rawTotal, count) : count;

    return { count, totalVisits, isNewVisitor };
  } catch (err) {
    console.warn('Redis visitor recording error:', err);
    return null;
  }
}

app.get('/api/visitors/count', async (req, res) => {
  const redisData = await queryRedisVisitors();
  if (redisData) {
    return res.json({ status: 'ok', count: redisData.count, totalVisits: redisData.totalVisits });
  }

  const local = getLocalVisitors();
  const count = local.unique.size;
  const totalVisits = Math.max(local.totalVisits, count);
  return res.json({ status: 'ok', count, totalVisits });
});

app.post('/api/visitors/record', async (req, res) => {
  let visitorId = typeof req.body?.visitorId === 'string' ? req.body.visitorId.trim() : '';
  const isNewSession = Boolean(req.body?.isNewSession);

  // Validate or assign unique visitor identifier
  if (!visitorId || !/^cv_[a-zA-Z0-9_-]{8,64}$/.test(visitorId)) {
    visitorId = `cv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
  }

  const redisResult = await recordRedisVisitor(visitorId, isNewSession);
  if (redisResult) {
    return res.json({
      status: 'ok',
      visitorId,
      count: redisResult.count,
      totalVisits: redisResult.totalVisits,
      isNewVisitor: redisResult.isNewVisitor,
    });
  }

  // Local durable fallback if cloud database is unreachable
  const local = getLocalVisitors();
  const isNewVisitor = !local.unique.has(visitorId);
  local.unique.add(visitorId);
  if (isNewSession) {
    local.totalVisits += 1;
  }
  const count = local.unique.size;
  const totalVisits = Math.max(local.totalVisits, count);
  saveLocalVisitors(local.unique, totalVisits);

  return res.json({
    status: 'ok',
    visitorId,
    count,
    totalVisits,
    isNewVisitor,
  });
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
