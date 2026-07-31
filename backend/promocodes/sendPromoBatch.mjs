import dotenv from 'dotenv';
import { resolve } from 'path';
import { query } from '../database/config.mjs';
import { sendPromoEmail } from '../utils/mailer.mjs';
import { filterPromocodes, loadPromocodesFromAPI } from '../promocodes/promocodesRoutes.mjs';

dotenv.config({
  path: process.env.NODE_ENV === 'production'
    ? '/var/www/serpmonn.ru/backend/.env'
    : resolve(process.cwd(), 'backend/.env')
});

const DIGEST_LIMIT = 6;
const HIT_COUNT = 2;
const PROMO_PAGE_URL =
  'https://serpmonn.ru/frontend/promo-codes-and-discounts/promokody-skidki.html';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function promoKey(p) {
  return String(p.id || `${p.promocode}|${p.title}`);
}

function formatDiscount(p) {
  if (p.discount_percent) return `${p.discount_percent}%`;
  if (p.discount_amount) return `${p.discount_amount} ₽`;
  return 'Специальное предложение';
}

function formatValidUntil(p) {
  if (!p.valid_until) return '';
  return `Действует до: ${new Date(p.valid_until).toLocaleDateString('ru-RU')}`;
}

function shortDescription(p) {
  return p.bonus_description || p.description || '';
}

/** Топ по скидке (хиты) + остальное по ближайшему сроку. */
function getPromoSelectionForEmail(limit = DIGEST_LIMIT) {
  let promos = filterPromocodes({ status: 'active' }).filter((p) => !!p.promocode);
  if (!promos.length) return [];

  const byDiscount = [...promos].sort(
    (a, b) => (Number(b.discount_percent) || 0) - (Number(a.discount_percent) || 0)
  );
  const hits = byDiscount.slice(0, Math.min(HIT_COUNT, limit));
  const hitKeys = new Set(hits.map(promoKey));

  const rest = promos
    .filter((p) => !hitKeys.has(promoKey(p)))
    .sort((a, b) => {
      const aDate = a.valid_until ? new Date(a.valid_until) : null;
      const bDate = b.valid_until ? new Date(b.valid_until) : null;
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      if (aDate && bDate) return aDate - bDate;
      return 0;
    });

  return [...hits, ...rest].slice(0, limit);
}

function buildSubject(promos) {
  const maxPct = Math.max(0, ...promos.map((p) => Number(p.discount_percent) || 0));
  if (maxPct >= 10) return `Скидки до ${maxPct}%: подборка Serpmonn`;
  return 'Свежие промокоды: подборка Serpmonn';
}

