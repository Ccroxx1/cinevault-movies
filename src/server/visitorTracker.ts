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

const IS_VERCEL = !!process.env.VERCEL || !!process.env.NOW_REGION || process.cwd() === '/var/task';
const STATS_FILE = IS_VERCEL
  ? path.join('/tmp', 'visitor_stats.json')
  : path.join(process.cwd(), 'data', 'visitor_stats.json');

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
 * Extract visitor identifier.
 */
export function extractVisitorId(req: any): string {
  if (!req) return 'anon_' + crypto.randomBytes(8).toString('hex');

  if (req.body?.visitorId && typeof req.body.visitorId === 'string' && req.body.visitorId.length >= 3) {
    const rawId = req.body.visitorId.trim().slice(0, 100);
    const hash = crypto.createHash('sha256').update(rawId).digest('hex').substring(0, 24);
    return `cv_${hash}`;
  }

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
 * Read baseline visitor count.
 */
export function loadBaselineStats(): VisitorStatsData {
  if (isInitialized) return statsCache;

  try {
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
        const resolvedToday = parsedDate === todayUtc ? Math.max(parsedToday, todayKnown.length) : 0;

        statsCache.totalVisitors = Math.max(parsedTotal, known.length, resolvedToday);
        baselineTotal = statsCache.totalVisitors;

        if (parsedDate === todayUtc) {
          statsCache.lastDate = todayUtc;
          statsCache.todayVisitorIds = todayKnown;
          statsCache.todayVisitors = resolvedToday;
          baselineToday = statsCache.todayVisitors;
        } else {
          statsCache.lastDate = todayUtc;
          statsCache.todayVisitorIds = [];
          statsCache.todayVisitors = 0;
          baselineToday = 0;
        }
      }
    } else if (!IS_VERCEL) {
      saveStatsToDisk();
    }
  } catch (err) {
    // Fail silently in production
  }

  isInitialized = true;
  return statsCache;
}

/**
 * Persist current stats snapshot safely.
 */
export function saveStatsToDisk(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(() => {
    try {
      const statsDir = path.dirname(STATS_FILE);
      if (!fs.existsSync(statsDir)) {
        try {
          fs.mkdirSync(statsDir, { recursive: true });
        } catch (e) {
          return;
        }
      }

      if (statsCache.knownVisitorIds.length > 20000) {
        statsCache.knownVisitorIds = statsCache.knownVisitorIds.slice(-15000);
      }
      if (statsCache.todayVisitorIds.length > 10000) {
        statsCache.todayVisitorIds = statsCache.todayVisitorIds.slice(-8000);
      }

      statsCache.totalVisitors = Math.max(statsCache.totalVisitors, statsCache.todayVisitors);

      try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(statsCache, null, 2), 'utf-8');
      } catch (e) {
        // Fail silently
      }
    } catch (err) {
      // Catch-all
    }
  }, 100);
}

/**
 * Execute pipeline commands against Upstash Redis REST API.
 */
export async function executeUpstashPipeline(commands: any[][]): Promise<any[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

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

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;

    const hasError = data.some(item => item && item.error);
    if (hasError) return null;

    return data.map(item => item?.result);
  } catch (err: any) {
    clearTimeout(timeoutId);
    return null;
  }
}

