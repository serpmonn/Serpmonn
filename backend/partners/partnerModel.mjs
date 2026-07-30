import { query } from '../database/config.mjs';
import crypto from 'crypto';
import { ensureFinanceTables, releaseHeldConversions } from './partnerFinance.mjs';

let tablesReady = false;

export async function ensurePartnerTables() {
  if (tablesReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS partner_users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('advertiser','publisher','admin') NOT NULL,
      status ENUM('pending','active','blocked') NOT NULL DEFAULT 'active',
      company VARCHAR(255) NULL,
      contacts VARCHAR(512) NULL,
      publisher_code VARCHAR(32) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_partner_email (email),
      UNIQUE KEY uq_partner_publisher_code (publisher_code),
      KEY idx_partner_role (role),
      KEY idx_partner_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS partner_offers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      owner_id BIGINT UNSIGNED NOT NULL,
      public_id VARCHAR(16) NOT NULL,
      type ENUM('promo','cpa') NOT NULL,
      title VARCHAR(255) NOT NULL,
      promocode VARCHAR(128) NULL,
      landing_url VARCHAR(1024) NOT NULL,
      image_url VARCHAR(1024) NULL,
      conditions TEXT NULL,
      category VARCHAR(128) NULL,
      country VARCHAR(64) NULL,
      erid VARCHAR(128) NULL,
      valid_until DATE NULL,
      commission_text VARCHAR(512) NULL,
      hold_days SMALLINT UNSIGNED NOT NULL DEFAULT 7,
      status ENUM('draft','moderation','published','rejected') NOT NULL DEFAULT 'draft',
      reject_reason VARCHAR(512) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_partner_offer_public (public_id),
      KEY idx_partner_offer_owner (owner_id),
      KEY idx_partner_offer_status (status),
      KEY idx_partner_offer_type (type),
      CONSTRAINT fk_partner_offer_owner FOREIGN KEY (owner_id) REFERENCES partner_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  {
    const cols = await query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partner_offers' AND COLUMN_NAME = 'hold_days'`
    );
    if (!Number(cols[0]?.c || 0)) {
      await query(
        `ALTER TABLE partner_offers ADD COLUMN hold_days SMALLINT UNSIGNED NOT NULL DEFAULT 7 AFTER commission_text`
      );
    }
  }

  await query(`
    CREATE TABLE IF NOT EXISTS partner_clicks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      click_id VARCHAR(40) NOT NULL,
      offer_id BIGINT UNSIGNED NOT NULL,
      publisher_id BIGINT UNSIGNED NULL,
      ip VARCHAR(64) NULL,
      ua VARCHAR(255) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_partner_click_id (click_id),
      KEY idx_partner_click_offer (offer_id),
      KEY idx_partner_click_publisher (publisher_id),
      KEY idx_partner_click_created (created_at),
      CONSTRAINT fk_partner_click_offer FOREIGN KEY (offer_id) REFERENCES partner_offers(id) ON DELETE CASCADE,
      CONSTRAINT fk_partner_click_publisher FOREIGN KEY (publisher_id) REFERENCES partner_users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS partner_conversions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      click_id VARCHAR(40) NOT NULL,
      offer_id BIGINT UNSIGNED NOT NULL,
      publisher_id BIGINT UNSIGNED NULL,
      amount DECIMAL(12,2) NULL,
      currency VARCHAR(8) NULL DEFAULT 'RUB',
      status VARCHAR(32) NOT NULL DEFAULT 'confirmed',
      raw_postback JSON NULL,
      publisher_amount DECIMAL(12,2) NULL,
      fee_amount DECIMAL(12,2) NULL,
      advertiser_charge DECIMAL(12,2) NULL,
      settlement_status VARCHAR(32) NOT NULL DEFAULT 'pending',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_partner_conv_click (click_id),
      KEY idx_partner_conv_offer (offer_id),
      KEY idx_partner_conv_publisher (publisher_id),
      CONSTRAINT fk_partner_conv_offer FOREIGN KEY (offer_id) REFERENCES partner_offers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await ensureFinanceTables();
  tablesReady = true;
}

export function makePublicId() {
  return crypto.randomBytes(5).toString('hex'); // 10 chars
}

export function makePublisherCode() {
  return crypto.randomBytes(4).toString('hex'); // 8 chars
}

export function makeClickId() {
  return crypto.randomBytes(16).toString('hex');
}

export async function createPartnerUser({ email, passwordHash, role, company, contacts, publisherCode }) {
  await ensurePartnerTables();
  const result = await query(
    `INSERT INTO partner_users (email, password_hash, role, status, company, contacts, publisher_code)
     VALUES (?, ?, ?, 'active', ?, ?, ?)`,
    [email, passwordHash, role, company || null, contacts || null, publisherCode || null]
  );
  return result.insertId;
}

export async function findPartnerByEmail(email) {
  await ensurePartnerTables();
  const rows = await query(`SELECT * FROM partner_users WHERE email = ? LIMIT 1`, [email]);
  return rows[0] || null;
}

export async function findPartnerById(id) {
  await ensurePartnerTables();
  const rows = await query(`SELECT * FROM partner_users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

export async function findPublisherByCode(code) {
  await ensurePartnerTables();
  const rows = await query(
    `SELECT * FROM partner_users WHERE publisher_code = ? AND role IN ('publisher','admin') AND status = 'active' LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

export async function listOffersByOwner(ownerId) {
  await ensurePartnerTables();
  return query(
    `SELECT * FROM partner_offers WHERE owner_id = ? ORDER BY updated_at DESC`,
    [ownerId]
  );
}

export async function listPublishedOffers() {
  await ensurePartnerTables();
  return query(
    `SELECT o.*, u.company AS advertiser_company
     FROM partner_offers o
     JOIN partner_users u ON u.id = o.owner_id
     WHERE o.status = 'published'
     ORDER BY o.updated_at DESC`
  );
}

export async function listModerationOffers() {
  await ensurePartnerTables();
  return query(
    `SELECT o.*, u.email AS owner_email, u.company AS owner_company
     FROM partner_offers o
     JOIN partner_users u ON u.id = o.owner_id
     WHERE o.status = 'moderation'
     ORDER BY o.updated_at ASC`
  );
}

export async function findOfferById(id) {
  await ensurePartnerTables();
  const rows = await query(`SELECT * FROM partner_offers WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

export async function findOfferByPublicId(publicId) {
  await ensurePartnerTables();
  const rows = await query(`SELECT * FROM partner_offers WHERE public_id = ? LIMIT 1`, [publicId]);
  return rows[0] || null;
}

export async function insertOffer(data) {
  await ensurePartnerTables();
  const publicId = makePublicId();
  const result = await query(
    `INSERT INTO partner_offers
      (owner_id, public_id, type, title, promocode, landing_url, image_url, conditions,
       category, country, erid, valid_until, commission_text, hold_days, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.ownerId,
      publicId,
      data.type,
      data.title,
      data.promocode || null,
      data.landingUrl,
      data.imageUrl || null,
      data.conditions || null,
      data.category || null,
      data.country || null,
      data.erid || null,
      data.validUntil || null,
      data.commissionText || null,
      data.holdDays != null ? data.holdDays : 7,
      data.status || 'moderation'
    ]
  );
  return { id: result.insertId, publicId };
}

export async function updateOffer(id, ownerId, data) {
  await ensurePartnerTables();
  await query(
    `UPDATE partner_offers SET
      type = ?, title = ?, promocode = ?, landing_url = ?, image_url = ?, conditions = ?,
      category = ?, country = ?, erid = ?, valid_until = ?, commission_text = ?, hold_days = ?,
      status = 'moderation', reject_reason = NULL
     WHERE id = ? AND owner_id = ?`,
    [
      data.type,
      data.title,
      data.promocode || null,
      data.landingUrl,
      data.imageUrl || null,
      data.conditions || null,
      data.category || null,
      data.country || null,
      data.erid || null,
      data.validUntil || null,
      data.commissionText || null,
      data.holdDays != null ? data.holdDays : 7,
      id,
      ownerId
    ]
  );
}

export async function setOfferStatus(id, status, rejectReason = null) {
  await ensurePartnerTables();
  await query(
    `UPDATE partner_offers SET status = ?, reject_reason = ? WHERE id = ?`,
    [status, rejectReason, id]
  );
}

/** Снять оффер с витрины / с модерации → draft (владелец) */
export async function unpublishOffer(id, ownerId) {
  await ensurePartnerTables();
  const result = await query(
    `UPDATE partner_offers SET status = 'draft', reject_reason = NULL
     WHERE id = ? AND owner_id = ? AND status IN ('published', 'moderation', 'rejected')`,
    [id, ownerId]
  );
  return Number(result.affectedRows || 0) > 0;
}

export async function logPartnerClick({ clickId, offerId, publisherId, ip, ua }) {
  await ensurePartnerTables();
  await query(
    `INSERT INTO partner_clicks (click_id, offer_id, publisher_id, ip, ua)
     VALUES (?, ?, ?, ?, ?)`,
    [clickId, offerId, publisherId || null, ip || null, ua || null]
  );
}

export async function findClickByClickId(clickId) {
  await ensurePartnerTables();
  const rows = await query(`SELECT * FROM partner_clicks WHERE click_id = ? LIMIT 1`, [clickId]);
  return rows[0] || null;
}

export async function insertConversion({ clickId, offerId, publisherId, amount, currency, status, raw }) {
  await ensurePartnerTables();
  const result = await query(
    `INSERT INTO partner_conversions
      (click_id, offer_id, publisher_id, amount, currency, status, raw_postback, settlement_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      clickId,
      offerId,
      publisherId || null,
      amount != null ? amount : null,
      currency || 'RUB',
      status || 'confirmed',
      raw ? JSON.stringify(raw) : null
    ]
  );
  return result.insertId;
}

export async function findConversionById(id) {
  await ensurePartnerTables();
  const rows = await query(`SELECT * FROM partner_conversions WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

/** Активная (held/settled) конверсия по click_id — для идемпотентности и сторно */
export async function findActiveConversionByClickId(clickId) {
  await ensurePartnerTables();
  const rows = await query(
    `SELECT * FROM partner_conversions
     WHERE click_id = ? AND settlement_status IN ('held','settled')
     ORDER BY id DESC LIMIT 1`,
    [clickId]
  );
  return rows[0] || null;
}

export async function statsForAdvertiser(ownerId) {
  await ensurePartnerTables();
  await releaseHeldConversions().catch(() => {});
  const clicks = await query(
    `SELECT o.id AS offer_id, o.public_id, o.title, COUNT(c.id) AS clicks
     FROM partner_offers o
     LEFT JOIN partner_clicks c ON c.offer_id = o.id
     WHERE o.owner_id = ?
     GROUP BY o.id
     ORDER BY o.updated_at DESC`,
    [ownerId]
  );
  const conversions = await query(
    `SELECT o.id AS offer_id,
            COUNT(v.id) AS conversions,
            COALESCE(SUM(v.amount),0) AS amount,
            COALESCE(SUM(v.advertiser_charge),0) AS charged,
            SUM(CASE WHEN v.settlement_status = 'settled' THEN 1 ELSE 0 END) AS settled_count,
            SUM(CASE WHEN v.settlement_status = 'held' THEN 1 ELSE 0 END) AS held_count,
            SUM(CASE WHEN v.settlement_status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
            SUM(CASE WHEN v.settlement_status = 'reversed' THEN 1 ELSE 0 END) AS reversed_count
     FROM partner_offers o
     LEFT JOIN partner_conversions v ON v.offer_id = o.id
     WHERE o.owner_id = ?
     GROUP BY o.id`,
    [ownerId]
  );
  const byOffer = Object.fromEntries(conversions.map((r) => [r.offer_id, r]));
  return clicks.map((r) => {
    const x = byOffer[r.offer_id] || {};
    return {
      ...r,
      conversions: Number(x.conversions || 0),
      amount: Number(x.amount || 0),
      charged: Number(x.charged || 0),
      settled: Number(x.settled_count || 0),
      held: Number(x.held_count || 0),
      failed: Number(x.failed_count || 0),
      reversed: Number(x.reversed_count || 0)
    };
  });
}

export async function statsForPublisher(publisherId) {
  await ensurePartnerTables();
  await releaseHeldConversions().catch(() => {});
  const clicks = await query(
    `SELECT o.public_id, o.title, o.type, COUNT(c.id) AS clicks,
            MAX(c.created_at) AS last_click_at
     FROM partner_clicks c
     JOIN partner_offers o ON o.id = c.offer_id
     WHERE c.publisher_id = ?
     GROUP BY o.id
     ORDER BY clicks DESC`,
    [publisherId]
  );
  const conversions = await query(
    `SELECT o.public_id,
            COUNT(v.id) AS conversions,
            COALESCE(SUM(v.amount),0) AS amount,
            SUM(CASE WHEN v.settlement_status IN ('settled','held') THEN 1 ELSE 0 END) AS ok_count,
            SUM(CASE WHEN v.settlement_status = 'held' THEN 1 ELSE 0 END) AS held_count,
            MAX(v.created_at) AS last_conversion_at
     FROM partner_conversions v
     JOIN partner_offers o ON o.id = v.offer_id
     WHERE v.publisher_id = ?
     GROUP BY o.id`,
    [publisherId]
  );
  const byPid = Object.fromEntries(conversions.map((r) => [r.public_id, r]));
  return clicks.map((r) => {
    const x = byPid[r.public_id] || {};
    const tClick = r.last_click_at ? new Date(r.last_click_at).getTime() : 0;
    const tConv = x.last_conversion_at ? new Date(x.last_conversion_at).getTime() : 0;
    const lastAt = tConv >= tClick ? x.last_conversion_at || r.last_click_at : r.last_click_at;
    return {
      ...r,
      conversions: Number(x.conversions || 0),
      amount: Number(x.amount || 0),
      held: Number(x.held_count || 0),
      last_at: lastAt || null
    };
  });
}
