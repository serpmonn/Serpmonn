import { query, getConnection, connQuery } from '../database/config.mjs';

export const PARTNER_FEE_RATE = (() => {
  const n = Number(process.env.PARTNER_NETWORK_FEE_RATE);
  return Number.isFinite(n) && n >= 0 && n < 1 ? n : 0.1;
})();

export const MIN_PAYOUT_AMOUNT = (() => {
  const n = Number(process.env.PARTNER_MIN_PAYOUT);
  return Number.isFinite(n) && n > 0 ? n : 1000;
})();

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
    ['partner_conversions', 'settlement_status', "VARCHAR(32) NOT NULL DEFAULT 'pending'"]
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
 * Settle conversion: charge advertiser amount*1.1, credit publisher amount, credit network fee.
 * Returns { settled, reason?, publisherAmount, feeAmount, advertiserCharge }
 */
export async function settleConversion({
  conversionId,
  advertiserId,
  publisherId,
  publisherAmount,
  currency = 'RUB'
}) {
  await ensureFinanceTables();
  const amounts = calcFee(publisherAmount);
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
      meta: { currency }
    });
    await applyDelta(conn, pubWallet, amounts.publisherAmount, 'conversion_publisher', {
      conversionId,
      meta: { currency }
    });
    await applyDelta(conn, netWallet, amounts.feeAmount, 'conversion_fee', {
      conversionId,
      meta: { currency, rate: PARTNER_FEE_RATE }
    });

    await connQuery(
      conn,
      `UPDATE partner_conversions SET
        publisher_amount = ?, fee_amount = ?, advertiser_charge = ?, settlement_status = 'settled'
       WHERE id = ?`,
      [amounts.publisherAmount, amounts.feeAmount, amounts.advertiserCharge, conversionId]
    );

    await connQuery(conn, 'COMMIT');
    return { settled: true, ...amounts };
  } catch (err) {
    try { await connQuery(conn, 'ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

export async function createTopup({ advertiserId, amount }) {
  await ensureFinanceTables();
  const amt = round2(amount);
  if (!(amt > 0)) throw Object.assign(new Error('Сумма должна быть > 0'), { status: 400 });
  const result = await query(
    `INSERT INTO partner_topups (advertiser_id, amount, status, provider) VALUES (?, ?, 'pending', 'manual')`,
    [advertiserId, amt]
  );
  return result.insertId;
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

export async function confirmTopup(topupId) {
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
