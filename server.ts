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
  const suggestedShows: any[] = [];

  // 1. Check for specific famous TV series queries
  if (lower.includes('loki')) {
    editorialPitch = 'Looking for **Loki**? The acclaimed Marvel Studios / Disney+ series stars Tom Hiddleston as the God of Mischief navigating the Time Variance Authority (TVA) across multiple timelines and realities. You can explore all seasons and episodes right here in CineVault!';
    const lokiShow = await resolveTvShowByTitle('Loki');
    if (lokiShow) {
      suggestedShows.push({
        title: 'Loki',
        year: 2021,
        reason: 'Masterclass timeline thriller following the God of Mischief inside the TVA multiverse.',
        searchTerm: 'Loki',
        imdb_code: 'tt9140554',
        showData: lokiShow
      });
    }
    queryTerm = 'Thor Ragnarok';
  } else if (lower.includes('dark') && (lower.includes('german') || lower.includes('time') || lower.includes('series') || lower.includes('show') || lower.includes('travel') || lower.includes('winden'))) {
    editorialPitch = 'That is Baran bo Odar’s mind-bending German sci-fi thriller series **Dark** (2017–2020) on Netflix. A missing child in the small town of Winden uncovers a four-generation time travel conspiracy across a 33-year cycle.';
    const darkShow = await resolveTvShowByTitle('Dark');
    if (darkShow) {
      suggestedShows.push({
        title: 'Dark',
        year: 2017,
        reason: 'Prestige German sci-fi masterpiece exploring four interconnected family trees across generational time loops.',
        searchTerm: 'Dark',
        imdb_code: 'tt5753856',
        showData: darkShow
      });
    }
  } else if (lower.includes('breaking bad') || lower.includes('walter white') || lower.includes('heisenberg')) {
    editorialPitch = 'You’re asking about Vince Gilligan’s acclaimed masterpiece **Breaking Bad** (2008–2013). High school chemistry teacher Walter White transforms into the ruthless methamphetamine kingpin Heisenberg.';
    const bbShow = await resolveTvShowByTitle('Breaking Bad');
    if (bbShow) {
      suggestedShows.push({
        title: 'Breaking Bad',
        year: 2008,
        reason: 'Legendary AMC crime saga tracking Walter White’s dark transformation from teacher to drug kingpin.',
        searchTerm: 'Breaking Bad',
        imdb_code: 'tt0903747',
        showData: bbShow
      });
    }
    queryTerm = 'El Camino: A Breaking Bad Movie';
  } else if (lower.includes('better call saul') || lower.includes('saul goodman') || lower.includes('jimmy mcgill')) {
    editorialPitch = 'That’s **Better Call Saul** (2015–2022), the extraordinary prequel and sequel to Breaking Bad tracking Jimmy McGill’s tragic metamorphosis into criminal defense attorney Saul Goodman.';
    const bcsShow = await resolveTvShowByTitle('Better Call Saul');
    if (bcsShow) {
      suggestedShows.push({
        title: 'Better Call Saul',
        year: 2015,
        reason: 'Vince Gilligan and Peter Gould’s poignant legal tragedy exploring the moral unraveling of Jimmy McGill.',
        searchTerm: 'Better Call Saul',
        imdb_code: 'tt3032476',
        showData: bcsShow
      });
    }
  } else if (lower.includes('stranger things') || lower.includes('upside down') || lower.includes('hawkins') || lower.includes('eleven')) {
    editorialPitch = 'You’re thinking of the Duffer Brothers’ nostalgic sci-fi hit **Stranger Things** (2016–present). When a young boy vanishes in Hawkins, Indiana, his friends discover secret government experiments and the terrifying Upside Down.';
    const stShow = await resolveTvShowByTitle('Stranger Things');
    if (stShow) {
      suggestedShows.push({
        title: 'Stranger Things',
        year: 2016,
        reason: '80s Spielbergian sci-fi horror adventure following a group of kids uncovering supernatural government mysteries.',
        searchTerm: 'Stranger Things',
        imdb_code: 'tt4574334',
        showData: stShow
      });
    }
  } else if (lower.includes('severance') || lower.includes('lumon')) {
    editorialPitch = 'That’s Dan Erickson and Ben Stiller’s critically acclaimed psychological workplace thriller **Severance** on Apple TV+. Employees undergo a surgical procedure separating their work memories from their personal lives.';
    const sevShow = await resolveTvShowByTitle('Severance');
    if (sevShow) {
      suggestedShows.push({
        title: 'Severance',
        year: 2022,
        reason: 'Dystopian corporate mystery following employees whose memories are surgically bifurcated between home and work.',
        searchTerm: 'Severance',
        imdb_code: 'tt11280740',
        showData: sevShow
      });
    }
  } else if (lower.includes('the boys') || lower.includes('homelander') || lower.includes('billy butcher')) {
    editorialPitch = 'You’re referring to Eric Kripke’s subversive superhero satire **The Boys** on Prime Video. A vigilante group fights back against corrupt corporate superheroes managed by Vought International.';
    const boysShow = await resolveTvShowByTitle('The Boys');
    if (boysShow) {
      suggestedShows.push({
        title: 'The Boys',
        year: 2019,
        reason: 'Brutal, razor-sharp satire following non-powered vigilantes taking on corrupt corporate superheroes.',
        searchTerm: 'The Boys',
        imdb_code: 'tt1190634',
        showData: boysShow
      });
    }
  } else if (lower.includes('game of thrones') || lower.includes('house of the dragon') || lower.includes('westeros') || lower.includes('targaryen')) {
    editorialPitch = 'Exploring the epic fantasy realms of Westeros? Here are HBO’s flagship saga **House of the Dragon** and **Game of Thrones**, chronicling dynastic civil wars, dragons, and royal intrigue.';
    const hotdShow = await resolveTvShowByTitle('House of the Dragon');
    if (hotdShow) {
      suggestedShows.push({
        title: 'House of the Dragon',
        year: 2022,
        reason: 'The Dance of the Dragons Targaryen civil war featuring epic dragon warfare and royal betrayal.',
        searchTerm: 'House of the Dragon',
        imdb_code: 'tt11198330',
        showData: hotdShow
      });
    }
  } else if (lower.includes('fallout') && (lower.includes('vault') || lower.includes('wasteland') || lower.includes('lucy') || lower.includes('ghoul') || lower.includes('series') || lower.includes('show'))) {
    editorialPitch = 'You’re asking about Jonathan Nolan and Lisa Joy’s acclaimed Prime Video adaptation of **Fallout** (2024). Lucy leaves Vault 33 to brave the retro-futuristic nuclear wasteland of post-apocalyptic Los Angeles.';
    const falloutShow = await resolveTvShowByTitle('Fallout');
    if (falloutShow) {
      suggestedShows.push({
        title: 'Fallout',
        year: 2024,
        reason: 'Darkly humorous post-apocalyptic saga exploring the irradiated wasteland of 2296 Los Angeles.',
        searchTerm: 'Fallout',
        imdb_code: 'tt12637874',
        showData: falloutShow
      });
    }
  } else if (lower.includes('the bear') || lower.includes('carmy') || lower.includes('chicago beef')) {
    editorialPitch = 'That’s Christopher Storer’s high-stress, Emmy-winning culinary drama **The Bear** on FX/Hulu. Fine-dining chef Carmen "Carmy" Berzatto returns home to Chicago to run his family’s Italian beef sandwich shop.';
    const bearShow = await resolveTvShowByTitle('The Bear');
    if (bearShow) {
      suggestedShows.push({
        title: 'The Bear',
        year: 2022,
        reason: 'Relentless, emotional pressure-cooker kitchen drama tracking fine-dining chef Carmy Berzatto.',
        searchTerm: 'The Bear',
        imdb_code: 'tt14452776',
        showData: bearShow
      });
    }
  } else if (lower.includes('the last of us') || lower.includes('cordyceps') || (lower.includes('joel') && lower.includes('ellie'))) {
    editorialPitch = 'That is Craig Mazin and Neil Druckmann’s acclaimed HBO adaptation of **The Last of Us** (2023). Hardened survivor Joel is tasked with escorting 14-year-old Ellie across a fungus-ravaged post-apocalyptic United States.';
    const tlouShow = await resolveTvShowByTitle('The Last of Us');
    if (tlouShow) {
      suggestedShows.push({
        title: 'The Last of Us',
        year: 2023,
        reason: 'Emotionally devastating post-apocalyptic drama following Joel and Ellie across a ruined America.',
        searchTerm: 'The Last of Us',
        imdb_code: 'tt3581920',
        showData: tlouShow
      });
    }
  } else if (lower.includes('succession') || lower.includes('logan roy') || lower.includes('waystar')) {
    editorialPitch = 'That is Jesse Armstrong’s razor-sharp HBO satirical drama **Succession** (2018–2023). The Machiavellian children of media titan Logan Roy vie for control of Waystar RoyCo.';
    const succShow = await resolveTvShowByTitle('Succession');
    if (succShow) {
      suggestedShows.push({
        title: 'Succession',
        year: 2018,
        reason: 'Brilliant Shakespearean satire tracking the ruthless power struggles of the billionaire Roy dynasty.',
        searchTerm: 'Succession',
        imdb_code: 'tt7660850',
        showData: succShow
      });
    }
  }

  // 2. Generic TV detection or searching TV series by candidate title
  const isTvOriented = lower.includes('tv') || 
    lower.includes('series') || 
    lower.includes('show') || 
    lower.includes('shows') || 
    lower.includes('season') || 
    lower.includes('episode') || 
    lower.includes('binge');

  if (suggestedShows.length === 0 && (isTvOriented || prompt.trim().split(/\s+/).length <= 4)) {
    const candidateName = prompt
      .replace(/\b(tv|television|series|shows?|episodes?|seasons?|watch|stream|find|recommend|search|about|like|best)\b/gi, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();

    if (candidateName.length >= 2) {
      try {
        const foundShow = await resolveTvShowByTitle(candidateName);
        if (foundShow && foundShow.name) {
          suggestedShows.push({
            title: foundShow.name,
            year: foundShow.year ? parseInt(foundShow.year, 10) : undefined,
            reason: foundShow.summary ? foundShow.summary.slice(0, 140) + '...' : `Acclaimed TV series rated ${foundShow.rating ? foundShow.rating + '/10' : 'high'} on IMDb.`,
            searchTerm: foundShow.name,
            imdb_code: foundShow.imdb_code,
            showData: foundShow
          });
          if (!editorialPitch) {
            editorialPitch = `Found TV series **${foundShow.name}**${foundShow.year ? ` (${foundShow.year})` : ''} on ${foundShow.network || 'television'}. You can explore episodes, seasons, and torrent releases directly in CineVault:`;
          }
        }
      } catch {}
    }
  }

  if (!editorialPitch) {
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
      const cleaned = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !['movie', 'film', 'give', 'show', 'what', 'like', 'some', 'about', 'recommend', 'tell', 'series'].includes(w));
      queryTerm = cleaned.slice(0, 2).join(' ') || 'thriller';
      editorialPitch = `Exploring titles that match your request for "${prompt.trim()}": here are acclaimed selections curated for rich storytelling and immersive direction:`;
    }
  }

  let foundMovies: any[] = [];
  if (queryTerm || suggestedShows.length === 0) {
    try {
      const apiRes = await fetchFromApi('list_movies.json', {
        query_term: queryTerm || 'acclaimed',
        limit: 3,
        sort_by: 'rating'
      });
      if (apiRes?.data?.movies && Array.isArray(apiRes.data.movies)) {
        foundMovies = apiRes.data.movies;
      }
    } catch (err) {
      // ignore
    }
  }

  const suggestedMovies = foundMovies.map((m: any) => ({
    title: m.title_english || m.title,
    year: m.year,
    reason: `Rated ${m.rating}/10 on IMDb with memorable cinematography and direction.`,
    searchTerm: m.title_english || m.title,
    movieData: m
  }));

  const followUpSuggestions = suggestedShows.length > 0
    ? [
        `Show me all seasons and episodes for ${suggestedShows[0].title}`,
        `What are the best TV series similar to ${suggestedShows[0].title}?`,
        'Recommend acclaimed movies with similar vibe'
      ]
    : [
        `Show me more ${genre || 'acclaimed'} titles with unexpected twists`,
        'What are the highest-rated titles in this category?',
        'Give me something similar released before the year 2000'
      ];

  return {
    reply: editorialPitch,
    suggestedMovies,
    suggestedShows,
    recommendedFilters: {
      genre,
      minimum_rating: minRating,
      decade,
      format: suggestedShows.length > 0 ? 'tv' : 'movie'
    },
    followUpSuggestions
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
      const systemInstruction = `You are CineBot, CineVault's conversational AI concierge and expert in both cinema and television series.
You possess deep, encyclopedic knowledge of cinema history, directors, screenplays, cinematographers, cult classics, and blockbusters, AS WELL AS prestige television series across all networks and platforms (HBO, Netflix, Apple TV+, AMC, BBC, Disney+, Showtime, Prime Video, FX, Hulu, etc.).

CineVault features BOTH a complete Movie catalog (powered by YTS) AND a Television Series catalog (powered by TVmaze and EZTV with full episode guides, season torrents, and playback).

Your core objectives:
1. Understand whether the user is asking about a TV series, a movie, or both:
   - If the user explicitly asks for TV series (e.g., "TV series", "shows", "shows like Dark", "best comedy show", "binge-worthy series"), or queries a famous TV series (e.g., "Loki", "Dark", "Breaking Bad", "Stranger Things", "Severance", "The Bear", "Fallout", "House of the Dragon", "The Boys", "Game of Thrones", "Shogun", "The Last of Us", "Succession", "True Detective", "Peaky Blinders"), you MUST recommend the relevant TV series in the "suggestedShows" array!
   - If the query could refer to both a TV show and related movies (like "Loki", which is a standalone TV series and also appears in Thor films), include the TV series in "suggestedShows" AND any relevant films in "suggestedMovies".
   - If the user asks for a movie or cinema vibe, recommend films in the "suggestedMovies" array.
2. If the user describes a vague plot or forgotten scene from a movie OR television series, accurately identify whether it is a film or TV show, and provide the exact title and year.
3. Answer movie and TV questions with spoiler-free vibe checks, thematic insights, season highlights, and content suitability.
4. Keep your commentary sharp, punchy, cinephile-savvy, and engaging (2 to 3 paragraphs max).
5. Always output STRICT, VALID JSON adhering to this exact schema:
{
  "reply": "Your conversational response in clean Markdown. Feel free to bold titles like **Loki** or **Blade Runner 2049** and use bullet points where helpful.",
  "suggestedMovies": [
    {
      "title": "Exact Title of Movie",
      "year": 2017,
      "reason": "One punchy sentence explaining why this matches their request",
      "searchTerm": "Clean search title to look up in the catalog"
    }
  ],
  "suggestedShows": [
    {
      "title": "Exact Title of TV Show",
      "year": 2021,
      "reason": "One punchy sentence explaining why this series matches their request",
      "searchTerm": "Clean show title to look up on TVmaze",
      "imdb_code": "tt9140554" // Optional IMDb tt ID if known
    }
  ],
  "recommendedFilters": {
    "genre": "Sci-Fi", // Optional: valid CineVault genre string or null
    "minimum_rating": 7.5, // Optional minimum rating number 1-9 or null
    "decade": "2020s" // Optional decade e.g. 1980s, 1990s, 2000s, 2010s, 2020s or null
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
        contextualized += `\n[Context: User is currently viewing movie "${context.activeMovieTitle}" (${context.activeMovieYear || ''}) - Genres: ${context.activeMovieGenres?.join(', ') || 'N/A'}]`;
      }
      if (context && context.activeSeriesTitle) {
        contextualized += `\n[Context: User is currently viewing TV series "${context.activeSeriesTitle}" (IMDb: ${context.activeSeriesImdb || 'N/A'})]`;
      }

      contents.push({
        role: 'user',
        parts: [{ text: contextualized }]
      });

      const CANDIDATE_MODELS = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let successfulModel: string | null = null;
      let rawText = '';

      for (const modelName of CANDIDATE_MODELS) {
        // Attempt generation with quick retry on transient 503 capacity spikes
        for (let attempt = 0; attempt < 2; attempt++) {
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
            const isTransient = status === 503 || status === 429 || String(modelErr?.message || '').includes('high demand');
            if (isTransient && attempt === 0) {
              // Quick backoff for temporary capacity spike
              await new Promise((resolve) => setTimeout(resolve, 350));
              continue;
            }
            // Move to next candidate model smoothly without noisy warning
            break;
          }
        }
        if (rawText) break;
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
        // 1. Enrich suggested movies with real catalog data from movie API
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

        // 2. Enrich suggested TV series with real catalog data from TVmaze
        if (Array.isArray(parsed.suggestedShows) && parsed.suggestedShows.length > 0) {
          const enrichedShows = await Promise.all(
            parsed.suggestedShows.slice(0, 4).map(async (item: any) => {
              try {
                const term = item.searchTerm || item.title;
                let showData: any = null;
                if (item.imdb_code) {
                  try {
                    const lookupRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${item.imdb_code}`, {
                      headers: { 'Accept': 'application/json' },
                      redirect: 'follow',
                      signal: AbortSignal.timeout(4500)
                    });
                    if (lookupRes.ok) {
                      const raw = await lookupRes.json();
                      showData = {
                        id: raw.id,
                        name: raw.name || item.title,
                        imdb_code: item.imdb_code,
                        imdb_id: item.imdb_code.replace(/^tt/i, ''),
                        year: raw.premiered ? raw.premiered.slice(0, 4) : String(item.year || ''),
                        rating: raw.rating?.average || undefined,
                        image: raw.image?.medium || raw.image?.original || undefined,
                        summary: raw.summary ? raw.summary.replace(/<[^>]*>?/gm, '').trim() : undefined,
                        genres: raw.genres || [],
                        network: raw.network?.name || raw.webChannel?.name || undefined
                      };
                    }
                  } catch {}
                }
                if (!showData) {
                  const resolved = await resolveTvShowByTitle(term);
                  if (resolved) {
                    showData = resolved;
                  }
                }
                if (showData) {
                  return {
                    ...item,
                    year: item.year || (showData.year ? parseInt(showData.year, 10) : undefined),
                    imdb_code: showData.imdb_code || item.imdb_code,
                    showData
                  };
                }
              } catch (showErr) {
                // keep original item
              }
              return item;
            })
          );
          parsed.suggestedShows = enrichedShows;
        }

        return res.json({
          status: 'ok',
          source: successfulModel || 'gemini',
          ...parsed
        });
      }
    } catch (geminiError: any) {
      console.info('[CineBot] AI model service momentarily busy, using curated cinema engine:', geminiError?.message || geminiError);
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

// ==========================================
// EZTV API PROXY & RESOLVER (https://eztvx.to/api/get-torrents)
// ==========================================
let EZTV_API_MIRRORS = [
  'https://eztvx.to/api/get-torrents',
  'https://eztv.wf/api/get-torrents',
  'https://eztv.tf/api/get-torrents',
  'https://eztv.yt/api/get-torrents',
  'https://eztv.li/api/get-torrents',
  'https://eztv.ag/api/get-torrents',
  'https://eztv.re/api/get-torrents'
];

// Persistent in-memory fallback snapshot for general releases
let eztvGeneralFallbackSnapshot: any = null;

async function fetchEztvFromMirrors(params: Record<string, string>): Promise<any> {
  const queryString = new URLSearchParams(params).toString();
  const cacheKey = `eztv:${queryString}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
    return cached.data;
  }

  let lastError: any = null;
  for (let i = 0; i < EZTV_API_MIRRORS.length; i++) {
    const mirror = EZTV_API_MIRRORS[i];
    const targetUrl = `${mirror}?${queryString}`;
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const json = await response.json();
        if (json && typeof json === 'object' && Array.isArray(json.torrents)) {
          cache.set(cacheKey, { timestamp: Date.now(), data: json });
          // Save general snapshot if not a specific IMDb search
          if (!params.imdb_id && json.torrents.length > 0) {
            eztvGeneralFallbackSnapshot = json;
          }
          // Prioritize fastest responding mirror for future requests
          if (i > 0) {
            EZTV_API_MIRRORS.splice(i, 1);
            EZTV_API_MIRRORS.unshift(mirror);
          }
          return json;
        }
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // If general browse query failed, fallback to snapshot if available
  if (!params.imdb_id && eztvGeneralFallbackSnapshot) {
    console.warn('EZTV mirrors unreachable, returning fallback snapshot.');
    return eztvGeneralFallbackSnapshot;
  }

  // If stale cached data exists for this key, return it as emergency fallback
  if (cached && cached.data) {
    console.warn('Returning stale cached EZTV data.');
    return cached.data;
  }

  throw lastError || new Error('All EZTV mirrors failed to respond.');
}

interface ShowSearchResult {
  id?: number;
  name: string;
  imdb_id: string; // digits only
  imdb_code: string; // with tt
  year?: string;
  rating?: number;
  image?: string;
  summary?: string;
  genres?: string[];
  network?: string;
}

// Helper to strip season, episode, quality tags from raw show search query
function extractShowSearch(raw: string): { cleanedTitle: string; season?: number; episode?: number } {
  let cleaned = raw.trim();
  let season: number | undefined;
  let episode: number | undefined;

  const seMatch = cleaned.match(/\bS(\d{1,2})(?:E(\d{1,2}))?\b/i);
  if (seMatch) {
    season = parseInt(seMatch[1], 10);
    if (seMatch[2]) episode = parseInt(seMatch[2], 10);
    cleaned = cleaned.replace(seMatch[0], ' ').trim();
  } else {
    const seasonMatch = cleaned.match(/\bseason\s*(\d{1,2})\b/i);
    if (seasonMatch) {
      season = parseInt(seasonMatch[1], 10);
      cleaned = cleaned.replace(seasonMatch[0], ' ').trim();
    }
    const epMatch = cleaned.match(/\bepisode\s*(\d{1,2})\b/i);
    if (epMatch) {
      episode = parseInt(epMatch[1], 10);
      cleaned = cleaned.replace(epMatch[0], ' ').trim();
    }
  }

  // Remove common quality / codec terms from show search
  cleaned = cleaned.replace(/\b(1080p|720p|2160p|4k|uhd|hevc|x265|x264|web-?dl|webrip|hdtv|bluray|complete|repack)\b/gi, ' ').trim();
  // Remove trailing and leading punctuation / spaces
  cleaned = cleaned.replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').replace(/\s+/g, ' ').trim();

  return { cleanedTitle: cleaned || raw.trim(), season, episode };
}

// Clean TV Series Name and extract Year from raw EZTV release title
export function extractShowTitleAndYear(rawTitle: string): { title: string; year?: string } {
  if (!rawTitle) return { title: '', year: undefined };
  let cleaned = rawTitle;

  // Cut off at S01E01, S01, Season 1, etc.
  cleaned = cleaned.replace(/\bS\d{1,2}(?:E\d{1,2})?\b.*$/i, '');
  cleaned = cleaned.replace(/\bseason\s*\d{1,2}\b.*$/i, '');
  cleaned = cleaned.replace(/\bepisode\s*\d{1,2}\b.*$/i, '');

  // Cut off common release tags and scene group names
  cleaned = cleaned.replace(/\b(1080p|720p|2160p|4k|uhd|hevc|x265|x264|web-?dl|webrip|hdtv|bluray|eztv|xvid|afg|megusta|msd)\b.*$/gi, '');

  // Replace dots, underscores with spaces
  cleaned = cleaned.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract year if present at the end: e.g. "Dark Matter 2024" or "Dark Matter (2024)"
  let year: string | undefined;
  const yearMatch = cleaned.match(/\s+(?:\()?((?:19|20)\d{2})(?:\))?$/);
  if (yearMatch) {
    year = yearMatch[1];
    cleaned = cleaned.replace(yearMatch[0], '').trim();
  }

  return { title: cleaned || rawTitle, year };
}

export function extractShowTitleFromRelease(rawTitle: string): string {
  return extractShowTitleAndYear(rawTitle).title;
}

// Resolve TV show title to IMDb ID via TVmaze (primary) with Wikidata fallback
async function resolveTvShowByTitle(rawTitle: string): Promise<ShowSearchResult | null> {
  const cleanTitle = rawTitle.trim();
  if (!cleanTitle) return null;

  const cacheKey = `tv_show_resolve:${cleanTitle.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 3600000) return cached.data as ShowSearchResult;

  const { cleanedTitle } = extractShowSearch(cleanTitle);

  // 1. Try TVmaze API
  try {
    const queriesToTry = [cleanedTitle];
    if (cleanedTitle.toLowerCase() !== cleanTitle.toLowerCase()) {
      queriesToTry.push(cleanTitle);
    }

    for (const q of queriesToTry) {
      const tvmazeUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`;
      const res = await fetch(tvmazeUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4500)
      });
      if (res.ok) {
        const items: any[] = await res.json();
        for (const item of items) {
          const show = item?.show;
          const rawImdb = show?.externals?.imdb;
          // Must start with tt followed by 5-9 digits
          if (rawImdb && typeof rawImdb === 'string' && /^tt\d{5,9}$/i.test(rawImdb)) {
            const digits = rawImdb.replace(/^tt/i, '');
            const result: ShowSearchResult = {
              id: show.id,
              name: show.name || cleanTitle,
              imdb_id: digits,
              imdb_code: rawImdb,
              year: show.premiered ? show.premiered.slice(0, 4) : undefined,
              rating: show.rating?.average || undefined,
              image: show.image?.medium || show.image?.original || undefined,
              summary: show.summary ? show.summary.replace(/<[^>]*>?/gm, '').trim() : undefined,
              genres: show.genres || [],
              network: show.network?.name || show.webChannel?.name || undefined
            };
            cache.set(cacheKey, { timestamp: Date.now(), data: result });
            return result;
          }
        }
      }
    }
  } catch (err: any) {
    if (err?.name !== 'TimeoutError' && err?.name !== 'AbortError') {
      console.warn('TVmaze resolution notice:', err?.message || err);
    }
  }

  // 2. Fallback to Wikidata
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(cleanedTitle)}&type=item&language=en&limit=10&format=json`;
    const sRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'CineVault/1.0 (https://cinevault.app; contact@cinevault.app)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(4500)
    });
    if (sRes.ok) {
      const sData: any = await sRes.json();
      const entities = sData?.search || [];
      const prioritized = [...entities].sort((a, b) => {
        const aDesc = (a.description || '').toLowerCase();
        const bDesc = (b.description || '').toLowerCase();
        const aIsTv = /television|series|show|serial|drama|sitcom|anime|broadcast/.test(aDesc);
        const bIsTv = /television|series|show|serial|drama|sitcom|anime|broadcast/.test(bDesc);
        if (aIsTv && !bIsTv) return -1;
        if (!aIsTv && bIsTv) return 1;
        return 0;
      });

      const targetIds = prioritized.slice(0, 5).map((e: any) => e.id).filter(Boolean);
      if (targetIds.length > 0) {
        const entUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${targetIds.join('|')}&props=claims&format=json`;
        const eRes = await fetch(entUrl, {
          headers: {
            'User-Agent': 'CineVault/1.0 (https://cinevault.app; contact@cinevault.app)',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(4500)
        });
        if (eRes.ok) {
          const eData: any = await eRes.json();
          for (const candId of targetIds) {
            const p345Claims = eData?.entities?.[candId]?.claims?.P345;
            if (Array.isArray(p345Claims)) {
              for (const claim of p345Claims) {
                const imdbCode = claim?.mainsnak?.datavalue?.value;
                if (imdbCode && typeof imdbCode === 'string' && /^tt\d{5,9}$/i.test(imdbCode)) {
                  const digits = imdbCode.replace(/^tt/i, '');
                  const matchedEntity = entities.find((e: any) => e.id === candId);
                  const result: ShowSearchResult = {
                    name: matchedEntity?.label || cleanTitle,
                    imdb_id: digits,
                    imdb_code: imdbCode,
                    summary: matchedEntity?.description || undefined
                  };
                  cache.set(cacheKey, { timestamp: Date.now(), data: result });
                  return result;
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Wikidata fallback resolution error:', err);
  }

  return null;
}

// ==========================================
// OFFICIAL POSTER RESOLVER (IMDb & TVmaze CDN)
// Guarantees authentic original theatrical artwork for any movie or TV series
// ==========================================
interface ResolvedPoster {
  poster: string;
  width?: number;
  height?: number;
  source: string;
}

const posterCache = new Map<string, { timestamp: number; data: ResolvedPoster }>();
const POSTER_CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 Hours

export async function resolveOfficialPoster(params: {
  imdb?: string;
  title?: string;
  year?: string | number;
  type?: 'movie' | 'tv' | 'all';
}): Promise<ResolvedPoster | null> {
  const imdbCode = params.imdb ? (params.imdb.startsWith('tt') ? params.imdb : `tt${params.imdb}`) : '';
  const cleanTitle = (params.title || '').trim();
  const yearNum = params.year ? parseInt(String(params.year), 10) : undefined;
  const isTv = params.type === 'tv';

  const cacheKey = `poster:${imdbCode || cleanTitle.toLowerCase()}:${yearNum || ''}:${params.type || 'all'}`;
  const cached = posterCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < POSTER_CACHE_TTL_MS) {
    return cached.data;
  }

  // 1. Primary: Official IMDb suggestion API by IMDb ID (Amazon CloudFront CDN)
  if (imdbCode && /^tt\d{5,9}$/i.test(imdbCode)) {
    try {
      const imdbRes = await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${imdbCode}.json`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (imdbRes.ok) {
        const json: any = await imdbRes.json();
        const item = json?.d?.[0];
        if (item?.i?.imageUrl) {
          const result: ResolvedPoster = {
            poster: item.i.imageUrl,
            width: item.i.width,
            height: item.i.height,
            source: 'imdb-official-id'
          };
          posterCache.set(cacheKey, { timestamp: Date.now(), data: result });
          return result;
        }
      }
    } catch {}

    // 2. Secondary for TV shows: TVmaze Lookup by IMDb ID
    if (isTv || !cleanTitle) {
      try {
        const tvmazeRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbCode}`, {
          headers: { 'Accept': 'application/json' },
          redirect: 'follow',
          signal: AbortSignal.timeout(4000)
        });
        if (tvmazeRes.ok) {
          const json: any = await tvmazeRes.json();
          const imgUrl = json?.image?.original || json?.image?.medium;
          if (imgUrl) {
            const result: ResolvedPoster = {
              poster: imgUrl,
              source: 'tvmaze-official'
            };
            posterCache.set(cacheKey, { timestamp: Date.now(), data: result });
            return result;
          }
        }
      } catch {}
    }
  }

  // 3. Official IMDb suggestion API by Title Search
  if (cleanTitle) {
    const { title: searchName, year: releaseYear } = extractShowTitleAndYear(cleanTitle);
    const targetYear = yearNum || (releaseYear ? parseInt(releaseYear, 10) : undefined);
    const slug = searchName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 32);
    const firstChar = slug[0] || 'a';

    try {
      const url = `https://v3.sg.media-imdb.com/suggestion/${firstChar}/${slug}.json`;
      const sRes = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (sRes.ok) {
        const sJson: any = await sRes.json();
        if (Array.isArray(sJson?.d)) {
          // Find matching item with an image, prioritizing year and title similarity
          const withImages = sJson.d.filter((it: any) => Boolean(it?.i?.imageUrl));
          let match = withImages.find((it: any) => {
            const yMatches = targetYear && it.y ? Math.abs(it.y - targetYear) <= 1 : true;
            const lMatches = it.l && it.l.toLowerCase().includes(searchName.toLowerCase());
            return yMatches && lMatches;
          });
          if (!match && targetYear) {
            match = withImages.find((it: any) => it.y && Math.abs(it.y - targetYear) <= 1);
          }
          if (!match) {
            match = withImages[0];
          }

          if (match?.i?.imageUrl) {
            const result: ResolvedPoster = {
              poster: match.i.imageUrl,
              width: match.i.width,
              height: match.i.height,
              source: 'imdb-official-title'
            };
            posterCache.set(cacheKey, { timestamp: Date.now(), data: result });
            return result;
          }
        }
      }
    } catch {}

    // 4. TVmaze Search by Title
    try {
      const tvRes = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(searchName)}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (tvRes.ok) {
        const tvList: any[] = await tvRes.json();
        // If targetYear is provided, look for matching year first
        let matchedItem = tvList.find((item: any) => {
          if (!targetYear || !item?.show?.premiered) return false;
          const showYear = parseInt(item.show.premiered.slice(0, 4), 10);
          return Math.abs(showYear - targetYear) <= 1;
        }) || tvList[0];

        const imgUrl = matchedItem?.show?.image?.original || matchedItem?.show?.image?.medium;
        if (imgUrl) {
          const result: ResolvedPoster = {
            poster: imgUrl,
            source: 'tvmaze-title'
          };
          posterCache.set(cacheKey, { timestamp: Date.now(), data: result });
          return result;
        }
      }
    } catch {}
  }

  return null;
}

