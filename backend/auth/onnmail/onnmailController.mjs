import dotenv from 'dotenv';
import { resolve } from 'path';
import { execFileSync } from 'child_process';
import bcrypt from 'bcryptjs';
import { query } from '../../database/config.mjs';
import { mailQuery } from '../../database/mailDatabase.config.mjs';
import {
    sendMailboxPasswordChangedEmail,
    sendMailboxDeletedEmail
} from '../../utils/mailer.mjs';

const { compare } = bcrypt;

const isProduction = process.env.NODE_ENV === 'production';
const envPath = isProduction
    ? '/etc/serpmonn/backend-dev.env'
    : resolve(process.cwd(), 'backend/.env');

dotenv.config({ path: envPath });

const MAIL_DOMAIN = 'onnmail.ru';
const LOCAL_PART_RE = /^[a-z0-9._%+-]+$/;

function clientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

async function getSerpmonnUser(req) {
    const { email, id: userId } = req.user || {};
    let rows = [];
    if (userId) {
        rows = await query(
            'SELECT id, email, confirmed, mailbox_created, mailbox_email, password_hash FROM users WHERE id = ? LIMIT 1',
            [userId]
        );
    }
    if ((!rows || rows.length === 0) && email) {
        rows = await query(
            'SELECT id, email, confirmed, mailbox_created, mailbox_email, password_hash FROM users WHERE email = ? LIMIT 1',
            [email]
        );
    }
    return rows?.[0] || null;
}

async function assertAccountPassword(user, accountPassword) {
    if (!user.password_hash) {
        // VK / Messenger accounts: session is enough
        return true;
    }
    if (!accountPassword || typeof accountPassword !== 'string') {
        return false;
    }
    return compare(accountPassword, user.password_hash);
}

function generateDovecotPassword(password) {
    try {
        const salt = execFileSync('openssl', ['rand', '-base64', '12'])
            .toString()
            .trim()
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 16);

        const hash = execFileSync('openssl', ['passwd', '-6', '-salt', salt, password])
            .toString()
            .trim();

        return `{SHA512-CRYPT}${hash}`;
    } catch (error) {
        console.error('❌ Ошибка генерации хеша, используем PLAIN:', error);
        return `{PLAIN}${password}`;
    }
}

function verifyDovecotPassword(storedHash, password) {
    try {
        execFileSync('doveadm', ['pw', '-t', storedHash, '-p', password], {
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 10000
        });
        return true;
    } catch {
        return false;
    }
}

async function updateMailPassword(fullEmail, newPassword) {
    const rows = await mailQuery('SELECT id, password FROM users WHERE email = ? LIMIT 1', [fullEmail]);
    if (!rows || rows.length === 0) {
        throw new Error('MAILBOX_NOT_FOUND');
    }
    const dovecotPassword = generateDovecotPassword(newPassword);
    await mailQuery('UPDATE users SET password = ? WHERE email = ?', [dovecotPassword, fullEmail]);
}

function localPartFromMailboxEmail(fullEmail) {
    if (typeof fullEmail !== 'string') return null;
    const at = fullEmail.lastIndexOf('@');
    if (at <= 0) return null;
    const local = fullEmail.slice(0, at).trim().toLowerCase();
    const domain = fullEmail.slice(at + 1).trim().toLowerCase();
    if (domain !== MAIL_DOMAIN || !LOCAL_PART_RE.test(local)) return null;
    return local;
}

async function destroyMailboxStorage(fullEmail) {
    const localPart = localPartFromMailboxEmail(fullEmail);
    if (!localPart) {
        throw new Error('INVALID_MAILBOX_EMAIL');
    }
    await mailQuery('DELETE FROM users WHERE email = ?', [fullEmail]);
    const mailDir = `/var/vmail/${MAIL_DOMAIN}/${localPart}`;
    try {
        execFileSync('rm', ['-rf', mailDir]);
    } catch (fsError) {
        console.warn('⚠️ Не удалось удалить директорию почты:', fsError);
    }
}

async function rollbackMailboxCreation(emailLocalPart) {
    const fullEmail = `${emailLocalPart}@${MAIL_DOMAIN}`;
    try {
        console.log('🔄 Откат изменений для:', fullEmail);
        await destroyMailboxStorage(fullEmail);
    } catch (error) {
        console.error('❌ Ошибка при откате изменений:', error);
        throw error;
    }
}

