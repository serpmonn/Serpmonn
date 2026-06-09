import dotenv from 'dotenv';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const envPath = isProduction
  ? '/var/www/serpmonn.ru/backend/.env'
  : resolve(process.cwd(), 'backend/.env');

dotenv.config({ path: envPath });

import bcrypt from 'bcryptjs';
import paseto from 'paseto';
import { query } from '../database/config.mjs';
import { v4 as uuidv4 } from 'uuid';

const { V4 } = paseto;
const { hash, compare } = bcrypt;

// --- Авторизация администратора ---

export const loginAdmin = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Пароль обязателен' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const secretKey = process.env.ADMIN_SECRET_KEY;

  if (!adminPassword || !secretKey) {
    console.error('[admin] ADMIN_PASSWORD или ADMIN_SECRET_KEY не заданы в .env');
    return res.status(500).json({ message: 'Ошибка сервера: конфигурация отсутствует' });
  }

  const isMatch = await compare(password, adminPassword);
  if (!isMatch) {
    return res.status(401).json({ message: 'Неверный пароль' });
  }

  try {
    const token = await V4.sign(
      { sub: 'admin' },
      secretKey,
      {
        audience: 'admin-panel',
        expiresIn: '8h'
      }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 8 * 60 * 60 * 1000,
      domain: '.serpmonn.ru'
    });

    return res.json({ success: true, message: 'Вход выполнен' });
  } catch (error) {
    console.error('[admin] ошибка создания токена:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const logoutAdmin = (req, res) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    domain: '.serpmonn.ru'
  });
  return res.json({ success: true, message: 'Выход выполнен' });
};

// --- Проверка токена ---

export const getMe = (req, res) => {
  return res.json({ success: true, sub: req.admin?.sub || 'admin' });
};

// --- Управление сотрудниками ---

export const createEmployee = async (req, res) => {
  const { first_name, last_name, email, password, role, position, status, hire_date } = req.body;

  if (!first_name || !last_name || !email || !password || !role) {
    return res.status(400).json({ message: 'Заполните обязательные поля: имя, фамилия, email, пароль, роль' });
  }

  try {
    const [emailExists] = await query('SELECT id FROM employees WHERE email = ?', [email]);
    if (emailExists?.id) {
      return res.status(400).json({ message: 'Email уже используется' });
    }

    const passwordHash = await hash(password, 10);
    const employeeId = uuidv4();

    await query(
      `INSERT INTO employees (id, first_name, last_name, email, password_hash, role, position, status, hire_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, first_name, last_name, email, passwordHash, role, position || null, status || 'active', hire_date || null]
    );

    console.log(`[admin] создан сотрудник: ${first_name} ${last_name} <${email}> id=${employeeId}`);
    return res.status(201).json({ success: true, message: 'Сотрудник создан', id: employeeId });
  } catch (error) {
    console.error('[admin] ошибка создания сотрудника:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const listEmployees = async (req, res) => {
  try {
    const employees = await query(
      'SELECT id, first_name, last_name, email, role, position, status, hire_date, created_at FROM employees ORDER BY created_at DESC',
      []
    );
    return res.json(employees);
  } catch (error) {
    console.error('[admin] ошибка получения списка сотрудников:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email, password, role, position, status, hire_date } = req.body;

  if (!id) return res.status(400).json({ message: 'ID обязателен' });

  try {
    const [existing] = await query('SELECT id FROM employees WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ message: 'Сотрудник не найден' });

    if (email) {
      const [emailExists] = await query('SELECT id FROM employees WHERE email = ? AND id != ?', [email, id]);
      if (emailExists?.id) return res.status(400).json({ message: 'Email уже используется' });
    }

    const fields = [];
    const values = [];

    if (first_name !== undefined) { fields.push('first_name = ?'); values.push(first_name); }
    if (last_name  !== undefined) { fields.push('last_name = ?');  values.push(last_name); }
    if (email      !== undefined) { fields.push('email = ?');      values.push(email); }
    if (role       !== undefined) { fields.push('role = ?');       values.push(role); }
    if (position   !== undefined) { fields.push('position = ?');   values.push(position); }
    if (status     !== undefined) { fields.push('status = ?');     values.push(status); }
    if (hire_date  !== undefined) { fields.push('hire_date = ?');  values.push(hire_date || null); }

    if (password) {
      const passwordHash = await hash(password, 10);
      fields.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (fields.length === 0) return res.status(400).json({ message: 'Нет полей для обновления' });

    values.push(id);
    await query(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`, values);

    console.log(`[admin] обновлён сотрудник id=${id}`);
    return res.json({ success: true, message: 'Сотрудник обновлён' });
  } catch (error) {
    console.error('[admin] ошибка обновления сотрудника:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const deleteEmployee = async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ message: 'ID сотрудника обязателен' });

  try {
    const [employee] = await query('SELECT id, first_name, last_name FROM employees WHERE id = ?', [id]);
    if (!employee) return res.status(404).json({ message: 'Сотрудник не найден' });

    await query('DELETE FROM employees WHERE id = ?', [id]);

    console.log(`[admin] удалён сотрудник: ${employee.first_name} ${employee.last_name} id=${id}`);
    return res.json({ success: true, message: 'Сотрудник удалён' });
  } catch (error) {
    console.error('[admin] ошибка удаления сотрудника:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export default { loginAdmin, logoutAdmin, getMe, createEmployee, listEmployees, updateEmployee, deleteEmployee };
