import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const aboutFile = path.join(root, 'assembly', 'site', '_data', 'aboutProjectTranslations.json');
const data = JSON.parse(fs.readFileSync(aboutFile, 'utf8'));

const NEWS_BY_LOCALE = {
  ru: 'Раздел новостей с подборкой актуальных тем',
  en: 'News section with curated topical updates',
};

const NEWS_DEFAULT = NEWS_BY_LOCALE.en;

const isTechnicalNewsLine = (item) =>
  /SearXNG|Ollama|\bRSS\b|rss|фид|feeds|feed|лент|канал|syöte|flux|канал|канал|фид/i.test(item);

for (const [locale, block] of Object.entries(data)) {
  const ap = block?.aboutProject;
  if (!ap?.statusList) continue;

  ap.statusList = ap.statusList.map((item) =>
    isTechnicalNewsLine(item) ? NEWS_BY_LOCALE[locale] || NEWS_DEFAULT : item
  );
}

fs.writeFileSync(aboutFile, `${JSON.stringify(data, null, 2)}\n`);
console.log('Updated about-project news lines (no stack details)');
