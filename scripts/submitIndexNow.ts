import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = 'cinevault-movies-one.vercel.app';
const KEY = 'e35378d088b04d1694d7df64ce04a4dc';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

async function submitToIndexNow() {
  console.log('📡 Submitting verified canonical URLs to IndexNow & Bing...');

  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error('sitemap.xml not found. Please run sitemap/prerender script first.');
    return;
  }

  const content = fs.readFileSync(sitemapPath, 'utf-8');
  const locMatches = content.match(/<loc>(https:\/\/[^<]+)<\/loc>/g);

  if (!locMatches || locMatches.length === 0) {
    console.log('No URLs found to submit.');
    return;
  }

  const urlList = locMatches.map(m => m.replace(/<\/?loc>/g, '')).slice(0, 1000); // IndexNow limit per request is 10,000

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urlList
  };

  const endpoints = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Submitting ${urlList.length} URLs to ${endpoint}...`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      console.log(`Response from ${endpoint}: status ${res.status} ${res.statusText}`);
    } catch (err: any) {
      console.warn(`IndexNow submission to ${endpoint} failed:`, err?.message || err);
    }
  }
}

submitToIndexNow().catch(console.error);
