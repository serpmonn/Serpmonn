import express from 'express';
import verifyToken from '../auth/verifyToken.mjs';
import { getUserIdByEmail, getFindingByPublicId } from '../findings/findings.model.mjs';
import {
  countUnreadDm,
  listConversationsForUser,
  listMessagesWithPeer,
  insertDmMessage,
  markConversationReadWithPeer,
} from './dm.model.mjs';

const router = express.Router();

async function resolveDbUserId(req) {
  if (!req.user?.email) return null;
  const row = await getUserIdByEmail(req.user.email);
  return row?.id || null;
}

router.get('/dm/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const count = await countUnreadDm(userId);
    res.json({ count });
  } catch (err) {
    console.error('[dm] unread-count', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/dm/conversations', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const conversations = await listConversationsForUser(userId);
    res.json({ conversations });
  } catch (err) {
    console.error('[dm] conversations', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/dm/conversations/:username/messages', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const peerUsername = String(req.params.username || '').trim();
    if (!peerUsername) return res.status(400).json({ error: 'username_required' });

    const thread = await listMessagesWithPeer(userId, peerUsername);
    if (!thread) return res.status(404).json({ error: 'user_not_found' });

    await markConversationReadWithPeer(userId, peerUsername);
    res.json(thread);
  } catch (err) {
    console.error('[dm] messages', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/dm/conversations/:username/messages', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const peerUsername = String(req.params.username || '').trim();
    const body = String(req.body?.body || '').trim();
    const findingPublicId = String(req.body?.findingPublicId || '').trim();

    if (!peerUsername) return res.status(400).json({ error: 'username_required' });

    const { getUserIdByUsername } = await import('../findings/findings.model.mjs');
    const recipient = await getUserIdByUsername(peerUsername);
    if (!recipient) return res.status(404).json({ error: 'user_not_found' });
    if (recipient.id === userId) return res.status(400).json({ error: 'self_message' });

    let findingId = null;
    if (findingPublicId) {
      const finding = await getFindingByPublicId(findingPublicId);
      if (!finding) return res.status(404).json({ error: 'finding_not_found' });
      if (finding.user_id !== userId) {
        const { userHasShareAccess } = await import('../findings/findings.model.mjs');
        const hasShare = await userHasShareAccess(finding.id, userId);
        if (!hasShare) return res.status(403).json({ error: 'forbidden' });
      }
      findingId = finding.id;
    }

    if (!body && !findingId) return res.status(400).json({ error: 'empty_message' });

    const { messageId } = await insertDmMessage({
      senderId: userId,
      recipientId: recipient.id,
      body,
      findingId,
    });

    res.status(201).json({
      messageId,
      peerUsername: recipient.username,
      body: body || null,
      findingPublicId: findingPublicId || null,
    });
  } catch (err) {
    if (err.message === 'empty_message') {
      return res.status(400).json({ error: 'empty_message' });
    }
    console.error('[dm] send', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/dm/conversations/:username/read', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const peerUsername = String(req.params.username || '').trim();
    if (!peerUsername) return res.status(400).json({ error: 'username_required' });
    await markConversationReadWithPeer(userId, peerUsername);
    res.json({ ok: true });
  } catch (err) {
    console.error('[dm] mark read', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
