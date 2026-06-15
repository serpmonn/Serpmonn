// Партнёрские ссылки — редирект через /out?game=...
// Пользователь видит мгновенный переход, партнёр видит Referer/ref: serpmonn.ru

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Файл для записи кликов — backend/games/affiliate-clicks.json
const CLICKS_FILE = path.join(__dirname, 'affiliate-clicks.json');

// Инициализируем файл если его нет
if (!fs.existsSync(CLICKS_FILE)) {
  fs.writeFileSync(CLICKS_FILE, JSON.stringify([], null, 2), 'utf8');
}

function logClick(game, ip, ua) {
  try {
    const clicks = JSON.parse(fs.readFileSync(CLICKS_FILE, 'utf8'));
    clicks.push({
      game,
      ip,
      ua: ua?.slice(0, 120) ?? '',
      ts: new Date().toISOString(),
    });
    fs.writeFileSync(CLICKS_FILE, JSON.stringify(clicks, null, 2), 'utf8');
  } catch (e) {
    console.error('[affiliate/out] Ошибка записи клика:', e.message);
  }
}

// Добавляем ref к партнёрской ссылке, если его ещё нет
function withRef(dest, refUrl = 'https://serpmonn.ru') {
  const url = new URL(dest);
  if (!url.searchParams.has('ref')) {
    url.searchParams.set('ref', refUrl);
  }
  return url.toString();
}

const GAME_LINKS = {
  'g01': 'https://rzekl.com/g/ky2n1t1o3k7c9ceea34447ed6832c6937d428ecd/?erid=5jtCeReNwxHpfQTFQqS8mWE',
  'g02': 'https://ficca2021.com/g/xv8wkx2q4t7c9ceea3443cb67d624d0197bfefde/?erid=25H8d7vbP8SRTvJ4WQksxm',
  'g03': 'https://codeaven.com/g/pw3myei9ht7c9ceea344a4713a8ace3ce163585e/?erid=5jtCeReNwxHpfQTGQVAJcnX',
  'g04': 'https://rzekl.com/g/txwwmat2wx7c9ceea344c065b8a873cafad31500/?erid=2bL9aMPo2e49hMef4pfym3SuLK',
  'g05': 'https://xmknb.com/g/ilvfzhs26x7c9ceea34461e800f2bd/?erid=2bL9aMPo2e49hMef4piV5BfNfR',
  'g06': 'https://zmgig.com/g/yog728vijm7c9ceea344f0d389d68db1cf1bbd51/?erid=MvGzQC98w3Z1gMq1oSV73txX',
  'g07': 'https://xcdus.com/g/c5e9n6r3ew7c9ceea344c5c964748a/?erid=MvGzQC98w3Z1gMq1pRgkzi9d',
  'g08': 'https://rzekl.com/g/7lgnbu225t7c9ceea3444cb8738d24/?erid=MvGzQC98w3Z1gMq1oSV73uLi',
  'g09': 'https://twnfz.com/g/f15f0db8437c9ceea344d8792ef979/?erid=5jtCeReLm1S3Xx3Lf3au61G',
  'g10': 'https://dhwnh.com/g/4z1liq0shk7c9ceea34426d3115512/?erid=2bL9aMPo2e49hMef4pfzSMbrkc',
  'g11': 'https://rzekl.com/g/fy90i94aoa7c9ceea3443fcec4d4a3/?erid=MvGzQC98w3Z1gMq1oS2xNYhq',
  'g12': 'https://dorinebeaumont.com/g/jmyq21wgw87c9ceea344a78ad6f5e61bedefe48e/?erid=5jtCeReNwxHpfQTEujFRZrz',
  'g13': 'https://tywhh.com/g/q10rxle26a7c9ceea34443269ad76debd4fd1b95/?erid=2bL9aMPo2e49hMef4piUr6ZhiU',
  'g14': 'https://zallj.com/g/7pfesw5toq7c9ceea344dae6a8f6c8/?erid=2bL9aMPo2e49hMef4pdz7j98Qe',
  'item-a': 'https://zallj.com/g/gfhc91n9bb7c9ceea3441d81d40fc4ce65fa65ae/',
  'item-b': 'https://rzekl.com/g/1e8d1144947c9ceea34416525dc3e8/',
  'item-c': 'https://xnmik.com/g/k1grq9wd9g7c9ceea344be0d510ed1/',
};

// Маппинг ключ → название (только для /out/stats, наружу не передаётся)
const GAME_NAMES = {
  'g01': 'atomic-heart',
  'g02': 'lost-ark',
  'g03': 'allods-online',
  'g04': 'amazing-online',
  'g05': 'evolve-rp',
  'g06': 'nextrp',
  'g07': 'malinovka',
  'g08': 'lineage-2-essence',
  'g09': 'lineage-2',
  'g10': 'lineage-2-legacy',
  'g11': 'black-desert',
  'g12': 'warface',
  'g13': 'gta5rp',
  'g14': 'ragnarok-online-prime',
  'item-a': 'item-a',
  'item-b': 'item-b',
  'item-c': 'item-c',
};

// Разрешённые домены (Admitad-сеть)
const ALLOWED_HOSTS = new Set([
  'rzekl.com',
  'ficca2021.com',
  'codeaven.com',
  'xmknb.com',
  'zmgig.com',
  'xcdus.com',
  'twnfz.com',
  'dhwnh.com',
  'dorinebeaumont.com',
  'tywhh.com',
  'zallj.com',
  'xnmik.com',
]);

export function outRoutes(app) {
  // GET /out?game=g01
  app.get('/out', (req, res) => {
    const { game } = req.query;
    const originalDest = GAME_LINKS[game];

    if (!originalDest) {
      return res.status(404).send('Game not found');
    }

    const host = new URL(originalDest).hostname;
    if (!ALLOWED_HOSTS.has(host)) {
      return res.status(403).send('Forbidden');
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip;
    const ua = req.headers['user-agent'];

    setImmediate(() => logClick(game, ip, ua));

    // Добавляем ref только в момент редиректа
    const dest = withRef(originalDest, 'https://serpmonn.ru');

    res.redirect(302, dest);
  });

  // GET /out/stats — простой просмотр кликов (добавь авторизацию перед продом)
  app.get('/out/stats', (req, res) => {
    try {
      const clicks = JSON.parse(fs.readFileSync(CLICKS_FILE, 'utf8'));

      const byGame = {};
      for (const click of clicks) {
        const label = GAME_NAMES[click.game] ?? click.game;
        byGame[label] = (byGame[label] ?? 0) + 1;
      }

      res.json({
        total: clicks.length,
        byGame,
        last10: clicks.slice(-10).reverse(),
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}
