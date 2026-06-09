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

// --- Управление сотрудниками ---

export const createEmployee = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Заполните все поля: username, email, password' });
  }

  try {
    const [usernameExists] = await query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    if (usernameExists?.id) {
      return res.status(400).json({ message: 'Имя пользователя уже занято' });
    }

    const [emailExists] = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (emailExists?.id) {
      return res.status(400).json({ message: 'Email уже используется' });
    }

    const passwordHash = await hash(password, 10);
    const userId = uuidv4();

    await query(
      'INSERT INTO users (id, username, email, password_hash, confirmed) VALUES (?, ?, ?, ?, ?)',
      [userId, username, email, passwordHash, true]
    );

    console.log(`[admin] создан сотрудник: ${username} <${email}> id=${userId}`);

    return res.status(201).json({
      success: true,
      message: `Сотрудник ${username} создан`,
      userId
    });
  } catch (error) {
    console.error('[admin] ошибка создания сотрудника:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const listEmployees = async (req, res) => {
  try {
    const employees = await query(
      'SELECT id, username, email, confirmed, created_at FROM users ORDER BY created_at DESC',
      []
    );
    return res.json({ success: true, employees });
  } catch (error) {
    console.error('[admin] ошибка получения списка сотрудников:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const deleteEmployee = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'ID сотрудника обязателен' });
  }

  try {
    const [user] = await query('SELECT id, username FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    await query('DELETE FROM users WHERE id = ?', [id]);

    console.log(`[admin] удалён пользователь: ${user.username} id=${id}`);
    return res.json({ success: true, message: `Пользователь ${user.username} удалён` });
  } catch (error) {
    console.error('[admin] ошибка удаления пользователя:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export default { loginAdmin, logoutAdmin, createEmployee, listEmployees, deleteEmployee };
