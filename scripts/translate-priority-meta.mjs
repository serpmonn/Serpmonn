#!/usr/bin/env node
/**
 * Replace locale-suffix hacks with real translated title/description meta
 * for the worst Yandex duplicate offenders, and strip leftover " (locale)" suffixes
 * from already-localized strings across games/tools/kb.
 *
 * Usage: node scripts/translate-priority-meta.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'assembly/site/_data');
const FRONTEND = path.join(ROOT, 'frontend');
const DRY = process.argv.includes('--dry-run');

const LOCALES = [
  'ru','ar','az','be','bg','bn','cs','da','de','dv','el','en','es','es-419','fa','fi','fil','fr',
  'he','hi','hu','hy','id','it','ja','ka','kk','ko','ks','ku-arab','ms','nb','nl','pl','ps',
  'pt-br','pt-pt','ro','sd','sr','sv','th','tr','ug','ur','uz','vi','yi','zh-cn',
];

const BRAND = {
  ru: 'Серпмонн',
  default: 'Serpmonn',
};

function brand(loc) {
  return loc === 'ru' ? BRAND.ru : BRAND.default;
}

/** Strip trailing " (locale)" / " (xx)" we previously appended */
function stripSuffix(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\s*\([a-z]{2,3}(?:-[A-Za-z0-9]{2,})?\)\s*$/i, '').trimEnd();
}

// --- Priority translations (title + description) ---
// Keys: tool id. Each locale: { title, description, ogTitle?, ogDescription? }

const BASE64 = {
  en: ['Base64 Converter', 'Encode and decode Base64 online', 'Encode / decode Base64 for text and files'],
  ru: ['Base64 конвертер', 'Кодирование и декодирование Base64 онлайн', 'Кодируйте и декодируйте Base64 для текста и файлов'],
  de: ['Base64-Konverter', 'Base64 online kodieren und dekodieren', 'Base64 für Text und Dateien kodieren/dekodieren'],
  fr: ['Convertisseur Base64', 'Encoder et décoder du Base64 en ligne', 'Encodez / décodez le Base64 pour texte et fichiers'],
  es: ['Convertidor Base64', 'Codifica y decodifica Base64 en línea', 'Codifica / decodifica Base64 para texto y archivos'],
  'es-419': ['Convertidor Base64', 'Codifica y decodifica Base64 en línea', 'Codifica / decodifica Base64 para texto y archivos'],
  it: ['Convertitore Base64', 'Codifica e decodifica Base64 online', 'Codifica / decodifica Base64 per testo e file'],
  pt: ['Conversor Base64', 'Codifique e decodifique Base64 online', 'Codifique / decodifique Base64 para texto e arquivos'],
  'pt-br': ['Conversor Base64', 'Codifique e decodifique Base64 online', 'Codifique / decodifique Base64 para texto e arquivos'],
  'pt-pt': ['Conversor Base64', 'Codifique e descodifique Base64 online', 'Codifique / descodifique Base64 para texto e ficheiros'],
  pl: ['Konwerter Base64', 'Koduj i dekoduj Base64 online', 'Kodowanie / dekodowanie Base64 dla tekstu i plików'],
  nl: ['Base64-converter', 'Base64 online coderen en decoderen', 'Base64 coderen/decoderen voor tekst en bestanden'],
  tr: ['Base64 Dönüştürücü', 'Base64’ü çevrimiçi kodla ve çöz', 'Metin ve dosyalar için Base64 kodlama / çözme'],
  uk: null,
  be: ['Канвертар Base64', 'Кадаванне і дэкадаванне Base64 анлайн', 'Кадуйце і дэкадуйце Base64 для тэксту і файлаў'],
  ukrainian_skip: true,
  bg: ['Base64 конвертор', 'Кодиране и декодиране на Base64 онлайн', 'Кодирайте / декодирайте Base64 за текст и файлове'],
  cs: ['Base64 převodník', 'Kódujte a dekódujte Base64 online', 'Kódování / dekódování Base64 pro text a soubory'],
  sk: null,
  da: ['Base64-konverter', 'Kod og afkod Base64 online', 'Kod / afkod Base64 for tekst og filer'],
  nb: ['Base64-konverter', 'Kod og dekod Base64 online', 'Kod / dekod Base64 for tekst og filer'],
  sv: ['Base64-omvandlare', 'Koda och avkoda Base64 online', 'Koda / avkoda Base64 för text och filer'],
  fi: ['Base64-muunnin', 'Koodaa ja pura Base64 verkossa', 'Koodaa / pura Base64 tekstille ja tiedostoille'],
  el: ['Μετατροπέας Base64', 'Κωδικοποίηση και αποκωδικοποίηση Base64 online', 'Κωδικοποίηση / αποκωδικοποίηση Base64 για κείμενο και αρχεία'],
  hu: ['Base64 konverter', 'Base64 kódolás és dekódolás online', 'Base64 kódolás / dekódolás szöveghez és fájlokhoz'],
  ro: ['Convertor Base64', 'Codifică și decodifică Base64 online', 'Codificare / decodificare Base64 pentru text și fișiere'],
  sr: ['Base64 конвертер', 'Кодирајте и декодирајте Base64 онлајн', 'Кодирање / декодирање Base64 за текст и фајлове'],
  hr: null,
  sk_skip: true,
  ar: ['محول Base64', 'ترميز وفك ترميز Base64 عبر الإنترنت', 'ترميز / فك ترميز Base64 للنص والملفات'],
  fa: ['مبدل Base64', 'رمزگذاری و رمزگشایی Base64 آنلاین', 'رمزگذاری / رمزگشایی Base64 برای متن و فایل‌ها'],
  he: ['ממיר Base64', 'קידוד ופענוח Base64 אונליין', 'קידוד / פענוח Base64 לטקסט ולקבצים'],
  hi: ['Base64 कनवर्टर', 'ऑनलाइन Base64 एन्कोड और डिकोड करें', 'टेक्स्ट और फ़ाइलों के लिए Base64 एन्कोड / डिकोड'],
  bn: ['Base64 কনভার্টার', 'অনলাইনে Base64 এনকোড ও ডিকোড করুন', 'টেক্সট ও ফাইলের জন্য Base64 এনকোড / ডিকোড'],
  ur: ['Base64 کنورٹر', 'آن لائن Base64 انکوڈ اور ڈیکوڈ کریں', 'متن اور فائلوں کے لیے Base64 انکوڈ / ڈیکوڈ'],
  ps: ['Base64 بدلونکی', 'Base64 پرلیکه کوډ او دیکوډ کړئ', 'د متن او فایلونو لپاره Base64 کوډ / دیکوډ'],
  sd: ['Base64 ڪنورٽر', 'آنلائن Base64 انڪوڊ ۽ ڊيڪوڊ ڪريو', 'متن ۽ فائلن لاءِ Base64 انڪوڊ / ڊيڪوڊ'],
  ug: ['Base64 ئايلاندۇرغۇچ', 'توردا Base64 كودلاش ۋە يېشىش', 'تېكىست ۋە ھۆججەتلەر ئۈچۈن Base64 كودلاش / يېشىش'],
  'ku-arab': ['گۆڕەری Base64', 'کۆدکردن و کردنەوەی Base64 ئۆنلاین', 'کۆدکردن / کردنەوەی Base64 بۆ دەق و فایل'],
  ks: ['Base64 کنورٹر', 'آن لایِن Base64 انکوڈ تہٕ ڈیکوڈ کریو', 'متن تہٕ فایلن خٲطرٕ Base64 انکوڈ / ڈیکوڈ'],
  dv: ['Base64 ކޮންވަޓަރ', 'Base64 އޮންލައިން އެންކޯޑް އަދި ޑިކޯޑް', 'ޓެކްސްޓާއި ފައިލަށް Base64 އެންކޯޑް / ޑިކޯޑް'],
  az: ['Base64 çevirici', 'Base64-ü onlayn kodla və aç', 'Mətn və fayllar üçün Base64 kodlama / açma'],
  kk: ['Base64 түрлендіргіш', 'Base64-ті онлайн кодтау және декодтау', 'Мәтін мен файлдар үшін Base64 кодтау / декодтау'],
  uz: ['Base64 konverter', 'Base64 ni onlayn kodlash va dekodlash', 'Matn va fayllar uchun Base64 kodlash / dekodlash'],
  ky: null,
  hy: ['Base64 փոխարկիչ', 'Base64 կոդավորում և ապակոդավորում առցանց', 'Base64 կոդավորում / ապակոդավորում տեքստի և ֆայլերի համար'],
  ka: ['Base64 კონვერტერი', 'Base64-ის კოდირება და დეკოდირება ონლაინ', 'Base64 კოდირება / დეკოდირება ტექსტისა და ფაილებისთვის'],
  ja: ['Base64コンバーター', 'Base64をオンラインでエンコード／デコード', 'テキストやファイルのBase64変換'],
  ko: ['Base64 변환기', '온라인에서 Base64 인코딩 및 디코딩', '텍스트와 파일용 Base64 인코딩 / 디코딩'],
  'zh-cn': ['Base64 转换器', '在线编码和解码 Base64', '文本和文件的 Base64 编码 / 解码'],
  th: ['ตัวแปลง Base64', 'เข้ารหัสและถอดรหัส Base64 ออนไลน์', 'เข้ารหัส / ถอดรหัส Base64 สำหรับข้อความและไฟล์'],
  vi: ['Công cụ Base64', 'Mã hóa và giải mã Base64 trực tuyến', 'Mã hóa / giải mã Base64 cho văn bản và tệp'],
  id: ['Konverter Base64', 'Enkode dan dekode Base64 online', 'Enkode / dekode Base64 untuk teks dan file'],
  ms: ['Penukar Base64', 'Kod dan nyahkod Base64 dalam talian', 'Kod / nyahkod Base64 untuk teks dan fail'],
  fil: ['Base64 Converter', 'I-encode at i-decode ang Base64 online', 'I-encode / i-decode ang Base64 para sa text at file'],
  yi: ['Base64 קאַנווערטער', 'קאָדירן און דעקאָדירן Base64 אָנליין', 'Base64 קאָדירן / דעקאָדירן פֿאַר טעקסט און טעקעס'],
};

