const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MAIN_MODEL = 'serpmonn-ai-search:latest';
const OLLAMA_FAST_MODEL = 'serpmonn-ai-fast:latest';
const ATTACHMENT_TEXT_MAX_CHARS = 32000;

function normalizeAiAnswer(answer, t) {
  const trimmed = (answer || '').trim();

  if (!trimmed || trimmed === t.noModelText) {
    return {
      text: t.emptyAnswer,
      isEmpty: true,
      reason: 'empty',
    };
  }

  const noDataRe =
    /^(no information found in the provided data\.?|нет информации[_\s-]*found[_\s-]*in[_\s-]*the[_\s-]*provided[_\s-]*data\.?|в источниках из сети не найдено информации по этой теме\.?|данные из веб-поиска не получены\.?)$/i;

  if (noDataRe.test(trimmed)) {
    return {
      text: t.noDataAnswer,
      isEmpty: true,
      reason: 'no_data',
    };
  }

  return {
    text: trimmed,
    isEmpty: false,
    reason: null,
  };
}

function normalizeQueryForHeuristics(query) {
  return String(query || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[«»""„"]/g, '"');
}

const ATTACHMENT_WEB_INTENT_PATTERNS = [
  /\b(сравни|compare|versus|vs\.?)\b/i,
  /\b(актуальн|сейчас|сегодня|currently|today|now|latest)\b/i,
  /\b(курс|цена|стоимость|rate|price|cost)\b/i,
  /\b(новост|news)\b/i,
  /\b(в\s+интернет|в\s+сети|online|internet|web)\b/i,
  /\b(правда\s+ли|это\s+правда|верно\s+ли|is\s+it\s+true)\b/i,
  /\b(закон|законодательств|legal|regulation|compliance|comply)\b/i,
  /\b(найди|поищи|search|find|lookup)\b/i,
  /\b(соответствует|соответствие)\b/i,
  /\b(судебн|практик|precedent)\b/i,
  /\b(рынок|market|бирж)\b/i,
];

const ATTACHMENT_FILE_ONLY_PATTERNS = [
  /^что\s+(тут|здесь|это)\??$/i,
  /^о\s+ч[её]м\s+(тут|здесь|это|файл|документ)\??$/i,
  /^(перескажи|кратко|резюме|summary|summarize)(\s+(файл|текст|документ|this))?\.?$/i,
  /^(что\s+)?(написано|в\s+файле|в\s+документе)\??$/i,
  /^(прочитай|проанализируй)\s+(файл|документ|текст)\??$/i,
  /^(переведи|translate)\s+(файл|текст|документ|это)\??$/i,
  /^(извлеки|выдели)\s+(главное|суть|ключевое)\??$/i,
  /^(в\s+файле|в\s+документе|по\s+файлу|по\s+документу)\b/i,
  /^(этот\s+)?(файл|документ|текст)\s+(о\s+чем|про\s+что)\??$/i,
  /\b(прикрепл[её]нн|вложенн|attached|uploaded)\s+(файл|документ|текст)\b/i,
];

function resolveAttachmentSearchMode(query) {
  const q = normalizeQueryForHeuristics(query);

  if (!q) {
    return { fileOnly: true, reason: 'empty_query' };
  }

  if (ATTACHMENT_WEB_INTENT_PATTERNS.some((pattern) => pattern.test(q))) {
    return { fileOnly: false, reason: 'web_intent' };
  }

  if (ATTACHMENT_FILE_ONLY_PATTERNS.some((pattern) => pattern.test(q))) {
    return { fileOnly: true, reason: 'document_intent' };
  }

  if (q.length <= 28) {
    return { fileOnly: true, reason: 'short_query' };
  }

  if (/\b(файл|документ|текст|document|file|attachment)\b/i.test(q)) {
    return { fileOnly: true, reason: 'document_keyword' };
  }

  return { fileOnly: false, reason: 'default_hybrid' };
}

function buildOllamaMessages(query, webContext, attachment = null, options = {}) {
  const hasAttachment = Boolean(attachment?.text);
  const fileOnly = hasAttachment && options.fileOnly === true;
  const hasWebHits = options.hasWebHits === true;

  let systemBase =
    'You are Serpmonn search assistant. ' +
    'Reply only in the same language as the user question. ' +
    'Reply in 1-2 short sentences. ' +
    'Use facts only, without introductions. ';

  if (fileOnly) {
    systemBase +=
      'You are given an attached text file. ' +
      'Answer the question using ONLY the attached file content. ' +
      'Do not use outside knowledge. ' +
      'If the answer is not in the file, reply exactly: "No information found in the provided data."';
  } else if (hasAttachment) {
    systemBase +=
      'You are given an attached text file and web search results. ' +
      'Prefer the attached file when it answers the question. ' +
      'Answer using only that data. ';
    if (hasWebHits) {
      systemBase +=
        'If sources discuss the topic but do not name one exact item, say what the sources indicate. ' +
        'Do not claim that information is missing when search results are present.';
    } else {
      systemBase +=
        'If the answer is not present in the data, reply: "No information found in the provided data."';
    }
  } else if (hasWebHits) {
    systemBase +=
      'You are given web search results text. ' +
      'Answer the user question using those results. ' +
      'Summarize the most relevant facts. ' +
      'If sources discuss the topic but do not name one exact item, say what the sources indicate. ' +
      'Do not claim that information is missing when search results are present.';
  } else {
    systemBase +=
      'You are given web search results text. ' +
      'Your task is to answer the user question using only that data. ' +
      'If the answer is not present in the data, reply: "No information found in the provided data."';
  }

  let userContent = '';

  if (hasAttachment) {
    const fileName = attachment.name || 'attachment.txt';
    userContent += `ПРИКРЕПЛЁННЫЙ ФАЙЛ (${fileName}):\n${attachment.text}\n\n`;
  }

  if (!fileOnly) {
    userContent += `ДАННЫЕ ИЗ СЕТИ:\n${webContext}\n\n`;
  }

  userContent += `ВОПРОС: ${query}`;

  return [
    { role: 'system', content: systemBase },
    { role: 'user', content: userContent },
  ];
}

function parseAttachmentInput(body, t) {
  const text = String(body?.attachmentText || '').trim();
  if (!text) return null;

  if (text.length > ATTACHMENT_TEXT_MAX_CHARS) {
    const error = new Error(t.attachmentTooLarge);
    error.status = 400;
    error.isPublic = true;
    throw error;
  }

  const name = String(body?.attachmentName || 'attachment.txt').trim().slice(0, 255);

  return {
    name: name || 'attachment.txt',
    text,
  };
}

const OLLAMA_KEEP_ALIVE = '60m';
const OLLAMA_NUM_CTX = 2048;

function buildOllamaRequestOptions() {
  return {
    temperature: 0.2,
    num_predict: 120,
    top_k: 40,
    top_p: 0.9,
    num_ctx: OLLAMA_NUM_CTX,
  };
}

async function callOllama(model, query, webContext, attachment = null, options = {}) {
  const body = {
    model,
    messages: buildOllamaMessages(query, webContext, attachment, options),
    stream: false,
    keep_alive: OLLAMA_KEEP_ALIVE,
    options: buildOllamaRequestOptions(),
  };

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await res.text();

  if (!res.ok) {
    console.error(`[Ollama] HTTP error ${res.status}`);
    throw new Error(`Ollama HTTP ${res.status}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('[Ollama] JSON parse error:', e.message);
    throw new Error('Ollama JSON parse error');
  }

  const answer =
    data.message?.content ||
    data.choices?.[0]?.message?.content ||
    '';

  if (!answer) {
    console.error('[Ollama] Empty content in response');
    throw new Error('Ollama empty content');
  }

  return answer;
}

async function streamOllama(model, query, webContext, onToken, attachment = null, options = {}) {
  const body = {
    model,
    messages: buildOllamaMessages(query, webContext, attachment, options),
    stream: true,
    keep_alive: OLLAMA_KEEP_ALIVE,
    options: buildOllamaRequestOptions(),
  };

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`[Ollama] HTTP error ${res.status}`);
    throw new Error(`Ollama HTTP ${res.status}`);
  }

  if (!res.body) {
    throw new Error('Ollama streaming body is not available');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let data;
      try {
        data = JSON.parse(trimmed);
      } catch (e) {
        console.error('[Ollama] stream JSON parse error:', e.message);
        continue;
      }

      const chunk = data.message?.content || '';
      if (chunk) {
        answer += chunk;
        onToken(chunk);
      }
    }
  }

  if (!answer) {
    console.error('[Ollama] Empty content in stream');
    throw new Error('Ollama empty content');
  }

  return answer;
}

async function getAiAnswerFromLocalModels(query, webContext, options = {}) {
  const { onToken, attachment = null, fileOnly = false, hasWebHits = false } = options;
  const modelOptions = { fileOnly, hasWebHits };

  try {
    if (onToken) {
      const answer = await streamOllama(
        OLLAMA_MAIN_MODEL,
        query,
        webContext,
        onToken,
        attachment,
        modelOptions
      );
      return { answer, model: OLLAMA_MAIN_MODEL, usedBackup: false };
    }

    const answer = await callOllama(
      OLLAMA_MAIN_MODEL,
      query,
      webContext,
      attachment,
      modelOptions
    );
    return { answer, model: OLLAMA_MAIN_MODEL, usedBackup: false };
  } catch (e) {
    console.error('[AI] Ошибка основной модели:', e.message);
  }

  try {
    if (onToken) {
      const answer = await streamOllama(
        OLLAMA_FAST_MODEL,
        query,
        webContext,
        onToken,
        attachment,
        modelOptions
      );
      return { answer, model: OLLAMA_FAST_MODEL, usedBackup: true };
    }

    const answer = await callOllama(
      OLLAMA_FAST_MODEL,
      query,
      webContext,
      attachment,
      modelOptions
    );
    return { answer, model: OLLAMA_FAST_MODEL, usedBackup: true };
  } catch (e) {
    console.error('[AI] Ошибка backup-модели:', e.message);
  }

  throw new Error('Обе локальные модели Ollama недоступны');
}

async function warmupSearchModel() {
  try {
    await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MAIN_MODEL,
        messages: [{ role: 'user', content: 'ok' }],
        stream: false,
        keep_alive: OLLAMA_KEEP_ALIVE,
        options: { ...buildOllamaRequestOptions(), num_predict: 1 },
      }),
    });
    console.log('[AI] search model warmed, keep_alive=' + OLLAMA_KEEP_ALIVE);
  } catch (e) {
    console.warn('[AI] warmup failed:', e.message);
  }
}

export {
  OLLAMA_URL,
  OLLAMA_MAIN_MODEL,
  OLLAMA_FAST_MODEL,
  ATTACHMENT_TEXT_MAX_CHARS,
  OLLAMA_KEEP_ALIVE,
  normalizeAiAnswer,
  normalizeQueryForHeuristics,
  resolveAttachmentSearchMode,
  buildOllamaMessages,
  parseAttachmentInput,
  callOllama,
  streamOllama,
  getAiAnswerFromLocalModels,
  warmupSearchModel,
};
