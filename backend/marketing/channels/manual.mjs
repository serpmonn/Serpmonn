/** Manual channel: prepare copy for DTF / Reddit / etc. No external API. */

export const id = 'manual';
export const label = 'Manual (DTF и др.)';
export const formats = ['text', 'video'];

export function isConfigured() {
  return true;
}

export function supports(item) {
  const f = String(item?.format || 'text');
  return formats.includes(f);
}

export async function healthCheck() {
  return { ok: true, detail: 'Всегда доступен — копируй текст вручную' };
}

/**
 * «Публикация» = зафиксировать инструкцию для ручного поста.
 * Реальной отправки нет.
 */
export async function publish(item) {
  const title = String(item.title || '').trim();
  const body = String(item.body || '').trim();
  const cta = String(item.cta_url || '').trim();
  const hint = [
    'Скопируй текст и опубликуй вручную (DTF, Reddit, LinkedIn…):',
    title ? `Заголовок: ${title}` : null,
    body || null,
    cta ? `Ссылка: ${cta}` : null
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    ok: true,
    url: null,
    detail: hint,
    manual: true
  };
}
