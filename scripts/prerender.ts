import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FALLBACK_FEATURED_MOVIES } from '../src/data/fallbackMovies.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_BASE_URL = 'https://cinevault-movies-one.vercel.app';
const SITE_NAME = 'CineVault By Sasuu';

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
  if (movie.slug && movie.slug.trim()) {
    return slugify(movie.slug);
  }
  const baseTitle = slugify(movie.title || 'movie');
  if (movie.year && !baseTitle.endsWith(String(movie.year))) {
    return `${baseTitle}-${movie.year}`;
  }
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

/**
 * Prerender Validation: Decoupled from Homepage Card Validation
 * Requires valid positive ID and non-empty title.
 * All other metadata (cover posters, backdrops, year, rating, cast, synopsis) uses graceful fallbacks.
 */
function isPrerenderableMovie(m: any): { valid: boolean; reason?: string } {
  if (!m || typeof m !== 'object') {
    return { valid: false, reason: 'Null or non-object entry' };
  }
  const id = Number(m.id);
  if (!id || isNaN(id) || id <= 0) {
    return { valid: false, reason: `Invalid movie id (${m.id})` };
  }
  const title = (m.title || m.title_english || '').trim();
  if (!title) {
    return { valid: false, reason: `Missing title for movie id ${id}` };
  }
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
for (const m of MIRRORS) {
  mirrorDiagnostics[m] = { successful: 0, failed: 0, empty: 0 };
}

async function fetchPage(task: QueryTask): Promise<FetchResult> {
  const qs = new URLSearchParams(task.params).toString();
  const failureLog: string[] = [];

  for (const mirror of MIRRORS) {
    const diag = mirrorDiagnostics[mirror];
    try {
      const url = `${mirror}?${qs}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: controller.signal,
        redirect: 'follow'
      });
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

  return {
    name: task.name,
    movies: [],
    status: 'API_FAILURE',
    error: failureLog.join(' | ')
  };
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
  const pageTitle = `${movieTitle}${movieYear} — CineVault By Sasuu`;
  
  const rawSynopsis = movie.description_full || movie.summary || movie.synopsis || 
    `Explore ${movieTitle}${movieYear} on CineVault By Sasuu. Watch trailers, check IMDb ratings, cast, genres, and high-speed magnet downloads.`;
  const cleanSynopsis = rawSynopsis.replace(/\s+/g, ' ').trim();
  const metaDescription = `Learn about ${movieTitle}${movieYear}, including synopsis, cast, genres, IMDb rating, trailer and download info on CineVault By Sasuu.`;

  const coverImage = movie.large_cover_image || movie.medium_cover_image || movie.small_cover_image || `${SITE_BASE_URL}/favicon.svg`;
  const backdropImage = movie.background_image_original || movie.background_image || coverImage;
  const ratingStr = movie.rating ? `${movie.rating.toFixed(1)} / 10 ★` : 'Not Rated';
  const genresArray = Array.isArray(movie.genres) ? movie.genres : [];
  const genresStr = genresArray.length > 0 ? genresArray.join(', ') : 'Cinema, Feature Film';

  // Build JSON-LD Movie Schema
  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    'name': movie.title,
    'url': canonicalUrl,
    'description': cleanSynopsis.slice(0, 500)
  };

  if (movie.title_english && movie.title_english !== movie.title) {
    jsonLd['alternateName'] = movie.title_english;
  }

  const validImages = [movie.large_cover_image, movie.medium_cover_image, backdropImage].filter(Boolean);
  if (validImages.length > 0) {
    jsonLd['image'] = validImages;
  }

  if (movie.year && movie.year > 1880) {
    jsonLd['dateCreated'] = String(movie.year);
    jsonLd['datePublished'] = String(movie.year);
  }

  if (movie.language) {
    jsonLd['inLanguage'] = movie.language;
  }

  if (genresArray.length > 0) {
    jsonLd['genre'] = genresArray;
  }

  if (movie.mpa_rating) {
    jsonLd['contentRating'] = movie.mpa_rating;
  }

  if (movie.runtime && movie.runtime > 0) {
    jsonLd['duration'] = `PT${movie.runtime}M`;
  }

  const genuineRatingCount = movie.rating_count || movie.votes_count || movie.imdb_votes;
  if (movie.rating && movie.rating > 0 && typeof genuineRatingCount === 'number' && genuineRatingCount > 0) {
    jsonLd['aggregateRating'] = {
      '@type': 'AggregateRating',
      'ratingValue': movie.rating,
      'bestRating': 10,
      'worstRating': 1,
      'ratingCount': genuineRatingCount
    };
  }

  if (Array.isArray(movie.cast) && movie.cast.length > 0) {
    jsonLd['actor'] = movie.cast
      .filter((c: any) => c && c.name)
      .map((c: any) => ({
        '@type': 'Person',
        'name': c.name,
        ...(c.character_name ? { 'characterName': c.character_name } : {})
      }));
  }

  if (movie.yt_trailer_code) {
    jsonLd['trailer'] = {
      '@type': 'VideoObject',
      'name': `${movie.title} Official Trailer`,
      'embedUrl': `https://www.youtube.com/embed/${movie.yt_trailer_code}`,
      'thumbnailUrl': `https://img.youtube.com/vi/${movie.yt_trailer_code}/hqdefault.jpg`,
      'description': `Official trailer for ${movie.title}${movieYear}`,
      'uploadDate': movie.date_uploaded ? new Date(movie.date_uploaded).toISOString() : new Date().toISOString()
    };
  }

  const jsonLdScript = `<script type="application/ld+json" id="schema-jsonld">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`;

  // Build semantic visible body shell inside <div id="root">
  const torrentsList = Array.isArray(movie.torrents) && movie.torrents.length > 0
    ? movie.torrents.map((t: any) => `
        <li class="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl text-xs">
          <span class="font-bold text-white uppercase tracking-wider">${escapeHtml(t.quality || 'HD')} ${escapeHtml(t.type || '')}</span>
          <span class="text-neutral-400">${escapeHtml(t.size || '')}</span>
        </li>`).join('')
    : '<li class="text-neutral-500 text-xs">Torrent files and direct magnet links are ready to stream and download.</li>';

  const castList = Array.isArray(movie.cast) && movie.cast.length > 0
    ? `
      <section class="space-y-2 pt-2">
        <h2 class="text-sm font-bold text-neutral-400 uppercase tracking-wider">Cast &amp; Starring</h2>
        <div class="flex flex-wrap gap-2 text-xs">
          ${movie.cast.filter((c: any) => c?.name).map((c: any) => `
            <span class="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-neutral-200">
              <strong class="text-white">${escapeHtml(c.name)}</strong>${c.character_name ? ` as ${escapeHtml(c.character_name)}` : ''}
            </span>`).join('')}
        </div>
      </section>`
    : '';

  const relatedLinks = relatedMovies.length > 0
    ? `
      <section class="space-y-3 pt-6 border-t border-white/10">
        <h2 class="text-base font-bold text-white">Related &amp; Recommended Movies on CineVault</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          ${relatedMovies.slice(0, 6).map((rm: any) => {
            const rmSlug = getMovieSlug(rm);
            return `
            <a href="/movies/${rmSlug}" class="group block p-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-500/50 rounded-xl transition-all">
              <span class="block text-xs font-bold text-neutral-200 group-hover:text-rose-400 truncate">${escapeHtml(rm.title)}</span>
              <span class="block text-[10px] text-neutral-400 mt-0.5">${rm.year || ''} · ★ ${rm.rating ? rm.rating.toFixed(1) : 'HD'}</span>
            </a>`;
          }).join('')}
        </div>
      </section>`
    : '';

  const semanticBody = `
      <main class="min-h-screen bg-[#050505] text-neutral-100 p-4 sm:p-8 max-w-7xl mx-auto font-sans">
        <article class="space-y-6">
          <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs text-neutral-400">
            <a href="/" class="hover:text-white transition-colors">Home</a>
            <span>/</span>
            <a href="/" class="hover:text-white transition-colors">Movies</a>
            <span>/</span>
            <span class="text-neutral-200 font-semibold">${escapeHtml(movieTitle)}${movieYear}</span>
          </nav>

          <header class="space-y-3">
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              ${escapeHtml(movieTitle)}${movieYear}
            </h1>
            <div class="flex flex-wrap items-center gap-2 text-xs">
              ${movie.year ? `<span class="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold">${movie.year}</span>` : ''}
              ${movie.mpa_rating ? `<span class="px-2 py-1 bg-neutral-800 text-neutral-200 border border-white/10 rounded-lg">${escapeHtml(movie.mpa_rating)}</span>` : ''}
              ${movie.language ? `<span class="px-2 py-1 bg-white/5 text-neutral-300 border border-white/10 rounded-lg uppercase">${escapeHtml(movie.language)}</span>` : ''}
              ${movie.rating ? `<span class="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded-lg">★ ${movie.rating.toFixed(1)} / 10 IMDb</span>` : ''}
              ${movie.runtime ? `<span class="px-2 py-1 bg-white/5 text-neutral-300 border border-white/10 rounded-lg">${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m</span>` : ''}
            </div>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-4">
            <div class="md:col-span-1">
              <img
                src="${escapeHtml(coverImage)}"
                alt="${escapeHtml(movieTitle)}${movieYear} Official Poster"
                class="w-full rounded-2xl border border-white/10 shadow-2xl"
                loading="eager"
                onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80';"
              />
            </div>
            
            <div class="md:col-span-2 space-y-6">
              <section class="space-y-2">
                <h2 class="text-lg font-bold text-white">Movie Synopsis &amp; Overview</h2>
                <p class="text-neutral-300 text-sm leading-relaxed">${escapeHtml(cleanSynopsis)}</p>
              </section>

              <section class="space-y-2">
                <h2 class="text-sm font-bold text-neutral-400 uppercase tracking-wider">Movie Details</h2>
                <dl class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[#0e0e0e] p-4 rounded-xl border border-white/10">
                  <div><dt class="text-neutral-400">Release Year</dt><dd class="font-bold text-white mt-0.5">${movie.year || 'N/A'}</dd></div>
                  <div><dt class="text-neutral-400">IMDb Rating</dt><dd class="font-bold text-amber-400 mt-0.5">${ratingStr}</dd></div>
                  <div><dt class="text-neutral-400">Language</dt><dd class="font-bold text-white mt-0.5">${movie.language ? movie.language.toUpperCase() : 'EN'}</dd></div>
                  <div><dt class="text-neutral-400">Runtime</dt><dd class="font-bold text-white mt-0.5">${movie.runtime ? `${movie.runtime} min` : 'N/A'}</dd></div>
                  <div class="col-span-2"><dt class="text-neutral-400">Genres</dt><dd class="font-bold text-white mt-0.5">${escapeHtml(genresStr)}</dd></div>
                </dl>
              </section>

              <section class="space-y-2">
                <h2 class="text-sm font-bold text-neutral-400 uppercase tracking-wider">High Quality Torrents &amp; Download Formats</h2>
                <ul class="space-y-2">
                  ${torrentsList}
                </ul>
              </section>

              ${castList}
            </div>
          </div>

          ${relatedLinks}
        </article>
      </main>`;

  // Clean out any conflicting single tags from template
  let html = baseHtmlTemplate;

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

  // Replace Meta Description
  html = html.replace(/<meta\s+name=["']description["'].*?>/gi, `<meta name="description" content="${escapeHtml(metaDescription)}" />`);

  // Replace Canonical Tag (strictly one canonical tag)
  html = html.replace(/<link\s+rel=["']canonical["'].*?>/gi, '');

  // Remove existing OG & Twitter tags to inject pristine fresh tags
  html = html.replace(/<meta\s+property=["']og:.*?["'].*?>/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:.*?["'].*?>/gi, '');
  html = html.replace(/<script[^>]*id=["']schema-jsonld["'][^>]*>[\s\S]*?<\/script>/gi, '');

  const headMetaTags = `
    <link rel="canonical" href="${canonicalUrl}" />
    <!-- Open Graph Movie Metadata -->
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:type" content="video.movie" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(metaDescription)}" />
    <meta property="og:image" content="${escapeHtml(coverImage)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(coverImage)}" />
    <meta property="og:image:alt" content="${escapeHtml(movieTitle)}${movieYear} Poster" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="en_US" />
    ${movie.year ? `<meta property="video:release_date" content="${movie.year}" />` : ''}
    ${movie.runtime ? `<meta property="video:duration" content="${movie.runtime * 60}" />` : ''}
    ${genresArray.map(g => `<meta property="video:tag" content="${escapeHtml(g)}" />`).join('\n    ')}

    <!-- Twitter / X Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@CineVault" />
    <meta name="twitter:creator" content="@Sasuu" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(coverImage)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(movieTitle)}${movieYear} Poster" />
    <meta name="twitter:label1" content="IMDb Rating" />
    <meta name="twitter:data1" content="${ratingStr}" />
    <meta name="twitter:label2" content="Genres" />
    <meta name="twitter:data2" content="${escapeHtml(genresStr)}" />

    <!-- Schema.org Structured Data -->
    ${jsonLdScript}
  `;

  html = html.replace('</head>', `${headMetaTags}\n  </head>`);

  // Inject semantic body into <div id="root">
  const rootOpenTag = '<div id="root">';
  const rootOpenIdx = html.indexOf(rootOpenTag);
  if (rootOpenIdx !== -1) {
    const endBodyTag = '</body>';
    const endBodyIdx = html.indexOf(endBodyTag, rootOpenIdx);
    if (endBodyIdx !== -1) {
      const prefix = html.substring(0, rootOpenIdx);
      // find trailing noscript or closing root div before </body>
      const rootClosingTag = '</div>';
      const lastDivBeforeEndBody = html.lastIndexOf(rootClosingTag, endBodyIdx);
      const suffix = html.substring(endBodyIdx);
      html = `${prefix}<div id="root">\n${semanticBody}\n    </div>\n  ${suffix}`;
    }
  }

  return html;
}

export function buildHomepageHtml(baseHtmlTemplate: string, featuredMovies: any[], totalCount: number): string {
  const canonicalUrl = `${SITE_BASE_URL}/`;
  const pageTitle = 'CineVault By Sasuu — HD Movie Library & Downloads';
  const metaDescription = 'Explore, search, and download thousands of high-quality curated films with rich metadata, trailers, IMDb ratings, torrents, and magnet links.';

  // Build JSON-LD schema with ItemList for top movies
  const itemListElements = featuredMovies.slice(0, 24).map((m, idx) => ({
    '@type': 'ListItem',
    'position': idx + 1,
    'item': {
      '@type': 'Movie',
      'name': m.title,
      'url': `${SITE_BASE_URL}/movies/${getMovieSlug(m)}`,
      'image': m.medium_cover_image || m.large_cover_image || `${SITE_BASE_URL}/favicon.svg`,
      'dateCreated': m.year ? String(m.year) : undefined,
      'aggregateRating': m.rating ? {
        '@type': 'AggregateRating',
        'ratingValue': m.rating,
        'bestRating': 10
      } : undefined
    }
  }));

  const jsonLdGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_BASE_URL}/#website`,
        'url': `${SITE_BASE_URL}/`,
        'name': 'CineVault By Sasuu',
        'alternateName': 'CineVault',
        'description': metaDescription,
        'potentialAction': {
          '@type': 'SearchAction',
          'target': {
            '@type': 'EntryPoint',
            'urlTemplate': `${SITE_BASE_URL}/?search={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_BASE_URL}/#collection`,
        'url': `${SITE_BASE_URL}/`,
        'name': 'CineVault HD Cinema Collection',
        'isPartOf': { '@id': `${SITE_BASE_URL}/#website` },
        'mainEntity': {
          '@type': 'ItemList',
          'numberOfItems': featuredMovies.length,
          'itemListElement': itemListElements
        }
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_BASE_URL}/#organization`,
        'name': 'CineVault By Sasuu',
        'url': `${SITE_BASE_URL}/`,
        'logo': `${SITE_BASE_URL}/favicon.svg`
      },
      {
        '@type': 'WebApplication',
        '@id': `${SITE_BASE_URL}/#webapp`,
        'name': 'CineVault',
        'url': `${SITE_BASE_URL}/`,
        'applicationCategory': 'EntertainmentApplication',
        'operatingSystem': 'All',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD'
        }
      },
      {
        '@type': 'FAQPage',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'What is CineVault By Sasuu?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'CineVault is a curated cinema library and torrent download index offering verified 720p, 1080p, and 4K magnet links, media packs, trailers, and IMDb ratings.'
            }
          },
          {
            '@type': 'Question',
            'name': 'How do I download torrents and magnet links from CineVault?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Click any movie card to view available resolutions (720p, 1080p, 4K UHD), then click Direct Magnet or Torrent Download to open with your torrent client.'
            }
          },
          {
            '@type': 'Question',
            'name': 'What is a CineVault Media Pack (.zip)?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'A CineVault Media Pack is an offline archive containing high-resolution poster art, backdrop screenshots, metadata info, and torrent files packaged in a single zip archive.'
            }
          }
        ]
      }
    ]
  };

  const moviesGridHtml = featuredMovies.slice(0, 36).map(m => {
    const slug = getMovieSlug(m);
    const cover = m.medium_cover_image || m.large_cover_image || m.small_cover_image || '/favicon.svg';
    const rating = m.rating ? `★ ${m.rating.toFixed(1)} IMDb` : 'HD Release';
    const year = m.year || '';
    const synopsis = (m.description_full || m.summary || m.synopsis || '').slice(0, 140);
    return `
      <article class="bg-white/5 border border-white/10 hover:border-rose-500/50 rounded-2xl p-3 flex flex-col justify-between transition-all group">
        <a href="/movies/${slug}" class="block space-y-2">
          <div class="aspect-[2/3] rounded-xl overflow-hidden bg-black/40 relative">
            <img src="${escapeHtml(cover)}" alt="${escapeHtml(m.title)} (${year}) Poster" class="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80';" />
          </div>
          <h3 class="font-bold text-sm text-neutral-100 group-hover:text-rose-400 truncate">${escapeHtml(m.title)}</h3>
          <div class="flex items-center justify-between text-xs text-neutral-400">
            <span>${year}</span>
            <span class="text-amber-400 font-semibold">${rating}</span>
          </div>
          ${synopsis ? `<p class="text-[11px] text-neutral-400 line-clamp-2">${escapeHtml(synopsis)}</p>` : ''}
        </a>
      </article>
    `;
  }).join('');

  const semanticHomepage = `
    <main class="min-h-screen bg-[#050505] text-neutral-100 p-4 sm:p-8 max-w-7xl mx-auto font-sans">
      <header class="py-8 border-b border-white/10 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center font-bold text-white shadow-lg">CV</div>
          <div>
            <h1 class="text-2xl sm:text-4xl font-black text-white tracking-tight">CineVault By Sasuu — HD Movie Catalog &amp; Torrents</h1>
            <p class="text-sm text-neutral-400 mt-1">Explore over ${totalCount || 'thousands of'} curated cinema releases with magnet links, media packs, and IMDb ratings.</p>
          </div>
        </div>
        <nav aria-label="Genre Filters" class="flex flex-wrap gap-2 text-xs pt-2">
          <a href="/" class="px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 font-semibold">All Movies</a>
          <a href="/?genre=Action" class="px-3 py-1.5 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:border-rose-500/40">Action</a>
          <a href="/?genre=Sci-Fi" class="px-3 py-1.5 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:border-rose-500/40">Sci-Fi</a>
          <a href="/?genre=Drama" class="px-3 py-1.5 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:border-rose-500/40">Drama</a>
          <a href="/?genre=Comedy" class="px-3 py-1.5 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:border-rose-500/40">Comedy</a>
          <a href="/?genre=Thriller" class="px-3 py-1.5 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:border-rose-500/40">Thriller</a>
          <a href="/?genre=Horror" class="px-3 py-1.5 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:border-rose-500/40">Horror</a>
          <a href="/?genre=Adventure" class="px-3 py-1.5 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:border-rose-500/40">Adventure</a>
          <a href="/?genre=Animation" class="px-3 py-1.5 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:border-rose-500/40">Animation</a>
        </nav>
      </header>

      <section class="py-8 space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-white tracking-wide">Featured &amp; Trending Releases</h2>
          <span class="text-xs text-neutral-400">Verified 720p • 1080p • 2160p 4K Torrents</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          ${moviesGridHtml}
        </div>
      </section>

      <section class="py-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-neutral-300">
        <div class="space-y-2">
          <h3 class="font-bold text-white text-base">Direct Magnet &amp; Torrent Downloads</h3>
          <p class="text-xs text-neutral-400 leading-relaxed">Direct one-click magnet links with optimized public trackers for lightning-fast speeds in your preferred torrent client.</p>
        </div>
        <div class="space-y-2">
          <h3 class="font-bold text-white text-base">Media Pack (.zip) Archiving</h3>
          <p class="text-xs text-neutral-400 leading-relaxed">Download complete bundles with high-resolution cover posters, backdrop screenshots, NFO metadata, and torrent files.</p>
        </div>
        <div class="space-y-2">
          <h3 class="font-bold text-white text-base">Subtitles &amp; Parental Guides</h3>
          <p class="text-xs text-neutral-400 leading-relaxed">Integrated multi-language subtitle search (SRT/VTT) and comprehensive IMDb parental content guides for safe family viewing.</p>
        </div>
      </section>

      <footer class="py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
        <div>&copy; CineVault By Sasuu — Curated HD Cinema Engine</div>
        <div class="flex gap-4">
          <a href="/" class="hover:text-neutral-300">Home</a>
          <a href="/sitemap.xml" class="hover:text-neutral-300">Sitemap</a>
          <a href="/robots.txt" class="hover:text-neutral-300">Robots.txt</a>
        </div>
      </footer>
    </main>
  `;

  let html = baseHtmlTemplate;
  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);
  html = html.replace(/<meta\s+name=["']description["'].*?>/gi, `<meta name="description" content="${escapeHtml(metaDescription)}" />`);
  html = html.replace(/<link\s+rel=["']canonical["'].*?>/gi, '');
  html = html.replace(/<meta\s+property=["']og:.*?["'].*?>/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:.*?["'].*?>/gi, '');
  html = html.replace(/<script[^>]*id=["']schema-jsonld["'][^>]*>[\s\S]*?<\/script>/gi, '');

  const headMetaTags = `
    <link rel="canonical" href="${canonicalUrl}" />
    <!-- Open Graph Homepage Metadata -->
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(metaDescription)}" />
    <meta property="og:image" content="${SITE_BASE_URL}/favicon.svg" />
    <meta property="og:image:secure_url" content="${SITE_BASE_URL}/favicon.svg" />
    <meta property="og:image:alt" content="CineVault HD Cinema Library" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter / X Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@CineVault" />
    <meta name="twitter:creator" content="@Sasuu" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />
    <meta name="twitter:image" content="${SITE_BASE_URL}/favicon.svg" />
    <meta name="twitter:image:alt" content="CineVault HD Cinema Library" />

    <!-- Schema.org Structured Data -->
    <script type="application/ld+json" id="schema-jsonld">
${JSON.stringify(jsonLdGraph, null, 2)}
    </script>
  `;

  html = html.replace('</head>', `${headMetaTags}\n  </head>`);

  // Inject semantic body into <div id="root">
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
  console.log('🚀 Starting CineVault Build-Time Prerendering & Sitemap Generation...');

  const distDir = path.resolve(__dirname, '../dist');
  const indexHtmlPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.error('❌ dist/index.html not found! Please run vite build first.');
    process.exit(1);
  }

  const baseHtmlTemplate = fs.readFileSync(indexHtmlPath, 'utf-8');

  // Diagnostics counters
  let totalApiRequests = 0;
  let totalRawApiResults = 0;
  let totalParsedMovies = 0;
  let fallbackMoviesUsed = 0;
  let normalizedCount = 0;
  let rejectedCount = 0;
  let deduplicatedCount = 0;
  const rejectionReasons: Record<string, number> = {};

  // Canonical collection maps
  const movieMap = new Map<string, any>();
  const seenIds = new Set<number>();

  const processMovies = (movies: any[], isFallback = false) => {
    if (!Array.isArray(movies)) return;
    if (isFallback) {
      fallbackMoviesUsed += movies.length;
    } else {
      totalRawApiResults += movies.length;
    }

    for (const m of movies) {
      normalizedCount++;
      const check = isPrerenderableMovie(m);
      if (!check.valid) {
        rejectedCount++;
        const reason = check.reason || 'Failed validation';
        rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
        continue;
      }

      const id = Number(m.id);
      if (id && seenIds.has(id)) {
        deduplicatedCount++;
        continue;
      }

      const slug = getMovieSlug(m);
      if (!slug || movieMap.has(slug)) {
        deduplicatedCount++;
        continue;
      }

      if (id) seenIds.add(id);
      movieMap.set(slug, m);
      totalParsedMovies++;
    }
  };

  // 1. Comprehensive catalog query suite (~110 queries)
  const tasks: QueryTask[] = [];

  // Marquee & high-profile franchises
  const targetTerms = [
    'supergirl',
    'project hail mary',
    'mortal kombat ii',
    'greenland 2',
    'send help',
    'war machine',
    'dune',
    'avatar',
    'batman',
    'spider-man',
    'avengers',
    'oppenheimer',
    'interstellar',
    'gladiator',
    'matrix',
    'fast',
    'deadpool',
    'alien',
    'wick',
    'star wars'
  ];

  for (const term of targetTerms) {
    tasks.push({ name: `Search: "${term}"`, params: { query_term: term, limit: '20' } });
  }

  // 2026 Releases (4 pages of 50)
  for (let page = 1; page <= 4; page++) {
    tasks.push({ name: `Year 2026 (Page ${page})`, params: { query_term: '2026', limit: '50', page: String(page) } });
  }

  // 2025 Releases (8 pages of 50)
  for (let page = 1; page <= 8; page++) {
    tasks.push({ name: `Year 2025 (Page ${page})`, params: { query_term: '2025', limit: '50', page: String(page) } });
  }

  // 2024 Releases (6 pages of 50)
  for (let page = 1; page <= 6; page++) {
    tasks.push({ name: `Year 2024 (Page ${page})`, params: { query_term: '2024', limit: '50', page: String(page) } });
  }

  // Latest releases (14 pages of 50 = 700 movies)
  for (let page = 1; page <= 14; page++) {
    tasks.push({ name: `Latest Date Added (Page ${page})`, params: { sort_by: 'date_added', limit: '50', page: String(page) } });
  }

  // Most downloaded (10 pages of 50 = 500 movies)
  for (let page = 1; page <= 10; page++) {
    tasks.push({ name: `Most Downloaded (Page ${page})`, params: { sort_by: 'download_count', limit: '50', page: String(page) } });
  }

  // Top rated (8 pages of 50 = 400 movies)
  for (let page = 1; page <= 8; page++) {
    tasks.push({ name: `Top Rated 6.5+ (Page ${page})`, params: { sort_by: 'rating', minimum_rating: '6.5', limit: '50', page: String(page) } });
  }

  // Most liked (8 pages of 50 = 400 movies)
  for (let page = 1; page <= 8; page++) {
    tasks.push({ name: `Most Liked (Page ${page})`, params: { sort_by: 'like_count', limit: '50', page: String(page) } });
  }

  // 4K & High-resolution releases
  tasks.push({ name: `4K Ultra HD (Page 1)`, params: { quality: '2160p', limit: '50', page: '1' } });
  tasks.push({ name: `4K Ultra HD (Page 2)`, params: { quality: '2160p', limit: '50', page: '2' } });

  // Popular genres (2 pages each)
  const genres = [
    'Action', 'Sci-Fi', 'Drama', 'Comedy', 'Thriller',
    'Adventure', 'Animation', 'Horror', 'Romance', 'Crime',
    'Mystery', 'Fantasy', 'Family', 'Documentary', 'War'
  ];
  for (const genre of genres) {
    for (let page = 1; page <= 2; page++) {
      tasks.push({ name: `Genre: ${genre} (Page ${page})`, params: { genre, limit: '50', page: String(page), sort_by: 'download_count' } });
    }
  }

  console.log(`📡 Fetching verified catalog across ${tasks.length} queries...`);
  totalApiRequests = tasks.length;
  const allResults = await fetchInBatches(tasks, 6);

  console.log('\n--- Per-Query API Fetch Diagnostics ---');
  let successfulQueries = 0;
  let failedQueries = 0;
  let emptyQueries = 0;

  for (let i = 0; i < allResults.length; i++) {
    const res = allResults[i];
    const count = res.movies ? res.movies.length : 0;
    if (res.status === 'OK') {
      successfulQueries++;
      console.log(`Query ${i + 1}: ${res.name} → ${count} movies (via ${res.usedMirror})`);
      processMovies(res.movies, false);
    } else if (res.status === 'EMPTY_SUCCESS') {
      emptyQueries++;
      console.log(`Query ${i + 1}: ${res.name} → 0 movies (Empty Result via ${res.usedMirror})`);
    } else {
      failedQueries++;
      console.log(`Query ${i + 1}: ${res.name} → FAILED [${res.error}]`);
    }
  }

  // 2. Supplement with Fallback movies ONLY if all real API mirrors failed (0 movies fetched)
  if (movieMap.size === 0) {
    console.log('⚠️ All API mirrors failed. Utilizing fallback catalog...');
    processMovies(FALLBACK_FEATURED_MOVIES, true);
  }

  // Comprehensive Diagnostic Report
  console.log('\n==================================================');
  console.log('📊 CineVault Prerender Build Catalog Diagnostics');
  console.log('==================================================');
  console.log(`Total queries: ${tasks.length}`);
  console.log(`Total API requests: ${totalApiRequests}`);
  console.log(`Successful queries: ${successfulQueries}`);
  console.log(`Failed queries: ${failedQueries}`);
  console.log(`Empty successful queries: ${emptyQueries}`);
  console.log(`Total raw API results: ${totalRawApiResults}`);
  console.log(`Total parsed movies: ${totalParsedMovies}`);
  console.log(`Total fallback movies used: ${fallbackMoviesUsed}`);
  console.log(`Total normalized entries evaluated: ${normalizedCount}`);
  console.log(`Total rejected entries: ${rejectedCount}`);
  if (rejectedCount > 0) {
    console.log(`Rejection breakdown:`, JSON.stringify(rejectionReasons));
  }
  console.log(`Total deduplicated entries: ${deduplicatedCount}`);
  console.log(`Total final canonical movies: ${movieMap.size}`);

  console.log('\n--- API Mirror Diagnostics ---');
  for (const [mirror, diag] of Object.entries(mirrorDiagnostics)) {
    console.log(`Mirror: ${mirror}`);
    console.log(`  • Successful: ${diag.successful}`);
    console.log(`  • Failed: ${diag.failed}`);
    console.log(`  • Empty: ${diag.empty}`);
    if (diag.lastError) {
      console.log(`  • Last error: ${diag.lastError}`);
    }
  }
  console.log('==================================================\n');

  console.log(`✅ Loaded ${movieMap.size} unique canonical movies for prerendering.`);

  const moviesArray = Array.from(movieMap.values());
  let prerenderCount = 0;

  // Prerender each movie into dist/movies/:slug/index.html
  const moviesDir = path.join(distDir, 'movies');
  if (!fs.existsSync(moviesDir)) {
    fs.mkdirSync(moviesDir, { recursive: true });
  }

  for (let i = 0; i < moviesArray.length; i++) {
    const movie = moviesArray[i];
    const slug = getMovieSlug(movie);
    const moviePageDir = path.join(moviesDir, slug);
    if (!fs.existsSync(moviePageDir)) {
      fs.mkdirSync(moviePageDir, { recursive: true });
    }

    // Pick 6 related movies from the same genre or catalog
    const related = moviesArray
      .filter(m => m.id !== movie.id && (m.genres?.[0] === movie.genres?.[0] || !movie.genres?.[0]))
      .slice(0, 6);

    const fullHtml = buildMovieHtml(baseHtmlTemplate, movie, related);
    fs.writeFileSync(path.join(moviePageDir, 'index.html'), fullHtml, 'utf-8');
    fs.writeFileSync(path.join(moviesDir, `${slug}.html`), fullHtml, 'utf-8');
    prerenderCount++;
  }

  console.log(`✨ Successfully generated ${prerenderCount} static movie pages at dist/movies/{slug}/index.html`);

  // Prerender the main root homepage (dist/index.html) with rich featured catalog content
  const homeHtml = buildHomepageHtml(baseHtmlTemplate, moviesArray, movieMap.size);
  fs.writeFileSync(indexHtmlPath, homeHtml, 'utf-8');
  console.log(`🏠 Successfully generated rich pre-rendered homepage at dist/index.html`);

  // Generate verified sitemap.xml
  const xmlLines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${SITE_BASE_URL}/</loc>`,
    '    <changefreq>daily</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>'
  ];

  const sortedMovies = [...moviesArray].sort((a, b) => getMovieSlug(a).localeCompare(getMovieSlug(b)));

  for (const movie of sortedMovies) {
    const slug = getMovieSlug(movie);
    const date = movie.date_uploaded ? movie.date_uploaded.split(' ')[0] : new Date().toISOString().split('T')[0];

    xmlLines.push('  <url>');
    xmlLines.push(`    <loc>${SITE_BASE_URL}/movies/${slug}</loc>`);
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      xmlLines.push(`    <lastmod>${date}</lastmod>`);
    }
    xmlLines.push('    <changefreq>weekly</changefreq>');
    xmlLines.push('    <priority>0.8</priority>');
    xmlLines.push('  </url>');
  }

  xmlLines.push('</urlset>');
  xmlLines.push('');

  const xmlContent = xmlLines.join('\n');

  // Write to both dist/sitemap.xml and public/sitemap.xml
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xmlContent, 'utf-8');
  const publicDir = path.resolve(__dirname, '../public');
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xmlContent, 'utf-8');
  }

  console.log(`📑 Updated sitemap.xml with ${moviesArray.length + 1} total canonical URLs.`);
}

main().catch(err => {
  console.error('❌ Prerender process failed:', err);
  process.exit(1);
});
