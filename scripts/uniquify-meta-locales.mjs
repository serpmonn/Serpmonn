#!/usr/bin/env node
/**
 * Make pageTitle / meta description unique per locale when the same
 * string is shared across multiple locales (Yandex duplicate title/description).
 *
 * - Updates assembly/site/_data JSON (source of truth)
 * - Patches live frontend HTML meta tags for immediate effect
 *
 * Usage: node scripts/uniquify-meta-locales.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'assembly/site/_data');
const FRONTEND = path.join(ROOT, 'frontend');
const DRY = process.argv.includes('--dry-run');

const LOCALE_RE = /^(ar|az|be|bg|bn|cs|da|de|dv|el|en|es|es-419|fa|fi|fil|fr|he|hi|hu|hy|id|it|ja|ka|kk|ko|ks|ku-arab|ms|nb|nl|pl|ps|pt-br|pt-pt|ro|ru|sd|sr|sv|th|tr|ug|ur|uz|vi|yi|zh-cn)$/i;

const TITLE_KEYS = new Set([
  'pageTitle',
  'ogTitle',
  'twitterTitle',
  'title',
]);
const DESC_KEYS = new Set([
  'metaDescription',
  'ogDescription',
  'twitterDescription',
  'description',
]);

const DATA_FILES = [
  'gameFlappyTranslations.json',
  'gameRatTranslations.json',
  'gameTypingTranslations.json',
  'gameBreakoutTranslations.json',
  'gameSnakeTranslations.json',
  'gameCoinsTranslations.json',
  'gameFifteenTranslations.json',
  'gameMinesweeperTranslations.json',
  'gameRedsquareTranslations.json',
  'gameRedsquare2Translations.json',
  'game2048Translations.json',
  'base64Converter.json',
  'jsonFormatter.json',
  'formatConverter.json',
  'utmBuilder.json',
  'passwordGenerator.json',
  'wordCounter.json',
  'fuelCalculator.json',
  'unitConverter.json',
  'tools.json',
  'login.json',
  'authTranslations.json',
  'forgot.json',
  'registerTranslations.json',
  'profile.json',
  // knowledge-base articles
  'jsonFormatterGuide.json',
  'cookiesCompleteGuide.json',
  'portForwardingGuide.json',
  'indexnowPracticalGuide.json',
  'utmCompleteGuide.json',
  'webDevelopmentGuide.json',
  'webTechTrends2025.json',
  'howToCalculateDepreciation.json',
  'ecoFootprintTranslations.json',
  'updatesAugust17.json',
  'updatesAug25Sep15.json',
  'updatesSep15Jul22.json',
  'serpmonnInstallGuide.json',
  'trainingAndNutritionGuide.json',
  'snippetLimitsVkTelegramYoutubeTiktok.json',
];

function preferLocale(locales) {
  const set = new Set(locales);
  if (set.has('en')) return 'en';
  if (set.has('ru')) return 'ru';
  return [...locales].sort()[0];
}

function alreadySuffixed(value, locale) {
  const esc = locale.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`[(\\[]${esc}[)\\]]$`, 'i').test(value.trim());
}

function withLocaleSuffix(value, locale) {
  if (!value || typeof value !== 'string') return value;
  if (alreadySuffixed(value, locale)) return value;
  return `${value} (${locale})`;
}

/** Collect { locale -> Map(fieldPath -> value) } for title/desc string fields */
function collectLocaleFields(obj, localePayload) {
  const out = new Map(); // fieldPath -> value
  function walk(node, trail) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    for (const [k, v] of Object.entries(node)) {
      const p = trail ? `${trail}.${k}` : k;
      if (typeof v === 'string' && (TITLE_KEYS.has(k) || DESC_KEYS.has(k))) {
        out.set(p, v);
      } else if (v && typeof v === 'object') {
        walk(v, p);
      }
    }
  }
  walk(localePayload, '');
  return out;
}

