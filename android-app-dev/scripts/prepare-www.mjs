#!/usr/bin/env node
/**
 * Bundle Capacitor shell (src/app.js → www/app.bundle.js).
 * Restored from Serpmonn-1.2.1.apk + previous build log.
 */
import * as esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');
const assetsDir = join(www, 'assets');

mkdirSync(assetsDir, { recursive: true });

await esbuild.build({
  entryPoints: [join(root, 'src/app.js')],
  bundle: true,
  format: 'esm',
  outfile: join(www, 'app.bundle.js'),
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
  logLevel: 'warning',
});

// Ensure icons exist in www/assets (source of truth may be www or a future assets/)
for (const name of ['serpmonn-192.png', 'serpmonn-512.png']) {
  const dest = join(assetsDir, name);
  if (existsSync(dest)) continue;
  const alt = join(root, 'assets', name);
  if (existsSync(alt)) copyFileSync(alt, dest);
}

console.log('www prepared (bundled)');