function parseRedisInt(val: any, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

async function syncAuthoritativeTotal(todayCount = 0): Promise<number | null> {
  const probe = await executeUpstashPipeline([
    ['GET', 'cinevault:visitors:total'],
    ['GET', 'cinevault:visitors:baseline_total'],
    ['GET', 'cinevault:visitors'],
    ['GET', 'visitors:total'],
    ['GET', 'cinevault_visitors_total'],
    ['SCARD', 'cinevault:visitors:cloud']
  ]);

  if (!probe || !Array.isArray(probe)) return null;

  const authoritativeMax = Math.max(
    parseRedisInt(probe[0], 0),
    parseRedisInt(probe[1], 0) + parseRedisInt(probe[5], 0),
    parseRedisInt(probe[2], 0),
    parseRedisInt(probe[3], 0),
    parseRedisInt(probe[4], 0),
    parseRedisInt(probe[5], 0),
    todayCount,
    baselineTotal,
    statsCache.totalVisitors
  );

  if (parseRedisInt(probe[0], 0) < authoritativeMax && authoritativeMax > 0) {
    await executeUpstashPipeline([
      ['SET', 'cinevault:visitors:total', authoritativeMax.toString()]
    ]);
  }

  return authoritativeMax;
}

export async function recordVisitorHit(req: any): Promise<VisitorTrackResult> {
  if (!isInitialized) loadBaselineStats();

  const visitorId = extractVisitorId(req);
  const todayUtc = new Date().toISOString().split('T')[0];

  const pipeline = await executeUpstashPipeline([
    ['SADD', 'cinevault:visitors:cloud', visitorId],
    ['SADD', `cinevault:visitors:daily:${todayUtc}`, visitorId],
    ['EXPIRE', `cinevault:visitors:daily:${todayUtc}`, 604800],
    ['SCARD', `cinevault:visitors:daily:${todayUtc}`],
    ['GET', 'cinevault:visitors:total']
  ]);

  if (pipeline && Array.isArray(pipeline)) {
    const isNewLifetime = pipeline[0] === 1;
    const todayCount = parseRedisInt(pipeline[3], 1);
    let redisTotal = parseRedisInt(pipeline[4], 0);

    if (redisTotal === 0 || redisTotal < todayCount) {
      const synced = await syncAuthoritativeTotal(todayCount);
      redisTotal = synced ?? Math.max(todayCount, baselineTotal);
    }

    if (isNewLifetime) {
      const incrRes = await executeUpstashPipeline([['INCR', 'cinevault:visitors:total']]);
      if (incrRes && Array.isArray(incrRes)) {
        redisTotal = parseRedisInt(incrRes[0], redisTotal + 1);
      } else {
        redisTotal += 1;
      }
    }

    const finalTotal = Math.max(redisTotal, todayCount, 1);
    statsCache.totalVisitors = finalTotal;
    statsCache.todayVisitors = todayCount;
    statsCache.lastDate = todayUtc;

    if (!statsCache.knownVisitorIds.includes(visitorId)) statsCache.knownVisitorIds.push(visitorId);
    if (!statsCache.todayVisitorIds.includes(visitorId)) statsCache.todayVisitorIds.push(visitorId);

    saveStatsToDisk();

    return { totalVisitors: finalTotal, todayVisitors: todayCount, isNew: isNewLifetime, status: 'ok', source: 'cloud_redis' };
  }

  if (statsCache.lastDate !== todayUtc) {
    statsCache.lastDate = todayUtc;
    statsCache.todayVisitors = 0;
    statsCache.todayVisitorIds = [];
  }

  let isNewLifetime = false;
  if (!statsCache.knownVisitorIds.includes(visitorId)) {
    statsCache.knownVisitorIds.push(visitorId);
    isNewLifetime = true;
  }

  if (!statsCache.todayVisitorIds.includes(visitorId)) {
    statsCache.todayVisitors += 1;
    statsCache.todayVisitorIds.push(visitorId);
  }

  statsCache.totalVisitors = Math.max(statsCache.totalVisitors + (isNewLifetime ? 1 : 0), statsCache.todayVisitors, 1);
  saveStatsToDisk();

  return { totalVisitors: statsCache.totalVisitors, todayVisitors: statsCache.todayVisitors, isNew: isNewLifetime, status: 'ok', source: 'local_fallback' };
}

export async function getVisitorStats(): Promise<{ totalVisitors: number; todayVisitors: number; status: 'ok'; source: 'cloud_redis' | 'local_fallback' }> {
  if (!isInitialized) loadBaselineStats();

  const todayUtc = new Date().toISOString().split('T')[0];

  const redisResults = await executeUpstashPipeline([
    ['GET', 'cinevault:visitors:total'],
    ['SCARD', `cinevault:visitors:daily:${todayUtc}`],
    ['SCARD', 'cinevault:visitors:cloud']
  ]);

  if (redisResults && Array.isArray(redisResults)) {
    let rawTotal = parseRedisInt(redisResults[0], 0);
    const todayCount = parseRedisInt(redisResults[1], 0);
    const cloudSetCount = parseRedisInt(redisResults[2], 0);

    if (rawTotal === 0 || rawTotal < todayCount) {
      const synced = await syncAuthoritativeTotal(Math.max(todayCount, cloudSetCount));
      rawTotal = synced ?? Math.max(todayCount, cloudSetCount, baselineTotal);
    }

    const total = Math.max(rawTotal, todayCount, cloudSetCount, 1);
    statsCache.totalVisitors = total;
    statsCache.todayVisitors = todayCount;
    statsCache.lastDate = todayUtc;
    saveStatsToDisk();

    return { totalVisitors: total, todayVisitors: todayCount, status: 'ok', source: 'cloud_redis' };
  }

  if (statsCache.lastDate !== todayUtc) {
    statsCache.lastDate = todayUtc;
    statsCache.todayVisitors = 0;
    statsCache.todayVisitorIds = [];
    saveStatsToDisk();
  }

  return { totalVisitors: Math.max(statsCache.totalVisitors, 1), todayVisitors: statsCache.todayVisitors, status: 'ok', source: 'local_fallback' };
}
