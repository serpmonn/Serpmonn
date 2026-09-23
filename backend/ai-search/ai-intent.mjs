/**
 * Маршрутизация запроса в режиме ИИ: image | chat | search.
 * Картинка и чат не должны уезжать в веб-поиск с «найденными» фото.
 */

const IMAGE_RE =
  /(?:нарис\w*|сгенер\w*|генерац\w*\s+(?:картин|изображ|рисун)|создай\s+(?:мне\s+)?(?:картин|изображ|рисун)|сделай\s+(?:мне\s+)?(?:картин|изображ|рисун)|draw(?:\s+me)?\b|generate(?:\s+an?)?\s+image|create(?:\s+an?)?\s+image|text2image|paint\b|(?:картинк|изображен|рисунк)\w*)/i;

const WEB_SEARCH_RE =
  /(?:^|\s)(?:найди|найти|поищи|поиск|что\s+такое|кто\s+так(?:ой|ая)|сколько\s+стоит|курс|погода|новост|когда\s+(?:выходит|будет)|где\s+(?:купить|находится|скачать)|как\s+(?:добраться|попасть)|сравни|актуальн|последн(?:ие|ий|яя)\s+новост|what\s+is|who\s+is|search|find|look\s+up|how\s+much|weather|news|latest)(?:\s|$|,|:|\?)/i;

const CHATTY_RE =
  /^(?:привет|здравствуй(?:те)?|хай|хелло|hello|hi|hey|добр(?:ый|ое|ой)\s+(?:день|утро|вечер)|как\s+дела|что\s+умеешь|помоги|спасибо|благодарю|ок+|хорошо|ладно|понял|угу|ага|да|нет|перефразируй|продолж(?:ай|и)|ещё|еще|а\s+если|почему|зачем|объясни(?:\s+проще)?|расскажи(?:\s+подробнее)?|шутк[ау]|анекдот)[\s!.?…]*$/i;

const PERSONAL_RE =
  /\b(?:я|мне|меня|мой|моя|моё|мое|мы|ты|вы|муж|жена|друг|подруга|пожалуйста)\b/i;

/** Ожидание «осведомителя / досье по всем сайтам» — обычная Выдача так не умеет. */
const DOSSIER_RE =
  /(?:на\s+всех\s+сайтах|со\s+всех\s+\S+|всех\s+источник[а-яёa-z]*|всю\s+информаци[а-яёa-z]*|полн[а-яёa-z]*\s+досье|досье\s+на|осведом|включая\s+фото.{0,60}со\s+всех|find\s+everything(?:\s+about)?|across\s+all\s+(?:the\s+)?(?:sites|sources)|all\s+(?:the\s+)?(?:sites|sources)\s+(?:about|for))/i;

function looksLikeConversation(text) {
  const t = String(text || '').trim();
  if (!t || WEB_SEARCH_RE.test(t) || IMAGE_RE.test(t) || DOSSIER_RE.test(t)) return false;
  if (PERSONAL_RE.test(t)) return true;
  const cyr = (t.match(/[а-яё]/gi) || []).length;
  const lat = (t.match(/[a-z]/gi) || []).length;
  // Короткие «мусорные» реплики и фразы без поисковых маркеров → чат
  if (t.length <= 12 && !/\d{2,}/.test(t)) return true;
  if (cyr > lat && cyr >= 10 && /\s/.test(t)) return true;
  return false;
}

function isDossierQuery(query) {
  return DOSSIER_RE.test(String(query || '').trim());
}

function simplifyDossierQuery(query) {
  let t = String(query || '');
  t = t
    .replace(/найд[иь]\s+информаци[а-яёa-z]*/gi, ' ')
    .replace(/всю\s+информаци[а-яёa-z]*/gi, ' ')
    .replace(/включая\s+фото(?:\s+и\s+видео)?/gi, ' ')
    .replace(/на\s+всех\s+сайтах/gi, ' ')
    .replace(/со\s+всех\s+\S+/gi, ' ')
    .replace(/всех\s+источник[а-яёa-z]*/gi, ' ')
    .replace(/полн[а-яёa-z]*\s+досье\s*(?:на)?/gi, ' ')
    .replace(/досье\s+на/gi, ' ')
    .replace(/find\s+everything(?:\s+about)?/gi, ' ')
    .replace(/across\s+all\s+(?:the\s+)?(?:sites|sources)/gi, ' ')
    .replace(/all\s+(?:the\s+)?(?:sites|sources)\s+(?:about|for)/gi, ' ')
    .replace(/^\s*на\s+/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^(?:информаци[а-яёa-z]*|поиск|найд[иь]|find|search)$/i.test(t)) return '';
  return t;
}

/**
 * @param {string} query
 * @param {{ hasChatHistory?: boolean }} [opts]
 * @returns {'image'|'chat'|'search'}
 */
export function detectAiIntent(query, opts = {}) {
  const text = String(query || '').trim();
  if (!text) return 'search';

  // Картинка — всегда первой, чтобы не уйти в SearX с галереей «найденных»
  if (IMAGE_RE.test(text)) {
    return 'image';
  }

  const hasChat = Boolean(opts.hasChatHistory);
  const wantsWeb = WEB_SEARCH_RE.test(text);

  if (wantsWeb) return 'search';
  if (CHATTY_RE.test(text)) return 'chat';
  if (looksLikeConversation(text)) return 'chat';
  if (hasChat) return 'chat';

  return 'search';
}

export {
  IMAGE_RE,
  WEB_SEARCH_RE,
  CHATTY_RE,
  DOSSIER_RE,
  isDossierQuery,
  simplifyDossierQuery
};
