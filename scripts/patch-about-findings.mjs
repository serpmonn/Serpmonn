import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const aboutFile = path.join(root, 'assembly', 'site', '_data', 'aboutProjectTranslations.json');
const data = JSON.parse(fs.readFileSync(aboutFile, 'utf8'));

const FINDINGS_EN =
  'Findings: save AI answers, public feed, direct messages, follows, likes, comments, and notifications';
const NEWS_EN = 'News section with curated topical updates';

const hasFindings = (list) =>
  list.some((item) => /finding|находк|Findings|النتائج|Hallazgos|Fundst/i.test(item));

const isNewsLine = (item) => /RSS|rss|лента|feed|канал|канал/i.test(item) && /news|новост|Nachricht|notic|xəbər|haber|berita|ข่าว|ニュース|뉴스/i.test(item);

for (const [locale, block] of Object.entries(data)) {
  if (locale === 'ru' || locale === 'en') continue;
  const ap = block?.aboutProject;
  if (!ap?.statusList) continue;

  ap.statusList = ap.statusList.map((item) => (isNewsLine(item) ? NEWS_EN : item));

  if (!hasFindings(ap.statusList)) {
    const profileIdx = ap.statusList.findIndex((item) =>
      /profile|профил|profil|perfil|profilo|profiel|profilu/i.test(item)
    );
    const insertAt = profileIdx >= 0 ? profileIdx + 1 : 2;
    ap.statusList.splice(insertAt, 0, FINDINGS_EN);
  }

  if (Array.isArray(ap.roadmapList)) {
    ap.roadmapList = ap.roadmapList.map((item) =>
      /profiles|профил|user profiles/i.test(item) && /expand|расшир|Erweiter|ampliar/i.test(item)
        ? 'Growing the findings feed and social features: recommendations, notifications, feed search.'
        : item
    );
  }
}

fs.writeFileSync(aboutFile, `${JSON.stringify(data, null, 2)}\n`);
console.log('Patched about-project translations for non-ru/en locales');