const JSON_FMT = {
  en: ['JSON Formatter', 'Format, minify and validate JSON online', 'Clean up and validate JSON in your browser'],
  ru: ['JSON форматтер', 'Форматирование, минификация и проверка JSON онлайн', 'Приведите JSON в порядок и проверьте его в браузере'],
  de: ['JSON-Formatierer', 'JSON online formatieren, minifizieren und prüfen', 'JSON im Browser bereinigen und validieren'],
  fr: ['Formateur JSON', 'Formatez, minifiez et validez du JSON en ligne', 'Nettoyez et validez le JSON dans le navigateur'],
  es: ['Formateador JSON', 'Formatea, minifica y valida JSON en línea', 'Limpia y valida JSON en el navegador'],
  'es-419': ['Formateador JSON', 'Formatea, minifica y valida JSON en línea', 'Limpia y valida JSON en el navegador'],
  it: ['Formattatore JSON', 'Formatta, minimizza e convalida JSON online', 'Pulisci e convalida JSON nel browser'],
  'pt-br': ['Formatador JSON', 'Formate, minifique e valide JSON online', 'Organize e valide JSON no navegador'],
  'pt-pt': ['Formatador JSON', 'Formate, minifique e valide JSON online', 'Organize e valide JSON no browser'],
  pl: ['Formatter JSON', 'Formatuj, minifikuj i waliduj JSON online', 'Wyczyść i zweryfikuj JSON w przeglądarce'],
  nl: ['JSON-formatter', 'JSON online formatteren, minificeren en valideren', 'JSON in de browser opschonen en valideren'],
  tr: ['JSON Biçimlendirici', 'JSON’u çevrimiçi biçimlendir, küçült ve doğrula', 'Tarayıcıda JSON’u düzenleyin ve doğrulayın'],
  be: ['JSON фарматавальнік', 'Фарматаванне, мініфікацыя і праверка JSON анлайн', 'Прывядзіце JSON у парадак і праверце ў браўзеры'],
  bg: ['JSON форматер', 'Форматиране, минификация и проверка на JSON онлайн', 'Подредете и проверете JSON в браузъра'],
  cs: ['JSON formátovač', 'Formátujte, minifikujte a ověřujte JSON online', 'Upravte a ověřte JSON v prohlížeči'],
  da: ['JSON-formatter', 'Formatér, minificér og validér JSON online', 'Ryd op i og validér JSON i browseren'],
  nb: ['JSON-formatter', 'Formater, minifiser og valider JSON online', 'Rydd opp i og valider JSON i nettleseren'],
  sv: ['JSON-formaterare', 'Formatera, minifiera och validera JSON online', 'Städa upp och validera JSON i webbläsaren'],
  fi: ['JSON-muotoilija', 'Muotoile, tiivistä ja tarkista JSON verkossa', 'Siivoa ja tarkista JSON selaimessa'],
  el: ['Διαμορφωτής JSON', 'Μορφοποίηση, συμπίεση και έλεγχος JSON online', 'Καθαρίστε και επικυρώστε JSON στο πρόγραμμα περιήγησης'],
  hu: ['JSON formázó', 'JSON formázása, tömörítése és ellenőrzése online', 'JSON tisztítása és ellenőrzése a böngészőben'],
  ro: ['Formatter JSON', 'Formatează, minify și validează JSON online', 'Curăță și validează JSON în browser'],
  sr: ['JSON форматер', 'Форматирајте, минификујте и проверите JSON онлајн', 'Средити и проверити JSON у прегледачу'],
  ar: ['منسق JSON', 'تنسيق وضغط والتحقق من JSON عبر الإنترنت', 'نظّف وتحقق من JSON في المتصفح'],
  fa: ['قالب‌بند JSON', 'قالب‌بندی، فشرده‌سازی و اعتبارسنجی JSON آنلاین', 'JSON را در مرورگر مرتب و بررسی کنید'],
  he: ['מעצב JSON', 'עיצוב, דחיסה ואימות JSON אונליין', 'נקו ואמתו JSON בדפדפן'],
  hi: ['JSON फ़ॉर्मैटर', 'ऑनलाइन JSON फ़ॉर्मैट, मिनीफ़ाय और जाँच करें', 'ब्राउज़र में JSON साफ़ और जाँचें'],
  bn: ['JSON ফরম্যাটার', 'অনলাইনে JSON ফরম্যাট, মিনিফাই ও যাচাই করুন', 'ব্রাউজারে JSON পরিষ্কার ও যাচাই করুন'],
  ur: ['JSON فارمیٹر', 'آن لائن JSON فارمیٹ، منیفائی اور تصدیق کریں', 'براؤزر میں JSON صاف اور تصدیق کریں'],
  ps: ['JSON فارمیټر', 'JSON پرلیکه فارمیټ، کوچنی او تایید کړئ', 'په براوزر کې JSON پاک او تایید کړئ'],
  sd: ['JSON فارميٽر', 'آنلائن JSON فارميٽ، مني فاءِ ۽ تصديق ڪريو', 'برائوزر ۾ JSON صاف ۽ تصديق ڪريو'],
  ug: ['JSON فورماتلىغۇچ', 'توردا JSON فورماتلاش، كىچىكلىتىش ۋە تەكشۈرۈش', 'تور كۆرگۈچتە JSON نى رەتلەڭ ۋە تەكشۈرۈڭ'],
  'ku-arab': ['ڕێکخەری JSON', 'ڕێکخستن، بچووککردن و پشتڕاستکردنەوەی JSON ئۆنلاین', 'JSON لە وێبگەڕدا پاک بکە و پشتڕاست بکە'],
  ks: ['JSON فارمیٹر', 'آن لایِن JSON فارمیٹ، منیفای تہٕ جانچ', 'براوزرَس منز JSON صاف تہٕ جانچ'],
  dv: ['JSON ފޯމެޓަރ', 'JSON އޮންލައިން ފޯމެޓް، މިނިފައި އަދި ޗެކް', 'ބްރައުޒަރގައި JSON ސާފުކޮށް ޗެކްކުރުން'],
  az: ['JSON formatlayıcı', 'JSON-u onlayn formatla, kiçilt və yoxla', 'Brauzerdə JSON-u düzəldin və yoxlayın'],
  kk: ['JSON пішімдеуіш', 'JSON-ды онлайн пішімдеу, кішірейту және тексеру', 'Браузерде JSON-ды реттеп тексеріңіз'],
  uz: ['JSON formatlovchi', 'JSON ni onlayn formatlash, ixchamlashtirish va tekshirish', 'Brauzerda JSON ni tartiblang va tekshiring'],
  hy: ['JSON ձևավորիչ', 'JSON ձևավորում, սեղմում և ստուգում առցանց', 'Կարգավորեք և ստուգեք JSON զննարկիչում'],
  ka: ['JSON ფორმატერი', 'JSON-ის ფორმატირება, მინიფიკაცია და შემოწმება ონლაინ', 'გაასუფთავეთ და შეამოწმეთ JSON ბრაუზერში'],
  ja: ['JSONフォーマッター', 'JSONをオンラインで整形・圧縮・検証', 'ブラウザでJSONを整理して検証'],
  ko: ['JSON 포맷터', '온라인에서 JSON 포맷, 압축 및 검증', '브라우저에서 JSON 정리 및 검증'],
  'zh-cn': ['JSON 格式化工具', '在线格式化、压缩和校验 JSON', '在浏览器中整理并校验 JSON'],
  th: ['ตัวจัดรูปแบบ JSON', 'จัดรูปแบบ ย่อ และตรวจสอบ JSON ออนไลน์', 'จัดระเบียบและตรวจสอบ JSON ในเบราว์เซอร์'],
  vi: ['Công cụ định dạng JSON', 'Định dạng, nén và kiểm tra JSON trực tuyến', 'Dọn và kiểm tra JSON trong trình duyệt'],
  id: ['Pemformat JSON', 'Format, minify, dan validasi JSON online', 'Rapikan dan validasi JSON di browser'],
  ms: ['Pemformat JSON', 'Format, minify dan sahkan JSON dalam talian', 'Kemaskan dan sahkan JSON dalam pelayar'],
  fil: ['JSON Formatter', 'I-format, i-minify, at i-validate ang JSON online', 'Ayusin at i-validate ang JSON sa browser'],
  yi: ['JSON פֿאָרמאַטירער', 'פֿאָרמאַטירן, מיניפֿיצירן און וואַלידירן JSON אָנליין', 'רייניקט און וואַלידירט JSON אין דעם בלעטער'],
};

