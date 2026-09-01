import express from 'express';
import multer from 'multer';
import verifyToken from '../auth/verifyToken.mjs';
import { getUserIdByEmail, getFindingByPublicId } from '../findings/findings.model.mjs';
import {
  countUnreadDm,
  listConversationsForUser,
  listMessagesWithPeer,
  insertDmMessage,
  markConversationReadWithPeer,
  resolveDmPeer,
} from './dm.model.mjs';
import {
  getMaxDmPhotoBytes,
  isAllowedDmPhotoMime,
  processAndSaveDmPhoto,
} from './dm-photo.mjs';
import {
  getMaxDmAudioBytes,
  isAllowedDmAudioMime,
  processAndSaveDmAudio,
} from './dm-audio.mjs';

const router = express.Router();

function noStore(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
}

router.use((req, res, next) => {
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
  Object.defineProperty(req, 'fresh', { configurable: true, get: () => false });
  noStore(res);
  const origJson = res.json.bind(res);
  res.json = (body) => {
    res.removeHeader('ETag');
    noStore(res);
    return origJson(body);
  };
  next();
});

const maxUploadBytes = Math.max(getMaxDmPhotoBytes(), getMaxDmAudioBytes());
const dmMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes, files: 2 },
});

function optionalDmMedia(req, res, next) {
  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.includes('multipart/form-data')) return next();
  dmMediaUpload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'file_too_large' });
    }
    return res.status(400).json({ error: 'media_upload_failed' });
  });
}

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

router.get('/dm/conversations/:peer/messages', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const peerKey = String(req.params.peer || '').trim();
    if (!peerKey) return res.status(400).json({ error: 'username_required' });

    const thread = await listMessagesWithPeer(userId, peerKey);
    if (!thread) return res.status(404).json({ error: 'user_not_found' });

    await markConversationReadWithPeer(userId, peerKey);
    res.json(thread);
  } catch (err) {
    console.error('[dm] messages', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/dm/conversations/:peer/messages', verifyToken, optionalDmMedia, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const peerKey = String(req.params.peer || '').trim();
    const body = String(req.body?.body || '').trim();
    const findingPublicId = String(req.body?.findingPublicId || '').trim();
    const audioDurationRaw = req.body?.audioDurationSec;

    if (!peerKey) return res.status(400).json({ error: 'username_required' });

    const recipient = await resolveDmPeer(userId, peerKey);
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

    const photoFile = req.files?.photo?.[0] || null;
    const audioFile = req.files?.audio?.[0] || null;
    // legacy: single('photo') style if somehow still present
    const legacyPhoto = !photoFile && req.file?.fieldname === 'photo' ? req.file : null;
    const photo = photoFile || legacyPhoto;

    let imageUrl = null;
    if (photo) {
      if (!isAllowedDmPhotoMime(photo.mimetype)) {
        return res.status(400).json({ error: 'invalid_photo_type' });
      }
      imageUrl = await processAndSaveDmPhoto(userId, photo.buffer);
    }

    let audioUrl = null;
    let audioDurationSec = null;
    if (audioFile) {
      if (!isAllowedDmAudioMime(audioFile.mimetype)) {
        return res.status(400).json({ error: 'invalid_audio_type' });
      }
      if (audioFile.size > getMaxDmAudioBytes()) {
        return res.status(413).json({ error: 'audio_too_large' });
      }
      audioUrl = await processAndSaveDmAudio(userId, audioFile.buffer, audioFile.mimetype);
      const parsedDuration = Number(audioDurationRaw);
      if (Number.isFinite(parsedDuration) && parsedDuration > 0) {
        audioDurationSec = Math.min(120, Math.round(parsedDuration));
      }
    }

    if (!body && !findingId && !imageUrl && !audioUrl) {
      return res.status(400).json({ error: 'empty_message' });
    }

    const { messageId } = await insertDmMessage({
      senderId: userId,
      recipientId: recipient.id,
      body,
      findingId,
      imageUrl,
      audioUrl,
      audioDurationSec,
    });

    const senderUsername = (await getUserIdByEmail(req.user.email))?.username || '';
    import('../push/send-push.mjs')
      .then(({ notifyRecipientOfDm }) =>
        notifyRecipientOfDm({
          recipientId: recipient.id,
          senderUsername,
          body,
          hasPhoto: Boolean(imageUrl),
          hasAudio: Boolean(audioUrl),
          hasFinding: Boolean(findingId),
        })
      )
      .catch((err) => console.error('[dm] push', err?.message || err));

    res.status(201).json({
      messageId,
      peerUsername: recipient.username,
      peerId: recipient.id,
      body: body || null,
      findingPublicId: findingPublicId || null,
      imageUrl,
      audioUrl,
      audioDurationSec,
    });
  } catch (err) {
    if (err.message === 'empty_message') {
      return res.status(400).json({ error: 'empty_message' });
    }
    if (err.message === 'audio_too_large') {
      return res.status(413).json({ error: 'audio_too_large' });
    }
    console.error('[dm] send', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/dm/conversations/:peer/read', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const peerKey = String(req.params.peer || '').trim();
    if (!peerKey) return res.status(400).json({ error: 'username_required' });
    await markConversationReadWithPeer(userId, peerKey);
    res.json({ ok: true });
  } catch (err) {
    console.error('[dm] mark read', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
