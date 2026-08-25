export const SITE_BASE_URL = 'https://cinevault-movies-one.vercel.app';
export const SITE_NAME = 'CineVault By Sasuu';

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getMovieSlug(movie: { title: string; year?: number; slug?: string }): string {
  if (movie.slug && movie.slug.trim()) {
    return slugify(movie.slug);
  }
  const baseTitle = slugify(movie.title || 'movie');
  if (movie.year && !baseTitle.endsWith(String(movie.year))) {
    return `${baseTitle}-${movie.year}`;
  }
  return baseTitle;
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
    ${genresArray.map((g: string) => `<meta property="video:tag" content="${escapeHtml(g)}" />`).join('\n    ')}

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
  if (html.includes('<div id="root"></div>')) {
    html = html.replace('<div id="root"></div>', `<div id="root">${semanticBody}</div>`);
  } else {
    html = html.replace(/<div id=["']root["']>[\s\S]*?<\/div>\s*<script/i, `<div id="root">${semanticBody}</div>\n    <script`);
  }

  return html;
}
