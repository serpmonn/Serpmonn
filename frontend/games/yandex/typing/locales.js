window.SERPMONN_LOCALES = {
  ru: {
    htmlLang: 'ru',
    title: 'Скорость печати Serpmonn',
    heading: 'Скорость печати Serpmonn',
    tab15: '15 сек',
    tab30: '30 сек',
    tab60: '60 сек',
    tabWords: '25 слов',
    wpm: 'WPM',
    acc: 'Точность',
    timer: 'Время',
    best: 'Рекорд',
    clickHint:
      '<span class="kbd">клик</span> или <span class="kbd">Enter</span> чтобы начать &nbsp;·&nbsp; <span class="kbd">Esc</span> рестарт',
    resultTitle: 'РЕЗУЛЬТАТ',
    resWpm: 'WPM',
    resAcc: 'Точность',
    resChars: 'Символов',
    resErrors: 'Ошибок',
    newRecord: '🏆 НОВЫЙ РЕКОРД!',
    retry: 'ЕЩЁ РАЗ',
    newText: 'НОВЫЙ ТЕКСТ',
    historyTitle: 'Последние результаты',
    wordBank: [
      'сервер', 'клиент', 'сеть', 'порт', 'запрос', 'ответ', 'файл', 'данные', 'код', 'функция',
      'класс', 'объект', 'метод', 'строка', 'массив', 'цикл', 'ошибка', 'тест', 'база', 'таблица',
      'индекс', 'ключ', 'значение', 'токен', 'доступ', 'права', 'сессия', 'кэш', 'буфер', 'поток',
      'процесс', 'память', 'ядро', 'пакет', 'протокол', 'адрес', 'домен', 'хост', 'путь', 'папка',
      'список', 'карта', 'граф', 'узел', 'ребро', 'вес', 'глубина', 'высота', 'ширина', 'скорость',
      'время', 'задача', 'очередь', 'стек', 'вызов', 'возврат', 'аргумент', 'переменная', 'константа', 'тип',
      'число', 'текст', 'булево', 'пустой', 'ноль', 'один', 'два', 'три', 'алгоритм', 'сортировка',
      'поиск', 'фильтр', 'маршрут', 'запись', 'чтение', 'удаление', 'создание', 'обновление', 'версия', 'релиз',
      'ветка', 'коммит', 'слияние', 'конфликт', 'патч', 'билд', 'деплой', 'контейнер', 'образ', 'том',
      'прокси', 'балансировщик',
    ],
  },
  en: {
    htmlLang: 'en',
    title: 'Serpmonn Typing',
    heading: 'Serpmonn Typing',
    tab15: '15 sec',
    tab30: '30 sec',
    tab60: '60 sec',
    tabWords: '25 words',
    wpm: 'WPM',
    acc: 'Accuracy',
    timer: 'Time',
    best: 'Best',
    clickHint:
      '<span class="kbd">click</span> or <span class="kbd">Enter</span> to start &nbsp;·&nbsp; <span class="kbd">Esc</span> restart',
    resultTitle: 'RESULT',
    resWpm: 'WPM',
    resAcc: 'Accuracy',
    resChars: 'Chars',
    resErrors: 'Errors',
    newRecord: '🏆 NEW RECORD!',
    retry: 'AGAIN',
    newText: 'NEW TEXT',
    historyTitle: 'Recent results',
    wordBank: [
      'server', 'client', 'network', 'port', 'request', 'response', 'file', 'data', 'code', 'function',
      'class', 'object', 'method', 'string', 'array', 'loop', 'error', 'test', 'database', 'table',
      'index', 'key', 'value', 'token', 'access', 'rights', 'session', 'cache', 'buffer', 'stream',
      'process', 'memory', 'kernel', 'packet', 'protocol', 'address', 'domain', 'host', 'path', 'folder',
      'list', 'map', 'graph', 'node', 'edge', 'weight', 'depth', 'height', 'width', 'speed',
      'time', 'task', 'queue', 'stack', 'call', 'return', 'argument', 'variable', 'constant', 'type',
      'number', 'text', 'boolean', 'empty', 'null', 'true', 'false', 'algorithm', 'sort', 'search',
      'filter', 'route', 'read', 'write', 'delete', 'create', 'update', 'version', 'release', 'branch',
      'commit', 'merge', 'conflict', 'patch', 'build', 'deploy', 'container', 'image', 'volume', 'proxy',
    ],
  },
};

