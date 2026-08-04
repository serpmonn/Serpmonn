#!/usr/bin/env python3
"""Translate remaining game/tool pageTitle + metaDescription per locale.
Updates assembly/site/_data JSON and live frontend HTML.
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

# Each game: locale -> (title_without_brand, description)
# Final title = f"{name} — {brand}"

SNAKE = {
'en': ('Snake', 'Classic Snake: collect as many apples as you can and avoid collisions.'),
'ru': ('Змейка', 'Классическая игра Змейка: собери как можно больше яблок, избегай столкновений.'),
'de': ('Snake', 'Klassisches Snake-Spiel: Sammle so viele Äpfel wie möglich und vermeide Kollisionen.'),
'fr': ('Serpent', 'Jeu classique du Serpent : collectez un maximum de pommes et évitez les collisions.'),
'es': ('Serpiente', 'Juego clásico de la Serpiente: recoge tantas manzanas como puedas y evita choques.'),
'es-419': ('Serpiente', 'Juego clásico de la Serpiente: junta manzanas y evita chocar.'),
'it': ('Snake', 'Snake classico: raccogli più mele possibile ed evita le collisioni.'),
'pt-br': ('Cobrinha', 'Jogo clássico da Cobrinha: colete o máximo de maçãs e evite colisões.'),
'pt-pt': ('Cobra', 'Jogo clássico da Cobra: recolha o máximo de maçãs e evite colisões.'),
'pl': ('Wąż', 'Klasyczny Wąż: zbieraj jak najwięcej jabłek i unikaj kolizji.'),
'nl': ('Snake', 'Klassieke Snake: verzamel zoveel mogelijk appels en vermijd botsingen.'),
'tr': ('Yılan', 'Klasik Yılan oyunu: olabildiğince elma toplayın ve çarpışmalardan kaçının.'),
'be': ('Змейка', 'Класічная гульня Змейка: збярыце як мага больш яблыкаў і пазбягайце сутыкненняў.'),
'bg': ('Змия', 'Класическа игра Змия: събирайте колкото се може повече ябълки и избягвайте сблъсъци.'),
'cs': ('Had', 'Klasický Had: sbírejte co nejvíce jablek a vyhýbejte se srážkám.'),
'da': ('Slange', 'Klassisk Snake: saml så mange æbler som muligt og undgå sammenstød.'),
'nb': ('Slange', 'Klassisk Snake: samle så mange epler som mulig og unngå kollisjoner.'),
'sv': ('Orm', 'Klassisk Snake: samla så många äpplen som möjligt och undvik kollisioner.'),
'fi': ('Käärme', 'Klassinen Snake: kerää mahdollisimman monta omenaa ja vältä törmäyksiä.'),
'el': ('Φίδι', 'Κλασικό Snake: μαζέψτε όσο περισσότερα μήλα μπορείτε και αποφύγετε συγκρούσεις.'),
'hu': ('Kígyó', 'Klasszikus Snake: gyűjts minél több almát, és kerüld az ütközéseket.'),
'ro': ('Șarpe', 'Joc clasic Snake: adună cât mai multe mere și evită coliziunile.'),
'sr': ('Змија', 'Класична игра Змија: скупите што више јабука и избегавајте сударе.'),
'ar': ('الثعبان', 'لعبة الثعبان الكلاسيكية: اجمع أكبر عدد من التفاح وتجنب الاصطدامات.'),
'fa': ('مار', 'بازی کلاسیک مار: تا جایی که می‌توانید سیب جمع کنید و از برخورد بپرهیزید.'),
'he': ('נחש', 'נחש קלאסי: אספו כמה שיותר תפוחים והימנעו מהתנגשויות.'),
'hi': ('साँप', 'क्लासिक साँप खेल: जितने हो सकें सेब इकट्ठा करें और टकराव से बचें।'),
'bn': ('সাপ', 'ক্লাসিক স্নেক গেম: যত পারেন আপেল সংগ্রহ করুন এবং সংঘর্ষ এড়ান।'),
'ur': ('سانپ', 'کلاسک سانپ گیم: جتنے ہو سکیں سیب جمع کریں اور تصادم سے بچیں۔'),
'ps': ('مار', 'کلاسیک مار لوبه: څومره چې کولی شئ مڼې راټول کړئ او له ټکر ډډه وکړئ.'),
'sd': ('نانگ', 'ڪلاسيڪل سانپ راند: جيترو ٿي سگهي صوف گڏ ڪريو ۽ ٽڪراءُ کان بچو.'),
'ug': ('يىلان', 'كىلاسىك يىلان ئويۇنى: ئالمىنى ئىمكانقەدەر كۆپ توپلاڭ، سوقۇلۇشتىن ساقلىنىڭ.'),
'ku-arab': ('مار', 'یاری کلاسیکی مار: هەتا دەتوانیت سێو کۆبکەرەوە و دووربە لە پێکدادان.'),
'ks': ('سۄرُپ', 'کلاسک سنیٖک گیم: یتھے کھۄتہٕ زیادہ سیب جمع کٔرِو تہٕ ٹکرۍ نِش بچِو.'),
'dv': ('ހަރުފަތު', 'ކްލާސިކް ސްނޭކް: އެޕަލް ގިނައިން ހޯދާށެވެ. ޖެހުން ދޫކޮށްލާށެވެ.'),
'az': ('İlan', 'Klassik İlan oyunu: mümkün qədər alma toplayın və toqquşmadan yayın.'),
'kk': ('Жылан', 'Классикалық Жылан ойыны: мүмкіндігінше алма жинап, соқтығысудан сақтаныңыз.'),
'uz': ('Ilon', 'Klassik Ilon o‘yini: imkon qadar olma yig‘ing va to‘qnashuvdan saqlaning.'),
'hy': ('Օձ', 'Դասական Օձ խաղ՝ հավաքեք որքան հնարավոր է խնձոր և խուսափեք բախումներից։'),
'ka': ('გველი', 'კლასიკური გველი: შეაგროვეთ რაც შეიძლება მეტი ვაშლი და აარიდეთ შეჯახებები.'),
'ja': ('スネーク', 'クラシックなスネークゲーム：リンゴをたくさん集め、衝突を避けましょう。'),
'ko': ('스네이크', '클래식 스네이크: 사과를 최대한 모으고 충돌을 피하세요.'),
'zh-cn': ('贪吃蛇', '经典贪吃蛇：尽可能多地收集苹果并避免碰撞。'),
'th': ('งู', 'เกมงูคลาสสิก: เก็บแอปเปิลให้ได้มากที่สุดและหลีกเลี่ยงการชน'),
'vi': ('Rắn', 'Rắn cổ điển: thu thập càng nhiều táo càng tốt và tránh va chạm.'),
'id': ('Ular', 'Game Ular klasik: kumpulkan sebanyak mungkin apel dan hindari tabrakan.'),
'ms': ('Ular', 'Permainan Ular klasik: kumpul sebanyak mungkin epal dan elak perlanggaran.'),
'fil': ('Ahas', 'Klasikong Snake: mangolekta ng maraming mansanas at iwasan ang banggaan.'),
'yi': ('שלאַנג', 'קלאַסישע שלאַנג: זאַמלט אַזוי פיל עפּל ווי מעגלעך און מיידט צוזאַמענשטויסן.'),
}

BREAKOUT = {
'en': ('Breakout', 'Breakout: bounce the ball with your paddle and break blocks to score points.'),
'ru': ('Арканоид', 'Арканоид (Breakout): отбивай мяч платформой и разбивай блоки, набирая очки.'),
'de': ('Breakout', 'Breakout: Schlage den Ball mit dem Schläger zurück und zerstöre Blöcke für Punkte.'),
'fr': ('Casse-briques', 'Casse-briques : renvoyez la balle avec la raquette et cassez les briques pour marquer.'),
'es': ('Breakout', 'Breakout: rebota la pelota con la paleta y rompe bloques para sumar puntos.'),
'es-419': ('Breakout', 'Breakout: rebota la pelota con la paleta y rompe bloques para sumar puntos.'),
'it': ('Breakout', 'Breakout: rimbalza la palla con la racchetta e rompi i blocchi per fare punti.'),
'pt-br': ('Breakout', 'Breakout: rebate a bola com a plataforma e quebre blocos para marcar pontos.'),
'pt-pt': ('Breakout', 'Breakout: ressalte a bola com a plataforma e parta blocos para marcar pontos.'),
'pl': ('Arkanoid', 'Arkanoid: odbijaj piłkę platformą i niszcz bloki, zbierając punkty.'),
'nl': ('Breakout', 'Breakout: kaats de bal met je paddle terug en breek blokken voor punten.'),
'tr': ('Breakout', 'Breakout: topu raketle sektirin ve puan için tuğlaları kırın.'),
'be': ('Арканоід', 'Арканоід: адбівайце мяч платформай і разбівайце блокі, набіраючы ачкі.'),
'bg': ('Арканоид', 'Арканоид: отбивайте топката с платформата и чупете блокове за точки.'),
'cs': ('Breakout', 'Breakout: odrážejte míček pálkou a rozbíjejte bloky pro body.'),
'da': ('Breakout', 'Breakout: send bolden tilbage med batsen og knus blokke for point.'),
'nb': ('Breakout', 'Breakout: sprett ballen med racketen og knus blokker for poeng.'),
'sv': ('Breakout', 'Breakout: studsa bollen med racketen och krossa block för poäng.'),
'fi': ('Breakout', 'Breakout: kimpouta pallo mailalla ja riko lohkoja pisteiden saamiseksi.'),
'el': ('Breakout', 'Breakout: χτυπήστε την μπάλα με την πλατφόρμα και σπάστε τουβλάκια για πόντους.'),
'hu': ('Breakout', 'Breakout: pattintsd vissza a labdát az ütővel, és törj blokkokat pontokért.'),
'ro': ('Breakout', 'Breakout: lovește mingea cu platforma și sparge blocuri pentru puncte.'),
'sr': ('Арканоид', 'Арканоид: одбијајте лопту платформом и разбијајте блокове за поене.'),
'ar': ('كسر الطوب', 'كسر الطوب: ارتد بالكرة بالمضرب واكسر الكتل لجمع النقاط.'),
'fa': ('آرکانوئید', 'آرکانوئید: توپ را با پدال برگردانید و برای امتیاز آجرها را بشکنید.'),
'he': ('Breakout', 'Breakout: הקפיצו את הכדור עם המחבט ושברו לבנים לנקודות.'),
'hi': ('ब्रेकआउट', 'ब्रेकआउट: पैडल से गेंद उछालें और अंकों के लिए ब्लॉक तोड़ें।'),
'bn': ('ব্রেকআউট', 'ব্রেকআউট: প্যাডেল দিয়ে বল বাউন্স করুন এবং পয়েন্টের জন্য ব্লক ভাঙুন।'),
'ur': ('بریک آؤٹ', 'بریک آؤٹ: پیڈل سے گیند اچھالیں اور اسکور کے لیے بلاکس توڑیں۔'),
'ps': ('بریک‌اوت', 'بریک‌اوت: توپ د پیډل سره ووهئ او د نمرو لپاره بلاکونه مات کړئ.'),
'sd': ('بريڪ آئوٽ', 'بريڪ آئوٽ: پيڊل سان بال موٽايو ۽ اسڪور لاءِ بلاڪ ٽوڙيو.'),
'ug': ('خىش قېقىش', 'خىش قېقىش: توپنى تاختا بىلەن قايتۇرۇپ، نومۇر ئۈچۈن خىشلارنى چېقىڭ.'),
'ku-arab': ('شکاندنی خشت', 'شکاندنی خشت: تۆپەکە بە ڕاکێت بگەڕێنەوە و بۆ خاڵ خشتەکان بشکێنە.'),
'ks': ('بریک آؤٹ', 'بریک آؤٹ: پیڈل سۭتۍ گیند واپس کٔرِو تہٕ پوائنٹن خٲطرٕ بلاک ژٔٹِو.'),
'dv': ('ބްރޭކްއައުޓް', 'ބްރޭކްއައުޓް: ޕެޑަލްން ބޯލް އަނގުލާށެވެ. ޕޮއިންޓަށް ބްލޮކް ފައިބާށެވެ.'),
'az': ('Breakout', 'Breakout: topu raketlə qaytarın və xal üçün blokları sındırın.'),
'kk': ('Арканоид', 'Арканоид: допты платформамен қайтарып, ұпай үшін блоктарды сындырыңыз.'),
'uz': ('Arkanoid', 'Arkanoid: to‘pni platforma bilan qaytaring va ochko uchun bloklarni sindiring.'),
'hy': ('Արկանոիդ', 'Արկանոիդ՝ հետ մղեք գնդակը հարթակով և կոտրեք բլոկները միավորների համար։'),
'ka': ('არკანოიდი', 'არკანოიდი: დააბრუნეთ ბურთი პლატფორმით და გაანადგურეთ ბლოკები ქულებისთვის.'),
'ja': ('ブロック崩し', 'ブロック崩し：パドルでボールを返し、ブロックを壊して得点しよう。'),
'ko': ('브레이크아웃', '브레이크아웃: 패들로 공을 튕겨 블록을 깨고 점수를 얻으세요.'),
'zh-cn': ('打砖块', '打砖块：用挡板弹回球并击碎砖块得分。'),
'th': ('เบรกเอาต์', 'เบรกเอาต์: เด้งลูกบอลด้วยไม้ตีและทำลายบล็อกเพื่อคะแนน'),
'vi': ('Phá gạch', 'Phá gạch: đỡ bóng bằng thanh và phá khối để ghi điểm.'),
'id': ('Breakout', 'Breakout: pantulkan bola dengan paddle dan hancurkan blok untuk skor.'),
'ms': ('Breakout', 'Breakout: Pantulkan bola dengan paddle dan pecahkan blok untuk mata.'),
'fil': ('Breakout', 'Breakout: i-bounce ang bola gamit ang paddle at basagin ang mga bloke para sa puntos.'),
'yi': ('ברעקאַוט', 'ברעקאַוט: קלאַפּט דעם באַל מיטן פּעדל צוריק און צעברעכט בלאָקן פֿאַר פּונקטן.'),
}

COINS = {
'en': ('Coins', 'Collect coins within the time limit while avoiding obstacles. A simple arcade game.'),
'ru': ('Монетки', 'Собирай монетки за отведённое время, уклоняясь от препятствий. Простая аркада.'),
'de': ('Münzen', 'Sammle Münzen in der vorgegebenen Zeit und weiche Hindernissen aus. Ein einfaches Arcade-Spiel.'),
'fr': ('Pièces', 'Collectez des pièces dans le temps imparti en évitant les obstacles. Un jeu d’arcade simple.'),
'es': ('Monedas', 'Recoge monedas a tiempo evitando obstáculos. Un arcade sencillo.'),
'es-419': ('Monedas', 'Junta monedas a tiempo evitando obstáculos. Un arcade sencillo.'),
'it': ('Monete', 'Raccogli monete entro il tempo evitando ostacoli. Un arcade semplice.'),
'pt-br': ('Moedinhas', 'Colete moedas no tempo limite evitando obstáculos. Um arcade simples.'),
'pt-pt': ('Moedas', 'Recolha moedas no tempo limite evitando obstáculos. Um arcade simples.'),
'pl': ('Monetki', 'Zbieraj monetki w limicie czasu, unikając przeszkód. Prosta arkada.'),
'nl': ('Munten', 'Verzamel munten binnen de tijdlimiet en ontwijk obstakels. Een eenvoudig arcadespel.'),
'tr': ('Paralar', 'Süre içinde engellerden kaçınarak paraları toplayın. Basit bir arcade oyunu.'),
'be': ('Манеткі', 'Збірайце манеткі за адведзены час, ухіляючыся ад перашкод. Простая аркада.'),
'bg': ('Монети', 'Събирайте монети в зададеното време, избягвайки препятствия. Проста аркада.'),
'cs': ('Mince', 'Sbírejte mince v časovém limitu a vyhýbejte se překážkám. Jednoduchá arkáda.'),
'da': ('Mønter', 'Saml mønter inden for tidsgrænsen og undgå forhindringer. Et simpelt arkadespil.'),
'nb': ('Mynter', 'Samle mynter innen tidsfristen og unngå hinder. Et enkelt arkadespill.'),
'sv': ('Mynt', 'Samla mynt inom tidsgränsen och undvik hinder. Ett enkelt arkadspel.'),
'fi': ('Kolikot', 'Kerää kolikoita aikarajan sisällä ja väistä esteitä. Yksinkertainen peli.'),
'el': ('Νομίσματα', 'Μαζέψτε νομίσματα εντός χρόνου αποφεύγοντας εμπόδια. Απλό arcade.'),
'hu': ('Érmék', 'Gyűjts érméket időre, kerülve az akadályokat. Egyszerű arcade játék.'),
'ro': ('Monede', 'Adună monede în timpul limită evitând obstacolele. Un arcade simplu.'),
'sr': ('Ночићи', 'Скупљајте новчиће у задатом времену избегавајући препреке. Једноставна аркада.'),
'ar': ('العملات', 'اجمع العملات خلال الوقت المحدد وتجنب العوائق. لعبة أركيد بسيطة.'),
'fa': ('سکه‌ها', 'در زمان مشخص سکه جمع کنید و از موانع دوری کنید. یک آرکید ساده.'),
'he': ('מטבעות', 'אספו מטבעות במגבלת הזמן והימנעו ממכשולים. ארקייד פשוט.'),
'hi': ('सिक्के', 'समय सीमा में बाधाओं से बचते हुए सिक्के इकट्ठा करें। सरल आर्केड गेम।'),
'bn': ('কয়েন', 'সময়সীমার মধ্যে বাধা এড়িয়ে কয়েন সংগ্রহ করুন। সহজ আর্কেড গেম।'),
'ur': ('سکے', 'وقت کی حد میں رکاوٹوں سے بچتے ہوئے سکے جمع کریں۔ سادہ آرکیڈ گیم۔'),
'ps': ('سکې', 'په ټاکلي وخت کې له خنډونو ډډه وکړئ او سکې راټول کړئ. ساده آرکیډ لوبه.'),
'sd': ('سڪا', 'وقت جي حد ۾ رڪاوٽن کان بچندي سڪا گڏ ڪريو. سادي آرکيڊ راند.'),
'ug': ('تەڭگە', 'بەلگىلەنگەن ۋاقىتتا توسالغۇدىن ساقلىنىپ تەڭگە توپلاڭ. ئاددىي ئاركاد ئويۇنى.'),
'ku-arab': ('دراو', 'لە کاتی دیاریکراودا دراو کۆبکەرەوە و دووربە لە بەربەست. یاری ئارکەیدی سادە.'),
'ks': ('سِکہٕ', 'ؤقت کِس حدس منز رکاوٹو نِش بٔچِتھ سکہٕ جمع کٔرِو. سادٕ آرکیڈ گیم.'),
'dv': ('ކޮއިން', 'ވަގުތުގެ ހަދަކުން ކޮއިން ހޯދާށެވެ. އޮބްސްޓަކަލް ދޫކޮށްލާށެވެ.'),
'az': ('Qəpiklər', 'Vaxt ərzində maneələrdən yayınaraq qəpik toplayın. Sadə arkada oyunu.'),
'kk': ('Тиындар', 'Берілген уақытта кедергілерден сақтанып тиын жинаңыз. Қарапайым аркада.'),
'uz': ('Tangalar', 'Belgilangan vaqtda to‘siqlardan qochib tanga yig‘ing. Oddiy arkada.'),
'hy': ('Մետաղադրամներ', 'Հավաքեք մետաղադրամներ ժամանակի սահմանում՝ խուսափելով խոչընդոտներից։ Պարզ արկադա։'),
'ka': ('მონეტები', 'შეაგროვეთ მონეტები დროის ლიმიტში დაბრკოლებების თავიდან აცილებით. მარტივი არკადა.'),
'ja': ('コイン集め', '制限時間内に障害を避けてコインを集めよう。シンプルなアーケードゲーム。'),
'ko': ('코인', '제한 시간 안에 장애물을 피하며 코인을 모으세요. 간단한 아케이드 게임.'),
'zh-cn': ('金币', '在限时内躲避障碍并收集金币。简单的街机游戏。'),
'th': ('เหรียญ', 'เก็บเหรียญภายในเวลาที่กำหนดและหลบสิ่งกีดขวาง เกมอาร์เคดง่ายๆ'),
'vi': ('Xu', 'Nhặt xu trong thời gian giới hạn và tránh chướng ngại vật. Arcade đơn giản.'),
'id': ('Koin', 'Kumpulkan koin dalam batas waktu sambil menghindari rintangan. Arcade sederhana.'),
'ms': ('Syiling', 'Kumpul syiling dalam had masa sambil elak halangan. Permainan arkad ringkas.'),
'fil': ('Barya', 'Mangolekta ng barya sa loob ng oras habang iniiwasan ang hadlang. Simpleng arcade.'),
'yi': ('מטבעות', 'זאַמלט מטבעות אין דער צייט־גרענעץ און מיידט שטערונגען. אַ פּשוטע אַרקייד.'),
}

FIFTEEN = {
'en': ('Fifteen Puzzle', 'Classic 15 Puzzle: arrange tiles 1–15 in order. Train your memory and logic.'),
'ru': ('Пятнашки', 'Классическая головоломка 15 Puzzle: собери плитки 1–15 по порядку. Тренируйте память и логику.'),
'de': ('15-Puzzle', 'Klassisches 15-Puzzle: Ordne die Kacheln 1–15. Trainiere Gedächtnis und Logik.'),
'fr': ('Taquin', 'Taquin classique : rangez les tuiles 1–15. Entraînez mémoire et logique.'),
'es': ('Puzzle 15', 'Puzzle 15 clásico: ordena las fichas 1–15. Entrena memoria y lógica.'),
'es-419': ('Puzzle 15', 'Puzzle 15 clásico: ordena las fichas 1–15. Entrena memoria y lógica.'),
'it': ('Puzzle 15', 'Puzzle 15 classico: ordina le tessere 1–15. Allena memoria e logica.'),
'pt-br': ('Quebra-cabeça 15', 'Quebra-cabeça 15 clássico: organize as peças 1–15. Treine memória e lógica.'),
'pt-pt': ('Puzzle 15', 'Puzzle 15 clássico: organize as peças 1–15. Treine memória e lógica.'),
'pl': ('Piętnastka', 'Klasyczna Piętnastka: ułóż płytki 1–15. Trenuj pamięć i logikę.'),
'nl': ('Schuifpuzzel', 'Klassieke 15-puzzel: leg tegels 1–15 op volgorde. Train geheugen en logica.'),
'tr': ('15 Puzzle', 'Klasik 15 Puzzle: 1–15 karolarını sıralayın. Hafıza ve mantığı geliştirin.'),
'be': ('Пятнашкі', 'Класічная галаваломка Пятнашкі: сабярыце пліткі 1–15 па парадку. Треніруйце памяць і логіку.'),
'bg': ('Петнайсет', 'Класически пъзел 15: подредете плочките 1–15. Тренирайте памет и логика.'),
'cs': ('Patnáctka', 'Klasická patnáctka: seřaďte dlaždice 1–15. Trénujte paměť a logiku.'),
'da': ('15-puslespil', 'Klassisk 15-puslespil: ordn brikkerne 1–15. Træn hukommelse og logik.'),
'nb': ('15-puslespill', 'Klassisk 15-puslespill: ordne brikkene 1–15. Tren hukommelse og logikk.'),
'sv': ('15-pussel', 'Klassiskt 15-pussel: ordna brickorna 1–15. Träna minne och logik.'),
'fi': ('15-peli', 'Klassinen 15-peli: järjestä laatat 1–15. Harjoita muistia ja logiikkaa.'),
'el': ('Παζλ 15', 'Κλασικό παζλ 15: τακτοποιήστε τα πλακίδια 1–15. Εξασκήστε μνήμη και λογική.'),
'hu': ('15-ös kirakó', 'Klasszikus 15-ös kirakó: rakd sorba az 1–15 csempéket. Edzd a memóriát és a logikát.'),
'ro': ('Puzzle 15', 'Puzzle 15 clasic: aranjează piesele 1–15. Antrenează memoria și logica.'),
'sr': ('Слагалица 15', 'Класична слагалица 15: поређајте плочице 1–15. Тренирајте памћење и логику.'),
'ar': ('لغز الـ15', 'لغز الـ15 الكلاسيكي: رتّب البلاطات من 1 إلى 15. درّب ذاكرتك ومنطقك.'),
'fa': ('پازل ۱۵', 'پازل کلاسیک ۱۵: کاشی‌های ۱ تا ۱۵ را مرتب کنید. حافظه و منطق را تقویت کنید.'),
'he': ('פאזל 15', 'פאזל 15 קלאסי: סדרו את האריחים 1–15. אמנו זיכרון ולוגיקה.'),
'hi': ('15 पज़ल', 'क्लासिक 15 पज़ल: टाइल 1–15 क्रम में लगाएँ। याददाश्त और तर्क को प्रशिक्षित करें।'),
'bn': ('১৫ পাজল', 'ক্লাসিক ১৫ পাজল: ১–১৫ টালি সাজান। স্মৃতি ও যুক্তি অনুশীলন করুন।'),
'ur': ('15 پہیلی', 'کلاسک 15 پہیلی: ٹائلیں 1–15 ترتیب دیں۔ یادداشت اور منطق کو بہتر بنائیں۔'),
'ps': ('۱۵ معما', 'کلاسیک ۱۵ معما: ټایلونه ۱–۱۵ ترتیب کړئ. حافظه او منطق وروزلئ.'),
'sd': ('15 پہيلي', 'ڪلاسيڪل 15 پہيلي: ٽائلون 1–15 ترتيب ڏيو. يادگيري ۽ منطق مشق ڪريو.'),
'ug': ('15 تېپىشماق', 'كىلاسىك 15 تېپىشماق: 1–15 كاھىشلارنى تەرتىپلەڭ. ئەستە تۇتۇش ۋە لوگىكىنى مەشىق قىلىڭ.'),
'ku-arab': ('مەتەڵی ١٥', 'مەتەڵی کلاسیکی ١٥: تابلۆکانی ١–١٥ ڕێکبخە. بیرەوەری و لۆژیک ڕابهێنە.'),
'ks': ('15 پزل', 'کلاسک 15 پزل: ٹایِل 1–15 ترتیب دِیو. یادداشت تہٕ منطق مشق کٔرِو.'),
'dv': ('15 ޕަޒަލް', 'ކްލާސިކް 15 ޕަޒަލް: 1–15 ޓައިލް ތަރުތީބުކުރާށެވެ.'),
'az': ('15 Tapmaca', 'Klassik 15 tapmaca: 1–15 plitkaları sıralayın. Yaddaş və məntiqi məşq edin.'),
'kk': ('15 жұмбақ', 'Классикалық 15 жұмбақ: 1–15 тақтайшаларды реттеңіз. Жады мен логиканы жаттықтырыңыз.'),
'uz': ('15 boshqotirma', 'Klassik 15 boshqotirma: 1–15 plitkalarni tartiblang. Xotira va mantiqni mashq qiling.'),
'hy': ('15 հանելուկ', 'Դասական 15 հանելուկ՝ դասավորեք սալիկները 1–15։ Մարզեք հիշողությունն ու տրամաբանությունը։'),
'ka': ('15 თავსატეხი', 'კლასიკური 15 თავსატეხი: დაალაგეთ ფილები 1–15. ივარჯიშეთ მეხსიერება და ლოგიკა.'),
'ja': ('15パズル', 'クラシックな15パズル：タイル1〜15を並べよう。記憶力と論理を鍛えよう。'),
'ko': ('15 퍼즐', '클래식 15 퍼즐: 타일 1–15을 순서대로 맞추세요. 기억력과 논리를 훈련하세요.'),
'zh-cn': ('十五拼图', '经典十五拼图：按顺序排列 1–15。锻炼记忆与逻辑。'),
'th': ('ปริศนา 15', 'ปริศนา 15 คลาสสิก: เรียงแผ่น 1–15 ฝึกความจำและตรรกะ'),
'vi': ('Đố 15', 'Đố 15 cổ điển: xếp ô 1–15 theo thứ tự. Luyện trí nhớ và logic.'),
'id': ('Puzzle 15', 'Puzzle 15 klasik: susun ubin 1–15. Latih memori dan logika.'),
'ms': ('Puzzle 15', 'Puzzle 15 klasik: susun jubin 1–15. Latih memori dan logik.'),
'fil': ('15 Puzzle', 'Klasikong 15 Puzzle: ayusin ang tiles 1–15. Sanayin ang memorya at lohika.'),
'yi': ('15 פּאַזל', 'קלאַסישער 15 פּאַזל: אָרדענט די קאַכלען 1–15. טריינען זכּרון און לאָגיק.'),
}

MINES = {
'en': ('Minesweeper', 'Minesweeper: clear all safe cells. 10×10, 15 mines, first click is safe, right-click to flag.'),
'ru': ('Сапёр', 'Сапёр: открой все клетки без мин. 10×10, 15 мин, первый клик безопасный, флаги правой кнопкой.'),
'de': ('Minesweeper', 'Minesweeper: Öffne alle sicheren Felder. 10×10, 15 Minen, erster Klick ist sicher, Rechtsklick zum Markieren.'),
'fr': ('Démineur', 'Démineur : ouvrez toutes les cases sûres. 10×10, 15 mines, premier clic sûr, clic droit pour marquer.'),
'es': ('Buscaminas', 'Buscaminas: abre todas las casillas seguras. 10×10, 15 minas, el primer clic es seguro, clic derecho para marcar.'),
'es-419': ('Buscaminas', 'Buscaminas: abre todas las casillas seguras. 10×10, 15 minas, el primer clic es seguro.'),
'it': ('Campo minato', 'Campo minato: apri tutte le celle sicure. 10×10, 15 mine, il primo clic è sicuro, tasto destro per bandierina.'),
'pt-br': ('Campo minado', 'Campo minado: abra todas as células seguras. 10×10, 15 minas, o primeiro clique é seguro.'),
'pt-pt': ('Campo minado', 'Campo minado: abra todas as células seguras. 10×10, 15 minas, o primeiro clique é seguro.'),
'pl': ('Saper', 'Saper: odkryj wszystkie bezpieczne pola. 10×10, 15 min, pierwszy klik jest bezpieczny.'),
'nl': ('Mijnenveger', 'Mijnenveger: open alle veilige vakjes. 10×10, 15 mijnen, eerste klik is veilig.'),
'tr': ('Mayın Tarlası', 'Mayın Tarlası: tüm güvenli hücreleri açın. 10×10, 15 mayın, ilk tık güvenli.'),
'be': ('Сапёр', 'Сапёр: адкрыйце ўсе бяспечныя клеткі. 10×10, 15 мін, першы клік бяспечны.'),
'bg': ('Минотьор', 'Минотьор: отворете всички безопасни клетки. 10×10, 15 мини, първият клик е безопасен.'),
'cs': ('Hledání min', 'Hledání min: otevřete všechna bezpečná pole. 10×10, 15 min, první klik je bezpečný.'),
'da': ('Minestryger', 'Minestryger: åbn alle sikre felter. 10×10, 15 miner, første klik er sikkert.'),
'nb': ('Minesveiper', 'Minesveiper: åpne alle sikre ruter. 10×10, 15 miner, første klikk er trygt.'),
'sv': ('Minesweeper', 'Minesweeper: öppna alla säkra rutor. 10×10, 15 minor, första klicket är säkert.'),
'fi': ('Miinaharava', 'Miinaharava: avaa kaikki turvalliset ruudut. 10×10, 15 miinaa, ensimmäinen klikkaus on turvallinen.'),
'el': ('Ναρκαλιευτής', 'Ναρκαλιευτής: ανοίξτε όλα τα ασφαλή κελιά. 10×10, 15 νάρκες, το πρώτο κλικ είναι ασφαλές.'),
'hu': ('Aknakereső', 'Aknakereső: nyisd ki az összes biztonságos mezőt. 10×10, 15 akna, az első kattintás biztonságos.'),
'ro': ('Deminor', 'Deminor: deschide toate celulele sigure. 10×10, 15 mine, primul clic e sigur.'),
'sr': ('Минер', 'Минер: отворите сва безбедна поља. 10×10, 15 мина, први клик је безбедан.'),
'ar': ('كاسحة الألغام', 'كاسحة الألغام: افتح كل الخلايا الآمنة. 10×10، 15 لغمًا، النقرة الأولى آمنة.'),
'fa': ('مین‌روب', 'مین‌روب: همه خانه‌های امن را باز کنید. ۱۰×۱۰، ۱۵ مین، اولین کلیک امن است.'),
'he': ('שולה מוקשים', 'שולה מוקשים: פתחו את כל התאים הבטוחים. 10×10, 15 מוקשים, הלחיצה הראשונה בטוחה.'),
'hi': ('माइनस्वीपर', 'माइनस्वीपर: सभी सुरक्षित सेल खोलें। 10×10, 15 माइन, पहला क्लिक सुरक्षित।'),
'bn': ('মাইনসুইপার', 'মাইনসুইপার: সব নিরাপদ ঘর খুলুন। ১০×১০, ১৫ মাইন, প্রথম ক্লিক নিরাপদ।'),
'ur': ('مائن سویپر', 'مائن سویپر: تمام محفوظ خانے کھولیں۔ 10×10، 15 مائنیں، پہلی کلک محفوظ ہے۔'),
'ps': ('ماین پاکوونکی', 'ماین پاکوونکی: ټول خوندي حجرې خلاص کړئ. ۱۰×۱۰، ۱۵ ماینونه، لومړی کلک خوندي دی.'),
'sd': ('مائن سويپر', 'مائن سويپر: سڀ محفوظ سيل کوليو. 10×10، 15 مائن، پهريون ڪلڪ محفوظ آهي.'),
'ug': ('مىنا تازىلىغۇچ', 'مىنا تازىلىغۇچ: بارلىق بىخەتەر كاتەكلەرنى ئېچىڭ. 10×10، 15 مىنا، تۇنجى چېكىش بىخەتەر.'),
'ku-arab': ('پاککەرەوەی مین', 'پاککەرەوەی مین: هەموو خانە سەلامەتەکان بکەرەوە. ١٠×١٠، ١٥ مین، یەکەم کرتە سەلامەتە.'),
'ks': ('مائن سویپر', 'مائن سویپر: تمام محفوظ خانہٕ کھولِو. 10×10، 15 مائن، گۄڈنِچ کلک محفوظ چھُ.'),
'dv': ('މައިންސްވީޕަރ', 'މައިންސްވީޕަރ: އެންމެހާ ސޭފް ސެލް ހުޅުވާށެވެ. 10×10، 15 މައިން.'),
'az': ('Minalayıcı', 'Minalayıcı: bütün təhlükəsiz xanaları açın. 10×10, 15 mina, ilk klik təhlükəsizdir.'),
'kk': ('Сапер', 'Сапер: барлық қауіпсіз ұяшықтарды ашыңыз. 10×10, 15 мина, бірінші басу қауіпсіз.'),
'uz': ('Syoper', 'Syoper: barcha xavfsiz kataklarni oching. 10×10, 15 mina, birinchi bosish xavfsiz.'),
'hy': ('Սապյոր', 'Սապյոր՝ բացեք բոլոր անվտանգ վանդակները։ 10×10, 15 ական, առաջին սեղմումը անվտանգ է։'),
'ka': ('საპიორი', 'საპიორი: გახსენით ყველა უსაფრთხო უჯრა. 10×10, 15 ნაღმი, პირველი დაწკაპუნება უსაფრთხოა.'),
'ja': ('マインスイーパー', 'マインスイーパー：安全なマスをすべて開けよう。10×10、地雷15、最初のクリックは安全。'),
'ko': ('지뢰 찾기', '지뢰 찾기: 안전한 칸을 모두 여세요. 10×10, 지뢰 15개, 첫 클릭은 안전합니다.'),
'zh-cn': ('扫雷', '扫雷：打开所有安全格子。10×10，15 颗雷，第一次点击安全。'),
'th': ('กวาดทุ่น', 'กวาดทุ่น: เปิดช่องที่ปลอดภัยทั้งหมด 10×10, 15 ทุ่น คลิกแรกปลอดภัย'),
'vi': ('Dò mìn', 'Dò mìn: mở mọi ô an toàn. 10×10, 15 mìn, lần nhấp đầu an toàn.'),
'id': ('Minesweeper', 'Minesweeper: buka semua sel aman. 10×10, 15 ranjau, klik pertama aman.'),
'ms': ('Penyapu Lombong', 'Penyapu Lombong: buka semua sel selamat. 10×10, 15 lombong, klik pertama selamat.'),
'fil': ('Minesweeper', 'Minesweeper: buksan ang lahat ng ligtas na cell. 10×10, 15 mina, ligtas ang unang click.'),
'yi': ('מינעסוויפּער', 'מינעסוויפּער: עפֿנט אַלע זיכערע צעלן. 10×10, 15 מינעס, דער ערשטער קליק איז זיכער.'),
}

REDSQ = {
'en': ('Square Escape', "Play Square Escape! Control the character, collect bonuses and avoid collisions."),
'ru': ('Квадратное бегство', "Играйте в 'Квадратное бегство'! Управляйте персонажем, собирайте бонусы и избегайте столкновений."),
'de': ('Quadratische Flucht', 'Spiele Quadratische Flucht! Steuere deinen Charakter, sammle Boni und vermeide Kollisionen.'),
'fr': ('Fuite carrée', 'Jouez à Fuite carrée ! Contrôlez le personnage, collectez des bonus et évitez les collisions.'),
'es': ('Huida cuadrada', '¡Juega a Huida cuadrada! Controla al personaje, recoge bonos y evita choques.'),
'es-419': ('Huida cuadrada', '¡Juega a Huida cuadrada! Controla al personaje, junta bonos y evita choques.'),
'it': ('Fuga quadrata', 'Gioca a Fuga quadrata! Controlla il personaggio, raccogli bonus ed evita collisioni.'),
'pt-br': ('Fuga quadrada', 'Jogue Fuga quadrada! Controle o personagem, colete bônus e evite colisões.'),
'pt-pt': ('Fuga quadrada', 'Jogue Fuga quadrada! Controle a personagem, recolha bónus e evite colisões.'),
'pl': ('Kwadratowa ucieczka', 'Zagraj w Kwadratową ucieczkę! Steruj postacią, zbieraj bonusy i unikaj kolizji.'),
'nl': ('Vierkante ontsnapping', 'Speel Vierkante ontsnapping! Bestuur het personage, verzamel bonussen en vermijd botsingen.'),
'tr': ('Kare Kaçış', 'Kare Kaçış oyna! Karakteri kontrol edin, bonus toplayın ve çarpışmalardan kaçının.'),
'be': ('Квадратнае ўцёкі', 'Гуляйце ў Квадратнае ўцёкі! Кіруйце персанажам, збірайце бонусы і пазбягайце сутыкненняў.'),
'bg': ('Квадратно бягство', 'Играйте Квадратно бягство! Управлявайте героя, събирайте бонуси и избягвайте сблъсъци.'),
'cs': ('Čtvercový útěk', 'Hrajte Čtvercový útěk! Ovládejte postavu, sbírejte bonusy a vyhýbejte se srážkám.'),
'da': ('Kvadratflugt', 'Spil Kvadratflugt! Styr karakteren, saml bonusser og undgå sammenstød.'),
'nb': ('Kvadratflukt', 'Spill Kvadratflukt! Styr karakteren, samle bonuser og unngå kollisjoner.'),
'sv': ('Kvadratflykt', 'Spela Kvadratflykt! Styr karaktären, samla bonusar och undvik kollisioner.'),
'fi': ('Neliöpakoon', 'Pelaa Neliöpakoon! Ohjaa hahmoa, kerää bonuksia ja vältä törmäyksiä.'),
'el': ('Τετράγωνη απόδραση', 'Παίξτε Τετράγωνη απόδραση! Ελέγξτε τον χαρακτήρα, μαζέψτε μπόνους και αποφύγετε συγκρούσεις.'),
'hu': ('Négyzetes menekülés', 'Játszd a Négyzetes menekülést! Irányítsd a karaktert, gyűjts bónuszokat, kerüld az ütközéseket.'),
'ro': ('Evadare pătrată', 'Joacă Evadare pătrată! Controlează personajul, adună bonusuri și evită coliziunile.'),
'sr': ('Квадратни бег', 'Играјте Квадратни бег! Управљајте ликом, скупљајте бонусе и избегавајте сударе.'),
'ar': ('الهروب المربع', 'العب الهروب المربع! تحكم بالشخصية، اجمع المكافآت وتجنب الاصطدامات.'),
'fa': ('فرار مربعی', 'فرار مربعی بازی کنید! شخصیت را کنترل کنید، پاداش بگیرید و از برخورد بپرهیزید.'),
'he': ('בריחה מרובעת', 'שחקו בבריחה מרובעת! שלטו בדמות, אספו בונוסים והימנעו מהתנגשויות.'),
'hi': ('वर्ग पलायन', 'वर्ग पलायन खेलें! चरित्र को नियंत्रित करें, बोनस इकट्ठा करें और टकराव से बचें।'),
'bn': ('বর্গাকার পলায়ন', 'বর্গাকার পলায়ন খেলুন! চরিত্র নিয়ন্ত্রণ করুন, বোনাস সংগ্রহ করুন এবং সংঘর্ষ এড়ান।'),
'ur': ('مربع فرار', 'مربع فرار کھیلیں! کردار کو کنٹرول کریں، بونس جمع کریں اور تصادم سے بچیں۔'),
'ps': ('مربع تېښته', 'مربع تېښته ولوبئ! کرکټر کنټرول کړئ، بونس راټول کړئ او له ټکر ډډه وکړئ.'),
'sd': ('چورس فرار', 'چورس فرار کيڏيو! ڪردار ڪنٽرول ڪريو، بونس گڏ ڪريو ۽ ٽڪراءُ کان بچو.'),
'ug': ('كۋادرات قېچىش', 'كۋادرات قېچىشنى ئوينەڭ! پېرسوناژنى كونترول قىلىڭ، مۇكاپات توپلاڭ، سوقۇلۇشتىن ساقلىنىڭ.'),
'ku-arab': ('هەڵاتنی چوارگۆشە', 'یاری هەڵاتنی چوارگۆشە بکە! کەسایەتی کۆنتڕۆڵ بکە، بۆنس کۆبکەرەوە و دووربە لە پێکدادان.'),
'ks': ('مربع فرار', 'مربع فرار کٔرِو کٔھل! کریکٹَر کنٹرول کٔرِو، بونس جمع کٔرِو تہٕ ٹکرۍ نِش بچِو.'),
'dv': ('ސްކުއެއަރ އެސްކޭޕް', 'ސްކުއެއަރ އެސްކޭޕް ކުޅެށައެވެ. ކެރެކްޓަރ ކޮންޓްރޯލްކުރާށެވެ.'),
'az': ('Kvadrat qaçış', 'Kvadrat qaçış oynayın! Personaja nəzarət edin, bonus toplayın və toqquşmadan yayın.'),
'kk': ('Шаршы қашу', 'Шаршы қашуды ойнаңыз! Кейіпкерді басқарыңыз, бонус жинаңыз және соқтығысудан сақтаныңыз.'),
'uz': ('Kvadrat qochish', 'Kvadrat qochishni o‘ynang! Personajni boshqaring, bonus yig‘ing va to‘qnashuvdan saqlaning.'),
'hy': ('Քառակուսի փախուստ', 'Խաղացեք Քառակուսի փախուստ։ Կառավարեք կերպարին, հավաքեք բոնուսներ և խուսափեք բախումներից։'),
'ka': ('კვადრატული გაქცევა', 'ითამაშეთ კვადრატული გაქცევა! მართეთ პერსონაჟი, შეაგროვეთ ბონუსები და აარიდეთ შეჯახებები.'),
'ja': ('スクエア脱出', 'スクエア脱出をプレイ！キャラを操作し、ボーナスを集め、衝突を避けよう。'),
'ko': ('스퀘어 탈출', '스퀘어 탈출을 플레이하세요! 캐릭터를 조작하고 보너스를 모으며 충돌을 피하세요.'),
'zh-cn': ('方块逃亡', '玩方块逃亡！操控角色、收集奖励并避免碰撞。'),
'th': ('หนีสี่เหลี่ยม', 'เล่นหนีสี่เหลี่ยม! ควบคุมตัวละคร เก็บโบนัส และหลีกเลี่ยงการชน'),
'vi': ('Vuông thoát hiểm', 'Chơi Vuông thoát hiểm! Điều khiển nhân vật, thu thưởng và tránh va chạm.'),
'id': ('Kabur Kotak', 'Mainkan Kabur Kotak! Kendalikan karakter, kumpulkan bonus, dan hindari tabrakan.'),
'ms': ('Lari Segi Empat', 'Main Lari Segi Empat! Kawal watak, kumpul bonus dan elak perlanggaran.'),
'fil': ('Square Escape', 'Maglaro ng Square Escape! Kontrolin ang karakter, mangolekta ng bonus, at iwasan ang banggaan.'),
'yi': ('קוואַדראַט אַנטלויף', 'שפּילט קוואַדראַט אַנטלויף! קאָנטראָלירט דעם כאַראַקטער, זאַמלט בונוסן און מיידט צוזאַמענשטויסן.'),
}

REDSQ2 = {
'en': ('Falling Blue Squares', 'Test your reflexes in a game where you dodge falling shapes!'),
'ru': ('Падающие синие квадраты', 'Испытайте свои рефлексы в игре, где нужно уворачиваться от падающих фигур!'),
'de': ('Fallende blaue Quadrate', 'Teste deine Reflexe in einem Spiel, in dem du fallenden Formen ausweichst!'),
'fr': ('Carrés bleus tombants', 'Testez vos réflexes dans un jeu où vous évitez des formes qui tombent !'),
'es': ('Cuadrados azules cayendo', '¡Pon a prueba tus reflejos esquivando formas que caen!'),
'es-419': ('Cuadrados azules cayendo', '¡Pon a prueba tus reflejos esquivando formas que caen!'),
'it': ('Quadrati blu cadenti', 'Metti alla prova i riflessi schivando forme che cadono!'),
'pt-br': ('Quadrados azuis caindo', 'Teste seus reflexos desviando de formas que caem!'),
'pt-pt': ('Quadrados azuis a cair', 'Teste os seus reflexos desviando de formas que caem!'),
'pl': ('Spadające niebieskie kwadraty', 'Sprawdź refleksy, unikając spadających kształtów!'),
'nl': ('Vallende blauwe vierkanten', 'Test je reflexen door vallende vormen te ontwijken!'),
'tr': ('Düşen Mavi Kareler', 'Düşen şekillerden kaçarak reflekslerinizi test edin!'),
'be': ('Падаючыя сінія квадраты', 'Праверце рэфлексы ў гульні, дзе трэба ўхіляцца ад падаючых фігур!'),
'bg': ('Падащи сини квадрати', 'Изпробвайте рефлексите си в игра, в която избягвате падащи фигури!'),
'cs': ('Padající modré čtverce', 'Otestujte reflexy ve hře, kde uhýbáte padajícím tvarům!'),
'da': ('Faldende blå firkanter', 'Test dine reflekser i et spil, hvor du undgår faldende former!'),
'nb': ('Fallende blå firkanter', 'Test refleksene dine i et spill der du unngår fallende former!'),
'sv': ('Fallande blå fyrkanter', 'Testa dina reflexer i ett spel där du undviker fallande former!'),
'fi': ('Putoavat siniset neliöt', 'Testaa refleksisi pelissä, jossa väistät putoavia muotoja!'),
'el': ('Γαλάζια τετράγωνα που πέφτουν', 'Δοκιμάστε τα αντανακλαστικά σας αποφεύγοντας σχήματα που πέφτουν!'),
'hu': ('Eső kék négyzetek', 'Teszteld a reflexeidet egy játékban, ahol elkerülöd a hulló formákat!'),
'ro': ('Pătrate albastre care cad', 'Testează-ți reflexele într-un joc în care eviți formele care cad!'),
'sr': ('Падајући плави квадрати', 'Испитајте рефлексе у игри где избегавате облике који падају!'),
'ar': ('المربعات الزرقاء الساقطة', 'اختبر ردود فعلك في لعبة تتجنب فيها الأشكال الساقطة!'),
'fa': ('مربع‌های آبی در حال سقوط', 'واکنش‌های خود را در بازی‌ای بیازمایید که از شکل‌های در حال سقوط دوری می‌کنید!'),
'he': ('ריבועים כחולים נופלים', 'בחנו את הרפלקסים במשחק שבו חומקים מצורות נופלות!'),
'hi': ('गिरते नीले वर्ग', 'गिरते आकारों से बचते हुए अपने रिफ्लेक्स का परीक्षण करें!'),
'bn': ('পড়ন্ত নীল বর্গ', 'পড়ন্ত আকৃতি এড়িয়ে আপনার রিফ্লেক্স পরীক্ষা করুন!'),
'ur': ('گرتے نیلے مربع', 'گرتی شکلوں سے بچتے ہوئے اپنے ریفلیکس آزمائیں!'),
'ps': ('لوېدونکي آبي مربعونه', 'له لوېدونکو شکلونو څخه په ډډه کولو سره خپل انعکاسونه وازموئ!'),
'sd': ('ڪرندڙ نيرا چورس', 'ڪرندڙ شڪلن کان بچندي پنهنجا ريفليڪس آزمايو!'),
'ug': ('چۈشۈۋاتقان كۆك كۋادرات', 'چۈشۈۋاتقان شەكىللەردىن ساقلىنىپ رېفلىكىسىڭىزنى سىناڭ!'),
'ku-arab': ('چوارگۆشە شینەکانی کەوتوو', 'ڕەفلێکسەکانت تاقی بکە لە یارییەکدا کە لە شێوە کەوتووەکان دوور دەکەویتەوە!'),
'ks': ('وَسُن نیلہ مربع', 'وَسُن شکلہٕ نِش بٔچِتھ پنُن ریفلیکس جانچِو!'),
'dv': ('ވައްޓަން އިރުމަތީ ސްކުއެއަރ', 'ވައްޓަން ޝޭޕް ދޫކޮށް ރިފްލެކްސް ޗެކްކުރާށެވެ.'),
'az': ('Düşən mavi kvadratlar', 'Düşən formalardan yayınaraq reflekslərinizi sınayın!'),
'kk': ('Құлап жатқан көк шаршылар', 'Құлап жатқан пішіндерден сақтанып рефлекстеріңізді сынаңыз!'),
'uz': ('Tushayotgan ko‘k kvadratlar', 'Tushayotgan shakllardan qochib reflekslaringizni sinang!'),
'hy': ('Ընկնող կապույտ քառակուսիներ', 'Փորձեք ձեր ռեֆլեքսները՝ խուսափելով ընկնող ձևերից։'),
'ka': ('ცვივა ლურჯი კვადრატები', 'გამოსცადეთ რეფლექსები თამაშში, სადაც გვერდს უვლით ცვივა ფორმებს!'),
'ja': ('落ちる青い四角', '落ちてくる図形を避けて反射神経を試そう！'),
'ko': ('떨어지는 파란 사각형', '떨어지는 도형을 피하며 반사신경을 시험하세요!'),
'zh-cn': ('下落的蓝色方块', '在躲避下落形状的游戏中测试你的反应！'),
'th': ('สี่เหลี่ยมน้ำเงินร่วง', 'ทดสอบปฏิกิริยาของคุณในเกมที่ต้องหลบรูปทรงที่ร่วงลงมา!'),
'vi': ('Ô vuông xanh rơi', 'Thử phản xạ trong trò chơi né các hình đang rơi!'),
'id': ('Kotak Biru Jatuh', 'Uji refleks Anda dalam game menghindari bentuk yang jatuh!'),
'ms': ('Segi Empat Biru Jatuh', 'Uji refleks anda dalam permainan mengelak bentuk yang jatuh!'),
'fil': ('Bumabagsak na Asul na Parisukat', 'Subukan ang reflexes sa larong iniiwasan ang bumabagsak na hugis!'),
'yi': ('פֿאַלנדיקע בלויע קוואַדראַטן', 'פּרוּווט אײַערע רעפלעקסן אין אַ שפּיל וווּ איר מיידט פֿאַלנדיקע פֿאָרמען!'),
}

COLORS = {
'en': ('Color Palettes', 'Build harmonious color schemes for design'),
'ru': ('Цветовые палитры', 'Создавайте гармоничные цветовые схемы для дизайна'),
'de': ('Farbpaletten', 'Erstelle harmonische Farbschemas für Design'),
'fr': ('Palettes de couleurs', 'Créez des palettes harmonieuses pour le design'),
'es': ('Paletas de color', 'Crea esquemas de color armoniosos para diseño'),
'es-419': ('Paletas de color', 'Crea esquemas de color armoniosos para diseño'),
'it': ('Palette di colori', 'Crea schemi di colore armoniosi per il design'),
'pt-br': ('Paletas de cores', 'Crie esquemas de cores harmoniosos para design'),
'pt-pt': ('Paletes de cores', 'Crie esquemas de cores harmoniosos para design'),
'pl': ('Palety kolorów', 'Twórz harmonijne schematy kolorów do projektowania'),
'nl': ('Kleurenpaletten', 'Maak harmonieuze kleurenschema’s voor ontwerp'),
'tr': ('Renk Paletleri', 'Tasarım için uyumlu renk şemaları oluşturun'),
'be': ('Каляровыя палітры', 'Стварайце гарманічныя каляровыя схемы для дызайну'),
'bg': ('Цветови палитри', 'Създавайте хармонични цветови схеми за дизайн'),
'cs': ('Barevné palety', 'Vytvářejte harmonická barevná schémata pro design'),
'da': ('Farvepaletter', 'Byg harmoniske farveskemaer til design'),
'nb': ('Fargepaletter', 'Lag harmoniske fargeskjemaer for design'),
'sv': ('Färgpaletter', 'Skapa harmoniska färgscheman för design'),
'fi': ('Väripaletit', 'Luo harmonisia värikaavioita suunnitteluun'),
'el': ('Παλέτες χρωμάτων', 'Δημιουργήστε αρμονικά χρωματικά σχήματα για σχέδιο'),
'hu': ('Színpaletták', 'Alkoss harmonikus színsémákat tervezéshez'),
'ro': ('Palete de culori', 'Creează scheme de culori armonioase pentru design'),
'sr': ('Палете боја', 'Направите хармоничне шеме боја за дизајн'),
'ar': ('لوحات الألوان', 'أنشئ مخططات ألوان متناسقة للتصميم'),
'fa': ('پالت‌های رنگی', 'طرح‌های رنگی هماهنگ برای طراحی بسازید'),
'he': ('פלטות צבעים', 'בנו סכמות צבע הרמוניות לעיצוב'),
'hi': ('रंग पैलेट', 'डिज़ाइन के लिए सामंजस्यपूर्ण रंग योजनाएँ बनाएँ'),
'bn': ('রঙের প্যালেট', 'ডিজাইনের জন্য সুসংগত রঙের স্কিম তৈরি করুন'),
'ur': ('رنگین پیلیٹس', 'ڈیزائن کے لیے ہم آہنگ رنگ اسکیمیں بنائیں'),
'ps': ('د رنګ پیلټونه', 'د ډیزاین لپاره همغږي رنګ سکیمونه جوړ کړئ'),
'sd': ('رنگ پيليٽس', 'ڊيزائن لاءِ هم آهنگ رنگ اسڪيمون ٺاهيو'),
'ug': ('رەڭ تاختىسى', 'لايىھە ئۈچۈن ماس رەڭ لايىھىسى قۇرۇڭ'),
'ku-arab': ('پالێتی ڕەنگ', 'سکیمای ڕەنگی هاودەنگ بۆ دیزاین دروست بکە'),
'ks': ('رنٛگ پیلیٹ', 'ڈیزائن خٲطرٕ ہم آہنگ رنٛگ سکیم بنٲیو'),
'dv': ('ކުލަ ޕެލެޓް', 'ޑިޒައިނަށް އެކަށްވާ ކުލަ ސްކީމް ހައްދަވާށެވެ.'),
'az': ('Rəng palitraları', 'Dizayn üçün ahəngdar rəng sxemləri yaradın'),
'kk': ('Түс палитралары', 'Дизайн үшін үйлесімді түс схемаларын жасаңыз'),
'uz': ('Rang palitralari', 'Dizayn uchun uyg‘un rang sxemalarini yarating'),
'hy': ('Գունային պալիտրաներ', 'Ստեղծեք ներդաշնակ գունային սխեմաներ դիզայնի համար'),
'ka': ('ფერთა პალიტრები', 'შექმენით ჰარმონიული ფერთა სქემები დიზაინისთვის'),
'ja': ('カラーパレット', 'デザイン向けの調和した配色を作成'),
'ko': ('컬러 팔레트', '디자인을 위한 조화로운 색 구성표를 만드세요'),
'zh-cn': ('调色板', '为设计构建和谐的配色方案'),
'th': ('พาเลตสี', 'สร้างโทนสีที่กลมกลืนสำหรับงานออกแบบ'),
'vi': ('Bảng màu', 'Tạo bảng màu hài hòa cho thiết kế'),
'id': ('Palet Warna', 'Buat skema warna harmonis untuk desain'),
'ms': ('Palet Warna', 'Bina skim warna harmoni untuk reka bentuk'),
'fil': ('Mga Color Palette', 'Gumawa ng magkakasuwatong color scheme para sa disenyo'),
'yi': ('קאָליר־פּאַליטרעס', 'בויט האַרמאָנישע קאָליר־סכעמעס פֿאַר דיזיין'),
}

GAMES = [
    ('gameSnakeTranslations.json', 'gameSnake', SNAKE, ['games/snake/snake.html', 'games/snake/index.html']),
    ('gameBreakoutTranslations.json', 'gameBreakout', BREAKOUT, ['games/breakout/breakout.html', 'games/breakout/index.html']),
    ('gameCoinsTranslations.json', 'gameCoins', COINS, ['games/coins/coins.html', 'games/coins/index.html']),
    ('gameFifteenTranslations.json', 'gameFifteen', FIFTEEN, ['games/fifteen/fifteen.html', 'games/fifteen/index.html']),
    ('gameMinesweeperTranslations.json', 'gameMinesweeper', MINES, ['games/minesweeper/minesweeper.html', 'games/minesweeper/index.html']),
    ('gameRedsquareTranslations.json', 'gameRedsquare', REDSQ, ['games/redsquare/redsquare.html']),
    ('gameRedsquare2Translations.json', 'gameRedsquare2', REDSQ2, ['games/redsquare2/redsquare2.html']),
]


def full_title(name: str, loc: str) -> str:
    return f'{name} — {brand(loc)}'


def update_game_json(file_name: str, nest: str, table: dict) -> int:
    path = DATA / file_name
    data = json.loads(path.read_text(encoding='utf-8'))
    n = 0
    for loc in LOCALES:
        if loc not in data or nest not in data[loc]:
            continue
        name, desc = table.get(loc) or table['en']
        g = data[loc][nest]
        title = full_title(name, loc)
        g['pageTitle'] = title
        if 'ogTitle' in g:
            g['ogTitle'] = title
        if 'metaDescription' in g:
            g['metaDescription'] = desc
        if 'ogDescription' in g:
            g['ogDescription'] = desc
        if 'twitterDescription' in g:
            g['twitterDescription'] = desc
        n += 1
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return n


def update_colors_json() -> int:
    path = DATA / 'colorPalettes.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    n = 0
    for loc in LOCALES:
        if loc not in data:
            continue
        name, desc = COLORS.get(loc) or COLORS['en']
        title = full_title(name, loc)
        meta = data[loc].setdefault('meta', {})
        meta['title'] = title
        meta['description'] = desc
        meta['ogTitle'] = title
        meta['ogDescription'] = desc
        meta['twitterTitle'] = title
        meta['twitterDescription'] = desc
        n += 1
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return n


def patch_html(abs_path: Path, title: str | None, desc: str | None) -> bool:
    html = abs_path.read_text(encoding='utf-8', errors='replace')
    before = html
    if title:
        html = re.sub(r'<title>[\s\S]*?</title>', f'<title>{esc_html(title)}</title>', html, count=1, flags=re.I)
        for prop in ('og:title', 'twitter:title'):
            html = re.sub(
                rf'(<meta\s+(?:property|name)=["\']{re.escape(prop)}["\']\s+content=["\'])([^"\']*)(["\'])',
                rf'\g<1>{esc_attr(title)}\3',
                html,
                count=1,
                flags=re.I,
            )
    if desc:
        html = re.sub(
            r'(<meta\s+name=["\']description["\']\s+content=["\'])([^"\']*)(["\'])',
            rf'\g<1>{esc_attr(desc)}\3',
            html,
            count=1,
            flags=re.I,
        )
        for prop in ('og:description', 'twitter:description'):
            html = re.sub(
                rf'(<meta\s+(?:property|name)=["\']{re.escape(prop)}["\']\s+content=["\'])([^"\']*)(["\'])',
                rf'\g<1>{esc_attr(desc)}\3',
                html,
                count=1,
                flags=re.I,
            )
    if html != before:
        abs_path.write_text(html, encoding='utf-8')
        return True
    return False


def apply_html(rel_patterns: list[str], table: dict, title_only: bool = False) -> int:
    n = 0
    for loc in LOCALES:
        name, desc = table.get(loc) or table['en']
        title = full_title(name, loc) if not title_only else name
        # redsquare2 titles historically without brand — keep with brand for SEO uniqueness
        for rel in rel_patterns:
            path = FRONTEND / rel if loc == 'ru' else FRONTEND / loc / rel
            if path.exists() and patch_html(path, title, None if title_only else desc):
                n += 1
    return n


def fix_2048_index() -> int:
    """Many index.html stubs share '2048 - Serpmonn' — give localized titles."""
    titles = {
        'en': '2048 — classic puzzle — Serpmonn',
        'ru': '2048 — классическая головоломка — Серпмонн',
        'de': '2048 — klassisches Puzzle — Serpmonn',
        'fr': '2048 — puzzle classique — Serpmonn',
        'es': '2048 — rompecabezas clásico — Serpmonn',
        'es-419': '2048 — rompecabezas clásico — Serpmonn',
        'it': '2048 — puzzle classico — Serpmonn',
        'pt-br': '2048 — quebra-cabeça clássico — Serpmonn',
        'pt-pt': '2048 — puzzle clássico — Serpmonn',
        'pl': '2048 — klasyczna układanka — Serpmonn',
        'nl': '2048 — klassieke puzzel — Serpmonn',
        'tr': '2048 — klasik bulmaca — Serpmonn',
        'be': '2048 — класічная галаваломка — Serpmonn',
        'bg': '2048 — класически пъзел — Serpmonn',
        'cs': '2048 — klasický puzzle — Serpmonn',
        'da': '2048 — klassisk puslespil — Serpmonn',
        'nb': '2048 — klassisk puslespill — Serpmonn',
        'sv': '2048 — klassiskt pussel — Serpmonn',
        'fi': '2048 — klassinen pulma — Serpmonn',
        'el': '2048 — κλασικό παζλ — Serpmonn',
        'hu': '2048 — klasszikus kirakós — Serpmonn',
        'ro': '2048 — puzzle clasic — Serpmonn',
        'sr': '2048 — класична слагалица — Serpmonn',
        'ar': '2048 — لغز كلاسيكي — Serpmonn',
        'fa': '2048 — پازل کلاسیک — Serpmonn',
        'he': '2048 — פאזל קלאסי — Serpmonn',
        'hi': '2048 — क्लासिक पज़ल — Serpmonn',
        'bn': '2048 — ক্লাসিক পাজল — Serpmonn',
        'ur': '2048 — کلاسک پہیلی — Serpmonn',
        'ps': '2048 — کلاسیک معما — Serpmonn',
        'sd': '2048 — ڪلاسيڪل پہيلي — Serpmonn',
        'ug': '2048 — كىلاسىك تېپىشماق — Serpmonn',
        'ku-arab': '2048 — مەتەڵی کلاسیکی — Serpmonn',
        'ks': '2048 — کلاسک پزل — Serpmonn',
        'dv': '2048 — ކްލާސިކް ޕަޒަލް — Serpmonn',
        'az': '2048 — klassik tapmaca — Serpmonn',
        'kk': '2048 — классикалық жұмбақ — Serpmonn',
        'uz': '2048 — klassik boshqotirma — Serpmonn',
        'hy': '2048 — դասական հանելուկ — Serpmonn',
        'ka': '2048 — კლასიკური თავსატეხი — Serpmonn',
        'ja': '2048 — クラシックパズル — Serpmonn',
        'ko': '2048 — 클래식 퍼즐 — Serpmonn',
        'zh-cn': '2048 — 经典益智 — Serpmonn',
        'th': '2048 — ปริศนาคลาสสิก — Serpmonn',
        'vi': '2048 — đố cổ điển — Serpmonn',
        'id': '2048 — teka-teki klasik — Serpmonn',
        'ms': '2048 — teka-teki klasik — Serpmonn',
        'fil': '2048 — klasikong puzzle — Serpmonn',
        'yi': '2048 — קלאַסישער פּאַזל — Serpmonn',
    }
    n = 0
    for loc, title in titles.items():
        path = FRONTEND / 'games/2048/index.html' if loc == 'ru' else FRONTEND / loc / 'games/2048/index.html'
        if path.exists() and patch_html(path, title, None):
            n += 1
        # also main file if exists with poor title
        path2 = FRONTEND / 'games/2048/2048.html' if loc == 'ru' else FRONTEND / loc / 'games/2048/2048.html'
        if path2.exists():
            # only patch title if duplicate russian/shared — always set localized
            name_desc = {
                'en': 'Merge matching numbers to reach 2048! Classic puzzle game.',
                'ru': 'Соединяйте одинаковые числа, чтобы получить 2048! Классическая головоломка.',
            }
            # reuse from existing if possible - simple localized desc
            desc_map = {
                'en': 'Merge matching numbers to reach 2048! Classic puzzle game.',
                'ru': 'Соединяйте одинаковые числа, чтобы получить 2048! Классическая головоломка.',
                'de': 'Verbinde gleiche Zahlen, um 2048 zu erreichen! Klassisches Puzzle.',
                'fr': 'Fusionnez les nombres identiques pour atteindre 2048 ! Puzzle classique.',
                'es': 'Combina números iguales para llegar a 2048. Puzzle clásico.',
                'es-419': 'Combina números iguales para llegar a 2048. Puzzle clásico.',
                'it': 'Unisci numeri uguali per arrivare a 2048! Puzzle classico.',
                'pt-br': 'Combine números iguais para chegar a 2048! Quebra-cabeça clássico.',
                'pt-pt': 'Combine números iguais para chegar a 2048! Puzzle clássico.',
                'pl': 'Łącz jednakowe liczby, by osiągnąć 2048! Klasyczna układanka.',
                'nl': 'Voeg gelijke getallen samen om 2048 te bereiken! Klassieke puzzel.',
                'tr': 'Aynı sayıları birleştirerek 2048’e ulaşın! Klasik bulmaca.',
                'ja': '同じ数字を合体させて2048を目指そう！クラシックパズル。',
                'ko': '같은 숫자를 합쳐 2048에 도달하세요! 클래식 퍼즐.',
                'zh-cn': '合并相同数字达到 2048！经典益智游戏。',
                'ar': 'ادمج الأرقام المتطابقة للوصول إلى 2048! لغز كلاسيكي.',
            }
            desc = desc_map.get(loc) or desc_map['en']
            # Prefer unique title already set in TITLES for index; for 2048.html use same title
            if patch_html(path2, title, desc):
                n += 1
    return n


def main():
    print('Updating remaining games/tools meta…')
    for file_name, nest, table, htmls in GAMES:
        print(f'  json {file_name}: {update_game_json(file_name, nest, table)}')
        print(f'  html {nest}: {apply_html(htmls, table)}')
    print(f'  json colorPalettes: {update_colors_json()}')
    print(f'  html color-palettes: {apply_html(["tools/design/color-palettes.html"], COLORS)}')
    print(f'  html 2048: {fix_2048_index()}')
    print('done')


if __name__ == '__main__':
    main()
