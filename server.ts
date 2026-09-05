import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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
// Tamper-Proof Atomic Visitor Tracker (Upstash Redis)
// Server-signed HttpOnly cookies • Redis Lua atomic transaction • Zero client trust
// ==========================================
const VISITOR_COOKIE_NAME = 'cv_vtoken';
const SIGNING_SECRET = process.env.VISITOR_SIGNING_SECRET || process.env.UPSTASH_REDIS_REST_TOKEN || 'cinevault_secure_signing_salt_2026';
const SESSION_TTL_SECONDS = 1800; // 30-minute rolling session window

// In-memory rate limiting and bot filtering
const ipRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isBotUserAgent(ua: string): boolean {
  if (!ua) return true;
  const botRegex = /bot|crawl|spider|slurp|curl|wget|python|postman|lighthouse|headless|facebookexternalhit|whatsapp|telegram|discordbot|bingbot|googlebot/i;
  return botRegex.test(ua);
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    ipRateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (entry.count >= 20) {
    return false; // Max 20 record requests per minute per IP
  }
  entry.count += 1;
  return true;
}

// Clean up stale rate limits every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRateLimitMap.entries()) {
    if (now > entry.resetTime) ipRateLimitMap.delete(ip);
  }
}, 300000);

function signVisitorId(id: string): string {
  const hmac = crypto.createHmac('sha256', SIGNING_SECRET).update(id).digest('hex').substring(0, 24);
  return `${id}.${hmac}`;
}

function verifyVisitorToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [id, signature] = parts;
  if (!id || !signature || !/^cv_[a-zA-Z0-9_-]{12,64}$/.test(id)) return null;

  const expectedHmac = crypto.createHmac('sha256', SIGNING_SECRET).update(id).digest('hex').substring(0, 24);
  const sigBuf = Buffer.from(signature, 'utf-8');
  const expBuf = Buffer.from(expectedHmac, 'utf-8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  return id;
}

function parseCookies(req: express.Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const cookies: Record<string, string> = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const key = pair.substring(0, idx).trim();
      const val = pair.substring(idx + 1).trim();
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  });
  return cookies;
}

function setVisitorCookie(req: express.Request, res: express.Response, signedToken: string) {
  // Max-age: 2 years (63072000s)
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const cookieParts = [
    `${VISITOR_COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
    'Path=/',
    'Max-Age=63072000',
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (isHttps) {
    cookieParts.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

// Atomic Redis Lua script
const ATOMIC_RECORD_LUA = `
local vid = ARGV[1]
local session_ttl = tonumber(ARGV[2])
local session_key = "cinevault:session:" .. vid

local is_new_visitor = redis.call("SADD", "cinevault:visitors:unique", vid)
local is_new_session = redis.call("SET", session_key, "1", "EX", session_ttl, "NX")

if is_new_session then
  redis.call("INCR", "cinevault:visitors:total")
end

local count = redis.call("SCARD", "cinevault:visitors:unique")
local total = redis.call("GET", "cinevault:visitors:total")

return { tostring(count), tostring(total or count), tostring(is_new_visitor), is_new_session and "1" or "0" }
`;

async function executeRedisAtomicRecord(
  visitorId: string
): Promise<{ count: number; totalVisits: number; isNewVisitor: boolean; isNewSession: boolean } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        'EVAL',
        ATOMIC_RECORD_LUA,
        0,
        visitorId,
        String(SESSION_TTL_SECONDS),
      ]),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      console.warn('Redis EVAL non-200 status:', res.status);
      return null;
    }

    const data: any = await res.json();
    if (data.error || !Array.isArray(data.result) || data.result.length < 4) {
      console.warn('Redis Lua script error:', data.error);
      return null;
    }

    const count = parseInt(data.result[0], 10) || 0;
    const totalVisits = parseInt(data.result[1], 10) || count;
    const isNewVisitor = data.result[2] === '1';
    const isNewSession = data.result[3] === '1';

    return { count, totalVisits, isNewVisitor, isNewSession };
  } catch (err) {
    console.warn('Redis atomic visitor transaction error:', err);
    return null;
  }
}

async function queryRedisReadOnly(): Promise<{ count: number; totalVisits: number } | null> {
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
    console.warn('Redis read-only visitor query error:', err);
    return null;
  }
}

// Local in-memory fallback ONLY for local development without Redis credentials
let localDevUnique = new Set<string>();
let localDevTotal = 0;

app.get('/api/visitors/count', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const redisData = await queryRedisReadOnly();
  if (redisData) {
    return res.json({
      status: 'ok',
      count: redisData.count,
      totalVisits: redisData.totalVisits,
      source: 'redis-atomic',
      timestamp: Date.now(),
    });
  }

  // If running in production / Vercel and Redis is unavailable, reject with 503 rather than corrupted local counts
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return res.status(503).json({
      status: 'error',
      message: 'Visitor count service temporarily unavailable',
    });
  }

  // Local development only fallback
  return res.json({
    status: 'ok',
    count: localDevUnique.size,
    totalVisits: Math.max(localDevTotal, localDevUnique.size),
    source: 'local-dev-memory',
    timestamp: Date.now(),
  });
});

app.post('/api/visitors/record', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const userAgent = req.headers['user-agent'] || '';
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  // 1. Bot & crawler filtering
  if (isBotUserAgent(userAgent)) {
    return res.status(403).json({ status: 'ignored', message: 'Automated crawler requests are not counted' });
  }

  // 2. IP-based rate limiting
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ status: 'rate_limited', message: 'Too many requests. Please slow down.' });
  }

  // 3. Authenticate or mint signed HttpOnly visitor token
  const cookies = parseCookies(req);
  const existingToken = cookies[VISITOR_COOKIE_NAME];
  let visitorId = verifyVisitorToken(existingToken);
  let isFreshCookie = false;

  if (!visitorId) {
    // Mint new server-generated cryptographically random identifier
    const entropy = crypto.randomBytes(16).toString('hex');
    const timeTag = Date.now().toString(36);
    visitorId = `cv_${timeTag}_${entropy}`;
    const signed = signVisitorId(visitorId);
    setVisitorCookie(req, res, signed);
    isFreshCookie = true;
  }

  // 4. Atomic Redis Execution
  const redisResult = await executeRedisAtomicRecord(visitorId);
  if (redisResult) {
    return res.json({
      status: 'ok',
      count: redisResult.count,
      totalVisits: redisResult.totalVisits,
      isNewVisitor: redisResult.isNewVisitor,
      isNewSession: redisResult.isNewSession,
      cookieIssued: isFreshCookie,
      source: 'redis-atomic',
      timestamp: Date.now(),
    });
  }

  // 5. Fail gracefully if Redis is unreachable in production
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return res.status(503).json({
      status: 'error',
      message: 'Visitor database temporarily unavailable',
    });
  }

  // Local development memory fallback
  const isNewVisitor = !localDevUnique.has(visitorId);
  localDevUnique.add(visitorId);
  localDevTotal += 1;

  return res.json({
    status: 'ok',
    count: localDevUnique.size,
    totalVisits: localDevTotal,
    isNewVisitor,
    isNewSession: true,
    source: 'local-dev-memory',
    timestamp: Date.now(),
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
