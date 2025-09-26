import express from 'express';
import axios from 'axios';

import { getRequiredEnv } from './config/env.mjs';
                // Централизованная загрузка переменных
import compression from 'compression';
                // Сжатие ответов

const app = express();
const port = 3500;

const HF_TOKEN = getRequiredEnv('HF_TOKEN');                                                          // Используем токен из .env

app.use(compression({ threshold: '1kb' }));
app.use(express.json({ limit: '64kb' }));                                                                        // Middleware для обработки JSON

app.post('/openai', async (req, res) => {                                                       // Маршрут для получения данных с Hugging Face (используем модель BART)
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Поле 'question' обязательно" });
    }

    const response = await axios.post(                                                          // Отправка запроса в Hugging Face API с моделью BART
      'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
      { inputs: question },
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'User-Agent': 'Serpmonn-Backend/1.0',
        },
        timeout: 15000,
        maxContentLength: 5 * 1024 * 1024,
        maxBodyLength: 512 * 1024,
      }
    );
    console.log("Ответ от Hugging Face:", response.data);                                       // Выводим ответ от Hugging Face API

    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {        // Проверяем корректность ответа
      return res.status(500).json({ error: "Ошибка в ответе от Hugging Face" });
    }

    res.json({ answer: response.data[0].summary_text });                                        // Возвращаем ответ с Hugging Face на фронтенд
  } catch (error) {
    console.error("Ошибка Hugging Face API:", error.response?.data || error.message);
    res.status(500).json({ error: "Ошибка API Hugging Face" });
  }
});
app.listen(port, () => {                                                                        // Запуск сервера
  console.log(`Server running on http://localhost:${port}`);      
});
