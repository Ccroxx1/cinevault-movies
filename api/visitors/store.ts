import fs from 'node:fs';
import path from 'node:path';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
const FALLBACK_FILE = path.join(process.cwd(), 'data', 'visitor_stats.json');

export interface VisitorStats {
  totalVisitors: number;
  todayVisitors: number;
  source: 'cloud_redis' | 'local_fallback';
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function redisPipeline(commands: unknown[][]): Promise<any[] | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(`${REDIS_URL.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || data.some((item: any) => item?.error)) return null;
    return data.map((item: any) => item?.result);
  } catch {
    return null;
  }
}

function readFallback(): VisitorStats {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf8'));
      return {
        totalVisitors: Math.max(0, Number(parsed.totalVisitors) || 0),
        todayVisitors: parsed.lastDate === todayKey() ? Math.max(0, Number(parsed.todayVisitors) || 0) : 0,
        source: 'local_fallback'
      };
    }
  } catch {
    // Ignore fallback read failures.
  }
  return { totalVisitors: 0, todayVisitors: 0, source: 'local_fallback' };
}

async function getBaseline(totalSetCount: number): Promise<number> {
  const existing = await redisPipeline([['GET', 'cinevault:visitors:baseline']]);
  if (existing && typeof existing[0] === 'string' && /^\d+$/.test(existing[0])) {
    return Number(existing[0]);
  }

  // Preserve the existing local counter only when the cloud visitor set is
  // genuinely empty. Once real cloud visitors exist, their count is authoritative.
  const fallback = readFallback();
  const baseline = totalSetCount === 0 ? fallback.totalVisitors : 0;
  await redisPipeline([['SET', 'cinevault:visitors:baseline', String(baseline), 'NX']]);

  const confirmed = await redisPipeline([['GET', 'cinevault:visitors:baseline']]);
  return confirmed && typeof confirmed[0] === 'string' && /^\d+$/.test(confirmed[0])
    ? Number(confirmed[0])
    : baseline;
}

export async function getVisitorStats(): Promise<VisitorStats> {
  const today = todayKey();
  const result = await redisPipeline([
    ['SCARD', 'cinevault:visitors:all'],
    ['SCARD', `cinevault:visitors:daily:${today}`]
  ]);

  if (result && typeof result[0] === 'number') {
    const baseline = await getBaseline(result[0]);
    return {
      totalVisitors: Math.max(0, baseline + result[0]),
      todayVisitors: typeof result[1] === 'number' ? Math.max(0, result[1]) : 0,
      source: 'cloud_redis'
    };
  }

  return readFallback();
}

export async function recordVisitor(visitorId: string): Promise<VisitorStats & { isNew: boolean }> {
  const today = todayKey();
  const safeId = visitorId.slice(0, 120);

  // Establish the baseline before adding this visitor so the first real visit
  // does not accidentally replace the site's existing counter.
  let baseline = 0;
  const before = await redisPipeline([['SCARD', 'cinevault:visitors:all']]);
  if (before && typeof before[0] === 'number') {
    baseline = await getBaseline(before[0]);
  }

  const result = await redisPipeline([
    ['SADD', 'cinevault:visitors:all', safeId],
    ['SCARD', 'cinevault:visitors:all'],
    ['SADD', `cinevault:visitors:daily:${today}`, safeId],
    ['EXPIRE', `cinevault:visitors:daily:${today}`, 691200],
    ['SCARD', `cinevault:visitors:daily:${today}`]
  ]);

  if (result && typeof result[1] === 'number') {
    return {
      totalVisitors: baseline + result[1],
      todayVisitors: typeof result[4] === 'number' ? result[4] : 0,
      isNew: result[0] === 1,
      source: 'cloud_redis'
    };
  }

  // Local development fallback only. Vercel does not provide durable local storage.
  const fallback = readFallback();
  return {
    ...fallback,
    totalVisitors: fallback.totalVisitors + 1,
    todayVisitors: fallback.todayVisitors + 1,
    isNew: true
  };
}
