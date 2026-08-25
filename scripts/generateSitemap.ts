import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_BASE_URL = 'https://cinevault-movies-one.vercel.app';

const MIRRORS = [
  'https://movies-api.accel.li/api/v2/list_movies.json',
  'https://yts.mx/api/v2/list_movies.json',
  'https://yts.lt/api/v2/list_movies.json',
  'https://yts.am/api/v2/list_movies.json'
];

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

function getMovieSlug(movie: { title: string; year?: number; slug?: string }): string {
  if (movie.slug && movie.slug.trim()) {
    return slugify(movie.slug);
  }
  const baseTitle = slugify(movie.title || 'movie');
  if (movie.year && !baseTitle.endsWith(String(movie.year))) {
    return `${baseTitle}-${movie.year}`;
  }
  return baseTitle;
}

async function fetchPage(params: Record<string, string>): Promise<any[]> {
  const qs = new URLSearchParams(params).toString();
  for (const mirror of MIRRORS) {
    try {
      const url = `${mirror}?${qs}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) continue;
      const json = await res.json();
      if (json?.data?.movies && Array.isArray(json.data.movies)) {
        return json.data.movies;
      }
    } catch {
      // try next mirror
    }
  }
  return [];
}

async function fetchInBatches(tasks: (() => Promise<any[]>)[], concurrency = 5): Promise<any[][]> {
  const results: any[][] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchRes = await Promise.all(batch.map(fn => fn()));
    results.push(...batchRes);
  }
  return results;
}

async function main() {
  console.log('Generating sitemap from live verified movie catalog...');
  const movieMap = new Map<string, { id: number; slug: string; date: string }>();
  const seenIds = new Set<number>();

  const processMovies = (movies: any[]) => {
    for (const m of movies) {
      if (!m || !m.title) continue;
      const id = Number(m.id);
      if (id && seenIds.has(id)) continue;
      if (id) seenIds.add(id);

      const slug = getMovieSlug(m);
      if (slug && !movieMap.has(slug)) {
        const date = m.date_uploaded ? m.date_uploaded.split(' ')[0] : new Date().toISOString().split('T')[0];
        movieMap.set(slug, { id, slug, date });
      }
    }
  };

  const tasks: (() => Promise<any[]>)[] = [];

  // 1. Latest releases (12 pages)
  for (let page = 1; page <= 12; page++) {
    tasks.push(() => fetchPage({ sort_by: 'date_added', limit: '50', page: String(page) }));
  }

  // 2. Most downloaded (10 pages)
  for (let page = 1; page <= 10; page++) {
    tasks.push(() => fetchPage({ sort_by: 'download_count', limit: '50', page: String(page) }));
  }

  // 3. Top rated (8 pages)
  for (let page = 1; page <= 8; page++) {
    tasks.push(() => fetchPage({ sort_by: 'rating', minimum_rating: '6.5', limit: '50', page: String(page) }));
  }

  // 4. Most liked (8 pages)
  for (let page = 1; page <= 8; page++) {
    tasks.push(() => fetchPage({ sort_by: 'like_count', limit: '50', page: String(page) }));
  }

  // 5. Popular genres
  const genres = ['Action', 'Sci-Fi', 'Drama', 'Comedy', 'Thriller', 'Adventure', 'Animation', 'Horror', 'Romance', 'Crime', 'Mystery', 'Fantasy'];
  for (const genre of genres) {
    for (let page = 1; page <= 3; page++) {
      tasks.push(() => fetchPage({ genre, limit: '50', page: String(page), sort_by: 'download_count' }));
    }
  }

  console.log(`Executing ${tasks.length} catalog queries with concurrency...`);
  const allResults = await fetchInBatches(tasks, 8);
  for (const res of allResults) {
    if (res && res.length > 0) {
      processMovies(res);
    }
  }

  console.log(`Verified ${movieMap.size} unique canonical movie records.`);

  // Build valid XML string
  const xmlLines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${SITE_BASE_URL}/</loc>`,
    '    <changefreq>daily</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>'
  ];

  const sortedMovies = Array.from(movieMap.values()).sort((a, b) => a.slug.localeCompare(b.slug));

  for (const { slug, date } of sortedMovies) {
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
  const targetPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(targetPath, xmlContent, 'utf-8');
  console.log(`Successfully generated verified sitemap at ${targetPath} with ${movieMap.size + 1} total indexable URLs.`);
}

main().catch(err => {
  console.error('Error generating sitemap:', err);
  process.exit(1);
});