const FORMAT_CONV = {
  en: ['Image Format Converter', 'Convert images between PNG, JPEG and WEBP online', 'Convert PNG, JPEG and WEBP images in your browser'],
  ru: ['Конвертер форматов изображений', 'Конвертация изображений PNG, JPEG, WEBP онлайн', 'Конвертируйте PNG, JPEG и WEBP прямо в браузере'],
  de: ['Bildformat-Konverter', 'Bilder zwischen PNG, JPEG und WEBP online konvertieren', 'PNG-, JPEG- und WEBP-Bilder im Browser konvertieren'],
  fr: ['Convertisseur de formats d’image', 'Convertissez des images PNG, JPEG et WEBP en ligne', 'Convertissez PNG, JPEG et WEBP dans le navigateur'],
  es: ['Conversor de formatos de imagen', 'Convierte imágenes entre PNG, JPEG y WEBP en línea', 'Convierte PNG, JPEG y WEBP en el navegador'],
  'es-419': ['Conversor de formatos de imagen', 'Convierte imágenes entre PNG, JPEG y WEBP en línea', 'Convierte PNG, JPEG y WEBP en el navegador'],
  it: ['Convertitore di formati immagine', 'Converti immagini tra PNG, JPEG e WEBP online', 'Converti PNG, JPEG e WEBP nel browser'],
  'pt-br': ['Conversor de formatos de imagem', 'Converta imagens entre PNG, JPEG e WEBP online', 'Converta PNG, JPEG e WEBP no navegador'],
  'pt-pt': ['Conversor de formatos de imagem', 'Converta imagens entre PNG, JPEG e WEBP online', 'Converta PNG, JPEG e WEBP no browser'],
  pl: ['Konwerter formatów obrazów', 'Konwertuj obrazy między PNG, JPEG i WEBP online', 'Konwertuj PNG, JPEG i WEBP w przeglądarce'],
  nl: ['Afbeeldingsformaat-converter', 'Converteer afbeeldingen tussen PNG, JPEG en WEBP online', 'Converteer PNG, JPEG en WEBP in de browser'],
  tr: ['Görsel Format Dönüştürücü', 'PNG, JPEG ve WEBP görsellerini çevrimiçi dönüştürün', 'Tarayıcıda PNG, JPEG ve WEBP dönüştürün'],
  be: ['Канвертар фарматаў выяваў', 'Канвертацыя выяваў PNG, JPEG, WEBP анлайн', 'Канвертуйце PNG, JPEG і WEBP у браўзеры'],
  bg: ['Конвертор на формати на изображения', 'Конвертиране на изображения между PNG, JPEG и WEBP онлайн', 'Конвертирайте PNG, JPEG и WEBP в браузъра'],
  cs: ['Převodník formátů obrázků', 'Převádějte obrázky mezi PNG, JPEG a WEBP online', 'Převádějte PNG, JPEG a WEBP v prohlížeči'],
  da: ['Billedformatkonverter', 'Konvertér billeder mellem PNG, JPEG og WEBP online', 'Konvertér PNG, JPEG og WEBP i browseren'],
  nb: ['Bildeformatkonverter', 'Konverter bilder mellom PNG, JPEG og WEBP online', 'Konverter PNG, JPEG og WEBP i nettleseren'],
  sv: ['Bildformatsomvandlare', 'Konvertera bilder mellan PNG, JPEG och WEBP online', 'Konvertera PNG, JPEG och WEBP i webbläsaren'],
  fi: ['Kuvaformaatin muunnin', 'Muunna kuvia PNG-, JPEG- ja WEBP-muotojen välillä verkossa', 'Muunna PNG, JPEG ja WEBP selaimessa'],
  el: ['Μετατροπέας μορφών εικόνας', 'Μετατροπή εικόνων μεταξύ PNG, JPEG και WEBP online', 'Μετατρέψτε PNG, JPEG και WEBP στο πρόγραμμα περιήγησης'],
  hu: ['Képformátum-konverter', 'Képek konvertálása PNG, JPEG és WEBP között online', 'PNG, JPEG és WEBP konvertálása a böngészőben'],
  ro: ['Convertor de formate imagine', 'Convertește imagini între PNG, JPEG și WEBP online', 'Convertește PNG, JPEG și WEBP în browser'],
  sr: ['Конвертер формата слика', 'Конвертујте слике између PNG, JPEG и WEBP онлајн', 'Конвертујте PNG, JPEG и WEBP у прегледачу'],
  ar: ['محول تنسيقات الصور', 'حوّل الصور بين PNG وJPEG وWEBP عبر الإنترنت', 'حوّل PNG وJPEG وWEBP في المتصفح'],
  fa: ['مبدل فرمت تصویر', 'تبدیل تصاویر بین PNG، JPEG و WEBP آنلاین', 'تبدیل PNG، JPEG و WEBP در مرورگر'],
  he: ['ממיר פורמטי תמונה', 'המרת תמונות בין PNG, JPEG ו-WEBP אונליין', 'המירו PNG, JPEG ו-WEBP בדפדפן'],
  hi: ['इमेज फ़ॉर्मैट कनवर्टर', 'PNG, JPEG और WEBP के बीच ऑनलाइन कनवर्ट करें', 'ब्राउज़र में PNG, JPEG और WEBP कनवर्ट करें'],
  bn: ['ছবির ফরম্যাট কনভার্টার', 'PNG, JPEG ও WEBP-এর মধ্যে অনলাইনে রূপান্তর', 'ব্রাউজারে PNG, JPEG ও WEBP রূপান্তর করুন'],
  ur: ['تصویری فارمیٹ کنورٹر', 'PNG، JPEG اور WEBP کے درمیان آن لائن تبدیل کریں', 'براؤزر میں PNG، JPEG اور WEBP تبدیل کریں'],
  ps: ['د انځور بڼې بدلونکی', 'PNG، JPEG او WEBP ترمنځ انځورونه پرلیکه واړوئ', 'په براوزر کې PNG، JPEG او WEBP واړوئ'],
  sd: ['تصويري فارميٽ ڪنورٽر', 'PNG، JPEG ۽ WEBP وچ ۾ آنلائن مٽايو', 'برائوزر ۾ PNG، JPEG ۽ WEBP مٽايو'],
  ug: ['رەسىم فورماتى ئايلاندۇرغۇچ', 'PNG، JPEG، WEBP ئارىسىدا توردا ئايلاندۇرۇش', 'تور كۆرگۈچتە PNG، JPEG، WEBP ئايلاندۇرۇڭ'],
  'ku-arab': ['گۆڕەری فۆرماتی وێنە', 'وێنەکان لە نێوان PNG و JPEG و WEBP ئۆنلاین بگۆڕە', 'PNG و JPEG و WEBP لە وێبگەڕدا بگۆڕە'],
  ks: ['شکل فارمیٹ کنورٹر', 'PNG، JPEG تہٕ WEBP درمیان آن لایِن بدل کریو', 'براوزرَس منز PNG، JPEG تہٕ WEBP بدل کریو'],
  dv: ['އިމޭޖް ފޯމެޓް ކޮންވަޓަރ', 'PNG، JPEG އަދި WEBP އާއި ދެމީނުގައި އޮންލައިން', 'ބްރައުޒަރގައި PNG، JPEG އަދި WEBP'],
  az: ['Şəkil formatı çeviricisi', 'PNG, JPEG və WEBP arasında onlayn çevirin', 'Brauzerdə PNG, JPEG və WEBP çevirin'],
  kk: ['Сурет пішімінің түрлендіргіші', 'PNG, JPEG және WEBP арасында онлайн түрлендіру', 'Браузерде PNG, JPEG және WEBP түрлендіріңіз'],
  uz: ['Rasm format konverteri', 'PNG, JPEG va WEBP o‘rtasida onlayn aylantirish', 'Brauzerda PNG, JPEG va WEBP ni aylantiring'],
  hy: ['Պատկերի ձևաչափի փոխարկիչ', 'Փոխարկեք պատկերներ PNG, JPEG և WEBP միջև առցանց', 'Փոխարկեք PNG, JPEG և WEBP զննարկիչում'],
  ka: ['გამოსახულების ფორმატის კონვერტერი', 'გადაიყვანეთ სურათები PNG, JPEG და WEBP შორის ონლაინ', 'გადაიყვანეთ PNG, JPEG და WEBP ბრაუზერში'],
  ja: ['画像フォーマット変換', 'PNG・JPEG・WEBPをオンラインで変換', 'ブラウザでPNG・JPEG・WEBPを変換'],
  ko: ['이미지 포맷 변환기', 'PNG, JPEG, WEBP 이미지를 온라인으로 변환', '브라우저에서 PNG, JPEG, WEBP 변환'],
  'zh-cn': ['图片格式转换器', '在线转换 PNG、JPEG 和 WEBP 图片', '在浏览器中转换 PNG、JPEG 和 WEBP'],
  th: ['ตัวแปลงรูปแบบรูปภาพ', 'แปลงรูปภาพระหว่าง PNG JPEG และ WEBP ออนไลน์', 'แปลง PNG JPEG และ WEBP ในเบราว์เซอร์'],
  vi: ['Chuyển đổi định dạng ảnh', 'Chuyển ảnh giữa PNG, JPEG và WEBP trực tuyến', 'Chuyển PNG, JPEG và WEBP trong trình duyệt'],
  id: ['Konverter Format Gambar', 'Konversi gambar antara PNG, JPEG, dan WEBP online', 'Konversi PNG, JPEG, dan WEBP di browser'],
  ms: ['Penukar Format Imej', 'Tukar imej antara PNG, JPEG dan WEBP dalam talian', 'Tukar PNG, JPEG dan WEBP dalam pelayar'],
  fil: ['Image Format Converter', 'I-convert ang mga larawan sa PNG, JPEG, at WEBP online', 'I-convert ang PNG, JPEG, at WEBP sa browser'],
  yi: ['בילד־פֿאָרמאַט קאַנווערטער', 'קאָנווערטירן בילדער צווישן PNG, JPEG און WEBP אָנליין', 'קאָנווערטירן PNG, JPEG און WEBP אין דעם בלעטער'],
};