export const createMailbox = async (req, res) => {
    let emailLocalPart = null;

    try {
        const { username, emailLocalPart: localPart, password } = req.body;
        const user = await getSerpmonnUser(req);
        emailLocalPart = typeof localPart === 'string' ? localPart.trim().toLowerCase() : '';

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        if (!user.confirmed) {
            return res.status(403).json({ message: 'Подтвердите ваш аккаунт' });
        }
        if (user.mailbox_created) {
            return res.status(403).json({ message: 'Вы уже создали почтовый ящик' });
        }

        if (!username || !emailLocalPart || !password) {
            return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
        }
        if (!LOCAL_PART_RE.test(emailLocalPart)) {
            return res.status(400).json({
                message: 'Логин может содержать только латинские буквы, цифры и символы ._%+-'
            });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Пароль должен содержать минимум 8 символов' });
        }

        const fullEmail = `${emailLocalPart}@${MAIL_DOMAIN}`;
        console.log('📨 Создаваемый email:', fullEmail);

        const existingMailUser = await mailQuery('SELECT id FROM users WHERE email = ?', [fullEmail]);
        if (existingMailUser && existingMailUser.length > 0) {
            return res.status(400).json({ message: 'Почтовый ящик уже существует' });
        }

        const domainRows = await mailQuery('SELECT id FROM domains WHERE domain = ?', [MAIL_DOMAIN]);
        if (domainRows.length === 0) {
            throw new Error(`Домен ${MAIL_DOMAIN} не найден в БД mailserver`);
        }
        const domainId = domainRows[0].id;
        const dovecotPassword = generateDovecotPassword(password);

        await mailQuery(
            'INSERT INTO users (email, password, domain_id, home, uid, gid) VALUES (?, ?, ?, ?, ?, ?)',
            [
                fullEmail,
                dovecotPassword,
                domainId,
                `/var/vmail/${MAIL_DOMAIN}/${emailLocalPart}`,
                5000,
                5000
            ]
        );

        const mailDir = `/var/vmail/${MAIL_DOMAIN}/${emailLocalPart}/Maildir`;
        try {
            execFileSync('mkdir', ['-p', `${mailDir}/cur`, `${mailDir}/new`, `${mailDir}/tmp`]);
            execFileSync('chown', ['-R', 'vmail:vmail', `/var/vmail/${MAIL_DOMAIN}/${emailLocalPart}`]);
            execFileSync('chmod', ['-R', '700', `/var/vmail/${MAIL_DOMAIN}/${emailLocalPart}`]);
        } catch (fsError) {
            console.error('❌ Ошибка создания директорий:', fsError);
        }

        await query(
            'UPDATE users SET mailbox_created = 1, mailbox_email = ? WHERE id = ?',
            [fullEmail, user.id]
        );

        console.log(`🎉 Почтовый ящик ${fullEmail} успешно создан!`);

        res.status(201).json({
            success: true,
            email: fullEmail,
            message: 'Почтовый ящик успешно создан'
        });
    } catch (error) {
        console.error('💥 Ошибка создания почтового ящика:', error);

        if (emailLocalPart) {
            try {
                await rollbackMailboxCreation(emailLocalPart);
            } catch (rollbackError) {
                console.error('❌ Ошибка при откате изменений:', rollbackError);
            }
        }

        let errorMessage = 'Ошибка при создании почтового ящика';
        if (error.message?.includes('Duplicate entry') || error.message?.includes('уже существует')) {
            errorMessage = 'Почтовый ящик уже существует';
        } else if (error.message?.includes('ER_NO_SUCH_TABLE')) {
            errorMessage = 'Ошибка базы данных: таблица не найдена';
        } else if (error.message?.includes('ER_ACCESS_DENIED_ERROR')) {
            errorMessage = 'Ошибка доступа к базе данных';
        } else if (error.message) {
            errorMessage += `: ${error.message}`;
        }

        res.status(400).json({
            success: false,
            message: errorMessage
        });
    }
};

/** Change @onnmail password while logged into Serpmonn. */
export const changeMailboxPassword = async (req, res) => {
    try {
        const { accountPassword, newPassword, newPasswordConfirm } = req.body || {};
        const user = await getSerpmonnUser(req);

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        if (!user.mailbox_created || !user.mailbox_email) {
            return res.status(400).json({
                message: 'Сначала создайте или привяжите почтовый ящик @onnmail.ru'
            });
        }
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: 'Пароль должен содержать минимум 8 символов' });
        }
        if (newPasswordConfirm != null && newPassword !== newPasswordConfirm) {
            return res.status(400).json({ message: 'Пароли не совпадают' });
        }

        const accountOk = await assertAccountPassword(user, accountPassword);
        if (!accountOk) {
            return res.status(403).json({ message: 'Неверный пароль аккаунта Serpmonn' });
        }

        try {
            await updateMailPassword(user.mailbox_email, newPassword);
        } catch (err) {
            if (err.message === 'MAILBOX_NOT_FOUND') {
                return res.status(404).json({ message: 'Почтовый ящик не найден на сервере' });
            }
            throw err;
        }

        try {
            await sendMailboxPasswordChangedEmail(user.email, {
                mailboxEmail: user.mailbox_email,
                ip: clientIp(req),
                when: new Date().toISOString()
            });
        } catch (mailErr) {
            console.error('Mailbox password changed, but notify email failed:', mailErr);
        }

        return res.status(200).json({
            success: true,
            message: 'Пароль почты обновлён',
            email: user.mailbox_email
        });
    } catch (error) {
        console.error('💥 Ошибка смены пароля почты:', error);
        return res.status(500).json({ message: 'Ошибка сервера при смене пароля почты' });
    }
};

