/**
 * Дзен: semi-manual канал.
 * Система готовит адаптированный текст + чеклист; человек публикует в Дзен.
 */

import { payloadForChannel } from '../channel-adapt.mjs';

export const id = 'dzen';
export const label = 'Дзен';
export const formats = ['text'];

export function isConfigured() {
  return true;
}

export function supports(item) {
  return String(item?.format || 'text') === 'text';
}

export async function healthCheck() {
  return {
    ok: true,
    detail: 'Manual: скопируй текст/обложку в Дзен по чеклисту'
  };
}

export async function publish(item) {
  const payload = payloadForChannel(item, 'dzen');
  const checklist = payload.checklist || [
    'Создай материал в Дзен',
    'Вставь заголовок и текст',
    'Добавь обложку',
    'Опубликуй и сохрани ссылку'
  ];

  const hint = [
    '=== Дзен (ручная публикация) ===',
    payload.title ? `Заголовок: ${payload.title}` : null,
    '',
    payload.body || '',
    '',
    payload.cta_url ? `CTA: ${payload.cta_url}` : null,
    item.media_path ? `Обложка (файл): ${item.media_path}` : null,
    '',
    'Чеклист:',
    ...checklist.map((s, i) => `${i + 1}. ${s}`)
  ]
    .filter((x) => x != null)
    .join('\n');

  return {
    ok: true,
    url: null,
    detail: hint,
    manual: true
  };
}