// Memory buffer cache for streamed official posters to guarantee instant CDN-level delivery
const posterBufferCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
const POSTER_BUFFER_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

// Default fallback SVG poster buffer when an image cannot be resolved
const CINEVAULT_FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1a0b12"/><stop offset="50%" stop-color="#0f0f14"/><stop offset="100%" stop-color="#050508"/></linearGradient><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#e11d48"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><rect width="500" height="750" fill="url(#g)"/><rect x="20" y="20" width="460" height="710" rx="20" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/><circle cx="250" cy="300" r="70" fill="rgba(225,29,72,0.12)" stroke="rgba(225,29,72,0.4)" stroke-width="3"/><path d="M225 260 L295 300 L225 340 Z" fill="url(#rg)"/><text x="250" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">CINEVAULT</text><text x="250" y="475" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#f43f5e" text-anchor="middle" letter-spacing="4">ORIGINAL POSTER</text><text x="250" y="520" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="rgba(255,255,255,0.4)" text-anchor="middle">HD CATALOG &amp; RELEASES</text></svg>`;

// Endpoint to fetch or stream official movie/TV posters
app.get(['/api/poster', '/api/movies/poster', '/api/tv/poster'], async (req, res) => {
  const imdb = typeof req.query.imdb === 'string' ? req.query.imdb.trim() : (typeof req.query.imdb_id === 'string' ? req.query.imdb_id.trim() : '');
  const title = typeof req.query.title === 'string' ? req.query.title.trim() : (typeof req.query.q === 'string' ? req.query.q.trim() : '');
  const year = typeof req.query.year === 'string' ? req.query.year.trim() : '';
  const type = req.query.type === 'tv' ? 'tv' : (req.query.type === 'movie' ? 'movie' : 'all');
  const size = typeof req.query.size === 'string' ? req.query.size.toLowerCase() : 'medium';
  const format = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : '';

  if (!imdb && !title) {
    return res.status(400).json({ status: 'error', status_message: 'imdb or title parameter is required' });
  }

  const result = await resolveOfficialPoster({ imdb, title, year, type });

  if (!result || !result.poster) {
    if (format === 'json') {
      return res.status(404).json({ status: 'not_found', message: 'Original poster could not be resolved' });
    }
    // Return SVG fallback directly with HTTP 200 so the browser never shows a broken icon
    res.set({
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'Access-Control-Allow-Origin': '*'
    });
    return res.send(CINEVAULT_FALLBACK_SVG);
  }

  let finalPosterUrl = result.poster;

  // Apply Amazon IMDb dynamic size modifier for optimal client delivery if applicable
  if (finalPosterUrl.includes('media-amazon.com')) {
    if (size === 'small') {
      finalPosterUrl = finalPosterUrl.replace(/\._V1_.*?\.jpg$/i, '._V1_FMjpg_UX320_.jpg');
    } else if (size === 'medium') {
      finalPosterUrl = finalPosterUrl.replace(/\._V1_.*?\.jpg$/i, '._V1_FMjpg_UX500_.jpg');
    } else if (size === 'large') {
      finalPosterUrl = finalPosterUrl.replace(/\._V1_.*?\.jpg$/i, '._V1_FMjpg_UX1000_.jpg');
    }
  }

  if (format === 'json') {
    return res.json({
      status: 'ok',
      poster: finalPosterUrl,
      original: result.poster,
      width: result.width,
      height: result.height,
      source: result.source
    });
  }

  // Stream directly from buffer cache if available for ultra-fast <1ms response
  const cachedImg = posterBufferCache.get(finalPosterUrl);
  if (cachedImg && Date.now() - cachedImg.timestamp < POSTER_BUFFER_TTL_MS) {
    res.set({
      'Content-Type': cachedImg.contentType,
      'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, immutable',
      'Access-Control-Allow-Origin': '*'
    });
    return res.send(cachedImg.buffer);
  }

  // Proxy-stream the image bytes from Amazon / TVmaze to bypass any client hotlinking / referrer restrictions
  try {
    const upstreamRes = await fetch(finalPosterUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': finalPosterUrl.includes('media-amazon.com') ? 'https://www.imdb.com/' : 'https://cinevaultmovies.online/'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (upstreamRes.ok) {
      const arrayBuf = await upstreamRes.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';

      if (posterBufferCache.size > 400) {
        const oldestKey = posterBufferCache.keys().next().value;
        if (oldestKey) posterBufferCache.delete(oldestKey);
      }

      posterBufferCache.set(finalPosterUrl, { buffer: buf, contentType, timestamp: Date.now() });

      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, immutable',
        'Access-Control-Allow-Origin': '*'
      });
      return res.send(buf);
    }
  } catch (proxyErr) {
    // If proxy fetch fails, fallback to 302 redirect
  }

  res.set({
    'Cache-Control': 'public, max-age=604800, s-maxage=604800, immutable',
    'Access-Control-Allow-Origin': '*'
  });

  return res.redirect(302, finalPosterUrl);
});

