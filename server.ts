import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { buildMovieHtml, getMovieSlug, slugify, SITE_BASE_URL } from './src/utils/htmlBuilder.js';

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

// ==========================================
// CineBot AI Concierge (Gemini 3.8 Flash)
// ==========================================
let genAiClient: GoogleGenAI | null = null;
function getGenAi(): GoogleGenAI | null {
  if (!genAiClient && process.env.GEMINI_API_KEY) {
    try {
      genAiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (err) {
      console.error('[CineBot] Error initializing GoogleGenAI:', err);
    }
  }
  return genAiClient;
}

async function generateLocalCineBotResponse(prompt: string, context?: any): Promise<any> {
  const lower = prompt.toLowerCase();
  let queryTerm = '';
  let genre: string | null = null;
  let decade: string | null = null;
  let minRating: number | null = 7.5;
  let editorialPitch = '';

  if (lower.includes('magician') || lower.includes('bank heist') || lower.includes('now you see me') || lower.includes('magic')) {
    queryTerm = 'Now You See Me';
    editorialPitch = 'The film you are thinking of is **Now You See Me** (2013), directed by Louis Leterrier. It stars Jesse Eisenberg, Mark Ruffalo, Woody Harrelson, and Morgan Freeman as "The Four Horsemen," master illusionists who pull off high-stakes bank heists during their live spectacles.';
  } else if (lower.includes('cube') || lower.includes('geometric rooms') || lower.includes('trapped in rooms')) {
    queryTerm = 'Cube';
    editorialPitch = 'That sounds exactly like Vincenzo Natali’s cult 1997 psychological sci-fi thriller **Cube**. Strangers wake up trapped inside a lethal geometric labyrinth of puzzle rooms riddled with deadly booby traps.';
  } else if (lower.includes('island') && (lower.includes('detective') || lower.includes('memory') || lower.includes('asylum') || lower.includes('investigate'))) {
    queryTerm = 'Shutter Island';
    editorialPitch = 'You are remembering Martin Scorsese’s masterclass psychological thriller **Shutter Island** (2010). Leonardo DiCaprio stars as U.S. Marshal Teddy Daniels, sent to investigate a hospital for the criminally insane situated on a storm-lashed island.';
  } else if (lower.includes('dream') && (lower.includes('subconscious') || lower.includes('within a dream') || lower.includes('totem') || lower.includes('spinning top'))) {
    queryTerm = 'Inception';
    editorialPitch = 'That is Christopher Nolan’s landmark sci-fi heist masterpiece **Inception** (2010), starring Leonardo DiCaprio as Dom Cobb, an extractor who infiltrates the subconscious minds of targets.';
  } else if (lower.includes('mind-bending') || lower.includes('sci-fi') || lower.includes('twist') || lower.includes('space') || lower.includes('quantum')) {
    queryTerm = 'sci-fi';
    genre = 'Sci-Fi';
    editorialPitch = 'Mind-bending cinema thrives on reality-bending concepts, existential stakes, and sharp twists. Here are high-caliber cerebral films that deliver on that promise:';
  } else if (lower.includes('date night') || lower.includes('romance') || lower.includes('couple') || lower.includes('chemistry')) {
    queryTerm = 'romance';
    genre = 'Romance';
    editorialPitch = 'The key to great date-night viewing is effortless charm, sharp dialogue, and memorable character chemistry. These selections hit that sweet spot:';
  } else if (lower.includes('noir') || lower.includes('thriller') || lower.includes('detective') || lower.includes('crime') || lower.includes('rain') || lower.includes('mystery')) {
    queryTerm = 'thriller';
    genre = 'Thriller';
    minRating = 7.8;
    editorialPitch = 'Atmospheric crime and neo-noir movies captivate through stylish shadows, moody scores, and moral ambiguity. Here are riveting tension masterclasses:';
  } else if (lower.includes('action') || lower.includes('adrenaline') || lower.includes('fury') || lower.includes('stunt') || lower.includes('chase')) {
    queryTerm = 'action';
    genre = 'Action';
    editorialPitch = 'For pure visceral adrenaline, kinetic choreography and relentless momentum are king. Here are peak high-octane cinematic rides:';
  } else if (lower.includes('comedy') || lower.includes('funny') || lower.includes('laugh') || lower.includes('hilarious')) {
    queryTerm = 'comedy';
    genre = 'Comedy';
    editorialPitch = 'From razor-sharp satire to laugh-out-loud situational humor, these comedy standouts showcase impeccable comedic timing and high rewatchability:';
  } else if (lower.includes('horror') || lower.includes('scary') || lower.includes('dread') || lower.includes('creepy') || lower.includes('ghost')) {
    queryTerm = 'horror';
    genre = 'Horror';
    editorialPitch = 'True cinematic horror is built on creeping dread, sound design, and psychological vulnerability rather than simple jump scares. Check out these chilling picks:';
  } else {
    const cleaned = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !['movie', 'film', 'give', 'show', 'what', 'like', 'some', 'about', 'recommend', 'tell'].includes(w));
    queryTerm = cleaned.slice(0, 2).join(' ') || 'thriller';
    editorialPitch = `Exploring films that match your request for "${prompt.trim()}": here are acclaimed selections curated for rich storytelling and immersive direction:`;
  }

  let foundMovies: any[] = [];
  try {
    const apiRes = await fetchFromApi('list_movies.json', {
      query_term: queryTerm,
      limit: 3,
      sort_by: 'rating'
    });
    if (apiRes?.data?.movies && Array.isArray(apiRes.data.movies)) {
      foundMovies = apiRes.data.movies;
    }
  } catch (err) {
    // ignore
  }

  const suggestedMovies = foundMovies.map((m: any) => ({
    title: m.title_english || m.title,
    year: m.year,
    reason: `Rated ${m.rating}/10 on IMDb with memorable cinematography and direction.`,
    searchTerm: m.title_english || m.title,
    movieData: m
  }));

  return {
    reply: editorialPitch,
    suggestedMovies,
    recommendedFilters: {
      genre,
      minimum_rating: minRating,
      decade
    },
    followUpSuggestions: [
      `Show me more ${genre || 'acclaimed'} films with unexpected twists`,
      'What are the highest-rated films in this category?',
      'Give me something similar released before the year 2000'
    ]
  };
}

