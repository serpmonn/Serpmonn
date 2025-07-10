import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

const transporter = nodemailer.createTransport({
    host: 'mail.serpmonn.ru',
    port: 587,
    secure: false,
    auth: {
        user: 'support@serpmonn.ru',
        pass: process.env.SMTP_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

// Проверяем соединение с SMTP-сервером при старте
transporter.verify((error, success) => {
    if (error) {
        console.error('Ошибка подключения к SMTP-серверу:', error);
    } else {
        console.log('SMTP-сервер готов к отправке сообщений');
    }
});

export async function sendResetEmail(to, resetLink) {
    try {
        const info = await transporter.sendMail({
            from: '"Serpmonn" <support@serpmonn.ru>',
            to,
            subject: 'Восстановление доступа',
            html: `
                <h2>Сброс пароля</h2>
                <p>Для сброса пароля нажмите на кнопку ниже:</p>
                <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#ff1717;color:white;text-decoration:none;border-radius:5px;font-weight:bold;">Сбросить пароль</a>
                <p>Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
            `
        });
        console.log(`Письмо отправлено на ${to}: ${info.messageId}`);
    } catch (error) {
        console.error('Ошибка при отправке письма:', error);
        throw error;
    }
}

export async function sendConfirmationEmail(to, confirmLink) {
    try {
        const info = await transporter.sendMail({
            from: '"Serpmonn" <support@serpmonn.ru>',
            to,
            subject: 'Подтверждение регистрации на Serpmonn.ru',
            html: `
                <h2>Подтверждение регистрации</h2>
                <p>Для завершения регистрации нажмите на кнопку ниже:</p>
                <a href="${confirmLink}" style="display:inline-block;padding:10px 20px;background:#ff1717;color:white;text-decoration:none;border-radius:5px;font-weight:bold;">Подтвердить email</a>
                <p>Если вы не регистрировались, проигнорируйте это письмо.</p>
            `
        });
        console.log(`Письмо подтверждения отправлено на ${to}: ${info.messageId}`);
    } catch (error) {
        console.error('Ошибка при отправке письма подтверждения:', error);
        throw error;
    }
}