const FLAPPY_TITLE = {
  en: 'Flappy Bird',
  ru: 'Flappy Bird',
  de: 'Flappy Bird',
  fr: 'Flappy Bird',
  es: 'Flappy Bird',
  'es-419': 'Flappy Bird',
  it: 'Flappy Bird',
  'pt-br': 'Flappy Bird',
  'pt-pt': 'Flappy Bird',
  pl: 'Flappy Bird',
  nl: 'Flappy Bird',
  tr: 'Flappy Bird',
  be: 'Flappy Bird',
  bg: 'Flappy Bird',
  cs: 'Flappy Bird',
  da: 'Flappy Bird',
  nb: 'Flappy Bird',
  sv: 'Flappy Bird',
  fi: 'Flappy Bird',
  el: 'Flappy Bird',
  hu: 'Flappy Bird',
  ro: 'Flappy Bird',
  sr: 'Flappy Bird',
  ar: 'فلابي بيرد',
  fa: 'فلپی برد',
  he: 'Flappy Bird',
  hi: 'Flappy Bird',
  bn: 'Flappy Bird',
  ur: 'Flappy Bird',
  ps: 'Flappy Bird',
  sd: 'Flappy Bird',
  ug: 'Flappy Bird',
  'ku-arab': 'Flappy Bird',
  ks: 'Flappy Bird',
  dv: 'Flappy Bird',
  az: 'Flappy Bird',
  kk: 'Flappy Bird',
  uz: 'Flappy Bird',
  hy: 'Flappy Bird',
  ka: 'Flappy Bird',
  ja: 'フラッピーバード',
  ko: '플래피 버드',
  'zh-cn': '飞扬的小鸟',
  th: 'Flappy Bird',
  vi: 'Flappy Bird',
  id: 'Flappy Bird',
  ms: 'Flappy Bird',
  fil: 'Flappy Bird',
  yi: 'Flappy Bird',
};

