/** Manual channel: checklist for Pinterest / X / VC.ru / forums. */

export const id = 'manual';
export const label = 'Прочие (Pinterest, X, VC.ru…)';
export const formats = ['text', 'video'];

export function isConfigured() {
  return true;
}

export function supports(item) {
  const f = String(item?.format || 'text');
  return formats.includes(f);
}

export async function healthCheck() {
  return { ok: true, detail: 'Чеклист для площадок без API' };
}

/**
 * «Публикация» = зафиксировать инструкцию для ручного поста.
 */
export async function publish(item) {
  const title = String(item.title || '').trim();
  const body = String(item.body || '').trim();
  const cta = String(item.cta_url || '').trim();
  const checklist = item.meta?.channelAdaptations?.manual?.checklist || [
    'Скопируй текст',
    'Опубликуй на площадке',
    'Внеси ссылку и охват в отчёт'
  ];
  const hint = [
    'Скопируй и опубликуй вручную (Pinterest, X, VC.ru, форумы…):',
    title ? `Заголовок: ${title}` : null,
    body || null,
    cta ? `Ссылка: ${cta}` : null,
    '',
    'Чеклист:',
    ...checklist.map((s, i) => `${i + 1}. ${s}`)
  ]
    .filter((x) => x != null)
    .join('\n\n');

  return {
    ok: true,
    url: null,
    detail: hint,
    manual: true
  };
}
