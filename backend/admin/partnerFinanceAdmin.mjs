import {
  listPendingTopups,
  confirmTopup,
  cancelTopup,
  listOpenPayouts,
  markPayoutPaid,
  rejectPayout,
  getNetworkWallet,
  PARTNER_FEE_RATE
} from '../partners/partnerFinance.mjs';
import { ensurePartnerTables } from '../partners/partnerModel.mjs';
import { query } from '../database/config.mjs';
import { notifyTopupPaid } from '../partners/partnerNotify.mjs';

export async function listPartnerTopups(_req, res) {
  try {
    await ensurePartnerTables();
    const topups = await listPendingTopups();
    return res.json({ topups, feeRate: PARTNER_FEE_RATE });
  } catch (err) {
    console.error('[admin] partner topups', err);
    return res.status(500).json({ message: 'Ошибка загрузки пополнений' });
  }
}

export async function confirmPartnerTopup(req, res) {
  try {
    await ensurePartnerTables();
    const id = Number(req.params.id);
    const rows = await query(`SELECT provider, status FROM partner_topups WHERE id = ? LIMIT 1`, [id]);
    const row = rows[0];
    if (!row) return res.status(404).json({ message: 'Не найдено' });
    if (row.provider === 'yookassa' && !req.body?.forceManual) {
      return res.status(409).json({
        message:
          'ЮKassa зачисляет баланс сама после оплаты. Ручное подтверждение не нужно (forceManual — только если webhook не сработал).'
      });
    }
    const result = await confirmTopup(id);
    if (!result.ok) return res.status(409).json({ message: result.message });
    setImmediate(() => {
      notifyTopupPaid({ topupId: id }).catch(() => {});
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin] confirm topup', err);
    return res.status(500).json({ message: 'Ошибка подтверждения' });
  }
}

export async function cancelPartnerTopup(req, res) {
  try {
    await ensurePartnerTables();
    const id = Number(req.params.id);
    const ok = await cancelTopup(id);
    if (!ok) return res.status(409).json({ message: 'Нельзя отменить' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin] cancel topup', err);
    return res.status(500).json({ message: 'Ошибка отмены' });
  }
}

export async function listPartnerPayouts(_req, res) {
  try {
    await ensurePartnerTables();
    const payouts = await listOpenPayouts();
    const network = await getNetworkWallet();
    return res.json({
      payouts,
      network: network
        ? { balance: Number(network.balance), currency: network.currency }
        : null,
      feeRate: PARTNER_FEE_RATE
    });
  } catch (err) {
    console.error('[admin] partner payouts', err);
    return res.status(500).json({ message: 'Ошибка загрузки выплат' });
  }
}

export async function payPartnerPayout(req, res) {
  try {
    await ensurePartnerTables();
    const id = Number(req.params.id);
    const note = req.body?.note != null ? String(req.body.note).slice(0, 512) : null;
    const result = await markPayoutPaid(id, note);
    if (!result.ok) return res.status(409).json({ message: result.message });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin] pay payout', err);
    return res.status(500).json({ message: 'Ошибка выплаты' });
  }
}

export async function rejectPartnerPayout(req, res) {
  try {
    await ensurePartnerTables();
    const id = Number(req.params.id);
    const note = req.body?.note != null ? String(req.body.note).slice(0, 512) : 'Отклонено';
    const result = await rejectPayout(id, note);
    if (!result.ok) return res.status(409).json({ message: result.message });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin] reject payout', err);
    return res.status(500).json({ message: 'Ошибка отклонения' });
  }
}