app.post('/api/cinebot/chat', async (req, res) => {
  const { message, history = [], context = {} } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ status: 'error', status_message: 'Message is required' });
  }

  const userPrompt = message.trim();
  const ai = getGenAi();

  if (ai) {
    try {
      const systemInstruction = `You are CineBot, CineVault's conversational AI movie concierge and resident film expert.
You possess deep, encyclopedic knowledge of cinema history, directors, screenplays, cinematographers, cult classics, hidden gems, and blockbusters.

Your core objectives:
1. Recommend 1 to 3 specific films directly addressing the user's mood, requested genre, theme, aesthetic, or plot fragment.
2. If the user describes a vague plot or forgotten scene, accurately identify the film title and year.
3. Answer movie questions with spoiler-free vibe checks, thematic insights, and content suitability.
4. Keep your commentary sharp, punchy, cinephile-savvy, and engaging (2 to 3 paragraphs max).
5. Always output STRICT, VALID JSON adhering to this exact schema:
{
  "reply": "Your conversational response in clean Markdown. Feel free to bold film titles like **Blade Runner 2049** and use bullet points where helpful.",
  "suggestedMovies": [
    {
      "title": "Exact Title of Movie",
      "year": 2017,
      "reason": "One punchy sentence explaining why this matches their request",
      "searchTerm": "Clean search title to look up in the catalog"
    }
  ],
  "recommendedFilters": {
    "genre": "Sci-Fi", // Optional: valid CineVault genre string or null
    "minimum_rating": 7.5, // Optional minimum rating number 1-9 or null
    "decade": "2010s" // Optional decade e.g. 1980s, 1990s, 2000s, 2010s, 2020s or null
  },
  "followUpSuggestions": [
    "Short natural follow-up prompt 1",
    "Short natural follow-up prompt 2",
    "Short natural follow-up prompt 3"
  ]
}`;

      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(history)) {
        for (const turn of history.slice(-6)) {
          if (turn.role === 'user' || turn.role === 'model') {
            contents.push({
              role: turn.role,
              parts: [{ text: String(turn.text || '') }]
            });
          }
        }
      }

      let contextualized = userPrompt;
      if (context && context.activeMovieTitle) {
        contextualized += `\n[Context: User is currently viewing "${context.activeMovieTitle}" (${context.activeMovieYear || ''}) - Genres: ${context.activeMovieGenres?.join(', ') || 'N/A'}]`;
      }

      contents.push({
        role: 'user',
        parts: [{ text: contextualized }]
      });

      const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
      let successfulModel: string | null = null;
      let rawText = '';

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.7,
            }
          });

          const text = response.text ? response.text.trim() : '';
          if (text) {
            rawText = text;
            successfulModel = modelName;
            break;
          }
        } catch (modelErr: any) {
          const status = modelErr?.status || modelErr?.code;
          const msg = modelErr?.message || String(modelErr);
          console.warn(`[CineBot] Model ${modelName} unavailable (${status || 'error'}: ${msg.slice(0, 100)}). Trying fallback model...`);
        }
      }

      let parsed: any = null;

      if (rawText) {
        try {
          parsed = JSON.parse(rawText);
        } catch (parseErr) {
          const cleaned = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
          try {
            parsed = JSON.parse(cleaned);
          } catch (cleanErr) {
            console.warn('[CineBot] JSON parse error from model response:', cleanErr);
          }
        }
      }

      if (parsed && parsed.reply) {
        // Enrich suggested movies with real catalog data from movie API
        if (Array.isArray(parsed.suggestedMovies) && parsed.suggestedMovies.length > 0) {
          const enriched = await Promise.all(
            parsed.suggestedMovies.slice(0, 4).map(async (item: any) => {
              try {
                const term = item.searchTerm || item.title;
                const searchRes = await fetchFromApi('list_movies.json', {
                  query_term: term,
                  limit: 2
                });
                const movies = searchRes?.data?.movies;
                if (Array.isArray(movies) && movies.length > 0) {
                  const match = movies.find((m: any) => item.year ? Math.abs(m.year - item.year) <= 1 : true) || movies[0];
                  return {
                    ...item,
                    movieData: match
                  };
                }
              } catch (enrichErr) {
                // Return original item without movieData if API query times out
              }
              return item;
            })
          );
          parsed.suggestedMovies = enriched;
        }

        return res.json({
          status: 'ok',
          source: successfulModel || 'gemini',
          ...parsed
        });
      }
    } catch (geminiError: any) {
      console.warn('[CineBot] All Gemini API models failed or returned invalid response, falling back to local cinema engine:', geminiError?.message || geminiError);
    }
  }

  // Fallback engine
  try {
    const fallbackResponse = await generateLocalCineBotResponse(userPrompt, context);
    return res.json({
      status: 'ok',
      source: 'cinevault-curated',
      ...fallbackResponse
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      status_message: 'CineBot was unable to process this request. Please try again.'
    });
  }
});

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
        signal: AbortSignal.timeout(6000)
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
            signal: AbortSignal.timeout(8000)
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
    } catch {
      // Graceful fallback to direct catalog index search when Wikidata times out or is temporarily slow
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

  // Graceful in-memory fallback if Redis is unconfigured or unavailable
  return res.json({
    status: 'ok',
    count: Math.max(localDevUnique.size, 1),
    totalVisits: Math.max(localDevTotal, localDevUnique.size, 1),
    source: 'in-memory',
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

  // 5. In-memory fallback if Redis is unconfigured or unreachable
  const isNewVisitor = !localDevUnique.has(visitorId);
  localDevUnique.add(visitorId);
  localDevTotal += 1;

  return res.json({
    status: 'ok',
    count: localDevUnique.size,
    totalVisits: localDevTotal,
    isNewVisitor,
    isNewSession: true,
    cookieIssued: isFreshCookie,
    source: 'in-memory',
    timestamp: Date.now(),
  });
});

app.get('/ads.txt', (req, res) => {
  res.redirect(301, 'https://srv.adstxtmanager.com/85131/cinevaultmovies.online');
});

app.get(['/privacy-policy', '/privacy'], (req, res) => {
  const indexPath = fs.existsSync(detectedIndexHtmlPath)
    ? detectedIndexHtmlPath
    : path.resolve(process.cwd(), 'index.html');
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf-8');
    html = html
      .replace(/<title>.*?<\/title>/, '<title>Privacy Policy — CineVault Movies</title>')
      .replace(
        /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
        '<meta name="description" content="Privacy Policy for CineVault Movies. Learn how we handle your data, our cookie usage, and Ezoic advertising compliance." />'
      );
    html = ensureEzoicProductionTags(html, (req.headers.host as string) || '', req.originalUrl);
    return res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
  }
  res.redirect('/');
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

    if (pathname === '/privacy-policy' || pathname === '/privacy') {
      return htmlTemplate
        .replace(/<title>.*?<\/title>/, '<title>Privacy Policy — CineVault Movies</title>')
        .replace(
          /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
          '<meta name="description" content="Privacy Policy for CineVault Movies. Learn how we handle your data, our cookie usage, and Ezoic advertising compliance." />'
        );
    }

    const movieMatch = pathname.match(/^\/movies\/([a-zA-Z0-9_-]+)$/);

    if (!movieMatch) return htmlTemplate;

    const slug = movieMatch[1].toLowerCase();
    const yearMatch = slug.match(/^(.*?)-(\d{4})$/);
    const targetYear = yearMatch ? parseInt(yearMatch[2], 10) : null;
    const queryTerm = yearMatch
      ? yearMatch[1].replace(/-/g, ' ')
      : slug.replace(/-/g, ' ');

    // SEO enhancement: query up to 20 candidates to accurately match the film
    const seoTimeoutMs = 2800;
    const seoPromise = fetchFromApi('list_movies.json', {
      query_term: queryTerm,
      limit: '20'
    });

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), seoTimeoutMs);
    });

    const listData = await Promise.race([seoPromise, timeoutPromise]);

    if (listData?.data?.movies?.length > 0) {
      const movies = listData.data.movies;

      // 1. Exact slug match
      let movie = movies.find((m: any) => 
        (m.slug && m.slug.toLowerCase() === slug) || 
        getMovieSlug(m).toLowerCase() === slug
      );

      // 2. Year and title match
      if (!movie && targetYear) {
        movie = movies.find((m: any) => m.year === targetYear && slugify(m.title) === slugify(yearMatch[1]));
        if (!movie) {
          movie = movies.find((m: any) => m.year === targetYear);
        }
      }

      // 3. Exact title match
      if (!movie) {
        movie = movies.find((m: any) => slugify(m.title) === slugify(queryTerm));
      }

      // 4. Fallback to first result
      if (!movie) {
        movie = movies[0];
      }

      const related = movies.filter((m: any) => m.id !== movie.id).slice(0, 4);

      try {
        return buildMovieHtml(htmlTemplate, movie, related, slug);
      } catch (error) {
        console.warn('Movie SEO HTML generation failed:', error);
      }
    }

    // Guarantee self-canonical for movie route even if upstream catalog API timed out
    const movieCanonical = `${SITE_BASE_URL}/movies/${slug}`;
    return htmlTemplate.replace(
      /<link\s+rel=["']canonical["'].*?>/gi,
      `<link rel="canonical" href="${movieCanonical}" />`
    );
  } catch (error) {
    console.warn('Dynamic SEO lookup skipped:', error);
  }

  // Always return the normal React application when SEO/API enhancement fails.
  return htmlTemplate;
}

