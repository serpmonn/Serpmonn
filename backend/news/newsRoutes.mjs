import express from 'express';                                                                                                   // Импортируем Express для создания маршрутов
import { getNews } from './newsController.mjs';                                                                                  // Импортируем контроллер для получения новостей

const router = express.Router();                                                                                                 // Создаем экземпляр маршрутизатора Express

router.options('*', (req, res) => {                                                                                              // Определяем обработчик для OPTIONS-запросов
    res.setHeader('Access-Control-Allow-Origin', 'https://serpmonn.ru');                                                         // Устанавливаем разрешенный источник
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');                                            // Устанавливаем разрешенные методы
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');                                                // Устанавливаем разрешенные заголовки
    res.setHeader('Access-Control-Allow-Credentials', 'true');                                                                   // Разрешаем отправку cookies
    res.status(200).end();                                                                                                       // Завершаем запрос с кодом 200
});

router.get('/news', getNews);                                                                                                    // Определяем GET маршрут для получения новостей

export default router;                                                                                                           // Экспортируем маршрутизатор для использования в приложении