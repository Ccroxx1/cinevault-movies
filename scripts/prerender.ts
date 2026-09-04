import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FALLBACK_FEATURED_MOVIES } from '../src/data/fallbackMovies.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_BASE_URL = 'https://cinevault-movies-one.vercel.app';
const SITE_NAME = 'CineVault By Sasuu';
const DEFAULT_DESCRIPTION = 'Explore, search, and download high-quality curated films with rich metadata, trailers, IMDb ratings, torrents, and magnet links.';

const MIRRORS = [
  'https://yts.gg/api/v2/list_movies.json',
  'https://movies-api.accel.li/api/v2/list_movies.json',
  'https://yts.am/api/v2/list_movies.json',
  'https://yts.lt/api/v2/list_movies.json',
  'https://yts.bz/api/v2/list_movies.json',
  'https://yts.ag/api/v2/list_movies.json'
];

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9'
};

function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getMovieSlug(movie: { title: string; year?: number; slug?: string; id?: number }): string {
  if (movie.slug && movie.slug.trim()) return slugify(movie.slug);
  const baseTitle = slugify(movie.title || 'movie');
  if (movie.year && !baseTitle.endsWith(String(movie.year))) return `${baseTitle}-${movie.year}`;
  return baseTitle || `movie-${movie.id || 'canonical'}`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isPrerenderableMovie(m: any): { valid: boolean; reason?: string } {
  if (!m || typeof m !== 'object') return { valid: false, reason: 'Null or non-object entry' };
  const id = Number(m.id);
  if (!id || isNaN(id) || id <= 0) return { valid: false, reason: `Invalid movie id (${m.id})` };
  const title = (m.title || m.title_english || '').trim();
  if (!title) return { valid: false, reason: `Missing title for movie id ${id}` };
  return { valid: true };
}

interface QueryTask {
  name: string;
  params: Record<string, string>;
}

interface FetchResult {
  name: string;
  movies: any[];
  usedMirror?: string;
  status?: string;
  error?: string;
}

interface MirrorDiagnostic {
  successful: number;
  failed: number;
  empty: number;
  lastError?: string;
}

const mirrorDiagnostics: Record<string, MirrorDiagnostic> = {};
for (const m of MIRRORS) mirrorDiagnostics[m] = { successful: 0, failed: 0, empty: 0 };

async function fetchPage(task: QueryTask): Promise<FetchResult> {
  const qs = new URLSearchParams(task.params).toString();
  const failureLog: string[] = [];

  for (const mirror of MIRRORS) {
    const diag = mirrorDiagnostics[mirror];
    try {
      const url = `${mirror}?${qs}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal, redirect: 'follow' });
      clearTimeout(timeoutId);

      if (!res.ok) {
        diag.failed++;
        diag.lastError = `HTTP ${res.status} ${res.statusText}`;
        failureLog.push(`${mirror}: HTTP ${res.status}`);
        continue;
      }

      const text = await res.text();
      if (!text || (!text.trim().startsWith('{') && !text.trim().startsWith('['))) {
        diag.failed++;
        diag.lastError = 'Invalid JSON response';
        failureLog.push(`${mirror}: Invalid JSON format`);
        continue;
      }

      const json = JSON.parse(text);
      const movies = json?.data?.movies || json?.movies;
      if (Array.isArray(movies)) {
        if (movies.length > 0) {
          diag.successful++;
          return { name: task.name, movies, usedMirror: mirror, status: 'OK' };
        } else {
          diag.empty++;
          failureLog.push(`${mirror}: Empty movie result`);
          continue;
        }
      } else {
        diag.failed++;
        diag.lastError = 'No movies array in response payload';
        failureLog.push(`${mirror}: No movies array`);
        continue;
      }
    } catch (err: any) {
      diag.failed++;
      const errMsg = err?.message || 'Network/DNS timeout';
      diag.lastError = errMsg;
      failureLog.push(`${mirror}: ${errMsg}`);
    }
  }

  return { name: task.name, movies: [], status: 'API_FAILURE', error: failureLog.join(' | ') };
}

async function fetchInBatches(tasks: QueryTask[], concurrency = 6): Promise<FetchResult[]> {
  const results: FetchResult[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchRes = await Promise.all(batch.map(t => fetchPage(t)));
    results.push(...batchRes);
  }
  return results;
}

export function buildMovieHtml(baseHtmlTemplate: string, movie: any, relatedMovies: any[] = []): string {
  const slug = getMovieSlug(movie);
  const canonicalUrl = `${SITE_BASE_URL}/movies/${slug}`;
  const movieTitle = movie.title || 'Movie';
  const movieYear = movie.year ? ` (${movie.year})` : '';
  const pageTitle = `${movieTitle}${movieYear} — Watch Details & Download | CineVault By Sasuu`;
  const metaDescription = `Learn about ${movieTitle}${movieYear}, including synopsis, cast, genres, IMDb rating, trailer and high-speed download info on CineVault By Sasuu.`;

  const coverImage = movie.large_cover_image || movie.medium_cover_image || movie.small_cover_image || `${SITE_BASE_URL}/favicon-192.png`;
  const backdropImage = movie.background_image_original || movie.background_image || coverImage;
  const ratingStr = movie.rating ? `${movie.rating.toFixed(1)} / 10 ★` : 'Not Rated';
  const genresArray = Array.isArray(movie.genres) ? movie.genres : [];
  const genresStr = genresArray.length > 0 ? genresArray.join(', ') : 'Cinema';

  const jsonLdGraph = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_BASE_URL}/#website`,
      'url': SITE_BASE_URL,
      'name': SITE_NAME
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_BASE_URL}/#organization`,
      'name': SITE_NAME,
      'url': SITE_BASE_URL,
      'logo': `${SITE_BASE_URL}/favicon-192.png`
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}/#breadcrumb`,
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_BASE_URL}/` },
        { '@type': 'ListItem', 'position': 2, 'name': 'Movies', 'item': `${SITE_BASE_URL}/` },
        { '@type': 'ListItem', 'position': 3, 'name': movie.title, 'item': canonicalUrl }
      ]
    },
    {
      '@type': 'WebPage',
      '@id': `${canonicalUrl}/#webpage`,
      'url': canonicalUrl,
      'name': pageTitle,
      'isPartOf': { '@id': `${SITE_BASE_URL}/#website` },
      'description': metaDescription,
      'breadcrumb': { '@id': `${canonicalUrl}/#breadcrumb` }
    },
    {
      '@type': 'Movie',
      '@id': `${canonicalUrl}/#movie`,
      'name': movie.title,
      'url': canonicalUrl,
      'image': [coverImage, backdropImage],
      'dateCreated': String(movie.year),
      'genre': genresArray,
      'description': (movie.description_full || movie.summary || '').slice(0, 300),
      'aggregateRating': movie.rating ? {
        '@type': 'AggregateRating',
        'ratingValue': movie.rating,
        'bestRating': 10,
        'ratingCount': movie.rating_count || 100
      } : undefined
    }
  ];

  const jsonLdScript = `<script type="application/ld+json" id="schema-jsonld">\n${JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonLdGraph }, null, 2)}\n    </script>`;

  const torrentsList = Array.isArray(movie.torrents) && movie.torrents.length > 0
    ? movie.torrents.map((t: any) => `
        <li class="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl text-xs">
          <span class="font-bold text-white uppercase tracking-wider">${escapeHtml(t.quality)} ${escapeHtml(t.type || '')}</span>
          <span class="text-neutral-400">${escapeHtml(t.size)}</span>
        </li>`).join('')
    : '<li class="text-neutral-500 text-xs">Torrent files and magnet links available.</li>';

  const semanticBody = `
      <main class="min-h-screen bg-[#050505] text-neutral-100 p-4 sm:p-8 max-w-7xl mx-auto font-sans">
        <article class="space-y-6">
          <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs text-neutral-400">
            <a href="/" class="hover:text-white transition-colors">Home</a>
            <span>/</span>
            <a href="/" class="hover:text-white transition-colors">Movies</a>
            <span>/</span>
            <span class="text-neutral-200 font-semibold">${escapeHtml(movieTitle)}</span>
          </nav>

          <header class="space-y-3">
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">${escapeHtml(movieTitle)}${movieYear}</h1>
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold">${movie.year}</span>
              <span class="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded-lg">★ ${movie.rating.toFixed(1)} / 10 IMDb</span>
            </div>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-4">
            <div class="md:col-span-1">
              <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(movieTitle)} Poster" width="300" height="450" class="w-full rounded-2xl border border-white/10 shadow-2xl" loading="eager" />
            </div>
            
            <div class="md:col-span-2 space-y-6">
              <section class="space-y-2">
                <h2 class="text-lg font-bold text-white">Movie Synopsis</h2>
                <p class="text-neutral-300 text-sm leading-relaxed">${escapeHtml(movie.description_full || movie.summary || 'No description available.')}</p>
              </section>

              <section class="space-y-2">
                <h2 class="text-sm font-bold text-neutral-400 uppercase tracking-wider">Download Formats</h2>
                <ul class="space-y-2">${torrentsList}</ul>
              </section>
            </div>
          </div>
        </article>
      </main>`;

  let html = baseHtmlTemplate;
  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);
  html = html.replace(/<meta\s+name=["']description["'].*?>/gi, `<meta name="description" content="${escapeHtml(metaDescription)}" />`);
  html = html.replace(/<link\s+rel=["']canonical["'].*?>/gi, `<link rel="canonical" href="${canonicalUrl}" />`);
  html = html.replace(/<meta\s+property=["']og:.*?["'].*?>/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:.*?["'].*?>/gi, '');
  html = html.replace(/<script[^>]*id=["']schema-jsonld["'][^>]*>[\s\S]*?<\/script>/gi, '');

  const headMetaTags = `
    <!-- Open Graph -->
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:type" content="video.movie" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(metaDescription)}" />
    <meta property="og:image" content="${escapeHtml(coverImage)}" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(coverImage)}" />

    ${jsonLdScript}
  `;

  html = html.replace('</head>', `${headMetaTags}\n  </head>`);
  const rootOpenTag = '<div id="root">';
  const rootOpenIdx = html.indexOf(rootOpenTag);
  if (rootOpenIdx !== -1) {
    const endBodyTag = '</body>';
    const endBodyIdx = html.indexOf(endBodyTag, rootOpenIdx);
    if (endBodyIdx !== -1) {
      const prefix = html.substring(0, rootOpenIdx);
      const suffix = html.substring(endBodyIdx);
      html = `${prefix}<div id="root">\n${semanticBody}\n    </div>\n  ${suffix}`;
    }
  }
  return html;
}

export function buildHomepageHtml(baseHtmlTemplate: string, featuredMovies: any[], totalCount: number): string {
  const canonicalUrl = `${SITE_BASE_URL}/`;
  const pageTitle = 'CineVault By Sasuu — HD Movie Library & Downloads';
  const metaDescription = DEFAULT_DESCRIPTION;

  const jsonLdGraph = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_BASE_URL}/#website`,
      'url': SITE_BASE_URL,
      'name': SITE_NAME,
      'description': metaDescription,
      'potentialAction': {
        '@type': 'SearchAction',
        'target': `${SITE_BASE_URL}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_BASE_URL}/#organization`,
      'name': SITE_NAME,
      'url': SITE_BASE_URL,
      'logo': `${SITE_BASE_URL}/favicon-192.png`
    }
  ];

  const moviesGridHtml = featuredMovies.slice(0, 24).map(m => {
    const slug = getMovieSlug(m);
    const cover = m.medium_cover_image || m.large_cover_image || '/favicon-192.png';
    return `
      <article class="bg-white/5 border border-white/10 rounded-2xl p-3">
        <a href="/movies/${slug}" class="block space-y-2">
          <img src="${escapeHtml(cover)}" alt="${escapeHtml(m.title)} Poster" width="200" height="300" class="w-full rounded-xl" loading="lazy" />
          <h3 class="font-bold text-sm text-neutral-100 truncate">${escapeHtml(m.title)}</h3>
          <div class="flex items-center justify-between text-xs text-neutral-400">
            <span>${m.year}</span>
            <span class="text-amber-400 font-semibold">★ ${m.rating.toFixed(1)}</span>
          </div>
        </a>
      </article>
    `;
  }).join('');

  const semanticHomepage = `
    <main class="min-h-screen bg-[#050505] text-neutral-100 p-4 sm:p-8 max-w-7xl mx-auto font-sans">
      <header class="py-8 border-b border-white/10">
        <h1 class="text-2xl sm:text-4xl font-black text-white tracking-tight">CineVault By Sasuu — HD Movie Catalog</h1>
        <p class="text-sm text-neutral-400 mt-1">Explore over ${totalCount} curated cinema releases with magnet links and IMDb ratings.</p>
      </header>

      <section class="py-8 space-y-6">
        <h2 class="text-xl font-bold text-white">Trending Releases</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          ${moviesGridHtml}
        </div>
      </section>
    </main>
  `;

  let html = baseHtmlTemplate;
  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);
  html = html.replace(/<meta\s+name=["']description["'].*?>/gi, `<meta name="description" content="${escapeHtml(metaDescription)}" />`);
  html = html.replace(/<link\s+rel=["']canonical["'].*?>/gi, `<link rel="canonical" href="${canonicalUrl}" />`);
  html = html.replace(/<meta\s+property=["']og:.*?["'].*?>/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:.*?["'].*?>/gi, '');
  html = html.replace(/<script[^>]*id=["']schema-jsonld["'][^>]*>[\s\S]*?<\/script>/gi, '');

  const headMetaTags = `
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(metaDescription)}" />
    <meta property="og:image" content="${SITE_BASE_URL}/favicon-192.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json" id="schema-jsonld">
      ${JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonLdGraph }, null, 2)}
    </script>
  `;

  html = html.replace('</head>', `${headMetaTags}\n  </head>`);
  const rootOpenTag = '<div id="root">';
  const rootOpenIdx = html.indexOf(rootOpenTag);
  if (rootOpenIdx !== -1) {
    const endBodyTag = '</body>';
    const endBodyIdx = html.indexOf(endBodyTag, rootOpenIdx);
    if (endBodyIdx !== -1) {
      const prefix = html.substring(0, rootOpenIdx);
      const suffix = html.substring(endBodyIdx);
      html = `${prefix}<div id="root">\n${semanticHomepage}\n    </div>\n  ${suffix}`;
    }
  }
  return html;
}

async function main() {
  console.log('🚀 Starting CineVault Build-Time Prerendering...');
  const distDir = path.resolve(__dirname, '../dist');
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('❌ dist/index.html not found! Run vite build first.');
    process.exit(1);
  }
  const baseHtmlTemplate = fs.readFileSync(indexHtmlPath, 'utf-8');
  const movieMap = new Map<string, any>();
  const seenIds = new Set<number>();

  const processMovies = (movies: any[]) => {
    if (!Array.isArray(movies)) return;
    for (const m of movies) {
      if (!isPrerenderableMovie(m).valid) continue;
      const id = Number(m.id);
      if (seenIds.has(id)) continue;
      const slug = getMovieSlug(m);
      if (!slug || movieMap.has(slug)) continue;
      seenIds.add(id);
      movieMap.set(slug, m);
    }
  };

  const tasks: QueryTask[] = [
    { name: 'Latest added', params: { sort_by: 'date_added', limit: '50' } },
    { name: 'Most downloaded', params: { sort_by: 'download_count', limit: '50' } },
    { name: 'Top rated', params: { sort_by: 'rating', limit: '50' } }
  ];

  console.log(`📡 Fetching verified catalog...`);
  const allResults = await fetchInBatches(tasks, 6);
  for (const res of allResults) if (res.status === 'OK') processMovies(res.movies);

  if (movieMap.size === 0) processMovies(FALLBACK_FEATURED_MOVIES);

  const moviesArray = Array.from(movieMap.values());
  const moviesDir = path.join(distDir, 'movies');
  if (!fs.existsSync(moviesDir)) fs.mkdirSync(moviesDir, { recursive: true });

  for (const movie of moviesArray) {
    const slug = getMovieSlug(movie);
    const moviePageDir = path.join(moviesDir, slug);
    if (!fs.existsSync(moviePageDir)) fs.mkdirSync(moviePageDir, { recursive: true });
    const related = moviesArray.filter(m => m.id !== movie.id).slice(0, 6);
    const fullHtml = buildMovieHtml(baseHtmlTemplate, movie, related);
    fs.writeFileSync(path.join(moviePageDir, 'index.html'), fullHtml, 'utf-8');
  }

  const homeHtml = buildHomepageHtml(baseHtmlTemplate, moviesArray, movieMap.size);
  fs.writeFileSync(indexHtmlPath, homeHtml, 'utf-8');

  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url><loc>${SITE_BASE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>'
  ];
  for (const movie of moviesArray) {
    xmlLines.push(`  <url><loc>${SITE_BASE_URL}/movies/${getMovieSlug(movie)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  }
  xmlLines.push('</urlset>');
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xmlLines.join('\n'), 'utf-8');
  console.log(`✨ Prerendering complete. Generated ${movieMap.size} pages.`);
}

main().catch(err => {
  console.error('❌ Prerender process failed:', err);
  process.exit(1);
});
