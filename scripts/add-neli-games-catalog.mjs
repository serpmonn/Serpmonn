/**
 * Inserts Neli — demo into localesGames.json (serpmonn/web) for all locales.
 * Idempotent: skips if /games/neli/ already present.
 */
import fs from 'fs';

const FILE = new URL('../assembly/site/_data/localesGames.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const NELI_RU = {
  position: '11',
  name: 'Нэли — демо',
  image: '',
  description: 'Демо · хоррор с элементами расследования. Америка, 90-е. RU/EN в игре.',
  link: '/frontend/games/neli/',
  external: false,
  buttonText: 'Играть',
};

const NELI_EN = {
  position: '11',
  name: 'Neli — demo',
  image: '',
  description: 'Demo · horror with investigation elements. 1990s America. RU/EN in-game.',
  link: '/frontend/games/neli/',
  external: false,
  buttonText: 'Play',
};

let patched = 0;
let skipped = 0;

for (const [locale, block] of Object.entries(data)) {
  const groups = block?.games?.groups;
  if (!Array.isArray(groups)) continue;

  const serpmonn = groups.find((g) => g.key === 'serpmonn');
  const web = serpmonn?.platforms?.find((p) => p.key === 'web');
  if (!web?.games) continue;

  if (web.games.some((g) => String(g.link || '').includes('/games/neli'))) {
    skipped++;
    continue;
  }

  const entry = locale === 'ru'
    ? { ...NELI_RU, buttonText: web.games.find((g) => g.link?.includes('typing'))?.buttonText || NELI_RU.buttonText }
    : {
        ...NELI_EN,
        buttonText: web.games.find((g) => g.link?.includes('typing'))?.buttonText || NELI_EN.buttonText,
      };

  const idx = web.games.findIndex((g) => String(g.link || '').includes('redsquare2'));
  const insertAt = idx >= 0 ? idx + 1 : web.games.length;
  web.games.splice(insertAt, 0, entry);

  for (const g of web.games) {
    const link = String(g.link || '');
    if (link.includes('/typing/')) g.position = '12';
    else if (link.includes('/rat/')) g.position = '13';
  }

  const total = Number(block.games.totalGames);
  if (Number.isFinite(total)) {
    block.games.totalGames = String(total + 1);
  }

  patched++;
}

fs.writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);
console.log(`localesGames: patched=${patched}, skipped=${skipped}`);
