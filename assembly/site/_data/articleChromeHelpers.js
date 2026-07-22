const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname);

const RELATED_MAP = {
  'cookies-complete-guide': ['port-forwarding-guide', 'web-development-guide', 'utm-complete-guide'],
  'web-development-guide': ['cookies-complete-guide', 'json-formatter-guide', 'web-tech-trends-2024'],
  'web-tech-trends-2024': ['web-development-guide', 'cookies-complete-guide', 'indexnow-practical-guide'],
  'how-to-calculate-depreciation': ['how-to-calculate-the-eco-footprint-of-products', 'utm-complete-guide', 'port-forwarding-guide'],
  'how-to-calculate-the-eco-footprint-of-products': ['how-to-calculate-depreciation', 'cookies-complete-guide', 'web-tech-trends-2024'],
  'indexnow-practical-guide': ['utm-complete-guide', 'web-development-guide', 'cookies-complete-guide'],
  'utm-complete-guide': ['cookies-complete-guide', 'indexnow-practical-guide', 'web-development-guide'],
  'snippet-limits-vk-telegram-youtube-tiktok': ['utm-complete-guide', 'cookies-complete-guide', 'web-tech-trends-2024'],
  'json-formatter-guide': ['web-development-guide', 'cookies-complete-guide', 'indexnow-practical-guide'],
  'updates-august-17': ['updates-aug-25-sep-15', 'updates-sep15-2025-jul22-2026', 'port-forwarding-guide'],
  'updates-aug-25-sep-15': ['updates-sep15-2025-jul22-2026', 'updates-august-17', 'port-forwarding-guide'],
  'updates-sep15-2025-jul22-2026': ['updates-aug-25-sep-15', 'updates-august-17', 'port-forwarding-guide'],
  'port-forwarding-guide': ['cookies-complete-guide', 'web-development-guide', 'serpmonn-install-guide'],
  'serpmonn-install-guide': ['cookies-complete-guide', 'port-forwarding-guide', 'updates-sep15-2025-jul22-2026']
};

const RELATED_TITLE = {
  ru: 'Похожие статьи',
  en: 'Related articles',
  de: 'Ähnliche Artikel',
  fr: 'Articles similaires',
  es: 'Artículos relacionados',
  it: 'Articoli correlati',
  pt: 'Artigos relacionados',
  'pt-br': 'Artigos relacionados',
  uk: 'Схожі статті',
  pl: 'Podobne artykuły',
  tr: 'Benzer makaleler',
  ar: 'مقالات ذات صلة',
  zh: '相关文章',
  'zh-cn': '相关文章',
  'zh-tw': '相關文章',
  ja: '関連記事',
  ko: '관련 기사',
  hi: 'संबंधित लेख',
  vi: 'Bài viết liên quan',
  th: 'บทความที่เกี่ยวข้อง',
  id: 'Artikel terkait',
  nl: 'Gerelateerde artikelen',
  sv: 'Relaterade artiklar',
  fi: 'Aiheeseen liittyvät artikkelit',
  cs: 'Související články',
  sk: 'Súvisiace články',
  hu: 'Kapcsolódó cikkek',
  ro: 'Articole asemănătoare',
  bg: 'Сходни статии',
  el: 'Σχετικά άρθρα',
  he: 'מאמרים קשורים',
  fa: 'مقالات مرتبط'
};

const TOC_TITLE = {
  ru: 'Содержание',
  en: 'Contents',
  de: 'Inhalt',
  fr: 'Sommaire',
  es: 'Contenido',
  uk: 'Зміст',
  pl: 'Spis treści',
  tr: 'İçindekiler',
  ar: 'المحتويات',
  'zh-cn': '目录',
  ja: '目次',
  ko: '목차'
};

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));
}

function articleHref(locale, slug) {
  if (locale === 'ru') return `/frontend/knowledge-base/articles/${slug}.html`;
  return `/frontend/${locale}/knowledge-base/articles/${slug}.html`;
}

function pickTitle(obj, locale) {
  if (!obj) return null;
  const loc = obj[locale] ? locale : (obj.en ? 'en' : (obj.ru ? 'ru' : Object.keys(obj)[0]));
  const x = obj[loc];
  if (!x) return null;
  if (x.meta && x.meta.title) return x.meta.title;
  if (x.meta && x.meta.ogTitle) return x.meta.ogTitle;
  if (x.pageTitle) return x.pageTitle;
  if (x.articleTitle) return x.articleTitle;
  if (x.article && x.article.title) return String(x.article.title).replace(/^[^\wА-Яа-яЁё]+/, '').trim();
  if (x.title) return x.title;
  if (x.sections && x.sections.hero && x.sections.hero.title) return x.sections.hero.title;
  return null;
}

let cache = null;

function buildTitleIndex() {
  if (cache) return cache;
  const sources = {
    'cookies-complete-guide': 'cookiesCompleteGuide.json',
    'web-development-guide': 'webDevelopmentGuide.json',
    'port-forwarding-guide': 'portForwardingGuide.json',
    'utm-complete-guide': 'utmCompleteGuide.json',
    'json-formatter-guide': 'jsonFormatterGuide.json',
    'indexnow-practical-guide': 'indexnowPracticalGuide.json',
    'web-tech-trends-2024': 'webTechTrends2025.json',
    'how-to-calculate-depreciation': 'howToCalculateDepreciation.json',
    'how-to-calculate-the-eco-footprint-of-products': 'ecoFootprintTranslations.json',
    'snippet-limits-vk-telegram-youtube-tiktok': 'snippetLimitsVkTelegramYoutubeTiktok.json',
    'updates-august-17': 'updatesAugust17.json',
    'updates-aug-25-sep-15': 'updatesAug25Sep15.json',
    'updates-sep15-2025-jul22-2026': 'updatesSep15Jul22.json',
    'serpmonn-install-guide': 'serpmonnInstallGuide.json'
  };

  const titles = {};
  for (const [slug, file] of Object.entries(sources)) {
    let data;
    try {
      data = loadJson(file);
    } catch (e) {
      continue;
    }
    for (const locale of Object.keys(data)) {
      if (!titles[locale]) titles[locale] = {};
      const t = pickTitle(data, locale);
      if (t) titles[locale][slug] = t;
    }
  }
  cache = titles;
  return titles;
}

function relatedTitle(locale) {
  return RELATED_TITLE[locale] || RELATED_TITLE.en;
}

function tocTitle(locale) {
  return TOC_TITLE[locale] || TOC_TITLE.en;
}

function relatedList(slug, locale) {
  const titles = buildTitleIndex();
  const slugs = RELATED_MAP[slug] || [];
  return slugs.map((s) => ({
    url: articleHref(locale, s),
    title: (titles[locale] && titles[locale][s]) || (titles.en && titles.en[s]) || (titles.ru && titles.ru[s]) || s
  }));
}

module.exports = {
  RELATED_MAP,
  relatedTitle,
  tocTitle,
  relatedList,
  articleHref
};
