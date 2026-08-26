import { getVisitorStats, loadBaselineStats, getCorsOrigin } from '../../src/server/visitorTracker.js';

export default async function handler(req: any, res: any) {
  const allowedOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const result = await getVisitorStats();
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Error in stats serverless handler:', err);
    const baseline = loadBaselineStats();
    return res.status(200).json({
      status: 'ok',
      totalVisitors: baseline.totalVisitors,
      todayVisitors: baseline.todayVisitors,
      source: 'local_fallback'
    });
  }
}
