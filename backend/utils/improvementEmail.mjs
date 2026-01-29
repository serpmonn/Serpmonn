import { transporter } from './mailer.mjs';

// Маппинг категорий на русские названия
const categoryMap = {
  functionality: 'Функциональность',
  design: 'Дизайн',
  performance: 'Производительность',
  content: 'Контент',
  bug: 'Ошибка',
  other: 'Другое'
};

// Маппинг приоритетов
const priorityMap = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический'
};

export async function sendImprovementEmail(data) {
  const {
    name = 'Не указано',
    email = 'Не указан',
    category = 'other',
    title,
    description,
    priority = 'medium',
    language = 'ru',
    page = 'improve'
  } = data;

  console.log(`📝 Предложение улучшения от: ${name} <${email}>`);
  console.log(`   Категория: ${categoryMap[category] || category}`);
  console.log(`   Приоритет: ${priorityMap[priority] || priority}`);
  console.log(`   Заголовок: ${title}`);

  const mailOptions = {
    from: '"Serpmonn Suggestions" <noreply@serpmonn.ru>',
    to: 'improve@serpmonn.ru',
    cc: process.env.IMPROVE_CC ? process.env.IMPROVE_CC.split(',') : [],
    subject: `🎯 [Предложение] ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`,
    text: `
Новое предложение для улучшения Serpmonn

📋 Основная информация:
• Имя: ${name}
• Email: ${email}
• Категория: ${categoryMap[category] || category}
• Приоритет: ${priorityMap[priority] || priority}
• Язык интерфейса: ${language.toUpperCase()}
• Страница: ${page}

📝 Заголовок:
${title}

📄 Описание:
${description}

⏰ Время отправки: ${new Date().toLocaleString('ru-RU')}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ED1C24; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .info-block { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #ED1C24; }
        .label { font-weight: bold; color: #555; }
        .priority-${priority} { 
            display: inline-block; 
            padding: 3px 10px; 
            border-radius: 12px; 
            font-size: 12px; 
            font-weight: bold; 
            margin-left: 10px; 
        }
        .priority-high { background: #ffebee; color: #c62828; }
        .priority-critical { background: #f44336; color: white; }
        .priority-medium { background: #fff3e0; color: #ef6c00; }
        .priority-low { background: #e8f5e9; color: #2e7d32; }
        .footer { 
            margin-top: 20px; 
            padding-top: 15px; 
            border-top: 1px solid #eee; 
            color: #777; 
            font-size: 12px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">🎯 Новое предложение для улучшения Serpmonn</h2>
        </div>
        
        <div class="content">
            <div class="info-block">
                <div><span class="label">👤 Имя:</span> ${name}</div>
                <div><span class="label">📧 Email:</span> ${email}</div>
                <div><span class="label">🏷️ Категория:</span> ${categoryMap[category] || category}</div>
                <div><span class="label">⚡ Приоритет:</span> 
                    ${priorityMap[priority] || priority}
                    <span class="priority-${priority}">${priority.toUpperCase()}</span>
                </div>
                <div><span class="label">🌐 Язык:</span> ${language.toUpperCase()}</div>
                <div><span class="label">📄 Страница:</span> ${page}</div>
            </div>
            
            <div class="info-block">
                <div><span class="label">📝 Заголовок:</span></div>
                <h3 style="margin-top: 5px; color: #ED1C24;">${title}</h3>
            </div>
            
            <div class="info-block">
                <div><span class="label">📄 Описание:</span></div>
                <div style="white-space: pre-wrap; background: white; padding: 10px; border-radius: 4px; margin-top: 10px;">
                    ${description.replace(/\n/g, '<br>')}
                </div>
            </div>
            
            <div class="footer">
                <p>⏰ Время отправки: ${new Date().toLocaleString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
                <p>📨 Отправлено через форму улучшений Serpmonn</p>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim()
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Письмо отправлено, ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Ошибка отправки письма:', error.message);
    throw error;
  }
}