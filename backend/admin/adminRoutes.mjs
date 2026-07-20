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

export default router;
