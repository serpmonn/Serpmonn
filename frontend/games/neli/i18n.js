/** Neli i18n — UI keys + English map of in-game Russian lines */
/* global lang, t, tx, setLang, applyUi */

var lang = 'ru';

const I18N = {
  ru: {
    'ui.title': 'Нэли — демо',
    'ui.lead': 'Демо · Америка, 90-е · хоррор с элементами расследования',
    'ui.nameLabel': 'Имя героини',
    'ui.defaultName': 'Нэли',
    'ui.start': 'Начать',
    'ui.continue': 'Продолжить',
    'ui.fine': 'Управление: WASD или стрелки + Shift (бег) + мышь. Esc — пауза.',
    'ui.fineTouch': 'Стик — ходить. Меню ☰ слева сверху — пауза.',
    'ui.hint': 'WASD / стрелки · Shift бег · E / клик · Esc пауза',
    'ui.hintTouch': 'Стик · бег · действие · меню',
    'ui.touchRun': 'Бег',
    'ui.touchActLabel': 'Действие',
    'ui.creak': 'Скрип:',
    'ui.next': 'Далее',
    'ui.tapContinue': 'Нажмите, чтобы продолжить',
    'ui.ok': 'Ок',
    'ui.pause': 'Пауза',
    'ui.resume': 'Продолжить',
    'ui.language': 'Язык',
    'ui.toTitle': 'В начало',
    'ui.quest': 'Задание',
    'ui.questEmpty': '—',
    'ui.clues': 'Улики',
    'quest.boss': 'Поговорите с начальником полиции.',
    'quest.road': 'Выйдите на дорогу к соседнему городу.',
    'quest.van': 'Идите по дороге. Следите за странным транспортом.',
    'quest.woods': 'Проследуйте за фургоном в Волчий лес.',
    'quest.forest': 'Идите глубже в лес, за фургоном.',
    'quest.house': 'Чёрный ход — в прихожую, дальше через кухню. Тихо.',
    'quest.exit': 'Гостиная: парадная дверь внизу — на улицу. Лестница ↑ справа. В гараж не возвращайтесь.',
    'quest.clues': 'Коридор второго этажа. Можно осмотреть комнаты — или спуститься к парадной двери. Не скрипите досками.',
    'quest.leave': 'Парадная дверь в гостиной — на улицу.',
    'quest.run': 'Бегите на второй этаж. Гостевая слева по коридору — под кровать. 15 секунд.',
    'ui.escape': 'Бегите:',
    'ui.controlsTitle': 'Управление',
    'ui.controlsBody': 'WASD или стрелки — ходить\nShift — бежать\nМышь — смотреть\nE или клик — действие / поговорить\nEsc — пауза',
    'ui.controlsBodyTouch': 'Стик слева — ходить\nКнопка с молнией — удерживать для бега\nКнопка с рукой — действие / разговор\nМеню ☰ — пауза',
    'ui.end': 'Конец',
    'ui.demoEnd': 'Конец демо',
    'ui.restartHint': 'Начните сначала.',
    'ui.checkpointHint': 'Продолжите с последнего чекпоинта.',
    'ui.gameOverFate': 'Нэли не выбралась. Следующая попытка — с самого начала.',
    'death.creak': 'Скрип досок выдал вас. Ханс поднялся наверх — спрятаться было поздно.',
    'death.hansCatch': 'Дверь распахнулась. Ханс вошёл — бежать было некуда.',
    'death.garageTrap': 'Ворота гаража заперты. Слишком близко — ловушка сработала.',
    'death.garageSpeak': 'Вы сказали, что всё слышали. Рей не стал рисковать — сознание гаснет.',
    'ui.demoEndBody': 'Вы прошли демо-версию.',
    'ui.demoEndClues': 'Улик собрано: {n}/{total}.',
    'ui.demoEndTime': 'Время прохождения: {time}.',
    'ui.demoEndLbHint': 'Результат сохранён в таблице лидеров.',
    'ui.leaderboard': 'Таблица лидеров',
    'ui.donate': 'Поддержать проект',
    'ui.lbYourTime': 'Ваше время: {time}',
    'ui.lbEmpty': 'Пока нет результатов.',
    'ui.lbLoadFail': 'Не удалось загрузить таблицу.',
    'ui.lbClose': 'Закрыть',
    'dlg.clue.one': 'Ещё комнаты, если хотите. Или сразу к выходу — лестница вниз.',
    'dlg.clue.two': 'Картина складывается. Когда будете готовы — вниз.',
    'dlg.descend.none': 'Не хотите осматривать комнаты — ладно. Вниз, пока тихо.',
    'dlg.descend.one': 'Мало, но хоть что-то. Спускаемся — пока тихо.',
    'dlg.descend.full': 'Теперь понятно, кто этот тип… Вниз, к парадной двери. Быстро.',
    'dlg.garage.blocked': 'Назад нельзя. Рей в гараже — это чёрный ход, не выход.',
    'dlg.exit.front': 'Парадная дверь. На улицу — и валим.',
    'dlg.exit.walk': 'Вы к парадной двери — на крыльцо, к машине, к свободе…',
    'dlg.exit.bump': 'И впечатываетесь в кого-то огромного.',
    'dlg.exit.liamNo': 'О нет.',
    'dlg.exit.hansLine': 'Полиция. В моём доме.',
    'dlg.boss.assign': '{name}. Люди пропадают — третий за месяц. Звонки, слухи, ноль зацепок. Разберись. Без героизма — с результатом.'
  },
  en: {
    'ui.title': 'Neli — demo',
    'ui.lead': 'Demo · America, 1990s · horror with investigation elements',
    'ui.nameLabel': 'Heroine name',
    'ui.defaultName': 'Neli',
    'ui.start': 'Start',
    'ui.continue': 'Continue',
    'ui.fine': 'Controls: WASD or arrow keys + Shift (run) + mouse. Esc — pause.',
    'ui.fineTouch': 'Stick — move. Menu ☰ top left — pause.',
    'ui.hint': 'WASD / arrows · Shift run · E / click · Esc pause',
    'ui.hintTouch': 'Stick · run · act · menu',
    'ui.touchRun': 'Run',
    'ui.touchActLabel': 'Action',
    'ui.creak': 'Creak:',
    'ui.next': 'Next',
    'ui.tapContinue': 'Tap to continue',
    'ui.ok': 'OK',
    'ui.pause': 'Paused',
    'ui.resume': 'Resume',
    'ui.language': 'Language',
    'ui.toTitle': 'Title screen',
    'ui.quest': 'Objective',
    'ui.questEmpty': '—',
    'ui.clues': 'Clues',
    'quest.boss': 'Talk to the police chief.',
    'quest.road': 'Go out to the road toward the next town.',
    'quest.van': 'Walk the road. Watch for strange traffic.',
    'quest.woods': 'Follow the van into Wolf Woods.',
    'quest.forest': 'Go deeper into the woods, after the van.',
    'quest.house': 'Back entrance — into the foyer, then through the kitchen. Quiet.',
    'quest.exit': 'Living room: front door downstairs leads outside. Stairs ↑ on the right. Don\'t go back to the garage.',
    'quest.clues': 'Second-floor hall. Search the rooms if you want — or go down to the front door. Don\'t creak the floorboards.',
    'quest.leave': 'Front door in the living room — outside.',
    'quest.run': 'Run to the second floor. Guest room on the left of the hall — under the bed. 15 seconds.',
    'ui.escape': 'Run:',
    'ui.controlsTitle': 'Controls',
    'ui.controlsBody': 'WASD or arrow keys — move\nShift — run\nMouse — look\nE or click — act / talk\nEsc — pause',
    'ui.controlsBodyTouch': 'Left stick — move\nLightning button — hold to run\nHand button — act / talk\nMenu ☰ — pause',
    'ui.end': 'Game over',
    'ui.demoEnd': 'Demo end',
    'ui.restartHint': 'Start from the beginning.',
    'ui.checkpointHint': 'You will continue from the last checkpoint.',
    'ui.gameOverFate': "Neli didn't make it. The next try starts from the beginning.",
    'death.creak': 'The floorboards gave you away. Hans came upstairs — too late to hide.',
    'death.hansCatch': 'The door flew open. Hans stepped in — there was nowhere to run.',
    'death.garageTrap': 'The garage door is locked. Too close — a trap went off.',
    'death.garageSpeak': 'You said you heard everything. Rey would not take the risk — everything goes dark.',
    'ui.demoEndBody': 'You have completed the demo.',
    'ui.demoEndClues': 'Clues collected: {n}/{total}.',
    'ui.demoEndTime': 'Completion time: {time}.',
    'ui.demoEndLbHint': 'Your result was saved to the leaderboard.',
    'ui.leaderboard': 'Leaderboard',
    'ui.donate': 'Support the project',
    'ui.lbYourTime': 'Your time: {time}',
    'ui.lbEmpty': 'No results yet.',
    'ui.lbLoadFail': 'Could not load the leaderboard.',
    'ui.lbClose': 'Close',
    'dlg.clue.one': 'More rooms if you want. Or head straight to the exit — stairs down.',
    'dlg.clue.two': 'It’s starting to add up. When you’re ready — go down.',
    'dlg.descend.none': 'Don’t want to search the rooms — fine. Downstairs, while it’s quiet.',
    'dlg.descend.one': 'Not much, but something. Let’s go down — while it’s quiet.',
    'dlg.descend.full': 'Now it’s clear who this guy is… Down to the front door. Fast.',
    'dlg.garage.blocked': 'Can’t go back. Rey’s in the garage — that’s the back way in, not the way out.',
    'dlg.exit.front': 'Front door. Outside — and we run.',
    'dlg.exit.walk': 'You reach the front door — the porch, the car, freedom…',
    'dlg.exit.bump': 'You walk straight into something huge.',
    'dlg.exit.liamNo': 'Oh no.',
    'dlg.exit.hansLine': 'Police. In my house.',
    'dlg.boss.assign': '{name}. People keep vanishing — third this month. Calls, rumors, zero leads. Handle it. No heroics — results.'
  }
};

