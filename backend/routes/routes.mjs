import vkidRoutes from '../vkid/vkidRoutes.mjs';                                                                                 // Импорт маршрутов авторизации ВК
import authRoutes from '../auth/authRoutes.mjs';                                                                                 // Импорт маршрутов аутентификации и авторизации
import yookassaRouter from '../yookassa/yookassaRoutes.mjs';                                                                     // Импорт маршрутов YooKassa
import profilesRoutes from '../profiles/profilesRoutes.mjs';                                                                     // Импорт маршрутов профилей пользователей
import counterRoutes from '../Counter/CounterRoutes.mjs';                                                                        // Импорт маршрутов счетчиков и статистики
import subscribeRouter from '../subscriber/subscribeRoutes.mjs';                                                                 // Импорт маршрутов подписки и рассылок
import unsubscribeRouter from '../subscriber/unsubscribeRouter.mjs';                                                             // Импорт маршрутов отписки от рассылки промокодов
import subscribersCountRouter from '../subscriber/subscribersCountRoutes.mjs';                                                   // Импорт маршрутов количества подписчиков
import { analyticsRouter } from '../analyticsRouter.mjs';                                                                        // Аналитика (stub в CI, если backend/analytics в .gitignore)
import promocodesRoutes from '../promocodes/promocodesRoutes.mjs';                                                               // Импорт маршрутов промокодов и акций
import improveRoutes from '../improve/improve.mjs';                                                                              // Импорт маршрута предложки
import pointsRoutes from '../points/pointsRoutes.mjs';                                                                           // Импорт маршрута баллов
import withdrawalRoutes from '../points/withdrawalRoutes.mjs';                                                                   // Импорт маршрута обмена баллов на Pro
import verifyToken from '../auth/verifyToken.mjs';                                                                               // Импорт маршрута верификации токена
import voiceRoutes from '../voice/voiceRoutes.mjs';                                                                              // Импорт маршрутов голосового ввода
import aiSearchRouter from '../ai-search/ai-search.mjs';                                                                         // Импорт маршрута AI-поиска через SearxNG
import i18nRoute from './i18n-route.mjs';                                                                                        // Импорт маршрута переводов для бэка
import { outRoutes } from '../games/outRoutes.mjs';                                                                              // Импорт маршрута партнёрских редиректов /out
import agentsRouter from '../agents/agents.routes.mjs';                                                                          // Импорт маршрутов агентов
import subscriptionsRouter from '../agents/subscriptions.routes.mjs';                                                            // Импорт маршрутов подписок на агентов
import logsRouter from '../agents/logs.routes.mjs';                                                                              // Импорт маршрутов логов агентов
import gatewayRouter from '../gateway/gateway.routes.mjs';                                                                       // Импорт гетвей роутера агентов
import cors from 'cors';                                                                                                         // Импорт cors для открытого доступа к gateway
import newsRoutes from '../news/newsRoutes.mjs';                                                                                 // Импорт маршрутов новостей
import findingsRoutes from '../findings/findings.routes.mjs';                                                                   // Находки AI-поиска
import dmRoutes from '../dm/dm.routes.mjs';                                                                                     // Личные сообщения

export function connectRoutes(app, authLimiter) {                                                                                // Функция централизованного подключения всех маршрутов приложения
    app.use(yookassaRouter);                                                                                                     // Подключаем маршруты платёжной системы YooKassa

    app.use('/auth', authLimiter);                                                                                               // Применяем более строгий лимит к маршрутам аутентификации
    app.use('/auth', authRoutes);                                                                                               // Подключаем маршруты аутентификации с префиксом /auth
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
    app.use('/api', findingsRoutes);                                                                                             // Находки: публичный GET + auth на отдельных роутах
    app.use('/api', dmRoutes);                                                                                                   // Личные сообщения (DM)
    app.use('/api', (req, res, next) => {                                                                                        // verifyToken — пропускаем /api/admin (обрабатывается admin-server)
        if (req.path.startsWith('/admin')) return next('route');
        // Agents: marketplace / webhook / inbound event / agent log — не cookie-сессия
        if (
            req.path === '/agents/marketplace' ||
            req.path === '/agents/event' ||
            req.path === '/agents/subscription-webhook' ||
            /^\/agents\/[^/]+\/log$/.test(req.path)
        ) {
            return next();
        }
        return verifyToken(req, res, next);
    });
    app.use('/api', pointsRoutes);                                                                                               // Подключаем маршрут проверки баллов
    app.use('/api', withdrawalRoutes);                                                                                           // Подключаем маршрут обмена баллов на Pro
    app.use('/api/agents', agentsRouter);                                                                                        // Подключаем маршруты агентов
    app.use('/api/agents', subscriptionsRouter);                                                                                 // Подключаем маршруты подписок на агентов
    app.use('/api/agents', logsRouter);                                                                                          // Подключаем маршруты логов агентов
    // Gateway открыт для внешних клиентов, авторизация через Bearer-токен — cookies не используются, origin: '*' безопасен.
    // codeql[js/cors-permissive-configuration]
    app.use('/gateway', cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Authorization', 'Content-Type', 'X-Buyer-Token'] })); // Gateway открыт для внешних клиентов — авторизация через токен
    app.use('/gateway', gatewayRouter);                                                                                          // Подключаем гетвей прокси агентов
    app.use('/', newsRoutes);                                                                                                    // Подключаем маршруты новостей (GET /news, GET /news/topics, POST /news/refresh)
    app.use('/', aiSearchRouter);                                                                                                // Подключаем маршрут AI-поиска через SearxNG
    app.use('/', i18nRoute);                                                                                                     // Подключаем маршрут переводов
    outRoutes(app);                                                                                                              // Подключаем партнёрские редиректы /out
}
