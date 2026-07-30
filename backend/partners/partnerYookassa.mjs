import { randomUUID } from 'crypto';
import YooKassa from '../yookassa/yookassaClient.mjs';
import { getRequestIp, isYooKassaIp } from '../yookassa/yookassaWebhookAuth.mjs';
import {
  createTopup,
  confirmTopup,
  findTopupByPaymentId,
  attachTopupPaymentId,
  cancelTopup,
  markPayoutPaid,
  setPayoutProviderId,
  findPayoutById,
  listTopupsForAdvertiser,
  PARTNER_FEE_RATE
} from './partnerFinance.mjs';
import { notifyTopupPaid } from './partnerNotify.mjs';

function formatAmount(value) {
  return Number(value).toFixed(2);
}

function paymentsClient() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) return null;
  return new YooKassa({ shopId, secretKey });
}

function payoutsClient() {
  const shopId = process.env.YOOKASSA_PAYOUT_SHOP_ID || process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_PAYOUT_SECRET_KEY || process.env.YOOKASSA_SECRET_KEY;
  // Без явного PAYOUT_SHOP_ID не дергаем payouts API тем же магазином приёма — часто 403
  if (!process.env.YOOKASSA_PAYOUT_SHOP_ID || !process.env.YOOKASSA_PAYOUT_SECRET_KEY) {
    return null;
  }
  return new YooKassa({ shopId, secretKey });
}

export function yookassaPaymentsEnabled() {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

export function yookassaPayoutsEnabled() {
  return Boolean(process.env.YOOKASSA_PAYOUT_SHOP_ID && process.env.YOOKASSA_PAYOUT_SECRET_KEY);
}

function returnUrl() {
  return (
    process.env.PARTNER_YOOKASSA_RETURN_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://serpmonn.ru/frontend/partners/advertiser.html'
      : 'https://dev.serpmonn.ru/frontend/partners/advertiser.html')
  );
}

/**
 * Создать заявку + платёж ЮKassa на пополнение.
 * @returns {{ topupId, confirmationUrl, paymentId }}
 */
export async function createYookassaTopup({ advertiserId, amount }) {
  const client = paymentsClient();
  if (!client) {
    throw Object.assign(new Error('ЮKassa не настроена'), { status: 503 });
  }
  const topupId = await createTopup({
    advertiserId,
    amount,
    provider: 'yookassa'
  });
  try {
    const payment = await client.createPayment(
      {
        amount: { value: formatAmount(amount), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: returnUrl() },
        capture: true,
        description: `Пополнение партнёрского баланса #${topupId}`.slice(0, 128),
        metadata: {
          type: 'partner_topup',
          topupId: String(topupId),
          advertiserId: String(advertiserId)
        }
      },
      randomUUID()
    );
    await attachTopupPaymentId(topupId, payment.id);
    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      throw Object.assign(new Error('ЮKassa не вернула ссылку оплаты'), { status: 502 });
    }
    return { topupId, paymentId: payment.id, confirmationUrl };
  } catch (err) {
    await cancelTopup(topupId).catch(() => {});
    throw err;
  }
}