// Dedicated Proxy for external images & files to guarantee CORS-safe downloads & canvas rendering
const proxyFileCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();

app.get(['/api/image-proxy', '/api/proxy/image', '/api/download/proxy-image', '/api/download/proxy-file'], async (req, res) => {
  const targetUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).json({ status: 'error', message: 'Valid url query parameter is required' });
  }

  // Check in-memory cache (24 hours)
  const cached = proxyFileCache.get(targetUrl);
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    res.set({
      'Content-Type': cached.contentType,
      'Cache-Control': 'public, max-age=2592000, immutable',
      'Access-Control-Allow-Origin': '*'
    });
    return res.send(cached.buffer);
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': targetUrl.includes('yts') ? 'https://yts.gg/' : (targetUrl.includes('amazon') ? 'https://www.imdb.com/' : 'https://cinevaultmovies.online/')
      },
      signal: AbortSignal.timeout(10000)
    });

    if (upstreamRes.ok) {
      const arrayBuf = await upstreamRes.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      let contentType = upstreamRes.headers.get('content-type') || '';
      if (!contentType || contentType.includes('text/plain') || contentType.includes('application/octet-stream')) {
        if (targetUrl.endsWith('.png')) contentType = 'image/png';
        else if (targetUrl.endsWith('.webp')) contentType = 'image/webp';
        else if (targetUrl.endsWith('.torrent')) contentType = 'application/x-bittorrent';
        else contentType = 'image/jpeg';
      }

      if (proxyFileCache.size > 500) {
        const oldestKey = proxyFileCache.keys().next().value;
        if (oldestKey) proxyFileCache.delete(oldestKey);
      }

      proxyFileCache.set(targetUrl, { buffer: buf, contentType, timestamp: Date.now() });

      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=2592000, immutable',
        'Access-Control-Allow-Origin': '*'
      });
      return res.send(buf);
    }
  } catch (err) {
    console.warn(`[Proxy] Failed to fetch upstream url: ${targetUrl}`, err);
  }

  // If upstream is an image and failed, return fallback SVG
  if (req.path.includes('image')) {
    res.set({
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    return res.send(CINEVAULT_FALLBACK_SVG);
  }

  return res.status(502).json({ status: 'error', message: 'Failed to retrieve upstream resource' });
});

