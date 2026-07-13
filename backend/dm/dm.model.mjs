import { query } from '../database/config.mjs';
import { ensureFindingsTables, getUserIdByUsername } from '../findings/findings.model.mjs';

let dmTablesReady = false;
let migrationDone = false;

function clampLimit(limit, fallback = 50, max = 100) {
  const n = Number.parseInt(limit, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

function canonicalPair(userId1, userId2) {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}

export async function ensureDmTables() {
  if (dmTablesReady) return;
  await ensureFindingsTables();

  await query(`
    CREATE TABLE IF NOT EXISTS dm_conversations (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      user_a        CHAR(36) NOT NULL,
      user_b        CHAR(36) NOT NULL,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_dm_conv_pair (user_a, user_b),
      KEY idx_dm_conv_updated (updated_at),
      CONSTRAINT fk_dm_conv_user_a FOREIGN KEY (user_a) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_dm_conv_user_b FOREIGN KEY (user_b) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS dm_messages (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      conversation_id   INT NOT NULL,
      sender_id         CHAR(36) NOT NULL,
      body              VARCHAR(2000) NULL,
      finding_id        INT NULL,
      legacy_share_id   INT NULL,
      read_at           TIMESTAMP NULL DEFAULT NULL,
      created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_dm_msg_conv_created (conversation_id, created_at),
      KEY idx_dm_msg_legacy_share (legacy_share_id),
      KEY idx_dm_msg_finding (finding_id),
      CONSTRAINT fk_dm_msg_conv FOREIGN KEY (conversation_id) REFERENCES dm_conversations(id) ON DELETE CASCADE,
      CONSTRAINT fk_dm_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_dm_msg_finding FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  dmTablesReady = true;
  await migrateFindingSharesToDm();
}

async function migrateFindingSharesToDm() {
  if (migrationDone) return;

  const pending = await query(
    `SELECT s.id, s.finding_id, s.from_user_id, s.to_user_id, s.message, s.read_at, s.created_at
     FROM finding_shares s
     LEFT JOIN dm_messages dm ON dm.legacy_share_id = s.id
     WHERE dm.id IS NULL
     ORDER BY s.created_at ASC
     LIMIT 500`
  );

  for (const row of pending) {
    const convId = await getOrCreateConversation(row.from_user_id, row.to_user_id);
    await query(
      `INSERT INTO dm_messages
         (conversation_id, sender_id, body, finding_id, legacy_share_id, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        convId,
        row.from_user_id,
        row.message ? row.message.slice(0, 2000) : null,
        row.finding_id,
        row.id,
        row.read_at,
        row.created_at,
      ]
    );
    await query('UPDATE dm_conversations SET updated_at = ? WHERE id = ?', [row.created_at, convId]);
  }

  if (pending.length < 500) {
    migrationDone = true;
  }
}

export async function getOrCreateConversation(userId1, userId2) {
  await ensureDmTables();
  if (userId1 === userId2) throw new Error('self_conversation');
  const [userA, userB] = canonicalPair(userId1, userId2);

  const existing = await query(
    'SELECT id FROM dm_conversations WHERE user_a = ? AND user_b = ? LIMIT 1',
    [userA, userB]
  );
  if (existing.length) return existing[0].id;

  const result = await query(
    'INSERT INTO dm_conversations (user_a, user_b) VALUES (?, ?)',
    [userA, userB]
  );
  return result.insertId;
}

export async function insertDmMessage({ senderId, recipientId, body, findingId }) {
  await ensureDmTables();
  const trimmedBody = body ? String(body).trim().slice(0, 2000) : null;
  if (!trimmedBody && !findingId) {
    throw new Error('empty_message');
  }
  if (senderId === recipientId) throw new Error('self_message');

  const conversationId = await getOrCreateConversation(senderId, recipientId);
  const result = await query(
    `INSERT INTO dm_messages (conversation_id, sender_id, body, finding_id)
     VALUES (?, ?, ?, ?)`,
    [conversationId, senderId, trimmedBody || null, findingId || null]
  );
  await query(
    'UPDATE dm_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [conversationId]
  );
  return { messageId: result.insertId, conversationId };
}

export async function userHasDmFindingAccess(findingId, userId) {
  if (!userId || !findingId) return false;
  await ensureDmTables();
  const rows = await query(
    `SELECT m.id
     FROM dm_messages m
     JOIN dm_conversations c ON c.id = m.conversation_id
     WHERE m.finding_id = ?
       AND m.sender_id != ?
       AND (c.user_a = ? OR c.user_b = ?)
     LIMIT 1`,
    [findingId, userId, userId, userId]
  );
  return rows.length > 0;
}

export async function countUnreadDm(userId) {
  await ensureDmTables();
  const rows = await query(
    `SELECT COUNT(*) AS cnt
     FROM dm_messages m
     JOIN dm_conversations c ON c.id = m.conversation_id
     WHERE m.sender_id != ?
       AND m.read_at IS NULL
       AND (c.user_a = ? OR c.user_b = ?)`,
    [userId, userId, userId]
  );
  return rows[0]?.cnt || 0;
}

export async function listConversationsForUser(userId, limit = 50) {
  await ensureDmTables();
  const lim = clampLimit(limit);

  const rows = await query(
    `SELECT c.id AS conversation_id, c.updated_at,
            CASE WHEN c.user_a = ? THEN ub.username ELSE ua.username END AS peer_username,
            CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END AS peer_id,
            (
              SELECT COUNT(*)
              FROM dm_messages um
              WHERE um.conversation_id = c.id
                AND um.sender_id != ?
                AND um.read_at IS NULL
            ) AS unread_count,
            (
              SELECT m.body
              FROM dm_messages m
              WHERE m.conversation_id = c.id
              ORDER BY m.created_at DESC
              LIMIT 1
            ) AS last_body,
            (
              SELECT m.sender_id
              FROM dm_messages m
              WHERE m.conversation_id = c.id
              ORDER BY m.created_at DESC
              LIMIT 1
            ) AS last_sender_id,
            (
              SELECT m.created_at
              FROM dm_messages m
              WHERE m.conversation_id = c.id
              ORDER BY m.created_at DESC
              LIMIT 1
            ) AS last_at,
            (
              SELECT f.query_text
              FROM dm_messages m
              JOIN findings f ON f.id = m.finding_id
              WHERE m.conversation_id = c.id
              ORDER BY m.created_at DESC
              LIMIT 1
            ) AS last_finding_query,
            (
              SELECT m.finding_id IS NOT NULL
              FROM dm_messages m
              WHERE m.conversation_id = c.id
              ORDER BY m.created_at DESC
              LIMIT 1
            ) AS last_has_finding
     FROM dm_conversations c
     JOIN users ua ON ua.id = c.user_a
     JOIN users ub ON ub.id = c.user_b
     WHERE c.user_a = ? OR c.user_b = ?
     ORDER BY c.updated_at DESC
     LIMIT ${lim}`,
    [userId, userId, userId, userId, userId]
  );

  return rows.map((row) => ({
    peerUsername: row.peer_username,
    peerId: row.peer_id,
    unreadCount: row.unread_count || 0,
    updatedAt: row.last_at || row.updated_at,
    lastMessage: {
      body: row.last_body || null,
      findingQuery: row.last_finding_query || null,
      hasFinding: !!row.last_has_finding,
      isMine: row.last_sender_id === userId,
      createdAt: row.last_at,
    },
  }));
}

export async function listMessagesWithPeer(userId, peerUsername, limit = 100) {
  await ensureDmTables();
  const peer = await getUserIdByUsername(peerUsername);
  if (!peer) return null;

  const [userA, userB] = canonicalPair(userId, peer.id);
  const convRows = await query(
    'SELECT id FROM dm_conversations WHERE user_a = ? AND user_b = ? LIMIT 1',
    [userA, userB]
  );
  if (!convRows.length) return { peerUsername: peer.username, messages: [] };

  const conversationId = convRows[0].id;
  const lim = clampLimit(limit, 100, 200);
  const rows = await query(
    `SELECT m.id, m.body, m.finding_id, m.legacy_share_id, m.read_at, m.created_at, m.sender_id,
            u.username AS sender_username,
            f.public_id AS finding_public_id,
            f.query_text AS finding_query
     FROM dm_messages m
     JOIN users u ON u.id = m.sender_id
     LEFT JOIN findings f ON f.id = m.finding_id
     WHERE m.conversation_id = ?
     ORDER BY m.created_at ASC
     LIMIT ${lim}`,
    [conversationId]
  );

  return {
    peerUsername: peer.username,
    messages: rows.map((row) => ({
      id: row.id,
      legacyShareId: row.legacy_share_id,
      senderUsername: row.sender_username,
      isMine: row.sender_id === userId,
      body: row.body,
      finding:
        row.finding_id && row.finding_public_id
          ? { publicId: row.finding_public_id, query: row.finding_query }
          : null,
      createdAt: row.created_at,
      readAt: row.read_at,
    })),
  };
}

export async function markConversationReadWithPeer(userId, peerUsername) {
  await ensureDmTables();
  const peer = await getUserIdByUsername(peerUsername);
  if (!peer) return false;

  const [userA, userB] = canonicalPair(userId, peer.id);
  const convRows = await query(
    'SELECT id FROM dm_conversations WHERE user_a = ? AND user_b = ? LIMIT 1',
    [userA, userB]
  );
  if (!convRows.length) return true;

  await query(
    `UPDATE dm_messages SET read_at = CURRENT_TIMESTAMP
     WHERE conversation_id = ?
       AND sender_id != ?
       AND read_at IS NULL`,
    [convRows[0].id, userId]
  );
  return true;
}

export async function markDmMessageRead(messageId, userId) {
  await ensureDmTables();
  await query(
    `UPDATE dm_messages m
     JOIN dm_conversations c ON c.id = m.conversation_id
     SET m.read_at = CURRENT_TIMESTAMP
     WHERE (m.id = ? OR m.legacy_share_id = ?)
       AND m.sender_id != ?
       AND (c.user_a = ? OR c.user_b = ?)
       AND m.read_at IS NULL`,
    [messageId, messageId, userId, userId, userId]
  );
}

/** Legacy flat inbox list for /findings/inbox/list */
export async function listInboxFlatFromDm(userId, limit = 50) {
  await ensureDmTables();
  const lim = clampLimit(limit);
  const rows = await query(
    `SELECT m.id AS message_id,
            COALESCE(m.legacy_share_id, m.id) AS share_id,
            m.body AS message,
            m.read_at,
            m.created_at,
            m.sender_id,
            u.username AS from_username,
            f.public_id,
            f.query_text,
            f.locale
     FROM dm_messages m
     JOIN dm_conversations c ON c.id = m.conversation_id
     JOIN users u ON u.id = m.sender_id
     LEFT JOIN findings f ON f.id = m.finding_id
     WHERE (c.user_a = ? OR c.user_b = ?)
       AND m.sender_id != ?
     ORDER BY m.created_at DESC
     LIMIT ${lim}`,
    [userId, userId, userId]
  );
  return rows;
}
