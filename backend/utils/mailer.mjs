import nodemailer from 'nodemailer';
import dotenv from 'dotenv';                                                                                                     // Импортируем dotenv для работы с переменными окружения
import { resolve } from 'path';                                                                                                  // Импортируем resolve для создания абсолютных путей

const isProduction = process.env.NODE_ENV === 'production';                                                                      // Определяем режим работы: production или development
const envPath = isProduction                                                                                                     // Выбираем путь к .env файлу в зависимости от окружения
    ? '/var/www/serpmonn.ru/backend/.env'                                                                                        // Продакшен путь на сервере
    : resolve(process.cwd(), 'backend/.env');                                                                                    // Разработка - абсолютный путь к .env в папке backend

dotenv.config({ path: envPath });                                                                                                // Загружаем переменные окружения из выбранного пути

const createTransporter = () => {												                                                                         // В разработке используем тестовый транспортер
  if (process.env.NODE_ENV === 'development' || !process.env.SMTP_PASS) {
    console.log('📧 DEVELOPMENT MODE: Emails are logged to console instead of sending');
    
    return {															                                                                                        // Тестовый транспортер который логирует вместо отправки
      sendMail: (mailOptions) => {
        console.log('════════════════════════════════════════');
        console.log('📧 DEVELOPMENT EMAIL (NOT SENT):');
        console.log('   To:', mailOptions.to);
        console.log('   Subject:', mailOptions.subject);
        console.log('   Text:', mailOptions.text?.substring(0, 200) + '...');
        console.log('   HTML:', mailOptions.html ? '📄 [HTML content]' : '❌ No HTML');
        console.log('════════════════════════════════════════');
        
        return Promise.resolve({												                                                                           // Имитируем успешную отправку 
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
  
  console.log('📧 PRODUCTION MODE: Using real SMTP server');									                                                     // Продакшен - реальный SMTP
  return nodemailer.createTransport({
    host: 'localhost',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'noreply@serpmonn.ru',
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false													                                                                            // для самоподписанных сертификатов
    },
    connectionTimeout: 10000,													                                                                              // Таймауты для избежания долгого ожидания
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
};

export const transporter = createTransporter();

export async function sendResetEmail(to, resetLink) {										                                                            // Функции для отправки писем
  console.log(`🔐 Password reset for: ${to}`);
  console.log(`   Reset link: ${resetLink}`);
  
  const mailOptions = {
    from: '"Serpmonn" <noreply@serpmonn.ru>',
    to: to,
    subject: 'Сброс пароля Serpmonn',
    text: `Для сброса пароля перейдите по ссылке: ${resetLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Сброс пароля Serpmonn</h2>
        <p>Для сброса пароля перейдите по ссылке:</p>
        <a href="${resetLink}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
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
    from: '"Serpmonn" <noreply@serpmonn.ru>',
    to: to,
    subject: 'Подтверждение email Serpmonn',
    text: `Для подтверждения email перейдите по ссылке: ${confirmLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Подтверждение email</h2>
        <p>Для завершения регистрации подтвердите ваш email:</p>
        <a href="${confirmLink}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
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

export async function sendPromoEmail(to, promoText, unsubscribeLink, promoHtmlBlock) {
  console.log(`🎁 Promo email for: ${to}`);

  const mailOptions = {
    from: '"Serpmonn" <noreply@serpmonn.ru>',
    to,
    subject: 'Промокоды от Serpmonn',
    text: `${promoText}\n\nЕсли вы больше не хотите получать такие письма, отпишитесь по ссылке: ${unsubscribeLink}`,
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 16px 0;">
                <tr>
                  <td style="width: 1%; padding-right: 8px; vertical-align: middle;">
                    <img
                      src="https://serpmonn.ru/frontend/images/Serpmonn-192x192.png"
                      alt="Serpmonn"
                      style="width: 40px; height: 40px; border-radius: 50%; display: block;"
                    />
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 18px; font-weight: bold; color: #dc3545;">
                      Промокоды от Serpmonn
                    </span>
                  </td>
                </tr>
              </table>

              ${promoHtmlBlock}

              <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />

              <p style="font-size: 12px; color: #777;">
                Если вы больше не хотите получать такие письма, вы можете
                <a href="${unsubscribeLink}" style="color: #dc3545;">отписаться от рассылки</a>.
              </p>
            </div>
          `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Promo email processed:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Promo email error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      return { messageId: 'dev-error', response: 'Promo email failed but continuing in dev mode' };
    }
    throw error;
  }
}