// TV show search & autocomplete endpoint
app.get(['/api/tv/shows', '/api/tv/search'], async (req, res) => {
  const rawQ = typeof req.query.q === 'string' ? req.query.q.trim() : (typeof req.query.query === 'string' ? req.query.query.trim() : '');
  if (!rawQ) {
    return res.json({ status: 'ok', shows: [] });
  }

  const { cleanedTitle } = extractShowSearch(rawQ);
  const cacheKey = `tv_autocomplete:${cleanedTitle.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return res.json({ status: 'ok', shows: cached.data });
  }

  try {
    const tvmazeUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(cleanedTitle)}`;
    const tvRes = await fetch(tvmazeUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (tvRes.ok) {
      const data: any[] = await tvRes.json();
      const shows: ShowSearchResult[] = data
        .filter((item) => {
          const rawImdb = item?.show?.externals?.imdb;
          return item?.show?.name && rawImdb && /^tt\d{5,9}$/i.test(rawImdb);
        })
        .map((item) => {
          const s = item.show;
          const imdb: string = s.externals.imdb;
          return {
            id: s.id,
            name: s.name,
            imdb_code: imdb,
            imdb_id: imdb.replace(/^tt/i, ''),
            year: s.premiered ? s.premiered.slice(0, 4) : undefined,
            rating: s.rating?.average || undefined,
            image: s.image?.medium || s.image?.original || undefined,
            summary: s.summary ? s.summary.replace(/<[^>]*>?/gm, '').trim() : undefined,
            genres: s.genres || [],
            network: s.network?.name || s.webChannel?.name || undefined
          };
        })
        .slice(0, 8);

      cache.set(cacheKey, { timestamp: Date.now(), data: shows });
      return res.json({ status: 'ok', shows });
    }
  } catch (err: any) {
    if (cached?.data) {
      return res.json({ status: 'ok', shows: cached.data });
    }
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError' || String(err?.message || '').includes('timeout');
    if (!isTimeout) {
      console.warn('TV autocomplete notice:', err?.message || err);
    }
  }

  if (cached?.data) {
    return res.json({ status: 'ok', shows: cached.data });
  }

  return res.json({ status: 'ok', shows: [] });
});

