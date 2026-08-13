#!/usr/bin/env python3
"""Translate remaining duplicate meta: poleznoe, KB guides, success/privacy/adInfo pairs.
Updates assembly JSON + live frontend HTML.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path('/var/www/serpmonn.ru')
DATA = ROOT / 'assembly/site/_data'
FRONTEND = ROOT / 'frontend'

LOCALES = [
    'ru','ar','az','be','bg','bn','cs','da','de','dv','el','en','es','es-419','fa','fi','fil','fr',
    'he','hi','hu','hy','id','it','ja','ka','kk','ko','ks','ku-arab','ms','nb','nl','pl','ps',
    'pt-br','pt-pt','ro','sd','sr','sv','th','tr','ug','ur','uz','vi','yi','zh-cn',
]

def brand(loc: str) -> str:
    return 'Серпмонн' if loc == 'ru' else 'Serpmonn'

def esc_html(s: str) -> str:
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def esc_attr(s: str) -> str:
    return s.replace('&', '&amp;').replace('"', '&quot;')

def patch_html(path: Path, title: str | None = None, desc: str | None = None) -> bool:
    if not path.exists():
        return False
    html = path.read_text(encoding='utf-8', errors='replace')
    before = html
    if title:
        html = re.sub(r'<title>[\s\S]*?</title>', f'<title>{esc_html(title)}</title>', html, count=1, flags=re.I)
        for prop in ('og:title', 'twitter:title'):
            html = re.sub(
                rf'(<meta\s+(?:property|name)=["\']{re.escape(prop)}["\']\s+content=["\'])([^"\']*)(["\'])',
                rf'\g<1>{esc_attr(title)}\3', html, count=1, flags=re.I,
            )
    if desc:
        html = re.sub(
            r'(<meta\s+name=["\']description["\']\s+content=["\'])([^"\']*)(["\'])',
            rf'\g<1>{esc_attr(desc)}\3', html, count=1, flags=re.I,
        )
        for prop in ('og:description', 'twitter:description'):
            html = re.sub(
                rf'(<meta\s+(?:property|name)=["\']{re.escape(prop)}["\']\s+content=["\'])([^"\']*)(["\'])',
                rf'\g<1>{esc_attr(desc)}\3', html, count=1, flags=re.I,
            )
    if html != before:
        path.write_text(html, encoding='utf-8')
        return True
    return False

def html_path(loc: str, rel: str) -> Path:
    return FRONTEND / rel if loc == 'ru' else FRONTEND / loc / rel

# --- poleznoe: title, description ---
POLEZNOE = {
'en': ('Useful — services by task | Serpmonn', 'Parcel, domain, shopping, cards, stays, health and more.'),
'ru': ('Полезное — сервисы по задачам | Серпмонн', 'Посылки, домен, покупки, карты, жильё, здоровье и другое.'),
'de': ('Nützliches — Dienste nach Aufgabe | Serpmonn', 'Paket, Domain, Einkaufen, Karten, Unterkunft, Gesundheit und mehr.'),
'fr': ('Utile — services par tâche | Serpmonn', 'Colis, domaine, shopping, cartes, séjours, santé et plus.'),
'es': ('Útil — servicios por tarea | Serpmonn', 'Paquetería, dominio, compras, tarjetas, estancias, salud y más.'),
'es-419': ('Útil — servicios por tarea | Serpmonn', 'Paquetería, dominio, compras, tarjetas, hospedaje, salud y más.'),
'it': ('Utile — servizi per compito | Serpmonn', 'Pacchi, dominio, shopping, carte, soggiorni, salute e altro.'),
'pt-br': ('Úteis — serviços por tarefa | Serpmonn', 'Encomendas, domínio, compras, cartões, estadia, saúde e mais.'),
'pt-pt': ('Úteis — serviços por tarefa | Serpmonn', 'Encomendas, domínio, compras, cartões, estadias, saúde e mais.'),
'pl': ('Przydatne — usługi według zadań | Serpmonn', 'Paczki, domena, zakupy, karty, noclegi, zdrowie i więcej.'),
'nl': ('Nuttig — diensten per taak | Serpmonn', 'Pakket, domein, shoppen, kaarten, verblijf, gezondheid en meer.'),
'tr': ('Faydalı — göreve göre servisler | Serpmonn', 'Kargo, alan adı, alışveriş, kartlar, konaklama, sağlık ve daha fazlası.'),
'be': ('Карыснае — сэрвісы па задачах | Serpmonn', 'Пасылкі, дамен, пакупкі, карты, жыллё, здароўе і іншае.'),
'bg': ('Полезно — услуги по задачи | Serpmonn', 'Пратки, домейн, пазаруване, карти, настаняване, здраве и още.'),
'cs': ('Užitečné — služby podle úkolu | Serpmonn', 'Zásilky, doména, nákupy, karty, ubytování, zdraví a další.'),
'da': ('Nyttigt — tjenester efter opgave | Serpmonn', 'Pakke, domæne, shopping, kort, ophold, sundhed og mere.'),
'nb': ('Nyttig — tjenester etter oppgave | Serpmonn', 'Pakke, domene, shopping, kort, opphold, helse og mer.'),
'sv': ('Nyttigt — tjänster efter uppgift | Serpmonn', 'Paket, domän, shopping, kort, boende, hälsa och mer.'),
'fi': ('Hyödyllistä — palvelut tehtävittäin | Serpmonn', 'Paketti, verkkotunnus, ostokset, kortit, majoitus, terveys ja muuta.'),
'el': ('Χρήσιμα — υπηρεσίες ανά εργασία | Serpmonn', 'Δέμα, domain, αγορές, κάρτες, διαμονή, υγεία και άλλα.'),
'hu': ('Hasznos — szolgáltatások feladatonként | Serpmonn', 'Csomag, domain, vásárlás, kártyák, szállás, egészség és még több.'),
'ro': ('Utile — servicii pe sarcini | Serpmonn', 'Colete, domeniu, cumpărături, carduri, cazare, sănătate și altele.'),
'sr': ('Корисно — услуге по задацима | Serpmonn', 'Пошиљке, домен, куповина, картице, смештај, здравље и још.'),
'ar': ('مفيد — خدمات حسب المهمة | Serpmonn', 'طرود، نطاق، تسوق، بطاقات، إقامة، صحة والمزيد.'),
'fa': ('مفید — خدمات بر اساس کار | Serpmonn', 'مرسوله، دامنه، خرید، کارت، اقامت، سلامت و بیشتر.'),
'he': ('שימושי — שירותים לפי משימה | Serpmonn', 'חבילות, דומיין, קניות, כרטיסים, לינה, בריאות ועוד.'),
'hi': ('उपयोगी — कार्य के अनुसार सेवाएँ | Serpmonn', 'पार्सल, डोमेन, शॉपिंग, कार्ड, ठहराव, स्वास्थ्य और अधिक।'),
'bn': ('দরকারি — কাজ অনুযায়ী সেবা | Serpmonn', 'পার্সেল, ডোমেইন, কেনাকাটা, কার্ড, থাকা, স্বাস্থ্য এবং আরও।'),
'ur': ('مفید — کام کے مطابق سروسز | Serpmonn', 'پارسل، ڈومین، شاپنگ، کارڈز، رہائش، صحت اور مزید۔'),
'ps': ('ګټور — د دندې له مخې خدمتونه | Serpmonn', 'پارسل، ډومین، پیرود، کارتونه، استوګنه، روغتیا او نور.'),
'sd': ('مفيد — ڪم مطابق سروسون | Serpmonn', 'پارسل، ڊومين، خريداري، ڪارڊ، رهائش، صحت ۽ وڌيڪ.'),
'ug': ('پايدىلىق — ۋەزىپە بويىچە مۇلازىمەت | Serpmonn', 'پوسۇلكا، دائىرە، مال سېتىۋېلىش، كارتا، تۇرالغۇ، ساغلاملىق ۋە باشقىلار.'),
'ku-arab': ('سوودمەند — خزمەتگوزاری بەپێی ئەرک | Serpmonn', 'پاکێج، دۆمەین، کڕین، کارت، مانەوە، تەندروستی و زیاتر.'),
'ks': ('مفید — کٲم مطٲبق سروس | Serpmonn', 'پارسل، ڈومین، شاپنگ، کارڈ، رہائش، صحت تہٕ مزید.'),
'dv': ('ފައިދާވެދޤން — މަސައްކަތުގެ ސަރވިސް | Serpmonn', 'ޕާސަލް، ޑޮމެއިން، ޝޮޕިން، ކާޑް، ރަހައިޝް، ސިއްޙަތު އަދި އިތުރު.'),
'az': ('Faydalı — tapşırıq üzrə xidmətlər | Serpmonn', 'Bağlama, domen, alış-veriş, kartlar, qalmaq, sağlamlıq və daha çox.'),
'kk': ('Пайдалы — тапсырма бойынша сервистер | Serpmonn', 'Жөнелтілім, домен, сатып алу, карталар, тұру, денсаулық және басқа.'),
'uz': ('Foydali — vazifa bo‘yicha xizmatlar | Serpmonn', 'Posilka, domen, xarid, kartalar, turar joy, salomatlik va boshqalar.'),
'hy': ('Օգտակար — ծառայություններ ըստ առաջադրանքի | Serpmonn', 'Ծանրոց, դոմեն, գնումներ, քարտեր, կեցություն, առողջություն և այլն։'),
'ka': ('სასარგებლო — სერვისები ამოცანების მიხედვით | Serpmonn', 'ამანათი, დომენი, შოპინგი, ბარათები, განთავსება, ჯანმრთელობა და სხვა.'),
'ja': ('便利 — 目的別サービス | Serpmonn', '荷物、ドメイン、買い物、カード、滞在、健康など。'),
'ko': ('유용함 — 작업별 서비스 | Serpmonn', '택배, 도메인, 쇼핑, 카드, 숙박, 건강 등.'),
'zh-cn': ('实用 — 按任务分类的服务 | Serpmonn', '包裹、域名、购物、卡片、住宿、健康等。'),
'th': ('มีประโยชน์ — บริการตามงาน | Serpmonn', 'พัสดุ โดเมน ช้อปปิ้ง บัตร ที่พัก สุขภาพ และอื่น ๆ'),
'vi': ('Hữu ích — dịch vụ theo việc | Serpmonn', 'Bưu kiện, tên miền, mua sắm, thẻ, lưu trú, sức khỏe và hơn thế.'),
'id': ('Berguna — layanan per tugas | Serpmonn', 'Paket, domain, belanja, kartu, menginap, kesehatan, dan lainnya.'),
'ms': ('Berguna — perkhidmatan mengikut tugas | Serpmonn', 'Bungkusan, domain, beli-belah, kad, penginapan, kesihatan dan lagi.'),
'fil': ('Kapaki-pakinabang — serbisyo ayon sa gawain | Serpmonn', 'Parcel, domain, shopping, cards, stays, health at iba pa.'),
'yi': ('ניצלעך — סערוויסן לויט אויפֿגאַבע | Serpmonn', 'פּעקלעך, דאָמען, שאַפּינג, קאַרטן, וווינונג, געזונט און מער.'),
}

JSON_GUIDE = {
'en': ('JSON Formatter: why you need it and how to use it — Serpmonn', 'What JSON is, why format and validate it, common mistakes, and how to clean up JSON online.'),
'ru': ('JSON форматтер: зачем нужен и как пользоваться — Серпмонн', 'Что такое JSON, зачем форматировать и проверять, частые ошибки и как привести JSON в порядок онлайн.'),
'de': ('JSON-Formatierer: wozu und wie man ihn nutzt — Serpmonn', 'Was JSON ist, warum formatieren und prüfen, typische Fehler und wie man JSON online aufräumt.'),
'fr': ('Formateur JSON : pourquoi et comment l’utiliser — Serpmonn', 'Ce qu’est JSON, pourquoi le formater et le valider, erreurs courantes et nettoyage en ligne.'),
'es': ('Formateador JSON: para qué sirve y cómo usarlo — Serpmonn', 'Qué es JSON, por qué formatearlo y validarlo, errores comunes y cómo limpiarlo online.'),
'es-419': ('Formateador JSON: para qué sirve y cómo usarlo — Serpmonn', 'Qué es JSON, por qué formatearlo y validarlo, errores comunes y cómo limpiarlo en línea.'),
'it': ('Formattatore JSON: a cosa serve e come usarlo — Serpmonn', 'Cos’è JSON, perché formattarlo e validarlo, errori comuni e come pulirlo online.'),
'pt-br': ('Formatador JSON: para que serve e como usar — Serpmonn', 'O que é JSON, por que formatar e validar, erros comuns e como limpar JSON online.'),
'pt-pt': ('Formatador JSON: para que serve e como usar — Serpmonn', 'O que é JSON, porque formatar e validar, erros comuns e como limpar JSON online.'),
'pl': ('Formatter JSON: po co i jak używać — Serpmonn', 'Czym jest JSON, po co formatować i walidować, typowe błędy i jak wyczyścić JSON online.'),
'nl': ('JSON-formatter: waarom en hoe te gebruiken — Serpmonn', 'Wat JSON is, waarom formatteren en valideren, veelgemaakte fouten en JSON online opschonen.'),
'tr': ('JSON Biçimlendirici: neden ve nasıl kullanılır — Serpmonn', 'JSON nedir, neden biçimlendirilip doğrulanır, yaygın hatalar ve çevrimiçi temizleme.'),
'be': ('JSON фарматавальнік: навошта і як карыстацца — Serpmonn', 'Што такое JSON, навошта фарматаваць і правяраць, памылкі і як прывесці JSON у парадак анлайн.'),
'bg': ('JSON форматер: защо и как да го използвате — Serpmonn', 'Какво е JSON, защо да форматирате и проверявате, често срещани грешки и онлайн почистване.'),
'cs': ('JSON formátovač: proč a jak ho používat — Serpmonn', 'Co je JSON, proč formátovat a ověřovat, časté chyby a jak JSON online uklidit.'),
'da': ('JSON-formatter: hvorfor og hvordan — Serpmonn', 'Hvad JSON er, hvorfor formatere og validere, typiske fejl og oprydning online.'),
'nb': ('JSON-formatter: hvorfor og hvordan — Serpmonn', 'Hva JSON er, hvorfor formatere og validere, vanlige feil og opprydding online.'),
'sv': ('JSON-formaterare: varför och hur — Serpmonn', 'Vad JSON är, varför formatera och validera, vanliga fel och städning online.'),
'fi': ('JSON-muotoilija: miksi ja miten — Serpmonn', 'Mikä JSON on, miksi muotoilla ja tarkistaa, yleiset virheet ja siivous verkossa.'),
'el': ('Διαμορφωτής JSON: γιατί και πώς — Serpmonn', 'Τι είναι το JSON, γιατί μορφοποίηση και έλεγχος, συνηθισμένα λάθη και καθαρισμός online.'),
'hu': ('JSON formázó: miért és hogyan — Serpmonn', 'Mi a JSON, miért formázni és ellenőrizni, gyakori hibák és online tisztítás.'),
'ro': ('Formatter JSON: de ce și cum — Serpmonn', 'Ce este JSON, de ce să formatezi și validezi, greșeli comune și curățare online.'),
'sr': ('JSON форматер: зашто и како — Serpmonn', 'Шта је JSON, зашто форматирати и проверавати, честе грешке и чишћење онлајн.'),
'ar': ('منسق JSON: لماذا تحتاجه وكيف تستخدمه — Serpmonn', 'ما هو JSON ولماذا تنسيقه والتحقق منه والأخطاء الشائعة وتنظيفه عبر الإنترنت.'),
'fa': ('قالب‌بند JSON: چرا و چگونه — Serpmonn', 'JSON چیست، چرا قالب‌بندی و اعتبارسنجی، اشتباهات رایج و پاک‌سازی آنلاین.'),
'he': ('מעצב JSON: למה צריך ואיך להשתמש — Serpmonn', 'מה זה JSON, למה לעצב ולאמת, טעויות נפוצות וניקוי אונליין.'),
'hi': ('JSON फ़ॉर्मैटर: क्यों ज़रूरी और कैसे इस्तेमाल करें — Serpmonn', 'JSON क्या है, क्यों फ़ॉर्मैट और जाँच करें, आम गलतियाँ और ऑनलाइन सफ़ाई।'),
'bn': ('JSON ফরম্যাটার: কেন দরকার ও কীভাবে ব্যবহার — Serpmonn', 'JSON কী, কেন ফরম্যাট ও যাচাই, সাধারণ ভুল এবং অনলাইনে পরিষ্কার।'),
'ur': ('JSON فارمیٹر: کیوں اور کیسے استعمال کریں — Serpmonn', 'JSON کیا ہے، فارمیٹ اور تصدیق کیوں، عام غلطیاں اور آن لائن صفائی۔'),
'ps': ('JSON فارمیټر: ولې او څنګه — Serpmonn', 'JSON څه دی، ولې فارمیټ او تایید، عام تېروتنې او پرلیکه پاکول.'),
'sd': ('JSON فارميٽر: ڇو ۽ ڪيئن — Serpmonn', 'JSON ڇا آهي، فارميٽ ۽ تصديق ڇو، عام غلطيون ۽ آنلائن صفائي.'),
'ug': ('JSON فورماتلىغۇچ: نېمە ئۈچۈن ۋە قانداق — Serpmonn', 'JSON نېمە، نېمە ئۈچۈن فورماتلاش ۋە تەكشۈرۈش، كۆپ خاتالىق ۋە توردا تازىلاش.'),
'ku-arab': ('ڕێکخەری JSON: بۆچی و چۆن — Serpmonn', 'JSON چییە، بۆچی ڕێکخستن و پشتڕاستکردنەوە، هەڵە باوەکان و پاککردنەوەی ئۆنلاین.'),
'ks': ('JSON فارمیٹر: کیاز تہٕ کِتھ کٔرِو اِستعمال — Serpmonn', 'JSON کیاہ چھُ، فارمیٹ تہٕ جانچ کیاز، عام غلطیاں تہٕ آن لایِن صفٲیی.'),
'dv': ('JSON ފޯމެޓަރ: ކީއްވެ އަދި ކިހިނެއް — Serpmonn', 'JSON ކަންބޮޑުވެގެން، ފޯމެޓް އަދި ޗެކް، އާންމު މައްސަލަ އަދި އޮންލައިން ސާފުކުރުން.'),
'az': ('JSON formatlayıcı: niyə və necə — Serpmonn', 'JSON nədir, niyə formatlamaq və yoxlamaq, ümumi səhvlər və onlayn təmizləmə.'),
'kk': ('JSON пішімдеуіш: не үшін және қалай — Serpmonn', 'JSON дегеніміз не, неліктен пішімдеу және тексеру, жиі қателер және онлайн тазалау.'),
'uz': ('JSON formatlovchi: nima uchun va qanday — Serpmonn', 'JSON nima, nima uchun formatlash va tekshirish, odatiy xatolar va onlayn tozalash.'),
'hy': ('JSON ձևավորիչ՝ ինչու և ինչպես — Serpmonn', 'Ինչ է JSON-ը, ինչու ձևավորել և ստուգել, հաճախակի սխալներ և առցանց մաքրում։'),
'ka': ('JSON ფორმატერი: რატომ და როგორ — Serpmonn', 'რა არის JSON, რატომ ფორმატირება და შემოწმება, ხშირი შეცდომები და ონლაინ გასუფთავება.'),
'ja': ('JSONフォーマッター：なぜ必要でどう使うか — Serpmonn', 'JSONとは何か、整形と検証の理由、よくあるミス、オンラインでの整理方法。'),
'ko': ('JSON 포맷터: 왜 필요하고 어떻게 쓰나 — Serpmonn', 'JSON이란 무엇인지, 포맷·검증이 필요한 이유, 흔한 실수와 온라인 정리 방법.'),
'zh-cn': ('JSON 格式化工具：为什么需要以及如何使用 — Serpmonn', '什么是 JSON、为何要格式化与校验、常见错误以及如何在线整理。'),
'th': ('ตัวจัดรูปแบบ JSON: ทำไมต้องใช้และใช้อย่างไร — Serpmonn', 'JSON คืออะไร ทำไมต้องจัดรูปแบบและตรวจสอบ ข้อผิดพลาดที่พบบ่อย และการทำความสะอาดออนไลน์'),
'vi': ('Công cụ JSON: vì sao cần và cách dùng — Serpmonn', 'JSON là gì, vì sao cần định dạng và kiểm tra, lỗi thường gặp và cách dọn JSON online.'),
'id': ('Pemformat JSON: mengapa dan cara pakai — Serpmonn', 'Apa itu JSON, mengapa format dan validasi, kesalahan umum, dan membersihkan JSON online.'),
'ms': ('Pemformat JSON: mengapa dan cara guna — Serpmonn', 'Apa itu JSON, mengapa format dan sahkan, kesilapan biasa, dan bersihkan JSON dalam talian.'),
'fil': ('JSON Formatter: bakit kailangan at paano gamitin — Serpmonn', 'Ano ang JSON, bakit i-format at i-validate, karaniwang pagkakamali, at paglilinis online.'),
'yi': ('JSON פֿאָרמאַטירער: פֿאַר וואָס און ווי אַזוי — Serpmonn', 'וואָס איז JSON, פֿאַר וואָס פֿאָרמאַטירן און וואַלידירן, אָפטע טעותן און אָנליין רייניקונג.'),
}


def update_poleznoe():
    path = DATA / 'poleznoe.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    n = 0
    for loc in LOCALES:
        if loc not in data:
            continue
        title, desc = POLEZNOE.get(loc) or POLEZNOE['en']
        meta = data[loc].setdefault('meta', {})
        meta['title'] = title
        meta['description'] = desc
        meta['ogTitle'] = title
        meta['ogDescription'] = desc
        meta['twitterTitle'] = title
        meta['twitterDescription'] = desc
        if patch_html(html_path(loc, 'poleznoe/poleznoe.html'), title, desc):
            n += 1
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return n


def update_json_guide():
    path = DATA / 'jsonFormatterGuide.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    n = 0
    for loc in LOCALES:
        if loc not in data:
            continue
        title, desc = JSON_GUIDE.get(loc) or JSON_GUIDE['en']
        data[loc]['title'] = title
        data[loc]['description'] = desc
        data[loc]['ogDescription'] = desc
        data[loc]['twitterDescription'] = desc
        if 'ogTitle' in data[loc]:
            data[loc]['ogTitle'] = title
        if patch_html(html_path(loc, 'knowledge-base/articles/json-formatter-guide.html'), title, desc):
            n += 1
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return n


def uniquify_pairs():
    """Fix known colliding locale pairs with distinct wording."""
    fixes = []

    # webDevelopmentGuide ar vs he (he wrongly had Arabic)
    WEB = {
        'he': (
            'איך ליצור אתר ראשון מאפס — מדריך למתחילים | Serpmonn',
            'מדריך שלב־אחר־שלב למתחילים ליצירת אתר מאפס: HTML, CSS, JavaScript, בחירת כלים ופריסה.',
        ),
        'es-419': (
            'Cómo crear tu primer sitio web desde cero — guía para principiantes | Serpmonn',
            'Guía paso a paso para crear un sitio desde cero: HTML, CSS, JavaScript, herramientas y publicación.',
        ),
        'fil': (
            'Paano gumawa ng unang website mula sa simula — gabay para sa baguhan | Serpmonn',
            'Step-by-step na gabay para sa mga baguhan: HTML, CSS, JavaScript, pagpili ng tools, at pag-publish.',
        ),
        'hi': (
            'शुरू से पहली वेबसाइट कैसे बनाएँ — शुरुआती गाइड | Serpmonn',
            'शुरुआती लोगों के लिए चरण-दर-चरण गाइड: HTML, CSS, JavaScript, टूल चयन और पब्लिशिंग।',
        ),
    }
    path = DATA / 'webDevelopmentGuide.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    for loc, (title, desc) in WEB.items():
        if loc in data and 'meta' in data[loc]:
            data[loc]['meta']['title'] = title
            data[loc]['meta']['description'] = desc
            data[loc]['meta']['ogTitle'] = title
            data[loc]['meta']['ogDescription'] = desc
            if patch_html(html_path(loc, 'knowledge-base/articles/web-development-guide.html'), title, desc):
                fixes.append(f'web:{loc}')
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    # depreciation: fix wrong-language clones
    DEP = {
        'ur': (
            'گاڑی کی فرسودگی درست طریقے سے کیسے نکالیں — مکمل گائیڈ | Serpmonn',
            'ڈیپریسی ایشن کیلکولیٹر استعمال کرنے کی تفصیلی رہنمائی: عوامل، حساب اور درست نتیجہ۔',
        ),
        'he': (
            'איך לחשב פחת רכב נכון — מדריך מלא | Serpmonn',
            'מדריך מפורט לשימוש במחשבון פחת: איך להתחשב בכל הגורמים ולקבל תוצאה מדויקת.',
        ),
        'sv': (
            'Hur du beräknar bilavskrivning korrekt — komplett guide | Serpmonn',
            'Detaljerad guide till avskrivningskalkylatorn: ta hänsyn till alla faktorer och få rätt resultat.',
        ),
        'sr': (
            'Како исправно израчунати амортизацију аутомобила — комплетан водич | Serpmonn',
            'Детаљан водич за калкулатор амортизације: узмите у обзир све факторе и добијте тачан резултат.',
        ),
        'es-419': (
            'Cómo calcular correctamente la depreciación del auto — guía completa | Serpmonn',
            'Guía detallada del calculador de depreciación: considera todos los factores y obtén un resultado preciso.',
        ),
        'ja': (
            '車の減価償却を正しく計算する方法 — 完全ガイド | Serpmonn',
            '減価償却計算機の使い方：要素を正しく反映し、正確な結果を出すための実践ガイド。',
        ),
        'ko': (
            '자동차 감가상각을 올바르게 계산하는 방법 — 완벽 가이드 | Serpmonn',
            '감가상각 계산기 사용법: 모든 요소를 반영해 정확한 결과를 얻는 상세 가이드.',
        ),
        'zh-cn': (
            '如何正确计算汽车折旧 — 完整指南 | Serpmonn',
            '折旧计算器使用详解：如何考虑所有因素并得到准确结果。',
        ),
        'tr': (
            'Araç amortismanını doğru hesaplama — tam rehber | Serpmonn',
            'Amortisman hesaplayıcı kullanım rehberi: tüm etkenleri dikkate alıp doğru sonuca ulaşın.',
        ),
    }
    path = DATA / 'howToCalculateDepreciation.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    for loc, (title, desc) in DEP.items():
        if loc not in data:
            continue
        data[loc]['pageTitle'] = title
        data[loc]['metaDescription'] = desc
        data[loc]['ogTitle'] = title
        data[loc]['ogDescription'] = desc
        data[loc]['twitterTitle'] = title
        data[loc]['twitterDescription'] = desc
        if patch_html(html_path(loc, 'knowledge-base/articles/how-to-calculate-depreciation.html'), title, desc):
            fixes.append(f'dep:{loc}')
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    # success pageTitle/meta for be/hu if still Russian shared - and pt-br/pt-pt
    path = DATA / 'success.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    SUCCESS = {
        'be': ('Аплата паспяхова завершана', 'Тарыф Pro будзе актываваны цягам некалькіх секунд.'),
        'hu': ('Sikeres fizetés', 'A Pro tarifa néhány másodpercen belül aktiválódik.'),
        'pt-br': ('Pagamento concluído com sucesso', 'O plano Pro será ativado em alguns segundos.'),
        'pt-pt': ('Pagamento concluído com êxito', 'O plano Pro será ativado dentro de alguns segundos.'),
        'es-419': ('Pago completado con éxito', 'El plan Pro se activará en unos segundos.'),
        'es': ('Pago realizado correctamente', 'La tarifa Pro se activará en unos segundos.'),
    }
    for loc, (title, desc) in SUCCESS.items():
        if loc not in data or 'success' not in data[loc]:
            continue
        s = data[loc]['success']
        s['pageTitle'] = title
        s['title'] = title
        s['metaDescription'] = desc
        if patch_html(html_path(loc, 'tariffs/success.html'), title, desc):
            fixes.append(f'success:{loc}')
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    # privacy slight differentiation
    path = DATA / 'privacyPolicyTranslations.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    PRIV = {
        'es': ('Política de privacidad de Serpmonn', 'Política de privacidad del servicio Serpmonn: tratamiento y protección de datos personales.'),
        'es-419': ('Aviso de privacidad de Serpmonn', 'Aviso de privacidad de Serpmonn: procesamiento y protección de datos personales en Latinoamérica.'),
        'pt-br': ('Política de Privacidade do Serpmonn', 'Política de privacidade do serviço Serpmonn: tratamento e proteção de dados pessoais.'),
        'pt-pt': ('Política de Privacidade da Serpmonn', 'Política de privacidade do serviço Serpmonn: tratamento e proteção de dados pessoais em Portugal.'),
    }
    for loc, (title, desc) in PRIV.items():
        if loc not in data or 'privacyPolicy' not in data[loc]:
            continue
        p = data[loc]['privacyPolicy']
        p['title'] = title
        p['description'] = desc
        p['ogTitle'] = title
        p['ogDescription'] = desc
        p['twitterTitle'] = title
        p['twitterDescription'] = desc
        if patch_html(html_path(loc, 'privacy-policy/privacy-policy.html'), title, desc):
            fixes.append(f'privacy:{loc}')
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    # ad-info pt
    path = DATA / 'adInfo.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    AD = {
        'pt-br': ('Sobre publicidade | Serpmonn', 'Informações sobre anúncios e programas de parceiros no site serpmonn.ru'),
        'pt-pt': ('Acerca de publicidade | Serpmonn', 'Informação sobre anúncios e programas de parceiros no site serpmonn.ru'),
        'es': ('Sobre la publicidad | Serpmonn', 'Información sobre anuncios y programas de socios en serpmonn.ru'),
        'es-419': ('Acerca de la publicidad | Serpmonn', 'Información sobre anuncios y programas de socios en el sitio serpmonn.ru'),
    }
    for loc, (title, desc) in AD.items():
        if loc not in data or 'adInfo' not in data[loc]:
            continue
        a = data[loc]['adInfo']
        a['pageTitle'] = title
        a['metaDescription'] = desc
        a['ogTitle'] = title
        a['ogDescription'] = desc
        if patch_html(html_path(loc, 'ad-info/ad-info.html'), title, desc):
            fixes.append(f'ad:{loc}')
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    # word-counter es / es-419
    wc_path = DATA / 'wordCounter.json'
    if wc_path.exists():
        data = json.loads(wc_path.read_text(encoding='utf-8'))
        WC = {
            'es': ('Contador de palabras y caracteres — Serpmonn', 'Cuenta palabras, líneas y caracteres de un texto'),
            'es-419': ('Contador de palabras/caracteres — Serpmonn', 'Cuenta palabras, líneas y caracteres en tu texto'),
            'pt-br': ('Contador de palavras/caracteres — Serpmonn', 'Conte palavras, linhas e caracteres em um texto'),
            'pt-pt': ('Contador de palavras e caracteres — Serpmonn', 'Conte palavras, linhas e caracteres num texto'),
        }
        for loc, (title, desc) in WC.items():
            if loc not in data:
                continue
            meta = data[loc].get('meta') or data[loc]
            if isinstance(data[loc].get('meta'), dict):
                data[loc]['meta']['title'] = title
                data[loc]['meta']['description'] = desc
            if patch_html(html_path(loc, 'tools/marketing/word-counter.html'), title, desc):
                fixes.append(f'wc:{loc}')
        wc_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    return fixes


def main():
    print('poleznoe html', update_poleznoe())
    print('json guide html', update_json_guide())
    fixes = uniquify_pairs()
    print('pair fixes', len(fixes), fixes)
    print('done')


if __name__ == '__main__':
    main()
