import crypto from 'crypto';
import { createHash } from 'crypto';

/** SPKI DER prefix for a raw 32-byte Ed25519 public key. */
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export const WEB_LOGIN_HOST = 'serpmonn.ru';
export const WEB_LOGIN_API_BASE = 'https://serpmonn.ru';
export const CHALLENGE_TTL_MS = 3 * 60 * 1000;
export const EXCHANGE_TTL_MS = 2 * 60 * 1000;

export function deriveMessengerUserId(signPubHex) {
    const pub = Buffer.from(String(signPubHex).trim().toLowerCase(), 'hex');
    if (pub.length !== 32) {
        throw new Error('signPub must be 32 bytes');
    }
    return createHash('sha256').update(pub).digest('hex').slice(0, 32);
}

export function buildCanonicalString({ challengeId, nonce, host, exp }) {
    return `serpmonn-web-login|v1|${host}|${challengeId}|${nonce}|${exp}`;
}

export function verifyEd25519Detached({ message, signatureHex, signPubHex }) {
    const msg = Buffer.from(message, 'utf8');
    const signature = Buffer.from(String(signatureHex).trim().toLowerCase(), 'hex');
    const rawPub = Buffer.from(String(signPubHex).trim().toLowerCase(), 'hex');

    if (rawPub.length !== 32) return false;
    if (signature.length !== 64) return false;

    const keyObject = crypto.createPublicKey({
        key: Buffer.concat([ED25519_SPKI_PREFIX, rawPub]),
        format: 'der',
        type: 'spki'
    });

    return crypto.verify(null, msg, keyObject, signature);
}

export function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

export function randomShortCode(length = 4) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < length; i++) {
        // crypto.randomInt is unbiased (no modulo bias on CSPRNG bytes).
        out += alphabet[crypto.randomInt(alphabet.length)];
    }
    return out;
}

/** Format for MySQL DATETIME in the process local timezone (matches mysql2 + session NOW()). */
export function toMysqlDateTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
