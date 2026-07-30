import { query, getConnection, connQuery } from '../database/config.mjs';

export const PARTNER_FEE_RATE = (() => {
  const n = Number(process.env.PARTNER_NETWORK_FEE_RATE);
  return Number.isFinite(n) && n >= 0 && n < 1 ? n : 0.1;
})();

export const MIN_PAYOUT_AMOUNT = (() => {
  const n = Number(process.env.PARTNER_MIN_PAYOUT);
  return Number.isFinite(n) && n > 0 ? n : 1000;
})();

/** Дефолтный холд начислений паблишеру (дней), если в оффере не задано */
export const CONVERSION_HOLD_DAYS = (() => {
  const n = Number(process.env.PARTNER_CONVERSION_HOLD_DAYS);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 7;
})();

/** Максимум дней холда на оффер */
export const MAX_HOLD_DAYS = (() => {
  const n = Number(process.env.PARTNER_MAX_HOLD_DAYS);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 180;
})();

export function clampHoldDays(raw, fallback = CONVERSION_HOLD_DAYS) {
  if (raw == null || raw === '') return fallback;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_HOLD_DAYS, Math.max(0, n));
}

let financeTablesReady = false;

async function columnExists(table, column) {
  const rows = await query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0]?.c || 0) > 0;
}