const FLAPPY_DESC = {
  en: 'Flappy Bird: fly through pipes without hitting them and score points.',
  ru: 'Flappy Bird: пролетай сквозь трубы, не задев их, и набирай очки.',
  de: 'Flappy Bird: Fliege durch Rohre ohne sie zu treffen und sammle Punkte.',
  fr: 'Flappy Bird : volez entre les tuyaux sans les toucher et marquez des points.',
  es: 'Flappy Bird: vuela entre tuberías sin tocarlas y suma puntos.',
  'es-419': 'Flappy Bird: vuela entre tuberías sin tocarlas y suma puntos.',
  it: 'Flappy Bird: vola tra i tubi senza colpirli e fai punti.',
  'pt-br': 'Flappy Bird: voe pelos canos sem encostar e marque pontos.',
  'pt-pt': 'Flappy Bird: voe pelos tubos sem encostar e marque pontos.',
  pl: 'Flappy Bird: lataj między rurami bez uderzania i zbieraj punkty.',
  nl: 'Flappy Bird: vlieg door buizen zonder ze te raken en scoor punten.',
  tr: 'Flappy Bird: borulara çarpmadan uçun ve puan kazanın.',
  be: 'Flappy Bird: пралятайце праз трубы, не зачапіўшы іх, і набірайце ачкі.',
  bg: 'Flappy Bird: прелитай през тръбите, без да ги докосваш, и събирай точки.',
  cs: 'Flappy Bird: létejte trubkami, aniž byste je trefili, a sbírejte body.',
  da: 'Flappy Bird: flyv gennem rør uden at ramme dem, og score point.',
  nb: 'Flappy Bird: fly gjennom rør uten å treffe dem, og samle poeng.',
  sv: 'Flappy Bird: flyg genom rör utan att träffa dem och samla poäng.',
  fi: 'Flappy Bird: lennä putkien läpi osumatta niihin ja kerää pisteitä.',
  el: 'Flappy Bird: πέταξε ανάμεσα στους σωλήνες χωρίς να τους χτυπήσεις και κέρδισε πόντους.',
  hu: 'Flappy Bird: repülj a csövek között anélkül, hogy nekik ütköznél, és gyűjts pontokat.',
  ro: 'Flappy Bird: zboară printre țevi fără să le lovești și adună puncte.',
  sr: 'Flappy Bird: лети кроз цеви без ударања и скупљај поене.',
  ar: 'فلابي بيرد: حلّق عبر الأنابيب دون الاصطدام واجمع النقاط.',
  fa: 'فلپی برد: از میان لوله‌ها بدون برخورد پرواز کنید و امتیاز بگیرید.',
  he: 'Flappy Bird: עופו בין צינורות בלי לפגוע בהם וצברו נקודות.',
  hi: 'Flappy Bird: पाइपों से टकराए बिना उड़ें और अंक कमाएँ।',
  bn: 'Flappy Bird: পাইপে না লাগিয়ে উড়ে যান এবং পয়েন্ট সংগ্রহ করুন।',
  ur: 'Flappy Bird: پائپوں سے ٹکرائے بغیر اڑیں اور اسکور بنائیں۔',
  ps: 'Flappy Bird: له نلونو سره پرته له ټکر الوتنه وکړئ او نمرې ترلاسه کړئ.',
  sd: 'Flappy Bird: پائپن سان ٽڪرائڻ کان سواءِ اڏو ۽ اسڪور ڪريو.',
  ug: 'Flappy Bird: تۇرۇبىلارغا سوقۇلماي ئۇچۇپ نومۇر توپلاڭ.',
  'ku-arab': 'Flappy Bird: بەبێ پێکدادان لە نێوان بۆرییەکان بفڕە و خاڵ کۆبکەرەوە.',
  ks: 'Flappy Bird: پائپن سۭتۍ ٹکرۍ بغٲر وُڑِو تہٕ پوائنٹ کٔرِو حٲصل.',
  dv: 'Flappy Bird: ޕައިޕުތަކާ ނުޖެހެން ދުއްވާށެވެ. ޕޮއިންޓް ހޯދާށެވެ.',
  az: 'Flappy Bird: borulara dəymədən uçun və xal toplayın.',
  kk: 'Flappy Bird: құбырларға соғылмай ұшып, ұпай жинаңыз.',
  uz: 'Flappy Bird: quvurlarga urilmasdan uching va ochko to‘plang.',
  hy: 'Flappy Bird՝ թռչեք խողովակների միջով՝ չդիպչելով դրանց, և հավաքեք միավորներ։',
  ka: 'Flappy Bird: გაფრინდით მილებს შორის შეხების გარეშე და დააგროვეთ ქულები.',
  ja: 'フラッピーバード：パイプに当たらず飛び、得点を稼ごう。',
  ko: '플래피 버드: 파이프에 부딪히지 않고 날아 점수를 얻으세요.',
  'zh-cn': '飞扬的小鸟：穿过管道且不要撞上，并获得分数。',
  th: 'Flappy Bird: บินผ่านท่อโดยไม่ชนและเก็บคะแนน',
  vi: 'Flappy Bird: bay qua các ống mà không va chạm và ghi điểm.',
  id: 'Flappy Bird: terbang melewati pipa tanpa menabrak dan raih skor.',
  ms: 'Flappy Bird: terbang melalui paip tanpa melanggar dan kumpul mata.',
  fil: 'Flappy Bird: lumipad sa mga tubo nang hindi tumatama at kumita ng puntos.',
  yi: 'Flappy Bird: פֿליט דורך רערן אָן זיי צו שלאָגן און זאַמלט פּונקטן.',
};

