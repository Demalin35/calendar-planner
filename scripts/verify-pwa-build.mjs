import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

function fail(message) {
  console.error(`[verify-pwa-build] ${message}`);
  process.exit(1);
}

const requiredFiles = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'push-handler.js',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-512x512-maskable.png',
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(dist, file))) {
    fail(`Missing ${file} in dist/`);
  }
}

const indexHtml = readFileSync(resolve(dist, 'index.html'), 'utf8');
if (!indexHtml.includes('rel="manifest"')) {
  fail('index.html is missing <link rel="manifest">');
}
if (!indexHtml.includes('apple-mobile-web-app-capable')) {
  fail('index.html is missing apple-mobile-web-app-capable meta tag');
}

const manifest = JSON.parse(
  readFileSync(resolve(dist, 'manifest.webmanifest'), 'utf8'),
);

if (manifest.display !== 'standalone') {
  fail(`manifest display must be "standalone", got "${manifest.display}"`);
}
if (manifest.start_url !== '/' && manifest.start_url !== './') {
  fail(`unexpected manifest start_url: ${manifest.start_url}`);
}
if (manifest.scope !== '/' && manifest.scope !== './') {
  fail(`unexpected manifest scope: ${manifest.scope}`);
}
if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) {
  fail('manifest must include at least two icons');
}

console.log('[verify-pwa-build] PWA build output looks valid.');
