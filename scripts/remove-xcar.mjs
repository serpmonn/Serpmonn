#!/usr/bin/env node
/**
 * Remove X-Car partner from adInfo.json and delete stale X-Car assets from frontend.
 */
import fs from 'fs';
import path from 'path';

const ROOT = '/var/www/serpmonn.ru';
const adInfoPath = path.join(ROOT, 'assembly/site/_data/adInfo.json');
const frontend = path.join(ROOT, 'frontend');

const adInfo = JSON.parse(fs.readFileSync(adInfoPath, 'utf8'));
let removedPartners = 0;

for (const locale of Object.keys(adInfo)) {
  const list = adInfo[locale]?.adInfo?.partnersList;
  if (list && list.xcar) {
    delete list.xcar;
    removedPartners++;
  }
}

fs.writeFileSync(adInfoPath, `${JSON.stringify(adInfo, null, 2)}\n`);
console.log(`Removed xcar from ${removedPartners} locales in adInfo.json`);

function rmIfExists(file) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    return true;
  }
  return false;
}

let deleted = 0;
const locales = fs.readdirSync(frontend, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const targets = ['', ...locales];
for (const loc of targets) {
  const base = loc ? path.join(frontend, loc) : frontend;
  for (const rel of ['scripts/X-Car.js', 'styles/X-Car.css']) {
    if (rmIfExists(path.join(base, rel))) deleted++;
  }
}

for (const rel of [
  'Partners/X-Car.html',
  'images/Logo_X-Car.ico',
  'images/Logo_X-Car.png',
  'images/X-Car_Background.jpg',
]) {
  if (rmIfExists(path.join(frontend, rel))) deleted++;
}

for (const loc of locales) {
  for (const rel of ['images/Logo_X-Car.ico', 'images/Logo_X-Car.png', 'images/X-Car_Background.jpg']) {
    if (rmIfExists(path.join(frontend, loc, rel))) deleted++;
  }
}

console.log(`Deleted ${deleted} X-Car asset files`);