window.resolveSerpmonnLocale = function (ysdk) {
  let code = 'ru';
  try {
    if (ysdk?.environment?.i18n?.lang) {
      code = String(ysdk.environment.i18n.lang).toLowerCase().slice(0, 2);
    }
  } catch (_) {}
  if (code !== 'en') code = 'ru';
  return window.SERPMONN_LOCALES[code] || window.SERPMONN_LOCALES.ru;
};

window.applySerpmonnLocale = function (loc) {
  if (!loc) return;
  document.documentElement.lang = loc.htmlLang || 'ru';
  document.title = loc.title;

  const set = (sel, text) => {
    const el = document.querySelector(sel);
    if (el && text != null) el.textContent = text;
  };

  set('[data-i18n="heading"]', loc.heading);
  set('[data-i18n="tab15"]', loc.tab15);
  set('[data-i18n="tab30"]', loc.tab30);
  set('[data-i18n="tab60"]', loc.tab60);
  set('[data-i18n="tabWords"]', loc.tabWords);
  set('[data-i18n="resultTitle"]', loc.resultTitle);
  set('[data-i18n="retry"]', loc.retry);
  set('[data-i18n="newText"]', loc.newText);
  set('[data-i18n="historyTitle"]', loc.historyTitle);

  const hint = document.querySelector('[data-i18n-html="clickHint"]');
  if (hint && loc.clickHint) hint.innerHTML = loc.clickHint;

  function relabelStat(sel, label, id, valueClass) {
    const wrap = document.querySelector(sel);
    if (!wrap) return;
    const v = document.getElementById(id)?.textContent || '—';
    wrap.innerHTML =
      '<div class="stat-label">' +
      label +
      '</div><div class="stat-value ' +
      valueClass +
      '" id="' +
      id +
      '">' +
      v +
      '</div>';
  }

  relabelStat('[data-i18n-wpm]', loc.wpm, 'liveWpm', 'wpm');
  relabelStat('[data-i18n-acc]', loc.acc, 'liveAcc', 'acc');
  relabelStat('[data-i18n-timer]', loc.timer, 'liveTimer', 'timer');
  relabelStat('[data-i18n-best]', loc.best, 'liveBest', 'best');

  function relabelResult(sel, label, id, style) {
    const wrap = document.querySelector(sel);
    if (!wrap) return;
    const v = document.getElementById(id)?.textContent || '—';
    wrap.innerHTML =
      '<div class="result-label">' +
      label +
      '</div><div class="result-val" id="' +
      id +
      '"' +
      (style ? ' style="' + style + '"' : '') +
      '>' +
      v +
      '</div>';
  }

  relabelResult('[data-i18n-res-wpm]', loc.resWpm, 'resWpm', 'color:var(--primary)');
  relabelResult('[data-i18n-res-acc]', loc.resAcc, 'resAcc', 'color:var(--success)');
  relabelResult('[data-i18n-res-chars]', loc.resChars, 'resChars', 'color:var(--text)');
  relabelResult('[data-i18n-res-errors]', loc.resErrors, 'resErrors', 'color:var(--error)');

  window.i18n = {
    newRecord: loc.newRecord,
    wordBank: Array.isArray(loc.wordBank) ? loc.wordBank.slice() : [],
    lang: loc.htmlLang || 'ru',
  };

  if (typeof window.__typingOnLocale === 'function') {
    window.__typingOnLocale();
  }
};