const RAT_TITLE = {
  en: 'Fat Rat',
  ru: 'Толстая крыса',
  de: 'Fette Ratte',
  fr: 'Gros Rat',
  es: 'Rata Gorda',
  'es-419': 'Rata Gorda',
  it: 'Ratto Grasso',
  'pt-br': 'Rato Gordo',
  'pt-pt': 'Rato Gordo',
  pl: 'Gruby Szczur',
  nl: 'Dikke Rat',
  tr: 'Şişman Fare',
  be: 'Тоўсты пацук',
  bg: 'Дебел плъх',
  cs: 'Tlustá krysa',
  da: 'Fed Rotte',
  nb: 'Fet Rotte',
  sv: 'Fet Råtta',
  fi: 'Lihava Rotta',
  el: 'Χοντρός Ποντικός',
  hu: 'Kövér Patkány',
  ro: 'Șobolan Gras',
  sr: 'Дебели пацов',
  ar: 'الفأر السمين',
  fa: 'موش چاق',
  he: 'עכברוש שמן',
  hi: 'मोटा चूहा',
  bn: 'মোটা ইঁদুর',
  ur: 'موٹا چوہا',
  ps: 'غټ موږک',
  sd: 'موٽو ڪوئو',
  ug: 'سېمىز چاشقان',
  'ku-arab': 'مشکی قەڵەو',
  ks: 'مۄٹ مُوش',
  dv: 'ބޮޑު މީދާ',
  az: 'Yağlı Siçovul',
  kk: 'Семіз егеуқұйрық',
  uz: 'Semiz kalamush',
  hy: 'Գեր առնետ',
  ka: 'მსუქანი ვირთხა',
  ja: 'ふとったネズミ',
  ko: '뚱뚱한 쥐',
  'zh-cn': '胖老鼠',
  th: 'หนูอ้วน',
  vi: 'Chuột Béo',
  id: 'Tikus Gemuk',
  ms: 'Tikus Gemuk',
  fil: 'Matabang Daga',
  yi: 'דיקע ראָץ',
};

