import vkidRoutes from '../vkid/vkidRoutes.mjs';                                                                                 // Импорт маршрутов авторизации ВК
import authRoutes from '../auth/authRoutes.mjs';                                                                                 // Импорт маршрутов аутентификации и авторизации
import yookassaRouter from '../yookassa/yookassaRoutes.mjs';                                                                     // Импорт маршрутов YooKassa
import profilesRoutes from '../profiles/profilesRoutes.mjs';                                                                     // Импорт маршрутов профилей пользователей
import counterRoutes from '../Counter/CounterRoutes.mjs';                                                                        // Импорт маршрутов счетчиков и статистики
import subscribeRouter from '../subscriber/subscribeRoutes.mjs';                                                                 // Импорт маршрутов подписки и рассылок
import unsubscribeRouter from '../subscriber/unsubscribeRouter.mjs';                                                             // Импорт маршрутов отписки от рассылки промокодов
import subscribersCountRouter from '../subscriber/subscribersCountRoutes.mjs';                                                   // Импорт маршрутов количества подписчиков
import { analyticsRouter } from '../analytics/analytics.mjs';                                                                    // Импорт маршрутов аналитики страницы промокодов
import promocodesRoutes from '../promocodes/promocodesRoutes.mjs';                                                               // Импорт маршрутов промокодов и акций
import improveRoutes from '../improve/improve.mjs';                                                                              // Импорт маршрута предложки
import pointsRoutes from '../points/pointsRoutes.mjs';                                                                           // Импорт маршрута баллов
import withdrawalRoutes from '../points/withdrawalRoutes.mjs';                                                                   // Импорт маршрута обмена баллов на Pro
import verifyToken from '../auth/verifyToken.mjs';                                                                               // Импорт маршрута верификации токена
import voiceRoutes from '../voice/voiceRoutes.mjs';                                                                              // Импорт маршрутов голосового ввода
import aiSearchRouter from '../ai-search/ai-search.mjs';                                                                         // Импорт маршрута AI-поиска через SearxNG
import i18nRoute from './i18n-route.mjs';                                                                                        // Импорт маршрута переводов для бэка
import adminRoutes from '../admin/adminRoutes.mjs';                                                                              // Импорт маршрутов админ-панели

export function connectRoutes(app, authLimiter) {                                                                                // Функция централизованного подключения всех маршрутов приложения
    app.use(yookassaRouter);                                                                                                     // Подключаем маршруты платежной системы YooKassa

    app.use('/auth', authLimiter);                                                                                               // Применяем более строгий лимит к маршрутам аутентификации
    app.use('/auth', authRoutes);                                                                                                // Подключаем маршруты аутентификации с префиксом /auth
    app.use('/profile', profilesRoutes);                                                                                         // Подключаем маршруты профилей с префиксом /profile
    app.use('/counter', counterRoutes);                                                                                          // Подключаем маршруты счетчиков с префиксом /counter
    app.use('/api', analyticsRouter);                                                                                            // Подключаем маршруты аналитики страницы промокодов
    app.use('/promocodes', promocodesRoutes);                                                                                    // Подключаем маршруты промокодов с префиксом /promocodes
    app.use('/api/promocodes', promocodesRoutes);                                                                                // Дублируем маршруты промокодов под /api/promocodes для фронтенда
    app.use(subscribeRouter);                                                                                                    // Подключаем маршруты подписки без дополнительного префикса
    app.use('/', unsubscribeRouter);                                                                                             // Подключаем маршруты отписки от рассылки промокодов
    app.use('/api', subscribersCountRouter);                                                                                     // Подключаем маршрут количества подписчиков на промокоды
    app.use('/improve', improveRoutes);                                                                                          // Подключаем маршрут предложки
    app.use('/api', vkidRoutes);                                                                                                 // Подключаем маршрут авторизации VK ID
    app.use('/voice', voiceRoutes);                                                                                              // Подключаем маршруты голосового ввода (STT/TTS)
    app.use('/api', verifyToken);                                                                                                // Подключаем маршрут верификации токена и установки req.user
    app.use('/api', pointsRoutes);                                                                                               // Подключаем маршрут проверки баллов
    app.use('/api', withdrawalRoutes);                                                                                           // Подключаем маршрут обмена баллов на Pro
    app.use('/', aiSearchRouter);                                                                                                // Подключаем маршрут AI-поиска через SearxNG
    app.use('/', i18nRoute);                                                                                                     // Подключаем маршрут переводов
    app.use('/api/admin', adminRoutes);                                                                                          // Подключаем маршруты админ-панели
}