export async function ensureFinanceTables() {
  if (financeTablesReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS partner_wallets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NULL,
      kind ENUM('user','network') NOT NULL DEFAULT 'user',
      currency VARCHAR(8) NOT NULL DEFAULT 'RUB',
      balance DECIMAL(14,2) NOT NULL DEFAULT 0,
      hold DECIMAL(14,2) NOT NULL DEFAULT 0,
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_partner_wallet_user (user_id),
      KEY idx_partner_wallet_kind (kind),
      CONSTRAINT fk_partner_wallet_user FOREIGN KEY (user_id) REFERENCES partner_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS partner_ledger (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      wallet_id BIGINT UNSIGNED NOT NULL,
      type ENUM(
        'topup','conversion_publisher','conversion_advertiser','conversion_fee',
        'payout_hold','payout_paid','payout_reject','adjust'
      ) NOT NULL,
      amount DECIMAL(14,2) NOT NULL,
      balance_after DECIMAL(14,2) NOT NULL,
      conversion_id BIGINT UNSIGNED NULL,
      payout_id BIGINT UNSIGNED NULL,
      topup_id BIGINT UNSIGNED NULL,
      meta JSON NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_partner_ledger_wallet (wallet_id),
      KEY idx_partner_ledger_type (type),
      KEY idx_partner_ledger_conv (conversion_id),
      CONSTRAINT fk_partner_ledger_wallet FOREIGN KEY (wallet_id) REFERENCES partner_wallets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS partner_topups (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      advertiser_id BIGINT UNSIGNED NOT NULL,
      amount DECIMAL(14,2) NOT NULL,
      status ENUM('pending','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
      provider ENUM('manual','yookassa') NOT NULL DEFAULT 'manual',
      provider_payment_id VARCHAR(128) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      paid_at DATETIME(3) NULL,
      KEY idx_partner_topup_adv (advertiser_id),
      KEY idx_partner_topup_status (status),
      CONSTRAINT fk_partner_topup_adv FOREIGN KEY (advertiser_id) REFERENCES partner_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS partner_payouts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      publisher_id BIGINT UNSIGNED NOT NULL,
      amount DECIMAL(14,2) NOT NULL,
      status ENUM('requested','approved','paid','rejected') NOT NULL DEFAULT 'requested',
      method ENUM('sbp','card','other') NOT NULL DEFAULT 'sbp',
      requisites VARCHAR(512) NOT NULL,
      admin_note VARCHAR(512) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      processed_at DATETIME(3) NULL,
      KEY idx_partner_payout_pub (publisher_id),
      KEY idx_partner_payout_status (status),
      CONSTRAINT fk_partner_payout_pub FOREIGN KEY (publisher_id) REFERENCES partner_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  const alters = [
    ['partner_conversions', 'publisher_amount', 'DECIMAL(12,2) NULL'],
    ['partner_conversions', 'fee_amount', 'DECIMAL(12,2) NULL'],
    ['partner_conversions', 'advertiser_charge', 'DECIMAL(12,2) NULL'],
    ['partner_conversions', 'settlement_status', "VARCHAR(32) NOT NULL DEFAULT 'pending'"],
    ['partner_conversions', 'available_at', 'DATETIME(3) NULL'],
    ['partner_payouts', 'provider_payout_id', 'VARCHAR(128) NULL']
  ];
  for (const [table, col, def] of alters) {
    if (!(await columnExists(table, col))) {
      await query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    }
  }

  // network wallet: user_id NULL, kind network — unique user_id allows one NULL in MySQL
  const net = await query(`SELECT id FROM partner_wallets WHERE kind = 'network' LIMIT 1`);
  if (!net.length) {
    await query(
      `INSERT INTO partner_wallets (user_id, kind, currency, balance, hold) VALUES (NULL, 'network', 'RUB', 0, 0)`
    );
  }

  financeTablesReady = true;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

export function calcFee(publisherAmount) {
  const pub = round2(publisherAmount);
  const fee = round2(pub * PARTNER_FEE_RATE);
  return { publisherAmount: pub, feeAmount: fee, advertiserCharge: round2(pub + fee) };
}

async function lockWallet(conn, walletId) {
  const rows = await connQuery(conn, `SELECT * FROM partner_wallets WHERE id = ? FOR UPDATE`, [walletId]);
  return rows[0] || null;
}

async function ensureUserWalletTx(conn, userId) {
  let rows = await connQuery(conn, `SELECT * FROM partner_wallets WHERE user_id = ? LIMIT 1 FOR UPDATE`, [userId]);
  if (rows[0]) return rows[0];
  await connQuery(
    conn,
    `INSERT INTO partner_wallets (user_id, kind, currency, balance, hold) VALUES (?, 'user', 'RUB', 0, 0)`,
    [userId]
  );
  rows = await connQuery(conn, `SELECT * FROM partner_wallets WHERE user_id = ? LIMIT 1 FOR UPDATE`, [userId]);
  return rows[0];
}

async function ensureNetworkWalletTx(conn) {
  let rows = await connQuery(conn, `SELECT * FROM partner_wallets WHERE kind = 'network' LIMIT 1 FOR UPDATE`);
  if (rows[0]) return rows[0];
  await connQuery(
    conn,
    `INSERT INTO partner_wallets (user_id, kind, currency, balance, hold) VALUES (NULL, 'network', 'RUB', 0, 0)`
  );
  rows = await connQuery(conn, `SELECT * FROM partner_wallets WHERE kind = 'network' LIMIT 1 FOR UPDATE`);
  return rows[0];
}

async function applyDelta(conn, wallet, delta, type, refs = {}) {
  const next = round2(Number(wallet.balance) + Number(delta));
  if (next < -0.0001) {
    const err = new Error('INSUFFICIENT_FUNDS');
    err.code = 'INSUFFICIENT_FUNDS';
    throw err;
  }
  await connQuery(conn, `UPDATE partner_wallets SET balance = ? WHERE id = ?`, [next, wallet.id]);
  await connQuery(
    conn,
    `INSERT INTO partner_ledger
      (wallet_id, type, amount, balance_after, conversion_id, payout_id, topup_id, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      wallet.id,
      type,
      round2(delta),
      next,
      refs.conversionId || null,
      refs.payoutId || null,
      refs.topupId || null,
      refs.meta ? JSON.stringify(refs.meta) : null
    ]
  );
  wallet.balance = next;
  return next;
}

export async function getWalletForUser(userId) {
  await ensureFinanceTables();
  let rows = await query(`SELECT * FROM partner_wallets WHERE user_id = ? LIMIT 1`, [userId]);
  if (rows[0]) return rows[0];
  await query(
    `INSERT INTO partner_wallets (user_id, kind, currency, balance, hold) VALUES (?, 'user', 'RUB', 0, 0)`,
    [userId]
  );
  rows = await query(`SELECT * FROM partner_wallets WHERE user_id = ? LIMIT 1`, [userId]);
  return rows[0];
}

export async function getNetworkWallet() {
  await ensureFinanceTables();
  const rows = await query(`SELECT * FROM partner_wallets WHERE kind = 'network' LIMIT 1`);
  return rows[0];
}

/**
 * Settle conversion: charge advertiser amount*1.1, credit publisher (on hold N days), credit network fee.
 * Only RUB (or empty) is settled; other currencies are recorded as failed_currency.
 */
export async function settleConversion({
  conversionId,
  advertiserId,
  publisherId,
  publisherAmount,
  currency = 'RUB',
  holdDays
}) {
  await ensureFinanceTables();
  const days = clampHoldDays(holdDays, CONVERSION_HOLD_DAYS);
  const amounts = calcFee(publisherAmount);
  const cur = String(currency || 'RUB').toUpperCase();
  if (cur !== 'RUB') {
    await query(
      `UPDATE partner_conversions SET
        publisher_amount = ?, fee_amount = ?, advertiser_charge = ?, settlement_status = 'failed'
       WHERE id = ?`,
      [amounts.publisherAmount, amounts.feeAmount, amounts.advertiserCharge, conversionId]
    );
    return { settled: false, reason: 'currency_not_supported', currency: cur, ...amounts };
  }
  if (!advertiserId || !publisherId || !(amounts.publisherAmount > 0)) {
    await query(
      `UPDATE partner_conversions SET
        publisher_amount = ?, fee_amount = ?, advertiser_charge = ?, settlement_status = 'failed'
       WHERE id = ?`,
      [amounts.publisherAmount, amounts.feeAmount, amounts.advertiserCharge, conversionId]
    );
    return { settled: false, reason: 'invalid_parties', ...amounts };
  }

  const conn = await getConnection();
  try {
    await connQuery(conn, 'START TRANSACTION');
    const existing = await connQuery(
      conn,
      `SELECT settlement_status FROM partner_conversions WHERE id = ? FOR UPDATE`,
      [conversionId]
    );
    if (existing[0] && ['held', 'settled', 'reversed'].includes(existing[0].settlement_status)) {
      await connQuery(conn, 'ROLLBACK');
      return { settled: false, reason: 'already_settled', ...amounts };
    }

    const advWallet = await ensureUserWalletTx(conn, advertiserId);
    const pubWallet = await ensureUserWalletTx(conn, publisherId);
    const netWallet = await ensureNetworkWalletTx(conn);

    if (Number(advWallet.balance) + 1e-9 < amounts.advertiserCharge) {
      await connQuery(conn, 'ROLLBACK');
      await query(
        `UPDATE partner_conversions SET
          publisher_amount = ?, fee_amount = ?, advertiser_charge = ?, settlement_status = 'failed'
         WHERE id = ?`,
        [amounts.publisherAmount, amounts.feeAmount, amounts.advertiserCharge, conversionId]
      );
      return { settled: false, reason: 'insufficient_funds', ...amounts };
    }

    await applyDelta(conn, advWallet, -amounts.advertiserCharge, 'conversion_advertiser', {
      conversionId,
      meta: { currency: cur }
    });
    await applyDelta(conn, pubWallet, amounts.publisherAmount, 'conversion_publisher', {
      conversionId,
      meta: { currency: cur }
    });
    // холд: available = balance - hold
    const nextHold = round2(Number(pubWallet.hold) + amounts.publisherAmount);
    await connQuery(conn, `UPDATE partner_wallets SET hold = ? WHERE id = ?`, [nextHold, pubWallet.id]);
    pubWallet.hold = nextHold;

    await applyDelta(conn, netWallet, amounts.feeAmount, 'conversion_fee', {
      conversionId,
      meta: { currency: cur, rate: PARTNER_FEE_RATE }
    });

    const status = days > 0 ? 'held' : 'settled';
    await connQuery(
      conn,
      `UPDATE partner_conversions SET
        publisher_amount = ?, fee_amount = ?, advertiser_charge = ?,
        settlement_status = ?, available_at = DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ? DAY)
       WHERE id = ?`,
      [
        amounts.publisherAmount,
        amounts.feeAmount,
        amounts.advertiserCharge,
        status,
        days,
        conversionId
      ]
    );

    if (status === 'settled') {
      const releasedHold = round2(Math.max(0, Number(pubWallet.hold) - amounts.publisherAmount));
      await connQuery(conn, `UPDATE partner_wallets SET hold = ? WHERE id = ?`, [releasedHold, pubWallet.id]);
    }

    await connQuery(conn, 'COMMIT');
    return { settled: true, holdDays: days, status, ...amounts };
  } catch (err) {
    try { await connQuery(conn, 'ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

/** Снять холд с конверсий, у которых available_at наступил */
export async function releaseHeldConversions() {
  await ensureFinanceTables();
  const rows = await query(
    `SELECT id, publisher_id, publisher_amount FROM partner_conversions
     WHERE settlement_status = 'held' AND available_at IS NOT NULL AND available_at <= CURRENT_TIMESTAMP(3)
     ORDER BY id ASC LIMIT 100`
  );
  let released = 0;
  for (const row of rows) {
    const conn = await getConnection();
    try {
      await connQuery(conn, 'START TRANSACTION');
      const locked = await connQuery(
        conn,
        `SELECT * FROM partner_conversions WHERE id = ? FOR UPDATE`,
        [row.id]
      );
      const conv = locked[0];
      if (!conv || conv.settlement_status !== 'held') {
        await connQuery(conn, 'ROLLBACK');
        continue;
      }
      const w = await ensureUserWalletTx(conn, conv.publisher_id);
      const amt = round2(Number(conv.publisher_amount || 0));
      const nextHold = round2(Math.max(0, Number(w.hold) - amt));
      await connQuery(conn, `UPDATE partner_wallets SET hold = ? WHERE id = ?`, [nextHold, w.id]);
      await connQuery(
        conn,
        `UPDATE partner_conversions SET settlement_status = 'settled' WHERE id = ?`,
        [conv.id]
      );
      await connQuery(
        conn,
        `INSERT INTO partner_ledger (wallet_id, type, amount, balance_after, conversion_id, meta)
         VALUES (?, 'adjust', 0, ?, ?, ?)`,
        [w.id, Number(w.balance), conv.id, JSON.stringify({ release_hold: amt })]
      );
      await connQuery(conn, 'COMMIT');
      released += 1;
    } catch (err) {
      try { await connQuery(conn, 'ROLLBACK'); } catch { /* ignore */ }
      console.error('[partners] release hold', row.id, err.message);
    } finally {
      conn.release();
    }
  }
  return released;
}

/** Сторно при отказе / chargeback */
export async function reverseConversion(conversionId, reason = 'reversed') {
  await ensureFinanceTables();
  const conn = await getConnection();
  try {
    await connQuery(conn, 'START TRANSACTION');
    const rows = await connQuery(
      conn,
      `SELECT v.*, o.owner_id AS advertiser_id
       FROM partner_conversions v
       JOIN partner_offers o ON o.id = v.offer_id
       WHERE v.id = ? FOR UPDATE`,
      [conversionId]
    );
    const conv = rows[0];
    if (!conv || !['held', 'settled'].includes(conv.settlement_status)) {
      await connQuery(conn, 'ROLLBACK');
      return { ok: false, message: 'Нечего сторнировать' };
    }
    const pubAmt = round2(Number(conv.publisher_amount || 0));
    const feeAmt = round2(Number(conv.fee_amount || 0));
    const charge = round2(Number(conv.advertiser_charge || pubAmt + feeAmt));

    const advWallet = await ensureUserWalletTx(conn, conv.advertiser_id);
    const pubWallet = await ensureUserWalletTx(conn, conv.publisher_id);
    const netWallet = await ensureNetworkWalletTx(conn);

    await applyDelta(conn, advWallet, charge, 'adjust', {
      conversionId,
      meta: { reverse: true, reason }
    });
    await applyDelta(conn, pubWallet, -pubAmt, 'adjust', {
      conversionId,
      meta: { reverse: true, reason }
    });
    if (conv.settlement_status === 'held') {
      const nextHold = round2(Math.max(0, Number(pubWallet.hold) - pubAmt));
      await connQuery(conn, `UPDATE partner_wallets SET hold = ? WHERE id = ?`, [nextHold, pubWallet.id]);
    }
    await applyDelta(conn, netWallet, -feeAmt, 'adjust', {
      conversionId,
      meta: { reverse: true, reason }
    });
    await connQuery(
      conn,
      `UPDATE partner_conversions SET settlement_status = 'reversed', status = ? WHERE id = ?`,
      [reason.slice(0, 32), conversionId]
    );
    await connQuery(conn, 'COMMIT');
    return { ok: true };
  } catch (err) {
    try { await connQuery(conn, 'ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

export async function createTopup({ advertiserId, amount, provider = 'manual' }) {
  await ensureFinanceTables();
  const amt = round2(amount);
  if (!(amt > 0)) throw Object.assign(new Error('Сумма должна быть > 0'), { status: 400 });
  const prov = provider === 'yookassa' ? 'yookassa' : 'manual';
  const result = await query(
    `INSERT INTO partner_topups (advertiser_id, amount, status, provider) VALUES (?, ?, 'pending', ?)`,
    [advertiserId, amt, prov]
  );
  return result.insertId;
}

export async function attachTopupPaymentId(topupId, paymentId) {
  await ensureFinanceTables();
  await query(`UPDATE partner_topups SET provider_payment_id = ? WHERE id = ?`, [
    String(paymentId).slice(0, 128),
    topupId
  ]);
}

export async function findTopupByPaymentId(paymentId) {
  await ensureFinanceTables();
  const rows = await query(
    `SELECT * FROM partner_topups WHERE provider_payment_id = ? LIMIT 1`,
    [String(paymentId)]
  );
  return rows[0] || null;
}

export async function listTopupsForAdvertiser(advertiserId) {
  await ensureFinanceTables();
  return query(
    `SELECT * FROM partner_topups WHERE advertiser_id = ? ORDER BY id DESC LIMIT 50`,
    [advertiserId]
  );
}

export async function listPendingTopups() {
  await ensureFinanceTables();
  return query(
    `SELECT t.*, u.email AS advertiser_email, u.company AS advertiser_company
     FROM partner_topups t
     JOIN partner_users u ON u.id = t.advertiser_id
     WHERE t.status = 'pending'
     ORDER BY t.id ASC`
  );
}

export async function confirmTopup(topupId, { expectedAmount } = {}) {
  await ensureFinanceTables();
  const conn = await getConnection();
  try {
    await connQuery(conn, 'START TRANSACTION');
    const rows = await connQuery(conn, `SELECT * FROM partner_topups WHERE id = ? FOR UPDATE`, [topupId]);
    const topup = rows[0];
    if (!topup) {
      await connQuery(conn, 'ROLLBACK');
      return { ok: false, message: 'Не найдено' };
    }
    if (topup.status !== 'pending') {
      await connQuery(conn, 'ROLLBACK');
      return { ok: false, message: 'Уже обработано' };
    }
    if (
      expectedAmount != null &&
      Number.isFinite(expectedAmount) &&
      Math.abs(Number(topup.amount) - Number(expectedAmount)) > 0.009
    ) {
      await connQuery(conn, 'ROLLBACK');
      return { ok: false, message: 'Сумма платежа не совпадает' };
    }
    const wallet = await ensureUserWalletTx(conn, topup.advertiser_id);
    await applyDelta(conn, wallet, Number(topup.amount), 'topup', { topupId: topup.id });
    await connQuery(
      conn,
      `UPDATE partner_topups SET status = 'paid', paid_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      [topup.id]
    );
    await connQuery(conn, 'COMMIT');
    return { ok: true };
  } catch (err) {
    try { await connQuery(conn, 'ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

export async function cancelTopup(topupId) {
  await ensureFinanceTables();
  const result = await query(
    `UPDATE partner_topups SET status = 'cancelled' WHERE id = ? AND status = 'pending'`,
    [topupId]
  );
  return result.affectedRows > 0;
}

export async function findPayoutById(id) {
  await ensureFinanceTables();
  const rows = await query(`SELECT * FROM partner_payouts WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

export async function setPayoutProviderId(payoutId, providerId) {
  await ensureFinanceTables();
  await query(`UPDATE partner_payouts SET provider_payout_id = ? WHERE id = ?`, [
    String(providerId).slice(0, 128),
    payoutId
  ]);
}

export async function createPayout({ publisherId, amount, method, requisites }) {
  await ensureFinanceTables();
  const amt = round2(amount);
  if (amt < MIN_PAYOUT_AMOUNT) {
    throw Object.assign(new Error(`Минимум к выводу: ${MIN_PAYOUT_AMOUNT} ₽`), { status: 400 });
  }
  const reqs = String(requisites || '').trim().slice(0, 512);
  if (!reqs) throw Object.assign(new Error('Укажите реквизиты'), { status: 400 });
  const m = ['sbp', 'card', 'other'].includes(method) ? method : 'sbp';

  const wallet = await getWalletForUser(publisherId);
  const available = round2(Number(wallet.balance) - Number(wallet.hold));
  if (available + 1e-9 < amt) {
    throw Object.assign(new Error('Недостаточно средств'), { status: 400 });
  }

  const conn = await getConnection();
  try {
    await connQuery(conn, 'START TRANSACTION');
    const w = await ensureUserWalletTx(conn, publisherId);
    const avail = round2(Number(w.balance) - Number(w.hold));
    if (avail + 1e-9 < amt) {
      await connQuery(conn, 'ROLLBACK');
      throw Object.assign(new Error('Недостаточно средств'), { status: 400 });
    }
    const result = await connQuery(
      conn,
      `INSERT INTO partner_payouts (publisher_id, amount, status, method, requisites)
       VALUES (?, ?, 'requested', ?, ?)`,
      [publisherId, amt, m, reqs]
    );
    const payoutId = result.insertId;
    const nextHold = round2(Number(w.hold) + amt);
    await connQuery(conn, `UPDATE partner_wallets SET hold = ? WHERE id = ?`, [nextHold, w.id]);
    await connQuery(
      conn,
      `INSERT INTO partner_ledger (wallet_id, type, amount, balance_after, payout_id, meta)
       VALUES (?, 'payout_hold', ?, ?, ?, ?)`,
      [w.id, -amt, Number(w.balance), payoutId, JSON.stringify({ hold: nextHold })]
    );
    await connQuery(conn, 'COMMIT');
    return payoutId;
  } catch (err) {
    try { await connQuery(conn, 'ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

export async function listPayoutsForPublisher(publisherId) {
  await ensureFinanceTables();
  return query(
    `SELECT * FROM partner_payouts WHERE publisher_id = ? ORDER BY id DESC LIMIT 50`,
    [publisherId]
  );
}

export async function listOpenPayouts() {
  await ensureFinanceTables();
  return query(
    `SELECT p.*, u.email AS publisher_email
     FROM partner_payouts p
     JOIN partner_users u ON u.id = p.publisher_id
     WHERE p.status IN ('requested','approved')
     ORDER BY p.id ASC`
  );
}

export async function markPayoutPaid(payoutId, adminNote = null) {
  await ensureFinanceTables();
  const conn = await getConnection();
  try {
    await connQuery(conn, 'START TRANSACTION');
    const rows = await connQuery(conn, `SELECT * FROM partner_payouts WHERE id = ? FOR UPDATE`, [payoutId]);
    const payout = rows[0];
    if (!payout || !['requested', 'approved'].includes(payout.status)) {
      await connQuery(conn, 'ROLLBACK');
      return { ok: false, message: 'Заявка недоступна' };
    }
    const w = await ensureUserWalletTx(conn, payout.publisher_id);
    const amt = round2(Number(payout.amount));
    if (Number(w.balance) + 1e-9 < amt || Number(w.hold) + 1e-9 < amt) {
      await connQuery(conn, 'ROLLBACK');
      return { ok: false, message: 'Несогласованный баланс/холд' };
    }
    const nextBal = round2(Number(w.balance) - amt);
    const nextHold = round2(Number(w.hold) - amt);
    await connQuery(conn, `UPDATE partner_wallets SET balance = ?, hold = ? WHERE id = ?`, [nextBal, nextHold, w.id]);
    await connQuery(
      conn,
      `INSERT INTO partner_ledger (wallet_id, type, amount, balance_after, payout_id)
       VALUES (?, 'payout_paid', ?, ?, ?)`,
      [w.id, -amt, nextBal, payout.id]
    );
    await connQuery(
      conn,
      `UPDATE partner_payouts SET status = 'paid', processed_at = CURRENT_TIMESTAMP(3), admin_note = ?
       WHERE id = ?`,
      [adminNote || null, payout.id]
    );
    await connQuery(conn, 'COMMIT');
    return { ok: true };
  } catch (err) {
    try { await connQuery(conn, 'ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

export async function rejectPayout(payoutId, adminNote = null) {
  await ensureFinanceTables();
  const conn = await getConnection();
  try {
    await connQuery(conn, 'START TRANSACTION');
    const rows = await connQuery(conn, `SELECT * FROM partner_payouts WHERE id = ? FOR UPDATE`, [payoutId]);
    const payout = rows[0];
    if (!payout || !['requested', 'approved'].includes(payout.status)) {
      await connQuery(conn, 'ROLLBACK');
      return { ok: false, message: 'Заявка недоступна' };
    }
    const w = await ensureUserWalletTx(conn, payout.publisher_id);
    const amt = round2(Number(payout.amount));
    const nextHold = round2(Math.max(0, Number(w.hold) - amt));
    await connQuery(conn, `UPDATE partner_wallets SET hold = ? WHERE id = ?`, [nextHold, w.id]);
    await connQuery(
      conn,
      `INSERT INTO partner_ledger (wallet_id, type, amount, balance_after, payout_id, meta)
       VALUES (?, 'payout_reject', ?, ?, ?, ?)`,
      [w.id, amt, Number(w.balance), payout.id, JSON.stringify({ released_hold: amt })]
    );
    await connQuery(
      conn,
      `UPDATE partner_payouts SET status = 'rejected', processed_at = CURRENT_TIMESTAMP(3), admin_note = ?
       WHERE id = ?`,
      [adminNote || 'Отклонено', payout.id]
    );
    await connQuery(conn, 'COMMIT');
    return { ok: true };
  } catch (err) {
    try { await connQuery(conn, 'ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}
