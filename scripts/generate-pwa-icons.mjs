import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svg = readFileSync(resolve(root, 'public/favicon.svg'));

/** Night app background — matches --theme-app in dark mode. */
const BACKGROUND = { r: 17, g: 24, b: 39, alpha: 1 };

async function writeIcon(size, outputPath, inset) {
  const inner = Math.max(1, size - inset * 2);
  const icon = await sharp(svg)
    .resize(inner, inner, {
      fit: 'contain',
      background: BACKGROUND,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(outputPath);
}

await writeIcon(192, resolve(root, 'public/pwa-192x192.png'), 20);
await writeIcon(512, resolve(root, 'public/pwa-512x512.png'), 48);
await writeIcon(512, resolve(root, 'public/pwa-512x512-maskable.png'), 102);

console.log('Generated PWA icons in public/');
