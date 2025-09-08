#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// SEO titles and descriptions for different languages
const seoData = {
  // Main index pages
  index: {
    ar: {
      title: "Serpmonn - محرك بحث مجاني، أخبار وألعاب مصغرة",
      description: "اكتشف Serpmonn - محرك البحث المجاني الخاص بك مع آخر الأخبار والألعاب المصغرة والأدوات المفيدة. سريع وبسيط وخالي من الإعلانات."
    },
    az: {
      title: "Serpmonn - Pulsuz Axtarış Mühərriki, Xəbərlər və Mini Oyunlar",
      description: "Serpmonn-u kəşf edin - pulsuz axtarış mühərrikiniz, son xəbərlər, mini oyunlar və faydalı alətlərlə. Sürətli, sadə və reklamsız."
    },
    be: {
      title: "Serpmonn - Бясплатная пошукавая сістэма, навіны і міні-гульні",
      description: "Адкрыйце Serpmonn - вашу бясплатную пошукавую сістэму з апошнімі навінамі, міні-гульнямі і карыснымі інструментамі. Хутка, проста і без рэкламы."
    },
    bg: {
      title: "Serpmonn - Безплатна търсачка, новини и мини игри",
      description: "Открийте Serpmonn - вашата безплатна търсачка с последни новини, мини игри и полезни инструменти. Бързо, просто и без реклами."
    },
    bn: {
      title: "Serpmonn - বিনামূল্যের সার্চ ইঞ্জিন, খবর ও মিনি গেম",
      description: "Serpmonn আবিষ্কার করুন - সর্বশেষ খবর, মিনি গেম এবং দরকারী সরঞ্জাম সহ আপনার বিনামূল্যের সার্চ ইঞ্জিন। দ্রুত, সহজ এবং বিজ্ঞাপন-মুক্ত।"
    },
    cs: {
      title: "Serpmonn - Bezplatný vyhledávač, zprávy a mini hry",
      description: "Objevte Serpmonn - váš bezplatný vyhledávač s nejnovějšími zprávami, mini hrami a užitečnými nástroji. Rychlý, jednoduchý a bez reklam."
    },
    da: {
      title: "Serpmonn - Gratis søgemaskine, nyheder og mini-spil",
      description: "Opdag Serpmonn - din gratis søgemaskine med seneste nyheder, mini-spil og nyttige værktøjer. Hurtig, enkel og reklamefri."
    },
    de: {
      title: "Serpmonn - Kostenlose Suchmaschine, Nachrichten & Mini-Spiele",
      description: "Entdecken Sie Serpmonn - Ihre kostenlose Suchmaschine mit aktuellen Nachrichten, Mini-Spielen und nützlichen Tools. Schnell, einfach und werbefrei."
    },
    el: {
      title: "Serpmonn - Δωρεάν μηχανή αναζήτησης, ειδήσεις και μίνι παιχνίδια",
      description: "Ανακαλύψτε το Serpmonn - τη δωρεάν μηχανή αναζήτησής σας με τις τελευταίες ειδήσεις, μίνι παιχνίδια και χρήσιμα εργαλεία. Γρήγορο, απλό και χωρίς διαφημίσεις."
    },
    en: {
      title: "Serpmonn - Free Search Engine, News & Mini Games Platform",
      description: "Discover Serpmonn - your free search engine with latest news, mini-games, and useful tools. Fast, simple, and ad-free search experience for everyone."
    },
    es: {
      title: "Serpmonn - Motor de Búsqueda Gratuito, Noticias & Mini-Juegos",
      description: "Descubre Serpmonn - tu motor de búsqueda gratuito con noticias, mini-juegos y herramientas útiles. Rápido, simple y sin publicidad."
    },
    'es-419': {
      title: "Serpmonn - Motor de Búsqueda Gratuito, Noticias & Mini-Juegos",
      description: "Descubre Serpmonn - tu motor de búsqueda gratuito con noticias, mini-juegos y herramientas útiles. Rápido, simple y sin publicidad."
    },
    fa: {
      title: "Serpmonn - موتور جستجوی رایگان، اخبار و بازی‌های کوچک",
      description: "Serpmonn را کشف کنید - موتور جستجوی رایگان شما با آخرین اخبار، بازی‌های کوچک و ابزارهای مفید. سریع، ساده و بدون تبلیغات."
    },
    fi: {
      title: "Serpmonn - Ilmainen hakukone, uutiset ja mini-pelit",
      description: "Löydä Serpmonn - ilmainen hakukoneesi uusimmilla uutisilla, mini-peleillä ja hyödyllisillä työkaluilla. Nopea, yksinkertainen ja mainokseton."
    },
    fr: {
      title: "Serpmonn - Moteur de Recherche Gratuit, Actualités & Mini-Jeux",
      description: "Découvrez Serpmonn - votre moteur de recherche gratuit avec actualités, mini-jeux et outils utiles. Rapide, simple et sans publicité."
    },
    he: {
      title: "Serpmonn - מנוע חיפוש חינמי, חדשות ומשחקים קטנים",
      description: "גלה את Serpmonn - מנוע החיפוש החינמי שלך עם חדשות אחרונות, משחקים קטנים וכלים שימושיים. מהיר, פשוט וללא פרסומות."
    },
    hi: {
      title: "Serpmonn - मुफ्त सर्च इंजन, समाचार और मिनी गेम्स",
      description: "Serpmonn की खोज करें - नवीनतम समाचार, मिनी गेम्स और उपयोगी उपकरणों के साथ आपका मुफ्त सर्च इंजन। तेज़, सरल और विज्ञापन-मुक्त।"
    },
    hu: {
      title: "Serpmonn - Ingyenes keresőmotor, hírek és mini játékok",
      description: "Fedezze fel a Serpmonn-t - ingyenes keresőmotorját a legfrissebb hírekkel, mini játékokkal és hasznos eszközökkel. Gyors, egyszerű és reklámmentes."
    },
    hy: {
      title: "Serpmonn - Անվճար որոնիչ, նորություններ և մինի խաղեր",
      description: "Բացահայտեք Serpmonn-ը - ձեր անվճար որոնիչը վերջին նորություններով, մինի խաղերով և օգտակար գործիքներով: Արագ, պարզ և առանց գովազդի:"
    },
    id: {
      title: "Serpmonn - Mesin Pencari Gratis, Berita & Mini Game",
      description: "Temukan Serpmonn - mesin pencari gratis Anda dengan berita terbaru, mini game, dan alat bermanfaat. Cepat, sederhana, dan bebas iklan."
    },
    it: {
      title: "Serpmonn - Motore di Ricerca Gratuito, Notizie & Mini Giochi",
      description: "Scopri Serpmonn - il tuo motore di ricerca gratuito con ultime notizie, mini giochi e strumenti utili. Veloce, semplice e senza pubblicità."
    },
    ja: {
      title: "Serpmonn - 無料検索エンジン、ニュース＆ミニゲーム",
      description: "Serpmonnを発見 - 最新ニュース、ミニゲーム、便利なツールを備えた無料検索エンジン。高速、シンプル、広告なし。"
    },
    ka: {
      title: "Serpmonn - უფასო საძიებო სისტემა, სიახლეები და მინი თამაშები",
      description: "აღმოაჩინეთ Serpmonn - თქვენი უფასო საძიებო სისტემა უახლესი სიახლეებით, მინი თამაშებით და სასარგებლო ინსტრუმენტებით. სწრაფი, მარტივი და რეკლამების გარეშე."
    },
    kk: {
      title: "Serpmonn - Тегін іздеу жүйесі, жаңалықтар және мини ойындар",
      description: "Serpmonn-ды ашыңыз - соңғы жаңалықтар, мини ойындар және пайдалы құралдармен толық тегін іздеу жүйеңіз. Жылдам, қарапайым және жарнамасыз."
    },
    ko: {
      title: "Serpmonn - 무료 검색 엔진, 뉴스 및 미니 게임",
      description: "Serpmonn을 발견하세요 - 최신 뉴스, 미니 게임, 유용한 도구가 포함된 무료 검색 엔진. 빠르고, 간단하며, 광고 없는 경험."
    },
    ms: {
      title: "Serpmonn - Enjin Carian Percuma, Berita & Permainan Mini",
      description: "Temui Serpmonn - enjin carian percuma anda dengan berita terkini, permainan mini dan alat berguna. Pantas, mudah dan bebas iklan."
    },
    nb: {
      title: "Serpmonn - Gratis søkemotor, nyheter og mini-spill",
      description: "Oppdag Serpmonn - din gratis søkemotor med siste nyheter, mini-spill og nyttige verktøy. Rask, enkel og reklamefri."
    },
    nl: {
      title: "Serpmonn - Gratis zoekmachine, nieuws en mini-spellen",
      description: "Ontdek Serpmonn - uw gratis zoekmachine met laatste nieuws, mini-spellen en handige tools. Snel, eenvoudig en advertentievrij."
    },
    pl: {
      title: "Serpmonn - Darmowa wyszukiwarka, wiadomości i mini gry",
      description: "Odkryj Serpmonn - darmową wyszukiwarkę z najnowszymi wiadomościami, mini grami i przydatnymi narzędziami. Szybka, prosta i bez reklam."
    },
    'pt-br': {
      title: "Serpmonn - Motor de Busca Gratuito, Notícias e Mini Jogos",
      description: "Descubra o Serpmonn - seu motor de busca gratuito com últimas notícias, mini jogos e ferramentas úteis. Rápido, simples e sem anúncios."
    },
    'pt-pt': {
      title: "Serpmonn - Motor de Busca Gratuito, Notícias e Mini Jogos",
      description: "Descubra o Serpmonn - o seu motor de busca gratuito com últimas notícias, mini jogos e ferramentas úteis. Rápido, simples e sem anúncios."
    },
    ro: {
      title: "Serpmonn - Motor de căutare gratuit, știri și mini jocuri",
      description: "Descoperă Serpmonn - motorul tău de căutare gratuit cu ultimele știri, mini jocuri și instrumente utile. Rapid, simplu și fără reclame."
    },
    ru: {
      title: "Serpmonn - Бесплатная поисковая система, новости и мини-игры",
      description: "Откройте Serpmonn - вашу бесплатную поисковую систему с последними новостями, мини-играми и полезными инструментами. Быстро, просто и без рекламы."
    },
    sr: {
      title: "Serpmonn - Besplatna pretraživačka, vesti i mini igre",
      description: "Otkrijte Serpmonn - vašu besplatnu pretraživačku sa najnovijim vestima, mini igrama i korisnim alatkama. Brzo, jednostavno i bez reklama."
    },
    sv: {
      title: "Serpmonn - Gratis sökmotor, nyheter och mini-spel",
      description: "Upptäck Serpmonn - din gratis sökmotor med senaste nyheter, mini-spel och användbara verktyg. Snabb, enkel och reklamfri."
    },
    th: {
      title: "Serpmonn - เครื่องมือค้นหาฟรี ข่าวสารและเกมขนาดเล็ก",
      description: "ค้นพบ Serpmonn - เครื่องมือค้นหาฟรีของคุณพร้อมข่าวสารล่าสุด เกมขนาดเล็กและเครื่องมือที่มีประโยชน์ เร็ว ง่ายและไม่มีโฆษณา"
    },
    tr: {
      title: "Serpmonn - Ücretsiz Arama Motoru, Haberler ve Mini Oyunlar",
      description: "Serpmonn'u keşfedin - en son haberler, mini oyunlar ve yararlı araçlarla ücretsiz arama motorunuz. Hızlı, basit ve reklamsız."
    },
    ur: {
      title: "Serpmonn - مفت سرچ انجن، خبریں اور منی گیمز",
      description: "Serpmonn دریافت کریں - تازہ ترین خبروں، منی گیمز اور مفید ٹولز کے ساتھ آپ کا مفت سرچ انجن۔ تیز، آسان اور اشتہارات سے پاک۔"
    },
    uz: {
      title: "Serpmonn - Bepul qidiruv tizimi, yangiliklar va mini o'yinlar",
      description: "Serpmonn-ni kashf qiling - so'nggi yangiliklar, mini o'yinlar va foydali vositalar bilan bepul qidiruv tizimingiz. Tez, oddiy va reklamasiz."
    },
    vi: {
      title: "Serpmonn - Công cụ tìm kiếm miễn phí, tin tức và mini game",
      description: "Khám phá Serpmonn - công cụ tìm kiếm miễn phí của bạn với tin tức mới nhất, mini game và công cụ hữu ích. Nhanh, đơn giản và không quảng cáo."
    },
    'zh-cn': {
      title: "Serpmonn - 免费搜索引擎、新闻和迷你游戏",
      description: "发现 Serpmonn - 您的免费搜索引擎，提供最新新闻、迷你游戏和实用工具。快速、简单、无广告。"
    }
  },
  
  // Ad-info pages
  adInfo: {
    en: {
      title: "Advertising & Affiliate Information - Serpmonn Platform",
      description: "Learn about advertising opportunities and affiliate partnerships on Serpmonn. Discover how to promote your business on our search platform."
    },
    de: {
      title: "Werbung & Partner-Informationen - Serpmonn Plattform",
      description: "Erfahren Sie mehr über Werbemöglichkeiten und Partnerprogramme auf Serpmonn. Entdecken Sie, wie Sie Ihr Unternehmen auf unserer Suchplattform bewerben können."
    },
    fr: {
      title: "Information Publicitaire et Partenariat - Plateforme Serpmonn",
      description: "Découvrez les opportunités publicitaires et les partenariats d'affiliation sur Serpmonn. Apprenez comment promouvoir votre entreprise sur notre plateforme de recherche."
    },
    es: {
      title: "Información Publicitaria y de Afiliados - Plataforma Serpmonn",
      description: "Conozca las oportunidades publicitarias y las asociaciones de afiliados en Serpmonn. Descubra cómo promocionar su negocio en nuestra plataforma de búsqueda."
    },
    ru: {
      title: "Реклама и партнерская информация - платформа Serpmonn",
      description: "Узнайте о рекламных возможностях и партнерских программах на Serpmonn. Откройте для себя, как продвигать свой бизнес на нашей поисковой платформе."
    }
  },
  
  // Tools pages
  tools: {
    en: {
      title: "Free Online Tools - UTM Builder, Password Generator & More | Serpmonn",
      description: "Access free online tools on Serpmonn: UTM builder for marketing campaigns, secure password generator, word counter, and ecological footprint calculator. All tools are free to use."
    },
    de: {
      title: "Kostenlose Online-Tools - UTM Builder, Passwort-Generator & mehr | Serpmonn",
      description: "Zugang zu kostenlosen Online-Tools auf Serpmonn: UTM Builder für Marketing-Kampagnen, sicherer Passwort-Generator, Wortzähler und ökologischer Fußabdruck-Rechner. Alle Tools sind kostenlos."
    },
    fr: {
      title: "Outils en ligne gratuits - Générateur UTM, Générateur de mots de passe | Serpmonn",
      description: "Accédez aux outils en ligne gratuits sur Serpmonn: générateur UTM pour campagnes marketing, générateur de mots de passe sécurisé, compteur de mots et calculateur d'empreinte écologique. Tous les outils sont gratuits."
    },
    es: {
      title: "Herramientas online gratuitas - Constructor UTM, Generador de contraseñas | Serpmonn",
      description: "Accede a herramientas online gratuitas en Serpmonn: constructor UTM para campañas de marketing, generador de contraseñas seguro, contador de palabras y calculadora de huella ecológica. Todas las herramientas son gratuitas."
    },
    ru: {
      title: "Бесплатные онлайн-инструменты - UTM Builder, генератор паролей | Serpmonn",
      description: "Доступ к бесплатным онлайн-инструментам на Serpmonn: UTM Builder для маркетинговых кампаний, безопасный генератор паролей, счетчик слов и калькулятор экологического следа. Все инструменты бесплатны."
    }
  }
};