const EN_TEXT = {
  'Рей': 'Rey',
  'Лиам': 'Liam',
  'Начальник': 'Chief',
  'Начальник полиции': 'Police chief',
  'Хозяин': 'The Owner',
  'Ханс': 'Hans',
  'Выбор': 'Choice',
  'Звук': 'Sound',

  'ресепшен': 'reception',
  'стол начальника': "chief's desk",
  'шкаф дел': 'case files',
  'поговорить с начальником полиции': 'talk to the police chief',
  '→ на улицу / дорога': '→ street / road',
  'Волчий лес →': 'Wolf Woods →',
  'фургон': 'van',
  '→ в лес': '→ into the woods',
  'грязный ковёр': 'dirty rug',
  'место для машины (пол чище)': 'car bay (cleaner floor)',
  'стекло': 'glass',
  'диван': 'sofa',
  'инструменты на стене': 'tools on the wall',
  'стол · инструмент': 'workbench',
  'слив': 'drain',
  'шкаф': 'cabinet',
  'коробки · мусор': 'boxes · trash',
  'полка': 'shelf',
  'дверь': 'door',
  'лестница': 'stairs',
  'люк': 'hatch',
  'спрятаться': 'hide',
  'стул': 'chair',
  'оруж. сейф': 'gun safe',
  'кондей': 'A/C',
  'ворота на замке': 'locked garage door',
  '→ в дом': '→ into the house',
  'кухня': 'kitchen',
  'стол / столовая': 'table / dining',
  'гостиная': 'living room',
  'комната Ханс': "Hans's room",
  'ванна': 'bath',
  'гардероб': 'closet',
  'разделочная': 'butcher room',
  '↓ подвал': '↓ basement',
  'прихожая': 'hallway',
  'вход ↓': 'front door ↓',
  'лестница ↑': 'stairs ↑',
  'дверь Ханс': "Hans's door",
  'дверь в подвал': 'basement door',
  'вход / выход': 'front door',
  'лестница ↑ 2 этаж': 'stairs ↑ 2nd floor',
  '↑ чердак': '↑ attic',
  'СКЛАД': 'STORAGE',
  'СКЛАД 2': 'STORAGE 2',
  'коробки': 'boxes',
  'Гостевая 1': 'Guest 1',
  'кровать': 'bed',
  'спрятаться': 'hide',
  'спрятаться под кровать': 'hide under the bed',
  'кровать · спрятаться': 'bed · hide',
  'ШКАФ': 'WARDROBE',
  'Гостевая 2': 'Guest 2',
  'лестница ↓': 'stairs ↓',
  'выход на чердак': 'attic hatch',
  'спрятаться (Гостевая 1)': 'hide (Guest 1)',
  'СКЛАД 2 — коробки': 'STORAGE 2 — boxes',
  'ШКАФ — куртки': 'WARDROBE — coats',
  'лестница ↓ к выходу': 'stairs ↓ to the exit',
  'в прихожую': 'to the foyer',
  'в гараж · чёрный ход': 'to garage · back entrance',
  'парадная дверь': 'front door',
  'парадная дверь · на улицу': 'front door · outside',
  'узкий коридор к выходу': 'narrow hall to the exit',
  'вход': 'entrance',
  'Рей Филдс, 80-е': 'Rey Fields, 1980s',
  'Документы пропавших': 'Missing persons papers',

  'Управление': 'Controls',
  'Конец': 'The End',
  'Конец демо': 'Demo end',
  'WASD — ходить\nShift — бежать\nМышь — смотреть\nE или клик — действие / поговорить':
    'WASD — move\nShift — run\nMouse — look\nE or click — act / talk',
  'WASD или стрелки — ходить\nShift — бежать\nМышь — смотреть\nE или клик — действие / поговорить\nEsc — пауза':
    'WASD or arrow keys — move\nShift — run\nMouse — look\nE or click — act / talk\nEsc — pause',
  'WASD — ходить\nShift — бежать\nМышь — смотреть\nE или клик — действие / поговорить\nEsc — пауза':
    'WASD — move\nShift — run\nMouse — look\nE or click — act / talk\nEsc — pause',

  'Чего стоишь? Дела сами себя не раскрывают.': "Don't just stand there. Cases don't solve themselves.",
  'Есть, сэр. …Честно — не знаю, с чего начать. Но готова.':
    "Yes, sir. …Honestly, I don't know where to start. But I'm ready.",
  'Начни с дороги на соседний город. Там видели странный транспорт — фургон, которому там не место. Проверь и доложи.':
    'Start with the road to the next town. Someone saw strange traffic — a van that had no business being there. Check it out and report back.',
  '…': '…',
  'Скрип досок выдал вас. Ханс поднялся наверх.':
    'The floorboards gave you away. Hans came upstairs.',
  'Ворота гаража заперты. Слишком близко — ловушка срабатывает.':
    'The garage door is locked. Too close — a trap goes off.',
  'Тебя накачали наркотиками заранее. Сознание гаснет.':
    'Everything goes dark.',
  'Сознание гаснет.': 'Everything goes dark.',
  'Можно начать заново.': 'Start from the beginning.',
  'Начни заново с титула.': 'Start from the beginning.',
  'Начните сначала.': 'Start from the beginning.',
  'Ты прошёл демо-версию.':
    'You have completed the demo.',

  'Странный фургон сворачивает с дороги — прямо в чащу.':
    'A strange van turns off the road — straight into the trees.',
  'В «Волчий лес». Без единой нормальной дороги. Просто так туда не ездят.':
    'Into Wolf Woods. No real road. Nobody drives in there for no reason.',
  'Ты решаешь проследовать за ним.': 'You decide to follow it.',
  'Ты пробираешься глубже. Листва цепляет форму. Фургон всё время ускользает между стволами…':
    'You push deeper. Leaves catch on your uniform. The van keeps slipping between the trunks…',
  'Ты останавливаешься.': 'You stop.',
  'А где же машина?': 'Where did the van go?',
  'Тишина. Слишком тихая.': 'Silence. Too quiet.',
  'Сзади — шорох. Удар прикладом. Экран меркнет.':
    'A rustle behind you. A rifle butt. The screen goes black.',

  'Чего уставилась? Вали, пока я не передумал.':
    'What are you staring at? Get out before I change my mind.',
  'Кто вы такие? Почему этот дом?': 'Who are you people? Why this house?',
  'Любопытство — плохая привычка. Особенно в форме.':
    'Curiosity is a bad habit. Especially in uniform.',
  'Не сейчас.': 'Not now.',
  'Лиам… ты правда поможешь?': 'Liam… will you really help me?',
  'Тише. Дверь в дом — справа. Дальше — как скажу. И не геройствуй.':
    'Keep it down. Door into the house is on the right. After that — you do what I say. And no heroics.',
  'Где выход?': "Where's the way out?",
  'Через кухню — в гостиную. Выход внизу, лестница справа вверху. Серые двери не трогай — это комнаты Ханса.':
    'Through the kitchen into the living room. Front door is downstairs, stairs are up on the right. Leave the gray doors alone — those are Hans\'s rooms.',
  'Назад нельзя. Рей в гараже.': "We can't go back. Rey is still in the garage.",
  'Обычный склад. Не то.': 'Just a storage room. Not this one.',
  'Кто такой Ханс?': 'Who is Hans?',
  'Хозяин. Если встретишь — мы оба трупы. Идём.':
    "The owner. If you run into him, we're both corpses. Move.",
  'Хватит копаться. Лестница вниз — и к входу. Быстро.':
    'Stop digging around. Stairs down — then the front door. Fast.',
  'Что здесь искать?': 'What am I looking for here?',
  'Я… не должен тебе это говорить. Но если уж осталась — заходи в двери с коридора. И не скрипи досками, ради бога.':
    "I… shouldn't tell you this. But if you're staying — go through the doors off the corridor. And for God's sake don't creak the floorboards.",
  'Ты сам чья сторона?': 'Whose side are you even on?',
  'Та, где я ещё дышу. Не усложняй.': 'The side where I still breathe. Do not make this harder.',
  '…Не сейчас.': '…Not now.',
  'Потом поговорим.': "We'll talk later.",

  'Ты приходишь в себя, привязанная к стулу. Пахнет маслом и пылью. Гараж.':
    'You come to, tied to a chair. It smells like oil and dust. A garage.',
  'Тебе не стоило тут быть. И тем более попадаться мне на глаза. Теперь… я буду развлекаться.':
    "You shouldn't have been here. And you really shouldn't have let me see you. Now… I get to have some fun.",
  'Чисто для интереса вырвал бы тебе любопытные глазки, но—':
    "Just for kicks I'd rip those curious little eyes out, but—",
  'Рей, ты не поверишь, что там по распродаже крутят—\n\n…О.':
    "Rey, you won't believe what's on sale—\n\n…Oh.",
  'Чёрт… чёрт… Рей?! Почему здесь полиция?!':
    'Shit… shit… Rey?! Why is there a cop here?!',
  'Лиам. Закрой рот.': 'Liam. Shut up.',
  'Ты только что сказал моё имя! И своё! Она всё запомнит!':
    'You just said my name! And yours! She will remember all of it!',
  'Я вытащу тебя отсюда. Тихо.':
    "I'll get you out of here. Quiet.",
  '(шепчет Рею — но ты слышишь:) Доведу до края леса и оставлю там.':
    "(whispers to Rey — but you hear it:) I'll take her to the edge of the woods and leave her there.",
  'Ты всё слышала. Что делать?': 'You heard all of that. What do you do?',
  'Вмешаться: «Я всё слышала.»': 'Speak up: “I heard everything.”',
  'Вот и славно.': 'Good.',
  'Молчать': 'Stay quiet',
  'Она всё слышала. По глазам видно.': 'She heard everything. You can see it in her eyes.',
  'Нельзя тупо убить полицейского! Если об этом узнает Он…':
    "You can't just kill a cop! If He finds out…",
  '…Скучно. Делай что хочешь.': '…Boring. Do whatever you want.',
  'Я развяжу тебя. Через коридор — на кухню. Тихо.':
    "I'll untie you. Through the hallway — then the kitchen. Quiet.",

  'Не сюда. Эта дверь не для нас.': "Not in there. That door isn't for us.",
  'дверь в гараж': 'door to the garage',
  'Не сюда. Это его комната. Нам нужен выход.':
    "Not in there. That's his room. We need a way out.",
  'Дверь вниз. Пахнет сыростью… и чем-то хуже.':
    'A door going down. It smells like damp… and something worse.',
  'Подвал — позже. Сейчас — только наружу. Или наверх, если вход закрыт.':
    'Basement later. Right now — outside. Or upstairs, if the front door is locked.',
  '*отчётливый поворот ключа в замке*': '*a key turns clearly in the lock*',
  'Нет-нет-нет— прячься! Под кровать! Быстрее!':
    'No-no-no— hide! Under the bed! Faster!',
  'Беги! Он уже открывает!': "Run! He's already opening it!",
  'Не вниз! Гостевая слева по коридору — под кровать!':
    'Not downstairs! Guest room on the left of the hall — under the bed!',
  'Дверь распахнулась. Ханс вошёл. Бежать было некуда.':
    'The door flew open. Hans walked in. There was nowhere to run.',
  'Люк на чердак. Сейчас не до этого.': "Attic hatch. Not now.",
  'Ты ныряешь под кровать. Снизу — шаги. Голос. Дверь хлопает.\n\nТишина. Он ушёл.':
    'You dive under the bed. Footsteps below. A voice. The door slams.\n\nSilence. He left.',
  'Пока тихо. Улики — в шкафу коридора и в комнатах. Потом вниз.':
    "It's quiet for now. Clues are in the hall closet and the rooms. Then we go down.",
  'Ты прячешься под кроватью. Время тянется… Никто не заходит.':
    'You hide under the bed. Time drags… Nobody comes in.',
  'Фотографии, детская одежда, права… Пропавший подросток Рей Филдс. На фото — парень, очень похожий на мужчину из гаража.':
    'Photos, kids’ clothes, a driver’s license… Missing teenager Rey Fields. The boy in the photo looks a lot like the man from the garage.',
  'Коробка уже пуста для тебя.': 'The box is empty for you now.',
  'На вешалках — куртки. В карманах документы пропавших людей…':
    'Coats on the hangers. In the pockets — papers of missing people…',
  'Здесь ты уже всё проверила.': "You've already checked everything here.",
  'Гостевая. Кровать заправлена слишком аккуратно для пустого дома.':
    'A guest room. The bed is made too neatly for an empty house.',
  'Можете ещё осмотреть комнаты — или спускайтесь к выходу.':
    'You can search more rooms — or go down to the exit.',
  'Пока тихо. Можно осмотреть комнаты — или спуститься к парадной двери.':
    'Quiet for now. You can search the rooms — or go down to the front door.',
  'Внизу у входа пока тихо. Идём.': "It's quiet by the front door for now. Let's go.",
  'Эй. Внизу пока тихо. Спускаемся к входу — и валим.':
    "Hey. It's quiet downstairs. We go down to the door — and we leave.",
  'Вы шагаете к свободе через вход…': 'You walk toward freedom through the front door…',
  'И впечатываетесь в кого-то огромного.': 'And you slam into someone enormous.',
  'О нет.': 'Oh no.',
  'Полиция. В моём доме.': 'Police. In my house.'
};

