import express from 'express';
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
  listPublicFindings,
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

function canViewFinding(finding, viewerUserId, hasShare) {
  if (!finding) return false;
  if (viewerUserId && finding.user_id === viewerUserId) return true;
  if (finding.visibility === 'public' || finding.visibility === 'link') return true;
  if (finding.visibility === 'followers') return false;
  return !!hasShare;
}

function serializeFinding(finding, viewerUserId = null, hasShare = false) {
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
  };
}

router.get('/findings/feed/list', async (req, res) => {
  try {
    const limit = req.query.limit;
    const offset = req.query.offset;
    const rows = await listPublicFindings(limit, offset);
    res.json({
      items: rows.map((row) => ({
        public_id: row.public_id,
        query_text: row.query_text,
        locale: row.locale,
        created_at: row.created_at,
        author_username: row.author_username,
      })),
    });
  } catch (err) {
    console.error('[findings] feed list', err);
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

    if (!canViewFinding(finding, viewerUserId, hasShare)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    res.json(serializeFinding(finding, viewerUserId, hasShare));
  } catch (err) {
    console.error('[findings] get', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
