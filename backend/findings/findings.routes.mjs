import express from 'express';
import crypto from 'node:crypto';
import paseto from 'paseto';
import verifyToken from '../auth/verifyToken.mjs';
import { getBackendMessages } from '../utils/i18n.mjs';
import {
  getUserIdByEmail,
  getUserIdByUsername,
  searchUsersByUsername,
  insertFinding,
  getFindingByPublicId,
  userHasShareAccess,
  listFindingsByUser,
  insertFindingShare,
  listInboxForUser,
  countUnreadInbox,
  markShareRead,
  deleteFindingByPublicId,
  updateFindingVisibility,
  listFeedFindings,
  isFollowing,
  toggleFollow,
  getFindingStats,
  recordFindingView,
  toggleFindingLike,
  listFindingComments,
  insertFindingComment,
  insertNotification,
  countUnreadNotifications,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  listFindingsByUsername,
  cloneFindingForUser,
} from './findings.model.mjs';

const { V2 } = paseto;
const secretKey = process.env.SECRET_KEY;
const router = express.Router();

async function attachOptionalUser(req, res, next) {
  const token = req.cookies?.token;
  if (!token || !secretKey) {
    req.user = null;
    return next();
  }
  try {
    req.user = await V2.verify(token, secretKey);
  } catch {
    req.user = null;
  }
  next();
}

async function resolveDbUserId(req) {
  if (!req.user?.email) return null;
  const row = await getUserIdByEmail(req.user.email);
  return row?.id || null;
}

async function canViewFinding(finding, viewerUserId, hasShare) {
  if (!finding) return false;
  if (viewerUserId && finding.user_id === viewerUserId) return true;
  if (finding.visibility === 'public' || finding.visibility === 'link') return true;
  if (finding.visibility === 'followers' && viewerUserId) {
    return isFollowing(viewerUserId, finding.user_id);
  }
  return !!hasShare;
}

function serializeFinding(finding, viewerUserId = null, hasShare = false, stats = null) {
  const isOwner = !!(viewerUserId && finding.user_id === viewerUserId);
  return {
    publicId: finding.public_id,
    query: finding.query_text,
    locale: finding.locale,
    visibility: finding.visibility,
    snapshot: finding.snapshot,
    createdAt: finding.created_at,
    author: finding.author_username || null,
    isOwner,
    canShare: isOwner || !!hasShare,
    likesCount: stats?.likesCount ?? 0,
    commentsCount: stats?.commentsCount ?? 0,
    viewsCount: stats?.viewsCount ?? 0,
    likedByMe: stats?.likedByMe ?? false,
  };
}

function buildViewerKey(req, viewerUserId) {
  if (viewerUserId) return `u:${viewerUserId}`;
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
  const ua = String(req.headers['user-agent'] || '').slice(0, 120);
  const hash = crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32);
  return `g:${hash}`;
}