/**
 * Link existing mailbox for legacy users (mailbox_created=1, mailbox_email NULL).
 * Requires current mailbox password to prove ownership.
 */
export const linkMailbox = async (req, res) => {
    try {
        const { emailLocalPart, mailboxPassword, accountPassword } = req.body || {};
        const user = await getSerpmonnUser(req);

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        if (!user.mailbox_created) {
            return res.status(400).json({ message: 'У вас ещё нет почтового ящика' });
        }
        if (user.mailbox_email) {
            return res.status(400).json({ message: 'Почтовый ящик уже привязан', email: user.mailbox_email });
        }

        const localPart = typeof emailLocalPart === 'string' ? emailLocalPart.trim().toLowerCase() : '';
        if (!LOCAL_PART_RE.test(localPart) || !mailboxPassword) {
            return res.status(400).json({ message: 'Укажите логин ящика и текущий пароль почты' });
        }

        const accountOk = await assertAccountPassword(user, accountPassword);
        if (!accountOk) {
            return res.status(403).json({ message: 'Неверный пароль аккаунта Serpmonn' });
        }

        const fullEmail = `${localPart}@${MAIL_DOMAIN}`;
        const rows = await mailQuery('SELECT id, password FROM users WHERE email = ? LIMIT 1', [fullEmail]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Почтовый ящик не найден' });
        }
        if (!verifyDovecotPassword(rows[0].password, mailboxPassword)) {
            return res.status(403).json({ message: 'Неверный пароль почтового ящика' });
        }

        const taken = await query(
            'SELECT id FROM users WHERE mailbox_email = ? AND id != ? LIMIT 1',
            [fullEmail, user.id]
        );
        if (taken && taken.length > 0) {
            return res.status(409).json({ message: 'Этот ящик уже привязан к другому аккаунту' });
        }

        await query('UPDATE users SET mailbox_email = ? WHERE id = ?', [fullEmail, user.id]);

        return res.status(200).json({
            success: true,
            email: fullEmail,
            message: 'Почтовый ящик привязан'
        });
    } catch (error) {
        console.error('💥 Ошибка привязки почты:', error);
        return res.status(500).json({ message: 'Ошибка сервера при привязке почты' });
    }
};

/**
 * Permanently delete the linked @onnmail.ru mailbox and free the address.
 * Requires Serpmonn account password + exact confirmEmail match.
 */
export const deleteMailbox = async (req, res) => {
    try {
        const { accountPassword, confirmEmail } = req.body || {};
        const user = await getSerpmonnUser(req);

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        if (!user.mailbox_created || !user.mailbox_email) {
            return res.status(400).json({
                message: 'Нет привязанного почтового ящика для удаления'
            });
        }

        const expected = String(user.mailbox_email).trim().toLowerCase();
        const confirmed = typeof confirmEmail === 'string' ? confirmEmail.trim().toLowerCase() : '';
        if (!confirmed || confirmed !== expected) {
            return res.status(400).json({
                message: 'Введите полный адрес ящика для подтверждения удаления'
            });
        }

        const accountOk = await assertAccountPassword(user, accountPassword);
        if (!accountOk) {
            return res.status(403).json({ message: 'Неверный пароль аккаунта Serpmonn' });
        }

        const deletedEmail = user.mailbox_email;
        try {
            await destroyMailboxStorage(deletedEmail);
        } catch (err) {
            if (err.message === 'INVALID_MAILBOX_EMAIL') {
                return res.status(400).json({ message: 'Некорректный адрес почтового ящика' });
            }
            throw err;
        }

        await query(
            'UPDATE users SET mailbox_created = 0, mailbox_email = NULL WHERE id = ?',
            [user.id]
        );

        try {
            await sendMailboxDeletedEmail(user.email, {
                mailboxEmail: deletedEmail,
                ip: clientIp(req),
                when: new Date().toISOString()
            });
        } catch (mailErr) {
            console.error('Mailbox deleted, but notify email failed:', mailErr);
        }

        console.log(`🗑️ Mailbox deleted for user ${user.id}: ${deletedEmail}`);

        return res.status(200).json({
            success: true,
            message: 'Почтовый ящик удалён',
            email: deletedEmail
        });
    } catch (error) {
        console.error('💥 Ошибка удаления почты:', error);
        return res.status(500).json({ message: 'Ошибка сервера при удалении почтового ящика' });
    }
};

export default { createMailbox, changeMailboxPassword, linkMailbox, deleteMailbox };
