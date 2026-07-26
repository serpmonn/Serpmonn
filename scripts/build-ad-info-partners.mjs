// build-ad-info-partners.mjs
// Собирает partnersList для «О рекламе» динамически:
//   1) Perfluence API (или кэш промокодов)
//   2) Admitad API (подключённые офферы) + ручной admitadLegal.json (ИНН/adLabel)
//      URL с erid дополнительно подтягиваются из меню/игр/outRoutes
// Пишет partnersList во все локали adInfo.json (оболочка страницы остаётся).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { flattenPerfluenceData } from '../backend/promocodes/normalizePromocodes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

dotenv.config({ path: path.join(ROOT, 'backend/.env') });

const AD_INFO_FILE = path.join(ROOT, 'assembly/site/_data/adInfo.json');
const ADMITAD_LEGAL_FILE = path.join(ROOT, 'assembly/site/_data/admitadLegal.json');
const ADMITAD_MISSING_FILE = path.join(ROOT, 'assembly/site/_data/admitadLegal.missing.json');
const PROMO_CACHE_FILE = path.join(ROOT, 'assembly/site/_data/promocodesBuild.cache.json');
const MENU_FILE = path.join(ROOT, 'assembly/site/menu.njk');
const GAMES_FILE = path.join(ROOT, 'assembly/site/_data/localesGames.json');
const OUT_ROUTES_FILE = path.join(ROOT, 'backend/games/outRoutes.mjs');
const META_OUT_FILE = path.join(ROOT, 'assembly/site/_data/adInfoPartners.meta.json');

const PERFLUENCE_URL = 'https://dash.perfluence.net/blogger/promocode-api/json';
const PERFLUENCE_KEY = process.env.PERFLUENCE_API_KEY;
const ADMITAD_CLIENT_ID = process.env.ADMITAD_CLIENT_ID;
const ADMITAD_CLIENT_SECRET = process.env.ADMITAD_CLIENT_SECRET;
const ADMITAD_WEBSITE_ID = process.env.ADMITAD_WEBSITE_ID;
const ADMITAD_API = 'https://api.admitad.com';

const CPA_HOSTS = new Set([
  'rzekl.com', 'ficca2021.com', 'codeaven.com', 'xmknb.com', 'zmgig.com', 'xcdus.com',
  'twnfz.com', 'dhwnh.com', 'dorinebeaumont.com', 'tywhh.com', 'zallj.com', 'xnmik.com',
  'lsuix.com', 'aflink.ru', 'ewwhk.com', 'dbnua.com', 'rcpsj.com', 'ypetp.com', 'yjfca.com',
  'qbzdl.com', 'yynbx.com', 'admitad.com',
]);

const PERF_CATEGORY_MAP = {
  развлечения: 'entertainment',
  еда: 'food',
  продукты: 'food',
  товары: 'marketplaces',
  услуги: 'services',
  другие: 'services',
};

const BASE_CATEGORIES_RU = {
  marketplaces: 'Маркетплейсы',
  games: 'Игры',
  services: 'Сервисы',
  subscriptions: 'Подписки',
  food: 'Еда',
  health: 'Здоровье',
  transport: 'Транспорт',
  entertainment: 'Развлечения',
  fashion: 'Одежда',
};

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'partner';
}

function extractInn(text) {
  const m = String(text || '').match(/ИНН[:\s]*([0-9]{10,12})/i);
  return m ? m[1] : null;
}

function extractEridFromText(text) {
  const m = String(text || '').match(/erid[:\s]*([A-Za-z0-9А-Яа-я]+)/i);
  return m ? normalizeErid(m[1]) : null;
}

function extractEridFromUrl(url) {
  try {
    return normalizeErid(new URL(url).searchParams.get('erid'));
  } catch {
    return null;
  }
}