function renderPromoRowHtml(p, { hit = false } = {}) {
  const title = escapeHtml(p.title);
  const discount = escapeHtml(formatDiscount(p));
  const valid = escapeHtml(formatValidUntil(p));
  const shortText = escapeHtml(shortDescription(p));
  const code = escapeHtml(p.promocode);
  const url = p.landing_url ? escapeHtml(p.landing_url) : '';

  const titleSize = hit ? '18px' : '15px';
  const pad = hit ? '16px 14px' : '12px 10px';
  const bg = hit ? '#fff5f5' : '#ffffff';
  const border = hit ? '1px solid #f5c2c7' : '1px solid #eee';

  return `
    <tr>
      <td style="padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};border:${border};border-radius:8px;">
          <tr>
            <td style="padding:${pad};">
              ${hit ? '<div style="font-size:11px;color:#dc3545;font-weight:bold;letter-spacing:0.04em;margin-bottom:6px;">ХИТ</div>' : ''}
              <div style="font-size:${titleSize};font-weight:bold;color:#222;line-height:1.3;">${title}</div>
              <div style="margin-top:6px;font-size:15px;font-weight:bold;color:#111;">${discount}</div>
              ${shortText ? `<div style="margin-top:6px;color:#555;font-size:13px;line-height:1.4;">${shortText}</div>` : ''}
              ${code ? `
                <div style="margin-top:10px;">
                  <div style="font-size:12px;color:#666;margin-bottom:4px;">Промокод:</div>
                  <span style="display:inline-block;padding:8px 12px;border-radius:6px;border:1px dashed #dc3545;font-weight:bold;font-size:${hit ? '18px' : '15px'};letter-spacing:1px;color:#dc3545;font-family:'Courier New',monospace;background:#fff;">
                    ${code}
                  </span>
                </div>
              ` : ''}
              ${valid ? `<div style="margin-top:8px;color:#777;font-size:12px;">${valid}</div>` : ''}
              ${url ? `
                <table cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
                  <tr>
                    <td bgcolor="#dc3545" style="border-radius:6px;">
                      <a href="${url}" style="display:inline-block;padding:10px 16px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">
                        Забрать скидку
                      </a>
                    </td>
                  </tr>
                </table>
              ` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function buildPromoHtmlBlock(promos) {
  const hits = promos.slice(0, HIT_COUNT);
  const rest = promos.slice(HIT_COUNT);

  const hitsHtml = hits.map((p) => renderPromoRowHtml(p, { hit: true })).join('');
  const restHtml = rest.map((p) => renderPromoRowHtml(p, { hit: false })).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${hitsHtml}
      ${restHtml}
      <tr>
        <td style="padding:20px 0 8px 0;text-align:center;">
          <table cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              <td bgcolor="#111111" style="border-radius:8px;">
                <a href="${PROMO_PAGE_URL}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">
                  Все промокоды на сайте
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function buildPromoText(promos) {
  const lines = promos
    .map((p, i) => {
      const tag = i < HIT_COUNT ? ' [хит]' : '';
      return `${i + 1})${tag} ${p.title}
${formatDiscount(p)}
${shortDescription(p) ? `${shortDescription(p)}\n` : ''}Код: ${p.promocode}
${formatValidUntil(p)}
${p.landing_url ? `Ссылка: ${p.landing_url}` : ''}`.trim();
    })
    .join('\n\n');

  return `${lines}

Полный список: ${PROMO_PAGE_URL}`.trim();
}

async function main() {
  const testEmail = String(process.env.PROMO_TEST_EMAIL || '').trim();

  let subs;
  if (testEmail) {
    subs = [{ email: testEmail }];
    console.log(`ТЕСТ-режим: только ${testEmail}`);
  } else {
    subs = await query(
      `SELECT email
       FROM subscriptions
       WHERE is_active = 1`
    );
    console.log(`Найдено активных подписчиков: ${subs.length}`);
  }

  if (!subs.length) {
    console.log('Нет активных подписчиков — рассылку пропускаем.');
    return;
  }

  console.log('Принудительная загрузка промокодов для рассылки...');
  const loaded = await loadPromocodesFromAPI();

  if (!loaded) {
    console.log('Не удалось загрузить промокоды — рассылку пропускаем.');
    return;
  }

  const promos = getPromoSelectionForEmail(DIGEST_LIMIT);

  console.log('Промокодов в кэше:', filterPromocodes({}).length);
  console.log('Промокодов в дайджесте:', promos.length);

  if (!promos.length) {
    console.log('Нет промокодов для рассылки — выходим.');
    return;
  }

  const subject = buildSubject(promos);
  const promoText = buildPromoText(promos);
  const promoHtmlBlock = buildPromoHtmlBlock(promos);

  console.log('Тема письма:', subject);
  console.log(`Отправляем рассылку ${subs.length} подписчикам...`);

  for (const row of subs) {
    const email = row.email;
    const unsubscribeLink = `https://serpmonn.ru/unsubscribe?email=${encodeURIComponent(email)}`;

    console.log('⏩ Письмо на:', email);

    await sendPromoEmail(email, promoText, unsubscribeLink, promoHtmlBlock, {
      subject,
      headerTitle: 'Подборка промокодов'
    });

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log('🎉 Рассылка завершена.');
}

main().catch((err) => {
  console.error('Фатальная ошибка рассылки:', err);
  process.exit(1);
});
