import { recordVisitorHit, getVisitorStats, loadBaselineStats, getCorsOrigin } from '../../src/server/visitorTracker.js';

export default async function handler(req: any, res: any) {
  const allowedOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const result = await recordVisitorHit(req);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Error in hit serverless handler:', err);
    try {
      const fallbackStats = await getVisitorStats();
      return res.status(200).json({
        ...fallbackStats,
        isNew: false
      });
    } catch {
      const baseline = loadBaselineStats();
      return res.status(200).json({
        status: 'ok',
        totalVisitors: baseline.totalVisitors,
        todayVisitors: baseline.todayVisitors,
        isNew: false,
        source: 'local_fallback'
      });
    }
  }
}
