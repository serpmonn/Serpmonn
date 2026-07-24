import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const www = path.join(root, 'www');
const iconsSrc = path.join(root, '..', 'frontend', 'images');

fs.mkdirSync(www, { recursive: true });
fs.mkdirSync(path.join(www, 'assets'), { recursive: true });

for (const name of ['serpmonn-192.png', 'serpmonn-512.png']) {
  const src = path.join(iconsSrc, name);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(www, 'assets', name));
  }
}

await esbuild.build({
  entryPoints: [path.join(www, 'app.js')],
  bundle: true,
  outfile: path.join(www, 'app.bundle.js'),
  format: 'esm',
  platform: 'browser',
  target: ['es2019'],
  minify: true,
  sourcemap: false,
});

console.log('www prepared (bundled)');
