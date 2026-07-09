import multer from 'multer';
import { query } from '../database/config.mjs';
import {
    buildAvatarUrl,
    deleteAvatarFile,
    getMaxAvatarBytes,
    isAllowedAvatarMime,
    processAndSaveAvatar
} from './avatarService.mjs';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: getMaxAvatarBytes(), files: 1 }
});

export const avatarUploadMiddleware = upload.single('avatar');

async function resolveUserId(req) {
    if (req.user?.id) return req.user.id;

    const rows = await query(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [req.user.email]
    );
    return rows?.[0]?.id || null;
}

export async function uploadAvatar(req, res) {
    try {
        const userId = await resolveUserId(req);
        if (!userId) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Файл не выбран' });
        }

        if (!isAllowedAvatarMime(req.file.mimetype)) {
            return res.status(400).json({ message: 'Допустимы только JPG, PNG и WebP' });
        }

        await processAndSaveAvatar(userId, req.file.buffer);
        await query(
            'UPDATE users SET avatar_updated_at = NOW() WHERE id = ?',
            [userId]
        );

        const rows = await query(
            'SELECT avatar_updated_at FROM users WHERE id = ? LIMIT 1',
            [userId]
        );
        const updatedAt = rows?.[0]?.avatar_updated_at;

        res.json({
            message: 'Аватар обновлён',
            avatar_url: buildAvatarUrl(userId, updatedAt)
        });
    } catch (err) {
        console.error('Ошибка загрузки аватара:', err);
        res.status(500).json({ message: 'Не удалось загрузить аватар' });
    }
}

export async function removeAvatar(req, res) {
    try {
        const userId = await resolveUserId(req);
        if (!userId) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        await deleteAvatarFile(userId);
        await query(
            'UPDATE users SET avatar_updated_at = NULL WHERE id = ?',
            [userId]
        );

        res.json({ message: 'Аватар удалён', avatar_url: null });
    } catch (err) {
        console.error('Ошибка удаления аватара:', err);
        res.status(500).json({ message: 'Не удалось удалить аватар' });
    }
}
