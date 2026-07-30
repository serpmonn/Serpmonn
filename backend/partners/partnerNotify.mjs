import { transporter } from '../utils/mailer.mjs';
import { query } from '../database/config.mjs';

function adminRecipients() {
  const raw =
    process.env.PARTNER_ADMIN_EMAILS ||
    process.env.HEALTH_ALERT_TO ||
    'serpmon@gmail.com,sergei@serpmonn.ru';
  return String(raw)
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function fromAddress() {
  return process.env.SMTP_FROM || '"Serpmonn Partners" <noreply@serpmonn.ru>';
}

export function getTopupRequisites() {
  return String(process.env.PARTNER_TOPUP_REQUISITES || '')
    .trim()
    .replace(/\\n/g, '\n');
}

function formatRub(amount) {
  return `${Number(amount).toLocaleString('ru-RU')} ₽`;
}

/**
 * Письма при создании заявки на пополнение (ручной режим или до оплаты ЮKassa).
 * Ошибки почты не роняют API.
 */
export async function notifyTopupCreated({
  topupId,
  amount,
  advertiserEmail,
  company,
  provider
}) {
  const admins = adminRecipients();
  const sum = formatRub(amount);
  const who = company
    ? `${advertiserEmail} (${company})`
    : advertiserEmail || '—';
  const prov = provider || 'manual';

  const jobs = [];

  if (admins.length) {
    jobs.push(
      transporter
        .sendMail({
          from: fromAddress(),
          to: admins.join(', '),
          subject: `Партнёры: пополнение баланса #${topupId} — ${sum}`,
          text: [
            `Новая заявка на пополнение партнёрского баланса.`,
            ``,
            `ID: ${topupId}`,
            `Сумма: ${sum}`,
            `Рекламодатель: ${who}`,
            `Способ: ${prov}`,
            ``,
            prov === 'yookassa'
              ? `ЮKassa: баланс зачислится автоматически после успешной оплаты (webhook).`
              : `Админка: https://serpmonn.ru/frontend/admin/partners.html\nПосле поступления денег подтвердите заявку в разделе «Партнёры».`
          ].join('\n')
        })
        .catch((err) => console.error('[partners] topup admin mail', err.message))
    );
  }

  if (advertiserEmail) {
    const lines = [
      `Заявка на пополнение партнёрского баланса #${topupId} на сумму ${sum} принята.`,
      ``
    ];
    if (prov === 'yookassa') {
      lines.push(
        'Оплата картой через ЮKassa. После успешного платежа баланс зачислится автоматически.',
        'Если сумма не появилась сразу — обновите кабинет через минуту.'
      );
    } else {
      const requisites = getTopupRequisites();
      if (requisites) {
        lines.push('Реквизиты для перевода:', requisites, '');
        lines.push(
          `В назначении платежа укажите также номер заявки #${topupId}.`,
          'После перевода баланс поступит после подтверждения.'
        );
      } else {
        lines.push(
          'Если оплата картой недоступна, с вами свяжутся по этому письму либо подтвердят заявку после поступления средств.'
        );
      }
    }
    lines.push('', 'Кабинет: https://serpmonn.ru/frontend/partners/advertiser.html');

    jobs.push(
      transporter
        .sendMail({
          from: fromAddress(),
          to: advertiserEmail,
          subject: `Пополнение партнёрского баланса #${topupId} — ${sum}`,
          text: lines.join('\n')
        })
        .catch((err) => console.error('[partners] topup advertiser mail', err.message))
    );
  }

  await Promise.all(jobs);
}

/**
 * Письмо админам: оффер попал в очередь модерации.
 */
export async function notifyOfferModeration({
  offer,
  advertiserEmail,
  company,
  isUpdate = false
}) {
  const admins = adminRecipients();
  if (!admins.length || !offer) return;

  const who = company
    ? `${advertiserEmail} (${company})`
    : advertiserEmail || '—';
  const title = offer.title || '—';
  const publicId = offer.public_id || '—';
  const country = offer.country || 'RU';
  const erid = offer.erid || '—';
  const hold = offer.hold_days != null ? offer.hold_days : '—';
  const action = isUpdate ? 'Обновлён и снова на модерации' : 'Новый оффер на модерации';

  try {
    await transporter.sendMail({
      from: fromAddress(),
      to: admins.join(', '),
      subject: `Партнёры: модерация оффера #${offer.id} — ${title}`.slice(0, 180),
      text: [
        `${action}.`,
        ``,
        `ID: ${offer.id}`,
        `public_id: ${publicId}`,
        `Название: ${title}`,
        `Тип: ${offer.type || '—'}`,
        `Страна: ${country}`,
        `ERID: ${erid}`,
        `Комиссия: ${offer.commission_text || '—'}`,
        `Холд (дней): ${hold}`,
        `Landing: ${offer.landing_url || '—'}`,
        `Рекламодатель: ${who}`,
        ``,
        `Админка: https://serpmonn.ru/frontend/admin/partners.html`
      ].join('\n')
    });
  } catch (err) {
    console.error('[partners] offer moderation mail', err.message);
  }
}

/** Письмо рекламодателю после автозачисления (ЮKassa / confirm). */
export async function notifyTopupPaid({ topupId }) {
  const id = Number(topupId);
  if (!Number.isFinite(id) || id <= 0) return;
  const rows = await query(
    `SELECT t.amount, t.provider, u.email
     FROM partner_topups t
     JOIN partner_users u ON u.id = t.advertiser_id
     WHERE t.id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row?.email) return;
  const sum = formatRub(row.amount);
  try {
    await transporter.sendMail({
      from: fromAddress(),
      to: row.email,
      subject: `Баланс пополнен #${id} — ${sum}`,
      text: [
        `Пополнение #${id} на сумму ${sum} зачислено на партнёрский баланс.`,
        ``,
        `Кабинет: https://serpmonn.ru/frontend/partners/advertiser.html`
      ].join('\n')
    });
  } catch (err) {
    console.error('[partners] topup paid mail', err.message);
  }
}

/**
 * Уведомление сети о заявке на вывод паблишера.
 */
export async function notifyPayoutRequested({
  payoutId,
  amount,
  publisherEmail,
  method,
  requisites
}) {
  const admins = adminRecipients();
  if (!admins.length) return;
  const sum = formatRub(amount);
  const reqs = String(requisites || '').trim();
  try {
    await transporter.sendMail({
      from: fromAddress(),
      to: admins.join(', '),
      subject: `Партнёры: заявка на вывод #${payoutId} — ${sum}`,
      text: [
        `Новая заявка на вывод.`,
        ``,
        `ID: ${payoutId}`,
        `Сумма: ${sum}`,
        `Паблишер: ${publisherEmail || '—'}`,
        `Способ: ${method || '—'}`,
        `Реквизиты:`,
        reqs || '—',
        ``,
        `Админка: https://serpmonn.ru/frontend/admin/partners.html`
      ].join('\n')
    });
  } catch (err) {
    console.error('[partners] payout admin mail', err.message);
  }
}
