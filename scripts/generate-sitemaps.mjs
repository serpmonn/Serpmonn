#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'frontend');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'sitemaps');
const SITE_BASE = 'https://www.serpmonn.ru';

/**
 * Returns true if the entry name looks like a language code directory
 * e.g. en, pt-pt, es-419, zh-cn
 */
function isLanguageDirName(name) {
  return /^[a-z]{2}(-[a-z0-9]+)?$/.test(name);
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function listHtmlFilesRecursive(dir) {
  const results = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const p = path.join(current, ent.name);
      if (ent.isDirectory()) {
        stack.push(p);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) {
        results.push(p);
      }
    }
  }
  return results;
}

function toUrl(filePath) {
  const rel = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  return `${SITE_BASE}/${rel}`;
}

function formatDateYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function writeFileEnsured(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

const EXCLUDE_DIRS = new Set(['search', 'scripts', 'styles', 'images', 'dev']);

function listHtmlFilesFiltered(rootDir) {
  const results = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const p = path.join(current, ent.name);
      if (ent.isDirectory()) {
        if (!EXCLUDE_DIRS.has(ent.name)) stack.push(p);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) {
        results.push(p);
      }
    }
  }
  return results;
}

function generateSitemapForLang(langDirName) {
  const today = formatDateYYYYMMDD(new Date());
  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  // index.html
  const indexFile = path.join(FRONTEND_DIR, langDirName, 'index.html');
  if (fileExists(indexFile)) {
    const url = toUrl(indexFile);
    parts.push(
      `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.80</priority>\n  </url>`
    );
  }

  // Include all other HTML pages in this language (filtered)
  const langRoot = path.join(FRONTEND_DIR, langDirName);
  const files = listHtmlFilesFiltered(langRoot)
    .filter((p) => path.resolve(p) !== path.resolve(indexFile))
    .sort();
  for (const f of files) {
    const url = toUrl(f);
    const isAdInfo = /\/ad-info\//.test(f);
    const changefreq = isAdInfo ? 'monthly' : 'weekly';
    const priority = isAdInfo ? '0.60' : '0.55';
    parts.push(
      `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    );
  }

  parts.push('</urlset>');
  const outPath = path.join(OUTPUT_DIR, `sitemap-${langDirName}.xml`);
  writeFileEnsured(outPath, parts.join('\n'));
  return outPath;
}

function generateSitemapForRU() {
  const today = formatDateYYYYMMDD(new Date());
  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  // Root homepage
  parts.push(
    `  <url>\n    <loc>${SITE_BASE}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.90</priority>\n  </url>`
  );

  // Other RU pages: top-level frontend HTMLs not inside language dirs
  const entries = fs.readdirSync(FRONTEND_DIR, { withFileTypes: true });
  const langNames = new Set(entries.filter(e => e.isDirectory() && isLanguageDirName(e.name)).map(e => e.name));

  const ruFiles = [];
  for (const ent of entries) {
    const p = path.join(FRONTEND_DIR, ent.name);
    if (ent.isDirectory()) {
      if (!langNames.has(ent.name) && !EXCLUDE_DIRS.has(ent.name)) {
        ruFiles.push(...listHtmlFilesFiltered(p));
      }
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) {
      ruFiles.push(p);
    }
  }
  // Exclude searchresults explicitly for RU
  const filtered = ruFiles.filter((p) => !/\/search\//.test(p)).sort();
  for (const f of filtered) {
    const url = toUrl(f);
    parts.push(
      `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.60</priority>\n  </url>`
    );
  }

  parts.push('</urlset>');
  const outPath = path.join(OUTPUT_DIR, `sitemap-ru.xml`);
  writeFileEnsured(outPath, parts.join('\n'));
  return outPath;
}

function generateIndex(langs) {
  const today = formatDateYYYYMMDD(new Date());
  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  // RU first
  parts.push(
    `  <sitemap>\n    <loc>${SITE_BASE}/sitemaps/sitemap-ru.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`
  );
  for (const l of langs) {
    const loc = `${SITE_BASE}/sitemaps/sitemap-${l}.xml`;
    parts.push(
      `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`
    );
  }
  parts.push('</sitemapindex>');
  const outPath = path.join(OUTPUT_DIR, 'sitemap-index.xml');
  writeFileEnsured(outPath, parts.join('\n'));
  return outPath;
}

function main() {
  if (!fileExists(FRONTEND_DIR)) {
    console.error(`Not found: ${FRONTEND_DIR}`);
    process.exit(1);
  }
  const entries = fs.readdirSync(FRONTEND_DIR, { withFileTypes: true });
  const langs = entries
    .filter((e) => {
      if (!e.isDirectory()) return false;
      if (!isLanguageDirName(e.name)) return false;
      // Treat as a true language only if it has its own index.html
      const langIndex = path.join(FRONTEND_DIR, e.name, 'index.html');
      return fileExists(langIndex);
    })
    .map((e) => e.name)
    .sort();

  if (langs.length === 0) {
    console.warn('No language directories found to generate sitemaps.');
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const generated = [];
  // RU sitemap
  generated.push(generateSitemapForRU());
  for (const l of langs) {
    const p = generateSitemapForLang(l);
    generated.push(p);
  }
  const idx = generateIndex(langs);
  console.log('Generated:', [...generated, idx].map((p) => path.relative(PROJECT_ROOT, p)).join('\n'));
}

main();

