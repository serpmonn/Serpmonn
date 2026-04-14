import dotenv from 'dotenv';
import { resolve } from 'path';
import { query } from '../database/config.mjs';
import { sendPromoEmail } from '../utils/mailer.mjs';
import { filterPromocodes, loadPromocodesFromAPI } from '../promocodes/promocodesRoutes.mjs';

// 1. Загружаем .env так же, как в других файлах
dotenv.config({
  path: process.env.NODE_ENV === 'production'
    ? '/var/www/serpmonn.ru/backend/.env'
    : resolve(process.cwd(), 'backend/.env')
});

// 2. Выборка промокодов для письма (без is_top и country)
function getPromoSelectionForEmail(limit = 8) {
  // Берём только активные
  let promos = filterPromocodes({ status: 'active' });

  // Оставляем только записи с реальным промокодом
  promos = promos.filter(p => !!p.promocode);

  // Простейшая сортировка по сроку действия:
  // сначала с датой (ближайшие дедлайны), потом без даты
  promos.sort((a, b) => {
    const aDate = a.valid_until ? new Date(a.valid_until) : null;
    const bDate = b.valid_until ? new Date(b.valid_until) : null;

    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;
    if (aDate && bDate) return aDate - bDate;
    return 0;
  });

  return promos.slice(0, limit);
}

async function main() {
  // 3. Берём всех активных подписчиков
  const subs = await query(
    `SELECT email
     FROM subscriptions
     WHERE is_active = 1`
  );

  console.log(`Найдено активных подписчиков: ${subs.length}`);

  if (!subs.length) {
    console.log('Нет активных подписчиков — рассылку пропускаем.');
    return;
  }

  // 4. Принудительно загружаем промокоды перед выборкой
  console.log('Принудительная загрузка промокодов для рассылки...');
  const loaded = await loadPromocodesFromAPI();

  if (!loaded) {
    console.log('Не удалось загрузить промокоды — рассылку пропускаем.');
    return;
  }

  // 5. Берём промокоды для дайджеста
  const promos = getPromoSelectionForEmail(8);

  console.log('Промокодов в кэше:', filterPromocodes({}).length);
  console.log('Промокодов в дайджесте:', promos.length);

  if (!promos.length) {
    console.log('Нет промокодов для рассылки — выходим.');
    return;
  }

  // 6. Собираем текстовую версию
const promoLinesText = promos.map((p, i) => {
  const discount = p.discount_percent
    ? `${p.discount_percent}%`
    : (p.discount_amount ? `${p.discount_amount} ₽` : 'Специальное предложение');

  const valid = p.valid_until
    ? `Действует до: ${new Date(p.valid_until).toLocaleDateString('ru-RU')}`
    : '';

  const shortText = p.bonus_description
    ? p.bonus_description
    : (p.description || '');

  return `${i + 1}) ${p.title}
${discount}
${shortText ? `${shortText}\n` : ''}Код: ${p.promocode}
${valid}
${p.landing_url ? `Ссылка: ${p.landing_url}` : ''}`;
}).join('\n\n');

const promoText = `
${promoLinesText}

Полный список промокодов и акций смотрите на Serpmonn.
`.trim();

  // 7. HTML‑версия (таблица, с выделением промокода)
const promoLinesHtml = promos.map((p, i) => {
  const discount = p.discount_percent
    ? `${p.discount_percent}%`
    : (p.discount_amount ? `${p.discount_amount} ₽` : 'Специальное предложение');

  const valid = p.valid_until
    ? `Действует до: ${new Date(p.valid_until).toLocaleDateString('ru-RU')}`
    : '';

  const shortText = p.bonus_description
    ? p.bonus_description
    : (p.description || '');

  return `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <strong style="font-size:16px;">${i + 1}) ${p.title}</strong><br />
        <span style="color:#111;">${discount}</span><br />
        ${shortText ? `
          <div style="margin:4px 0 4px 0;color:#444;font-size:13px;line-height:1.4;">
            ${shortText}
          </div>
        ` : ''}
        ${p.promocode ? `
          <div style="margin:6px 0 4px 0;">
              <span style="font-size:12px;color:#555;">Промокод (выделите и скопируйте):</span><br />
              <span style="
              display:inline-block;
              margin-top:2px;
              padding:6px 10px;
              border-radius:4px;
              border:1px dashed #dc3545;
              font-weight:bold;
              font-size:16px;
              letter-spacing:1px;
              color:#dc3545;
              font-family: 'Courier New', monospace;
              ">
              ${p.promocode}
              </span>
          </div>
        ` : ''}
        ${valid ? `<span style="color:#666;font-size:12px;">${valid}</span><br />` : ''}
        ${p.landing_url ? `<a href="${p.landing_url}" style="color:#dc3545;">Активировать промокод</a>` : ''}
      </td>
    </tr>
  `;
}).join('');

  const promoHtmlBlock = `
  <table style="width:100%; border-collapse:collapse;">
    ${promoLinesHtml}
  </table>
  <p style="margin-top:16px;">
    Больше промокодов и акций — на странице
    <a href="https://serpmonn.ru/frontend/promo-codes-and-discounts/promokody-skidki.html" style="color:#dc3545;">
      «Промокоды и скидки»
    </a>.
  </p>
`;

  // 8. Рассылка по подписчикам
  console.log(`Отправляем рассылку ${subs.length} подписчикам...`);

  for (const row of subs) {
    const email = row.email;
    const unsubscribeLink = `https://serpmonn.ru/unsubscribe?email=${encodeURIComponent(email)}`;

    console.log('⏩ Письмо на:', email);

    await sendPromoEmail(email, promoText, unsubscribeLink, promoHtmlBlock);

    // Лёгкий троттлинг, чтобы не заспамить SMTP
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('🎉 Рассылка завершена.');
}

// 9. Запуск
main().catch(err => {
  console.error('Фатальная ошибка рассылки:', err);
  process.exit(1);
});