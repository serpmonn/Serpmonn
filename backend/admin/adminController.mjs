import dotenv from 'dotenv';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const envPath = isProduction
  ? '/var/www/serpmonn.ru/backend/.env'
  : resolve(process.cwd(), 'backend/.env');

dotenv.config({ path: envPath });

import bcrypt from 'bcryptjs';
import paseto from 'paseto';
import { execFileSync, spawnSync } from 'child_process';
import { query } from '../database/config.mjs';
import { mailQuery } from '../database/mailDatabase.config.mjs';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { collectSystemStatus, controlPm2Process } from './systemStatus.mjs';

const { V4 } = paseto;
const { hash, compare } = bcrypt;

export const loginAdmin = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Пароль обязателен' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const privateKey = process.env.ADMIN_PRIVATE_KEY;

  if (!adminPassword || !privateKey) {
    console.error('[admin] ADMIN_PASSWORD или ADMIN_PRIVATE_KEY не заданы в .env');
    return res.status(500).json({ message: 'Ошибка сервера: конфигурация отсутствует' });
  }

  const isMatch = await compare(password, adminPassword);
  if (!isMatch) {
    return res.status(401).json({ message: 'Неверный пароль' });
  }

  try {
    const token = await V4.sign(
      { sub: 'admin' },
      privateKey,
      { audience: 'admin-panel', expiresIn: '8h' }
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

export const getMe = (req, res) => {
  return res.json({ success: true, sub: req.admin?.sub || 'admin' });
};

/** Для nginx auth_request: 204 = сессия админа валидна */
export const authCheck = (_req, res) => {
  return res.status(204).end();
};

/** Сводка статуса сервисов через админ-сессию */
export const getSystemHealth = async (_req, res) => {
  try {
    const status = await collectSystemStatus();
    return res.status(status.ok ? 200 : 503).json(status);
  } catch (error) {
    console.error('[admin] system-health error:', error.message);
    return res.status(503).json({
      ok: false,
      tone: 'bad',
      summary: 'Не удалось проверить статус',
      checkedAt: new Date().toISOString(),
      problems: ['Проверка статуса'],
      groups: [],
      error: error.message,
    });
  }
};

/** Управление процессом PM2: start | stop | restart */
export const controlService = async (req, res) => {
  const { name, action } = req.body || {};
  if (!name || !action) {
    return res.status(400).json({ message: 'Нужны name и action' });
  }
  try {
    const result = await controlPm2Process(String(name), String(action));
    return res.json(result);
  } catch (error) {
    const status = error.status || 500;
    console.error('[admin] pm2 control error:', name, action, error.message);
    return res.status(status).json({
      message: error.message || 'Не удалось выполнить действие',
    });
  }
};

export const createEmployee = async (req, res) => {
  const { first_name, last_name, email, password, role, position, status, hire_date, mailbox } = req.body;

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
      `INSERT INTO employees (id, first_name, last_name, email, password_hash, role, position, status, hire_date, mailbox)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, first_name, last_name, email, passwordHash, role, position || null, status || 'active', hire_date || null, mailbox || null]
    );

    console.log(`[admin] создан сотрудник: ${first_name} ${last_name} <${email}> id=${employeeId} mailbox=${mailbox || 'NULL'}`);
    return res.status(201).json({ success: true, message: 'Сотрудник создан', id: employeeId });
  } catch (error) {
    console.error('[admin] ошибка создания сотрудника:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const listEmployees = async (req, res) => {
  try {
    const employees = await query(
      'SELECT id, first_name, last_name, email, mailbox, role, position, status, hire_date, created_at FROM employees ORDER BY created_at DESC',
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
  const { first_name, last_name, email, password, role, position, status, hire_date, mailbox } = req.body;

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
    if (mailbox    !== undefined) { fields.push('mailbox = ?');    values.push(mailbox || null); }
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
  const { deleteMailbox } = req.body;

  if (!id) return res.status(400).json({ message: 'ID сотрудника обязателен' });

  try {
    const [employee] = await query('SELECT id, first_name, last_name, email, mailbox FROM employees WHERE id = ?', [id]);
    if (!employee) return res.status(404).json({ message: 'Сотрудник не найден' });

    await query('DELETE FROM employees WHERE id = ?', [id]);
    console.log(`[admin] удалён сотрудник: ${employee.first_name} ${employee.last_name} id=${id}`);

    let mailboxDeleted = false;
    let mailboxError = null;

    if (deleteMailbox) {
      if (!employee.mailbox) {
        mailboxError = 'У сотрудника не сохранён корпоративный ящик';
      } else if (!employee.mailbox.endsWith('@serpmonn.ru')) {
        mailboxError = 'Корпоративный ящик должен относиться к домену @serpmonn.ru';
      } else {
        const rows = await mailQuery('SELECT email FROM users WHERE email = ?', [employee.mailbox]);
        if (rows.length === 0) {
          mailboxError = `Почтовый ящик ${employee.mailbox} не найден в mail-БД`;
        } else {
          try {
            const local = employee.mailbox.split('@')[0];
            await mailQuery('DELETE FROM users WHERE email = ?', [employee.mailbox]);
            const mailDir = `/var/vmail/serpmonn.ru/${local}`;
            if (fs.existsSync(mailDir)) execFileSync('rm', ['-rf', mailDir]);
            mailboxDeleted = true;
            console.log(`[admin] удалён почтовый ящик: ${employee.mailbox}`);
          } catch (err) {
            mailboxError = err.message;
            console.error('[admin] ошибка удаления почтового ящика:', err);
          }
        }
      }
    }

    return res.json({
      success: true,
      message: 'Сотрудник удалён',
      mailboxDeleted,
      mailboxError: mailboxError || undefined
    });
  } catch (error) {
    console.error('[admin] ошибка удаления сотрудника:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const createStaffMailbox = async (req, res) => {
  const { localPart, password } = req.body;

  if (!localPart || !password) {
    return res.status(400).json({ message: 'Логин и пароль обязательны' });
  }
  if (!/^[a-z0-9._%+-]+$/.test(localPart)) {
    return res.status(400).json({ message: 'Логин может содержать только латинские буквы, цифры и символы ._%+-' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Пароль минимум 8 символов' });
  }

  const domain = 'serpmonn.ru';
  const fullEmail = `${localPart}@${domain}`;

  try {
    const existing = await mailQuery('SELECT id FROM users WHERE email = ?', [fullEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Почтовый ящик уже существует' });
    }

    const domainRows = await mailQuery('SELECT id FROM domains WHERE domain = ?', [domain]);
    if (domainRows.length === 0) {
      return res.status(500).json({ message: `Домен ${domain} не найден в mail-БД` });
    }
    const domainId = domainRows[0].id;

    const dovecotPassword = generateDovecotHash(password);

    await mailQuery(
      'INSERT INTO users (email, password, domain_id, home, uid, gid) VALUES (?, ?, ?, ?, ?, ?)',
      [fullEmail, dovecotPassword, domainId, `/var/vmail/${domain}/${localPart}`, 5000, 5000]
    );

    const mailDir = `/var/vmail/${domain}/${localPart}/Maildir`;
    try {
      execFileSync('mkdir', ['-p', `${mailDir}/cur`, `${mailDir}/new`, `${mailDir}/tmp`]);
      execFileSync('chown', ['-R', 'vmail:vmail', `/var/vmail/${domain}/${localPart}`]);
      execFileSync('chmod', ['-R', '700', `/var/vmail/${domain}/${localPart}`]);
    } catch (fsError) {
      console.error('[admin] ошибка создания директорий Maildir:', fsError);
    }

    console.log(`[admin] создан почтовый ящик: ${fullEmail}`);
    return res.status(201).json({ success: true, email: fullEmail, message: 'Почтовый ящик создан' });
  } catch (error) {
    console.error('[admin] ошибка создания почтового ящика:', error);
    try { await mailQuery('DELETE FROM users WHERE email = ?', [fullEmail]); } catch (_) {}
    return res.status(500).json({ message: 'Ошибка создания почтового ящика: ' + error.message });
  }
};

// Генерация SHA512-CRYPT хеша для Dovecot.
// Пароль передаётся через stdin, а не через аргументы CLI — не виден в ps aux и /proc/<pid>/cmdline.
function generateDovecotHash(password) {
  const saltRaw = execFileSync('openssl', ['rand', '-base64', '12'])
    .toString().trim().replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);

  const result = spawnSync(
    'openssl',
    ['passwd', '-6', '-stdin', '-salt', saltRaw],
    { input: password + '\n', encoding: 'utf8' }
  );

  if (result.status !== 0 || !result.stdout) {
    throw new Error(`[admin] openssl passwd завершился с ошибкой: ${result.stderr || 'неизвестная ошибка'}`);
  }

  return `{SHA512-CRYPT}${result.stdout.trim()}`;
}

export default { loginAdmin, logoutAdmin, getMe, createEmployee, listEmployees, updateEmployee, deleteEmployee, createStaffMailbox };
