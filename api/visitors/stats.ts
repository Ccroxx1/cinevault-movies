import { getVisitorStats } from './store.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const stats = await getVisitorStats();

    return res.status(200).json({
      status: 'ok',
      ...stats
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'error',
      totalVisitors: 0,
      todayVisitors: 0
    });
  }
}
