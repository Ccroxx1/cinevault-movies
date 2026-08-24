import { recordVisitor } from './store';

function getClientId(req: any): string {
  const supplied = typeof req.body?.visitorId === 'string' ? req.body.visitorId : '';
  if (supplied) return supplied;
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : (req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'anonymous');
  return `ip_${String(ip).slice(0, 80)}`;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  try {
    const result = await recordVisitor(getClientId(req));
    return res.status(200).json({ ...result, status: 'ok' });
  } catch (error) {
    console.error('Visitor counter error:', error);
    return res.status(500).json({ status: 'error', totalVisitors: 0, todayVisitors: 0 });
  }
}
