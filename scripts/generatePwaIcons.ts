import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generate() {
  const svgPath = path.resolve('public/favicon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/pwa-192x192.png'));
  console.log('Created public/pwa-192x192.png');

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/pwa-512x512.png'));
  console.log('Created public/pwa-512x512.png');

  // 180x180 apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));
  console.log('Created public/apple-touch-icon.png');

  // Maskable 512x512 with safe zone padding (15% on each side)
  const innerSize = Math.round(512 * 0.75); // 384px inside 512px
  const innerIcon = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 8, g: 8, b: 8, alpha: 1 }
    }
  })
  .composite([
    {
      input: innerIcon,
      gravity: 'center'
    }
  ])
  .png()
  .toFile(path.resolve('public/pwa-maskable-512x512.png'));
  console.log('Created public/pwa-maskable-512x512.png');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