// Ensure Ezoic scripts are delivered in the static HTML in the required order
function ensureEzoicProductionTags(html: string, reqHost: string = '', reqUrl: string = ''): string {
  // If html already contains sa.min.js, it is already wired directly in the template
  if (html.includes('sa.min.js')) {
    return html;
  }

  const isProdHost = reqHost.includes('cinevaultmovies.online');
  const isDebug = reqUrl.includes('ez_js_debugger=1') || reqUrl.includes('force_ezoic=1');

  if (isProdHost || isDebug) {
    const ezoicTags = `
    <script data-cfasync="false" src="https://cmp.gatekeeperconsent.com/min.js"></script>
    <script data-cfasync="false" src="https://the.gatekeeperconsent.com/cmp.min.js"></script>
    <script async src="//www.ezojs.com/ezoic/sa.min.js"></script>
    <script>
      window.ezstandalone = window.ezstandalone || {};
      ezstandalone.cmd = ezstandalone.cmd || [];
    </script>
    <script src="//ezoicanalytics.com/analytics.js"></script>`;
    return html.replace('<head>', `<head>\n${ezoicTags}`);
  }
  return html;
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
        let html = await injectDynamicMetaTags(template, req.originalUrl);
        html = ensureEzoicProductionTags(html, (req.headers.host as string) || '', req.originalUrl);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
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
        let html = await injectDynamicMetaTags(template, req.originalUrl);
        html = ensureEzoicProductionTags(html, (req.headers.host as string) || '', req.originalUrl);

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