export async function handlePartnerYookassaWebhook(req, res) {
  try {
    const ip = getRequestIp(req);
    if (!isYooKassaIp(ip) && process.env.PARTNER_YOOKASSA_SKIP_IP !== '1') {
      console.warn('[partners] yookassa webhook bad IP', ip);
      return res.sendStatus(403);
    }

    const event = req.body?.event;
    const object = req.body?.object;
    if (!object?.id) return res.sendStatus(200);

    if (event === 'payment.succeeded' || object.status === 'succeeded') {
      const client = paymentsClient();
      if (!client) return res.sendStatus(200);
      const payment = await client.getPayment(object.id);
      if (payment.status !== 'succeeded') return res.sendStatus(200);
      await confirmPartnerTopupFromPayment(payment);
      return res.sendStatus(200);
    }

    if (event === 'payout.succeeded' || (object.status === 'succeeded' && object.amount && !object.paid)) {
      // payout object
      const payoutIdMeta = Number(object.metadata?.partnerPayoutId);
      if (payoutIdMeta) {
        await markPayoutPaid(payoutIdMeta, 'yookassa');
      }
      return res.sendStatus(200);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('[partners] yookassa webhook', err);
    return res.sendStatus(500);
  }
}

/**
 * Зачислить партнёрский topup по объекту payment из ЮKassa.
 * Используется из /api/partners/yookassa/webhook и общего /api/yookassa/webhook.
 * @returns {{ handled: boolean, ok?: boolean, message?: string }}
 */
export async function confirmPartnerTopupFromPayment(payment) {
  const meta = payment?.metadata || {};
  if (meta.type !== 'partner_topup') {
    return { handled: false };
  }
  let topupId = Number(meta.topupId);
  if (!topupId) {
    const byPay = await findTopupByPaymentId(payment.id);
    topupId = byPay?.id;
  }
  if (!topupId) {
    console.warn('[partners] yookassa topup id missing', payment.id);
    return { handled: true, ok: false, message: 'topup id missing' };
  }
  await attachTopupPaymentId(topupId, payment.id);
  const paidAmount = Number(payment.amount?.value);
  const result = await confirmTopup(topupId, { expectedAmount: paidAmount });
  if (!result.ok) {
    console.warn('[partners] yookassa confirm topup', topupId, result.message);
    return { handled: true, ok: false, message: result.message };
  }
  setImmediate(() => {
    notifyTopupPaid({ topupId }).catch((err) =>
      console.warn('[partners] topup paid mail', err.message)
    );
  });
  return { handled: true, ok: true };
}

/**
 * Попытка выплаты через ЮKassa (СБП: phone + bank_id в requisites JSON или полях).
 */
export async function tryYookassaPayout(payoutId, { phone, bankId } = {}) {
  const client = payoutsClient();
  if (!client) {
    return { ok: false, message: 'Шлюз выплат ЮKassa не настроен (YOOKASSA_PAYOUT_*)' };
  }
  const payout = await findPayoutById(payoutId);
  if (!payout) return { ok: false, message: 'Не найдено' };

  let destPhone = phone;
  let destBank = bankId;
  if (!destPhone || !destBank) {
    try {
      const parsed = JSON.parse(payout.requisites);
      destPhone = destPhone || parsed.phone;
      destBank = destBank || parsed.bank_id || parsed.bankId;
    } catch {
      // requisites as plain phone
      destPhone = destPhone || String(payout.requisites || '').replace(/\D/g, '');
    }
  }
  if (payout.method === 'sbp' && (!destPhone || !destBank)) {
    return {
      ok: false,
      message: 'Для СБП нужны phone и bank_id (в реквизитах JSON: {"phone":"79…","bank_id":"…"})'
    };
  }

  const payload = {
    amount: { value: formatAmount(payout.amount), currency: 'RUB' },
    description: `Выплата паблишеру #${payout.id}`.slice(0, 128),
    metadata: { type: 'partner_payout', partnerPayoutId: String(payout.id) }
  };

  if (payout.method === 'sbp') {
    payload.payout_destination_data = {
      type: 'sbp',
      phone: String(destPhone).replace(/\D/g, ''),
      bank_id: String(destBank)
    };
  } else if (payout.method === 'card') {
    const card = String(payout.requisites || '').replace(/\s/g, '');
    if (!/^\d{16,19}$/.test(card)) {
      return { ok: false, message: 'Для карты укажите номер (PCI: лучше токенизация позже)' };
    }
    payload.payout_destination_data = { type: 'bank_card', card: { number: card } };
  } else {
    return { ok: false, message: 'Автовыплата только для sbp/card' };
  }

  try {
    const created = await client.createPayout(payload, randomUUID());
    await setPayoutProviderId(payout.id, created.id);
    if (created.status === 'succeeded') {
      await markPayoutPaid(payout.id, 'yookassa');
      return { ok: true, status: created.status, providerId: created.id };
    }
    return { ok: true, status: created.status || 'pending', providerId: created.id };
  } catch (err) {
    return { ok: false, message: err.message || 'Ошибка ЮKassa payout' };
  }
}

export function partnerYookassaInfo() {
  return {
    paymentsEnabled: yookassaPaymentsEnabled(),
    payoutsEnabled: yookassaPayoutsEnabled(),
    feeRate: PARTNER_FEE_RATE,
    currency: 'RUB'
  };
}

/**
 * Подтянуть статус pending-платежа ЮKassa (страховка, если webhook задержался).
 * @returns {{ synced: boolean, paid?: boolean, cancelled?: boolean, status?: string }}
 */
export async function syncYookassaTopup(topup) {
  if (!topup || topup.provider !== 'yookassa' || topup.status !== 'pending') {
    return { synced: false };
  }
  const paymentId = topup.provider_payment_id;
  if (!paymentId) return { synced: false };
  const client = paymentsClient();
  if (!client) return { synced: false };

  const payment = await client.getPayment(paymentId);
  if (payment.status === 'succeeded') {
    const paidAmount = Number(payment.amount?.value);
    const result = await confirmTopup(topup.id, { expectedAmount: paidAmount });
    if (result.ok) {
      setImmediate(() => {
        notifyTopupPaid({ topupId: topup.id }).catch((err) =>
          console.warn('[partners] topup paid mail', err.message)
        );
      });
      return { synced: true, paid: true, status: 'succeeded' };
    }
    return { synced: false, status: 'succeeded', message: result.message };
  }
  if (payment.status === 'canceled') {
    await cancelTopup(topup.id);
    return { synced: true, cancelled: true, status: 'canceled' };
  }
  return { synced: false, status: payment.status };
}

/** Синк всех pending ЮKassa-пополнений рекламодателя (при открытии кабинета). */
export async function syncPendingYookassaTopupsForAdvertiser(advertiserId) {
  if (!yookassaPaymentsEnabled()) return { checked: 0, paid: 0 };
  const rows = await listTopupsForAdvertiser(advertiserId);
  const pending = (rows || []).filter(
    (t) => t.provider === 'yookassa' && t.status === 'pending' && t.provider_payment_id
  );
  let paid = 0;
  for (const t of pending) {
    try {
      const r = await syncYookassaTopup(t);
      if (r.paid) paid += 1;
    } catch (err) {
      console.warn('[partners] sync yookassa topup', t.id, err.message);
    }
  }
  return { checked: pending.length, paid };
}