function normalizeErid(s) {
  if (!s) return null;
  const table = {
    З: 'Z', з: 'z', А: 'A', а: 'a', В: 'B', Е: 'E', е: 'e', К: 'K',
    М: 'M', Н: 'H', О: 'O', о: 'o', Р: 'P', С: 'C', с: 'c', Т: 'T', Х: 'X', у: 'y',
  };
  return String(s).replace(/[ЗзАаВЕеКМНОоРСсТХу]/g, (ch) => table[ch] || ch);
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function isCpaHost(host) {
  if (!host) return false;
  if (CPA_HOSTS.has(host)) return true;
  for (const h of CPA_HOSTS) {
    if (host.endsWith(`.${h}`)) return true;
  }
  return false;
}

function isPerfluenceHost(host) {
  return host === 'prfl.me' || host.endsWith('.prfl.me') || host.includes('perfluence');
}

function normalizeAdLabel(advertiserInfo, erid) {
  let label = String(advertiserInfo || '').trim();
  if (!label) {
    return erid ? `Реклама. erid: ${erid}` : 'Реклама.';
  }
  if (!/^реклама/i.test(label)) {
    label = `Реклама. ${label}`;
  }
  if (erid && !/erid/i.test(label)) {
    label = `${label.replace(/\.\s*$/, '')}, erid: ${erid}`;
  }
  return label.replace(/\s{2,}/g, ' ').trim();
}

function loadJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function fetchPerfluenceItems() {
  if (!PERFLUENCE_KEY) {
    console.warn('[ad-info] PERFLUENCE_API_KEY отсутствует — fallback на кэш');
    return null;
  }
  const res = await fetch(`${PERFLUENCE_URL}?key=${PERFLUENCE_KEY}`);
  if (!res.ok) throw new Error(`Perfluence HTTP ${res.status}`);
  const raw = await res.json();
  const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
  // Сырой API: project/groups → flatten; уже плоский кэш — как есть
  if (list.length && list[0]?.project) {
    return flattenPerfluenceData(list);
  }
  return list;
}

function loadPromoCacheItems() {
  const raw = loadJson(PROMO_CACHE_FILE, {});
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.cards)) return raw.cards;
  return [];
}

function normalizePerfItem(item) {
  // Сырой API vs уже нормализованный кэш
  if (item?.landing_url || item?.advertiser_info || item?.title) {
    return {
      title: item.title || item?.project?.name || 'Партнёр',
      description: item.description || item.bonus_description || '',
      advertiser_info: item.advertiser_info || '',
      landing_url: item.landing_url || item.url || '',
      category: item.category || 'другие',
      id: item.id,
    };
  }
  return null;
}

function buildPerfluencePartners(items) {
  const byKey = new Map();
  for (const raw of items) {
    const item = normalizePerfItem(raw);
    if (!item?.landing_url) continue;
    const host = hostOf(item.landing_url);
    if (host && isCpaHost(host) && !isPerfluenceHost(host)) {
      // на всякий случай не мешаем admitad-хосты из perf
    }
    const inn = extractInn(item.advertiser_info);
    const key = inn ? `inn:${inn}` : `perf:${slugify(item.title)}`;
    const erid = extractEridFromUrl(item.landing_url) || extractEridFromText(item.advertiser_info);
    const name = String(item.title || '').trim() || 'Партнёр';
    const desc = String(item.description || '').trim();
    const category = PERF_CATEGORY_MAP[String(item.category || '').toLowerCase()] || 'services';

    if (!byKey.has(key)) {
      byKey.set(key, {
        name,
        shortDescription: desc.slice(0, 120) || 'Партнёрская программа (Perfluence)',
        detailedDescription: desc || 'Актуальное предложение через партнёрскую сеть Perfluence.',
        adLabel: normalizeAdLabel(item.advertiser_info, erid),
        url: item.landing_url,
        category,
        buttonText: `Перейти: ${name}`,
        source: 'perfluence',
        _key: key,
      });
    }
  }
  console.log(`✅ Perfluence: ${items.length} офферов → ${byKey.size} уникальных рекламодателей`);
  return byKey;
}

function loadAdmitadLegal() {
  const data = loadJson(ADMITAD_LEGAL_FILE, { byErid: {}, byName: {}, byPath: {} });
  return {
    byErid: data.byErid || {},
    byName: data.byName || {},
    byPath: data.byPath || {},
  };
}

