import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface VisitorStatsData {
  totalVisitors: number;
  knownVisitorIds: string[];
  todayVisitors: number;
  todayVisitorIds: string[];
  lastDate: string;
}

export interface VisitorTrackResult {
  totalVisitors: number;
  todayVisitors: number;
  isNew: boolean;
  status: 'ok' | 'error';
  source: 'cloud_redis' | 'local_fallback';
}

const STATS_FILE = path.join(process.cwd(), 'data', 'visitor_stats.json');

// Memory state cache initialized with baseline from local JSON
let statsCache: VisitorStatsData = {
  totalVisitors: 0,
  knownVisitorIds: [],
  todayVisitors: 0,
  todayVisitorIds: [],
  lastDate: new Date().toISOString().split('T')[0]
};

let baselineTotal = 0;
let baselineToday = 0;
let isInitialized = false;
let saveDebounceTimer: NodeJS.Timeout | null = null;

/**
 * Determine CORS allowed origin safely without blanket '*'
 */
export function getCorsOrigin(req: any): string {
  const origin = req?.headers?.origin || req?.headers?.Origin || '';
  const allowedOrigins = [
    'https://cinevault-movies-one.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];

  if (process.env.APP_URL) {
    try {
      const appUrlOrigin = new URL(process.env.APP_URL).origin;
      allowedOrigins.push(appUrlOrigin);
    } catch {
      // Ignore invalid APP_URL parse
    }
  }

  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  // Allow local development ports dynamically
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return origin;
  }

  return 'https://cinevault-movies-one.vercel.app';
}

/**
 * Anonymize visitor IP using SHA-256 hashing.
 * Raw IP addresses are NEVER persisted or returned.
 */
export function anonymizeIp(rawIp: string): string {
  if (!rawIp || rawIp === 'unknown' || rawIp === '127.0.0.1' || rawIp === '::1') {
    return 'anon_' + crypto.randomBytes(8).toString('hex');
  }
  const cleanIp = rawIp.split(',')[0].trim();
  const hash = crypto.createHash('sha256').update(cleanIp).digest('hex').substring(0, 24);
  return `anon_${hash}`;
}

/**
 * Extract and anonymize visitor identifier from an Express / Serverless HTTP Request.
 * Does not store names, emails, credentials, or raw IP addresses.
 */
export function extractVisitorId(req: any): string {
  if (!req) return 'anon_' + crypto.randomBytes(8).toString('hex');

  // If a browser-generated UUID is sent in JSON body, hash with SHA-256 for consistent anonymity
  if (req.body?.visitorId && typeof req.body.visitorId === 'string' && req.body.visitorId.length >= 3) {
    const rawId = req.body.visitorId.trim().slice(0, 100);
    const hash = crypto.createHash('sha256').update(rawId).digest('hex').substring(0, 24);
    return `cv_${hash}`;
  }

  // Fallback: Anonymize IP address
  const forwarded = req.headers?.['x-forwarded-for'];
  const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : '') ||
    req.headers?.['x-real-ip'] ||
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    'anon';

  return anonymizeIp(rawIp);
}

/**
 * Read baseline visitor count from local JSON file upon startup.
 * Ensures statistics are preserved and never reset during cold boots or migrations.
 */
export function loadBaselineStats(): VisitorStatsData {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const todayUtc = new Date().toISOString().split('T')[0];

    if (fs.existsSync(STATS_FILE)) {
      const raw = fs.readFileSync(STATS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === 'object') {
        const known = Array.isArray(parsed.knownVisitorIds) ? parsed.knownVisitorIds : [];
        const todayKnown = Array.isArray(parsed.todayVisitorIds) ? parsed.todayVisitorIds : [];
        const parsedTotal = typeof parsed.totalVisitors === 'number' ? parsed.totalVisitors : 0;
        const parsedToday = typeof parsed.todayVisitors === 'number' ? parsed.todayVisitors : 0;
        const parsedDate = parsed.lastDate || todayUtc;

        statsCache.knownVisitorIds = known;
        statsCache.totalVisitors = Math.max(parsedTotal, known.length);
        baselineTotal = statsCache.totalVisitors;

        if (parsedDate === todayUtc) {
          statsCache.lastDate = todayUtc;
          statsCache.todayVisitorIds = todayKnown;
          statsCache.todayVisitors = Math.max(parsedToday, todayKnown.length);
          baselineToday = statsCache.todayVisitors;
        } else {
          statsCache.lastDate = todayUtc;
          statsCache.todayVisitorIds = [];
          statsCache.todayVisitors = 0;
          baselineToday = 0;
        }
      }
    } else {
      saveStatsToDisk();
    }
  } catch (err) {
    console.warn('[VisitorTracker] Note reading baseline stats:', err);
  }

  isInitialized = true;
  return statsCache;
}

