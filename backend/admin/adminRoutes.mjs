import { Router } from 'express';
import verifyAdmin from './verifyAdmin.mjs';
import {
  loginAdmin,
  logoutAdmin,
  getMe,
  authCheck,
  getSystemHealth,
  controlService,
  createEmployee,
  listEmployees,
  updateEmployee,
  deleteEmployee,
  createStaffMailbox
} from './adminController.mjs';
import {
  listPartnerModeration,
  approvePartnerOffer,
  rejectPartnerOffer
} from './partnerModerationController.mjs';
import {
  listPartnerTopups,
  confirmPartnerTopup,
  cancelPartnerTopup,
  listPartnerPayouts,
  payPartnerPayout,
  rejectPartnerPayout
} from './partnerFinanceAdmin.mjs';
import {
  getSearchInsightsHandler,
  exportSearchInsightsCsv,
} from './searchInsightsController.mjs';
import {
  listMarketingQueue,
  getMarketingItem,
  createMarketingFromTemplate,
  updateMarketingItem,
  rejectMarketingItem,
  publishMarketingItem,
  listMarketingChannels,
  listMarketingTemplates,
  renderMarketingItem,
  streamMarketingMedia,
  getMarketingReports,
  regenerateMarketingCopy
} from './marketingAdmin.mjs';

const router = Router();

// Публичные роуты (без авторизации)
router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);

// Проверка токена
router.get('/me', verifyAdmin, getMe);
router.get('/auth-check', verifyAdmin, authCheck);
router.get('/system-health', verifyAdmin, getSystemHealth);
router.post('/service-control', verifyAdmin, controlService);

// Защищённые роуты (требуют admin_token)
router.get('/employees', verifyAdmin, listEmployees);
router.post('/employees', verifyAdmin, createEmployee);
router.put('/employees/:id', verifyAdmin, updateEmployee);
router.delete('/employees/:id', verifyAdmin, deleteEmployee);

// Почтовые ящики @serpmonn.ru
router.post('/mailbox', verifyAdmin, createStaffMailbox);

// Модерация партнёрских офферов
router.get('/partners/moderation', verifyAdmin, listPartnerModeration);
router.post('/partners/offers/:id/approve', verifyAdmin, approvePartnerOffer);
router.post('/partners/offers/:id/reject', verifyAdmin, rejectPartnerOffer);

// Финансы партнёров
router.get('/partners/topups', verifyAdmin, listPartnerTopups);
router.post('/partners/topups/:id/confirm', verifyAdmin, confirmPartnerTopup);
router.post('/partners/topups/:id/cancel', verifyAdmin, cancelPartnerTopup);
router.get('/partners/payouts', verifyAdmin, listPartnerPayouts);
router.post('/partners/payouts/:id/pay', verifyAdmin, payPartnerPayout);
router.post('/partners/payouts/:id/reject', verifyAdmin, rejectPartnerPayout);

// Лог поисковых запросов (спрос)
router.get('/search-insights', verifyAdmin, getSearchInsightsHandler);
router.get('/search-insights.csv', verifyAdmin, exportSearchInsightsCsv);

// Маркетинг: очередь публикаций и каналы
router.get('/marketing/queue', verifyAdmin, listMarketingQueue);
router.get('/marketing/queue/:id', verifyAdmin, getMarketingItem);
router.post('/marketing/queue', verifyAdmin, createMarketingFromTemplate);
router.put('/marketing/queue/:id', verifyAdmin, updateMarketingItem);
router.post('/marketing/queue/:id/reject', verifyAdmin, rejectMarketingItem);
router.post('/marketing/queue/:id/publish', verifyAdmin, publishMarketingItem);
router.post('/marketing/queue/:id/render', verifyAdmin, renderMarketingItem);
router.post('/marketing/queue/:id/regenerate-copy', verifyAdmin, regenerateMarketingCopy);
router.get('/marketing/queue/:id/media', verifyAdmin, streamMarketingMedia);
router.get('/marketing/channels', verifyAdmin, listMarketingChannels);
router.get('/marketing/templates', verifyAdmin, listMarketingTemplates);
router.get('/marketing/reports', verifyAdmin, getMarketingReports);

export default router;
