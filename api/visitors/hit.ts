import { recordVisitor } from './store.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const visitorId = (req.body?.visitorId || req.headers['x-forwarded-for'] || 'anon').toString().slice(0, 100);
    const stats = await recordVisitor(visitorId);

    return res.status(200).json({
      status: 'ok',
      ...stats
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'error',
      totalVisitors: 0,
      todayVisitors: 0,
      isNew: false
    });
  }
}
