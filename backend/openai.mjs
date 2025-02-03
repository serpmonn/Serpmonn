import express from 'express';
import axios from 'axios';

import dotenv from 'dotenv';
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });                                           // Загружаем переменные из .env

const app = express();
const port = 3500;

const HF_TOKEN = process.env.HF_TOKEN;                                                          // Используем токен из .env

app.use(express.json());                                                                        // Middleware для обработки JSON

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
        },
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