function t(key, vars) {
  const dict = I18N[lang] || I18N.ru;
  let s = dict[key] ?? I18N.ru[key] ?? key;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      s = s.split('{' + k + '}').join(String(vars[k]));
    });
  }
  return s;
}

function tx(s) {
  if (s == null || s === '') return s;
  if (lang !== 'en') return s;
  if (Object.prototype.hasOwnProperty.call(EN_TEXT, s)) return EN_TEXT[s];
  return s;
}

function applyUi() {
  document.documentElement.lang = lang;
  document.title = lang === 'en' ? 'Neli — demo' : 'Нэли — демо';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('is-on', btn.getAttribute('data-lang') === lang);
  });
  const nameInput = document.getElementById('name-input');
  if (nameInput && (nameInput.value === 'Нэли' || nameInput.value === 'Neli')) {
    nameInput.value = t('ui.defaultName');
  }
}

function setLang(next) {
  lang = next === 'en' ? 'en' : 'ru';
  try { localStorage.setItem('neli-lang', lang); } catch (_) { /* ignore */ }
  applyUi();
  if (typeof window.onNeliLangChange === 'function') window.onNeliLangChange();
}

try {
  const saved = localStorage.getItem('neli-lang');
  if (saved === 'en' || saved === 'ru') lang = saved;
} catch (_) { /* ignore */ }

Object.keys(EN_TEXT).forEach((k) => {
  EN_TEXT[k + '\n\nНачните сначала.'] = EN_TEXT[k] + '\n\nStart from the beginning.';
});

applyUi();
