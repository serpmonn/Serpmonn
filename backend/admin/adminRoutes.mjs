import { Router } from 'express';
import verifyAdmin from './verifyAdmin.mjs';
import {
  loginAdmin,
  logoutAdmin,
  createEmployee,
  listEmployees,
  deleteEmployee
} from './adminController.mjs';

const router = Router();

// Публичные роуты (без авторизации)
router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);

// Защищённые роуты (требуют admin_token)
router.get('/employees', verifyAdmin, listEmployees);
router.post('/employees', verifyAdmin, createEmployee);
router.delete('/employees/:id', verifyAdmin, deleteEmployee);

export default router;