function pathKey(url) {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '').toLowerCase()}${u.pathname.replace(/\/$/, '')}`;
  } catch {
    return '';
  }
}

function resolveAdmitadLegal(placement, legal) {
  const erid = extractEridFromUrl(placement.url) || extractEridFromText(placement.adLabel || '');
  if (erid && legal.byErid[erid]) return legal.byErid[erid];
  const pk = pathKey(placement.url);
  if (pk && legal.byPath[pk]) return legal.byPath[pk];
  const nameKey = String(placement.name || '').trim().toLowerCase();
  if (nameKey && legal.byName[nameKey]) return legal.byName[nameKey];
  // soft name match (Evolve RP vs Evolve-RP, Joom RU vs joom)
  if (nameKey) {
    const compact = compactName(nameKey);
    let best = null;
    let bestLen = 0;
    for (const [n, entry] of Object.entries(legal.byName)) {
      const nc = compactName(n);
      if (!nc) continue;
      if (nc === compact) return entry;
      if (compact.includes(nc) || nc.includes(compact)) {
        if (nc.length > bestLen) {
          best = entry;
          bestLen = nc.length;
        }
      }
    }
    if (best) return best;
  }
  return null;
}

function compactName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\b(ru|cis|ww|by|de|fr|es|it|many|geos|cpp|cps|cpa)\b/gi, ' ')
    .replace(/[^a-z0-9а-яё]+/gi, '');
}

function cleanCampaignName(name) {
  return String(name || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\b(RU|CIS|WW|BY|DE|FR|ES|IT|Many GEOs)\b/gi, ' ')
    .replace(/[:\-–|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoryFromAdmitadCampaign(campaign) {
  const catNames = (campaign.categories || [])
    .map((c) => String(c?.name || c || '').toLowerCase())
    .join(' ');
  const blob = `${catNames} ${campaign.name || ''} ${campaign.program_type || ''}`.toLowerCase();
  if (/game|игр|cpp|cps/.test(blob)) return 'games';
  if (/marketplace|маркет|ali|joom|shop|e-?commerce|товар/.test(blob)) return 'marketplaces';
  if (/food|еда|delivery|достав/.test(blob)) return 'food';
  if (/transport|логист|cdek|Delivery/.test(blob)) return 'transport';
  return 'services';
}

async function fetchAdmitadAccessToken() {
  if (!ADMITAD_CLIENT_ID || !ADMITAD_CLIENT_SECRET) {
    console.warn('[ad-info] ADMITAD_CLIENT_ID/SECRET отсутствуют — Admitad API пропуск');
    return null;
  }
  const basic = Buffer.from(`${ADMITAD_CLIENT_ID}:${ADMITAD_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${ADMITAD_API}/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ADMITAD_CLIENT_ID,
      scope: 'advcampaigns websites',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Admitad token HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function resolveAdmitadWebsiteId(token) {
  if (ADMITAD_WEBSITE_ID) return Number(ADMITAD_WEBSITE_ID);
  const res = await fetch(`${ADMITAD_API}/websites/?limit=50&offset=0`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Admitad websites HTTP ${res.status}`);
  const data = await res.json();
  const list = data.results || [];
  const preferred =
    list.find((w) => /сайт/i.test(w.name || '') && /serpmonn/i.test(w.name || '')) ||
    list.find((w) => /сайт/i.test(w.name || '')) ||
    list.find((w) => w.status === 'active') ||
    list[0];
  if (!preferred?.id) throw new Error('Admitad: не найдена площадка website');
  console.log(`✅ Admitad website: ${preferred.id} (${preferred.name})`);
  return preferred.id;
}

async function fetchAdmitadConnectedCampaigns(token, websiteId) {
  const all = [];
  let offset = 0;
  const limit = 50;
  let total = Infinity;
  while (offset < total) {
    const url =
      `${ADMITAD_API}/advcampaigns/?website=${websiteId}` +
      `&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Admitad advcampaigns HTTP ${res.status}`);
    const data = await res.json();
    total = data._meta?.count ?? (data.results || []).length;
    const batch = data.results || [];
    for (const c of batch) {
      if (c.connected === false) continue;
      all.push(c);
    }
    if (!batch.length) break;
    offset += limit;
  }
  console.log(`✅ Admitad API: ${all.length} подключённых кампаний`);
  return all;
}

function indexPlacementsByCompactName(placements) {
  const map = new Map();
  for (const p of placements) {
    const key = compactName(p.name || '');
    if (!key) continue;
    if (!map.has(key)) map.set(key, p);
  }
  return map;
}

function collectUrlsFromText(text) {
  return [...text.matchAll(/https?:\/\/[^\s"'<>\\]+/g)].map((m) => m[0].replace(/[),.;]+$/, ''));
}

function collectAdmitadPlacements() {
  const placements = [];

  // 1) Игры партнёров
  try {
    const gamesData = loadJson(GAMES_FILE, {});
    const groups = gamesData?.ru?.games?.groups || [];
    for (const group of groups) {
      for (const platform of group.platforms || []) {
        for (const game of platform.games || []) {
          if (!game?.external) continue;
          const url = game.link || game.url || '';
          if (!url) continue;
          const host = hostOf(url);
          if (!isCpaHost(host) && host !== 'amazing.gg') continue;
          placements.push({
            name: game.name,
            description: game.description || '',
            url,
            category: 'games',
            buttonText: game.buttonText ? `${game.buttonText}: ${game.name}` : `Играть: ${game.name}`,
            origin: 'games',
          });
        }
      }
    }
  } catch (err) {
    console.warn('[ad-info] games parse:', err.message);
  }

  // 2) Меню «Партнёры» — CPA-ссылки
  try {
    const menu = fs.readFileSync(MENU_FILE, 'utf8');
    const blockMatch = menu.match(/id="partnersSubmenu"([\s\S]*?)<\/div>\s*\n\s*<!-- ========== ИНФОРМАЦИЯ О РЕКЛАМЕ/);
    const block = blockMatch ? blockMatch[1] : menu;
    const linkRe = /<a\s+href="(https?:\/\/[^"]+)"[^>]*>\s*(?:<img[^>]*>\s*)*([^<]+?)\s*<\/a>/gi;
    let m;
    while ((m = linkRe.exec(block))) {
      const url = m[1];
      const name = m[2].trim();
      const host = hostOf(url);
      if (name.toLowerCase().includes('партнёрские') || name.toLowerCase().includes('прямые')) continue;
      if (!isCpaHost(host) && host !== 'amazing.gg') continue;
      placements.push({
        name,
        description: '',
        url,
        category: host === 'admitad.com' ? 'services' : 'services',
        buttonText: `Перейти: ${name}`,
        origin: 'menu',
      });
    }
  } catch (err) {
    console.warn('[ad-info] menu parse:', err.message);
  }

  // 3) outRoutes — URL, которых ещё нет
  try {
    const src = fs.readFileSync(OUT_ROUTES_FILE, 'utf8');
    for (const url of collectUrlsFromText(src)) {
      const host = hostOf(url);
      if (!isCpaHost(host)) continue;
      placements.push({
        name: null,
        description: '',
        url,
        category: 'games',
        buttonText: null,
        origin: 'outRoutes',
      });
    }
  } catch (err) {
    console.warn('[ad-info] outRoutes parse:', err.message);
  }

  console.log(`✅ Admitad placements found: ${placements.length}`);
  return placements;
}

function buildAdmitadPartners(campaigns, placements, legal) {
  const byKey = new Map();
  const missingLegal = [];
  const placementByName = indexPlacementsByCompactName(placements);
  const coveredNames = new Set();
  const coveredSlugs = new Set();

  const markCovered = (name, slug) => {
    const cn = compactName(name || '');
    if (cn) coveredNames.add(cn);
    if (slug) coveredSlugs.add(String(slug).toLowerCase());
  };

  for (const campaign of campaigns) {
    const displayName = cleanCampaignName(campaign.name) || campaign.name || `Campaign ${campaign.id}`;
    const placement = placementByName.get(compactName(displayName))
      || placementByName.get(compactName(campaign.name));

    const probe = {
      name: displayName,
      url: placement?.url || '',
    };
    let legalEntry = resolveAdmitadLegal(probe, legal);
    if (!legalEntry && placement) {
      legalEntry = resolveAdmitadLegal(placement, legal);
    }

    const url = legalEntry?.url || placement?.url || campaign.site_url || '';
    const erid = extractEridFromUrl(url) || legalEntry?.erid || null;
    const hasInn = Boolean(extractInn(legalEntry?.adLabel || ''));

    if (!hasInn) {
      missingLegal.push({
        admitadId: campaign.id,
        name: displayName,
        rawName: campaign.name,
        siteUrl: campaign.site_url || '',
        hint: 'Добавьте запись в admitadLegal.json (byName / byErid) с ИНН',
      });
      console.warn(`[ad-info] Admitad без ИНН (пропуск): ${displayName} [${campaign.id}]`);
      continue;
    }

    const key = legalEntry.slug
      ? `admslug:${legalEntry.slug}`
      : erid
        ? `erid:${erid}`
        : `adm:${campaign.id}`;
    if (byKey.has(key)) {
      markCovered(legalEntry.name || displayName, legalEntry.slug);
      if (placement) markCovered(placement.name, legalEntry.slug);
      continue;
    }

    const name = legalEntry.name || displayName;
    byKey.set(key, {
      name,
      shortDescription:
        legalEntry.shortDescription ||
        String(campaign.description || '').replace(/<[^>]+>/g, '').slice(0, 120) ||
        'Партнёрская программа (Admitad)',
      detailedDescription:
        legalEntry.detailedDescription ||
        String(campaign.raw_description || campaign.description || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 500) ||
        'Рекламное предложение через партнёрскую сеть Admitad.',
      adLabel: legalEntry.adLabel || normalizeAdLabel('', erid),
      url,
      category: legalEntry.category || categoryFromAdmitadCampaign(campaign),
      buttonText: legalEntry.buttonTextRu || placement?.buttonText || `Перейти: ${name}`,
      source: 'admitad',
      _key: key,
      _admitadId: campaign.id,
    });
    markCovered(name, legalEntry.slug);
    markCovered(displayName, legalEntry.slug);
    if (placement) markCovered(placement.name, legalEntry.slug);
  }

  // Размещения на сайте с legal, которых ещё нет (рефералка Admitad / только меню)
  for (const p of placements) {
    const legalEntry = resolveAdmitadLegal(p, legal);
    const host = hostOf(p.url);
    const hasInn = Boolean(extractInn(legalEntry?.adLabel || ''));
    if (!hasInn && host !== 'admitad.com') continue;

    const name = p.name || legalEntry?.name || host;
    if (coveredNames.has(compactName(name))) continue;
    if (legalEntry?.name && coveredNames.has(compactName(legalEntry.name))) continue;
    if (legalEntry?.slug && coveredSlugs.has(String(legalEntry.slug).toLowerCase())) continue;

    const erid = extractEridFromUrl(p.url) || legalEntry?.erid;
    const key =
      host === 'admitad.com'
        ? 'adm:admitad'
        : legalEntry?.slug
          ? `admslug:${legalEntry.slug}`
          : erid
            ? `erid:${erid}`
            : `adm:${slugify(name)}`;
    if (byKey.has(key)) continue;

    const adLabel =
      legalEntry?.adLabel ||
      (host === 'admitad.com' ? 'Реклама. ООО «Адмитад», ИНН:7723486057' : normalizeAdLabel('', erid));

    byKey.set(key, {
      name,
      shortDescription: legalEntry?.shortDescription || p.description?.slice(0, 120) || 'Партнёрская программа (Admitad)',
      detailedDescription:
        legalEntry?.detailedDescription ||
        p.description ||
        'Рекламное предложение через партнёрскую сеть Admitad.',
      adLabel,
      url: p.url || legalEntry?.url,
      category: legalEntry?.category || p.category || 'services',
      buttonText: p.buttonText || legalEntry?.buttonTextRu || `Перейти: ${name}`,
      source: 'admitad',
      _key: key,
    });
    markCovered(name, legalEntry?.slug);
  }

  // Сеть Admitad из legal, если ещё нет
  for (const entry of Object.values(legal.byErid)) {
    const host = hostOf(entry.url || '');
    if (host !== 'admitad.com') continue;
    const key = 'adm:admitad';
    if (byKey.has(key)) continue;
    byKey.set(key, {
      name: entry.name,
      shortDescription: entry.shortDescription || 'Партнёрская сеть',
      detailedDescription: entry.detailedDescription || '',
      adLabel: entry.adLabel,
      url: entry.url,
      category: entry.category || 'services',
      buttonText: entry.buttonTextRu || `Перейти: ${entry.name}`,
      source: 'admitad',
      _key: key,
    });
  }

  console.log(`✅ Admitad: ${byKey.size} карточек (без ИНН пропущено: ${missingLegal.length})`);
  return { byKey, missingLegal };
}

function mergePartners(perfMap, admMap) {
  // Ключи разные (inn: vs erid:), но один бренд может пересечься по ИНН в adLabel Admitad
  const out = new Map();
  const innToKey = new Map();

  for (const [key, card] of perfMap) {
    out.set(key, card);
    const inn = extractInn(card.adLabel);
    if (inn) innToKey.set(inn, key);
  }

  for (const [key, card] of admMap) {
    const inn = extractInn(card.adLabel);
    if (inn && innToKey.has(inn)) {
      // уже есть из Perfluence — не дублируем
      continue;
    }
    out.set(key, card);
  }

  return out;
}

function toPartnersList(map) {
  const list = {};
  const sorted = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  for (const card of sorted) {
    const idBase = slugify(card.name);
    let id = idBase;
    let n = 2;
    while (list[id]) {
      id = `${idBase}-${n++}`;
    }
    list[id] = {
      name: card.name,
      shortDescription: card.shortDescription,
      detailedDescription: card.detailedDescription,
      adLabel: card.adLabel,
      url: card.url,
      category: card.category,
      buttonText: card.buttonText,
    };
  }
  return list;
}

function applyPartnersToAdInfo(partnersList, meta) {
  const adInfo = loadJson(AD_INFO_FILE);
  if (!adInfo || typeof adInfo !== 'object') {
    throw new Error('adInfo.json unreadable');
  }

  let localesUpdated = 0;
  for (const locale of Object.keys(adInfo)) {
    const block = adInfo[locale]?.adInfo;
    if (!block) continue;
    block.partnersList = partnersList;
    // категории: базовые RU-имена; для не-ru оставляем как было, если есть, иначе EN fallback
    if (!block.partnerCategories || locale === 'ru') {
      block.partnerCategories = { ...BASE_CATEGORIES_RU };
    }
    localesUpdated++;
  }

  fs.writeFileSync(AD_INFO_FILE, `${JSON.stringify(adInfo, null, 2)}\n`);
  fs.writeFileSync(META_OUT_FILE, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`💾 adInfo.json обновлён (${localesUpdated} локалей), карточек: ${Object.keys(partnersList).length}`);
}

async function main() {
  console.log(`📁 ROOT=${ROOT}`);

  let perfItems = [];
  try {
    const live = await fetchPerfluenceItems();
    if (live?.length) {
      perfItems = live;
      console.log(`✅ Perfluence API: ${live.length}`);
    } else {
      perfItems = loadPromoCacheItems();
      console.log(`✅ Perfluence cache: ${perfItems.length}`);
    }
  } catch (err) {
    console.warn(`[ad-info] Perfluence API: ${err.message} — cache`);
    perfItems = loadPromoCacheItems();
  }

  const legal = loadAdmitadLegal();
  const placements = collectAdmitadPlacements();

  let campaigns = [];
  let admitadSource = 'placements+admitadLegal';
  try {
    const token = await fetchAdmitadAccessToken();
    if (token) {
      const websiteId = await resolveAdmitadWebsiteId(token);
      campaigns = await fetchAdmitadConnectedCampaigns(token, websiteId);
      admitadSource = 'api+admitadLegal+placements';
    }
  } catch (err) {
    console.warn(`[ad-info] Admitad API: ${err.message} — fallback на placements`);
    admitadSource = 'placements+admitadLegal (api_failed)';
  }

  const perfMap = buildPerfluencePartners(perfItems);
  const { byKey: admMap, missingLegal } = buildAdmitadPartners(campaigns, placements, legal);
  const merged = mergePartners(perfMap, admMap);
  const partnersList = toPartnersList(merged);

  fs.writeFileSync(
    ADMITAD_MISSING_FILE,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), missing: missingLegal }, null, 2)}\n`,
  );
  if (missingLegal.length) {
    console.warn(`⚠️ Нужен ИНН в admitadLegal.json: ${missingLegal.length} → ${ADMITAD_MISSING_FILE}`);
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    counts: {
      perfluence: perfMap.size,
      admitad: admMap.size,
      admitadApiCampaigns: campaigns.length,
      admitadMissingLegal: missingLegal.length,
      merged: merged.size,
      cards: Object.keys(partnersList).length,
    },
    sources: {
      perfluence: PERFLUENCE_KEY ? 'api_or_cache' : 'cache',
      admitad: admitadSource,
    },
    missingLegalNames: missingLegal.map((m) => m.name),
  };

  applyPartnersToAdInfo(partnersList, meta);
  console.log('✅ Готово:', meta.counts);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