function updateFile(filePath, title, description) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update title
    content = content.replace(/<title>.*?<\/title>/s, `<title>${title}</title>`);
    
    // Update or add meta description
    if (content.includes('<meta name="description"')) {
      content = content.replace(/<meta name="description" content=".*?"\s*\/?>/s, `<meta name="description" content="${description}">`);
    } else {
      // Add meta description after title
      content = content.replace(/(<title>.*?<\/title>)/s, `$1\n    <meta name="description" content="${description}">`);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function main() {
  const frontendDir = path.join(process.cwd(), 'frontend');
  
  if (!fs.existsSync(frontendDir)) {
    console.error('❌ Frontend directory not found');
    process.exit(1);
  }
  
  const languages = fs.readdirSync(frontendDir).filter(item => {
    const itemPath = path.join(frontendDir, item);
    return fs.statSync(itemPath).isDirectory() && 
           !['ad-info', 'about-project', 'scripts', 'styles', 'images', 'dev'].includes(item);
  });
  
  console.log(`🌍 Found ${languages.length} languages to update`);
  
  let updatedCount = 0;
  
  // Update index pages
  for (const lang of languages) {
    const indexPath = path.join(frontendDir, lang, 'index.html');
    if (fs.existsSync(indexPath)) {
      const seo = seoData.index[lang] || seoData.index.en;
      updateFile(indexPath, seo.title, seo.description);
      updatedCount++;
    }
    
    // Update ad-info pages
    const adInfoPath = path.join(frontendDir, lang, 'ad-info', 'ad-info.html');
    if (fs.existsSync(adInfoPath)) {
      const seo = seoData.adInfo[lang] || seoData.adInfo.en;
      updateFile(adInfoPath, seo.title, seo.description);
      updatedCount++;
    }
    
    // Update tools pages
    const toolsPath = path.join(frontendDir, lang, 'tools', 'index.html');
    if (fs.existsSync(toolsPath)) {
      const seo = seoData.tools[lang] || seoData.tools.en;
      updateFile(toolsPath, seo.title, seo.description);
      updatedCount++;
    }
  }
  
  console.log(`\n🎉 Successfully updated ${updatedCount} files`);
}

main();