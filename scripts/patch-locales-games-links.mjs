import fs from 'node:fs';
import path from 'node:path';

const LOCALES = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assembly', 'site', '_data', 'locales.json'), 'utf8'));
const FALLBACK = { az:'tr', be:'ru', bg:'ru', bn:'en', cs:'pl', da:'de', el:'en', 'es-419':'es', fa:'ar', fi:'de', fil:'en', he:'ar', hi:'en', hu:'pl', hy:'ru', id:'en', ka:'ru', kk:'ru', ms:'en', nb:'de', nl:'de', 'pt-pt':'es', ro:'en', sr:'ru', sv:'de', th:'en', ur:'ar', uz:'tr', ps:'ar', sd:'ur', ug:'ar', dv:'ar', ks:'ur', 'ku-arab':'ar', yi:'de', vi:'en' };

const CATALOG = {
  ru: {
    typing: { name: 'Печатный тренажёр', description: 'Тренируй скорость и точность печати: набирай слова наперегонки со временем.' },
    rat: { name: 'Раскорми крысу', description: 'Кликай по еде как можно быстрее, чтобы крыса разъелась до невероятных размеров.' },
  },
  en: {
    typing: { name: 'Typing Trainer', description: 'Train your typing speed and accuracy: type words against the clock.' },
    rat: { name: 'Feed the rat', description: 'Click on the food to feed the rat as quickly as possible.' },
  },
  de: {
    typing: { name: 'Tipptrainer', description: 'Trainiere Tippgeschwindigkeit und Genauigkeit: tippe Wörter gegen die Uhr.' },
    rat: { name: 'Füttere die Ratte', description: 'Klicke aufs Futter — die Ratte soll so schnell wie möglich wachsen.' },
  },
  fr: {
    typing: { name: 'Entraîneur de frappe', description: 'Entraîne ta vitesse et ta précision : tape des mots contre la montre.' },
    rat: { name: 'Nourris le rat', description: 'Clique sur la nourriture pour faire grossir le rat le plus vite possible.' },
  },
  es: {
    typing: { name: 'Entrenador de mecanografía', description: 'Entrena velocidad y precisión: escribe palabras contra el reloj.' },
    rat: { name: 'Alimenta la rata', description: 'Haz clic en la comida para que la rata crezca lo más rápido posible.' },
  },
  'zh-cn': {
    typing: { name: '打字训练', description: '训练打字速度和准确率：与时间赛跑输入单词。' },
    rat: { name: '喂老鼠', description: '点击食物，让老鼠尽快变大。' },
  },
  ja: {
    typing: { name: 'タイピング練習', description: 'タイピング速度と正確さを鍛える：制限時間内に単語を入力。' },
    rat: { name: 'ネズミにエサ', description: 'エサをクリックしてネズミをできるだけ早く大きくしよう。' },
  },
  ko: {
    typing: { name: '타이핑 연습', description: '타이핑 속도와 정확도를 훈련하세요: 시간과 경쟁하며 단어를 입력합니다.' },
    rat: { name: '쥐에게 먹이', description: '먹이를 클릭해 쥐를 최대한 빨리 키우세요.' },
  },
  ar: {
    typing: { name: 'مدرب الكتابة', description: 'درّب سرعة ودقة الكتابة: اكتب الكلمات ضد الوقت.' },
    rat: { name: 'أطعم الفأر', description: 'انقر على الطعام لإطعام الفأر بأسرع ما يمكن.' },
  },
  it: {
    typing: { name: 'Allenatore di digitazione', description: 'Allena velocità e precisione: digita parole contro il tempo.' },
    rat: { name: 'Nutri il ratto', description: 'Clicca sul cibo per far crescere il ratto il più velocemente possibile.' },
  },
  'pt-br': {
    typing: { name: 'Treinador de digitação', description: 'Treine velocidade e precisão: digite palavras contra o tempo.' },
    rat: { name: 'Alimente o rato', description: 'Clique na comida para o rato crescer o mais rápido possível.' },
  },
  pl: {
    typing: { name: 'Trener pisania', description: 'Ćwicz szybkość i dokładność pisania: wpisuj słowa na czas.' },
    rat: { name: 'Nakarm szczura', description: 'Klikaj jedzenie, aby szczur rósł jak najszybciej.' },
  },
  tr: {
    typing: { name: 'Yazma antrenörü', description: 'Yazma hızı ve doğruluğunu geliştir: zamana karşı kelime yaz.' },
    rat: { name: 'Fareyi besle', description: 'Fareyi olabildiğince hızlı büyütmek için yemeğe tıkla.' },
  },
};