// TV show full details endpoint (metadata, cast, episodes)
app.get('/api/tv/details', async (req, res) => {
  try {
    const rawImdb = typeof req.query.imdb === 'string' ? req.query.imdb.trim() : (typeof req.query.imdb_id === 'string' ? req.query.imdb_id.trim() : '');
    const rawId = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    const rawTitle = typeof req.query.title === 'string' ? req.query.title.trim() : (typeof req.query.q === 'string' ? req.query.q.trim() : '');

    const cacheKey = `tv_details:${rawImdb || rawId || rawTitle.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 7200000) {
      return res.json({ status: 'ok', show: cached.data });
    }

    let tvmazeShow: any = null;

    // 1. By IMDb ID
    if (rawImdb) {
      const imdbCode = rawImdb.startsWith('tt') ? rawImdb : `tt${rawImdb}`;
      try {
        const lookupRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbCode}`, {
          headers: { 'Accept': 'application/json' },
          redirect: 'follow',
          signal: AbortSignal.timeout(6000)
        });
        if (lookupRes.ok) {
          tvmazeShow = await lookupRes.json();
        }
      } catch (err) {
        console.warn('TVmaze IMDb lookup failed:', err);
      }
    }

    // 2. By TVmaze ID
    if (!tvmazeShow && rawId) {
      try {
        const idRes = await fetch(`https://api.tvmaze.com/shows/${rawId}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(6000)
        });
        if (idRes.ok) {
          tvmazeShow = await idRes.json();
        }
      } catch (err) {
        console.warn('TVmaze ID lookup failed:', err);
      }
    }

    // 3. By Title
    if (!tvmazeShow && rawTitle) {
      const resolved = await resolveTvShowByTitle(rawTitle);
      if (resolved && resolved.imdb_code) {
        try {
          const lookupRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${resolved.imdb_code}`, {
            headers: { 'Accept': 'application/json' },
            redirect: 'follow',
            signal: AbortSignal.timeout(6000)
          });
          if (lookupRes.ok) {
            tvmazeShow = await lookupRes.json();
          }
        } catch (err) {
          console.warn('TVmaze title lookup failed:', err);
        }
      }
    }

    if (!tvmazeShow) {
      // Fallback: Resolve official poster and basic show info from IMDb suggestion API
      const fallbackPoster = await resolveOfficialPoster({ imdb: rawImdb, title: rawTitle, type: 'tv' });
      if (fallbackPoster) {
        const fallbackShow = {
          id: 0,
          name: rawTitle || 'Television Series',
          imdb_code: rawImdb.startsWith('tt') ? rawImdb : (rawImdb ? `tt${rawImdb}` : ''),
          imdb_id: rawImdb.replace(/^tt/i, ''),
          year: undefined,
          rating: 8.0,
          image: fallbackPoster.poster,
          backdropImage: fallbackPoster.poster,
          summary: `High-definition TV series releases, complete season packs, and verified torrents on CineVault.`,
          genres: ['TV Series', 'Drama'],
          network: 'Television',
          cast: [],
          episodes: []
        };
        cache.set(cacheKey, { timestamp: Date.now(), data: fallbackShow });
        return res.json({ status: 'ok', show: fallbackShow });
      }

      return res.status(404).json({ status: 'error', status_message: 'Television series details not found' });
    }

    // Fetch cast and episodes in parallel
    const showId = tvmazeShow.id;
    const [castRes, episodesRes] = await Promise.allSettled([
      fetch(`https://api.tvmaze.com/shows/${showId}/cast`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      }),
      fetch(`https://api.tvmaze.com/shows/${showId}/episodes`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
    ]);

    let castList: any[] = [];
    if (castRes.status === 'fulfilled' && castRes.value.ok) {
      try {
        const rawCast = await castRes.value.json();
        if (Array.isArray(rawCast)) {
          castList = rawCast.slice(0, 16).map((c) => ({
            person: {
              id: c.person?.id,
              name: c.person?.name,
              image: c.person?.image ? { medium: c.person.image.medium, original: c.person.image.original } : null
            },
            character: {
              id: c.character?.id,
              name: c.character?.name,
              image: c.character?.image ? { medium: c.character.image.medium, original: c.character.image.original } : null
            }
          }));
        }
      } catch {
        // ignore
      }
    }

    let episodesList: any[] = [];
    if (episodesRes.status === 'fulfilled' && episodesRes.value.ok) {
      try {
        const rawEpisodes = await episodesRes.value.json();
        if (Array.isArray(rawEpisodes)) {
          episodesList = rawEpisodes.map((e) => ({
            id: e.id,
            name: e.name,
            season: e.season,
            number: e.number,
            airdate: e.airdate,
            runtime: e.runtime,
            image: e.image ? { medium: e.image.medium, original: e.image.original } : null,
            summary: e.summary ? e.summary.replace(/<[^>]*>?/gm, '').trim() : ''
          }));
        }
      } catch {
        // ignore
      }
    }

    const rawImdbCode = tvmazeShow.externals?.imdb || (rawImdb.startsWith('tt') ? rawImdb : `tt${rawImdb}`);
    const digitsOnly = (rawImdbCode || '').replace(/^tt/i, '');

    let showImage = tvmazeShow.image?.original || tvmazeShow.image?.medium || undefined;
    if (!showImage) {
      const resolved = await resolveOfficialPoster({ imdb: rawImdbCode, title: tvmazeShow.name, type: 'tv' });
      if (resolved?.poster) {
        showImage = resolved.poster;
      }
    }

    const details = {
      id: tvmazeShow.id,
      name: tvmazeShow.name,
      imdb_code: rawImdbCode,
      imdb_id: digitsOnly,
      year: tvmazeShow.premiered ? tvmazeShow.premiered.slice(0, 4) : undefined,
      rating: tvmazeShow.rating?.average || undefined,
      image: showImage,
      backdropImage: tvmazeShow.image?.original || episodesList.find(e => e.image?.original)?.image?.original || showImage || undefined,
      summary: tvmazeShow.summary ? tvmazeShow.summary.replace(/<[^>]*>?/gm, '').trim() : undefined,
      genres: tvmazeShow.genres || [],
      network: tvmazeShow.network?.name || tvmazeShow.webChannel?.name || undefined,
      status: tvmazeShow.status,
      runtime: tvmazeShow.runtime || tvmazeShow.averageRuntime,
      averageRuntime: tvmazeShow.averageRuntime,
      premiered: tvmazeShow.premiered,
      ended: tvmazeShow.ended,
      officialSite: tvmazeShow.officialSite,
      type: tvmazeShow.type,
      language: tvmazeShow.language,
      cast: castList,
      episodes: episodesList
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: details });
    return res.json({ status: 'ok', show: details });
  } catch (err: any) {
    console.error('TV details endpoint error:', err);
    return res.status(500).json({ status: 'error', status_message: 'Failed to fetch TV details' });
  }
});

