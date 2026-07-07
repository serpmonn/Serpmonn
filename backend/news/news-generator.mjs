import dotenv from 'dotenv';
import { fetchSearxViaCurl } from '../utils/fetchSearxViaCurl.js';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

// ─── Темы по локалям ────────────────────────────────────────────────────────
// Формат: locale → массив тем { key, label, query }
// Для неизвестных локалей используется 'en'
const LOCALE_TOPICS = {
  'ar':     [
    { key: 'world',    label: 'العالم',      query: 'أخبار العالم اليوم' },
    { key: 'tech',     label: 'تكنولوجيا',   query: 'أخبار التكنولوجيا اليوم' },
    { key: 'ai',       label: 'ذكاء اصطناعي',query: 'أخبار الذكاء الاصطناعي اليوم' },
    { key: 'science',  label: 'علوم',        query: 'اكتشافات علمية اليوم' },
    { key: 'space',    label: 'فضاء',        query: 'أخبار الفضاء اليوم' },
    { key: 'business', label: 'أعمال',       query: 'أخبار الاقتصاد اليوم' },
    { key: 'games',    label: 'ألعاب',       query: 'أخبار ألعاب الفيديو اليوم' },
    { key: 'health',   label: 'صحة',         query: 'أخبار الصحة والطب اليوم' },
    { key: 'sports',   label: 'رياضة',       query: 'أخبار الرياضة اليوم' },
  ],
  'az':     [
    { key: 'world',    label: 'Dünya',       query: 'dünya xəbərləri bu gün' },
    { key: 'tech',     label: 'Texnologiya', query: 'texnologiya xəbərləri bu gün' },
    { key: 'ai',       label: 'Süni İntellekt', query: 'süni intellekt xəbərləri bu gün' },
    { key: 'science',  label: 'Elm',         query: 'elm xəbərləri bu gün' },
    { key: 'space',    label: 'Kosmос',      query: 'kosmos xəbərləri bu gün' },
    { key: 'business', label: 'İqtisadiyyat',query: 'iqtisadiyyat xəbərləri bu gün' },
    { key: 'games',    label: 'Oyunlar',     query: 'video oyun xəbərləri bu gün' },
    { key: 'health',   label: 'Sağlamlıq',  query: 'sağlamlıq xəbərləri bu gün' },
    { key: 'sports',   label: 'İdman',       query: 'idman xəbərləri bu gün' },
  ],
  'be':     [
    { key: 'world',    label: 'Свет',        query: 'навіны свету сёння' },
    { key: 'tech',     label: 'Тэхналогіі',  query: 'тэхналогіі навіны сёння' },
    { key: 'ai',       label: 'ШІ',          query: 'штучны інтэлект навіны сёння' },
    { key: 'science',  label: 'Навука',      query: 'навука навіны сёння' },
    { key: 'space',    label: 'Космас',      query: 'космас навіны сёння' },
    { key: 'business', label: 'Эканоміка',   query: 'эканоміка навіны сёння' },
    { key: 'games',    label: 'Гульні',      query: 'відэагульні навіны сёння' },
    { key: 'health',   label: 'Здароўе',     query: 'здароўе навіны сёння' },
    { key: 'sports',   label: 'Спорт',       query: 'спорт навіны сёння' },
  ],
  'bg':     [
    { key: 'world',    label: 'Свят',        query: 'световни новини днес' },
    { key: 'tech',     label: 'Технологии',  query: 'технологии новини днес' },
    { key: 'ai',       label: 'ИИ',          query: 'изкуствен интелект новини днес' },
    { key: 'science',  label: 'Наука',       query: 'наука новини днес' },
    { key: 'space',    label: 'Космос',      query: 'космос новини днес' },
    { key: 'business', label: 'Бизнес',      query: 'бизнес новини днес' },
    { key: 'games',    label: 'Игри',        query: 'видео игри новини днес' },
    { key: 'health',   label: 'Здраве',      query: 'здраве новини днес' },
    { key: 'sports',   label: 'Спорт',       query: 'спорт новини днес' },
  ],
  'bn':     [
    { key: 'world',    label: 'বিশ্ব',        query: 'আজকের বিশ্ব সংবাদ' },
    { key: 'tech',     label: 'প্রযুক্তি',    query: 'প্রযুক্তি সংবাদ আজ' },
    { key: 'ai',       label: 'কৃত্রিম বুদ্ধিমত্তা', query: 'কৃত্রিম বুদ্ধিমত্তা সংবাদ আজ' },
    { key: 'science',  label: 'বিজ্ঞান',      query: 'বিজ্ঞান সংবাদ আজ' },
    { key: 'space',    label: 'মহাকাশ',       query: 'মহাকাশ সংবাদ আজ' },
    { key: 'business', label: 'ব্যবসা',       query: 'অর্থনীতি সংবাদ আজ' },
    { key: 'games',    label: 'গেমিং',        query: 'ভিডিও গেম সংবাদ আজ' },
    { key: 'health',   label: 'স্বাস্থ্য',    query: 'স্বাস্থ্য সংবাদ আজ' },
    { key: 'sports',   label: 'খেলাধুলা',    query: 'খেলাধুলার সংবাদ আজ' },
  ],
  'cs':     [
    { key: 'world',    label: 'Svět',        query: 'světové zprávy dnes' },
    { key: 'tech',     label: 'Technologie', query: 'technologické zprávy dnes' },
    { key: 'ai',       label: 'AI',          query: 'umělá inteligence zprávy dnes' },
    { key: 'science',  label: 'Věda',        query: 'vědecké zprávy dnes' },
    { key: 'space',    label: 'Vesmír',      query: 'vesmírné zprávy dnes' },
    { key: 'business', label: 'Byznys',      query: 'byznys zprávy dnes' },
    { key: 'games',    label: 'Hry',         query: 'herní zprávy dnes' },
    { key: 'health',   label: 'Zdraví',      query: 'zdravotní zprávy dnes' },
    { key: 'sports',   label: 'Sport',       query: 'sportovní zprávy dnes' },
  ],
  'da':     [
    { key: 'world',    label: 'Verden',      query: 'verdensnyheder i dag' },
    { key: 'tech',     label: 'Teknologi',   query: 'teknologinyheder i dag' },
    { key: 'ai',       label: 'AI',          query: 'kunstig intelligens nyheder i dag' },
    { key: 'science',  label: 'Videnskab',   query: 'videnskabsnyheder i dag' },
    { key: 'space',    label: 'Rummet',      query: 'rumnyheder i dag' },
    { key: 'business', label: 'Erhverv',     query: 'erhvervsnyheder i dag' },
    { key: 'games',    label: 'Spil',        query: 'spilnyheder i dag' },
    { key: 'health',   label: 'Sundhed',     query: 'sundhedsnyheder i dag' },
    { key: 'sports',   label: 'Sport',       query: 'sportnyheder i dag' },
  ],
  'de':     [
    { key: 'world',    label: 'Welt',        query: 'Weltnachrichten heute' },
    { key: 'tech',     label: 'Technologie', query: 'Technologienachrichten heute' },
    { key: 'ai',       label: 'KI',          query: 'Künstliche Intelligenz Nachrichten heute' },
    { key: 'science',  label: 'Wissenschaft',query: 'Wissenschaftsnachrichten heute' },
    { key: 'space',    label: 'Weltraum',    query: 'Weltraum Nachrichten heute' },
    { key: 'business', label: 'Wirtschaft',  query: 'Wirtschaftsnachrichten heute' },
    { key: 'games',    label: 'Gaming',      query: 'Gaming Nachrichten heute' },
    { key: 'health',   label: 'Gesundheit',  query: 'Gesundheit Nachrichten heute' },
    { key: 'sports',   label: 'Sport',       query: 'Sportnachrichten heute' },
  ],
  'dv':     [
    { key: 'world',    label: 'ދުނިޔެ',      query: 'world news today' },
    { key: 'tech',     label: 'ޓެކްނޮލޮޖީ', query: 'technology news today' },
    { key: 'ai',       label: 'AI',          query: 'artificial intelligence news today' },
    { key: 'science',  label: 'ސައިންސް',    query: 'science news today' },
    { key: 'space',    label: 'ޖައްވު',      query: 'space news today' },
    { key: 'business', label: 'ވިޔަފާރި',   query: 'business news today' },
    { key: 'games',    label: 'ގޭމިން',      query: 'gaming news today' },
    { key: 'health',   label: 'ސިއްހަތު',   query: 'health news today' },
    { key: 'sports',   label: 'ކުޅިވަރު',    query: 'sports news today' },
  ],
  'el':     [
    { key: 'world',    label: 'Κόσμος',     query: 'παγκόσμιες ειδήσεις σήμερα' },
    { key: 'tech',     label: 'Τεχνολογία', query: 'ειδήσεις τεχνολογίας σήμερα' },
    { key: 'ai',       label: 'ΤΝ',         query: 'τεχνητή νοημοσύνη ειδήσεις σήμερα' },
    { key: 'science',  label: 'Επιστήμη',   query: 'επιστημονικές ειδήσεις σήμερα' },
    { key: 'space',    label: 'Διάστημα',   query: 'ειδήσεις διαστήματος σήμερα' },
    { key: 'business', label: 'Οικονομία',  query: 'οικονομικές ειδήσεις σήμερα' },
    { key: 'games',    label: 'Gaming',     query: 'ειδήσεις gaming σήμερα' },
    { key: 'health',   label: 'Υγεία',      query: 'ειδήσεις υγείας σήμερα' },
    { key: 'sports',   label: 'Αθλητισμός', query: 'αθλητικές ειδήσεις σήμερα' },
  ],
  'en':     [
    { key: 'world',    label: 'World',       query: 'world news today' },
    { key: 'tech',     label: 'Technology',  query: 'technology news today' },
    { key: 'ai',       label: 'AI',          query: 'artificial intelligence news today' },
    { key: 'science',  label: 'Science',     query: 'science discoveries news today' },
    { key: 'space',    label: 'Space',       query: 'space exploration news today' },
    { key: 'business', label: 'Business',    query: 'global economy business news today' },
    { key: 'games',    label: 'Gaming',      query: 'gaming news today' },
    { key: 'health',   label: 'Health',      query: 'health medicine news today' },
    { key: 'sports',   label: 'Sports',      query: 'sports news today' },
  ],
  'es':     [
    { key: 'world',    label: 'Mundo',       query: 'noticias del mundo hoy' },
    { key: 'tech',     label: 'Tecnología',  query: 'noticias de tecnología hoy' },
    { key: 'ai',       label: 'IA',          query: 'noticias inteligencia artificial hoy' },
    { key: 'science',  label: 'Ciencia',     query: 'noticias de ciencia hoy' },
    { key: 'space',    label: 'Espacio',     query: 'noticias espacio hoy' },
    { key: 'business', label: 'Economía',    query: 'noticias económicas hoy' },
    { key: 'games',    label: 'Gaming',      query: 'noticias gaming hoy' },
    { key: 'health',   label: 'Salud',       query: 'noticias salud hoy' },
    { key: 'sports',   label: 'Deportes',    query: 'noticias deportivas hoy' },
  ],
  'es-419': [
    { key: 'world',    label: 'Mundo',       query: 'noticias del mundo hoy latinoamerica' },
    { key: 'tech',     label: 'Tecnología',  query: 'noticias tecnología hoy' },
    { key: 'ai',       label: 'IA',          query: 'noticias inteligencia artificial hoy' },
    { key: 'science',  label: 'Ciencia',     query: 'noticias ciencia hoy' },
    { key: 'space',    label: 'Espacio',     query: 'noticias espacio hoy latinoamerica' },
    { key: 'business', label: 'Economía',    query: 'economía latinoamerica noticias hoy' },
    { key: 'games',    label: 'Gaming',      query: 'noticias gaming hoy' },
    { key: 'health',   label: 'Salud',       query: 'noticias salud hoy' },
    { key: 'sports',   label: 'Deportes',    query: 'noticias deportes hoy latinoamerica' },
  ],
  'fa':     [
    { key: 'world',    label: 'جهان',        query: 'اخبار جهان امروز' },
    { key: 'tech',     label: 'فناوری',      query: 'اخبار فناوری امروز' },
    { key: 'ai',       label: 'هوش مصنوعی', query: 'اخبار هوش مصنوعی امروز' },
    { key: 'science',  label: 'علم',         query: 'اخبار علمی امروز' },
    { key: 'space',    label: 'فضا',         query: 'اخبار فضا امروز' },
    { key: 'business', label: 'اقتصاد',      query: 'اخبار اقتصادی امروز' },
    { key: 'games',    label: 'بازی',        query: 'اخبار بازی های ویدیویی امروز' },
    { key: 'health',   label: 'سلامت',       query: 'اخبار سلامت امروز' },
    { key: 'sports',   label: 'ورزش',        query: 'اخبار ورزشی امروز' },
  ],
  'fi':     [
    { key: 'world',    label: 'Maailma',     query: 'maailmanuutiset tänään' },
    { key: 'tech',     label: 'Teknologia',  query: 'teknologiauutiset tänään' },
    { key: 'ai',       label: 'Tekoäly',     query: 'tekoäly uutiset tänään' },
    { key: 'science',  label: 'Tiede',       query: 'tiedeuutiset tänään' },
    { key: 'space',    label: 'Avaruus',     query: 'avaruusuutiset tänään' },
    { key: 'business', label: 'Talous',      query: 'talousuutiset tänään' },
    { key: 'games',    label: 'Pelit',       query: 'peliuutiset tänään' },
    { key: 'health',   label: 'Terveys',     query: 'terveysuutiset tänään' },
    { key: 'sports',   label: 'Urheilu',     query: 'urheiluurutiset tänään' },
  ],
  'fil':    [
    { key: 'world',    label: 'Mundo',       query: 'balita sa mundo ngayon' },
    { key: 'tech',     label: 'Teknolohiya', query: 'balita sa teknolohiya ngayon' },
    { key: 'ai',       label: 'AI',          query: 'artificial intelligence news today' },
    { key: 'science',  label: 'Agham',       query: 'balita sa agham ngayon' },
    { key: 'space',    label: 'Kalawakan',   query: 'space news today' },
    { key: 'business', label: 'Negosyo',     query: 'balita sa ekonomiya ngayon' },
    { key: 'games',    label: 'Gaming',      query: 'gaming news today' },
    { key: 'health',   label: 'Kalusugan',   query: 'balita sa kalusugan ngayon' },
    { key: 'sports',   label: 'Palakasan',   query: 'balita sa palakasan ngayon' },
  ],
  'fr':     [
    { key: 'world',    label: 'Monde',       query: 'actualités mondiales aujourd\'hui' },
    { key: 'tech',     label: 'Technologie', query: 'actualités technologiques aujourd\'hui' },
    { key: 'ai',       label: 'IA',          query: 'actualités intelligence artificielle aujourd\'hui' },
    { key: 'science',  label: 'Science',     query: 'actualités scientifiques aujourd\'hui' },
    { key: 'space',    label: 'Espace',      query: 'actualités espace aujourd\'hui' },
    { key: 'business', label: 'Économie',    query: 'actualités économiques aujourd\'hui' },
    { key: 'games',    label: 'Gaming',      query: 'actualités gaming aujourd\'hui' },
    { key: 'health',   label: 'Santé',       query: 'actualités santé aujourd\'hui' },
    { key: 'sports',   label: 'Sport',       query: 'actualités sportives aujourd\'hui' },
  ],
  'he':     [
    { key: 'world',    label: 'עולם',        query: 'חדשות עולם היום' },
    { key: 'tech',     label: 'טכנולוגיה',   query: 'חדשות טכנולוגיה היום' },
    { key: 'ai',       label: 'בינה מלאכותית', query: 'חדשות בינה מלאכותית היום' },
    { key: 'science',  label: 'מדע',         query: 'חדשות מדע היום' },
    { key: 'space',    label: 'חלל',         query: 'חדשות חלל היום' },
    { key: 'business', label: 'כלכלה',       query: 'חדשות כלכלה היום' },
    { key: 'games',    label: 'גיימינג',     query: 'חדשות גיימינג היום' },
    { key: 'health',   label: 'בריאות',      query: 'חדשות בריאות היום' },
    { key: 'sports',   label: 'ספורט',       query: 'חדשות ספורט היום' },
  ],
  'hi':     [
    { key: 'world',    label: 'विश्व',       query: 'आज की विश्व समाचार' },
    { key: 'tech',     label: 'तकनीक',       query: 'तकनीक समाचार आज' },
    { key: 'ai',       label: 'एआई',         query: 'कृत्रिम बुद्धिमत्ता समाचार आज' },
    { key: 'science',  label: 'विज्ञान',     query: 'विज्ञान समाचार आज' },
    { key: 'space',    label: 'अंतरिक्ष',    query: 'अंतरिक्ष समाचार आज' },
    { key: 'business', label: 'व्यापार',     query: 'व्यापार समाचार आज' },
    { key: 'games',    label: 'गेमिंग',      query: 'गेमिंग समाचार आज' },
    { key: 'health',   label: 'स्वास्थ्य',   query: 'स्वास्थ्य समाचार आज' },
    { key: 'sports',   label: 'खेल',         query: 'खेल समाचार आज' },
  ],
  'hu':     [
    { key: 'world',    label: 'Világ',       query: 'világ hírek ma' },
    { key: 'tech',     label: 'Technológia', query: 'technológiai hírek ma' },
    { key: 'ai',       label: 'MI',          query: 'mesterséges intelligencia hírek ma' },
    { key: 'science',  label: 'Tudomány',    query: 'tudományos hírek ma' },
    { key: 'space',    label: 'Világűr',     query: 'világűr hírek ma' },
    { key: 'business', label: 'Gazdaság',    query: 'gazdasági hírek ma' },
    { key: 'games',    label: 'Gaming',      query: 'gaming hírek ma' },
    { key: 'health',   label: 'Egészség',    query: 'egészség hírek ma' },
    { key: 'sports',   label: 'Sport',       query: 'sportok hírek ma' },
  ],
  'hy':     [
    { key: 'world',    label: 'Աշխարհ',     query: 'աշխարհի նորություններ այսօր' },
    { key: 'tech',     label: 'Տեխնոլոգիա', query: 'տեխնոլոգիական նորություններ' },
    { key: 'ai',       label: 'ԱԲ',         query: 'արհեստական բանականություն նորություններ' },
    { key: 'science',  label: 'Գիտություն', query: 'գիտական նորություններ այսօր' },
    { key: 'space',    label: 'Տիեզերք',    query: 'տիեզերք նորություններ այսօր' },
    { key: 'business', label: 'Տնտեսություն',query: 'տնտեսական նորություններ' },
    { key: 'games',    label: 'Խաղեր',      query: 'video games news today' },
    { key: 'health',   label: 'Առողջություն',query: 'առողջություն նորություններ' },
    { key: 'sports',   label: 'Սպορտ',      query: 'սպորտային նորություններ' },
  ],
  'id':     [
    { key: 'world',    label: 'Dunia',       query: 'berita dunia hari ini' },
    { key: 'tech',     label: 'Teknologi',   query: 'berita teknologi hari ini' },
    { key: 'ai',       label: 'AI',          query: 'berita kecerdasan buatan hari ini' },
    { key: 'science',  label: 'Sains',       query: 'berita sains hari ini' },
    { key: 'space',    label: 'Luar Angkasa',query: 'berita luar angkasa hari ini' },
    { key: 'business', label: 'Ekonomi',     query: 'berita ekonomi hari ini' },
    { key: 'games',    label: 'Gaming',      query: 'berita gaming hari ini' },
    { key: 'health',   label: 'Kesehatan',   query: 'berita kesehatan hari ini' },
    { key: 'sports',   label: 'Olahraga',    query: 'berita olahraga hari ini' },
  ],
  'it':     [
    { key: 'world',    label: 'Mondo',       query: 'notizie dal mondo oggi' },
    { key: 'tech',     label: 'Tecnologia',  query: 'notizie tecnologia oggi' },
    { key: 'ai',       label: 'IA',          query: 'notizie intelligenza artificiale oggi' },
    { key: 'science',  label: 'Scienza',     query: 'notizie scienza oggi' },
    { key: 'space',    label: 'Spazio',      query: 'notizie spazio oggi' },
    { key: 'business', label: 'Economia',    query: 'notizie economia oggi' },
    { key: 'games',    label: 'Gaming',      query: 'notizie gaming oggi' },
    { key: 'health',   label: 'Salute',      query: 'notizie salute oggi' },
    { key: 'sports',   label: 'Sport',       query: 'notizie sportive oggi' },
  ],
  'ja':     [
    { key: 'world',    label: '世界',        query: '今日の世界ニュース' },
    { key: 'tech',     label: 'テクノロジー',query: '今日のテクノロジーニュース' },
    { key: 'ai',       label: 'AI',          query: '今日のAIニュース' },
    { key: 'science',  label: '科学',        query: '今日の科学ニュース' },
    { key: 'space',    label: '宇宙',        query: '今日の宇宙ニュース' },
    { key: 'business', label: '経済',        query: '今日の経済ニュース' },
    { key: 'games',    label: 'ゲーム',      query: '今日のゲームニュース' },
    { key: 'health',   label: '健康',        query: '今日の健康ニュース' },
    { key: 'sports',   label: 'スポーツ',    query: '今日のスポーツニュース' },
  ],
  'ka':     [
    { key: 'world',    label: 'სამყარო',    query: 'მსოფლიო ახალი ამბები დღეს' },
    { key: 'tech',     label: 'ტექნოლოგია', query: 'ტექნოლოგიის ახალი ამბები' },
    { key: 'ai',       label: 'ხელოვ. ინტ.',query: 'ხელოვნური ინტელექტი ახალი ამბები' },
    { key: 'science',  label: 'მეცნიერება', query: 'მეცნიერების ახალი ამბები' },
    { key: 'space',    label: 'კოსმოსი',    query: 'კოსმოსის ახალი ამბები' },
    { key: 'business', label: 'ეკონომიკა',  query: 'ეკონომიკის ახალი ამბები' },
    { key: 'games',    label: 'თამაშები',   query: 'video games news today' },
    { key: 'health',   label: 'ჯანმრთელობა',query: 'ჯანმრთელობის ახალი ამბები' },
    { key: 'sports',   label: 'სპორტი',     query: 'სპორტის ახალი ამბები' },
  ],
  'kk':     [
    { key: 'world',    label: 'Әлем',       query: 'бүгінгі әлем жаңалықтары' },
    { key: 'tech',     label: 'Технология', query: 'технология жаңалықтары бүгін' },
    { key: 'ai',       label: 'ЖИ',         query: 'жасанды интеллект жаңалықтары бүгін' },
    { key: 'science',  label: 'Ғылым',      query: 'ғылым жаңалықтары бүгін' },
    { key: 'space',    label: 'Ғарыш',      query: 'ғарыш жаңалықтары бүгін' },
    { key: 'business', label: 'Экономика',  query: 'экономика жаңалықтары бүгін' },
    { key: 'games',    label: 'Ойындар',    query: 'gaming news today' },
    { key: 'health',   label: 'Денсаулық',  query: 'денсаулық жаңалықтары бүгін' },
    { key: 'sports',   label: 'Спорт',      query: 'спорт жаңалықтары бүгін' },
  ],
  'ko':     [
    { key: 'world',    label: '세계',        query: '오늘의 세계 뉴스' },
    { key: 'tech',     label: '기술',        query: '오늘의 기술 뉴스' },
    { key: 'ai',       label: 'AI',          query: '오늘의 인공지능 뉴스' },
    { key: 'science',  label: '과학',        query: '오늘의 과학 뉴스' },
    { key: 'space',    label: '우주',        query: '오늘의 우주 뉴스' },
    { key: 'business', label: '경제',        query: '오늘의 경제 뉴스' },
    { key: 'games',    label: '게임',        query: '오늘의 게임 뉴스' },
    { key: 'health',   label: '건강',        query: '오늘의 건강 뉴스' },
    { key: 'sports',   label: '스포츠',      query: '오늘의 스포츠 뉴스' },
  ],
  'ks':     [
    { key: 'world',    label: 'دُنیا',       query: 'world news today' },
    { key: 'tech',     label: 'ٹیکنالوجی',  query: 'technology news today' },
    { key: 'ai',       label: 'AI',          query: 'artificial intelligence news today' },
    { key: 'science',  label: 'سائنس',      query: 'science news today' },
    { key: 'space',    label: 'خلا',         query: 'space news today' },
    { key: 'business', label: 'کاروبار',    query: 'business news today' },
    { key: 'games',    label: 'گیمنگ',      query: 'gaming news today' },
    { key: 'health',   label: 'صحت',        query: 'health news today' },
    { key: 'sports',   label: 'کھیل',       query: 'sports news today' },
  ],
  'ku-arab':[
    { key: 'world',    label: 'جیهان',      query: 'world news today kurdish' },
    { key: 'tech',     label: 'تەکنەلۆجیا', query: 'technology news today' },
    { key: 'ai',       label: 'AI',          query: 'artificial intelligence news today' },
    { key: 'science',  label: 'زانست',      query: 'science news today' },
    { key: 'space',    label: 'ئەستێرەناسی',query: 'space news today' },
    { key: 'business', label: 'ئابووری',    query: 'business news today' },
    { key: 'games',    label: 'یاری',       query: 'gaming news today' },
    { key: 'health',   label: 'تەندروستی',  query: 'health news today' },
    { key: 'sports',   label: 'وەرزش',      query: 'sports news today' },
  ],
  'ms':     [
    { key: 'world',    label: 'Dunia',       query: 'berita dunia hari ini' },
    { key: 'tech',     label: 'Teknologi',   query: 'berita teknologi hari ini' },
    { key: 'ai',       label: 'AI',          query: 'berita kecerdasan buatan hari ini' },
    { key: 'science',  label: 'Sains',       query: 'berita sains hari ini' },
    { key: 'space',    label: 'Angkasa',     query: 'berita angkasa hari ini' },
    { key: 'business', label: 'Ekonomi',     query: 'berita ekonomi hari ini' },
    { key: 'games',    label: 'Gaming',      query: 'gaming news today' },
    { key: 'health',   label: 'Kesihatan',   query: 'berita kesihatan hari ini' },
    { key: 'sports',   label: 'Sukan',       query: 'berita sukan hari ini' },
  ],
  'nb':     [
    { key: 'world',    label: 'Verden',      query: 'verdensnyheter i dag' },
    { key: 'tech',     label: 'Teknologi',   query: 'teknologinyheter i dag' },
    { key: 'ai',       label: 'KI',          query: 'kunstig intelligens nyheter i dag' },
    { key: 'science',  label: 'Vitenskap',   query: 'vitenskapsnyheter i dag' },
    { key: 'space',    label: 'Rommet',      query: 'romnyheter i dag' },
    { key: 'business', label: 'Økonomi',     query: 'økonominyheter i dag' },
    { key: 'games',    label: 'Spill',       query: 'spillnyheter i dag' },
    { key: 'health',   label: 'Helse',       query: 'helsenyheter i dag' },
    { key: 'sports',   label: 'Sport',       query: 'sportnyheter i dag' },
  ],
  'nl':     [
    { key: 'world',    label: 'Wereld',      query: 'wereldnieuws vandaag' },
    { key: 'tech',     label: 'Technologie', query: 'technologienieuws vandaag' },
    { key: 'ai',       label: 'AI',          query: 'kunstmatige intelligentie nieuws vandaag' },
    { key: 'science',  label: 'Wetenschap',  query: 'wetenschapsnieuws vandaag' },
    { key: 'space',    label: 'Ruimte',      query: 'ruimtenieuws vandaag' },
    { key: 'business', label: 'Economie',    query: 'economisch nieuws vandaag' },
    { key: 'games',    label: 'Gaming',      query: 'gaming nieuws vandaag' },
    { key: 'health',   label: 'Gezondheid',  query: 'gezondheidsnieuws vandaag' },
    { key: 'sports',   label: 'Sport',       query: 'sportnieuws vandaag' },
  ],
  'pl':     [
    { key: 'world',    label: 'Świat',       query: 'wiadomości ze świata dziś' },
    { key: 'tech',     label: 'Technologia', query: 'wiadomości technologiczne dziś' },
    { key: 'ai',       label: 'AI',          query: 'sztuczna inteligencja wiadomości dziś' },
    { key: 'science',  label: 'Nauka',       query: 'wiadomości naukowe dziś' },
    { key: 'space',    label: 'Kosmos',      query: 'wiadomości kosmiczne dziś' },
    { key: 'business', label: 'Gospodarka',  query: 'wiadomości gospodarcze dziś' },
    { key: 'games',    label: 'Gry',         query: 'wiadomości gaming dziś' },
    { key: 'health',   label: 'Zdrowie',     query: 'wiadomości zdrowotne dziś' },
    { key: 'sports',   label: 'Sport',       query: 'wiadomości sportowe dziś' },
  ],
  'ps':     [
    { key: 'world',    label: 'نړی',         query: 'د نړۍ خبرونه نن' },
    { key: 'tech',     label: 'ټیکنالوژي',  query: 'technology news today' },
    { key: 'ai',       label: 'AI',          query: 'artificial intelligence news today' },
    { key: 'science',  label: 'ساینس',      query: 'science news today' },
    { key: 'space',    label: 'فضا',         query: 'space news today' },
    { key: 'business', label: 'اقتصاد',     query: 'business news today' },
    { key: 'games',    label: 'لوبې',       query: 'gaming news today' },
    { key: 'health',   label: 'روغتیا',     query: 'health news today' },
    { key: 'sports',   label: 'سپورت',      query: 'sports news today' },
  ],
  'pt-br':  [
    { key: 'world',    label: 'Mundo',       query: 'notícias do mundo hoje brasil' },
    { key: 'tech',     label: 'Tecnologia',  query: 'notícias de tecnologia hoje' },
    { key: 'ai',       label: 'IA',          query: 'notícias inteligência artificial hoje' },
    { key: 'science',  label: 'Ciência',     query: 'notícias de ciência hoje' },
    { key: 'space',    label: 'Espaço',      query: 'notícias espaço hoje' },
    { key: 'business', label: 'Economia',    query: 'notícias econômicas hoje' },
    { key: 'games',    label: 'Games',       query: 'notícias games hoje' },
    { key: 'health',   label: 'Saúde',       query: 'notícias saúde hoje' },
    { key: 'sports',   label: 'Esportes',    query: 'notícias esportivas hoje brasil' },
  ],
  'pt-pt':  [
    { key: 'world',    label: 'Mundo',       query: 'notícias do mundo hoje portugal' },
    { key: 'tech',     label: 'Tecnologia',  query: 'notícias tecnologia hoje' },
    { key: 'ai',       label: 'IA',          query: 'notícias inteligência artificial hoje' },
    { key: 'science',  label: 'Ciência',     query: 'notícias ciência hoje' },
    { key: 'space',    label: 'Espaço',      query: 'notícias espaço hoje' },
    { key: 'business', label: 'Economia',    query: 'notícias economia hoje portugal' },
    { key: 'games',    label: 'Jogos',       query: 'notícias jogos hoje' },
    { key: 'health',   label: 'Saúde',       query: 'notícias saúde hoje' },
    { key: 'sports',   label: 'Desporto',    query: 'notícias desporto hoje' },
  ],
  'ro':     [
    { key: 'world',    label: 'Lume',        query: 'știri internaționale azi' },
    { key: 'tech',     label: 'Tehnologie',  query: 'știri tehnologie azi' },
    { key: 'ai',       label: 'AI',          query: 'știri inteligență artificială azi' },
    { key: 'science',  label: 'Știință',     query: 'știri știință azi' },
    { key: 'space',    label: 'Spațiu',      query: 'știri spațiu azi' },
    { key: 'business', label: 'Economie',    query: 'știri economie azi' },
    { key: 'games',    label: 'Gaming',      query: 'știri gaming azi' },
    { key: 'health',   label: 'Sănătate',    query: 'știri sănătate azi' },
    { key: 'sports',   label: 'Sport',       query: 'știri sport azi' },
  ],
  'ru':     [
    { key: 'world',    label: 'Мир',         query: 'мировые новости сегодня' },
    { key: 'tech',     label: 'Технологии',  query: 'технологии новости сегодня' },
    { key: 'ai',       label: 'ИИ',          query: 'искусственный интеллект новости сегодня' },
    { key: 'science',  label: 'Наука',       query: 'научные открытия новости сегодня' },
    { key: 'space',    label: 'Космос',      query: 'космос новости сегодня' },
    { key: 'business', label: 'Бизнес',      query: 'экономика бизнес новости сегодня' },
    { key: 'games',    label: 'Игры',        query: 'игровые новости сегодня' },
    { key: 'health',   label: 'Здоровье',    query: 'здоровье медицина новости сегодня' },
    { key: 'sports',   label: 'Спорт',       query: 'спорт новости сегодня' },
  ],
  'sd':     [
    { key: 'world',    label: 'دنيا',        query: 'world news today' },
    { key: 'tech',     label: 'ٽيڪنالاجي',  query: 'technology news today' },
    { key: 'ai',       label: 'AI',          query: 'artificial intelligence news today' },
    { key: 'science',  label: 'سائنس',      query: 'science news today' },
    { key: 'space',    label: 'خلا',         query: 'space news today' },
    { key: 'business', label: 'واپار',      query: 'business news today' },
    { key: 'games',    label: 'گيمنگ',      query: 'gaming news today' },
    { key: 'health',   label: 'صحت',        query: 'health news today' },
    { key: 'sports',   label: 'رياضت',      query: 'sports news today' },
  ],
  'sr':     [
    { key: 'world',    label: 'Свет',        query: 'светске вести данас' },
    { key: 'tech',     label: 'Технологија', query: 'технолошке вести данас' },
    { key: 'ai',       label: 'ВИ',          query: 'вештачка интелигенција вести данас' },
    { key: 'science',  label: 'Наука',       query: 'научне вести данас' },
    { key: 'space',    label: 'Свемир',      query: 'свемирске вести данас' },
    { key: 'business', label: 'Економија',   query: 'економске вести данас' },
    { key: 'games',    label: 'Гејминг',     query: 'gaming news today' },
    { key: 'health',   label: 'Здравље',     query: 'здравствене вести данас' },
    { key: 'sports',   label: 'Спорт',       query: 'спортске вести данас' },
  ],
  'sv':     [
    { key: 'world',    label: 'Världen',     query: 'världsnyheter idag' },
    { key: 'tech',     label: 'Teknologi',   query: 'teknologinyheter idag' },
    { key: 'ai',       label: 'AI',          query: 'artificiell intelligens nyheter idag' },
    { key: 'science',  label: 'Vetenskap',   query: 'vetenskapsnyheter idag' },
    { key: 'space',    label: 'Rymden',      query: 'rymden nyheter idag' },
    { key: 'business', label: 'Ekonomi',     query: 'ekonominyheter idag' },
    { key: 'games',    label: 'Gaming',      query: 'gaming nyheter idag' },
    { key: 'health',   label: 'Hälsa',       query: 'hälsonyheter idag' },
    { key: 'sports',   label: 'Sport',       query: 'sportnyheter idag' },
  ],
  'th':     [
    { key: 'world',    label: 'โลก',         query: 'ข่าวโลกวันนี้' },
    { key: 'tech',     label: 'เทคโนโลยี',   query: 'ข่าวเทคโนโลยีวันนี้' },
    { key: 'ai',       label: 'AI',          query: 'ข่าวปัญญาประดิษฐ์วันนี้' },
    { key: 'science',  label: 'วิทยาศาสตร์', query: 'ข่าววิทยาศาสตร์วันนี้' },
    { key: 'space',    label: 'อวกาศ',       query: 'ข่าวอวกาศวันนี้' },
    { key: 'business', label: 'เศรษฐกิจ',   query: 'ข่าวเศรษฐกิจวันนี้' },
    { key: 'games',    label: 'เกม',         query: 'ข่าวเกมวันนี้' },
    { key: 'health',   label: 'สุขภาพ',      query: 'ข่าวสุขภาพวันนี้' },
    { key: 'sports',   label: 'กีฬา',        query: 'ข่าวกีฬาวันนี้' },
  ],
  'tr':     [
    { key: 'world',    label: 'Dünya',       query: 'dünya haberleri bugün' },
    { key: 'tech',     label: 'Teknoloji',   query: 'teknoloji haberleri bugün' },
    { key: 'ai',       label: 'YZ',          query: 'yapay zeka haberleri bugün' },
    { key: 'science',  label: 'Bilim',       query: 'bilim haberleri bugün' },
    { key: 'space',    label: 'Uzay',        query: 'uzay haberleri bugün' },
    { key: 'business', label: 'Ekonomi',     query: 'ekonomi haberleri bugün' },
    { key: 'games',    label: 'Oyunlar',     query: 'oyun haberleri bugün' },
    { key: 'health',   label: 'Sağlık',      query: 'sağlık haberleri bugün' },
    { key: 'sports',   label: 'Spor',        query: 'spor haberleri bugün' },
  ],
  'ug':     [
    { key: 'world',    label: 'دۇنيا',       query: 'world news today uyghur' },
    { key: 'tech',     label: 'تېخنىكا',     query: 'technology news today' },
    { key: 'ai',       label: 'AI',          query: 'artificial intelligence news today' },
    { key: 'science',  label: 'ئىلىم',       query: 'science news today' },
    { key: 'space',    label: 'ئاسمان',      query: 'space news today' },
    { key: 'business', label: 'ئىقتىساد',    query: 'business news today' },
    { key: 'games',    label: 'ئويۇن',       query: 'gaming news today' },
    { key: 'health',   label: 'ساغلامقى',    query: 'health news today' },
    { key: 'sports',   label: 'ئىدمان',      query: 'sports news today' },
  ],
  'ur':     [
    { key: 'world',    label: 'دنیا',        query: 'آج کی عالمی خبریں' },
    { key: 'tech',     label: 'ٹیکنالوجی',  query: 'ٹیکنالوجی کی خبریں آج' },
    { key: 'ai',       label: 'مصنوعی ذہانت',query: 'مصنوعی ذہانت کی خبریں آج' },
    { key: 'science',  label: 'سائنس',      query: 'سائنس کی خبریں آج' },
    { key: 'space',    label: 'خلا',         query: 'خلا کی خبریں آج' },
    { key: 'business', label: 'معیشت',      query: 'معیشت کی خبریں آج' },
    { key: 'games',    label: 'گیمنگ',      query: 'gaming news today' },
    { key: 'health',   label: 'صحت',        query: 'صحت کی خبریں آج' },
    { key: 'sports',   label: 'کھیل',       query: 'کھیل کی خبریں آج' },
  ],
  'uz':     [
    { key: 'world',    label: 'Dunyo',       query: 'bugungi dunyo yangiliklari' },
    { key: 'tech',     label: 'Texnologiya', query: 'texnologiya yangiliklari bugun' },
    { key: 'ai',       label: 'SZ',          query: 'sun\'iy intellekt yangiliklari bugun' },
    { key: 'science',  label: 'Fan',         query: 'fan yangiliklari bugun' },
    { key: 'space',    label: 'Kosmоs',      query: 'kosmos yangiliklari bugun' },
    { key: 'business', label: 'Iqtisodiyot', query: 'iqtisodiyot yangiliklari bugun' },
    { key: 'games',    label: 'O\'yinlar',   query: 'gaming news today' },
    { key: 'health',   label: 'Salomatlik',  query: 'salomatlik yangiliklari bugun' },
    { key: 'sports',   label: 'Sport',       query: 'sport yangiliklari bugun' },
  ],
  'vi':     [
    { key: 'world',    label: 'Thế giới',    query: 'tin tức thế giới hôm nay' },
    { key: 'tech',     label: 'Công nghệ',   query: 'tin tức công nghệ hôm nay' },
    { key: 'ai',       label: 'AI',          query: 'tin tức trí tuệ nhân tạo hôm nay' },
    { key: 'science',  label: 'Khoa học',    query: 'tin tức khoa học hôm nay' },
    { key: 'space',    label: 'Vũ trụ',      query: 'tin tức vũ trụ hôm nay' },
    { key: 'business', label: 'Kinh tế',     query: 'tin tức kinh tế hôm nay' },
    { key: 'games',    label: 'Gaming',      query: 'tin tức gaming hôm nay' },
    { key: 'health',   label: 'Sức khỏe',   query: 'tin tức sức khỏe hôm nay' },
    { key: 'sports',   label: 'Thể thao',    query: 'tin tức thể thao hôm nay' },
  ],
  'yi':     [
    { key: 'world',    label: 'וועלט',       query: 'world news today' },
    { key: 'tech',     label: 'טעכנאלאגיע', query: 'technology news today' },
    { key: 'ai',       label: 'AI',          query: 'artificial intelligence news today' },
    { key: 'science',  label: 'וויסנשאַפט', query: 'science news today' },
    { key: 'space',    label: 'וועלטראַום',  query: 'space news today' },
    { key: 'business', label: 'ביזנעס',     query: 'business news today' },
    { key: 'games',    label: 'גיימינג',    query: 'gaming news today' },
    { key: 'health',   label: 'געזונט',     query: 'health news today' },
    { key: 'sports',   label: 'ספאָרט',      query: 'sports news today' },
  ],
  'zh-cn':  [
    { key: 'world',    label: '世界',        query: '今日世界新闻' },
    { key: 'tech',     label: '科技',        query: '今日科技新闻' },
    { key: 'ai',       label: '人工智能',    query: '今日人工智能新闻' },
    { key: 'science',  label: '科学',        query: '今日科学新闻' },
    { key: 'space',    label: '航天',        query: '今日航天新闻' },
    { key: 'business', label: '经济',        query: '今日经济新闻' },
    { key: 'games',    label: '游戏',        query: '今日游戏新闻' },
    { key: 'health',   label: '健康',        query: '今日健康新闻' },
    { key: 'sports',   label: '体育',        query: '今日体育新闻' },
  ],
};

