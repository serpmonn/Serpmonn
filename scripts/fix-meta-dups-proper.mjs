#!/usr/bin/env node
/**
 * Fix remaining duplicate title/description issues with REAL translations
 * (never locale suffixes like "(fr)").
 *
 * - Updates assembly/site/_data/*.json where applicable
 * - Patches matching frontend HTML meta tags
 * - Uniquifies Redirecting… / Переадресация stubs
 *
 * Usage: node scripts/fix-meta-dups-proper.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'assembly/site/_data');
const FRONTEND = path.join(ROOT, 'frontend');
const DRY = process.argv.includes('--dry-run');
const REMAINING = '/tmp/remaining-dups.json';

const LOCALE_RE =
  /^(ar|az|be|bg|bn|cs|da|de|dv|el|en|es|es-419|fa|fi|fil|fr|he|hi|hu|hy|id|it|ja|ka|kk|ko|ks|ku-arab|ms|nb|nl|pl|ps|pt-br|pt-pt|ro|ru|sd|sr|sv|th|tr|ug|ur|uz|vi|yi|zh-cn)$/i;

const LOCALES = [
  'ru', 'ar', 'az', 'be', 'bg', 'bn', 'cs', 'da', 'de', 'dv', 'el', 'en', 'es', 'es-419',
  'fa', 'fi', 'fil', 'fr', 'he', 'hi', 'hu', 'hy', 'id', 'it', 'ja', 'ka', 'kk', 'ko',
  'ks', 'ku-arab', 'ms', 'nb', 'nl', 'pl', 'ps', 'pt-br', 'pt-pt', 'ro', 'sd', 'sr',
  'sv', 'th', 'tr', 'ug', 'ur', 'uz', 'vi', 'yi', 'zh-cn',
];

const stats = {
  jsonFiles: 0,
  jsonFields: 0,
  htmlFiles: 0,
  redirects: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function brand(loc) {
  return loc === 'ru' ? 'Серпмонн' : 'Serpmonn';
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function detectLocaleFromPath(relOrAbs) {
  const rel = relOrAbs.replace(/\\/g, '/');
  const parts = rel.split('/').filter(Boolean);
  const idx = parts.indexOf('frontend');
  const segs = idx >= 0 ? parts.slice(idx + 1) : parts;
  if (segs[0] && LOCALE_RE.test(segs[0]) && segs[0].toLowerCase() !== 'ru') {
    return segs[0] === 'ku-arab' || segs[0] === 'Ku-arab' ? 'ku-arab' : segs[0];
  }
  return 'ru';
}

function frontendHtml(locale, ...parts) {
  if (locale === 'ru') return path.join(FRONTEND, ...parts);
  return path.join(FRONTEND, locale, ...parts);
}

function readJson(fileName) {
  const p = path.join(DATA, fileName);
  if (!fs.existsSync(p)) return null;
  return { path: p, json: JSON.parse(fs.readFileSync(p, 'utf8')) };
}

function writeJson(filePath, json) {
  stats.jsonFiles++;
  if (!DRY) fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
}

function setIf(obj, key, value) {
  if (!obj || value == null) return false;
  if (!(key in obj) && obj[key] === undefined) {
    // allow setting known meta keys even if missing
  }
  if (obj[key] === value) return false;
  obj[key] = value;
  stats.jsonFields++;
  return true;
}

/** Update title + description (+ og/twitter variants) in an HTML document. */
function setTitleDesc(html, { title, description, robots } = {}) {
  let out = html;

  if (title) {
    if (/<title>[\s\S]*?<\/title>/i.test(out)) {
      out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
    } else if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `  <title>${escapeHtml(title)}</title>\n</head>`);
    } else {
      out = `<title>${escapeHtml(title)}</title>\n` + out;
    }
  }

  const setAttr = (attrName, attrKind, value) => {
    if (!value) return;
    const re = new RegExp(
      `(<meta\\s+${attrKind}=["']${attrName}["']\\s+content=["'])([^"']*)(["'])`,
      'i'
    );
    const re2 = new RegExp(
      `(<meta\\s+content=["'])([^"']*)(["']\\s+${attrKind}=["']${attrName}["'])`,
      'i'
    );
    if (re.test(out)) {
      out = out.replace(re, `$1${escapeAttr(value)}$3`);
    } else if (re2.test(out)) {
      out = out.replace(re2, `$1${escapeAttr(value)}$3`);
    } else if (/<\/head>/i.test(out)) {
      const tag =
        attrKind === 'name'
          ? `  <meta name="${attrName}" content="${escapeAttr(value)}">\n`
          : `  <meta property="${attrName}" content="${escapeAttr(value)}">\n`;
      out = out.replace(/<\/head>/i, `${tag}</head>`);
    }
  };

  setAttr('description', 'name', description);
  setAttr('og:title', 'property', title);
  setAttr('og:description', 'property', description);
  setAttr('twitter:title', 'name', title);
  setAttr('twitter:title', 'property', title);
  setAttr('twitter:description', 'name', description);
  setAttr('twitter:description', 'property', description);

  if (robots) {
    const robotsRe =
      /(<meta\s+name=["']robots["']\s+content=["'])([^"']*)(["'])/i;
    if (robotsRe.test(out)) {
      out = out.replace(robotsRe, `$1${escapeAttr(robots)}$3`);
    } else if (/<\/head>/i.test(out)) {
      out = out.replace(
        /<\/head>/i,
        `  <meta name="robots" content="${escapeAttr(robots)}">\n</head>`
      );
    } else if (/<head[^>]*>/i.test(out)) {
      out = out.replace(
        /<head([^>]*)>/i,
        `<head$1>\n  <meta name="robots" content="${escapeAttr(robots)}">`
      );
    }
  }

  return out;
}

function patchHtmlFile(absPath, fields) {
  if (!fs.existsSync(absPath)) return false;
  const before = fs.readFileSync(absPath, 'utf8');
  const after = setTitleDesc(before, fields);
  if (after === before) return false;
  stats.htmlFiles++;
  if (!DRY) fs.writeFileSync(absPath, after, 'utf8');
  return true;
}

function patchHtmlTree(locale, relParts, fields) {
  return patchHtmlFile(frontendHtml(locale, ...relParts), fields);
}

// ---------------------------------------------------------------------------
// 1) Profile
// ---------------------------------------------------------------------------

const PROFILE_TITLE = {
  en: 'My profile — Serpmonn',
  fil: 'Aking profile — Serpmonn',
  fr: 'Mon profil — Serpmonn',
  sv: 'Mitt konto — Serpmonn',
  de: 'Mein Profil — Serpmonn',
  tr: 'Hesabım — Serpmonn',
  id: 'Profil saya — Serpmonn',
  hu: 'Saját profil — Serpmonn',
  ms: 'Profil akaun — Serpmonn',
  nb: 'Min profil — Serpmonn',
  pl: 'Mój profil — Serpmonn',
  ro: 'Profilul meu — Serpmonn',
  cs: 'Můj profil — Serpmonn',
  az: 'Mənim profilim — Serpmonn',
  da: 'Min brugerprofil — Serpmonn',
  uz: 'Mening profilim — Serpmonn',
  'pt-br': 'Perfil da conta — Serpmonn',
  'pt-pt': 'Área de perfil — Serpmonn',
  es: 'Mi perfil — Serpmonn',
  'es-419': 'Perfil de usuario — Serpmonn',
  fa: 'پروفایل من — Serpmonn',
  ps: 'زما پروفایل — Serpmonn',
  ks: 'میون پروفایل — Serpmonn',
  sr: 'Профил на акаунта — Serpmonn',
  bg: 'Моят профил — Serpmonn',
  ur: 'میرا پروفائل — Serpmonn',
  sd: 'منهنجو پروفائل — Serpmonn',
};

const PROFILE_DESC = {
  en: 'Manage your Serpmonn account, subscription, and personal tools.',
  fil: 'Pamahalaan ang iyong Serpmonn account, subscription, at mga personal na tool.',
  fr: 'Gérez votre compte Serpmonn, votre abonnement et vos outils personnels.',
  sv: 'Hantera ditt Serpmonn-konto, prenumeration och personliga verktyg.',
  de: 'Verwalten Sie Ihr Serpmonn-Konto, Abonnement und persönliche Tools.',
  tr: 'Serpmonn hesabınızı, aboneliğinizi ve kişisel araçlarınızı yönetin.',
  id: 'Kelola akun Serpmonn, langganan, dan alat pribadi Anda.',
  hu: 'Kezelje Serpmonn-fiókját, előfizetését és személyes eszközeit.',
  ms: 'Urus profil akaun Serpmonn, langganan dan alatan peribadi anda.',
  nb: 'Administrer Serpmonn-kontoen, abonnementet og dine personlige verktøy.',
  pl: 'Zarządzaj kontem Serpmonn, subskrypcją i osobistymi narzędziami.',
  ro: 'Gestionează-ți contul Serpmonn, abonamentul și uneltele personale.',
  cs: 'Spravujte svůj účet Serpmonn, předplatné a osobní nástroje.',
  az: 'Serpmonn hesabınızı, abunəliyinizi və şəxsi alətlərinizi idarə edin.',
  da: 'Administrer din Serpmonn-brugerprofil, abonnement og personlige værktøjer.',
  uz: 'Serpmonn hisobingiz, obuna va shaxsiy asboblaringizni boshqaring.',
  'pt-br': 'Gerencie sua conta Serpmonn, assinatura e ferramentas pessoais no Brasil.',
  'pt-pt': 'Faça a gestão da sua conta Serpmonn, subscrição e ferramentas pessoais em Portugal.',
  es: 'Gestiona tu perfil de Serpmonn, la suscripción y tus herramientas en España.',
  'es-419': 'Administra tu perfil de usuario Serpmonn, la suscripción y tus herramientas en Latinoamérica.',
  fa: 'حساب، اشتراک و ابزارهای شخصی خود را در Serpmonn مدیریت کنید.',
  ps: 'په Serpmonn کې خپل حساب، ګډون او شخصي وسایل سمبال کړئ.',
  ks: 'Serpmonn پٮ۪ٹھ پنُن اکاؤنٹ، سبسکرپشن تہ اوزار سنبھالیو۔',
  sr: 'Управљајте налогом, претплатом и личним алатима на Serpmonn‑у.',
  bg: 'Управлявайте своя акаунт, абонамент и лични инструменти в Serpmonn.',
  ur: 'Serpmonn پر اپنا اکاؤنٹ، سبسکرپشن اور ذاتی ٹولز منظم کریں۔',
  sd: 'Serpmonn تي پنهنجو اڪائونٽ، سبسڪرپشن ۽ ذاتي اوزار سنڀاليو.',
};

function fixProfile() {
  const pack = readJson('profile.json');
  if (!pack) return;
  let touched = false;
  for (const loc of Object.keys(PROFILE_TITLE)) {
    const block = pack.json[loc]?.profile;
    if (!block) continue;
    const title = PROFILE_TITLE[loc];
    const desc = PROFILE_DESC[loc] || block.metaDescription;
    touched |= setIf(block, 'pageTitle', title);
    touched |= setIf(block, 'ogTitle', title);
    if ('twitterTitle' in block) touched |= setIf(block, 'twitterTitle', title);
    if (desc) {
      touched |= setIf(block, 'metaDescription', desc);
      if ('ogDescription' in block) touched |= setIf(block, 'ogDescription', desc);
      if ('twitterDescription' in block) {
        touched |= setIf(block, 'twitterDescription', desc.replace(/\.$/, ''));
      }
    }
    patchHtmlTree(loc, ['profile', 'profile.html'], { title, description: desc });
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  profile: titles/descs updated');
}

// ---------------------------------------------------------------------------
// 2) Auth
// ---------------------------------------------------------------------------

const AUTH_TITLE = {
  en: 'Sign in — Serpmonn',
  id: 'Masuk akun — Serpmonn',
  fil: 'Mag-sign in — Serpmonn',
  'pt-br': 'Entrar na conta — Serpmonn',
  'pt-pt': 'Iniciar sessão — Serpmonn',
  da: 'Log ind — Serpmonn',
  es: 'Iniciar sesión — Serpmonn',
  'es-419': 'Acceder a la cuenta — Serpmonn',
  sd: 'سائن ان — Serpmonn',
  ks: 'لاگ اِن کْریو — Serpmonn',
  ur: 'اکاؤنٹ میں داخل ہوں — Serpmonn',
  az: 'Hesaba giriş — Serpmonn',
  tr: 'Oturum aç — Serpmonn',
};

const AUTH_DESC = {
  en: 'Sign in or create a Serpmonn account to use AI search, tools, and games.',
  id: 'Masuk atau buat akun Serpmonn untuk memakai pencarian AI, alat, dan game.',
  fil: 'Mag-sign in o gumawa ng Serpmonn account para sa AI search, tools, at games.',
  'pt-br': 'Entre ou crie sua conta Serpmonn no Brasil para usar busca de IA, ferramentas e jogos.',
  'pt-pt': 'Inicie sessão ou crie uma conta Serpmonn em Portugal para usar pesquisa de IA, ferramentas e jogos.',
  da: 'Log ind eller opret en Serpmonn-konto for at bruge AI-søgning, værktøjer og spil.',
  es: 'Inicia sesión o crea una cuenta Serpmonn en España para usar búsqueda IA, herramientas y juegos.',
  'es-419': 'Accede o crea tu cuenta Serpmonn en Latinoamérica para usar búsqueda con IA, herramientas y juegos.',
  sd: 'Serpmonn اڪائونٽ ۾ سائن ان ڪريو يا نئون اڪائونٽ ٺاهيو.',
  ks: 'Serpmonn اکاؤنٹ منز لاگ اِن کْریو یا نْو اکاؤنٹ بنٲیو۔',
  ur: 'Serpmonn اکاؤنٹ میں داخل ہوں یا نیا اکاؤنٹ بنائیں۔',
  az: 'AI axtarış, alətlər və oyunlar üçün Serpmonn hesabına daxil olun.',
  tr: 'AI arama, araçlar ve oyunlar için Serpmonn oturumu açın veya hesap oluşturun.',
};

function fixAuth() {
  const pack = readJson('authTranslations.json');
  if (!pack) return;
  let touched = false;
  for (const loc of Object.keys(AUTH_TITLE)) {
    const block = pack.json[loc];
    if (!block) continue;
    const title = AUTH_TITLE[loc];
    const desc = AUTH_DESC[loc] || block.ogDescription;
    touched |= setIf(block, 'pageTitle', title);
    touched |= setIf(block, 'ogTitle', title);
    if (desc) {
      if ('ogDescription' in block) touched |= setIf(block, 'ogDescription', desc);
      if ('twitterDescription' in block) touched |= setIf(block, 'twitterDescription', desc);
    }
    patchHtmlTree(loc, ['auth', 'auth.html'], { title, description: desc });
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  auth: titles updated');
}

// ---------------------------------------------------------------------------
// 3) Tools JSON + HTML
// ---------------------------------------------------------------------------

function setToolMeta(meta, title, description) {
  if (!meta) return false;
  let t = false;
  t |= setIf(meta, 'title', title);
  t |= setIf(meta, 'description', description);
  if ('ogTitle' in meta) t |= setIf(meta, 'ogTitle', title);
  if ('ogDescription' in meta) t |= setIf(meta, 'ogDescription', description);
  if ('twitterTitle' in meta) t |= setIf(meta, 'twitterTitle', title);
  if ('twitterDescription' in meta) t |= setIf(meta, 'twitterDescription', description);
  return t;
}

function fixUtmBuilder() {
  const pack = readJson('utmBuilder.json');
  if (!pack) return;
  const map = {
    fil: {
      title: 'Tagabuo ng UTM — Serpmonn',
      description: 'Gumawa ng UTM link para sa iyong mga kampanya sa loob ng ilang segundo.',
    },
    da: {
      title: 'UTM-generator — Serpmonn',
      description: 'Byg UTM-links til dine kampagner på få sekunder.',
    },
    'pt-br': {
      title: 'Construtor UTM no Brasil — Serpmonn',
      description: 'Monte links UTM para campanhas no Brasil em poucos segundos.',
    },
    'pt-pt': {
      title: 'Construtor UTM em Portugal — Serpmonn',
      description: 'Crie links UTM para campanhas em Portugal em poucos segundos.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    if (!pack.json[loc]?.meta) continue;
    touched |= setToolMeta(pack.json[loc].meta, tr.title, tr.description);
    patchHtmlTree(loc, ['tools', 'marketing', 'utm-builder.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  utmBuilder: updated');
}

function fixPasswordGenerator() {
  const pack = readJson('passwordGenerator.json');
  if (!pack) return;
  const title = 'Tagagawa ng Password — Serpmonn';
  const description =
    'Lumikha ng malalakas na password na may pasadyang mga parameter sa Serpmonn.';
  let touched = false;
  if (pack.json.fil?.meta) {
    touched |= setToolMeta(pack.json.fil.meta, title, description);
    patchHtmlTree('fil', ['tools', 'security', 'password-generator.html'], {
      title,
      description,
    });
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  passwordGenerator: fil updated');
}

function fixFuelCalculator() {
  const pack = readJson('fuelCalculator.json');
  if (!pack) return;
  const map = {
    'pt-br': {
      title: 'Calculadora de Combustível no Brasil — Serpmonn Logística',
      description:
        'Calcule consumo de combustível, custo da viagem e economias para rotas no Brasil.',
    },
    'pt-pt': {
      title: 'Calculadora de Combustível em Portugal — Serpmonn Logística',
      description:
        'Calcule o consumo de combustível, o custo da viagem e as poupanças para rotas em Portugal.',
    },
    de: {
      title: 'Kraftstoffrechner — Serpmonn Logistik',
      description:
        'Berechnung des Kraftstoffverbrauchs, der Reisekosten und der Einsparungen für Fahrer.',
    },
    yi: {
      title: 'ברענשטאָף־רעכענער — Serpmonn לאָגיסטיק',
      description: 'רעכנט אויס ברענשטאָף־פֿאַרברויך, רייזע־קאָסטן און שפּאָרונגען.',
    },
    id: {
      title: 'Kalkulator Bahan Bakar Indonesia — Serpmonn Logistik',
      description:
        'Hitung konsumsi bahan bakar, biaya perjalanan, dan penghematan untuk rute di Indonesia.',
    },
    ms: {
      title: 'Kalkulator Bahan Api Malaysia — Serpmonn Logistik',
      description:
        'Kira penggunaan bahan api, kos perjalanan dan penjimatan untuk laluan di Malaysia.',
    },
    ur: {
      title: 'ایندھن کیلکولیٹر — Serpmonn لاجسٹکس',
      description: 'ایندھن کے استعمال، سفر کی لاگت اور بچت کا حساب اردو میں۔',
    },
    ks: {
      title: 'ایندھن حساب کتاب — Serpmonn لاجسٹکس',
      description: 'ایندھن خرچ، سفر خرچ تہ بچت ہُند حساب کٲشُر زبانہِ منز۔',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    if (!pack.json[loc]?.meta) continue;
    touched |= setToolMeta(pack.json[loc].meta, tr.title, tr.description);
    patchHtmlTree(loc, ['tools', 'logistics', 'fuel-calculator.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  fuelCalculator: updated');
}

function fixUnitConverter() {
  const pack = readJson('unitConverter.json');
  if (!pack) return;
  const map = {
    'pt-br': {
      title: 'Conversor de Unidades no Brasil — Serpmonn Engenharia',
      description:
        'Conversão rápida entre unidades de medida para engenharia e projetos no Brasil.',
    },
    'pt-pt': {
      title: 'Conversor de Unidades em Portugal — Serpmonn Engenharia',
      description:
        'Conversão rápida entre unidades de medida para engenharia e projetos em Portugal.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    if (!pack.json[loc]?.meta) continue;
    touched |= setToolMeta(pack.json[loc].meta, tr.title, tr.description);
    patchHtmlTree(loc, ['tools', 'engineering', 'unit-converter.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  unitConverter: updated');
}

function fixToolsIndex() {
  const pack = readJson('tools.json');
  if (!pack) return;
  const map = {
    'pt-br': {
      title: 'Serpmonn — Busca inteligente, notícias e minijogos no Brasil',
      description:
        'Ferramentas Serpmonn para marketing, segurança e produtividade, com foco no público brasileiro.',
    },
    'pt-pt': {
      title: 'Serpmonn — Motor de busca inteligente, notícias e minijogos em Portugal',
      description:
        'Ferramentas Serpmonn para marketing, segurança e produtividade, com foco no público português.',
    },
    es: {
      title: 'Serpmonn — Buscador inteligente, noticias y minijuegos en España',
      description:
        'Herramientas Serpmonn para marketing, seguridad y productividad orientadas a España.',
    },
    'es-419': {
      title: 'Serpmonn — Buscador inteligente, noticias y minijuegos en Latinoamérica',
      description:
        'Herramientas Serpmonn para marketing, seguridad y productividad orientadas a Latinoamérica.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    const meta = pack.json[loc]?.meta;
    if (!meta) continue;
    touched |= setIf(meta, 'title', tr.title);
    touched |= setIf(meta, 'description', tr.description);
    if ('ogTitle' in meta) {
      const ogMap = {
        'pt-br': 'Ferramentas no Brasil — Serpmonn',
        'pt-pt': 'Ferramentas em Portugal — Serpmonn',
        es: 'Herramientas en España — Serpmonn',
        'es-419': 'Herramientas en Latinoamérica — Serpmonn',
      };
      touched |= setIf(meta, 'ogTitle', ogMap[loc] || meta.ogTitle);
    }
    if ('twitterTitle' in meta) {
      const twMap = {
        'pt-br': 'Ferramentas no Brasil — Serpmonn',
        'pt-pt': 'Ferramentas em Portugal — Serpmonn',
        es: 'Herramientas en España — Serpmonn',
        'es-419': 'Herramientas en Latinoamérica — Serpmonn',
      };
      touched |= setIf(meta, 'twitterTitle', twMap[loc] || meta.twitterTitle);
    }
    patchHtmlTree(loc, ['tools', 'tools.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  tools.json: updated');
}

function fixEcoFootprintCalculator() {
  const pack = readJson('productFootprintCalculator.json');
  if (!pack) return;
  const map = {
    'pt-br': {
      title: 'Calculadora de Pegada Ecológica no Brasil — SerpMonn',
      description:
        'Calcule a pegada ecológica da sua cesta de compras no Brasil: carbono, água e impacto ambiental.',
    },
    'pt-pt': {
      title: 'Calculadora de Pegada Ecológica em Portugal — SerpMonn',
      description:
        'Calcule a pegada ecológica do seu cabaz de compras em Portugal: carbono, água e impacto ambiental.',
    },
    es: {
      title: 'Calculadora de Huella Ecológica en España — SerpMonn',
      description:
        'Calcula la huella ecológica de tu cesta de la compra en España: carbono, agua e impacto ambiental.',
    },
    'es-419': {
      title: 'Calculadora de Huella Ecológica en Latinoamérica — SerpMonn',
      description:
        'Calcula la huella ecológica de tu canasta de compras en Latinoamérica: carbono, agua e impacto ambiental.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    const block = pack.json[loc];
    if (!block) continue;
    touched |= setIf(block, 'title', tr.title);
    touched |= setIf(block, 'meta_description', tr.description);
    if ('og_title' in block) touched |= setIf(block, 'og_title', tr.title);
    if ('og_description' in block) touched |= setIf(block, 'og_description', tr.description);
    patchHtmlTree(loc, ['tools', 'ecology', 'product-footprint-calculator.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  productFootprintCalculator: updated');
}

// ---------------------------------------------------------------------------
// 4) serpmonnInstallGuide — translate English copies
// ---------------------------------------------------------------------------

/** Each locale: { title, description, ogTitle, ogDescription, articleTitle } */
const INSTALL_GUIDE = {
  ar: {
    title: 'كيفية تثبيت Serpmonn: الشاشة الرئيسية وAndroid',
    description:
      'أضف Serpmonn إلى الشاشة الرئيسية لهاتفك أو نزّل ملف APK لأندرويد. ما الفرق ومتى تختار كل خيار.',
    ogTitle: 'كيفية تثبيت Serpmonn',
    ogDescription: 'الشاشة الرئيسية أو APK لأندرويد — دليل مختصر.',
    articleTitle: 'كيفية تثبيت Serpmonn: على شاشة الهاتف وAPK لأندرويد',
  },
  az: {
    title: 'Serpmonn-u necə quraşdırmalı: Ana ekran və Android',
    description:
      'Serpmonn-u telefonun ana ekranına əlavə edin və ya Android APK yükləyin. Fərq nədir və nə vaxt hansını seçməli.',
    ogTitle: 'Serpmonn-u necə quraşdırmalı',
    ogDescription: 'Ana ekran və ya Android APK — qısa bələdçi.',
    articleTitle: 'Serpmonn-u necə quraşdırmalı: telefon ekranı və Android APK',
  },
  be: {
    title: 'Як усталяваць Serpmonn: галоўны экран і Android',
    description:
      'Дадайце Serpmonn на галоўны экран тэлефона або спампуйце APK для Android. Чым варыянты адрозніваюцца і калі што абраць.',
    ogTitle: 'Як усталяваць Serpmonn',
    ogDescription: 'Галоўны экран або APK для Android — кароткая інструкцыя.',
    articleTitle: 'Як усталяваць Serpmonn: на экран тэлефона і APK для Android',
  },
  bg: {
    title: 'Как да инсталирате Serpmonn: начален екран и Android',
    description:
      'Добавете Serpmonn към началния екран на телефона или изтеглете Android APK. Каква е разликата и кога какво да изберете.',
    ogTitle: 'Как да инсталирате Serpmonn',
    ogDescription: 'Начален екран или Android APK — кратко ръководство.',
    articleTitle: 'Как да инсталирате Serpmonn: на екрана на телефона и Android APK',
  },
  bn: {
    title: 'Serpmonn কীভাবে ইনস্টল করবেন: হোম স্ক্রিন ও Android',
    description:
      'ফোনের হোম স্ক্রিনে Serpmonn যোগ করুন বা Android APK ডাউনলোড করুন। পার্থক্য কী এবং কখন কোনটি বেছে নেবেন।',
    ogTitle: 'Serpmonn কীভাবে ইনস্টল করবেন',
    ogDescription: 'হোম স্ক্রিন বা Android APK — সংক্ষিপ্ত নির্দেশিকা।',
    articleTitle: 'Serpmonn কীভাবে ইনস্টল করবেন: ফোন স্ক্রিন ও Android APK',
  },
  cs: {
    title: 'Jak nainstalovat Serpmonn: Domovská obrazovka a Android',
    description:
      'Přidejte Serpmonn na domovskou obrazovku telefonu nebo stáhněte Android APK. Jaký je rozdíl a kdy co zvolit.',
    ogTitle: 'Jak nainstalovat Serpmonn',
    ogDescription: 'Domovská obrazovka nebo Android APK — krátký návod.',
    articleTitle: 'Jak nainstalovat Serpmonn: na obrazovku telefonu a Android APK',
  },
  da: {
    title: 'Sådan installerer du Serpmonn: startskærm og Android',
    description:
      'Tilføj Serpmonn til telefonens startskærm, eller download Android-APK. Hvad er forskellen, og hvornår vælger du hvad.',
    ogTitle: 'Sådan installerer du Serpmonn',
    ogDescription: 'Startskærm eller Android-APK — en kort guide.',
    articleTitle: 'Sådan installerer du Serpmonn: på telefonens skærm og Android-APK',
  },
  de: {
    title: 'Serpmonn installieren: Startbildschirm und Android',
    description:
      'Fügen Sie Serpmonn dem Startbildschirm hinzu oder laden Sie die Android-APK herunter. Unterschiede und Wann Sie welche Option wählen.',
    ogTitle: 'Serpmonn installieren',
    ogDescription: 'Startbildschirm oder Android-APK — kurze Anleitung.',
    articleTitle: 'Serpmonn installieren: auf dem Telefonbildschirm und als Android-APK',
  },
  el: {
    title: 'Πώς να εγκαταστήσετε το Serpmonn: Αρχική οθόνη και Android',
    description:
      'Προσθέστε το Serpmonn στην αρχική οθόνη ή κατεβάστε το APK για Android. Ποια είναι η διαφορά και πότε να επιλέξετε τι.',
    ogTitle: 'Πώς να εγκαταστήσετε το Serpmonn',
    ogDescription: 'Αρχική οθόνη ή Android APK — σύντομος οδηγός.',
    articleTitle: 'Πώς να εγκαταστήσετε το Serpmonn: στην οθόνη και ως Android APK',
  },
  es: {
    title: 'Cómo instalar Serpmonn: pantalla de inicio y Android',
    description:
      'Añade Serpmonn a la pantalla de inicio del teléfono o descarga el APK de Android. Qué diferencia hay y cuándo elegir cada opción.',
    ogTitle: 'Cómo instalar Serpmonn',
    ogDescription: 'Pantalla de inicio o APK de Android — guía breve.',
    articleTitle: 'Cómo instalar Serpmonn: en la pantalla del móvil y APK de Android',
  },
  'es-419': {
    title: 'Cómo instalar Serpmonn: pantalla de inicio y Android (LATAM)',
    description:
      'Agrega Serpmonn a la pantalla de inicio de tu celular o descarga el APK de Android. Diferencias y cuándo conviene cada opción en Latinoamérica.',
    ogTitle: 'Cómo instalar Serpmonn en Latinoamérica',
    ogDescription: 'Pantalla de inicio o APK de Android — guía corta para LATAM.',
    articleTitle: 'Cómo instalar Serpmonn: en el celular y con APK de Android',
  },
  fa: {
    title: 'نحوه نصب Serpmonn: صفحه اصلی و اندروید',
    description:
      'Serpmonn را به صفحه اصلی گوشی اضافه کنید یا APK اندروید را دانلود کنید. تفاوت چیست و کی کدام را انتخاب کنید.',
    ogTitle: 'نحوه نصب Serpmonn',
    ogDescription: 'صفحه اصلی یا APK اندروید — راهنمای کوتاه.',
    articleTitle: 'نحوه نصب Serpmonn: روی صفحه گوشی و APK اندروید',
  },
  fi: {
    title: 'Serpmonnin asentaminen: kotinäyttö ja Android',
    description:
      'Lisää Serpmonn puhelimen kotinäyttöön tai lataa Android-APK. Mitä eroa on ja milloin valita kumpi.',
    ogTitle: 'Serpmonnin asentaminen',
    ogDescription: 'Kotinäyttö tai Android-APK — lyhyt opas.',
    articleTitle: 'Serpmonnin asentaminen: puhelimen näytölle ja Android-APK',
  },
  fil: {
    title: 'Paano i-install ang Serpmonn: Home Screen at Android',
    description:
      'Idagdag ang Serpmonn sa Home Screen ng telepono o i-download ang Android APK. Ano ang pagkakaiba at kailan pipiliin ang bawat isa.',
    ogTitle: 'Paano i-install ang Serpmonn',
    ogDescription: 'Home Screen o Android APK — maikling gabay.',
    articleTitle: 'Paano i-install ang Serpmonn: sa screen ng telepono at Android APK',
  },
  fr: {
    title: 'Comment installer Serpmonn : écran d’accueil et Android',
    description:
      'Ajoutez Serpmonn à l’écran d’accueil du téléphone ou téléchargez l’APK Android. Quelle différence et quand choisir quoi.',
    ogTitle: 'Comment installer Serpmonn',
    ogDescription: 'Écran d’accueil ou APK Android — guide court.',
    articleTitle: 'Comment installer Serpmonn : sur l’écran du téléphone et APK Android',
  },
  he: {
    title: 'איך להתקין את Serpmonn: מסך הבית ו-Android',
    description:
      'הוסיפו את Serpmonn למסך הבית של הטלפון או הורידו APK ל-Android. מה ההבדל ומתי לבחור בכל אפשרות.',
    ogTitle: 'איך להתקין את Serpmonn',
    ogDescription: 'מסך הבית או APK ל-Android — מדריך קצר.',
    articleTitle: 'איך להתקין את Serpmonn: על מסך הטלפון ו-APK ל-Android',
  },
  hi: {
    title: 'Serpmonn कैसे इंस्टॉल करें: होम स्क्रीन और Android',
    description:
      'Serpmonn को फ़ोन की होम स्क्रीन पर जोड़ें या Android APK डाउनलोड करें। अंतर क्या है और कब किसे चुनें।',
    ogTitle: 'Serpmonn कैसे इंस्टॉल करें',
    ogDescription: 'होम स्क्रीन या Android APK — संक्षिप्त गाइड।',
    articleTitle: 'Serpmonn कैसे इंस्टॉल करें: फ़ोन स्क्रीन और Android APK',
  },
  hu: {
    title: 'Serpmonn telepítése: kezdőképernyő és Android',
    description:
      'Adja hozzá a Serpmonnt a telefon kezdőképernyőjéhez, vagy töltse le az Android APK-t. Mi a különbség, és mikor melyiket válassza.',
    ogTitle: 'Serpmonn telepítése',
    ogDescription: 'Kezdőképernyő vagy Android APK — rövid útmutató.',
    articleTitle: 'Serpmonn telepítése: a telefon képernyőjére és Android APK-ként',
  },
  hy: {
    title: 'Ինչպես տեղադրել Serpmonn․ գլխավոր էկրան և Android',
    description:
      'Ավելացրեք Serpmonn-ը հեռախոսի գլխավոր էկրանին կամ ներբեռնեք Android APK։ Որն է տարբերությունը և երբ ինչ ընտրել։',
    ogTitle: 'Ինչպես տեղադրել Serpmonn',
    ogDescription: 'Գլխավոր էկրան կամ Android APK — կարճ ուղեցույց։',
    articleTitle: 'Ինչպես տեղադրել Serpmonn․ հեռախոսի էկրան և Android APK',
  },
  id: {
    title: 'Cara memasang Serpmonn: Layar Utama dan Android',
    description:
      'Tambahkan Serpmonn ke Layar Utama ponsel atau unduh APK Android. Apa bedanya dan kapan memilih yang mana.',
    ogTitle: 'Cara memasang Serpmonn',
    ogDescription: 'Layar Utama atau APK Android — panduan singkat.',
    articleTitle: 'Cara memasang Serpmonn: di layar ponsel dan APK Android',
  },
  it: {
    title: 'Come installare Serpmonn: schermata Home e Android',
    description:
      'Aggiungi Serpmonn alla schermata Home del telefono o scarica l’APK Android. Qual è la differenza e quando scegliere cosa.',
    ogTitle: 'Come installare Serpmonn',
    ogDescription: 'Schermata Home o APK Android — guida breve.',
    articleTitle: 'Come installare Serpmonn: sulla schermata del telefono e APK Android',
  },
  ja: {
    title: 'Serpmonnのインストール方法：ホーム画面とAndroid',
    description:
      'Serpmonnをスマホのホーム画面に追加するか、Android APKをダウンロード。違いと選び方を解説します。',
    ogTitle: 'Serpmonnのインストール方法',
    ogDescription: 'ホーム画面またはAndroid APK — 短いガイド。',
    articleTitle: 'Serpmonnのインストール：ホーム画面とAndroid APK',
  },
  ka: {
    title: 'როგორ დააინსტალიროთ Serpmonn: მთავარი ეკრანი და Android',
    description:
      'დაამატეთ Serpmonn ტელეფონის მთავარ ეკრანზე ან ჩამოტვირთეთ Android APK. რა განსხვავებაა და როდის რა აირჩიოთ.',
    ogTitle: 'როგორ დააინსტალიროთ Serpmonn',
    ogDescription: 'მთავარი ეკრანი ან Android APK — მოკლე გზამკვლევი.',
    articleTitle: 'როგორ დააინსტალიროთ Serpmonn: ტელეფონის ეკრანზე და Android APK',
  },
  kk: {
    title: 'Serpmonn қалай орнатылады: негізгі экран және Android',
    description:
      'Serpmonn-ды телефонның негізгі экранына қосыңыз немесе Android APK жүктеп алыңыз. Айырмашылығы не және қашан қайсысын таңдау керек.',
    ogTitle: 'Serpmonn қалай орнатылады',
    ogDescription: 'Негізгі экран немесе Android APK — қысқа нұсқаулық.',
    articleTitle: 'Serpmonn қалай орнатылады: телефон экранына және Android APK',
  },
  ko: {
    title: 'Serpmonn 설치 방법: 홈 화면과 Android',
    description:
      'Serpmonn을 휴대폰 홈 화면에 추가하거나 Android APK를 다운로드하세요. 차이점과 선택 시점을 안내합니다.',
    ogTitle: 'Serpmonn 설치 방법',
    ogDescription: '홈 화면 또는 Android APK — 짧은 가이드.',
    articleTitle: 'Serpmonn 설치: 홈 화면과 Android APK',
  },
  ms: {
    title: 'Cara memasang Serpmonn: Skrin Utama dan Android',
    description:
      'Tambah Serpmonn ke Skrin Utama telefon atau muat turun APK Android. Apa bezanya dan bila pilih yang mana.',
    ogTitle: 'Cara memasang Serpmonn',
    ogDescription: 'Skrin Utama atau APK Android — panduan ringkas.',
    articleTitle: 'Cara memasang Serpmonn: pada skrin telefon dan APK Android',
  },
  nb: {
    title: 'Slik installerer du Serpmonn: startskjerm og Android',
    description:
      'Legg Serpmonn til telefonens startskjerm, eller last ned Android-APK. Hva er forskjellen, og når velger du hva.',
    ogTitle: 'Slik installerer du Serpmonn',
    ogDescription: 'Startskjerm eller Android-APK — kort guide.',
    articleTitle: 'Slik installerer du Serpmonn: på telefonens skjerm og Android-APK',
  },
  nl: {
    title: 'Serpmonn installeren: startscherm en Android',
    description:
      'Voeg Serpmonn toe aan het startscherm van je telefoon of download de Android-APK. Wat is het verschil en wanneer kies je wat.',
    ogTitle: 'Serpmonn installeren',
    ogDescription: 'Startscherm of Android-APK — korte gids.',
    articleTitle: 'Serpmonn installeren: op het telefoonscherm en als Android-APK',
  },
  pl: {
    title: 'Jak zainstalować Serpmonn: ekran główny i Android',
    description:
      'Dodaj Serpmonn do ekranu głównego telefonu lub pobierz APK Androida. Jaka jest różnica i kiedy wybrać którą opcję.',
    ogTitle: 'Jak zainstalować Serpmonn',
    ogDescription: 'Ekran główny lub APK Androida — krótki poradnik.',
    articleTitle: 'Jak zainstalować Serpmonn: na ekranie telefonu i jako APK Androida',
  },
  'pt-br': {
    title: 'Como instalar o Serpmonn: tela inicial e Android',
    description:
      'Adicione o Serpmonn à tela inicial do celular ou baixe o APK para Android. Qual a diferença e quando escolher cada opção.',
    ogTitle: 'Como instalar o Serpmonn',
    ogDescription: 'Tela inicial ou APK Android — guia rápido.',
    articleTitle: 'Como instalar o Serpmonn: na tela do celular e APK Android',
  },
  'pt-pt': {
    title: 'Como instalar o Serpmonn: ecrã inicial e Android',
    description:
      'Adicione o Serpmonn ao ecrã inicial do telemóvel ou descarregue o APK para Android. Qual a diferença e quando escolher cada opção.',
    ogTitle: 'Como instalar o Serpmonn',
    ogDescription: 'Ecrã inicial ou APK Android — guia breve.',
    articleTitle: 'Como instalar o Serpmonn: no ecrã do telemóvel e APK Android',
  },
  ro: {
    title: 'Cum să instalați Serpmonn: ecranul principal și Android',
    description:
      'Adăugați Serpmonn pe ecranul principal al telefonului sau descărcați APK-ul Android. Care e diferența și când alegeți ce.',
    ogTitle: 'Cum să instalați Serpmonn',
    ogDescription: 'Ecran principal sau APK Android — ghid scurt.',
    articleTitle: 'Cum să instalați Serpmonn: pe ecranul telefonului și APK Android',
  },
  sr: {
    title: 'Како инсталирати Serpmonn: почетни екран и Android',
    description:
      'Додајте Serpmonn на почетни екран телефона или преузмите Android APK. У чему је разлика и када шта изабрати.',
    ogTitle: 'Како инсталирати Serpmonn',
    ogDescription: 'Почетни екран или Android APK — кратак водич.',
    articleTitle: 'Како инсталирати Serpmonn: на екран телефона и Android APK',
  },
  sv: {
    title: 'Så installerar du Serpmonn: hemskärm och Android',
    description:
      'Lägg till Serpmonn på telefonens hemskärm eller ladda ner Android-APK. Vad skiljer dem och när ska du välja vad.',
    ogTitle: 'Så installerar du Serpmonn',
    ogDescription: 'Hemskärm eller Android-APK — kort guide.',
    articleTitle: 'Så installerar du Serpmonn: på telefonens skärm och Android-APK',
  },
  th: {
    title: 'วิธีติดตั้ง Serpmonn: หน้าจอหลักและ Android',
    description:
      'เพิ่ม Serpmonn ไปยังหน้าจอหลักของโทรศัพท์ หรือดาวน์โหลด APK สำหรับ Android ความต่างคืออะไรและเมื่อไหร่ควรเลือกแบบไหน',
    ogTitle: 'วิธีติดตั้ง Serpmonn',
    ogDescription: 'หน้าจอหลักหรือ Android APK — คู่มือสั้น ๆ',
    articleTitle: 'วิธีติดตั้ง Serpmonn: บนหน้าจอโทรศัพท์และ Android APK',
  },
  tr: {
    title: 'Serpmonn nasıl kurulur: Ana ekran ve Android',
    description:
      'Serpmonn’u telefon ana ekranına ekleyin veya Android APK indirin. Fark nedir ve ne zaman hangisini seçmelisiniz.',
    ogTitle: 'Serpmonn nasıl kurulur',
    ogDescription: 'Ana ekran veya Android APK — kısa rehber.',
    articleTitle: 'Serpmonn nasıl kurulur: telefon ekranına ve Android APK',
  },
  ur: {
    title: 'Serpmonn کیسے انسٹال کریں: ہوم اسکرین اور Android',
    description:
      'Serpmonn کو فون کی ہوم اسکرین پر شامل کریں یا Android APK ڈاؤن لوڈ کریں۔ فرق کیا ہے اور کب کیا منتخب کریں۔',
    ogTitle: 'Serpmonn کیسے انسٹال کریں',
    ogDescription: 'ہوم اسکرین یا Android APK — مختصر رہنما۔',
    articleTitle: 'Serpmonn کیسے انسٹال کریں: فون اسکرین اور Android APK',
  },
  uz: {
    title: 'Serpmonnni qanday o‘rnatish: bosh ekran va Android',
    description:
      'Serpmonnni telefon bosh ekraniga qo‘shing yoki Android APK yuklab oling. Farqi nima va qachon qaysini tanlash kerak.',
    ogTitle: 'Serpmonnni qanday o‘rnatish',
    ogDescription: 'Bosh ekran yoki Android APK — qisqa qo‘llanma.',
    articleTitle: 'Serpmonnni qanday o‘rnatish: telefon ekraniga va Android APK',
  },
  vi: {
    title: 'Cách cài đặt Serpmonn: Màn hình chính và Android',
    description:
      'Thêm Serpmonn vào Màn hình chính của điện thoại hoặc tải APK Android. Khác biệt là gì và khi nào chọn cái nào.',
    ogTitle: 'Cách cài đặt Serpmonn',
    ogDescription: 'Màn hình chính hoặc APK Android — hướng dẫn ngắn.',
    articleTitle: 'Cách cài đặt Serpmonn: trên màn hình điện thoại và APK Android',
  },
  'zh-cn': {
    title: '如何安装 Serpmonn：主屏幕与 Android',
    description:
      '将 Serpmonn 添加到手机主屏幕，或下载 Android APK。两者有何区别，以及何时选择哪种方式。',
    ogTitle: '如何安装 Serpmonn',
    ogDescription: '主屏幕或 Android APK — 简短指南。',
    articleTitle: '如何安装 Serpmonn：添加到手机屏幕与 Android APK',
  },
  ps: {
    title: 'Serpmonn څنګه نصب کړئ: اصلي پرده او Android',
    description:
      'Serpmonn د تلیفون اصلي پردې ته اضافه کړئ یا Android APK ډاونلوډ کړئ. توپیر څه دی او کله کوم غوره کړئ.',
    ogTitle: 'Serpmonn څنګه نصب کړئ',
    ogDescription: 'اصلي پرده یا Android APK — لنډ لارښود.',
    articleTitle: 'Serpmonn څنګه نصب کړئ: د تلیفون پرده او Android APK',
  },
  sd: {
    title: 'Serpmonn ڪيئن انسٽال ڪجي: هوم اسڪرين ۽ Android',
    description:
      'Serpmonn کي فون جي هوم اسڪرين تي شامل ڪريو يا Android APK ڊائون لوڊ ڪريو. فرق ڇا آهي ۽ ڪڏهن ڪهڙو چونڊيو.',
    ogTitle: 'Serpmonn ڪيئن انسٽال ڪجي',
    ogDescription: 'هوم اسڪرين يا Android APK — مختصر گائيڊ.',
    articleTitle: 'Serpmonn ڪيئن انسٽال ڪجي: فون اسڪرين ۽ Android APK',
  },
  ug: {
    title: 'Serpmonn نى قانداق قاچىلاش: باش ئېكران ۋە Android',
    description:
      'Serpmonn نى تېلېفون باش ئېكرانىغا قوشۇڭ ياكى Android APK چۈشۈرۈڭ. پەرقى نېمە ۋە قچان قايسىنى تاللاش كېرەك.',
    ogTitle: 'Serpmonn نى قانداق قاچىلاش',
    ogDescription: 'باش ئېكران ياكى Android APK — قىسقا قوللانما.',
    articleTitle: 'Serpmonn نى قانداق قاچىلاش: تېلېفون ئېكرانى ۋە Android APK',
  },
  dv: {
    title: 'Serpmonn އިންސްޓޯލް ކުރާ ގޮތް: ހޯމް ސްކްރީން އަދި Android',
    description:
      'Serpmonn ފޯނުގެ ހޯމް ސްކްރީނަށް އިތުރުކުރުން ނުވަތަ Android APK ޑައުންލޯޑްކުރުން. ތަފާތު ކޮންތޯ އަދި ކޮންމެ އިޚްތިޔާރެއް ކުރަންވީ ކޮންއިރެއް.',
    ogTitle: 'Serpmonn އިންސްޓޯލް ކުރާ ގޮތް',
    ogDescription: 'ހޯމް ސްކްރީން ނުވަތަ Android APK — ކުރު ގައިޑެއް.',
    articleTitle: 'Serpmonn އިންސްޓޯލް: ފޯނު ސްކްރީން އަދި Android APK',
  },
  ks: {
    title: 'Serpmonn کِتھہٕ انسٹال کْریو: ہوم سکرین تہ Android',
    description:
      'Serpmonn فون ہوم سکرین پٮ۪ٹھہٕ رٲیو یا Android APK ڈاؤن لوڈ کْریو۔ فرق کْیا چھُ تہ کٔنۍ کُس ژٲریو۔',
    ogTitle: 'Serpmonn کِتھہٕ انسٹال کْریو',
    ogDescription: 'ہوم سکرین یا Android APK — مختصر رہنمائی۔',
    articleTitle: 'Serpmonn کِتھہٕ انسٹال کْریو: فون سکرین تہ Android APK',
  },
  'ku-arab': {
    title: 'چۆن Serpmonn دابمەزرێنیت: شاشەی سەرەکی و Android',
    description:
      'Serpmonn زیاد بکە بۆ شاشەی سەرەکی مۆبایل یان APKی Android دابەزێنە. جیاوازییەکە چییە و کەی کام هەڵبژێریت.',
    ogTitle: 'چۆن Serpmonn دابمەزرێنیت',
    ogDescription: 'شاشەی سەرەکی یان APKی Android — ڕێنمایی کورت.',
    articleTitle: 'چۆن Serpmonn دابمەزرێنیت: لەسەر شاشەی مۆبایل و APKی Android',
  },
  yi: {
    title: 'ווי אַזוי צו אינסטאַלירן Serpmonn: היים־סקרין און Android',
    description:
      'לייגט צו Serpmonn צום היים־סקרין פֿון טעלעפֿאָן אָדער לאָדט אַראָפּ Android APK. וואָס איז דער חילוק און ווען וואָס צו קלייבן.',
    ogTitle: 'ווי אַזוי צו אינסטאַלירן Serpmonn',
    ogDescription: 'היים־סקרין אָדער Android APK — קורצער וועגווײַזער.',
    articleTitle: 'ווי אַזוי צו אינסטאַלירן Serpmonn: אויפֿן טעלעפֿאָן־סקרין און Android APK',
  },
};

function fixInstallGuide() {
  const pack = readJson('serpmonnInstallGuide.json');
  if (!pack) return;
  const enTitle = pack.json.en?.meta?.title;
  let touched = false;
  let n = 0;
  for (const loc of LOCALES) {
    if (loc === 'en' || loc === 'ru') continue;
    const block = pack.json[loc];
    if (!block?.meta) continue;
    const stillEn = block.meta.title === enTitle;
    const tr = INSTALL_GUIDE[loc];
    if (!tr) continue;
    if (!stillEn && block.meta.title !== tr.title) {
      // already translated differently — still allow explicit map overwrite only if English
      continue;
    }
    touched |= setIf(block.meta, 'title', tr.title);
    touched |= setIf(block.meta, 'description', tr.description);
    if (block.meta.og) {
      touched |= setIf(block.meta.og, 'title', tr.ogTitle);
      touched |= setIf(block.meta.og, 'description', tr.ogDescription);
    }
    if (block.meta.twitter) {
      touched |= setIf(block.meta.twitter, 'title', tr.ogTitle);
      touched |= setIf(block.meta.twitter, 'description', tr.ogDescription);
    }
    if (block.article) {
      touched |= setIf(block.article, 'title', tr.articleTitle);
    }
    patchHtmlTree(loc, ['knowledge-base', 'articles', 'serpmonn-install-guide.html'], {
      title: tr.title,
      description: tr.description,
    });
    // also set og/twitter explicitly via second pass on file
    const abs = frontendHtml(loc, 'knowledge-base', 'articles', 'serpmonn-install-guide.html');
    if (fs.existsSync(abs)) {
      let html = fs.readFileSync(abs, 'utf8');
      const next = setTitleDesc(html, {
        title: tr.title,
        description: tr.description,
      });
      // og short titles
      const withOg = setTitleDesc(next, {
        title: tr.ogTitle,
        description: tr.ogDescription,
      });
      // Keep <title> as full title (not og short) — re-apply full title
      const finalHtml = setTitleDesc(withOg, {
        title: tr.title,
        description: tr.description,
      });
      // Manually set og/twitter to short variants
      let h = finalHtml;
      h = h.replace(
        /(<meta\s+property=["']og:title["']\s+content=["'])([^"']*)(["'])/i,
        `$1${escapeAttr(tr.ogTitle)}$3`
      );
      h = h.replace(
        /(<meta\s+property=["']og:description["']\s+content=["'])([^"']*)(["'])/i,
        `$1${escapeAttr(tr.ogDescription)}$3`
      );
      h = h.replace(
        /(<meta\s+(?:name|property)=["']twitter:title["']\s+content=["'])([^"']*)(["'])/gi,
        `$1${escapeAttr(tr.ogTitle)}$3`
      );
      h = h.replace(
        /(<meta\s+(?:name|property)=["']twitter:description["']\s+content=["'])([^"']*)(["'])/gi,
        `$1${escapeAttr(tr.ogDescription)}$3`
      );
      if (h !== html) {
        if (!DRY) fs.writeFileSync(abs, h, 'utf8');
        // count once if not already counted by patchHtmlTree
      }
    }
    n++;
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log(`  serpmonnInstallGuide: ${n} locales`);
}

// ---------------------------------------------------------------------------
// 5) Other content pairs
// ---------------------------------------------------------------------------

function fixTariffs() {
  const pack = readJson('tariffs.json');
  if (!pack) return;
  const map = {
    'pt-br': {
      title: 'Preços do Serpmonn AI no Brasil',
      description:
        'Preços do Serpmonn AI no Brasil: acesso gratuito e plano Pro com mais solicitações.',
    },
    'pt-pt': {
      title: 'Preçário Serpmonn AI em Portugal',
      description:
        'Preçário Serpmonn AI em Portugal: acesso gratuito e plano Pro com mais pedidos.',
    },
    es: {
      title: 'Precios de Serpmonn AI en España',
      description:
        'Precios de Serpmonn AI en España: acceso gratuito y plan Pro con más solicitudes.',
    },
    'es-419': {
      title: 'Precios de Serpmonn AI en Latinoamérica',
      description:
        'Precios de Serpmonn AI en Latinoamérica: acceso gratis y plan Pro con más solicitudes.',
    },
    sv: {
      title: 'Priser för Serpmonn AI',
      description:
        'Serpmonn AI-priser i Sverige: gratis åtkomst och Pro-plan med högre gränser.',
    },
    nb: {
      title: 'Priser på Serpmonn AI',
      description:
        'Serpmonn AI-priser i Norge: gratis tilgang og Pro-abonnement med høyere grenser.',
    },
    ro: {
      title: 'Tarife Serpmonn AI în România',
      description:
        'Tarife Serpmonn AI: acces gratuit și plan Pro cu limită mai mare de solicitări.',
    },
    sr: {
      title: 'Тарифе Serpmonn AI',
      description:
        'Тарифе Serpmonn AI: бесплатан приступ и Pro пакет са већим ограничењем.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    const t = pack.json[loc]?.tariffs;
    if (!t) continue;
    touched |= setIf(t, 'pageTitle', tr.title);
    touched |= setIf(t, 'metaDescription', tr.description);
    if ('ogTitle' in t) touched |= setIf(t, 'ogTitle', tr.title);
    if ('ogDescription' in t) touched |= setIf(t, 'ogDescription', tr.description);
    if ('twitterTitle' in t) touched |= setIf(t, 'twitterTitle', tr.title);
    if ('twitterDescription' in t) touched |= setIf(t, 'twitterDescription', tr.description);
    if ('badgeTitle' in t) touched |= setIf(t, 'badgeTitle', tr.title);
    patchHtmlTree(loc, ['tariffs', 'tariffs.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  tariffs: updated');
}

function fixDonate() {
  const pack = readJson('donate.json');
  if (!pack) return;
  const map = {
    'pt-br': {
      title: 'Apoiar o Serpmonn no Brasil',
      description: 'Apoie o projeto Serpmonn no Brasil. Sua doação ajuda no desenvolvimento contínuo.',
    },
    'pt-pt': {
      title: 'Apoiar o Serpmonn em Portugal',
      description: 'Apoie o projeto Serpmonn em Portugal. O seu donativo ajuda no desenvolvimento contínuo.',
    },
    es: {
      title: 'Apoyar a Serpmonn en España',
      description: 'Apoya el proyecto Serpmonn en España. Tu donación ayuda al desarrollo continuo.',
    },
    'es-419': {
      title: 'Apoyar a Serpmonn en Latinoamérica',
      description: 'Apoya el proyecto Serpmonn en Latinoamérica. Tu donación impulsa el desarrollo continuo.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    const d = pack.json[loc]?.donate;
    if (!d) continue;
    touched |= setIf(d, 'pageTitle', tr.title);
    if ('ogTitle' in d) touched |= setIf(d, 'ogTitle', tr.title);
    if ('twitterTitle' in d) touched |= setIf(d, 'twitterTitle', tr.title);
    if ('ogDescription' in d) touched |= setIf(d, 'ogDescription', tr.description);
    if ('twitterDescription' in d) touched |= setIf(d, 'twitterDescription', tr.description);
    patchHtmlTree(loc, ['donate', 'donate.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  donate: updated');
}

function fixPromo() {
  const pack = readJson('localesPromocodes.json');
  if (!pack) return;
  const map = {
    'pt-br': {
      title: 'Cupons e Descontos 2026 no Brasil | Serpmonn.ru',
      description:
        'Cupons e descontos atuais 2026 de parceiros Serpmonn no Brasil: jogos, gadgets, serviços e mais.',
    },
    'pt-pt': {
      title: 'Códigos Promocionais e Descontos 2026 em Portugal | Serpmonn.ru',
      description:
        'Códigos promocionais e descontos atuais 2026 de parceiros Serpmonn em Portugal: jogos, gadgets, serviços e mais.',
    },
    es: {
      title: 'Códigos promocionales y descuentos 2026 en España | Serpmonn.ru',
      description:
        'Códigos promocionales y descuentos actuales 2026 de socios Serpmonn en España: juegos, gadgets, servicios y más.',
    },
    'es-419': {
      title: 'Cupones y descuentos 2026 en Latinoamérica | Serpmonn.ru',
      description:
        'Cupones y descuentos actuales 2026 de socios Serpmonn en Latinoamérica: juegos, gadgets, servicios y más.',
    },
    da: {
      title: 'Rabatkoder og tilbud 2026 i Danmark | Serpmonn.ru',
      description:
        'Aktuelle rabatkoder og tilbud 2026 fra Serpmonn-partnere i Danmark: spil, gadgets, tjenester og mere.',
    },
    nb: {
      title: 'Kampanjekoder og rabatter 2026 i Norge | Serpmonn.ru',
      description:
        'Aktuelle kampanjekoder og rabatter 2026 fra Serpmonn-partnere i Norge: spill, gadgets, tjenester og mer.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    const p = pack.json[loc]?.promoCodes;
    if (!p) continue;
    touched |= setIf(p, 'title', tr.title);
    if ('metaDescription' in p) touched |= setIf(p, 'metaDescription', tr.description);
    if ('ogTitle' in p) touched |= setIf(p, 'ogTitle', tr.title.replace(/\s*\|\s*Serpmonn\.ru$/, ' — Serpmonn'));
    if ('ogDescription' in p) touched |= setIf(p, 'ogDescription', tr.description);
    patchHtmlTree(loc, ['promo-codes-and-discounts', 'promokody-skidki.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  promo: updated');
}

function fixAboutProject() {
  const pack = readJson('aboutProjectTranslations.json');
  if (!pack) return;
  const map = {
    'pt-br': {
      title: 'Sobre o projeto Serpmonn no Brasil',
      description:
        'Serpmonn é uma busca agentiva com ferramentas e jogos. Conheça o produto e os planos no Brasil.',
    },
    'pt-pt': {
      title: 'Sobre o projeto Serpmonn em Portugal',
      description:
        'Serpmonn é uma pesquisa agentiva com ferramentas e jogos. Saiba mais sobre o produto e os planos em Portugal.',
    },
    cs: {
      title: 'O projektu Serpmonn',
      description:
        'Serpmonn je agentivní vyhledávání s webovými nástroji a hrami. Zjistěte více o produktu a plánech.',
    },
    sr: {
      title: 'О пројекту Serpmonn',
      description:
        'Serpmonn је агентивно претраживање са веб алатима и играма. Сазнајте више о производу и плановима.',
    },
    sv: {
      title: 'Om Serpmonn-projektet',
      description:
        'Serpmonn är en agentbaserad sökning med webbverktyg och spel. Läs mer om produkten och planerna.',
    },
    da: {
      title: 'Om Serpmonn-projektet i Danmark',
      description:
        'Serpmonn er en agentbaseret søgning med værktøjer og spil. Læs mere om produktet og planerne.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    const a = pack.json[loc]?.aboutProject;
    if (!a) continue;
    touched |= setIf(a, 'title', tr.title);
    touched |= setIf(a, 'description', tr.description);
    if ('ogTitle' in a) touched |= setIf(a, 'ogTitle', tr.title);
    if ('ogDescription' in a) touched |= setIf(a, 'ogDescription', tr.description);
    patchHtmlTree(loc, ['about-project', 'about-project.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  about-project: updated');
}

function fixImprove() {
  const pack = readJson('improve.json');
  if (!pack) return;
  const map = {
    'pt-br': {
      title: 'O que melhorar no Serpmonn? Sugestões do Brasil',
      description: 'Envie sugestões e ideias para melhorar o Serpmonn — feedback da comunidade no Brasil.',
    },
    'pt-pt': {
      title: 'O que melhorar no Serpmonn? Sugestões de Portugal',
      description: 'Envie sugestões e ideias para melhorar o Serpmonn — feedback da comunidade em Portugal.',
    },
    es: {
      title: '¿Qué mejorar en Serpmonn? Sugerencias desde España',
      description: 'Envía sugerencias e ideas para mejorar Serpmonn — comentarios de la comunidad en España.',
    },
    'es-419': {
      title: '¿Qué mejorar en Serpmonn? Ideas desde Latinoamérica',
      description:
        'Envía sugerencias e ideas para mejorar Serpmonn — comentarios de la comunidad en Latinoamérica.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    const block = pack.json[loc];
    if (!block) continue;
    touched |= setIf(block, 'title', tr.title);
    if ('description' in block) touched |= setIf(block, 'description', tr.description);
    patchHtmlTree(loc, ['improve', 'improve.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  improve: updated');
}

function fixOffer() {
  const pack = readJson('offerTranslations.json');
  if (!pack) return;
  const map = {
    es: {
      title: 'Acuerdo de usuario de Serpmonn (España)',
      description: 'Contrato de oferta y condiciones de uso del servicio Serpmonn en España.',
    },
    'es-419': {
      title: 'Contrato de oferta de Serpmonn (Latinoamérica)',
      description: 'Acuerdo de usuario y condiciones del servicio Serpmonn para Latinoamérica.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    const o = pack.json[loc]?.offer;
    if (!o) continue;
    touched |= setIf(o, 'pageTitle', tr.title);
    touched |= setIf(o, 'metaDescription', tr.description);
    if ('ogTitle' in o) touched |= setIf(o, 'ogTitle', tr.title);
    if ('twitterTitle' in o) touched |= setIf(o, 'twitterTitle', tr.title);
    patchHtmlTree(loc, ['offer', 'offer.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  offer: updated');
}

function fixWebTechTrends() {
  const pack = readJson('webTechTrends2025.json');
  if (!pack) return;
  const map = {
    'pt-br': {
      title: 'Tendências de Tecnologias Web 2025 no Brasil — Guia para Desenvolvedores',
      description:
        'Visão geral das tendências web de 2025 para desenvolvedores no Brasil: IA, WebAssembly e novos frameworks.',
    },
    'pt-pt': {
      title: 'Tendências de Tecnologias Web 2025 em Portugal — O que importa saber',
      description:
        'Panorama das tendências web de 2025 para programadores em Portugal: IA, WebAssembly e novas ferramentas.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    const meta = pack.json[loc]?.meta;
    if (!meta) continue;
    touched |= setIf(meta, 'title', tr.title);
    if ('ogTitle' in meta) touched |= setIf(meta, 'ogTitle', tr.title);
    if ('twitterTitle' in meta) touched |= setIf(meta, 'twitterTitle', tr.title);
    if ('ogDescription' in meta) touched |= setIf(meta, 'ogDescription', tr.description);
    if ('twitterDescription' in meta) touched |= setIf(meta, 'twitterDescription', tr.description);
    patchHtmlTree(loc, ['knowledge-base', 'articles', 'web-tech-trends-2024.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  web-tech-trends: updated');
}

function fixWebDevGuide() {
  const pack = readJson('webDevelopmentGuide.json');
  if (!pack) return;
  const map = {
    'pt-br': {
      title: 'Como Criar Seu Primeiro Site do Zero — Guia Completo (Brasil)',
      description:
        'Guia passo a passo para iniciantes no Brasil: HTML, CSS, JavaScript, hospedagem e publicação.',
    },
    'pt-pt': {
      title: 'Como Criar o Seu Primeiro Site do Zero — Guia Completo (Portugal)',
      description:
        'Guia passo a passo para principiantes em Portugal: HTML, CSS, JavaScript, alojamento e publicação.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    const meta = pack.json[loc]?.meta;
    if (!meta) continue;
    touched |= setIf(meta, 'title', tr.title);
    touched |= setIf(meta, 'description', tr.description);
    if ('ogTitle' in meta) touched |= setIf(meta, 'ogTitle', tr.title);
    if ('ogDescription' in meta) touched |= setIf(meta, 'ogDescription', tr.description);
    patchHtmlTree(loc, ['knowledge-base', 'articles', 'web-development-guide.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  web-development-guide: updated');
}

function fixSnippetLimits() {
  const pack = readJson('snippetLimitsVkTelegramYoutubeTiktok.json');
  if (!pack) return;
  const map = {
    'pt-br': {
      title: 'Limites de caracteres e snippets: VK / Telegram / YouTube / TikTok (Brasil)',
      description:
        'Tabela de limites e exemplos para títulos e descrições não serem cortados — foco no público brasileiro.',
    },
    'pt-pt': {
      title: 'Limites de caracteres e snippets: VK / Telegram / YouTube / TikTok (Portugal)',
      description:
        'Tabela de limites e exemplos para títulos e descrições não serem cortados — foco no público português.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(map)) {
    const meta = pack.json[loc]?.meta;
    if (!meta) continue;
    touched |= setIf(meta, 'title', tr.title);
    touched |= setIf(meta, 'description', tr.description);
    patchHtmlTree(
      loc,
      ['knowledge-base', 'articles', 'snippet-limits-vk-telegram-youtube-tiktok.html'],
      tr
    );
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  snippet-limits: updated');
}

function fixSuccess() {
  const pack = readJson('success.json');
  if (!pack) return;
  // HTML for be/hu still has Russian — sync from JSON (already correct) + ensure uniqueness
  const overrides = {
    be: {
      title: 'Аплата паспяхова завершана',
      description: 'Тарыф Pro будзе актываваны цягам некалькіх секунд.',
    },
    hu: {
      title: 'Sikeres fizetés — Serpmonn',
      description: 'A Pro tarifa néhány másodpercen belül aktiválódik.',
    },
  };
  let touched = false;
  for (const [loc, tr] of Object.entries(overrides)) {
    const s = pack.json[loc]?.success;
    if (s) {
      touched |= setIf(s, 'pageTitle', tr.title);
      touched |= setIf(s, 'metaDescription', tr.description);
      if ('title' in s) touched |= setIf(s, 'title', tr.title);
    }
    patchHtmlTree(loc, ['tariffs', 'success.html'], tr);
  }
  if (touched) writeJson(pack.path, pack.json);
  console.log('  success.html: updated');
}

// ---------------------------------------------------------------------------
// 6) Redirect stubs
// ---------------------------------------------------------------------------

const REDIRECT_LOGIN = {
  ru: 'Вход…',
  en: 'Sign in…',
  id: 'Masuk…',
  fil: 'Mag-sign in…',
  'pt-br': 'Entrar na conta…',
  'pt-pt': 'Iniciar sessão…',
  da: 'Log ind…',
  es: 'Iniciar sesión…',
  'es-419': 'Acceder a la cuenta…',
  sd: 'سائن ان…',
  ur: 'داخلہ…',
  ks: 'لاگ اِن…',
  az: 'Hesaba giriş…',
  tr: 'Oturum aç…',
  fr: 'Connexion…',
  de: 'Anmelden…',
  sv: 'Logga in…',
  nb: 'Logg inn…',
  nl: 'Inloggen…',
  pl: 'Logowanie…',
  it: 'Accedi…',
  uk: 'Вхід…',
  be: 'Уваход…',
  bg: 'Вход…',
  cs: 'Přihlášení…',
  ro: 'Autentificare…',
  hu: 'Bejelentkezés…',
  fi: 'Kirjaudu…',
  el: 'Σύνδεση…',
  he: 'התחברות…',
  ar: 'تسجيل الدخول…',
  fa: 'ورود…',
  hi: 'साइन इन…',
  bn: 'সাইন ইন…',
  th: 'เข้าสู่ระบบ…',
  vi: 'Đăng nhập…',
  ja: 'ログイン…',
  ko: '로그인…',
  'zh-cn': '登录…',
  ms: 'Log masuk…',
  uz: 'Kirish…',
  kk: 'Кіру…',
  hy: 'Մուտք…',
  ka: 'შესვლა…',
  sr: 'Пријава…',
  ps: 'ننوتل…',
  ug: 'كىرىش…',
  dv: 'ލޮގިން…',
  'ku-arab': 'چوونەژوورەوە…',
  yi: 'אַרײַנלאָג…',
};

const REDIRECT_REGISTER = {
  ru: 'Регистрация…',
  en: 'Create account…',
  id: 'Daftar akun…',
  fil: 'Gumawa ng account…',
  'pt-br': 'Criar conta…',
  'pt-pt': 'Registar conta…',
  da: 'Opret konto…',
  es: 'Crear cuenta…',
  'es-419': 'Registrarse…',
  sd: 'رجسٽريشن…',
  ur: 'رجسٹریشن…',
  ks: 'رجسٹریشن…',
  az: 'Qeydiyyat…',
  tr: 'Kayıt ol…',
  fr: 'Inscription…',
  de: 'Registrierung…',
  sv: 'Skapa konto…',
  nb: 'Opprett konto…',
  nl: 'Registreren…',
  pl: 'Rejestracja…',
  it: 'Registrazione…',
  be: 'Рэгістрацыя…',
  bg: 'Регистрация…',
  cs: 'Registrace…',
  ro: 'Înregistrare…',
  hu: 'Regisztráció…',
  fi: 'Rekisteröidy…',
  el: 'Εγγραφή…',
  he: 'הרשמה…',
  ar: 'إنشاء حساب…',
  fa: 'ثبت‌نام…',
  hi: 'पंजीकरण…',
  bn: 'নিবন্ধন…',
  th: 'สมัครสมาชิก…',
  vi: 'Đăng ký…',
  ja: '新規登録…',
  ko: '회원가입…',
  'zh-cn': '注册…',
  ms: 'Daftar…',
  uz: 'Ro‘yxatdan o‘tish…',
  kk: 'Тіркелу…',
  hy: 'Գրանցում…',
  ka: 'რეგისტრაცია…',
  sr: 'Регистрација…',
  ps: 'نوملیکنه…',
  ug: 'تىزىملىتىش…',
  dv: 'ރަޖިސްޓަރ…',
  'ku-arab': 'تۆمارکردن…',
  yi: 'רעגיסטראַציע…',
};

const REDIRECT_KB = {
  ru: 'Переход в базу знаний',
  en: 'Redirecting to knowledge base',
  id: 'Mengalihkan ke basis pengetahuan',
  fil: 'Nagre-redirect sa knowledge base',
  'pt-br': 'Redirecionando para a base de conhecimento',
  'pt-pt': 'A redirecionar para a base de conhecimento',
  da: 'Omdirigerer til vidensbasen',
  es: 'Redirigiendo a la base de conocimiento',
  'es-419': 'Redireccionando a la base de conocimientos',
  fr: 'Redirection vers la base de connaissances',
  de: 'Weiterleitung zur Wissensdatenbank',
  sv: 'Omdirigerar till kunskapsbasen',
  nb: 'Omdirigerer til kunnskapsbasen',
  nl: 'Doorverwijzen naar kennisbank',
  pl: 'Przekierowanie do bazy wiedzy',
  it: 'Reindirizzamento alla knowledge base',
  be: 'Пераход у базу ведаў',
  bg: 'Пренасочване към базата знания',
  cs: 'Přesměrování do znalostní báze',
  ro: 'Redirecționare către baza de cunoștințe',
  hu: 'Átirányítás a tudásbázisra',
  fi: 'Ohjataan tietopankkiin',
  el: 'Ανακατεύθυνση στη βάση γνώσεων',
  he: 'הפניה לבסיס הידע',
  ar: 'إعادة التوجيه إلى قاعدة المعرفة',
  fa: 'در حال انتقال به پایگاه دانش',
  hi: 'ज्ञान आधार पर पुनर्निर्देशन',
  bn: 'নলেজ বেসে পুনর্নির্দেশ',
  th: 'กำลังเปลี่ยนไปยังฐานความรู้',
  vi: 'Đang chuyển tới kho kiến thức',
  ja: 'ナレッジベースへリダイレクト中',
  ko: '지식 베이스로 이동 중',
  'zh-cn': '正在跳转到知识库',
  ms: 'Mengalihkan ke pangkalan pengetahuan',
  uz: 'Bilimlar bazasiga yo‘naltirilmoqda',
  kk: 'Білім қорына қайта бағытталуда',
  hy: 'Վերահասցեավորում գիտելիքների բազա',
  ka: 'გადამისამართება ცოდნის ბაზაზე',
  sr: 'Преусмеравање на базу знања',
  tr: 'Bilgi tabanına yönlendiriliyor',
  az: 'Bilik bazasına yönləndirilir',
  ur: 'نالج بیس کی طرف منتقل',
  sd: 'نالج بيس ڏانهن ريڊائيرڪٽ',
  ks: 'نالج بیس کُن منتقل',
  ps: 'پوهنځي ته لیږدول',
  ug: 'بىلىم ئامبىرىغا يۆتكەش',
  dv: 'ނޮލެޖް ބޭސް އަށް ރީޑައިރެކްޓް',
  'ku-arab': 'ئاڕاستەکردن بۆ بنکەی زانیاری',
  yi: 'ווײַטערפֿירן צום וויסן־באַזע',
};

const REDIRECT_GAME = {
  ru: 'Переход к игре',
  en: 'Redirecting to game',
  id: 'Mengalihkan ke game',
  fil: 'Nagre-redirect sa laro',
  'pt-br': 'Redirecionando para o jogo',
  'pt-pt': 'A redirecionar para o jogo',
  da: 'Omdirigerer til spillet',
  es: 'Redirigiendo al juego',
  'es-419': 'Redireccionando al juego',
  fr: 'Redirection vers le jeu',
  de: 'Weiterleitung zum Spiel',
  sv: 'Omdirigerar till spelet',
  nb: 'Omdirigerer til spillet',
  nl: 'Doorverwijzen naar spel',
  pl: 'Przekierowanie do gry',
  it: 'Reindirizzamento al gioco',
  be: 'Пераход да гульні',
  bg: 'Пренасочване към играта',
  cs: 'Přesměrování do hry',
  ro: 'Redirecționare către joc',
  hu: 'Átirányítás a játékra',
  fi: 'Ohjataan peliin',
  el: 'Ανακατεύθυνση στο παιχνίδι',
  he: 'הפניה למשחק',
  ar: 'إعادة التوجيه إلى اللعبة',
  fa: 'در حال انتقال به بازی',
  hi: 'गेम पर पुनर्निर्देशन',
  bn: 'গেমে পুনর্নির্দেশ',
  th: 'กำลังไปยังเกม',
  vi: 'Đang chuyển tới trò chơi',
  ja: 'ゲームへリダイレクト中',
  ko: '게임으로 이동 중',
  'zh-cn': '正在跳转到游戏',
  ms: 'Mengalihkan ke permainan',
  uz: 'O‘yinga yo‘naltirilmoqda',
  kk: 'Ойынға қайта бағытталуда',
  hy: 'Վերահասցեավորում խաղ',
  ka: 'გადამისამართება თამაშზე',
  sr: 'Преусмеравање на игру',
  tr: 'Oyuna yönlendiriliyor',
  az: 'Oyuna yönləndirilir',
  ur: 'گیم کی طرف منتقل',
  sd: 'راند ڏانهن ريڊائيرڪٽ',
  ks: 'گیم کُن منتقل',
  ps: 'لوبې ته لیږدول',
  ug: 'ئويۇنغا يۆتكەش',
  dv: 'ގޭމަށް ރީޑައިރެކްޓް',
  'ku-arab': 'ئاڕاستەکردن بۆ یاری',
  yi: 'ווײַטערפֿירן צום שפּיל',
};

function redirectDesc(kind, locale, extra = '') {
  const maps = {
    login: {
      ru: 'Выполняется переход на страницу входа Serpmonn.',
      en: 'Taking you to the Serpmonn sign-in page.',
      fr: 'Redirection vers la page de connexion Serpmonn.',
      de: 'Weiterleitung zur Serpmonn-Anmeldeseite.',
      es: 'Te llevamos a la página de inicio de sesión de Serpmonn.',
      'es-419': 'Te llevamos a la página de acceso de Serpmonn.',
      'pt-br': 'Levando você à página de entrada do Serpmonn.',
      'pt-pt': 'A redirecioná-lo para a página de início de sessão do Serpmonn.',
      id: 'Mengalihkan ke halaman masuk Serpmonn.',
      fil: 'Dinadala ka sa sign-in page ng Serpmonn.',
      da: 'Sender dig til Serpmonn-loginsiden.',
      tr: 'Serpmonn oturum açma sayfasına yönlendiriliyorsunuz.',
      az: 'Serpmonn giriş səhifəsinə yönləndirilirsiniz.',
      sv: 'Tar dig till Serpmonns inloggningssida.',
      nb: 'Tar deg til Serpmonn-innloggingssiden.',
      pl: 'Przekierowanie na stronę logowania Serpmonn.',
      it: 'Reindirizzamento alla pagina di accesso Serpmonn.',
      nl: 'Je wordt doorgestuurd naar de Serpmonn-inlogpagina.',
      cs: 'Přesměrování na přihlašovací stránku Serpmonn.',
      ro: 'Redirecționare către pagina de autentificare Serpmonn.',
      hu: 'Átirányítás a Serpmonn bejelentkezési oldalára.',
      fi: 'Ohjataan Serpmonnin kirjautumissivulle.',
      uk: null,
      be: 'Пераход на старонку ўваходу Serpmonn.',
      bg: 'Пренасочване към страницата за вход в Serpmonn.',
      sr: 'Преусмеравање на страницу за пријаву Serpmonn.',
      el: 'Ανακατεύθυνση στη σελίδα σύνδεσης του Serpmonn.',
      he: 'הפניה לדף ההתחברות של Serpmonn.',
      ar: 'إعادة التوجيه إلى صفحة تسجيل الدخول في Serpmonn.',
      fa: 'در حال انتقال به صفحه ورود Serpmonn.',
      hi: 'Serpmonn साइन-इन पृष्ठ पर भेजा जा रहा है।',
      bn: 'Serpmonn সাইন-ইন পাতায় নিয়ে যাওয়া হচ্ছে।',
      th: 'กำลังพาไปยังหน้าเข้าสู่ระบบ Serpmonn',
      vi: 'Đang chuyển tới trang đăng nhập Serpmonn.',
      ja: 'Serpmonnのログインページへ移動します。',
      ko: 'Serpmonn 로그인 페이지로 이동합니다.',
      'zh-cn': '正在跳转到 Serpmonn 登录页。',
      ms: 'Mengalihkan ke halaman log masuk Serpmonn.',
      uz: 'Serpmonn kirish sahifasiga yo‘naltirilmoqda.',
      kk: 'Serpmonn кіру бетіне қайта бағытталуда.',
      hy: 'Վերահասցեավորում Serpmonn մուտքի էջ։',
      ka: 'გადამისამართება Serpmonn-ის შესვლის გვერდზე.',
      ur: 'Serpmonn سائن اِن صفحے پر منتقل کیا جا رہا ہے۔',
      sd: 'Serpmonn سائن ان صفحي ڏانهن وٺي وڃي رهيو آهي.',
      ks: 'Serpmonn لاگ اِن صفحہ کُن منتقل۔',
      ps: 'د Serpmonn ننوتلو پاڼې ته لیږدول کیږي.',
      ug: 'Serpmonn كىرىش بېتىگە يۆتكىلىۋاتىدۇ.',
      dv: 'Serpmonn ލޮގިން ޞަފްޙާ އަށް ދަތުރުކުރަނީ.',
      'ku-arab': 'ئاڕاستەکردن بۆ پەڕەی چوونەژوورەوەی Serpmonn.',
      yi: 'מען פֿירט אײַך צום Serpmonn אַרײַנלאָג־בלאַט.',
    },
    register: {
      ru: 'Выполняется переход на страницу регистрации Serpmonn.',
      en: 'Taking you to the Serpmonn registration page.',
      fr: 'Redirection vers la page d’inscription Serpmonn.',
      de: 'Weiterleitung zur Serpmonn-Registrierungsseite.',
      es: 'Te llevamos a la página de registro de Serpmonn en España.',
      'es-419': 'Te llevamos a la página de registro de Serpmonn en Latinoamérica.',
      'pt-br': 'Levando você à página de cadastro do Serpmonn.',
      'pt-pt': 'A redirecioná-lo para a página de registo do Serpmonn.',
      id: 'Mengalihkan ke halaman pendaftaran akun Serpmonn.',
      fil: 'Dinadala ka sa registration page ng Serpmonn.',
      da: 'Sender dig til Serpmonn-registreringssiden.',
      tr: 'Serpmonn kayıt sayfasına yönlendiriliyorsunuz.',
      az: 'Serpmonn qeydiyyat səhifəsinə yönləndirilirsiniz.',
      sv: 'Tar dig till Serpmonns registreringssida.',
      nb: 'Tar deg til Serpmonn-registreringssiden.',
      pl: 'Przekierowanie na stronę rejestracji Serpmonn.',
      it: 'Reindirizzamento alla pagina di registrazione Serpmonn.',
      nl: 'Je wordt doorgestuurd naar de Serpmonn-registratiepagina.',
      cs: 'Přesměrování na registrační stránku Serpmonn.',
      ro: 'Redirecționare către pagina de înregistrare Serpmonn.',
      hu: 'Átirányítás a Serpmonn regisztrációs oldalára.',
      fi: 'Ohjataan Serpmonnin rekisteröitymissivulle.',
      be: 'Пераход на старонку рэгістрацыі Serpmonn.',
      bg: 'Пренасочване към страницата за регистрация в Serpmonn.',
      sr: 'Преусмеравање на страницу за регистрацију Serpmonn.',
      el: 'Ανακατεύθυνση στη σελίδα εγγραφής του Serpmonn.',
      he: 'הפניה לדף ההרשמה של Serpmonn.',
      ar: 'إعادة التوجيه إلى صفحة إنشاء حساب Serpmonn.',
      fa: 'در حال انتقال به صفحه ثبت‌نام Serpmonn.',
      hi: 'Serpmonn पंजीकरण पृष्ठ पर भेजा जा रहा है।',
      bn: 'Serpmonn নিবন্ধন পাতায় নিয়ে যাওয়া হচ্ছে।',
      th: 'กำลังพาไปยังหน้าสมัครสมาชิก Serpmonn',
      vi: 'Đang chuyển tới trang đăng ký Serpmonn.',
      ja: 'Serpmonnの登録ページへ移動します。',
      ko: 'Serpmonn 회원가입 페이지로 이동합니다.',
      'zh-cn': '正在跳转到 Serpmonn 注册页。',
      ms: 'Mengalihkan ke halaman daftar akaun Serpmonn.',
      uz: 'Serpmonn ro‘yxatdan o‘tish sahifasiga yo‘naltirilmoqda.',
      kk: 'Serpmonn тіркелу бетіне қайта бағытталуда.',
      hy: 'Վերահասցեավորում Serpmonn գրանցման էջ։',
      ka: 'გადამისამართება Serpmonn-ის რეგისტრაციის გვერდზე.',
      ur: 'Serpmonn رجسٹریشن صفحے پر منتقل کیا جا رہا ہے۔',
      sd: 'Serpmonn رجسٽريشن صفحي ڏانهن وٺي وڃي رهيو آهي.',
      ks: 'Serpmonn رجسٹریشن صفحہ کُن منتقل۔',
      ps: 'د Serpmonn نوملیکنې پاڼې ته لیږدول کیږي.',
      ug: 'Serpmonn تىزىملىتىش بېتىگە يۆتكىلىۋاتىدۇ.',
      dv: 'Serpmonn ރަޖިސްޓަރ ޞަފްޙާ އަށް ދަތުރުކުރަނީ.',
      'ku-arab': 'ئاڕاستەکردن بۆ پەڕەی تۆمارکردنی Serpmonn.',
      yi: 'מען פֿירט אײַך צום Serpmonn רעגיסטראַציע־בלאַט.',
    },
    kb: {
      ru: 'Страница перенесена в базу знаний Serpmonn.',
      en: 'This page has moved to the Serpmonn knowledge base.',
      fr: 'Cette page a été déplacée vers la base de connaissances Serpmonn.',
      de: 'Diese Seite wurde in die Serpmonn-Wissensdatenbank verschoben.',
      es: 'Esta página se ha movido a la base de conocimiento de Serpmonn.',
      'es-419': 'Esta página se movió a la base de conocimientos de Serpmonn.',
      'pt-br': 'Esta página foi movida para a base de conhecimento do Serpmonn.',
      'pt-pt': 'Esta página foi movida para a base de conhecimento do Serpmonn.',
      id: 'Halaman ini dipindahkan ke basis pengetahuan Serpmonn.',
      fil: 'Inilipat ang page na ito sa Serpmonn knowledge base.',
      da: 'Denne side er flyttet til Serpmonns vidensbase.',
      tr: 'Bu sayfa Serpmonn bilgi tabanına taşındı.',
      az: 'Bu səhifə Serpmonn bilik bazasına köçürülüb.',
      sv: 'Sidan har flyttats till Serpmonns kunskapsbas.',
      nb: 'Siden er flyttet til Serpmonns kunnskapsbase.',
      pl: 'Ta strona została przeniesiona do bazy wiedzy Serpmonn.',
      it: 'Questa pagina è stata spostata nella knowledge base Serpmonn.',
      nl: 'Deze pagina is verplaatst naar de Serpmonn-kennisbank.',
      cs: 'Tato stránka byla přesunuta do znalostní báze Serpmonn.',
      ro: 'Această pagină a fost mutată în baza de cunoștințe Serpmonn.',
      hu: 'Ez az oldal a Serpmonn tudásbázisába került.',
      fi: 'Tämä sivu on siirretty Serpmonnin tietopankkiin.',
      be: 'Старонка перанесена ў базу ведаў Serpmonn.',
      bg: 'Страницата е преместена в базата знания на Serpmonn.',
      sr: 'Страница је премештена у базу знања Serpmonn.',
      el: 'Η σελίδα μεταφέρθηκε στη βάση γνώσεων του Serpmonn.',
      he: 'הדף הועבר לבסיס הידע של Serpmonn.',
      ar: 'تم نقل هذه الصفحة إلى قاعدة معرفة Serpmonn.',
      fa: 'این صفحه به پایگاه دانش Serpmonn منتقل شده است.',
      hi: 'यह पृष्ठ Serpmonn ज्ञान आधार पर स्थानांतरित कर दिया गया है।',
      bn: 'এই পৃষ্ঠা Serpmonn নলেজ বেসে সরানো হয়েছে।',
      th: 'หน้านี้ย้ายไปยังฐานความรู้ Serpmonn แล้ว',
      vi: 'Trang này đã chuyển tới kho kiến thức Serpmonn.',
      ja: 'このページは Serpmonn ナレッジベースへ移動しました。',
      ko: '이 페이지는 Serpmonn 지식 베이스로 이동했습니다.',
      'zh-cn': '此页面已迁移至 Serpmonn 知识库。',
      ms: 'Halaman ini dipindahkan ke pangkalan pengetahuan Serpmonn.',
      uz: 'Bu sahifa Serpmonn bilimlar bazasiga ko‘chirildi.',
      kk: 'Бұл бет Serpmonn білім қорына көшірілді.',
      hy: 'Այս էջը տեղափոխվել է Serpmonn գիտելիքների բազա։',
      ka: 'ეს გვერდი გადატანილია Serpmonn-ის ცოდნის ბაზაში.',
      ur: 'یہ صفحہ Serpmonn نالج بیس میں منتقل ہو گیا ہے۔',
      sd: 'هي صفحو Serpmonn نالج بيس ۾ منتقل ٿي ويو آهي.',
      ks: 'یِہ صفحہ Serpmonn نالج بیس منز منتقل۔',
      ps: 'دا پاڼه د Serpmonn پوهنځي ته لېږدول شوې.',
      ug: 'بۇ بەت Serpmonn بىلىم ئامبىرىغا يۆتكەلدى.',
      dv: 'މި ޞަފްޙާ Serpmonn ނޮލެޖް ބޭސަށް ބަދަލުކުރެވިއްޖެ.',
      'ku-arab': 'ئەم پەڕەیە گوازرایەوە بۆ بنکەی زانیاری Serpmonn.',
      yi: 'דער בלאַט איז אַריבערגעפֿירט צום Serpmonn וויסן־באַזע.',
    },
    game: {
      ru: 'Выполняется переход к игре Serpmonn.',
      en: 'Taking you to the Serpmonn game.',
      fr: 'Redirection vers le jeu Serpmonn.',
      de: 'Weiterleitung zum Serpmonn-Spiel.',
      es: 'Te llevamos al juego de Serpmonn.',
      'es-419': 'Te llevamos al juego de Serpmonn.',
      'pt-br': 'Levando você ao jogo Serpmonn.',
      'pt-pt': 'A redirecioná-lo para o jogo Serpmonn.',
      id: 'Mengalihkan ke game Serpmonn.',
      fil: 'Dinadala ka sa laro ng Serpmonn.',
      da: 'Sender dig til Serpmonn-spillet.',
      tr: 'Serpmonn oyununa yönlendiriliyorsunuz.',
      az: 'Serpmonn oyununa yönləndirilirsiniz.',
      sv: 'Tar dig till Serpmonn-spelet.',
      nb: 'Tar deg til Serpmonn-spillet.',
      pl: 'Przekierowanie do gry Serpmonn.',
      it: 'Reindirizzamento al gioco Serpmonn.',
      nl: 'Je wordt doorgestuurd naar het Serpmonn-spel.',
      cs: 'Přesměrování do hry Serpmonn.',
      ro: 'Redirecționare către jocul Serpmonn.',
      hu: 'Átirányítás a Serpmonn játékra.',
      fi: 'Ohjataan Serpmonn-peliin.',
      be: 'Пераход да гульні Serpmonn.',
      bg: 'Пренасочване към играта Serpmonn.',
      sr: 'Преусмеравање на игру Serpmonn.',
      el: 'Ανακατεύθυνση στο παιχνίδι Serpmonn.',
      he: 'הפניה למשחק Serpmonn.',
      ar: 'إعادة التوجيه إلى لعبة Serpmonn.',
      fa: 'در حال انتقال به بازی Serpmonn.',
      hi: 'Serpmonn गेम पर भेजा जा रहा है।',
      bn: 'Serpmonn গেমে নিয়ে যাওয়া হচ্ছে।',
      th: 'กำลังพาไปยังเกม Serpmonn',
      vi: 'Đang chuyển tới trò chơi Serpmonn.',
      ja: 'Serpmonnのゲームへ移動します。',
      ko: 'Serpmonn 게임으로 이동합니다.',
      'zh-cn': '正在跳转到 Serpmonn 游戏。',
      ms: 'Mengalihkan ke permainan Serpmonn.',
      uz: 'Serpmonn o‘yiniga yo‘naltirilmoqda.',
      kk: 'Serpmonn ойынына қайта бағытталуда.',
      hy: 'Վերահասցեավորում Serpmonn խաղ։',
      ka: 'გადამისამართება Serpmonn-ის თამაშზე.',
      ur: 'Serpmonn گیم پر منتقل کیا جا رہا ہے۔',
      sd: 'Serpmonn راند ڏانهن وٺي وڃي رهيو آهي.',
      ks: 'Serpmonn گیم کُن منتقل۔',
      ps: 'د Serpmonn لوبې ته لیږدول کیږي.',
      ug: 'Serpmonn ئويۇنىغا يۆتكىلىۋاتىدۇ.',
      dv: 'Serpmonn ގޭމަށް ދަތުރުކުރަނީ.',
      'ku-arab': 'ئاڕاستەکردن بۆ یاریی Serpmonn.',
      yi: 'מען פֿירט אײַך צום Serpmonn שפּיל.',
    },
  };
  const base = maps[kind]?.[locale] || maps[kind]?.en || 'Redirecting…';
  return extra ? `${base} (${extra})` : base;
}

function isRedirectStubTitle(title) {
  return /^(Redirecting…|Redirecting\.\.\.|Переадресация)$/i.test((title || '').trim());
}

function isLoginOrRegisterStub(rel) {
  return (
    /\/login\/login\.html$|^login\/login\.html$/.test(rel) ||
    /\/register\/register\.html$|^register\/register\.html$/.test(rel)
  );
}

function looksLikeRedirectStub(html, rel) {
  const titleM = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleM ? titleM[1].trim() : '';
  if (isRedirectStubTitle(title)) return true;
  // Re-apply login/register stubs on re-runs (titles already localized)
  if (isLoginOrRegisterStub(rel) && /location\.(?:replace|href)|http-equiv=["']refresh["']/i.test(html)) {
    return true;
  }
  return false;
}

function walkAllHtml(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue;
      walkAllHtml(abs, out);
    } else if (ent.name.endsWith('.html')) {
      out.push(abs);
    }
  }
  return out;
}

function fixRedirectStubs() {
  const files = walkAllHtml(FRONTEND);
  let n = 0;
  for (const abs of files) {
    let html = fs.readFileSync(abs, 'utf8');
    const rel = path.relative(FRONTEND, abs).replace(/\\/g, '/');
    if (!looksLikeRedirectStub(html, rel)) continue;

    const locale = detectLocaleFromPath(`frontend/${rel}`);
    let kind = 'kb';
    let pageTitle;
    let description;
    let extra = '';

    if (/\/login\/login\.html$|^login\/login\.html$/.test(rel)) {
      kind = 'login';
      pageTitle = REDIRECT_LOGIN[locale] || REDIRECT_LOGIN.en;
      // Prefer auth title + ellipsis when we have a uniquified auth title
      if (AUTH_TITLE[locale]) pageTitle = AUTH_TITLE[locale].replace(/\s*—\s*Serpmonn$/i, '…');
      description = redirectDesc('login', locale);
    } else if (/\/register\/register\.html$|^register\/register\.html$/.test(rel)) {
      kind = 'register';
      pageTitle = REDIRECT_REGISTER[locale] || REDIRECT_REGISTER.en;
      description = redirectDesc('register', locale);
    } else if (/\/games\//.test(rel) || /^games\//.test(rel)) {
      kind = 'game';
      const segs = rel.split('/');
      const gi = segs.indexOf('games');
      const gameName = gi >= 0 ? segs[gi + 1] || 'game' : 'game';
      extra = gameName;
      pageTitle = `${REDIRECT_GAME[locale] || REDIRECT_GAME.en} · ${gameName}`;
      description = redirectDesc('game', locale, gameName);
    } else if (/\/news\//.test(rel) || /^news\//.test(rel)) {
      kind = 'kb';
      const base = path.basename(rel, '.html');
      const hint = base === 'news' ? 'index' : base.replace(/-/g, ' ');
      pageTitle = `${REDIRECT_KB[locale] || REDIRECT_KB.en} · ${hint}`;
      description = redirectDesc('kb', locale, hint);
    } else {
      pageTitle = `${REDIRECT_KB[locale] || REDIRECT_KB.en} · ${path.basename(rel, '.html')}`;
      description = redirectDesc('kb', locale, path.basename(rel, '.html'));
    }

    const next = setTitleDesc(html, {
      title: pageTitle,
      description,
      robots: 'noindex, follow',
    });
    if (next !== html) {
      n++;
      stats.redirects++;
      stats.htmlFiles++;
      if (!DRY) fs.writeFileSync(abs, next, 'utf8');
    }
  }
  console.log(`  redirects: ${n} stubs patched`);
}

// ---------------------------------------------------------------------------
// 7) Forgot / reset differentiation
// ---------------------------------------------------------------------------

const FORGOT_RESET = {
  kk: {
    forgot: {
      title: 'Құпия сөзді қалпына келтіруді сұрау',
      description: 'Serpmonn аккаунтының құпия сөзін қалпына келтіру сілтемесін сұраңыз.',
    },
    reset: {
      title: 'Жаңа құпия сөз орнату',
      description: 'Serpmonn аккаунты үшін жаңа құпия сөз орнатыңыз.',
    },
  },
  uz: {
    forgot: {
      title: 'Parolni tiklash so‘rovi',
      description: 'Serpmonn hisobi uchun parolni tiklash havolasini so‘rang.',
    },
    reset: {
      title: 'Yangi parol o‘rnatish',
      description: 'Serpmonn hisobingiz uchun yangi parol o‘rnating.',
    },
  },
  sv: {
    forgot: {
      title: 'Begär återställning av lösenord',
      description: 'Begär en länk för att återställa lösenordet till ditt Serpmonn-konto.',
    },
    reset: {
      title: 'Ange nytt lösenord',
      description: 'Ange ett nytt lösenord för ditt Serpmonn-konto.',
    },
  },
  fil: {
    forgot: {
      title: 'Humiling ng password recovery',
      description: 'Humiling ng link para ma-recover ang password ng iyong Serpmonn account.',
    },
    reset: {
      title: 'Magtakda ng bagong password',
      description: 'Magtakda ng bagong password para sa iyong Serpmonn account.',
    },
  },
};

function fixForgotReset() {
  const forgotPack = readJson('forgot.json');
  const resetPack = readJson('reset.json');
  let touchedF = false;
  let touchedR = false;
  for (const [loc, tr] of Object.entries(FORGOT_RESET)) {
    if (forgotPack?.json[loc]?.forgot) {
      const f = forgotPack.json[loc].forgot;
      touchedF |= setIf(f, 'pageTitle', tr.forgot.title);
      if ('ogTitle' in f) touchedF |= setIf(f, 'ogTitle', `${tr.forgot.title} — ${brand(loc)}`);
      if ('ogDescription' in f) touchedF |= setIf(f, 'ogDescription', tr.forgot.description);
      if ('twitterTitle' in f)
        touchedF |= setIf(f, 'twitterTitle', `${tr.forgot.title} — ${brand(loc)}`);
      if ('mainTitle' in f) touchedF |= setIf(f, 'mainTitle', tr.forgot.title);
      patchHtmlTree(loc, ['login', 'forgot', 'forgot.html'], {
        title: tr.forgot.title,
        description: tr.forgot.description,
      });
    }
    if (resetPack?.json[loc]?.reset) {
      const r = resetPack.json[loc].reset;
      touchedR |= setIf(r, 'pageTitle', tr.reset.title);
      if ('ogTitle' in r) touchedR |= setIf(r, 'ogTitle', `${tr.reset.title} — ${brand(loc)}`);
      if ('ogDescription' in r) touchedR |= setIf(r, 'ogDescription', tr.reset.description);
      if ('twitterTitle' in r)
        touchedR |= setIf(r, 'twitterTitle', `${tr.reset.title} — ${brand(loc)}`);
      if ('mainTitle' in r) touchedR |= setIf(r, 'mainTitle', tr.reset.title);
      patchHtmlTree(loc, ['login', 'forgot', 'reset', 'reset.html'], {
        title: tr.reset.title,
        description: tr.reset.description,
      });
    }
  }
  if (touchedF && forgotPack) writeJson(forgotPack.path, forgotPack.json);
  if (touchedR && resetPack) writeJson(resetPack.path, resetPack.json);
  console.log('  forgot/reset: differentiated');
}

// ---------------------------------------------------------------------------
// Verify remaining-dups style collisions
// ---------------------------------------------------------------------------

function extractTitleDesc(html) {
  const titleM = html.match(/<title>([\s\S]*?)<\/title>/i);
  const descM = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  return {
    title: titleM ? titleM[1].trim() : null,
    desc: descM ? descM[1].trim() : null,
  };
}

function verifyRemaining() {
  if (!fs.existsSync(REMAINING)) {
    console.log('verify: /tmp/remaining-dups.json not found — skip');
    return;
  }
  const data = JSON.parse(fs.readFileSync(REMAINING, 'utf8'));
  const urlSet = new Set();
  for (const g of [...(data.titles || []), ...(data.descs || [])]) {
    for (const u of g.urls || []) urlSet.add(u);
  }

  const byTitle = new Map();
  const byDesc = new Map();
  for (const rel of urlSet) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const { title, desc } = extractTitleDesc(fs.readFileSync(abs, 'utf8'));
    if (title) {
      if (!byTitle.has(title)) byTitle.set(title, []);
      byTitle.get(title).push(rel);
    }
    if (desc) {
      if (!byDesc.has(desc)) byDesc.set(desc, []);
      byDesc.get(desc).push(rel);
    }
  }

  const titleCollisions = [...byTitle.entries()].filter(([, urls]) => urls.length > 1);
  const descCollisions = [...byDesc.entries()].filter(([, urls]) => urls.length > 1);

  console.log(
    `verify (prior URL set): title collisions=${titleCollisions.length}, desc collisions=${descCollisions.length}`
  );
  for (const [val, urls] of titleCollisions.slice(0, 15)) {
    console.log(`  TITLE dup (${urls.length}): ${val.slice(0, 70)}`);
    console.log(`    ${urls.join(' | ')}`);
  }
  for (const [val, urls] of descCollisions.slice(0, 10)) {
    console.log(`  DESC dup (${urls.length}): ${val.slice(0, 70)}`);
    console.log(`    ${urls.join(' | ')}`);
  }
  return { titleCollisions, descCollisions };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`fix-meta-dups-proper ${DRY ? '(dry-run) ' : ''}…`);

fixProfile();
fixAuth();
fixUtmBuilder();
fixPasswordGenerator();
fixFuelCalculator();
fixUnitConverter();
fixToolsIndex();
fixEcoFootprintCalculator();
fixInstallGuide();
fixTariffs();
fixDonate();
fixPromo();
fixAboutProject();
fixImprove();
fixOffer();
fixWebTechTrends();
fixWebDevGuide();
fixSnippetLimits();
fixSuccess();
fixForgotReset();
fixRedirectStubs();

console.log('—');
console.log(`json files written: ${stats.jsonFiles}`);
console.log(`json fields touched: ${stats.jsonFields}`);
console.log(`html files changed: ${stats.htmlFiles}`);
console.log(`redirect stubs changed: ${stats.redirects}`);
console.log(`files changed (html+json): ${stats.htmlFiles + stats.jsonFiles}`);

verifyRemaining();
console.log(DRY ? 'dry-run done (no writes)' : 'done');