app.get(['/api/eztv', '/api/eztv/torrents', '/api/eztv/get-torrents'], async (req, res) => {
  try {
    const rawImdb = typeof req.query.imdb_id === 'string' ? req.query.imdb_id.trim() : '';
    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : (typeof req.query.query === 'string' ? req.query.query.trim() : '');
    const page = Math.min(100, Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '40'), 10) || 40));

    let effectiveImdbId = '';
    let resolvedTitle = '';
    let showMeta: ShowSearchResult | null = null;
    let searchParsing: { cleanedTitle: string; season?: number; episode?: number } | null = null;

    if (rawImdb) {
      effectiveImdbId = rawImdb.replace(/^tt/i, '').trim();
    } else if (rawSearch) {
      if (/^tt\d{5,9}$/i.test(rawSearch)) {
        effectiveImdbId = rawSearch.replace(/^tt/i, '');
      } else if (/^\d{6,8}$/.test(rawSearch)) {
        effectiveImdbId = rawSearch;
      } else {
        searchParsing = extractShowSearch(rawSearch);
        showMeta = await resolveTvShowByTitle(rawSearch);
        if (showMeta) {
          effectiveImdbId = showMeta.imdb_id;
          resolvedTitle = showMeta.name;
        }
      }
    }

    // CRITICAL: If a search was requested by user, but NO show/imdb_id was resolved:
    // DO NOT return random latest releases! Return an empty result with a clear message!
    if (rawSearch && !effectiveImdbId) {
      return res.json({
        status: 'ok',
        imdb_id: null,
        resolved_title: null,
        show_meta: null,
        torrents_count: 0,
        limit,
        page,
        torrents: [],
        message: `No television series found matching "${rawSearch}". Try searching with show title (e.g. Breaking Bad) or IMDb ID (e.g. tt0903747).`
      });
    }

    const upstreamParams: Record<string, string> = {
      page: String(page),
      limit: String(limit)
    };

    if (effectiveImdbId) {
      upstreamParams.imdb_id = effectiveImdbId;
    }

    const result = await fetchEztvFromMirrors(upstreamParams);
    let torrents = Array.isArray(result.torrents) ? result.torrents : [];

    // If season filter was extracted from the search query (e.g. "Breaking Bad S02" or "Stranger Things season 4")
    if (searchParsing?.season !== undefined && torrents.length > 0) {
      const sStr = String(searchParsing.season);
      const filtered = torrents.filter((t: any) => String(t.season) === sStr || (t.title && new RegExp(`[\\b_\\.]S0?${sStr}[\\b_\\.]`, 'i').test(t.title)));
      if (filtered.length > 0) {
        torrents = filtered;
      }
    }

    if (showMeta && !showMeta.image) {
      const posterData = await resolveOfficialPoster({ imdb: showMeta.imdb_code, title: showMeta.name, type: 'tv' });
      if (posterData?.poster) {
        showMeta.image = posterData.poster;
      }
    }

    const enrichedTorrents = torrents.map((t: any) => {
      const showTitle = extractShowTitleFromRelease(t.title);
      const imdb = (t.imdb_id && t.imdb_id !== '0') ? `tt${t.imdb_id}` : (showMeta?.imdb_code || '');
      const posterUrl = imdb
        ? `/api/poster?imdb=${imdb}&size=small`
        : (showTitle ? `/api/poster?title=${encodeURIComponent(showTitle)}&type=tv&size=small` : undefined);
      return {
        ...t,
        clean_title: showTitle,
        poster_url: posterUrl
      };
    });

    return res.json({
      status: 'ok',
      imdb_id: effectiveImdbId || result.imdb_id || null,
      resolved_title: resolvedTitle || (showMeta ? showMeta.name : null),
      show_meta: showMeta || null,
      torrents_count: result.torrents_count || torrents.length,
      limit: result.limit || limit,
      page: result.page || page,
      torrents: enrichedTorrents
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      status_message: err.message || 'Failed to fetch from EZTV API'
    });
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

      if (movie) {
        const related = movies.filter((m: any) => m.id !== movie.id).slice(0, 4);

        try {
          return buildMovieHtml(htmlTemplate, movie, related, slug);
        } catch (error) {
          console.warn('Movie SEO HTML generation failed:', error);
        }
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

// Ensure Ad network scripts (Adsterra, Ezoic) are delivered in the static HTML
function ensureEzoicProductionTags(html: string, reqHost: string = '', reqUrl: string = ''): string {
  const isProdHost = reqHost.includes('cinevaultmovies.online');
  const isDebug = reqUrl.includes('ez_js_debugger=1') || reqUrl.includes('force_ezoic=1') || reqUrl.includes('force_ads=1');

  if ((isProdHost || isDebug) && !html.includes('0626bb7ebab6d2671706e9b94ba2b96f.js')) {
    const adsterraTags = `
    <!-- Adsterra SocialBar & Popunder Tags -->
    <script async src="https://pl31437221.profitableratecpmnetwork.com/06/26/bb/0626bb7ebab6d2671706e9b94ba2b96f.js"></script>
    <script async src="https://pl31437219.profitableratecpmnetwork.com/14/5a/57/145a579d83e9caaf18d1d1f81ab75ab8.js"></script>`;
    html = html.replace('<head>', `<head>\n${adsterraTags}`);
  }

  // If html already contains sa.min.js, it is already wired directly in the template
  if (html.includes('sa.min.js')) {
    return html;
  }

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
      // Prime initial EZTV cache in background so TV torrents are instantly ready
      fetchEztvFromMirrors({ limit: '40', page: '1' }).catch((e) => {
        console.warn('Initial background EZTV seed notice:', e.message);
      });
    });
  }
}

// Execute setup
start().catch((err) => console.error('Startup Error:', err));

export default app;
