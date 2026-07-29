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

export default router;
