import { Movie } from '../types';

export const SITE_BASE_URL = 'https://cinevault-movies-one.vercel.app';
export const SITE_NAME = 'CineVault By Sasuu';
export const DEFAULT_DESCRIPTION = 'Explore, search, and download high-quality curated films with rich metadata, trailers, IMDb ratings, torrents, and magnet links.';
export const DEFAULT_TITLE = 'CineVault By Sasuu — HD Movie Library & Downloads';

/**
 * Standardize text into URL-friendly slug
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word chars
    .replace(/[\s_-]+/g, '-') // collapse whitespace and underscores into single dash
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

/**
 * Generate standard SEO-friendly movie slug: e.g. "inception-2010"
 */
export function getMovieSlug(movie: { title: string; year?: number; slug?: string }): string {
  if (movie.slug && movie.slug.trim()) {
    // If slug is already formatted nicely (e.g. inception-2010), normalize and use it
    return slugify(movie.slug);
  }
  
  const baseTitle = slugify(movie.title || 'movie');
  if (movie.year && !baseTitle.endsWith(String(movie.year))) {
    return `${baseTitle}-${movie.year}`;
  }
  return baseTitle;
}

/**
 * Get internal crawlable path for a movie
 */
export function getMoviePath(movie: { title: string; year?: number; slug?: string }): string {
  return `/movies/${getMovieSlug(movie)}`;
}

/**
 * Get canonical full URL for a movie
 */
export function getMovieCanonicalUrl(movie: { title: string; year?: number; slug?: string }): string {
  return `${SITE_BASE_URL}${getMoviePath(movie)}`;
}

/**
 * Parse slug into title query term and optional year
 */