function setByPath(obj, fieldPath, value) {
  const parts = fieldPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') return false;
    cur = cur[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (!(last in cur)) return false;
  cur[last] = value;
  return true;
}

function uniquifyDataFile(fileName) {
  const filePath = path.join(DATA, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`skip missing ${fileName}`);
    return { changed: 0 };
  }
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const locales = Object.keys(json).filter((k) => LOCALE_RE.test(k));
  if (locales.length < 2) return { changed: 0 };

  // fieldPath -> Map(value -> [locales])
  const byField = new Map();
  for (const loc of locales) {
    const fields = collectLocaleFields(json, json[loc]);
    for (const [fp, val] of fields) {
      if (!byField.has(fp)) byField.set(fp, new Map());
      const vm = byField.get(fp);
      if (!vm.has(val)) vm.set(val, []);
      vm.get(val).push(loc);
    }
  }

  let changed = 0;
  for (const [fp, valueMap] of byField) {
    for (const [val, locs] of valueMap) {
      if (locs.length < 2) continue;
      const keep = preferLocale(locs);
      for (const loc of locs) {
        if (loc === keep) continue;
        const next = withLocaleSuffix(val, loc);
        if (next === val) continue;
        if (setByPath(json[loc], fp, next)) changed++;
      }
    }
  }

  if (changed && !DRY) {
    fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  }
  return { changed };
}

function detectLocaleFromHtmlPath(relPath) {
  // frontend/de/games/... or frontend/games/... (ru)
  const parts = relPath.split(/[/\\]/).filter(Boolean);
  if (parts[0] === 'frontend') parts.shift();
  if (parts.length && LOCALE_RE.test(parts[0]) && parts[0].toLowerCase() !== 'ru') {
    return parts[0].toLowerCase() === 'ku-arab' ? 'ku-arab' : parts[0];
  }
  return 'ru';
}