// ─── Ленивый кэш ─────────────────────────────────────────────────────────────
// locale → { items: [...], updatedAt: timestamp }
const localeCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 час

// ─── Публичные хелперы ───────────────────────────────────────────────────────

export function getTopicsForLocale(locale) {
  return LOCALE_TOPICS[locale] ?? LOCALE_TOPICS['en'];
}

/**
 * Возвращает новости для локали.
 * Если кэш свежий — отдаёт мгновенно.
 * Если устарел или отсутствует — делает запрос в SearXNG и кэширует.
 */
export async function getNewsForLocale(locale, topicFilter = null) {
  const safeLocale = LOCALE_TOPICS[locale] ? locale : 'en';
  const topics = LOCALE_TOPICS[safeLocale];

  const cached = localeCache.get(safeLocale);
  const isStale = !cached || Date.now() - cached.updatedAt > CACHE_TTL_MS;

  if (isStale) {
    // Обновляем кэш — один запрос на первую тему + остальные параллельно
    const results = await fetchAllTopics(safeLocale, topics);
    localeCache.set(safeLocale, { items: results, updatedAt: Date.now() });
    console.log(`[News] Кэш обновлён для локали "${safeLocale}": ${results.length} новостей`);
  }

  const items = localeCache.get(safeLocale).items;

  if (topicFilter) {
    return items.filter(item => item.topicKey === topicFilter);
  }
  return items;
}

