import express from 'express';
import rateLimit from 'express-rate-limit';
import paseto from 'paseto';
import { randomUUID } from 'crypto';
import { query } from '../database/config.mjs';
import { setAuthCookie } from '../auth/authCookie.mjs';
import verifyToken from '../auth/verifyToken.mjs';
import {
    WEB_LOGIN_HOST,
    WEB_LOGIN_API_BASE,
    CHALLENGE_TTL_MS,
    EXCHANGE_TTL_MS,
    deriveMessengerUserId,
    buildCanonicalString,
    verifyEd25519Detached,
    randomToken,
    randomShortCode,
    toMysqlDateTime
} from './messengerAuthCrypto.mjs';

const { V2 } = paseto;
const router = express.Router();
const PASETO_SECRET = process.env.SECRET_KEY;

const challengeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false
});

const approveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
});

let schemaReady = false;
let schemaPromise = null;

async function ensureSchema() {
    if (schemaReady) return;
    if (schemaPromise) return schemaPromise;

    schemaPromise = (async () => {
        await query(`
            CREATE TABLE IF NOT EXISTS messenger_auth_challenges (
                challenge_id CHAR(36) NOT NULL PRIMARY KEY,
                short_code VARCHAR(8) NOT NULL,
                nonce VARCHAR(64) NOT NULL,
                purpose ENUM('login','link') NOT NULL DEFAULT 'login',
                host VARCHAR(255) NOT NULL,
                exp DATETIME NOT NULL,
                created_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                link_user_id CHAR(36) NULL,
                approved_user_id CHAR(36) NULL,
                exchange_code VARCHAR(64) NULL,
                exchange_expires_at DATETIME NULL,
                exchange_used_at DATETIME NULL,
                UNIQUE KEY uniq_short_code (short_code),
                KEY idx_exchange_code (exchange_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Best-effort columns on users (migration script is source of truth for prod).
        // Check first to avoid noisy ER_DUP_* errors from the shared query() logger.
        const colRows = await query(
            `SELECT COLUMN_NAME AS name
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users'
               AND COLUMN_NAME IN ('messenger_user_id', 'messenger_sign_pub')`
        );
        const cols = new Set(colRows.map((r) => r.name));
        if (!cols.has('messenger_user_id')) {
            await query(
                'ALTER TABLE users ADD COLUMN messenger_user_id VARCHAR(64) NULL DEFAULT NULL'
            );
        }
        if (!cols.has('messenger_sign_pub')) {
            await query(
                'ALTER TABLE users ADD COLUMN messenger_sign_pub VARCHAR(128) NULL DEFAULT NULL'
            );
        }

        const idxRows = await query(
            `SELECT COUNT(*) AS cnt
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users'
               AND INDEX_NAME = 'uniq_users_messenger_user_id'`
        );
        if (!(idxRows[0]?.cnt > 0)) {
            try {
                await query(
                    'CREATE UNIQUE INDEX uniq_users_messenger_user_id ON users (messenger_user_id)'
                );
            } catch (err) {
                if (err?.code !== 'ER_DUP_KEYNAME' && err?.errno !== 1061
                    && err?.code !== 'ER_DUP_ENTRY' && err?.errno !== 1062) {
                    console.warn('messenger-auth ensureSchema index:', err.message);
                }
            }
        }

        schemaReady = true;
    })();

    try {
        await schemaPromise;
    } finally {
        schemaPromise = null;
    }
}

function buildQrPayload({ challengeId, nonce, expUnix, purpose }) {
    return {
        v: 1,
        type: purpose === 'link' ? 'web_link' : 'web_login',
        host: WEB_LOGIN_HOST,
        challengeId,
        nonce,
        exp: expUnix,
        apiBase: WEB_LOGIN_API_BASE
    };
}

async function createChallenge({ purpose, linkUserId = null }) {
    await ensureSchema();

    const challengeId = randomUUID();
    const nonce = randomToken(16);
    const now = new Date();
    const expDate = new Date(now.getTime() + CHALLENGE_TTL_MS);
    const expUnix = Math.floor(expDate.getTime() / 1000);

    let shortCode = randomShortCode(4);
    for (let attempt = 0; attempt < 8; attempt++) {
        try {
            await query(
                `INSERT INTO messenger_auth_challenges
                 (challenge_id, short_code, nonce, purpose, host, exp, created_at, link_user_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    challengeId,
                    shortCode,
                    nonce,
                    purpose,
                    WEB_LOGIN_HOST,
                    toMysqlDateTime(expDate),
                    toMysqlDateTime(now),
                    linkUserId
                ]
            );
            break;
        } catch (err) {
            if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
                shortCode = randomShortCode(4);
                continue;
            }
            throw err;
        }
    }

    const qrPayload = buildQrPayload({ challengeId, nonce, expUnix, purpose });
    return {
        challengeId,
        nonce,
        shortCode,
        expiresAt: expDate.toISOString(),
        exp: expUnix,
        qrPayload,
        deepLink: `serpmonn://web-login?data=${encodeURIComponent(JSON.stringify(qrPayload))}`
    };
}

