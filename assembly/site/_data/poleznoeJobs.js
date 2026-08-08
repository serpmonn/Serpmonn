const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, 'promocodesBuild.cache.json');

const ADMITAD = {
  parcel: [
    {
      id: 'admitad-cdek',
      title: 'CDEK',
      cta: 'Открыть CDEK',
      url: 'https://www.cdek.ru/',
      adLabel: 'Реклама. ООО «СДЭК-ГЛОБАЛ», ИНН: 7722327689'
    }
  ],
  domain: [
    {
      id: 'admitad-regru',
      title: 'REG.RU',
      cta: 'Открыть REG.RU',
      url: 'https://ewwhk.com/g/e2331e4edc7c9ceea3440d79a64861/?erid=F7NfYUJRWmqqH86kt8jj',
      adLabel: 'Реклама. ООО «РЕГ.РУ», ИНН: 7733568767, erid: F7NfYUJRWmqqH86kt8jj'
    }
  ],
  buy: [
    {
      id: 'admitad-aliexpress',
      title: 'Aliexpress',
      cta: 'Перейти на Aliexpress',
      url: 'https://dhwnh.com/g/vv3q4oey1v7c9ceea344b6d1781017/?erid=2bL9aMPo2e49hMef4pdzo6JkYp',
      adLabel: 'Реклама. ООО «Алибаба.ком (РУ)», ИНН: 7703380158, erid: 2bL9aMPo2e49hMef4pdzo6JkYp'
    },
    {
      id: 'admitad-joom',
      title: 'Joom',
      cta: 'Перейти на Joom',
      url: 'https://aflink.ru/g/18vhi6r5cv7c9ceea34479deb39b46/?erid=5jtCeReNwxHpfQTFuc3CS5J',
      adLabel: 'Реклама. ООО «Джум», ИНН: 9709063370, erid: 5jtCeReNwxHpfQTFuc3CS5J'
    }
  ]
};

const JOB_META = [
  { key: 'parcel', icon: 'truck' },
  { key: 'domain', icon: 'globe' },
  { key: 'buy', icon: 'cart' },
  { key: 'debit', icon: 'coins' },
  { key: 'credit', icon: 'key' },
  { key: 'savings', icon: 'shield' },
  { key: 'travel', icon: 'rocket' },
  { key: 'health', icon: 'heart' },
  { key: 'business', icon: 'wrench' },
  { key: 'entertainment', icon: 'games' },
  { key: 'learn', icon: 'graduation' }
];

function hasCode(card) {
  return Boolean(String(card.promocode || '').trim());
}

function classifyFinance(titleLower) {
  if (titleLower.includes('кредит')) return 'credit';
  if (titleLower.includes('вклад') || titleLower.includes('страхован') || titleLower.includes('сберпремьер')) {
    return 'savings';
  }
  // дебетовые / детские / black / junior / альфа-карта
  if (
    titleLower.includes('дебетов') ||
    titleLower.includes('карт') ||
    titleLower.includes('junior') ||
    titleLower.includes('black') ||
    titleLower.includes('альфа')
  ) {
    return 'debit';
  }
  return 'savings';
}

function classify(card) {
  const title = String(card.title || '').trim();
  const tl = title.toLowerCase();
  const bonus = `${card.bonus_description || ''} ${card.description || ''}`.toLowerCase();

  if (tl.includes('нетолог')) return 'learn';
  if (tl.includes('авито путешеств') || tl.includes('путешеств')) return 'travel';
  if (tl.includes('сберздоров') || (tl.includes('программ') && tl.includes('здоров'))) return 'health';
  if (tl.includes('юkassa') || tl.includes('юкасса') || tl.includes('самозанят')) return 'business';
  if (tl.includes('сберпрайм') || (tl.includes('афиша') && !tl.includes('яндекс'))) return 'entertainment';
  if (tl.includes('мегамаркет')) return 'buy';
  if (
    tl.includes('карт') ||
    tl.includes('вклад') ||
    tl.includes('кредит') ||
    tl.includes('альфа') ||
    tl.includes('т-банк') ||
    tl.includes('тинькофф') ||
    tl.includes('сбер') ||
    tl.includes('страхован')
  ) {
    return classifyFinance(tl);
  }
  if (bonus.includes('курс') || bonus.includes('обучен')) return 'learn';
  return 'debit';
}

function shortCta(card) {
  const title = String(card.title || '').trim();
  // Для карточек предпочтительнее короткое имя бренда/продукта
  if (title) {
    return title.length > 56 ? `${title.slice(0, 53)}…` : title;
  }
  const bonus = String(card.bonus_description || '').trim();
  if (bonus) {
    return bonus.length > 56 ? `${bonus.slice(0, 53)}…` : bonus;
  }
  return 'Перейти';
}

function adLabel(card) {
  const info = String(card.advertiser_info || '').trim();
  return info ? `Реклама. ${info}` : '';
}

function toOffer(card) {
  return {
    id: String(card.id),
    title: String(card.title || '').trim(),
    cta: shortCta(card),
    url: card.landing_url || '#',
    adLabel: adLabel(card)
  };
}

function dedupeByTitle(offers) {
  const seen = new Set();
  const out = [];
  for (const offer of offers) {
    const key = (offer.title || offer.cta || offer.id).toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(offer);
  }
  return out;
}

function collapseLearn(offers) {
  if (!offers.length) return offers;
  const allNetology = offers.every(o => /нетолог/i.test(o.title || ''));
  if (!allNetology || offers.length <= 1) return dedupeByTitle(offers);
  const first = offers[0];
  return [
    {
      ...first,
      id: 'netology-hub',
      title: 'Нетология',
      cta: 'Нетология — бесплатные курсы'
    }
  ];
}

module.exports = async function poleznoeJobs() {
  // Wait for promocodesBuild so we read the freshly written full cache (incl. no-code).
  await require('./promocodesBuild')();

  const jobs = Object.fromEntries(JOB_META.map(j => [j.key, { ...j, offers: [] }]));

  for (const key of Object.keys(ADMITAD)) {
    jobs[key].offers.push(...ADMITAD[key]);
  }

  if (!fs.existsSync(CACHE_PATH)) {
    return { jobs: JOB_META.map(j => jobs[j.key]), generatedAt: null, noCodeCount: 0 };
  }

  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  const noCode = (cache.cards || []).filter(c => !hasCode(c));

  for (const card of noCode) {
    const key = classify(card);
    if (!jobs[key]) continue;
    jobs[key].offers.push(toOffer(card));
  }

  for (const job of Object.values(jobs)) {
    if (job.key === 'learn') {
      job.offers = collapseLearn(job.offers);
    } else {
      job.offers = dedupeByTitle(job.offers);
    }
  }

  return {
    jobs: JOB_META.map(j => jobs[j.key]).filter(j => j.offers.length > 0),
    generatedAt: cache.lastUpdateIso || cache.version || null,
    noCodeCount: noCode.length
  };
};
