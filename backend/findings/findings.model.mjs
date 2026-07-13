import crypto from 'node:crypto';
import { query } from '../database/config.mjs';

let tablesReady = false;

function clampLimit(limit, fallback = 50, max = 100) {
  const n = Number.parseInt(limit, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export async function ensureFindingsTables() {
  if (tablesReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS findings (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      public_id     VARCHAR(24) NOT NULL,
      user_id       CHAR(36) NOT NULL,
      query_text    VARCHAR(500) NOT NULL,
      locale        VARCHAR(16) NOT NULL DEFAULT 'ru',
      visibility    ENUM('private', 'link', 'followers', 'public') NOT NULL DEFAULT 'private',
      snapshot      JSON NOT NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_findings_public_id (public_id),
      KEY idx_findings_user_created (user_id, created_at),
      KEY idx_findings_visibility_created (visibility, created_at),
      CONSTRAINT fk_findings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS finding_shares (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      finding_id    INT NOT NULL,
      from_user_id  CHAR(36) NOT NULL,
      to_user_id    CHAR(36) NOT NULL,
      message       VARCHAR(500) NULL,
      read_at       TIMESTAMP NULL DEFAULT NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_finding_shares_to_user (to_user_id, read_at, created_at),
      KEY idx_finding_shares_finding (finding_id),
      CONSTRAINT fk_finding_shares_finding FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE CASCADE,
      CONSTRAINT fk_finding_shares_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_finding_shares_to FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_follows (
      follower_id   CHAR(36) NOT NULL,
      following_id  CHAR(36) NOT NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_id, following_id),
      KEY idx_user_follows_following (following_id),
      CONSTRAINT fk_user_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_follows_following FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS finding_likes (
      finding_id    INT NOT NULL,
      user_id       CHAR(36) NOT NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (finding_id, user_id),
      CONSTRAINT fk_finding_likes_finding FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE CASCADE,
      CONSTRAINT fk_finding_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS finding_comments (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      finding_id    INT NOT NULL,
      user_id       CHAR(36) NOT NULL,
      body          VARCHAR(1000) NOT NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_finding_comments_finding (finding_id, created_at),
      CONSTRAINT fk_finding_comments_finding FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE CASCADE,
      CONSTRAINT fk_finding_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS finding_saves (
      user_id             CHAR(36) NOT NULL,
      source_finding_id   INT NOT NULL,
      cloned_finding_id   INT NOT NULL,
      created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, source_finding_id),
      CONSTRAINT fk_finding_saves_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_finding_saves_source FOREIGN KEY (source_finding_id) REFERENCES findings(id) ON DELETE CASCADE,
      CONSTRAINT fk_finding_saves_clone FOREIGN KEY (cloned_finding_id) REFERENCES findings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS finding_notifications (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      user_id         CHAR(36) NOT NULL,
      type            ENUM('finding_published', 'comment') NOT NULL,
      actor_user_id   CHAR(36) NULL,
      finding_id      INT NULL,
      comment_id      INT NULL,
      read_at         TIMESTAMP NULL DEFAULT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_finding_notifications_user (user_id, read_at, created_at),
      CONSTRAINT fk_finding_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS finding_views (
      finding_id    INT NOT NULL,
      viewer_key    VARCHAR(80) NOT NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (finding_id, viewer_key),
      KEY idx_finding_views_finding (finding_id),
      CONSTRAINT fk_finding_views_finding FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  tablesReady = true;
}

export function generatePublicId() {
  return `fnd_${crypto.randomBytes(8).toString('base64url')}`;
}

export async function getUserIdByEmail(email) {
  const rows = await query('SELECT id, username FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

export async function getUserIdByUsername(username) {
  const rows = await query(
    'SELECT id, username FROM users WHERE username = ? LIMIT 1',
    [username.trim()]
  );
  return rows[0] || null;
}

export async function searchUsersByUsername(prefix, limit = 8) {
  const like = `${prefix.trim()}%`;
  const lim = clampLimit(limit, 8, 20);
  return query(
    `SELECT id, username FROM users
     WHERE username LIKE ? AND username IS NOT NULL AND username != ''
     ORDER BY username ASC LIMIT ${lim}`,
    [like]
  );
}

export async function insertFinding(data) {
  await ensureFindingsTables();
  const publicId = generatePublicId();
  const result = await query(
    `INSERT INTO findings (public_id, user_id, query_text, locale, visibility, snapshot)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      publicId,
      data.userId,
      data.queryText.slice(0, 500),
      data.locale || 'ru',
      data.visibility || 'private',
      JSON.stringify(data.snapshot),
    ]
  );
  const findingId = result.insertId;
  if (data.visibility === 'public' || data.visibility === 'followers') {
    await notifyFollowersOfPublication(data.userId, findingId);
  }
  return { id: findingId, publicId };
}

export async function getFindingByPublicId(publicId) {
  await ensureFindingsTables();
  const rows = await query(
    `SELECT f.*, u.username AS author_username
     FROM findings f
     JOIN users u ON u.id = f.user_id
     WHERE f.public_id = ?
     LIMIT 1`,
    [publicId]
  );
  if (!rows.length) return null;
  const row = rows[0];
  row.snapshot = typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot;
  return row;
}

export async function userHasShareAccess(findingId, userId) {
  if (!userId) return false;
  const rows = await query(
    `SELECT id FROM finding_shares
     WHERE finding_id = ? AND to_user_id = ?
     LIMIT 1`,
    [findingId, userId]
  );
  if (rows.length > 0) return true;
  const { userHasDmFindingAccess } = await import('../dm/dm.model.mjs');
  return userHasDmFindingAccess(findingId, userId);
}

export async function listFindingsByUser(userId, limit = 50) {
  await ensureFindingsTables();
  const lim = clampLimit(limit);
  const rows = await query(
    `SELECT public_id, query_text, locale, visibility, created_at, snapshot
     FROM findings
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ${lim}`,
    [userId]
  );
  return rows.map((row) => ({
    public_id: row.public_id,
    query_text: row.query_text,
    locale: row.locale,
    visibility: row.visibility,
    created_at: row.created_at,
    answer_preview: excerptAnswer(row.snapshot),
  }));
}

export async function insertFindingShare({ findingId, fromUserId, toUserId, message }) {
  const { insertDmMessage } = await import('../dm/dm.model.mjs');
  const { messageId } = await insertDmMessage({
    senderId: fromUserId,
    recipientId: toUserId,
    body: message,
    findingId,
  });
  return messageId;
}

export async function listInboxForUser(userId, limit = 50) {
  const { listInboxFlatFromDm } = await import('../dm/dm.model.mjs');
  return listInboxFlatFromDm(userId, limit);
}

export async function countUnreadInbox(userId) {
  const { countUnreadDm } = await import('../dm/dm.model.mjs');
  return countUnreadDm(userId);
}

export async function deleteFindingByPublicId(userId, publicId) {
  await ensureFindingsTables();
  const finding = await getFindingByPublicId(publicId);
  if (!finding) return { ok: false, error: 'not_found' };
  if (finding.user_id !== userId) return { ok: false, error: 'forbidden' };
  await query('DELETE FROM findings WHERE public_id = ? AND user_id = ?', [publicId, userId]);
  return { ok: true };
}

export async function updateFindingVisibility(userId, publicId, visibility) {
  await ensureFindingsTables();
  const allowed = new Set(['private', 'public', 'followers']);
  if (!allowed.has(visibility)) return { ok: false, error: 'invalid_visibility' };
  const finding = await getFindingByPublicId(publicId);
  if (!finding) return { ok: false, error: 'not_found' };
  if (finding.user_id !== userId) return { ok: false, error: 'forbidden' };
  const prevVisibility = finding.visibility;
  await query(
    'UPDATE findings SET visibility = ? WHERE public_id = ? AND user_id = ?',
    [visibility, publicId, userId]
  );
  if (
    (visibility === 'public' || visibility === 'followers') &&
    prevVisibility !== 'public' &&
    prevVisibility !== 'followers'
  ) {
    await notifyFollowersOfPublication(userId, finding.id);
  }
  return { ok: true, visibility };
}

export async function listPublicFindings(limit = 30, offset = 0) {
  await ensureFindingsTables();
  const lim = clampLimit(limit, 30, 50);
  const off = Math.max(0, Number.parseInt(offset, 10) || 0);
  return query(
    `SELECT f.public_id, f.query_text, f.locale, f.created_at, u.username AS author_username
     FROM findings f
     JOIN users u ON u.id = f.user_id
     WHERE f.visibility = 'public'
     ORDER BY f.created_at DESC
     LIMIT ${lim} OFFSET ${off}`,
    []
  );
}

export async function markShareRead(shareId, userId) {
  const { markDmMessageRead } = await import('../dm/dm.model.mjs');
  await markDmMessageRead(shareId, userId);
}

export async function isFollowing(followerId, followingId) {
  if (!followerId || !followingId || followerId === followingId) return false;
  await ensureFindingsTables();
  const rows = await query(
    `SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1`,
    [followerId, followingId]
  );
  return rows.length > 0;
}

export async function toggleFollow(followerId, followingId) {
  if (!followerId || !followingId) return { ok: false, error: 'invalid_user' };
  if (followerId === followingId) return { ok: false, error: 'self_follow' };
  await ensureFindingsTables();
  const existing = await query(
    `SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1`,
    [followerId, followingId]
  );
  if (existing.length) {
    await query(
      `DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?`,
      [followerId, followingId]
    );
    const followersCount = await countUserFollowers(followingId);
    return { ok: true, following: false, followersCount };
  }
  await query(
    `INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)`,
    [followerId, followingId]
  );
  const followersCount = await countUserFollowers(followingId);
  return { ok: true, following: true, followersCount };
}

export async function countUserFollowers(userId) {
  await ensureFindingsTables();
  if (!userId) return 0;
  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM user_follows WHERE following_id = ?`,
    [userId]
  );
  return rows[0]?.cnt || 0;
}

export async function getFindingStats(findingId, viewerUserId = null) {
  await ensureFindingsTables();
  const likeRows = await query(
    `SELECT COUNT(*) AS cnt FROM finding_likes WHERE finding_id = ?`,
    [findingId]
  );
  const commentRows = await query(
    `SELECT COUNT(*) AS cnt FROM finding_comments WHERE finding_id = ?`,
    [findingId]
  );
  const viewRows = await query(
    `SELECT COUNT(*) AS cnt FROM finding_views WHERE finding_id = ?`,
    [findingId]
  );
  let likedByMe = false;
  if (viewerUserId) {
    const mine = await query(
      `SELECT 1 FROM finding_likes WHERE finding_id = ? AND user_id = ? LIMIT 1`,
      [findingId, viewerUserId]
    );
    likedByMe = mine.length > 0;
  }
  return {
    likesCount: likeRows[0]?.cnt || 0,
    commentsCount: commentRows[0]?.cnt || 0,
    viewsCount: viewRows[0]?.cnt || 0,
    likedByMe,
  };
}

export async function recordFindingView(findingId, viewerKey) {
  await ensureFindingsTables();
  const key = String(viewerKey || '').trim().slice(0, 80);
  if (!key) return;
  await query(
    `INSERT IGNORE INTO finding_views (finding_id, viewer_key) VALUES (?, ?)`,
    [findingId, key]
  );
}

export async function toggleFindingLike(findingId, userId) {
  await ensureFindingsTables();
  const existing = await query(
    `SELECT 1 FROM finding_likes WHERE finding_id = ? AND user_id = ? LIMIT 1`,
    [findingId, userId]
  );
  if (existing.length) {
    await query(`DELETE FROM finding_likes WHERE finding_id = ? AND user_id = ?`, [
      findingId,
      userId,
    ]);
    return { ok: true, liked: false };
  }
  await query(`INSERT INTO finding_likes (finding_id, user_id) VALUES (?, ?)`, [
    findingId,
    userId,
  ]);
  return { ok: true, liked: true };
}

export async function listFindingComments(findingId, limit = 50) {
  await ensureFindingsTables();
  const lim = clampLimit(limit, 50, 100);
  return query(
    `SELECT c.id, c.body, c.created_at, u.username AS author_username
     FROM finding_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.finding_id = ?
     ORDER BY c.created_at ASC
     LIMIT ${lim}`,
    [findingId]
  );
}

export async function insertFindingComment(findingId, userId, body) {
  await ensureFindingsTables();
  const text = String(body || '').trim().slice(0, 1000);
  if (!text) return { ok: false, error: 'empty_body' };
  const result = await query(
    `INSERT INTO finding_comments (finding_id, user_id, body) VALUES (?, ?, ?)`,
    [findingId, userId, text]
  );
  return { ok: true, commentId: result.insertId };
}

export async function insertNotification({ userId, type, actorUserId, findingId, commentId }) {
  await ensureFindingsTables();
  if (!userId || userId === actorUserId) return;
  await query(
    `INSERT INTO finding_notifications (user_id, type, actor_user_id, finding_id, comment_id)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, type, actorUserId || null, findingId || null, commentId || null]
  );
}

export async function notifyFollowersOfPublication(authorUserId, findingId) {
  await ensureFindingsTables();
  const followers = await query(
    `SELECT follower_id FROM user_follows WHERE following_id = ?`,
    [authorUserId]
  );
  for (const row of followers) {
    await insertNotification({
      userId: row.follower_id,
      type: 'finding_published',
      actorUserId: authorUserId,
      findingId,
    });
  }
}

export async function countUnreadNotifications(userId) {
  await ensureFindingsTables();
  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM finding_notifications
     WHERE user_id = ? AND read_at IS NULL`,
    [userId]
  );
  return rows[0]?.cnt || 0;
}

export async function listNotifications(userId, limit = 30) {
  await ensureFindingsTables();
  const lim = clampLimit(limit, 30, 50);
  return query(
    `SELECT n.id, n.type, n.read_at, n.created_at, n.finding_id,
            u.username AS actor_username,
            f.public_id, f.query_text
     FROM finding_notifications n
     LEFT JOIN users u ON u.id = n.actor_user_id
     LEFT JOIN findings f ON f.id = n.finding_id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT ${lim}`,
    [userId]
  );
}

export async function markNotificationRead(notificationId, userId) {
  await ensureFindingsTables();
  await query(
    `UPDATE finding_notifications SET read_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ? AND read_at IS NULL`,
    [notificationId, userId]
  );
}

export async function markAllNotificationsRead(userId) {
  await ensureFindingsTables();
  await query(
    `UPDATE finding_notifications SET read_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND read_at IS NULL`,
    [userId]
  );
}

function excerptAnswer(snapshot) {
  try {
    const data = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
    const text = String(data?.answer?.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return text.length > 220 ? `${text.slice(0, 217)}…` : text;
  } catch {
    return '';
  }
}

function mapFeedRow(row, viewerUserId) {
  return {
    public_id: row.public_id,
    query_text: row.query_text,
    locale: row.locale,
    visibility: row.visibility,
    created_at: row.created_at,
    author_username: row.author_username,
    author_user_id: row.user_id,
    answer_preview: excerptAnswer(row.snapshot),
    likes_count: row.likes_count || 0,
    comments_count: row.comments_count || 0,
    views_count: row.views_count || 0,
    author_followers_count: row.author_followers_count || 0,
    liked_by_me: viewerUserId ? row.liked_by_me === 1 : false,
    saved_by_me: viewerUserId ? row.saved_by_me === 1 : false,
    following_author: viewerUserId ? row.following_author === 1 : false,
    is_author_me: !!(viewerUserId && row.user_id === viewerUserId),
  };
}

export async function listFeedFindings({ mode = 'all', viewerUserId = null, q = '', limit = 30, offset = 0 }) {
  await ensureFindingsTables();
  const lim = clampLimit(limit, 30, 50);
  const off = Math.max(0, Number.parseInt(offset, 10) || 0);
  const search = String(q || '').trim().slice(0, 100);
  const params = [];

  const likedSelect = viewerUserId
    ? `(SELECT COUNT(*) FROM finding_likes fl WHERE fl.finding_id = f.id AND fl.user_id = ?) AS liked_by_me`
    : '0 AS liked_by_me';
  const savedSelect = viewerUserId
    ? `(SELECT COUNT(*) FROM finding_saves fs WHERE fs.source_finding_id = f.id AND fs.user_id = ?) AS saved_by_me`
    : '0 AS saved_by_me';
  const followingSelect = viewerUserId
    ? `(SELECT COUNT(*) FROM user_follows uf2 WHERE uf2.follower_id = ? AND uf2.following_id = f.user_id) AS following_author`
    : '0 AS following_author';

  if (viewerUserId) {
    params.push(viewerUserId, viewerUserId, viewerUserId);
  }

  let where = '';
  if (mode === 'following') {
    if (!viewerUserId) return [];
    where = `(f.visibility = 'public' OR (f.visibility = 'followers' AND EXISTS (
      SELECT 1 FROM user_follows uf WHERE uf.follower_id = ? AND uf.following_id = f.user_id
    )))`;
    params.push(viewerUserId);
  } else {
    where = `f.visibility = 'public'`;
  }

  if (search) {
    where += ` AND f.query_text LIKE ?`;
    params.push(`%${search}%`);
  }

  const sql = `
    SELECT f.public_id, f.query_text, f.locale, f.visibility, f.created_at, f.snapshot, f.user_id,
           u.username AS author_username,
           (SELECT COUNT(*) FROM finding_likes flc WHERE flc.finding_id = f.id) AS likes_count,
           (SELECT COUNT(*) FROM finding_comments fcc WHERE fcc.finding_id = f.id) AS comments_count,
           (SELECT COUNT(*) FROM finding_views fvc WHERE fvc.finding_id = f.id) AS views_count,
           (SELECT COUNT(*) FROM user_follows uf_count WHERE uf_count.following_id = f.user_id) AS author_followers_count,
           ${likedSelect},
           ${savedSelect},
           ${followingSelect}
    FROM findings f
    JOIN users u ON u.id = f.user_id
    WHERE ${where}
    ORDER BY f.created_at DESC
    LIMIT ${lim} OFFSET ${off}`;

  const rows = await query(sql, params);
  return rows.map((row) => mapFeedRow(row, viewerUserId));
}

export async function listFindingsByUsername(username, viewerUserId = null, limit = 30) {
  await ensureFindingsTables();
  const author = await getUserIdByUsername(username);
  if (!author) return { ok: false, error: 'user_not_found' };

  const lim = clampLimit(limit, 30, 50);
  const isOwner = viewerUserId && viewerUserId === author.id;
  const isFollower = viewerUserId ? await isFollowing(viewerUserId, author.id) : false;

  let visibilityFilter = `f.visibility = 'public'`;
  if (isOwner) {
    visibilityFilter = `f.visibility IN ('public', 'followers', 'private', 'link')`;
  } else if (isFollower) {
    visibilityFilter = `f.visibility IN ('public', 'followers')`;
  }

  const likedSelect = viewerUserId
    ? `(SELECT COUNT(*) FROM finding_likes fl WHERE fl.finding_id = f.id AND fl.user_id = ?) AS liked_by_me`
    : '0 AS liked_by_me';
  const params = viewerUserId ? [viewerUserId, author.id] : [author.id];

  const rows = await query(
    `SELECT f.public_id, f.query_text, f.locale, f.visibility, f.created_at, f.snapshot, f.user_id,
            u.username AS author_username,
            (SELECT COUNT(*) FROM finding_likes flc WHERE flc.finding_id = f.id) AS likes_count,
            (SELECT COUNT(*) FROM finding_comments fcc WHERE fcc.finding_id = f.id) AS comments_count,
            (SELECT COUNT(*) FROM finding_views fvc WHERE fvc.finding_id = f.id) AS views_count,
            (SELECT COUNT(*) FROM user_follows uf_count WHERE uf_count.following_id = f.user_id) AS author_followers_count,
            ${likedSelect}
     FROM findings f
     JOIN users u ON u.id = f.user_id
     WHERE f.user_id = ? AND ${visibilityFilter}
     ORDER BY f.created_at DESC
     LIMIT ${lim}`,
    params
  );

  const following = viewerUserId ? await isFollowing(viewerUserId, author.id) : false;
  return {
    ok: true,
    username: author.username,
    isOwner: !!isOwner,
    following,
    items: rows.map((row) => mapFeedRow(row, viewerUserId)),
  };
}

export async function cloneFindingForUser(publicId, userId) {
  await ensureFindingsTables();
  const source = await getFindingByPublicId(publicId);
  if (!source) return { ok: false, error: 'not_found' };

  const hasShare = await userHasShareAccess(source.id, userId);
  const canView =
    source.user_id === userId ||
    source.visibility === 'public' ||
    source.visibility === 'link' ||
    (source.visibility === 'followers' && (await isFollowing(userId, source.user_id))) ||
    hasShare;
  if (!canView) return { ok: false, error: 'forbidden' };
  if (source.user_id === userId) return { ok: false, error: 'already_owner' };

  const existing = await query(
    `SELECT fs.cloned_finding_id, f.public_id
     FROM finding_saves fs
     JOIN findings f ON f.id = fs.cloned_finding_id
     WHERE fs.user_id = ? AND fs.source_finding_id = ? LIMIT 1`,
    [userId, source.id]
  );
  if (existing.length) {
    return {
      ok: true,
      alreadySaved: true,
      publicId: existing[0].public_id,
    };
  }

  const snapshot = {
    ...source.snapshot,
    savedFrom: {
      publicId: source.public_id,
      authorUsername: source.author_username || null,
      savedAt: new Date().toISOString(),
    },
  };

  const { id: clonedId, publicId: clonedPublicId } = await insertFinding({
    userId,
    queryText: source.query_text,
    locale: source.locale,
    visibility: 'private',
    snapshot,
  });

  await query(
    `INSERT INTO finding_saves (user_id, source_finding_id, cloned_finding_id) VALUES (?, ?, ?)`,
    [userId, source.id, clonedId]
  );

  return { ok: true, alreadySaved: false, publicId: clonedPublicId };
}