export function getCacheUpdatedAt(locale) {
  const safeLocale = LOCALE_TOPICS[locale] ? locale : 'en';
  return localeCache.get(safeLocale)?.updatedAt ?? null;
}

// ─── Внутренние функции ──────────────────────────────────────────────────────

async function fetchAllTopics(locale, topics) {
  const results = [];

  // Параллельно запрашиваем все темы (SearXNG держит параллельные запросы нормально)
  const settled = await Promise.allSettled(
    topics.map(topic => fetchOneTopic(locale, topic))
  );

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled' && outcome.value.length) {
      results.push(...outcome.value);
    }
  }

  return results;
}

async function fetchOneTopic(locale, topic) {
  try {
    const data = await fetchSearxViaCurl(topic.query, 'news');
    const raw = (data.results || []).slice(0, 6);

    return raw
      .filter(r => r.url && r.title)
      .map(r => ({
        id:        `${locale}-${topic.key}-${encodeURIComponent(r.url).slice(0, 40)}`,
        topicKey:  topic.key,
        topicLabel:topic.label,
        title:     r.title,
        snippet:   r.content || r.summary || '',
        url:       r.url,
        img:       r.img_src || null,
        source:    safeHostname(r.url),
        publishedAt: r.publishedDate || null,
      }));
  } catch (e) {
    console.warn(`[News] Ошибка темы "${topic.key}" для локали "${locale}": ${e.message}`);
    return [];
  }
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