function patchHtmlFile(absPath, locale) {
  let html = fs.readFileSync(absPath, 'utf8');
  const original = html;
  const suffix = ` (${locale})`;

  const replacements = [
    // <title>...</title>
    {
      re: /<title>([\s\S]*?)<\/title>/i,
      kind: 'title',
    },
    {
      re: /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
      kind: 'attr',
    },
    {
      re: /<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i,
      kind: 'attr',
    },
    {
      re: /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i,
      kind: 'attr',
    },
    {
      re: /<meta\s+property=["']twitter:title["']\s+content=["']([^"']*)["']/i,
      kind: 'attr',
    },
    {
      re: /<meta\s+name=["']twitter:title["']\s+content=["']([^"']*)["']/i,
      kind: 'attr',
    },
    {
      re: /<meta\s+property=["']twitter:description["']\s+content=["']([^"']*)["']/i,
      kind: 'attr',
    },
    {
      re: /<meta\s+name=["']twitter:description["']\s+content=["']([^"']*)["']/i,
      kind: 'attr',
    },
  ];

  // First pass: collect values across sibling locale files is expensive.
  // Instead: for non-en/non-ru pages, if title/desc doesn't already include locale, append.
  // But that would suffix even unique translated titles — bad for well-translated pages.
  //
  // Better HTML strategy: only patch when the current title appears in a "collision set"
  // we build from scanning all similar pages. Done in patchFrontendTree.

  return { html, original, changed: false };
}

/**
 * Scan a set of HTML files that represent the same page across locales,
 * uniquify duplicate title/description values, write back.
 */
function uniquifyHtmlGroup(files) {
  // files: [{abs, locale}]
  const parsed = [];
  for (const f of files) {
    const html = fs.readFileSync(f.abs, 'utf8');
    const titleM = html.match(/<title>([\s\S]*?)<\/title>/i);
    const descM = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    parsed.push({
      ...f,
      html,
      title: titleM ? titleM[1].trim() : null,
      desc: descM ? descM[1].trim() : null,
    });
  }

  // Build collision maps
  const titleGroups = new Map();
  const descGroups = new Map();
  for (const p of parsed) {
    if (p.title) {
      if (!titleGroups.has(p.title)) titleGroups.set(p.title, []);
      titleGroups.get(p.title).push(p);
    }
    if (p.desc) {
      if (!descGroups.has(p.desc)) descGroups.set(p.desc, []);
      descGroups.get(p.desc).push(p);
    }
  }

  const titleKeep = new Map(); // value -> locale to keep
  const descKeep = new Map();
  for (const [val, items] of titleGroups) {
    if (items.length < 2) continue;
    titleKeep.set(val, preferLocale(items.map((i) => i.locale)));
  }
  for (const [val, items] of descGroups) {
    if (items.length < 2) continue;
    descKeep.set(val, preferLocale(items.map((i) => i.locale)));
  }

  let changedFiles = 0;
  for (const p of parsed) {
    let html = p.html;
    let changed = false;

    if (p.title && titleKeep.has(p.title) && titleKeep.get(p.title) !== p.locale) {
      const next = withLocaleSuffix(p.title, p.locale);
      if (next !== p.title) {
        html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${next}</title>`);
        // og/twitter titles that equal old title
        html = html.replace(
          /(<meta\s+(?:property|name)=["'](?:og:title|twitter:title)["']\s+content=["'])([^"']*)(["'])/gi,
          (m, a, val, c) => (val.trim() === p.title ? `${a}${next}${c}` : m)
        );
        changed = true;
      }
    }

    if (p.desc && descKeep.has(p.desc) && descKeep.get(p.desc) !== p.locale) {
      const next = withLocaleSuffix(p.desc, p.locale);
      if (next !== p.desc) {
        html = html.replace(
          /(<meta\s+name=["']description["']\s+content=["'])([^"']*)(["'])/i,
          (m, a, _v, c) => `${a}${next}${c}`
        );
        html = html.replace(
          /(<meta\s+(?:property|name)=["'](?:og:description|twitter:description)["']\s+content=["'])([^"']*)(["'])/gi,
          (m, a, val, c) => (val.trim() === p.desc ? `${a}${next}${c}` : m)
        );
        changed = true;
      }
    }

    if (changed) {
      changedFiles++;
      if (!DRY) fs.writeFileSync(p.abs, html, 'utf8');
    }
  }
  return changedFiles;
}

function walkHtmlTargets() {
  /** @type {Map<string, {abs:string, locale:string}[]>} */
  const groups = new Map();

  function add(groupKey, abs, locale) {
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push({ abs, locale });
  }

  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        // skip news stubs
        if (ent.name === 'news' || ent.name === 'node_modules') continue;
        walk(abs);
        continue;
      }
      if (!ent.name.endsWith('.html')) continue;
      const rel = path.relative(FRONTEND, abs).replace(/\\/g, '/');
      // skip news
      if (rel.includes('/news/') || rel.startsWith('news/')) continue;

      const locale = detectLocaleFromHtmlPath(`frontend/${rel}`);

      // normalize group key: strip locale prefix
      let segs = rel.split('/');
      if (segs.length && LOCALE_RE.test(segs[0]) && segs[0].toLowerCase() !== 'ru') {
        segs = segs.slice(1);
      }
      const key = segs.join('/');

      // High-impact sections from Yandex duplicate title/description report
      if (
        key.startsWith('games/') ||
        key.startsWith('tools/') ||
        key.startsWith('login/') ||
        key.startsWith('auth/') ||
        key.startsWith('register/') ||
        key.startsWith('profile/') ||
        key.startsWith('knowledge-base/')
      ) {
        add(key, abs, locale);
      }
    }
  }

  walk(FRONTEND);
  return groups;
}

console.log(`uniquify-meta-locales ${DRY ? '(dry-run) ' : ''}…`);

let dataChanged = 0;
for (const f of DATA_FILES) {
  const { changed } = uniquifyDataFile(f);
  if (changed) {
    console.log(`  data ${f}: ${changed} fields`);
    dataChanged += changed;
  }
}
console.log(`data fields updated: ${dataChanged}`);

const groups = walkHtmlTargets();
let htmlFiles = 0;
for (const [key, files] of groups) {
  if (files.length < 2) continue;
  const n = uniquifyHtmlGroup(files);
  if (n) {
    console.log(`  html ${key}: ${n} files`);
    htmlFiles += n;
  }
}
console.log(`html files updated: ${htmlFiles}`);
console.log(DRY ? 'dry-run done (no writes)' : 'done');
