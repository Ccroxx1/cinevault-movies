/**
 * CineVault Sequential Image Fallback Utility
 * Provides robust fallback assets and helper functions to prevent broken image states.
 * Replaces yts.mx with yts.gg for fast and reliable image CDN delivery.
 */

// Elegant, zero-dependency SVG Data URI for CineVault Poster Fallback
export const CINEVAULT_POSTER_FALLBACK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231a0b12"/><stop offset="50%" stop-color="%230f0f14"/><stop offset="100%" stop-color="%23050508"/></linearGradient><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="%23e11d48"/><stop offset="100%" stop-color="%23f59e0b"/></linearGradient></defs><rect width="500" height="750" fill="url(%23g)"/><rect x="20" y="20" width="460" height="710" rx="20" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/><circle cx="250" cy="300" r="70" fill="rgba(225,29,72,0.12)" stroke="rgba(225,29,72,0.4)" stroke-width="3"/><path d="M225 260 L295 300 L225 340 Z" fill="url(%23rg)"/><text x="250" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="%23ffffff" text-anchor="middle" letter-spacing="2">CINEVAULT</text><text x="250" y="475" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="%23f43f5e" text-anchor="middle" letter-spacing="4">BY SASUU</text><text x="250" y="520" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="rgba(255,255,255,0.4)" text-anchor="middle">HD CATALOG &amp; TORRENTS</text></svg>`;

// Elegant, zero-dependency SVG Data URI for CineVault Backdrop Fallback
export const CINEVAULT_BACKDROP_FALLBACK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231c0a10"/><stop offset="50%" stop-color="%230c0c12"/><stop offset="100%" stop-color="%23050505"/></linearGradient></defs><rect width="1280" height="720" fill="url(%23bg)"/><circle cx="640" cy="360" r="140" fill="rgba(225,29,72,0.06)"/><text x="640" y="375" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" fill="rgba(255,255,255,0.15)" text-anchor="middle" letter-spacing="6">CINEVAULT BY SASUU</text></svg>`;

/**
 * Normalizes any movie image URL to use yts.gg instead of yts.mx
 */
export function normalizeImageUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  let cleanUrl = url.trim();
  if (!cleanUrl) return '';

  // Replace yts.mx domains with yts.gg for superior image loading and uptime
  cleanUrl = cleanUrl
    .replace(/^http:\/\/img\.yts\.mx\//i, 'https://img.yts.gg/')
    .replace(/^https:\/\/img\.yts\.mx\//i, 'https://img.yts.gg/')
    .replace(/^http:\/\/yts\.mx\//i, 'https://yts.gg/')
    .replace(/^https:\/\/yts\.mx\//i, 'https://yts.gg/')
    .replace(/img\.yts\.mx/gi, 'img.yts.gg')
    .replace(/yts\.mx/gi, 'yts.gg');

  return cleanUrl;
}

/**
 * Generates an array of fallback candidate URLs for a given image,
 * ensuring yts.gg is tried first followed by secondary mirrors before local fallback.
 */
function buildImageVariants(url?: string): string[] {
  if (!url) return [];
  const normalized = normalizeImageUrl(url);
  if (!normalized) return [];

  const variants = [normalized];

  // If it's a yts.gg url, also add yts.am, yts.lt as secondary CDN mirrors
  if (normalized.includes('yts.gg')) {
    variants.push(normalized.replace(/yts\.gg/gi, 'yts.am'));
    variants.push(normalized.replace(/yts\.gg/gi, 'yts.lt'));
  }

  return variants;
}

/**
 * Returns an ordered array of candidate poster URLs from highest preference to lowest.
 * Sequence: medium_cover_image -> large_cover_image -> small_cover_image -> local fallback
 */
export function getPosterCandidates(movie?: {
  medium_cover_image?: string;
  large_cover_image?: string;
  small_cover_image?: string;
} | null): string[] {
  if (!movie) return [CINEVAULT_POSTER_FALLBACK];

  const rawList = [
    ...buildImageVariants(movie.medium_cover_image),
    ...buildImageVariants(movie.large_cover_image),
    ...buildImageVariants(movie.small_cover_image),
    CINEVAULT_POSTER_FALLBACK,
  ].filter(Boolean) as string[];

  // Deduplicate while preserving sequence order
  return Array.from(new Set(rawList));
}

/**
 * Returns an ordered array of candidate backdrop URLs from highest preference to lowest.
 * Sequence: background_image_original -> background_image -> large_screenshots -> covers -> local backdrop fallback
 */
export function getBackdropCandidates(movie?: {
  background_image_original?: string;
  background_image?: string;
  large_screenshot_image1?: string;
  large_screenshot_image2?: string;
  large_cover_image?: string;
  medium_cover_image?: string;
  small_cover_image?: string;
} | null): string[] {
  if (!movie) return [CINEVAULT_BACKDROP_FALLBACK];

  const rawList = [
    ...buildImageVariants(movie.background_image_original),
    ...buildImageVariants(movie.background_image),
    ...buildImageVariants(movie.large_screenshot_image1),
    ...buildImageVariants(movie.large_screenshot_image2),
    ...buildImageVariants(movie.large_cover_image),
    ...buildImageVariants(movie.medium_cover_image),
    ...buildImageVariants(movie.small_cover_image),
    CINEVAULT_BACKDROP_FALLBACK,
  ].filter(Boolean) as string[];

  return Array.from(new Set(rawList));
}

