/** Rutube Serpmonn Ads: пока manual (Студия), без auto-upload API. */

export const id = 'rutube';
export const label = 'Rutube Serpmonn Ads';
export const formats = ['video'];

export const CHANNEL_URL = 'https://rutube.ru/channel/59136572/';
export const STUDIO_URL = 'https://studio.rutube.ru/';

export function isConfigured() {
  return true;
}

export function supports(item) {
  const f = String(item?.format || 'text');
  return formats.includes(f);
}

export async function healthCheck() {
  return {
    ok: true,
    detail: `Manual · ${CHANNEL_URL}`
  };
}

/**
 * «Публикация» = чеклист: загрузить Shorts в Студию RuTube.
 */
export async function publish(item) {
  const title = String(item.title || '').trim();
  const body = String(item.body || '').trim();
  const cta = String(item.cta_url || '').trim();
  const media = String(item.media_path || '').trim();
  const checklist = item.meta?.channelAdaptations?.rutube?.checklist || [
    `Открой Студию: ${STUDIO_URL}`,
    'Загрузи вертикальное видео (Shorts)',
    'Вставь заголовок и описание',
    'Опубликуй на канале Serpmonn Ads',
    'Верни ссылку на ролик и охват в отчёт'
  ];
  const hint = [
    'RuTube Serpmonn Ads — публикация вручную:',
    `Канал: ${CHANNEL_URL}`,
    title ? `Заголовок: ${title}` : null,
    body || null,
    cta ? `Ссылка в описании: ${cta}` : null,
    media ? `Файл: ${media}` : null,
    '',
    'Чеклист:',
    ...checklist.map((s, i) => `${i + 1}. ${s}`)
  ]
    .filter((x) => x != null)
    .join('\n\n');

  return {
    ok: true,
    url: CHANNEL_URL,
    detail: hint,
    manual: true
  };
}
