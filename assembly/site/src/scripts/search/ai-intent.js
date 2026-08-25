/**
 * Клиентская копия маршрутизации ИИ (image | chat | search).
 * Держать в синхроне с backend/ai-search/ai-intent.mjs
 */

const IMAGE_RE =
  /(?:нарис\w*|сгенер\w*|генерац\w*\s+(?:картин|изображ|рисун)|создай\s+(?:мне\s+)?(?:картин|изображ|рисун)|сделай\s+(?:мне\s+)?(?:картин|изображ|рисун)|draw(?:\s+me)?\b|generate(?:\s+an?)?\s+image|create(?:\s+an?)?\s+image|text2image|paint\b|(?:картинк|изображен|рисунк)\w*)/i;

const WEB_SEARCH_RE =
  /(?:^|\s)(?:найди|найти|поищи|поиск|что\s+такое|кто\s+так(?:ой|ая)|сколько\s+стоит|курс|погода|новост|когда\s+(?:выходит|будет)|где\s+(?:купить|находится|скачать)|как\s+(?:добраться|попасть)|сравни|актуальн|последн(?:ие|ий|яя)\s+новост|what\s+is|who\s+is|search|find|look\s+up|how\s+much|weather|news|latest)(?:\s|$|,|:|\?)/i;

const CHATTY_RE =
  /^(?:привет|здравствуй(?:те)?|хай|хелло|hello|hi|hey|добр(?:ый|ое|ой)\s+(?:день|утро|вечер)|как\s+дела|что\s+умеешь|помоги|спасибо|благодарю|ок+|хорошо|ладно|понял|угу|ага|да|нет|перефразируй|продолж(?:ай|и)|ещё|еще|а\s+если|почему|зачем|объясни(?:\s+проще)?|расскажи(?:\s+подробнее)?|шутк[ау]|анекдот)[\s!.?…]*$/i;

const PERSONAL_RE =
  /\b(?:я|мне|меня|мой|моя|моё|мое|мы|ты|вы|муж|жена|друг|подруга|пожалуйста)\b/i;

function looksLikeConversation(text) {
  const t = String(text || '').trim();
  if (!t || WEB_SEARCH_RE.test(t) || IMAGE_RE.test(text)) return false;
  if (PERSONAL_RE.test(t)) return true;
  const cyr = (t.match(/[а-яё]/gi) || []).length;
  const lat = (t.match(/[a-z]/gi) || []).length;
  if (t.length <= 12 && !/\d{2,}/.test(t)) return true;
  if (cyr > lat && cyr >= 10 && /\s/.test(t)) return true;
  return false;
}

function detectAiIntent(query, opts = {}) {
  const text = String(query || '').trim();
  if (!text) return 'search';

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

export { detectAiIntent, IMAGE_RE };
