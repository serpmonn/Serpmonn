#!/usr/bin/env node
/**
 * SEO hygiene for duplicates — WITHOUT collapsing locales onto RU.
 * Policy: each locale keeps self-canonical.
 *
 * - knowledge-base updates-august-17: ensure self-canonical + hreflang
 * - games/<name>/index.html redirects to <name>.html when that file exists
 * - KB articles missing hreflang: insert alternate links (self-canonical kept)
 */
import fs from 'fs';
import path from 'path';

const DEPLOY_TARGETS = {
  prod: '/var/www/serpmonn.ru/frontend',
  dev: '/var/www/serpmonn-dev/frontend'
};

const deployTargetKey = String(process.env.DEPLOY_TARGET || 'prod').trim().toLowerCase();
const FRONTEND =
  process.env.DEPLOY_FRONTEND ||
  DEPLOY_TARGETS[deployTargetKey] ||
  DEPLOY_TARGETS.prod;

const ROOT =
  FRONTEND.endsWith('/frontend') ? FRONTEND.slice(0, -'/frontend'.length) : path.dirname(FRONTEND);

const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://serpmonn.ru').replace(/\/$/, '');
const LOCALES = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'assembly/site/_data/locales.json'), 'utf8')
);

const HREFLANG_ARTICLE_SLUGS = [
  'updates-august-17.html',
  'how-to-calculate-depreciation.html',
  'how-to-calculate-the-eco-footprint-of-products.html',
  'indexnow-practical-guide.html'
];

function absUrl(pathname) {
  if (/^https?:\/\//i.test(pathname)) return pathname;
  return `${SITE_ORIGIN}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
}

function articlePath(locale, slug) {
  if (locale === 'ru') return `/frontend/knowledge-base/articles/${slug}`;
  return `/frontend/${locale}/knowledge-base/articles/${slug}`;
}

function articleAbs(locale, slug) {
  return absUrl(articlePath(locale, slug));
}

function hreflangBlock(slug) {
  const lines = [];
  for (const loc of LOCALES) {
    lines.push(`    <link rel="alternate" href="${articleAbs(loc, slug)}" hreflang="${loc}" />`);
  }
  lines.push(`    <link rel="alternate" href="${articleAbs('ru', slug)}" hreflang="x-default" />`);
  return lines.join('\n');
}

function redirectHtml(targetAbs, label = 'Перейти') {
  const safe = targetAbs.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="robots" content="noindex, follow">
  <meta http-equiv="refresh" content="0;url=${safe}">
  <link rel="canonical" href="${safe}">
  <script>location.replace(${JSON.stringify(targetAbs)});</script>
  <title>Переадресация</title>
</head>
<body><p><a href="${safe}">${label}</a></p></body>
</html>`;
}

function ensureSelfCanonicalAndHreflang(filePath, locale, slug) {
  if (!fs.existsSync(filePath)) return false;
  let html = fs.readFileSync(filePath, 'utf8');
  const selfCan = articleAbs(locale, slug);
  const block = `    <link rel="canonical" href="${selfCan}" />\n${hreflangBlock(slug)}\n`;

  html = html.replace(/\s*<link\s+rel=["']canonical["'][^>]*>\s*/gi, '\n');
  html = html.replace(
    new RegExp(`\\s*<link\\s+rel=["']alternate["'][^>]*${slug.replace(/\./g, '\\.')}[^>]*>\\s*`, 'gi'),
    '\n'
  );

  if (!html.includes('</head>')) return false;
  html = html.replace('</head>', `${block}</head>`);
  fs.writeFileSync(filePath, html);
  return true;
}

function walkArticles() {
  let n = 0;
  for (const slug of HREFLANG_ARTICLE_SLUGS) {
    const ru = path.join(FRONTEND, 'knowledge-base/articles', slug);
    if (ensureSelfCanonicalAndHreflang(ru, 'ru', slug)) n += 1;
    for (const loc of LOCALES) {
      if (loc === 'ru') continue;
      const p = path.join(FRONTEND, loc, 'knowledge-base/articles', slug);
      if (ensureSelfCanonicalAndHreflang(p, loc, slug)) n += 1;
    }
  }
  return n;
}

function resolveGameTarget(gameDir) {
  const game = path.basename(gameDir);
  const preferred = path.join(gameDir, `${game}.html`);
  if (fs.existsSync(preferred)) return `${game}.html`;
  const others = fs
    .readdirSync(gameDir)
    .filter((f) => f.endsWith('.html') && f !== 'index.html');
  if (others.length === 1) return others[0];
  return null;
}

function walkGameIndexes() {
  let redirected = 0;
  let skipped = 0;

  function handle(gameDir, urlPrefix) {
    const indexPath = path.join(gameDir, 'index.html');
    if (!fs.existsSync(indexPath) && !resolveGameTarget(gameDir)) return;
    if (!fs.existsSync(gameDir)) return;

    const targetFile = resolveGameTarget(gameDir);
    if (!targetFile) {
      // rat/typing etc. — only index exists; leave self page alone
      skipped += 1;
      return;
    }

    const targetAbs = absUrl(`${urlPrefix}/${targetFile}`);
    fs.mkdirSync(gameDir, { recursive: true });
    fs.writeFileSync(indexPath, redirectHtml(targetAbs, `Перейти к ${path.basename(gameDir)}`));
    redirected += 1;
  }

  const rootGames = path.join(FRONTEND, 'games');
  if (fs.existsSync(rootGames)) {
    for (const ent of fs.readdirSync(rootGames, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      handle(path.join(rootGames, ent.name), `/frontend/games/${ent.name}`);
    }
  }

  const localeDirs = new Set(LOCALES.filter((l) => l !== 'ru'));
  // also scan filesystem for locale game trees Google may still hit
  for (const ent of fs.readdirSync(FRONTEND, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (ent.name === 'games' || ent.name === 'knowledge-base') continue;
    const gamesDir = path.join(FRONTEND, ent.name, 'games');
    if (!fs.existsSync(gamesDir)) continue;
    localeDirs.add(ent.name);
  }

  for (const loc of localeDirs) {
    const gamesDir = path.join(FRONTEND, loc, 'games');
    if (!fs.existsSync(gamesDir)) continue;
    for (const ent of fs.readdirSync(gamesDir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      handle(path.join(gamesDir, ent.name), `/frontend/${loc}/games/${ent.name}`);
    }
  }

  return { redirected, skipped };
}

console.log(`fix-duplicate-canonicals → ${FRONTEND} (self-canonical per locale)`);
const articles = walkArticles();
const games = walkGameIndexes();
console.log(`✅ KB articles self-canonical+hreflang: ${articles}`);
console.log(`✅ game index.html → *.html redirects: ${games.redirected}`);
console.log(`ℹ️  game index left as sole page (rat/typing etc.): ${games.skipped}`);