export function parseMovieSlug(slug: string): { titleQuery: string; year: number | null } {
  if (!slug) return { titleQuery: '', year: null };

  const cleanSlug = slug.replace(/^\/movies\//, '').replace(/^\//, '').replace(/\/$/, '');
  const yearMatch = cleanSlug.match(/^(.*?)-(\d{4})$/);

  if (yearMatch) {
    const rawTitle = yearMatch[1].replace(/-/g, ' ').trim();
    const year = parseInt(yearMatch[2], 10);
    return { titleQuery: rawTitle, year };
  }

  return {
    titleQuery: cleanSlug.replace(/-/g, ' ').trim(),
    year: null
  };
}

export interface SeoMetaOptions {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'video.movie' | 'article';
  movie?: Movie;
  breadcrumbs?: { name: string; item: string }[];
}

/**
 * Helper to update document head tags dynamically for client-side SEO and crawler hydration
 */
export function updateDocumentSeo(options: SeoMetaOptions): void {
  if (typeof document === 'undefined') return;

  const title = options.title || DEFAULT_TITLE;
  const description = (options.description || DEFAULT_DESCRIPTION).slice(0, 160);
  const canonicalUrl = options.canonicalUrl || SITE_BASE_URL;
  const ogImage = options.ogImage || `${SITE_BASE_URL}/favicon-192.png`;
  const ogType = options.ogType || 'website';

  // 1. Update Title
  document.title = title;

  // 2. Helper to set or create meta tag by attribute selector
  const setMetaTag = (selector: string, attrName: string, attrValue: string, content: string) => {
    let el = document.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // Standard Meta & Robots
  setMetaTag('meta[name="description"]', 'name', 'description', description);
  setMetaTag('meta[name="robots"]', 'name', 'robots', 'index, follow, max-image-preview:large');

  // Canonical Link
  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', canonicalUrl);

  // Open Graph Core & Media
  setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
  setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  setMetaTag('meta[property="og:type"]', 'property', 'og:type', ogType);
  setMetaTag('meta[property="og:image"]', 'property', 'og:image', ogImage);
  setMetaTag('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', ogImage);
  setMetaTag('meta[property="og:image:alt"]', 'property', 'og:image:alt', options.movie ? `${options.movie.title} (${options.movie.year || ''}) Official Artwork` : SITE_NAME);
  setMetaTag('meta[property="og:image:width"]', 'property', 'og:image:width', '1200');
  setMetaTag('meta[property="og:image:height"]', 'property', 'og:image:height', '630');
  setMetaTag('meta[property="og:locale"]', 'property', 'og:locale', 'en_US');

  // Video OpenGraph metadata for movie pages
  if (options.movie) {
    const m = options.movie;
    if (m.year) {
      setMetaTag('meta[property="video:release_date"]', 'property', 'video:release_date', String(m.year));
    }
    if (m.runtime) {
      setMetaTag('meta[property="video:duration"]', 'property', 'video:duration', String(m.runtime * 60));
    }
    if (Array.isArray(m.genres)) {
      m.genres.forEach((g) => {
        setMetaTag(`meta[property="video:tag"][content="${g}"]`, 'property', 'video:tag', g);
      });
    }
  }

  // Twitter Card Meta Tags
  setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  setMetaTag('meta[name="twitter:site"]', 'name', 'twitter:site', '@CineVault');
  setMetaTag('meta[name="twitter:creator"]', 'name', 'twitter:creator', '@Sasuu');
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);
  setMetaTag('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', options.movie ? `${options.movie.title} (${options.movie.year || ''}) Poster` : SITE_NAME);

  if (options.movie) {
    const m = options.movie;
    const qualities = m.torrents?.map((t) => t.quality).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    setMetaTag('meta[name="twitter:label1"]', 'name', 'twitter:label1', 'IMDb Rating');
    setMetaTag('meta[name="twitter:data1"]', 'name', 'twitter:data1', m.rating ? `${m.rating.toFixed(1)} / 10 ` : 'Not Rated');
    setMetaTag('meta[name="twitter:label2"]', 'name', 'twitter:label2', 'Quality');
    setMetaTag('meta[name="twitter:data2"]', 'name', 'twitter:data2', qualities || 'HD');
  }

  // 3. Schema.org JSON-LD Structured Data
  let scriptEl = document.getElementById('schema-jsonld') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'schema-jsonld';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }

  const jsonLdGraph: any[] = [];

  // WebSite & SearchAction
  jsonLdGraph.push({
    '@type': 'WebSite',
    '@id': `${SITE_BASE_URL}/#website`,
    'url': SITE_BASE_URL,
    'name': SITE_NAME,
    'alternateName': 'CineVault',
    'description': DEFAULT_DESCRIPTION,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': `${SITE_BASE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  });

  // Organization
  jsonLdGraph.push({
    '@type': 'Organization',
    '@id': `${SITE_BASE_URL}/#organization`,
    'name': SITE_NAME,
    'url': SITE_BASE_URL,
    'logo': {
      '@type': 'ImageObject',
      'url': `${SITE_BASE_URL}/favicon-192.png`,
      'width': '192',
      'height': '192'
    },
    'sameAs': [
      'https://twitter.com/CineVault'
    ]
  });

  // Breadcrumbs
  if (options.breadcrumbs && options.breadcrumbs.length > 0) {
    jsonLdGraph.push({
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}/#breadcrumb`,
      'itemListElement': options.breadcrumbs.map((bc, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': bc.name,
        'item': bc.item.startsWith('http') ? bc.item : `${SITE_BASE_URL}${bc.item}`
      }))
    });
  }

  // WebPage
  jsonLdGraph.push({
    '@type': 'WebPage',
    '@id': `${canonicalUrl}/#webpage`,
    'url': canonicalUrl,
    'name': title,
    'isPartOf': { '@id': `${SITE_BASE_URL}/#website` },
    'description': description,
    'breadcrumb': options.breadcrumbs ? { '@id': `${canonicalUrl}/#breadcrumb` } : undefined
  });

  if (options.movie) {
    const m = options.movie;
    const movieJsonLd: Record<string, any> = {
      '@type': 'Movie',
      '@id': `${canonicalUrl}/#movie`,
      'name': m.title,
      'url': canonicalUrl,
      'mainEntityOfPage': { '@id': `${canonicalUrl}/#webpage` }
    };

    if (m.title_english || m.title_long) {
      movieJsonLd['alternateName'] = m.title_english || m.title_long;
    }

    const validImages = [
      m.large_cover_image,
      m.medium_cover_image,
      m.background_image_original,
      m.background_image
    ].filter(Boolean);
    if (validImages.length > 0) {
      movieJsonLd['image'] = validImages;
    }

    if (m.year && m.year > 1880) {
      movieJsonLd['dateCreated'] = String(m.year);
      movieJsonLd['datePublished'] = String(m.year);
    }

    if (m.language) {
      movieJsonLd['inLanguage'] = m.language;
    }

    if (Array.isArray(m.genres) && m.genres.length > 0) {
      movieJsonLd['genre'] = m.genres;
    }

    const movieDesc = m.description_full || m.summary || m.synopsis || description;
    if (movieDesc && movieDesc.trim()) {
      movieJsonLd['description'] = movieDesc.trim().slice(0, 300);
    }

    if (m.mpa_rating && m.mpa_rating.trim()) {
      movieJsonLd['contentRating'] = m.mpa_rating.trim();
    }

    if (m.runtime && m.runtime > 0) {
      movieJsonLd['duration'] = `PT${m.runtime}M`;
    }

    const genuineRatingCount = (m as any).rating_count || (m as any).votes_count || (m as any).imdb_votes;
    if (m.rating && m.rating > 0 && typeof genuineRatingCount === 'number' && genuineRatingCount > 0) {
      movieJsonLd['aggregateRating'] = {
        '@type': 'AggregateRating',
        'ratingValue': m.rating,
        'bestRating': 10,
        'worstRating': 1,
        'ratingCount': genuineRatingCount
      };
    }

    if (m.cast && Array.isArray(m.cast) && m.cast.length > 0) {
      movieJsonLd['actor'] = m.cast
        .filter(c => c && c.name)
        .map(c => ({
          '@type': 'Person',
          'name': c.name
        }));
    }

    if (m.yt_trailer_code && m.yt_trailer_code.trim()) {
      movieJsonLd['trailer'] = {
        '@type': 'VideoObject',
        'name': `${m.title} Official Trailer`,
        'embedUrl': `https://www.youtube.com/embed/${m.yt_trailer_code}`,
        'thumbnailUrl': `https://img.youtube.com/vi/${m.yt_trailer_code}/hqdefault.jpg`,
        'description': `Official trailer for ${m.title} (${m.year || ''})`.trim(),
        'uploadDate': m.date_uploaded ? new Date(m.date_uploaded).toISOString() : new Date().toISOString()
      };
    }

    jsonLdGraph.push(movieJsonLd);
  }

  scriptEl.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': jsonLdGraph
  });
}

