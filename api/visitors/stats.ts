export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const [allRes, todayRes] = await Promise.all([
      fetch('https://hits.dwyl.com/sasuu/cinevault-all.json', { signal: controller.signal }),
      fetch(`https://hits.dwyl.com/sasuu/cinevault-${today}.json`, { signal: controller.signal })
    ]);

    clearTimeout(timer);

    const allJson = await allRes.json();
    const todayJson = await todayRes.json();

    const totalVisitors = parseInt(allJson?.message || '1', 10) || 1;
    const todayVisitors = parseInt(todayJson?.message || '1', 10) || 1;

    return res.status(200).json({
      status: 'ok',
      totalVisitors,
      todayVisitors,
      isNew: false
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'ok',
      totalVisitors: 1,
      todayVisitors: 1,
      isNew: false
    });
  }
}
