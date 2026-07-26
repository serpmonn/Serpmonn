// sync-admitad-games.mjs
// Обновляет localesGames.json → groups[partners] из Admitad API (connected)
// + admitadLegal.json (ИНН/URL/erid). Собственные игры Serpmonn не трогает.
// Без ИНН в legal оффер не попадает в партнёрские игры.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

dotenv.config({ path: path.join(ROOT, 'backend/.env') });
dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const GAMES_FILE = path.join(ROOT, 'assembly/site/_data/localesGames.json');
const ADMITAD_LEGAL_FILE = path.join(ROOT, 'assembly/site/_data/admitadLegal.json');
const META_OUT = path.join(ROOT, 'assembly/site/_data/admitadGames.meta.json');

const ADMITAD_CLIENT_ID = process.env.ADMITAD_CLIENT_ID;
const ADMITAD_CLIENT_SECRET = process.env.ADMITAD_CLIENT_SECRET;
const ADMITAD_WEBSITE_ID = process.env.ADMITAD_WEBSITE_ID;
const ADMITAD_API = 'https://api.admitad.com';

function loadJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function extractInn(text) {
  const m = String(text || '').match(/ИНН[:\s]*([0-9]{10,12})/i);
  return m ? m[1] : null;
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

function shortAdLabel(adLabel) {
  const raw = String(adLabel || '').trim();
  if (!raw) return '';
  // Убираем хвост erid для карточки (erid остаётся в URL)
  return raw.replace(/,?\s*erid:\s*\S+/i, '').replace(/\s{2,}/g, ' ').trim();
}

function resolveLegalByName(name, legal) {
  const nameKey = String(name || '').trim().toLowerCase();
  if (nameKey && legal.byName[nameKey]) return legal.byName[nameKey];
  const compact = compactName(nameKey);
  let best = null;
  let bestLen = 0;
  for (const [n, entry] of Object.entries(legal.byName || {})) {
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
  return best;
}

function isGameCampaign(campaign, legalEntry) {
  if (legalEntry?.category === 'games') return true;
  if (legalEntry && legalEntry.category && legalEntry.category !== 'games') return false;
  const cats = (campaign.categories || [])
    .map((c) => String(c?.name || c || '').toLowerCase())
    .join(' ');
  const blob = `${cats} ${campaign.name || ''} ${campaign.program_type || ''}`.toLowerCase();
  if (/marketplace|маркет|ali|joom|shop|cdek|reg\.?ru|достав|hosting|domain/.test(blob)) {
    return false;
  }
  return /game|игр|cpp|cps|mmorpg|shooter|rpg|play/.test(blob);
}

async function fetchAdmitadAccessToken() {
  if (!ADMITAD_CLIENT_ID || !ADMITAD_CLIENT_SECRET) {
    throw new Error('ADMITAD_CLIENT_ID/SECRET отсутствуют');
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
  if (!res.ok) throw new Error(`Admitad token HTTP ${res.status}`);
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
  return all;
}

function indexExistingPartnerGames(gamesData) {
  const byCompact = new Map();
  const ruPartners = (gamesData.ru?.games?.groups || []).find((g) => g.key === 'partners');
  for (const platform of ruPartners?.platforms || []) {
    for (const game of platform.games || []) {
      byCompact.set(compactName(game.name), game);
    }
  }
  return byCompact;
}

function playButtonForLocale(locale, gamesData) {
  const serp = (gamesData[locale]?.games?.groups || []).find((g) => g.key === 'serpmonn');
  for (const platform of serp?.platforms || []) {
    const btn = platform.games?.[0]?.buttonText;
    if (btn) return btn;
  }
  if (locale === 'ru') return 'Играть';
  return 'Play';
}

function buildPartnerGames(campaigns, legal, existingByName) {
  const games = [];
  const missing = [];
  const seenSlugs = new Set();

  for (const campaign of campaigns) {
    const displayName = cleanCampaignName(campaign.name) || campaign.name;
    const legalEntry = resolveLegalByName(displayName, legal) || resolveLegalByName(campaign.name, legal);
    if (!isGameCampaign(campaign, legalEntry)) continue;

    if (!legalEntry || !extractInn(legalEntry.adLabel || '')) {
      missing.push({
        admitadId: campaign.id,
        name: displayName,
        siteUrl: campaign.site_url || '',
        hint: 'Нужен ИНН в admitadLegal.json для партнёрской игры',
      });
      continue;
    }

    const slug = legalEntry.slug || compactName(legalEntry.name || displayName);
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    const prev = existingByName.get(compactName(legalEntry.name)) || existingByName.get(compactName(displayName));
    const link = legalEntry.url || prev?.link || campaign.site_url || '';
    if (!link) {
      missing.push({
        admitadId: campaign.id,
        name: displayName,
        siteUrl: campaign.site_url || '',
        hint: 'Нет CPA URL в legal/url',
      });
      continue;
    }

    const rawDesc =
      legalEntry.detailedDescription ||
      legalEntry.shortDescription ||
      String(campaign.description || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 220) ||
      '';
    const description = rawDesc
      ? rawDesc.charAt(0).toLocaleUpperCase('ru-RU') + rawDesc.slice(1)
      : '';

    games.push({
      slug,
      admitadId: campaign.id,
      name: legalEntry.name || displayName,
      image: prev?.image || legalEntry.image || '',
      description,
      link,
      external: true,
      buttonTextRu: legalEntry.buttonTextRu || 'Играть',
      adLabel: shortAdLabel(legalEntry.adLabel),
      adLabelFull: legalEntry.adLabel,
    });
  }

  games.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return { games, missing };
}

function applyToLocales(gamesData, partnerGames, missing) {
  const locales = Object.keys(gamesData).filter(
    (k) => k !== 'locales' && gamesData[k]?.games?.groups
  );

  for (const locale of locales) {
    const groups = gamesData[locale].games.groups;
    const partners = groups.find((g) => g.key === 'partners');
    if (!partners) continue;

    const playBtn = playButtonForLocale(locale, gamesData);
    const localizedGames = partnerGames.map((g, idx) => ({
      position: String(idx + 1),
      name: g.name,
      ...(g.image ? { image: g.image } : {}),
      description: g.description,
      link: g.link,
      external: true,
      buttonText: locale === 'ru' ? g.buttonTextRu || playBtn : playBtn,
      adLabel: g.adLabel,
    }));

    for (const platform of partners.platforms || []) {
      if (platform.key === 'pc') {
        platform.games = localizedGames;
      } else {
        platform.games = platform.games || [];
        // web/mobile партнёров пока нет в API-модели — очищаем, чтобы не держать stale
        platform.games = [];
      }
    }

    // SEO totalGames: свои + партнёры
    const serp = groups.find((g) => g.key === 'serpmonn');
    let own = 0;
    for (const p of serp?.platforms || []) own += (p.games || []).length;
    gamesData[locale].games.totalGames = String(own + localizedGames.length);
  }

  fs.writeFileSync(GAMES_FILE, `${JSON.stringify(gamesData, null, 2)}\n`);
  fs.writeFileSync(
    META_OUT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        partnerGames: partnerGames.length,
        missingLegal: missing.length,
        names: partnerGames.map((g) => g.name),
        missing,
      },
      null,
      2
    )}\n`
  );
}

async function main() {
  console.log(`📁 ROOT=${ROOT}`);
  const legalRaw = loadJson(ADMITAD_LEGAL_FILE, { byErid: {}, byName: {} });
  const legal = {
    byErid: legalRaw.byErid || {},
    byName: legalRaw.byName || {},
  };
  const gamesData = loadJson(GAMES_FILE);
  if (!gamesData?.ru?.games) throw new Error('localesGames.json unreadable');

  const existing = indexExistingPartnerGames(gamesData);
  const token = await fetchAdmitadAccessToken();
  const websiteId = await resolveAdmitadWebsiteId(token);
  console.log(`✅ Admitad website ${websiteId}`);
  const campaigns = await fetchAdmitadConnectedCampaigns(token, websiteId);
  console.log(`✅ Connected campaigns: ${campaigns.length}`);

  const { games, missing } = buildPartnerGames(campaigns, legal, existing);
  console.log(`✅ Partner games with legal: ${games.length}`);
  if (missing.length) {
    console.warn(`⚠️ Без legal/ИНН пропущено: ${missing.length}`);
    for (const m of missing) console.warn(`   - ${m.name} [${m.admitadId}]`);
  }

  applyToLocales(gamesData, games, missing);
  console.log(`💾 localesGames.json partners updated (${games.map((g) => g.name).join(', ')})`);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
