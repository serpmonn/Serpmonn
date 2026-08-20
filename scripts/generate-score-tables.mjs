#!/usr/bin/env node
/**
 * Regenerate localized score_table.html for all locales (redsquare2 + Neli).
 * Usage: node scripts/generate-score-tables.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ALL_LOCALES,
  ROOT_LOCALES,
  RTL_LOCALES,
  TIME_LABEL,
  PAGE_H1,
  META_DESCRIPTION,
  LOAD_FAIL,
  pick,
} from '../frontend/games/redsquare2/redsquare2_scripts/leaderboard-page-i18n.mjs';

const FRONTEND = path.resolve('/var/www/serpmonn-dev/frontend');

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function extractTwitterGameName(html) {
  const m = html.match(/twitter:title" content="([^"]+)"/);
  if (!m) return null;
  return m[1].replace(/\s*[—–-]\s*Serpmonn\s*$/i, '').trim();
}

function extractTableHeaders(html) {
  const ths = [...html.matchAll(/<th>([^<]+)<\/th>/g)].map((m) => m[1].trim());
  if (ths.length >= 3) return ths.slice(0, 3);
  return null;
}

function localeDir(locale) {
  return ROOT_LOCALES.has(locale)
    ? path.join(FRONTEND, 'games', 'redsquare2')
    : path.join(FRONTEND, locale, 'games', 'redsquare2');
}

function canonicalUrl(locale) {
  return ROOT_LOCALES.has(locale)
    ? 'https://serpmonn.ru/frontend/games/redsquare2/score_table.html'
    : `https://serpmonn.ru/frontend/${locale}/games/redsquare2/score_table.html`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPage(locale, data) {
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
  const title = `${data.pageH1} — Serpmonn`;

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Language" content="${escapeHtml(locale)}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(data.metaDescription)}">
  <link rel="canonical" href="${escapeHtml(data.canonical)}"/>
  <link rel="icon" href="/frontend/images/serpmonn.ico?v=3" type="image/x-icon">
  <link rel="stylesheet" href="/frontend/styles/styles.css">
  <link rel="stylesheet" href="/frontend/styles/menu.css">
  <link rel="stylesheet" href="/frontend/styles/accessibility.css">
  <link rel="stylesheet" href="/frontend/games/redsquare2/redsquare2_styles/leaderboards.css?v=2">
  <script>
  window.lbI18n = ${JSON.stringify({ loadFail: data.loadFail })};
  </script>
  <script type="module" src="/frontend/scripts/menu-loader.js" defer></script>
  <script type="module" src="/frontend/games/redsquare2/redsquare2_scripts/leaderboard.js?v=3" defer></script>
  <script async src="https://ad.mail.ru/static/ads-async.js"></script>
</head>
<body>
    <div class="ad-container leaderboard-top-ad">
        <ins class="mrg-tag" style="display:inline-block;width:320px;height:50px"
             data-ad-client="ad-1898031" data-ad-slot="1898031"></ins>
    </div>

    <h1 class="leaderboard-page-title">${escapeHtml(data.pageH1)}</h1>

    <div class="leaderboard-grid">
        <section class="leaderboard-board" id="redsquare2-board">
            <h2>${escapeHtml(data.rs2Name)}</h2>
            <table>
                <thead>
                    <tr>
                        <th>${escapeHtml(data.rank)}</th>
                        <th>${escapeHtml(data.nick)}</th>
                        <th>${escapeHtml(data.score)}</th>
                    </tr>
                </thead>
                <tbody id="leaderboardBodyRedsquare2"></tbody>
            </table>
        </section>

        <section class="leaderboard-board" id="neli-board">
            <h2>Neli</h2>
            <table>
                <thead>
                    <tr>
                        <th>${escapeHtml(data.rank)}</th>
                        <th>${escapeHtml(data.nick)}</th>
                        <th>${escapeHtml(data.time)}</th>
                    </tr>
                </thead>
                <tbody id="leaderboardBodyNeli"></tbody>
            </table>
        </section>
    </div>

    <div class="ad-container" style="margin: 20px 0; text-align: center;">
        <ins class="mrg-tag" style="display:inline-block;width:300px;height:250px"
             data-ad-client="ad-1897960" data-ad-slot="1897960"></ins>
    </div>
<script src="/frontend/scripts/mobile-enhancements.js?v=promo35" defer></script>

<script type="module" src="/frontend/scripts/ad-slot-init.js"></script>

</body>
</html>
`;
}

function collectLocaleData(locale) {
  const dir = localeDir(locale);
  const rs2Html = readFileSafe(path.join(dir, 'redsquare2.html'));
  const scoreHtml = readFileSafe(path.join(dir, 'score_table.html'));
  const headers = extractTableHeaders(scoreHtml) || extractTableHeaders(readFileSafe(path.join(FRONTEND, 'en/games/redsquare2/score_table.html')));
  const rs2Name = extractTwitterGameName(rs2Html)
    || extractTwitterGameName(readFileSafe(path.join(FRONTEND, 'games/redsquare2/redsquare2.html')))
    || 'Falling figures';

  return {
    pageH1: pick(PAGE_H1, locale),
    metaDescription: pick(META_DESCRIPTION, locale),
    loadFail: pick(LOAD_FAIL, locale),
    canonical: canonicalUrl(locale),
    rs2Name: locale === 'ru' ? 'Падающие фигуры' : rs2Name,
    rank: headers[0],
    nick: headers[1],
    score: headers[2],
    time: pick(TIME_LABEL, locale),
  };
}

function main() {
  let written = 0;
  for (const locale of ALL_LOCALES) {
    const outDir = localeDir(locale);
    const outPath = path.join(outDir, 'score_table.html');
    const data = collectLocaleData(locale);
    const html = buildPage(locale, data);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, html, 'utf8');
    written += 1;
    console.log(`✓ ${locale} → ${outPath}`);
  }
  console.log(`\nGenerated ${written} score_table.html files.`);
}

main();
