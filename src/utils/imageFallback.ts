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
 * Sequence: large_cover_image (500x750 sharp) -> medium_cover_image -> small_cover_image -> local fallback
 */
export function getPosterCandidates(movie?: {
  medium_cover_image?: string;
  large_cover_image?: string;
  small_cover_image?: string;
} | null): string[] {
  if (!movie) return [CINEVAULT_POSTER_FALLBACK];

  const rawList = [
    ...buildImageVariants(movie.large_cover_image),
    ...buildImageVariants(movie.medium_cover_image),
    ...buildImageVariants(movie.small_cover_image),
    CINEVAULT_POSTER_FALLBACK,
  ].filter((s) => typeof s === 'string' && s.trim().length > 0) as string[];

  // Deduplicate while preserving sequence order
  return Array.from(new Set(rawList));
}

/**
 * Checks if a given image URL matches YTS pre-blurred 896x375 background.jpg
 */
function isYtsBlurryBackground(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return (lower.includes('yts.') || lower.includes('/assets/images/movies/')) && lower.endsWith('background.jpg');
}

/**
 * Extracts the base directory from a YTS movie asset URL
 * e.g. "https://img.yts.gg/assets/images/movies/dune_2021/background.jpg" -> ".../dune_2021"
 */
function extractYtsMovieBaseDir(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = normalizeImageUrl(url);
  const match = clean.match(/(https?:\/\/[^\/]+\/assets\/images\/movies\/[^\/]+)/i);
  return match ? match[1] : null;
}

/**
 * Returns an ordered array of candidate backdrop URLs from highest preference to lowest.
 * Priority:
 * 1. High-resolution movie screenshots (large_screenshot_image1/2/3 - 1280x720/1280x536 crystal sharp frame)
 * 2. Derived high-res screenshots from YTS CDN directory if not explicitly passed
 * 3. High-resolution non-blurry original backdrops (Unsplash, TMDB, custom CDN)
 * 4. High-resolution cover artwork (large_cover_image - 500x750 crisp poster)
 * 5. Medium cover artwork
 * 6. Low-resolution / pre-blurred background.jpg (only as penultimate fallback)
 * 7. CineVault SVG backdrop fallback
 */
export function getBackdropCandidates(movie?: {
  background_image_original?: string;
  background_image?: string;
  large_screenshot_image1?: string;
  large_screenshot_image2?: string;
  large_screenshot_image3?: string;
  large_cover_image?: string;
  medium_cover_image?: string;
  small_cover_image?: string;
} | null): string[] {
  if (!movie) return [CINEVAULT_BACKDROP_FALLBACK];

  const rawList: string[] = [];

  // 1. Explicit high-resolution screenshots (1280x720 / 1280x536 sharp BluRay frames)
  if (movie.large_screenshot_image1) {
    rawList.push(...buildImageVariants(movie.large_screenshot_image1));
  }
  if (movie.large_screenshot_image2) {
    rawList.push(...buildImageVariants(movie.large_screenshot_image2));
  }
  if (movie.large_screenshot_image3) {
    rawList.push(...buildImageVariants(movie.large_screenshot_image3));
  }

  // 2. Automatically derive large screenshots from YTS movie asset directory if available
  const anyMovieUrl = [
    movie.background_image_original,
    movie.background_image,
    movie.large_cover_image,
    movie.medium_cover_image,
  ].find(Boolean);

  const ytsBaseDir = extractYtsMovieBaseDir(anyMovieUrl);
  if (ytsBaseDir) {
    rawList.push(...buildImageVariants(`${ytsBaseDir}/large-screenshot1.jpg`));
    rawList.push(...buildImageVariants(`${ytsBaseDir}/large-screenshot2.jpg`));
    rawList.push(...buildImageVariants(`${ytsBaseDir}/large-screenshot3.jpg`));
  }

  // 3. High-resolution non-blurry backdrops (e.g. Unsplash, TMDB, custom wallpapers)
  if (movie.background_image_original && !isYtsBlurryBackground(movie.background_image_original)) {
    rawList.push(...buildImageVariants(movie.background_image_original));
  }
  if (movie.background_image && !isYtsBlurryBackground(movie.background_image)) {
    rawList.push(...buildImageVariants(movie.background_image));
  }

  // 4. Sharp high-resolution cover artwork (500x750 crisp movie poster)
  if (movie.large_cover_image) {
    rawList.push(...buildImageVariants(movie.large_cover_image));
  }
  if (movie.medium_cover_image) {
    rawList.push(...buildImageVariants(movie.medium_cover_image));
  }

  // 5. YTS pre-blurred background.jpg (placed only as a last resort before SVG)
  if (movie.background_image_original && isYtsBlurryBackground(movie.background_image_original)) {
    rawList.push(...buildImageVariants(movie.background_image_original));
  }
  if (movie.background_image && isYtsBlurryBackground(movie.background_image)) {
    rawList.push(...buildImageVariants(movie.background_image));
  }

  // 6. SVG Backdrop fallback
  rawList.push(CINEVAULT_BACKDROP_FALLBACK);

  return Array.from(
    new Set(rawList.filter((s) => typeof s === 'string' && s.trim().length > 0))
  );
}

