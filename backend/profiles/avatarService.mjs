import fs from 'fs/promises';
import path from 'path';

const AVATARS_DIR = '/var/www/serpmonn.ru/uploads/avatars';
const AVATAR_SIZE = 256;
const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

let sharpModule = null;

async function getSharp() {
    if (!sharpModule) {
        const mod = await import('sharp');
        sharpModule = mod.default;
    }
    return sharpModule;
}

export function isAllowedAvatarMime(mime) {
    return ALLOWED_MIME.has(mime);
}

export function getMaxAvatarBytes() {
    return MAX_BYTES;
}

export async function ensureAvatarsDir() {
    await fs.mkdir(AVATARS_DIR, { recursive: true });
}

export function getAvatarFilePath(userId) {
    return path.join(AVATARS_DIR, `${userId}.webp`);
}

export function buildAvatarUrl(userId, updatedAt) {
    if (!updatedAt) return null;
    const version = updatedAt instanceof Date
        ? updatedAt.getTime()
        : new Date(updatedAt).getTime();
    return `/uploads/avatars/${userId}.webp?v=${version}`;
}

export async function processAndSaveAvatar(userId, buffer) {
    const sharp = await getSharp();
    const processed = await sharp(buffer)
        .rotate()
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .toBuffer();

    await ensureAvatarsDir();
    await fs.writeFile(getAvatarFilePath(userId), processed);
}

export async function deleteAvatarFile(userId) {
    try {
        await fs.unlink(getAvatarFilePath(userId));
    } catch (err) {
        if (err?.code !== 'ENOENT') throw err;
    }
}