router.get('/findings/feed/list', attachOptionalUser, async (req, res) => {
  try {
    const mode = String(req.query.mode || 'all').trim() === 'following' ? 'following' : 'all';
    const q = String(req.query.q || '').trim();
    const limit = req.query.limit;
    const offset = req.query.offset;
    const viewerUserId = req.user?.email
      ? (await getUserIdByEmail(req.user.email))?.id || null
      : null;

    if (mode === 'following' && !viewerUserId) {
      return res.status(401).json({ error: 'login_required' });
    }

    const items = await listFeedFindings({ mode, viewerUserId, q, limit, offset });
    res.json({ items, mode });
  } catch (err) {
    console.error('[findings] feed list', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/findings/notifications/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const count = await countUnreadNotifications(userId);
    res.json({ count });
  } catch (err) {
    console.error('[findings] notifications unread-count', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/findings/notifications/list', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const items = await listNotifications(userId);
    res.json({ items });
  } catch (err) {
    console.error('[findings] notifications list', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/findings/notifications/read-all', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    await markAllNotificationsRead(userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[findings] notifications read-all', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/findings/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const notificationId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(notificationId)) return res.status(400).json({ error: 'invalid_id' });
    await markNotificationRead(notificationId, userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[findings] notification read', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/findings/users/:username/findings', attachOptionalUser, async (req, res) => {
  try {
    const username = String(req.params.username || '').trim();
    if (!username) return res.status(400).json({ error: 'username_required' });
    const viewerUserId = req.user?.email
      ? (await getUserIdByEmail(req.user.email))?.id || null
      : null;
    const result = await listFindingsByUsername(username, viewerUserId);
    if (!result.ok) {
      if (result.error === 'user_not_found') return res.status(404).json({ error: 'user_not_found' });
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('[findings] user findings', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/findings/users/:username/follow', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const username = String(req.params.username || '').trim();
    const target = await getUserIdByUsername(username);
    if (!target) return res.status(404).json({ error: 'user_not_found' });
    const result = await toggleFollow(userId, target.id);
    if (!result.ok) {
      if (result.error === 'self_follow') return res.status(400).json({ error: 'self_follow' });
      return res.status(400).json({ error: result.error });
    }
    res.json({
      ok: true,
      following: result.following,
      username: target.username,
      followersCount: result.followersCount ?? 0,
    });
  } catch (err) {
    console.error('[findings] follow', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/findings/inbox/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const count = await countUnreadInbox(userId);
    res.json({ count });
  } catch (err) {
    console.error('[findings] unread-count', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/findings/inbox/list', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const items = await listInboxForUser(userId);
    res.json({ items });
  } catch (err) {
    console.error('[findings] inbox list', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/findings/inbox/:shareId/read', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const shareId = Number.parseInt(req.params.shareId, 10);
    if (!Number.isFinite(shareId)) return res.status(400).json({ error: 'invalid_id' });
    await markShareRead(shareId, userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[findings] mark read', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/findings/mine/list', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const items = await listFindingsByUser(userId);
    res.json({ items });
  } catch (err) {
    console.error('[findings] mine list', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/findings/users/lookup', verifyToken, async (req, res) => {
  try {
    const q = String(req.query.username || req.query.q || '').trim();
    if (q.length < 2) return res.json({ users: [] });
    const users = await searchUsersByUsername(q, 8);
    res.json({ users: users.map((u) => ({ username: u.username })) });
  } catch (err) {
    console.error('[findings] user lookup', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/findings', verifyToken, async (req, res) => {
  const { t } = getBackendMessages(req);
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const queryText = String(req.body?.query || '').trim();
    const locale = String(req.body?.locale || 'ru').slice(0, 16);
    const visibility = req.body?.visibility || 'private';
    const snapshot = req.body?.snapshot;

    if (!queryText) return res.status(400).json({ error: 'query_required' });
    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({ error: 'snapshot_required' });
    }

    const allowed = new Set(['private', 'link', 'followers', 'public']);
    if (!allowed.has(visibility)) {
      return res.status(400).json({ error: 'invalid_visibility' });
    }

    const answerText = String(snapshot?.answer?.text || '').trim();
    if (!answerText) return res.status(400).json({ error: 'empty_answer' });

    const { publicId } = await insertFinding({
      userId,
      queryText,
      locale,
      visibility,
      snapshot,
    });

    res.status(201).json({ publicId, visibility });
  } catch (err) {
    console.error('[findings] create', err);
    res.status(500).json({ error: t.internalError || 'internal_error' });
  }
});

router.post('/findings/:publicId/share', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const publicId = String(req.params.publicId || '').trim();
    const toUsername = String(req.body?.toUsername || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!toUsername) return res.status(400).json({ error: 'username_required' });

    const finding = await getFindingByPublicId(publicId);
    if (!finding) return res.status(404).json({ error: 'not_found' });
    if (finding.user_id !== userId) {
      const hasShare = await userHasShareAccess(finding.id, userId);
      if (!hasShare) return res.status(403).json({ error: 'forbidden' });
    }

    const recipient = await getUserIdByUsername(toUsername);
    if (!recipient) return res.status(404).json({ error: 'user_not_found' });
    if (recipient.id === userId) return res.status(400).json({ error: 'self_share' });

    const shareId = await insertFindingShare({
      findingId: finding.id,
      fromUserId: userId,
      toUserId: recipient.id,
      message,
    });

    res.status(201).json({ shareId, publicId, toUsername: recipient.username });
  } catch (err) {
    console.error('[findings] share', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/findings/:publicId/save', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const publicId = String(req.params.publicId || '').trim();
    if (!publicId.startsWith('fnd_')) return res.status(400).json({ error: 'invalid_id' });

    const result = await cloneFindingForUser(publicId, userId);
    if (!result.ok) {
      if (result.error === 'not_found') return res.status(404).json({ error: 'not_found' });
      if (result.error === 'forbidden') return res.status(403).json({ error: 'forbidden' });
      if (result.error === 'already_owner') return res.status(400).json({ error: 'already_owner' });
      return res.status(400).json({ error: result.error });
    }

    res.json({
      ok: true,
      publicId: result.publicId,
      alreadySaved: result.alreadySaved === true,
    });
  } catch (err) {
    console.error('[findings] save clone', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/findings/:publicId/like', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const publicId = String(req.params.publicId || '').trim();
    const finding = await getFindingByPublicId(publicId);
    if (!finding) return res.status(404).json({ error: 'not_found' });

    const hasShare = await userHasShareAccess(finding.id, userId);
    const allowed = await canViewFinding(finding, userId, hasShare);
    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    const result = await toggleFindingLike(finding.id, userId);
    const stats = await getFindingStats(finding.id, userId);

    res.json({ ok: true, liked: result.liked, ...stats });
  } catch (err) {
    console.error('[findings] like', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/findings/:publicId/comments', attachOptionalUser, async (req, res) => {
  try {
    const publicId = String(req.params.publicId || '').trim();
    const finding = await getFindingByPublicId(publicId);
    if (!finding) return res.status(404).json({ error: 'not_found' });

    const viewerUserId = req.user?.email
      ? (await getUserIdByEmail(req.user.email))?.id || null
      : null;
    const hasShare = viewerUserId
      ? await userHasShareAccess(finding.id, viewerUserId)
      : false;
    const allowed = await canViewFinding(finding, viewerUserId, hasShare);
    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    const items = await listFindingComments(finding.id);
    res.json({ items });
  } catch (err) {
    console.error('[findings] comments list', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/findings/:publicId/comments', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const publicId = String(req.params.publicId || '').trim();
    const body = String(req.body?.body || '').trim();
    const finding = await getFindingByPublicId(publicId);
    if (!finding) return res.status(404).json({ error: 'not_found' });

    const hasShare = await userHasShareAccess(finding.id, userId);
    const allowed = await canViewFinding(finding, userId, hasShare);
    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    const result = await insertFindingComment(finding.id, userId, body);
    if (!result.ok) return res.status(400).json({ error: result.error });

    if (finding.user_id !== userId) {
      await insertNotification({
        userId: finding.user_id,
        type: 'comment',
        actorUserId: userId,
        findingId: finding.id,
        commentId: result.commentId,
      });
    }

    const stats = await getFindingStats(finding.id, userId);
    res.status(201).json({ ok: true, commentId: result.commentId, ...stats });
  } catch (err) {
    console.error('[findings] comment create', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.patch('/findings/:publicId', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const publicId = String(req.params.publicId || '').trim();
    const visibility = String(req.body?.visibility || '').trim();
    if (!publicId.startsWith('fnd_')) {
      return res.status(400).json({ error: 'invalid_id' });
    }

    const result = await updateFindingVisibility(userId, publicId, visibility);
    if (!result.ok) {
      if (result.error === 'not_found') return res.status(404).json({ error: 'not_found' });
      if (result.error === 'forbidden') return res.status(403).json({ error: 'forbidden' });
      return res.status(400).json({ error: result.error });
    }

    res.json({ ok: true, publicId, visibility: result.visibility });
  } catch (err) {
    console.error('[findings] patch visibility', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.delete('/findings/:publicId', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const publicId = String(req.params.publicId || '').trim();
    if (!publicId.startsWith('fnd_')) {
      return res.status(400).json({ error: 'invalid_id' });
    }

    const result = await deleteFindingByPublicId(userId, publicId);
    if (!result.ok) {
      if (result.error === 'not_found') return res.status(404).json({ error: 'not_found' });
      if (result.error === 'forbidden') return res.status(403).json({ error: 'forbidden' });
      return res.status(400).json({ error: result.error });
    }

    res.json({ ok: true, publicId });
  } catch (err) {
    console.error('[findings] delete', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/findings/:publicId', attachOptionalUser, async (req, res) => {
  try {
    const publicId = String(req.params.publicId || '').trim();
    if (!publicId.startsWith('fnd_')) {
      return res.status(400).json({ error: 'invalid_id' });
    }

    const finding = await getFindingByPublicId(publicId);
    if (!finding) return res.status(404).json({ error: 'not_found' });

    const viewerUserId = req.user?.email
      ? (await getUserIdByEmail(req.user.email))?.id || null
      : null;

    const hasShare = viewerUserId
      ? await userHasShareAccess(finding.id, viewerUserId)
      : false;

    const allowed = await canViewFinding(finding, viewerUserId, hasShare);
    if (!allowed) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const isOwner = !!(viewerUserId && finding.user_id === viewerUserId);
    if (!isOwner) {
      await recordFindingView(finding.id, buildViewerKey(req, viewerUserId));
    }

    const stats = await getFindingStats(finding.id, viewerUserId);
    res.json(serializeFinding(finding, viewerUserId, hasShare, stats));
  } catch (err) {
    console.error('[findings] get', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