async function findOrCreateUserFromMessenger({ messengerUserId, signPubHex, displayName }) {
    const byMsg = await query(
        'SELECT id, username, email, messenger_user_id, messenger_sign_pub FROM users WHERE messenger_user_id = ? LIMIT 1',
        [messengerUserId]
    );
    if (byMsg.length > 0) {
        const user = byMsg[0];
        if (user.messenger_sign_pub && user.messenger_sign_pub !== signPubHex) {
            const err = new Error('Messenger key mismatch for this account');
            err.status = 409;
            throw err;
        }
        if (!user.messenger_sign_pub) {
            await query(
                'UPDATE users SET messenger_sign_pub = ? WHERE id = ?',
                [signPubHex, user.id]
            );
        }
        return user;
    }

    const byPub = await query(
        'SELECT id, username, email, messenger_user_id, messenger_sign_pub FROM users WHERE messenger_sign_pub = ? LIMIT 1',
        [signPubHex]
    );
    if (byPub.length > 0) {
        const user = byPub[0];
        if (user.messenger_user_id && user.messenger_user_id !== messengerUserId) {
            const err = new Error('This messenger key is already linked to another account');
            err.status = 409;
            throw err;
        }
        await query(
            'UPDATE users SET messenger_user_id = ?, messenger_sign_pub = ? WHERE id = ?',
            [messengerUserId, signPubHex, user.id]
        );
        return { ...user, messenger_user_id: messengerUserId, messenger_sign_pub: signPubHex };
    }

    const short = messengerUserId.slice(0, 12);
    const usernameBase = (displayName && String(displayName).trim().slice(0, 24)) || `msg_${short}`;
    const username = usernameBase.replace(/[^\w.\-а-яА-ЯёЁ]+/gi, '_').slice(0, 32) || `msg_${short}`;
    const email = `msg_${messengerUserId}@users.serpmonn.ru`;

    await query(
        `INSERT INTO users (id, username, email, messenger_user_id, messenger_sign_pub, confirmed, password_hash)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        [username, email, messengerUserId, signPubHex, true, '']
    );

    const rows = await query(
        'SELECT id, username, email, messenger_user_id, messenger_sign_pub FROM users WHERE messenger_user_id = ? LIMIT 1',
        [messengerUserId]
    );
    return rows[0];
}

async function issueExchangeCode(challengeId, userId) {
    const exchangeCode = randomToken(24);
    const exchangeExp = new Date(Date.now() + EXCHANGE_TTL_MS);
    await query(
        `UPDATE messenger_auth_challenges
         SET used_at = UTC_TIMESTAMP(),
             approved_user_id = ?,
             exchange_code = ?,
             exchange_expires_at = ?
         WHERE challenge_id = ?`,
        [userId, exchangeCode, toMysqlDateTime(exchangeExp), challengeId]
    );
    return exchangeCode;
}

// POST /api/messenger-auth/challenge — public login challenge
router.post('/messenger-auth/challenge', challengeLimiter, async (req, res, next) => {
    try {
        const created = await createChallenge({ purpose: 'login' });
        return res.json({ success: true, ...created });
    } catch (err) {
        console.error('messenger-auth challenge error:', err);
        next(err);
    }
});

// POST /api/messenger-auth/link-challenge — bind messenger to current site session
router.post('/messenger-auth/link-challenge', verifyToken, challengeLimiter, async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const created = await createChallenge({ purpose: 'link', linkUserId: userId });
        return res.json({ success: true, ...created });
    } catch (err) {
        console.error('messenger-auth link-challenge error:', err);
        next(err);
    }
});

// GET /api/messenger-auth/by-code?code=ABCD — resolve short code for manual entry in app
router.get('/messenger-auth/by-code', approveLimiter, async (req, res, next) => {
    try {
        await ensureSchema();
        const code = String(req.query.code || '').trim().toUpperCase();
        if (!/^[A-Z0-9]{4,8}$/.test(code)) {
            return res.status(400).json({ message: 'Invalid code' });
        }

        const rows = await query(
            `SELECT challenge_id, nonce, purpose, host, exp, used_at
             FROM messenger_auth_challenges
             WHERE short_code = ?
             LIMIT 1`,
            [code]
        );
        if (!rows.length) {
            return res.status(404).json({ message: 'Code not found' });
        }
        const row = rows[0];
        if (row.used_at) {
            return res.status(410).json({ message: 'Code already used' });
        }
        const expDate = new Date(row.exp);
        if (Number.isNaN(expDate.getTime()) || expDate.getTime() < Date.now()) {
            return res.status(410).json({ message: 'Code expired' });
        }

        const expUnix = Math.floor(expDate.getTime() / 1000);
        const qrPayload = buildQrPayload({
            challengeId: row.challenge_id,
            nonce: row.nonce,
            expUnix,
            purpose: row.purpose
        });
        return res.json({ success: true, qrPayload, expiresAt: expDate.toISOString() });
    } catch (err) {
        console.error('messenger-auth by-code error:', err);
        next(err);
    }
});

// POST /api/messenger-auth/approve — called from messenger app
router.post('/messenger-auth/approve', approveLimiter, async (req, res, next) => {
    try {
        await ensureSchema();
        const {
            challengeId,
            nonce,
            signPubHex,
            userId: messengerUserIdBody,
            signature,
            displayName
        } = req.body || {};

        if (!challengeId || !nonce || !signPubHex || !signature) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const signPub = String(signPubHex).trim().toLowerCase();
        if (!/^[0-9a-f]{64}$/.test(signPub)) {
            return res.status(400).json({ message: 'Invalid signPubHex' });
        }

        let messengerUserId;
        try {
            messengerUserId = deriveMessengerUserId(signPub);
        } catch {
            return res.status(400).json({ message: 'Invalid signPubHex' });
        }

        if (
            messengerUserIdBody &&
            String(messengerUserIdBody).trim().toLowerCase() !== messengerUserId
        ) {
            return res.status(400).json({ message: 'userId does not match signPub' });
        }

        const rows = await query(
            `SELECT challenge_id, nonce, purpose, host, exp, used_at, link_user_id
             FROM messenger_auth_challenges
             WHERE challenge_id = ?
             LIMIT 1`,
            [challengeId]
        );
        if (!rows.length) {
            return res.status(404).json({ message: 'Challenge not found' });
        }
        const challenge = rows[0];
        if (challenge.used_at) {
            return res.status(410).json({ message: 'Challenge already used' });
        }
        if (challenge.nonce !== nonce) {
            return res.status(400).json({ message: 'Nonce mismatch' });
        }
        if (challenge.host !== WEB_LOGIN_HOST) {
            return res.status(400).json({ message: 'Host mismatch' });
        }

        const expDate = new Date(challenge.exp);
        const expUnix = Math.floor(expDate.getTime() / 1000);
        if (Number.isNaN(expDate.getTime()) || expDate.getTime() < Date.now()) {
            return res.status(410).json({ message: 'Challenge expired' });
        }

        const canonical = buildCanonicalString({
            challengeId,
            nonce,
            host: WEB_LOGIN_HOST,
            exp: expUnix
        });

        const ok = verifyEd25519Detached({
            message: canonical,
            signatureHex: signature,
            signPubHex: signPub
        });
        if (!ok) {
            return res.status(401).json({ message: 'Invalid signature' });
        }

        let user;
        if (challenge.purpose === 'link') {
            if (!challenge.link_user_id) {
                return res.status(400).json({ message: 'Link challenge has no user' });
            }

            const conflict = await query(
                `SELECT id FROM users
                 WHERE messenger_user_id = ? AND id <> ?
                 LIMIT 1`,
                [messengerUserId, challenge.link_user_id]
            );
            if (conflict.length) {
                return res.status(409).json({
                    message: 'This messenger profile is already linked to another account'
                });
            }

            await query(
                `UPDATE users
                 SET messenger_user_id = ?, messenger_sign_pub = ?
                 WHERE id = ?`,
                [messengerUserId, signPub, challenge.link_user_id]
            );

            const linked = await query(
                'SELECT id, username, email, messenger_user_id, messenger_sign_pub FROM users WHERE id = ? LIMIT 1',
                [challenge.link_user_id]
            );
            user = linked[0];
        } else {
            user = await findOrCreateUserFromMessenger({
                messengerUserId,
                signPubHex: signPub,
                displayName
            });
        }

        await issueExchangeCode(challengeId, user.id);

        return res.json({
            success: true,
            message: challenge.purpose === 'link' ? 'Linked' : 'Approved',
            purpose: challenge.purpose
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ message: err.message });
        }
        console.error('messenger-auth approve error:', err);
        next(err);
    }
});

// GET /api/messenger-auth/status?challengeId=
router.get('/messenger-auth/status', challengeLimiter, async (req, res, next) => {
    try {
        await ensureSchema();
        const challengeId = String(req.query.challengeId || '').trim();
        if (!challengeId) {
            return res.status(400).json({ message: 'Missing challengeId' });
        }

        const rows = await query(
            `SELECT challenge_id, exp, used_at, approved_user_id, exchange_code, exchange_expires_at, exchange_used_at, purpose
             FROM messenger_auth_challenges
             WHERE challenge_id = ?
             LIMIT 1`,
            [challengeId]
        );
        if (!rows.length) {
            return res.status(404).json({ status: 'missing' });
        }
        const row = rows[0];
        const expDate = new Date(row.exp);
        if (!row.used_at && expDate.getTime() < Date.now()) {
            return res.json({ status: 'expired' });
        }
        if (!row.used_at || !row.exchange_code) {
            return res.json({ status: 'pending' });
        }
        if (row.exchange_used_at) {
            return res.json({ status: 'consumed' });
        }
        const exchangeExp = row.exchange_expires_at ? new Date(row.exchange_expires_at) : null;
        if (exchangeExp && exchangeExp.getTime() < Date.now()) {
            return res.json({ status: 'expired' });
        }

        return res.json({
            status: 'approved',
            purpose: row.purpose,
            exchangeCode: row.exchange_code
        });
    } catch (err) {
        console.error('messenger-auth status error:', err);
        next(err);
    }
});

// POST /api/messenger-auth/exchange — browser finishes login, sets cookie
router.post('/messenger-auth/exchange', challengeLimiter, async (req, res, next) => {
    try {
        await ensureSchema();
        if (!PASETO_SECRET) {
            return res.status(500).json({ message: 'Server misconfigured' });
        }

        const exchangeCode = String(req.body?.exchangeCode || '').trim();
        if (!/^[0-9a-f]{32,128}$/i.test(exchangeCode)) {
            return res.status(400).json({ message: 'Invalid exchangeCode' });
        }

        const rows = await query(
            `SELECT challenge_id, approved_user_id, exchange_expires_at, exchange_used_at, purpose
             FROM messenger_auth_challenges
             WHERE exchange_code = ?
             LIMIT 1`,
            [exchangeCode]
        );
        if (!rows.length) {
            return res.status(404).json({ message: 'Exchange code not found' });
        }
        const row = rows[0];
        if (row.exchange_used_at) {
            return res.status(410).json({ message: 'Exchange code already used' });
        }
        const exchangeExp = row.exchange_expires_at ? new Date(row.exchange_expires_at) : null;
        if (!exchangeExp || exchangeExp.getTime() < Date.now()) {
            return res.status(410).json({ message: 'Exchange code expired' });
        }
        if (!row.approved_user_id) {
            return res.status(400).json({ message: 'Challenge not approved' });
        }

        const users = await query(
            `SELECT id, username, email, messenger_user_id
             FROM users WHERE id = ? LIMIT 1`,
            [row.approved_user_id]
        );
        if (!users.length) {
            return res.status(404).json({ message: 'User not found' });
        }
        const user = users[0];

        await query(
            `UPDATE messenger_auth_challenges
             SET exchange_used_at = UTC_TIMESTAMP()
             WHERE challenge_id = ? AND exchange_used_at IS NULL`,
            [row.challenge_id]
        );

        // For link purpose, browser already has a session — still refresh cookie.
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email || null,
            messengerUserId: user.messenger_user_id || null
        };
        const token = await V2.sign(payload, PASETO_SECRET);
        setAuthCookie(res, token, 30 * 24 * 60 * 60 * 1000);

        return res.json({
            success: true,
            purpose: row.purpose,
            user: {
                id: user.id,
                username: user.username,
                email: user.email || null,
                messengerUserId: user.messenger_user_id || null
            }
        });
    } catch (err) {
        console.error('messenger-auth exchange error:', err);
        next(err);
    }
});

// GET /api/messenger-auth/me — binding status for profile UI
router.get('/messenger-auth/me', verifyToken, async (req, res, next) => {
    try {
        await ensureSchema();
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const rows = await query(
            'SELECT messenger_user_id, messenger_sign_pub FROM users WHERE id = ? LIMIT 1',
            [userId]
        );
        if (!rows.length) {
            return res.status(404).json({ message: 'User not found' });
        }
        const row = rows[0];
        return res.json({
            linked: Boolean(row.messenger_user_id),
            messengerUserId: row.messenger_user_id || null
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/messenger-auth/unlink
router.post('/messenger-auth/unlink', verifyToken, challengeLimiter, async (req, res, next) => {
    try {
        await ensureSchema();
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        await query(
            `UPDATE users
             SET messenger_user_id = NULL, messenger_sign_pub = NULL
             WHERE id = ?`,
            [userId]
        );
        return res.json({ success: true, linked: false });
    } catch (err) {
        next(err);
    }
});

export default router;