/**
 * Persist current stats snapshot to local JSON file safely.
 */
export function saveStatsToDisk(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(() => {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Compact memory sets if large to preserve memory & disk performance
      if (statsCache.knownVisitorIds.length > 20000) {
        statsCache.knownVisitorIds = statsCache.knownVisitorIds.slice(-15000);
      }
      if (statsCache.todayVisitorIds.length > 10000) {
        statsCache.todayVisitorIds = statsCache.todayVisitorIds.slice(-8000);
      }

      fs.writeFileSync(STATS_FILE, JSON.stringify(statsCache, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[VisitorTracker] Error writing local visitor stats:', err);
    }
  }, 80);
}

/**
 * Execute pipeline commands against Upstash Redis REST API with 3.5s AbortController timeout.
 */
export async function executeUpstashPipeline(commands: any[][]): Promise<any[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const cleanUrl = url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[VisitorTracker] Upstash Redis HTTP status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data)) return null;

    // Check for individual Redis command errors
    const hasError = data.some(item => item && item.error);
    if (hasError) {
      console.warn('[VisitorTracker] Upstash Redis command error, falling back to local storage');
      return null;
    }

    return data.map(item => item?.result);
  } catch (err: any) {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Record a visitor hit (POST /api/visitors/hit)
 * Uses Redis atomic baseline initialization and Redis set deduplication.
 * Authoritative total = baseline_total + unique cloud visitors recorded in Set.
 */
export async function recordVisitorHit(req: any): Promise<VisitorTrackResult> {
  if (!isInitialized) {
    loadBaselineStats();
  }

  const visitorId = extractVisitorId(req);
  const todayUtc = new Date().toISOString().split('T')[0];

  // Pipeline commands:
  // 1. Atomically set baseline_total if not already initialized (NX)
  // 2. Fetch authoritative baseline_total from Redis
  // 3. Atomically add visitor to cloud unique set (returns 1 if new, 0 if exists)
  // 4. Get total unique cloud visitors recorded after baseline
  // 5. Atomically add visitor to daily UTC set
  // 6. Set 7-day TTL on daily set
  // 7. Get today's unique visitor count
  const redisResults = await executeUpstashPipeline([
    ['SET', 'cinevault:visitors:baseline_total', baselineTotal.toString(), 'NX'],
    ['GET', 'cinevault:visitors:baseline_total'],
    ['SADD', 'cinevault:visitors:cloud', visitorId],
    ['SCARD', 'cinevault:visitors:cloud'],
    ['SADD', `cinevault:visitors:daily:${todayUtc}`, visitorId],
    ['EXPIRE', `cinevault:visitors:daily:${todayUtc}`, 604800],
    ['SCARD', `cinevault:visitors:daily:${todayUtc}`]
  ]);

  if (redisResults && Array.isArray(redisResults) && typeof redisResults[3] === 'number') {
    const rawBaseline = redisResults[1];
    const redisBaseline = typeof rawBaseline === 'string' ? parseInt(rawBaseline, 10) : (typeof rawBaseline === 'number' ? rawBaseline : baselineTotal);
    const authoritativeBaseline = isNaN(redisBaseline) ? baselineTotal : redisBaseline;
    
    const isNewLifetime = redisResults[2] === 1;
    const cloudUniqueCount = redisResults[3];
    const total = authoritativeBaseline + cloudUniqueCount;
    const todayCount = typeof redisResults[6] === 'number' ? redisResults[6] : 0;

    statsCache.totalVisitors = Math.max(statsCache.totalVisitors, total);
    statsCache.todayVisitors = Math.max(statsCache.todayVisitors, todayCount);
    statsCache.lastDate = todayUtc;

    if (!statsCache.knownVisitorIds.includes(visitorId)) {
      statsCache.knownVisitorIds.push(visitorId);
    }
    if (!statsCache.todayVisitorIds.includes(visitorId)) {
      statsCache.todayVisitorIds.push(visitorId);
    }

    saveStatsToDisk();

    return {
      totalVisitors: total,
      todayVisitors: todayCount,
      isNew: isNewLifetime,
      status: 'ok',
      source: 'cloud_redis'
    };
  }

  // Fallback Layer: Local JSON and in-memory set tracking
  if (statsCache.lastDate !== todayUtc) {
    statsCache.lastDate = todayUtc;
    statsCache.todayVisitors = 0;
    statsCache.todayVisitorIds = [];
  }

  let isNewLifetime = false;
  let modified = false;

  if (!statsCache.knownVisitorIds.includes(visitorId)) {
    statsCache.totalVisitors += 1;
    statsCache.knownVisitorIds.push(visitorId);
    isNewLifetime = true;
    modified = true;
  }

  if (!statsCache.todayVisitorIds.includes(visitorId)) {
    statsCache.todayVisitors += 1;
    statsCache.todayVisitorIds.push(visitorId);
    modified = true;
  }

  if (modified) {
    saveStatsToDisk();
  }

  return {
    totalVisitors: statsCache.totalVisitors,
    todayVisitors: statsCache.todayVisitors,
    isNew: isNewLifetime,
    status: 'ok',
    source: 'local_fallback'
  };
}

/**
 * Get current visitor statistics without incrementing (GET /api/visitors/stats)
 */
export async function getVisitorStats(): Promise<{ totalVisitors: number; todayVisitors: number; status: 'ok'; source: 'cloud_redis' | 'local_fallback' }> {
  if (!isInitialized) {
    loadBaselineStats();
  }

  const todayUtc = new Date().toISOString().split('T')[0];

  // Try Primary Layer: Upstash Redis
  const redisResults = await executeUpstashPipeline([
    ['GET', 'cinevault:visitors:baseline_total'],
    ['SCARD', 'cinevault:visitors:cloud'],
    ['SCARD', `cinevault:visitors:daily:${todayUtc}`]
  ]);

  if (redisResults && Array.isArray(redisResults) && typeof redisResults[1] === 'number') {
    const rawBaseline = redisResults[0];
    const redisBaseline = typeof rawBaseline === 'string' ? parseInt(rawBaseline, 10) : (typeof rawBaseline === 'number' ? rawBaseline : baselineTotal);
    const authoritativeBaseline = isNaN(redisBaseline) ? baselineTotal : redisBaseline;

    const cloudUniqueCount = redisResults[1];
    const total = authoritativeBaseline + cloudUniqueCount;
    const todayCount = typeof redisResults[2] === 'number' ? redisResults[2] : 0;

    statsCache.totalVisitors = Math.max(statsCache.totalVisitors, total);
    statsCache.todayVisitors = Math.max(statsCache.todayVisitors, todayCount);
    statsCache.lastDate = todayUtc;
    saveStatsToDisk();

    return {
      totalVisitors: total,
      todayVisitors: todayCount,
      status: 'ok',
      source: 'cloud_redis'
    };
  }

  // Fallback Layer: Local cached numbers
  if (statsCache.lastDate !== todayUtc) {
    statsCache.lastDate = todayUtc;
    statsCache.todayVisitors = 0;
    statsCache.todayVisitorIds = [];
    saveStatsToDisk();
  }

  return {
    totalVisitors: statsCache.totalVisitors,
    todayVisitors: statsCache.todayVisitors,
    status: 'ok',
    source: 'local_fallback'
  };
}