const TYPING_TITLE = {
  en: 'Typing Speed',
  ru: 'Скорость печати',
  de: 'Tippgeschwindigkeit',
  fr: 'Vitesse de frappe',
  es: 'Velocidad de escritura',
  'es-419': 'Velocidad de escritura',
  it: 'Velocità di digitazione',
  'pt-br': 'Velocidade de digitação',
  'pt-pt': 'Velocidade de escrita',
  pl: 'Szybkość pisania',
  nl: 'Typsnelheid',
  tr: 'Yazma Hızı',
  be: 'Хуткасць набору',
  bg: 'Скорост на писане',
  cs: 'Rychlost psaní',
  da: 'Skrivehastighed',
  nb: 'Skrivehastighet',
  sv: 'Skrivhastighet',
  fi: 'Kirjoitusnopeus',
  el: 'Ταχύτητα πληκτρολόγησης',
  hu: 'Gépelési sebesség',
  ro: 'Viteză de tastare',
  sr: 'Брзина куцања',
  ar: 'سرعة الكتابة',
  fa: 'سرعت تایپ',
  he: 'מהירות הקלדה',
  hi: 'टाइपिंग गति',
  bn: 'টাইপিং গতি',
  ur: 'ٹائپنگ کی رفتار',
  ps: 'د ټایپ چټکتیا',
  sd: 'ٽائپنگ جي رفتار',
  ug: 'يېزىش سۈرئىتى',
  'ku-arab': 'خێرایی نووسین',
  ks: 'ٹایپنگ رفتار',
  dv: 'ޓައިޕްކުރުމުގެ ސްޕީޑް',
  az: 'Yazma sürəti',
  kk: 'Теру жылдамдығы',
  uz: 'Yozish tezligi',
  hy: 'Մուտքագրման արագություն',
  ka: 'აკრეფის სიჩქარე',
  ja: 'タイピング速度',
  ko: '타이핑 속도',
  'zh-cn': '打字速度',
  th: 'ความเร็วในการพิมพ์',
  vi: 'Tốc độ gõ phím',
  id: 'Kecepatan Mengetik',
  ms: 'Kelajuan Mentaip',
  fil: 'Bilis ng Pag-type',
  yi: 'טיפּיר-גיכקייט',
};

function t3(map, loc) {
  const row = map[loc] || map.en;
  const [shortTitle, description, ogDescription] = row;
  const title = `${shortTitle} — ${brand(loc)}`;
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: ogDescription || description,
    twitterTitle: title,
    twitterDescription: description,
  };
}

function gameTitle(map, loc, suffix = '') {
  const name = map[loc] || map.en;
  const b = brand(loc);
  if (suffix) return `${name} — ${b} ${suffix}`.trim();
  return `${name} — ${b}`;
}

function setMetaObject(meta, tr) {
  meta.title = tr.title;
  meta.description = tr.description;
  meta.ogTitle = tr.ogTitle;
  meta.ogDescription = tr.ogDescription;
  meta.twitterTitle = tr.twitterTitle;
  meta.twitterDescription = tr.twitterDescription;
}

function updateToolJson(fileName, map) {
  const p = path.join(DATA, fileName);
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  let n = 0;
  for (const loc of LOCALES) {
    if (!json[loc]?.meta) continue;
    const tr = t3(map, loc);
    setMetaObject(json[loc].meta, tr);
    n++;
  }
  if (!DRY) fs.writeFileSync(p, `${JSON.stringify(json, null, 2)}\n`);
  return n;
}

function updateFlappy() {
  const p = path.join(DATA, 'gameFlappyTranslations.json');
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  let n = 0;
  for (const loc of LOCALES) {
    const g = json[loc]?.gameFlappy;
    if (!g) continue;
    const title = gameTitle(FLAPPY_TITLE, loc);
    const desc = FLAPPY_DESC[loc] || FLAPPY_DESC.en;
    g.pageTitle = title;
    g.ogTitle = title;
    g.metaDescription = desc;
    // keep existing localized og/twitter if present after strip; else set from desc
    g.ogDescription = stripSuffix(g.ogDescription || '') || desc;
    g.twitterDescription = stripSuffix(g.twitterDescription || '') || desc;
    // If og still English-ish for non-en and equals EN, replace
    if (loc !== 'en' && loc !== 'ru') {
      const enOg = FLAPPY_DESC.en;
      if (stripSuffix(g.ogDescription) === enOg) g.ogDescription = desc;
      if (stripSuffix(g.twitterDescription) === enOg) g.twitterDescription = desc;
    }
    n++;
  }
  if (!DRY) fs.writeFileSync(p, `${JSON.stringify(json, null, 2)}\n`);
  return n;
}

function updateSimpleGameTitle(fileName, nestKey, titleMap, gamesSuffix = false) {
  const p = path.join(DATA, fileName);
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  let n = 0;
  for (const loc of LOCALES) {
    const g = json[loc]?.[nestKey];
    if (!g || typeof g.pageTitle !== 'string') continue;
    g.pageTitle = gamesSuffix
      ? `${titleMap[loc] || titleMap.en} — ${brand(loc)} Games`
      : gameTitle(titleMap, loc);
    if (typeof g.ogTitle === 'string') g.ogTitle = g.pageTitle;
    n++;
  }
  if (!DRY) fs.writeFileSync(p, `${JSON.stringify(json, null, 2)}\n`);
  return n;
}

