import nodemailer from 'nodemailer';
import dotenv from 'dotenv';                                                                                                     // Импортируем dotenv для работы с переменными окружения
import { resolve } from 'path';                                                                                                  // Импортируем resolve для создания абсолютных путей

const isProduction = process.env.NODE_ENV === 'production';                                                                      // Определяем режим работы: production или development
const envPath = isProduction                                                                                                     // Выбираем путь к .env файлу в зависимости от окружения
    ? '/var/www/serpmonn.ru/.env'                                                                                                // Продакшен путь на сервере
    : resolve(process.cwd(), 'backend/.env');                                                                                    // Разработка - абсолютный путь к .env в папке backend

dotenv.config({ path: envPath });                                                                                                // Загружаем переменные окружения из выбранного пути

// В разработке используем тестовый транспортер
const createTransporter = () => {
  if (process.env.NODE_ENV === 'development' || !process.env.SMTP_PASS) {
    console.log('📧 DEVELOPMENT MODE: Emails are logged to console instead of sending');
    
    // Тестовый транспортер который логирует вместо отправки
    return {
      sendMail: (mailOptions) => {
        console.log('════════════════════════════════════════');
        console.log('📧 DEVELOPMENT EMAIL (NOT SENT):');
        console.log('   To:', mailOptions.to);
        console.log('   Subject:', mailOptions.subject);
        console.log('   Text:', mailOptions.text?.substring(0, 200) + '...');
        console.log('   HTML:', mailOptions.html ? '📄 [HTML content]' : '❌ No HTML');
        console.log('════════════════════════════════════════');
        
        // Имитируем успешную отправку
        return Promise.resolve({ 
          messageId: 'dev-' + Date.now(),
          response: '250 Email logged in development mode'
        });
      },
      verify: (callback) => {
        console.log('✅ SMTP verification skipped in development');
        callback(null, true);
      }
    };
  }
  
  // Продакшен - реальный SMTP
  console.log('📧 PRODUCTION MODE: Using real SMTP server');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || '90.156.150.124',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'support@serpmonn.ru',
      pass: process.env.SMTP_PASS
    },
    // Таймауты для избежания долгого ожидания
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
};

export const transporter = createTransporter();

// Функции для отправки писем
export async function sendResetEmail(to, resetLink) {
  console.log(`🔐 Password reset for: ${to}`);
  console.log(`   Reset link: ${resetLink}`);
  
  const mailOptions = {
    from: '"Serpmonn" <support@serpmonn.ru>',
    to: to,
    subject: 'Сброс пароля Serpmonn',
    text: `Для сброса пароля перейдите по ссылке: ${resetLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007acc;">Сброс пароля Serpmonn</h2>
        <p>Для сброса пароля перейдите по ссылке:</p>
        <a href="${resetLink}" style="background: #007acc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Сбросить пароль
        </a>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email processed:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    // В разработке не падаем, а логируем ошибку
    if (process.env.NODE_ENV === 'development') {
      return { messageId: 'dev-error', response: 'Email failed but continuing in dev mode' };
    }
    throw error;
  }
}

export async function sendConfirmationEmail(to, confirmLink) {
  console.log(`✅ Email confirmation for: ${to}`);
  console.log(`   Confirm link: ${confirmLink}`);
  
  const mailOptions = {
    from: '"Serpmonn" <support@serpmonn.ru>',
    to: to,
    subject: 'Подтверждение email Serpmonn',
    text: `Для подтверждения email перейдите по ссылке: ${confirmLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007acc;">Подтверждение email</h2>
        <p>Для завершения регистрации подтвердите ваш email:</p>
        <a href="${confirmLink}" style="background: #007acc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Подтвердить email
        </a>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          Ссылка действительна 24 часа.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Confirmation email processed:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      return { messageId: 'dev-error', response: 'Email failed but continuing in dev mode' };
    }
    throw error;
  }
}