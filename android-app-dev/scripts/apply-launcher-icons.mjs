#!/usr/bin/env node
/** Brand launcher icons from frontend/images/serpmonn-512.png */
import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src512 = join(root, '../frontend/images/serpmonn-512.png');
const src192 = join(root, '../frontend/images/serpmonn-192.png');
const res = join(root, 'android/app/src/main/res');
const wwwAssets = join(root, 'www/assets');

if (!existsSync(src512)) {
  console.error('Missing', src512);
  process.exit(1);
}

mkdirSync(wwwAssets, { recursive: true });
copyFileSync(src512, join(wwwAssets, 'serpmonn-512.png'));
if (existsSync(src192)) copyFileSync(src192, join(wwwAssets, 'serpmonn-192.png'));

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

for (const [folder, px] of Object.entries(sizes)) {
  const dir = join(res, folder);
  mkdirSync(dir, { recursive: true });
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
    const out = join(dir, name);
    execSync(`convert "${src512}" -resize ${px}x${px} -background none -gravity center -extent ${px}x${px} "${out}"`, {
      stdio: 'inherit',
    });
  }
}

console.log('launcher icons updated from serpmonn-512.png');
