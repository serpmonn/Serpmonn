import dotenv from 'dotenv';
import crypto from 'crypto';
import https from 'node:https';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import rateLimit from 'express-rate-limit';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const app = express();

// Константы GigaChat
const GIGA_AUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
const GIGA_API_URL = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
const CLIENT_SECRET = process.env.GIGACHAT_CREDENTIALS;                                                                                                                                                                                       // Ваша строка авторизации
const SERPER_API_KEY = process.env.SERPER_API_KEY;
// Переменные для хранения токена
let accessToken = null;
let tokenExpiresAt = 0;

// ============================================================================
// ФУНКЦИЯ ПОЛУЧЕНИЯ ТОКЕНА
// ============================================================================
async function getGigaChatToken() {
  const now = Date.now();
  if (accessToken && now < tokenExpiresAt) return accessToken;

  console.log('🔑 Получение нового токена GigaChat...');
  
  const response = await fetch(GIGA_AUTH_URL, {
    method: 'POST',
    agent: httpsAgent,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Basic ${CLIENT_SECRET}`, 
      'RqUID': crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()                                                                                                                                                            // Защита от отсутствия метода
    },
    body: new URLSearchParams({ scope: 'GIGACHAT_API_PERS' })
  });

  if (!response.ok) {
    throw new Error(`Ошибка авторизации: ${response.statusText}`);
  }

  const data = await response.json();
  accessToken = data.access_token;

  // если значение похоже на секунды — умножаем
  if (data.expires_at < 10_000_000_000) {
    tokenExpiresAt = data.expires_at * 1000;
  } else {
    tokenExpiresAt = data.expires_at;
  }
  return accessToken;
}

// ============================================================================
// MIDDLEWARE (CORS & Rate Limit)
// ============================================================================
app.use(cors({
  origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru', 'http://localhost:3500'],
  credentials: true
}));
app.use(express.json());

const aiSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.ip
});

// ============================================================================
// МАРШРУТ ИИ-ПОИСКА
// ============================================================================
app.post('/ai-search', aiSearchLimiter, async (req, res) => {
  try {
    const query = (req.body.q || '').trim();
    if (!query) return res.status(400).json({ error: 'Запрос пуст' });

    console.log('🚀 Начинаю поиск через Serper:', query);

    // 1. ПОИСК В GOOGLE (Через Serper)
    const searchResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, gl: 'ru', hl: 'ru' })
    });

    const searchData = await searchResponse.json();
    
    // Собираем контекст из топ-4 результатов
    const webContext = searchData.organic
      ? searchData.organic.slice(0, 4).map(s => `Сайт: ${s.title}\nИнфо: ${s.snippet}`).join('\n\n')
      : "Актуальные данные не найдены.";

    console.log('DEBUG WebContext:', webContext);

    // Извлекаем чистые ссылки для фронтенда
    const sources = searchData.organic 
      ? searchData.organic.slice(0, 4).map(s => ({
          title: s.title,
          link: s.link
        }))
      : [];

    // 2. ЗАПРОС В GIGACHAT-2-MAX
    const token = await getGigaChatToken();
    const payload = {
      model: 'GigaChat-2-Max',
      messages: [
        {
          role: 'system',
          content: 'Ты — поисковый агент. Тебе ДАН ТЕКСТ из интернета. Твоя задача: вытащить из этого текста ответ на вопрос пользователя. Если в тексте есть цифры или факты — используй их.'
        },
        {
          role: 'user',
          content: `ДАННЫЕ ИЗ СЕТИ:\n${webContext}\n\nВОПРОС: ${query}`
        }
      ],
      temperature: 0
    };

    const gigaRes = await fetch(GIGA_API_URL, {
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await gigaRes.json();
    
    res.json({
      answer: data.choices[0].message.content,
      usedWebSearch: true,
      model: 'GigaChat-2-Max',
      sources: sources,                                                                                                                                                                                                                 // Массив с ссылками и заголовками
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Ошибка:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.AI_SEARCH_PORT || 3500;
app.listen(PORT, () => console.log(`🚀 GigaChat Search Server on port ${PORT}`));