function getCatalog(locale) {
  if (CATALOG[locale]) return CATALOG[locale];
  const fb = FALLBACK[locale];
  if (fb && CATALOG[fb]) return CATALOG[fb];
  return CATALOG.en;
}

function fixGameLink(link, locale) {
  if (!link || !link.startsWith('/frontend/')) return link;
  const m = link.match(/^\/frontend\/(?:[a-z]{2}(?:-[a-z0-9]+)?\/)?games\/(.+)$/);
  if (!m) return link;
  if (locale === 'ru') return `/frontend/games/${m[1]}`;
  return `/frontend/${locale}/games/${m[1]}`;
}

function isTypingGame(game) {
  return game.link?.includes('/games/typing/');
}

function isRatGame(game) {
  return game.link?.includes('/games/rat/');
}

function nextPosition(games) {
  const nums = games.map((g) => parseInt(g.position, 10)).filter((n) => !Number.isNaN(n));
  return String((nums.length ? Math.max(...nums) : 0) + 1);
}

const targetFile = path.join(process.cwd(), 'assembly', 'site', '_data', 'localesGames.json');
const data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

let linksFixed = 0;
let typingAdded = 0;
let ratAdded = 0;

for (const locale of LOCALES) {
  const block = data[locale]?.games;
  if (!block) continue;

  const webCat = block.categories?.find((c) => c.key === 'web');
  if (!webCat?.games) continue;

  const buttonText = webCat.games.find((g) => !g.external)?.buttonText || (locale === 'ru' ? 'Играть' : 'Play');

  for (const game of webCat.games) {
    if (game.external) continue;
    const fixed = fixGameLink(game.link, locale);
    if (fixed !== game.link) {
      game.link = fixed;
      linksFixed++;
    }
    if (game.image?.includes('/images/typing.svg')) game.image = '/frontend/images/typing.svg';
    if (game.image?.includes('/images/rat.svg')) game.image = '/frontend/images/rat.svg';
  }

  const catalog = getCatalog(locale);
  let added = 0;

  if (!webCat.games.some(isTypingGame)) {
    webCat.games.push({
      position: nextPosition(webCat.games),
      name: catalog.typing.name,
      image: '/frontend/images/typing.svg',
      description: catalog.typing.description,
      link: fixGameLink('/frontend/games/typing/index.html', locale),
      external: false,
      buttonText,
    });
    typingAdded++;
    added++;
  }

  if (!webCat.games.some(isRatGame)) {
    webCat.games.push({
      position: nextPosition(webCat.games),
      name: catalog.rat.name,
      image: '/frontend/images/rat.svg',
      description: catalog.rat.description,
      link: fixGameLink('/frontend/games/rat/index.html', locale),
      external: false,
      buttonText,
    });
    ratAdded++;
    added++;
  }

  if (added > 0) {
    const current = parseInt(block.totalGames, 10);
    if (!Number.isNaN(current)) block.totalGames = String(current + added);
  }
}

fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Updated ${targetFile}`);
console.log(`- Links fixed: ${linksFixed}`);
console.log(`- Typing entries added: ${typingAdded}`);
console.log(`- Rat entries added: ${ratAdded}`);