/** Recursively strip locale suffixes from string fields in all game/tool/kb JSON we touched */
function stripAllSuffixesInData() {
  const files = fs.readdirSync(DATA).filter((f) => f.endsWith('.json'));
  let changed = 0;
  for (const f of files) {
    const p = path.join(DATA, f);
    let text = fs.readFileSync(p, 'utf8');
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      continue;
    }
    let local = 0;
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      for (const [k, v] of Object.entries(node)) {
        if (typeof v === 'string') {
          const next = stripSuffix(v);
          if (next !== v) {
            node[k] = next;
            local++;
          }
        } else if (v && typeof v === 'object') walk(v);
      }
    };
    walk(json);
    if (local) {
      changed += local;
      if (!DRY) fs.writeFileSync(p, `${JSON.stringify(json, null, 2)}\n`);
    }
  }
  return changed;
}

function detectLocale(rel) {
  const segs = rel.split('/');
  if (segs[0] && LOCALES.includes(segs[0])) return segs[0];
  return 'ru';
}

function patchHtmlMeta(abs, fields) {
  let html = fs.readFileSync(abs, 'utf8');
  const before = html;
  if (fields.title) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(fields.title)}</title>`);
  }
  const attr = (prop, val, nameOrProp = 'property') => {
    if (!val) return;
    const re = new RegExp(
      `(<meta\\s+(?:${nameOrProp})=["']${prop}["']\\s+content=["'])([^"']*)(["'])`,
      'i'
    );
    if (re.test(html)) {
      html = html.replace(re, `$1${escapeAttr(val)}$3`);
    }
  };
  attr('description', fields.description, 'name');
  attr('og:title', fields.ogTitle || fields.title, 'property');
  attr('og:description', fields.ogDescription || fields.description, 'property');
  attr('twitter:title', fields.twitterTitle || fields.title, 'property');
  attr('twitter:title', fields.twitterTitle || fields.title, 'name');
  attr('twitter:description', fields.twitterDescription || fields.description, 'property');
  attr('twitter:description', fields.twitterDescription || fields.description, 'name');
  if (html !== before && !DRY) fs.writeFileSync(abs, html);
  return html !== before;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function stripSuffixesInHtmlTree() {
  let n = 0;
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'news' || ent.name === 'node_modules') continue;
        walk(abs);
        continue;
      }
      if (!ent.name.endsWith('.html')) continue;
      let html = fs.readFileSync(abs, 'utf8');
      const next = html.replace(
        /(<(?:title)[^>]*>)([\s\S]*?)(<\/title>)/gi,
        (m, a, body, c) => `${a}${stripSuffix(body)}${c}`
      ).replace(
        /(content=["'])([^"']*?\s*\([a-z]{2,3}(?:-[A-Za-z0-9]{2,})?\)\s*)(["'])/gi,
        (m, a, val, c) => `${a}${stripSuffix(val)}${c}`
      );
      if (next !== html) {
        n++;
        if (!DRY) fs.writeFileSync(abs, next);
      }
    }
  };
  walk(FRONTEND);
  return n;
}

function applyToolHtml(relPattern, map) {
  // relPattern like 'tools/development/base64-converter.html'
  let n = 0;
  for (const loc of LOCALES) {
    const rel = loc === 'ru'
      ? relPattern
      : path.join(loc, relPattern);
    const abs = path.join(FRONTEND, rel);
    if (!fs.existsSync(abs)) continue;
    const tr = t3(map, loc);
    if (patchHtmlMeta(abs, tr)) n++;
  }
  return n;
}

function applyGameHtml(relCandidates, buildFields) {
  let n = 0;
  for (const loc of LOCALES) {
    for (const relPattern of relCandidates) {
      const rel = loc === 'ru' ? relPattern : path.join(loc, relPattern);
      const abs = path.join(FRONTEND, rel);
      if (!fs.existsSync(abs)) continue;
      const fields = buildFields(loc);
      if (patchHtmlMeta(abs, fields)) n++;
    }
  }
  return n;
}

console.log(`translate-priority-meta ${DRY ? '(dry-run) ' : ''}…`);

// 1) Strip leftover suffixes everywhere first in data (non-priority may keep localized text)
const strippedData = stripAllSuffixesInData();
console.log(`stripped suffixes in data fields: ${strippedData}`);

// 2) Apply real translations for priority tools/games
console.log('base64', updateToolJson('base64Converter.json', BASE64));
console.log('json', updateToolJson('jsonFormatter.json', JSON_FMT));
console.log('format', updateToolJson('formatConverter.json', FORMAT_CONV));
console.log('flappy', updateFlappy());
console.log('rat', updateSimpleGameTitle('gameRatTranslations.json', 'gameRat', RAT_TITLE, true));
console.log('typing', updateSimpleGameTitle('gameTypingTranslations.json', 'gameTyping', TYPING_TITLE, false));

// 3) HTML: strip suffixes sitewide, then overwrite priority pages with translations
const strippedHtml = stripSuffixesInHtmlTree();
console.log(`stripped suffixes in html files: ${strippedHtml}`);
console.log('html base64', applyToolHtml('tools/development/base64-converter.html', BASE64));
console.log('html json', applyToolHtml('tools/development/json-formatter.html', JSON_FMT));
console.log('html format', applyToolHtml('tools/design/format-converter.html', FORMAT_CONV));
console.log(
  'html flappy',
  applyGameHtml(['games/flappy/flappy.html', 'games/flappy/index.html'], (loc) => {
    const title = gameTitle(FLAPPY_TITLE, loc);
    const desc = FLAPPY_DESC[loc] || FLAPPY_DESC.en;
    return {
      title,
      description: desc,
      ogTitle: title,
      ogDescription: desc,
      twitterTitle: title,
      twitterDescription: desc,
    };
  })
);
console.log(
  'html rat',
  applyGameHtml(['games/rat/index.html'], (loc) => {
    const title = `${RAT_TITLE[loc] || RAT_TITLE.en} — ${brand(loc)} Games`;
    return { title, ogTitle: title, twitterTitle: title };
  })
);
console.log(
  'html typing',
  applyGameHtml(['games/typing/index.html'], (loc) => {
    const title = gameTitle(TYPING_TITLE, loc);
    return { title, ogTitle: title, twitterTitle: title };
  })
);

console.log(DRY ? 'dry-run done' : 'done');
