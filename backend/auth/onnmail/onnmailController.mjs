import dotenv from 'dotenv';
import { resolve } from 'path';
import { execFileSync } from 'child_process';
import { query } from '../../database/config.mjs';
import { mailQuery } from '../../database/mailDatabase.config.mjs';

const isProduction = process.env.NODE_ENV === 'production';
const envPath = isProduction
    ? '/var/www/serpmonn.ru/backend/.env'
    : resolve(process.cwd(), 'backend/.env');

dotenv.config({ path: envPath });

export const createMailbox = async (req, res) => {
    let emailLocalPart = null;

    try {
        const { username, emailLocalPart: localPart, password } = req.body;
        const userEmail = req.user.email;
        emailLocalPart = localPart;

        console.log('🔍 Создание почтового ящика для:', userEmail);

        const [user] = await query('SELECT confirmed, mailbox_created FROM users WHERE email = ?', [userEmail]);

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        if (!user.confirmed) {
            return res.status(403).json({ message: 'Подтвердите ваш аккаунт' });
        }
        if (user.mailbox_created) {
            return res.status(403).json({ message: 'Вы уже создали почтовый ящик' });
        }

        if (!username || !localPart || !password) {
            return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
        }
        if (!/^[a-z0-9._%+-]+$/.test(localPart)) {
            return res.status(400).json({ message: 'Логин может содержать только латинские буквы, цифры и символы ._%+-' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Пароль должен содержать минимум 8 символов' });
        }

        const domain = 'onnmail.ru';
        const fullEmail = `${localPart}@${domain}`;

        console.log('📨 Создаваемый email:', fullEmail);

        const existingMailUser = await mailQuery('SELECT id FROM users WHERE email = ?', [fullEmail]);
        if (existingMailUser && existingMailUser.length > 0) {
            return res.status(400).json({ message: 'Почтовый ящик уже существует' });
        }

        const domainRows = await mailQuery('SELECT id FROM domains WHERE domain = ?', [domain]);
        if (domainRows.length === 0) {
            throw new Error(`Домен ${domain} не найден в БД mailserver`);
        }
        const domainId = domainRows[0].id;

        const dovecotPassword = await generateDovecotPassword(password);

        await mailQuery(
            'INSERT INTO users (email, password, domain_id, home, uid, gid) VALUES (?, ?, ?, ?, ?, ?)',
            [
                fullEmail,
                dovecotPassword,
                domainId,
                `/var/vmail/${domain}/${localPart}`,
                5000,
                5000
            ]
        );

        const mailDir = `/var/vmail/${domain}/${localPart}/Maildir`;
        try {
            execFileSync('mkdir', ['-p', `${mailDir}/cur`, `${mailDir}/new`, `${mailDir}/tmp`]);
            execFileSync('chown', ['-R', 'vmail:vmail', `/var/vmail/${domain}/${localPart}`]);
            execFileSync('chmod', ['-R', '700', `/var/vmail/${domain}/${localPart}`]);
        } catch (fsError) {
            console.error('❌ Ошибка создания директорий:', fsError);
        }

        await query('UPDATE users SET mailbox_created = ? WHERE email = ?', [1, userEmail]);

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
        if (error.message.includes('Duplicate entry') || error.message.includes('уже существует')) {
            errorMessage = 'Почтовый ящик уже существует';
        } else if (error.message.includes('ER_NO_SUCH_TABLE')) {
            errorMessage = 'Ошибка базы данных: таблица не найдена';
        } else if (error.message.includes('ER_ACCESS_DENIED_ERROR')) {
            errorMessage = 'Ошибка доступа к базе данных';
        } else {
            errorMessage += ': ' + error.message;
        }

        res.status(400).json({
            success: false,
            message: errorMessage
        });
    }
};

async function generateDovecotPassword(password) {
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

async function rollbackMailboxCreation(emailLocalPart) {
    const domain = 'onnmail.ru';
    const fullEmail = `${emailLocalPart}@${domain}`;

    try {
        console.log('🔄 Откат изменений для:', fullEmail);

        await mailQuery('DELETE FROM users WHERE email = ?', [fullEmail]);

        const mailDir = `/var/vmail/${domain}/${emailLocalPart}`;
        try {
            execFileSync('rm', ['-rf', mailDir]);
        } catch (fsError) {
            console.warn('⚠️ Не удалось удалить директорию:', fsError);
        }

    } catch (error) {
        console.error('❌ Ошибка при откате изменений:', error);
        throw error;
    }
}

export default { createMailbox };
