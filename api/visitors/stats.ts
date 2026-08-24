import { getVisitorStats } from './store';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const stats = await getVisitorStats();
  return res.status(200).json({ ...stats, status: 'ok' });
}
