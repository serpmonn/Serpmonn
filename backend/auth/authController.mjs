import dotenv from 'dotenv';                                                                             // Импортируем dotenv для работы с переменными окружения
import { resolve } from 'path';                                                                          // Импортируем resolve для создания абсолютных путей

const isProduction = process.env.NODE_ENV === 'production';                                              // Определяем режим работы: production или development
const envPath = isProduction                                                                             // Выбираем путь к .env файлу в зависимости от окружения
    ? '/var/www/serpmonn.ru/backend/.env'                                                                // Продакшен путь на сервере
    : resolve(process.cwd(), 'backend/.env');                                                            // Разработка - абсолютный путь к .env в папке backend

dotenv.config({ path: envPath });                                                                        // Загружаем переменные окружения из выбранного пути
                                                                                              
import bcrypt from 'bcryptjs';													                                                 // Импортируем bcrypt для хеширования паролей
import paseto from 'paseto';													                                                   // Импортируем paseto для создания токенов
import { query } from '../database/config.mjs';											                                     // Импортируем функцию query для работы с БД
import { validationResult } from 'express-validator';										                                 // Импортируем validationResult для проверки данных
import { v4 as uuidv4 } from 'uuid';												                                             // Импортируем uuidv4 для генерации уникальных ID
import { sendConfirmationEmail } from '../utils/mailer.mjs';									                           // Импортируем функцию для отправки email
import { awardPoints } from '../points/pointsService.js';                                                // Импортирует функцию проверки и начисления баллов
                                                                                              
const { V2 } = paseto;                                                                         					 // Извлекаем V2 из paseto для работы с токенами
const { hash, compare } = bcrypt;                                                              					 // Извлекаем hash и compare из bcrypt
const secretKey = process.env.SECRET_KEY;                                                     					 // Получаем секретный ключ из переменных окружения
                                                                                              
export const registerUser = async (req, res) => {                                             					 // Определяем функцию для регистрации пользователя
  const errors = validationResult(req);                                                        					 // Проверяем данные запроса на ошибки
  if (!errors.isEmpty()) {                                                                     					 // Проверяем, есть ли ошибки валидации
    return res.status(400).json({ errors: errors.array() });                                    				 // Возвращаем ошибки в формате JSON
  }                                                                                            
                                                                                              
  const { username, email, password } = req.body;                                              					 // Извлекаем данные из тела запроса
                                                                                              
  try {                                                                                        					 // Начинаем блок обработки ошибок
    const [usernameExists] = await query("SELECT id FROM users WHERE username = ?", [username]); 				 // Проверяем, занят ли username
    if (usernameExists && usernameExists.id) {                                                 					 // Проверяем, существует ли пользователь
      return res.status(400).json({ message: "Имя пользователя уже используется!" });          					 // Возвращаем ошибку
    }                                                                                         
                                                                                              
    const [emailExists] = await query("SELECT id FROM users WHERE email = ?", [email]);       					 // Проверяем, занят ли email
    if (emailExists && emailExists.id) {                                                      					 // Проверяем, существует ли email
      return res.status(400).json({ message: "Email уже используется!" });                    					 // Возвращаем ошибку
    }                                                                                         
                                                                                              
    const passwordHash = await hash(password, 10);                                            					 // Хешируем пароль с солью (10 раундов)
    const userId = uuidv4();                                                                  					 // Генерируем уникальный ID пользователя
    const telegramConfirmLink = `https://t.me/SerpmonnConfirmBot?startapp=${userId}`;            				 // Формируем ссылку для подтверждения
                                                                                              
    await query(                                                                              					 // Выполняем запрос на вставку пользователя
      "INSERT INTO users (id, username, email, password_hash, confirmed) VALUES (?, ?, ?, ?, ?)", 			 // SQL-запрос для вставки
      [userId, username, email, passwordHash, false]                                           					 // Передаем данные в запрос
    );                                                                                        
                                                                                              
    res.status(200).json({                                                                    					 // Отправляем успешный ответ клиенту
      success: true,                                                                          					 // Указываем успешность операции
      message: "Регистрация успешна! Выберите способ подтверждения.",                         					 // Сообщение для пользователя
      userId: userId,                                                                         					 // Передаем ID пользователя
      confirmLink: telegramConfirmLink                                                        					 // Передаем ссылку для подтверждения
    });                                                                                       
  } catch (error) {                                                                           					 // Обрабатываем возможные ошибки
    console.error("Ошибка регистрации:", error);                                              					 // Логируем ошибку в консоль
    res.status(500).json({ message: "Ошибка сервера." });                                    					   // Возвращаем ошибку сервера клиенту
  }                                                                                         
};

export const confirmTelegram = async (req, res) => {                                              //     Функция подтверждения аккаунта через Telegram Web App
  const { userId, source } = req.body;                                                           //     Достаем из тела запроса userId и source (откуда пришли)

  console.log('📱 Подтверждение через Telegram Web App:', { userId, source });                   //     Логируем входящие данные для отладки

  try {                                                                                          //     Начинаем блок try/catch для обработки ошибок
    // Проверяем, что userId вообще есть и что это валидный UUID формата xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    if (
      !userId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    ) {
      console.log('❌ Неверный формат UserID:', userId);                                         //     Логируем неверный формат userId
      return res.status(400).json({                                                             //     Возвращаем 400 — плохой запрос
        success: false,
        message: "Неверная ссылка подтверждения"
      });
    }

    const [user] = await query(                                                                 //     Ищем пользователя по id и забираем нужные поля
      "SELECT id, username, email, confirmed, registration_points_awarded FROM users WHERE id = ?",
      [userId]
    );

    if (!user) {                                                                                //     Если пользователь не найден в БД
      console.log('❌ Пользователь не найден:', userId);                                        //     Логируем ситуацию
      return res.status(404).json({                                                             //     Возвращаем 404 — пользователь не найден
        success: false,
        message: "Пользователь не найден. Пройдите регистрацию заново."
      });
    }

    if (user.confirmed) {                                                                       //     Если аккаунт уже был подтверждён ранее
      console.log('ℹ️ Аккаунт уже подтвержден:', user.username);                                //     Логируем, что подтверждение уже было

      if (!user.registration_points_awarded) {                                                  //     Проверяем, выдавался ли уже бонус за регистрацию
        const REGISTRATION_BONUS = 200;                                                         //     Размер бонуса за регистрацию в баллах
        await awardPoints(user.id, REGISTRATION_BONUS, 'registration', {                        //     Начисляем баллы через сервисную функцию
          via: 'telegram'                                                                       //     В meta фиксируем, что подтверждение через Telegram
        });
        await query(                                                                            //     Обновляем флаг, чтобы второй раз не начислить
          'UPDATE users SET registration_points_awarded = 1 WHERE id = ?',
          [user.id]
        );
      }

      return res.json({                                                                         //     Возвращаем успешный ответ
        success: true,
        message: `Аккаунт ${user.username} уже был подтвержден ранее`
      });
    }

    console.log('✅ Подтверждаем аккаунт:', user.username);                                     //     Логируем, что сейчас подтверждаем аккаунт
    await query("UPDATE users SET confirmed = ? WHERE id = ?", [true, user.id]);                //     Ставим confirmed = true в БД

    if (!user.registration_points_awarded) {                                                    //     Бонус за регистрацию — только если ещё не давали
      const REGISTRATION_BONUS = 200;                                                           //     Размер бонуса
      await awardPoints(user.id, REGISTRATION_BONUS, 'registration', {                          //     Начисляем баллы
        via: 'telegram'                                                                         //     Источник — Telegram
      });
      await query(                                                                              //     Фиксируем, что бонус уже выдан
        'UPDATE users SET registration_points_awarded = 1 WHERE id = ?',
        [user.id]
      );
    }

    res.json({                                                                                  //     Отправляем успешный ответ клиенту
      success: true,
      message: `Аккаунт ${user.username} успешно подтвержден!`
    });

  } catch (error) {                                                                             //     Ловим любые ошибки
    console.error("❌ Ошибка при подтверждении через Telegram:", error);                        //     Логируем ошибку на сервере
    res.status(500).json({                                                                      //     Возвращаем 500 — внутренняя ошибка сервера
      success: false,
      message: "Произошла техническая ошибка. Попробуйте позже."
    });
  }
};
                                                                                              
export const confirmEmail = async (req, res) => {                                             					        // Определяем функцию для подтверждения email
  const { email, userId } = req.body;                                                        					          // Извлекаем email и userId из тела запроса
                                                                                              
  try {                                                                                       					        // Начинаем блок обработки ошибок
    const [user] = await query("SELECT id FROM users WHERE id = ? AND email = ?", [userId, email]); 				    // Проверяем пользователя
    if (!user) {                                                                              					        // Проверяем, найден ли пользователь
      return res.status(404).json({ message: "Пользователь не найден." });							                        // Возвращаем ошибку
    }                                                                                         
                                                                                              
    const confirmationToken = uuidv4();												                                                  // Генерируем токен подтверждения
    const tokenExpires = new Date(Date.now() + 3600000);									                                      // Устанавливаем срок действия токена (1 час)
                                                                                              
    await query(														                                                                    // Выполняем запрос на обновление пользователя
      "UPDATE users SET confirmation_token = ?, confirmation_token_expires = ? WHERE id = ?",					          // SQL-запрос для обновления
      [confirmationToken, tokenExpires, userId]											                                            // Передаем данные в запрос
    );                                                                                        
                                                                                              
    const confirmLink = `https://serpmonn.ru/auth/confirm?token=${confirmationToken}`;						              // Формируем ссылку подтверждения
    await sendConfirmationEmail(email, confirmLink);										                                        // Отправляем письмо с подтверждением
                                                                                              
    res.json({ success: true, message: "Письмо с подтверждением отправлено." });						                    // Отправляем успешный ответ клиенту
  } catch (error) {														                                                                  // Обрабатываем возможные ошибки
    console.error("Ошибка отправки email:", error);										                                          // Логируем ошибку в консоль
    res.status(500).json({ message: "Ошибка сервера." });									                                      // Возвращаем ошибку сервера клиенту
  }                                                                                         
};                                                                                           
                                                                                              
export const confirmToken = async (req, res) => {                                               //     Функция для подтверждения email по токену из письма
  const { token } = req.query;                                                                  //     Достаем токен из строки запроса (?token=...)

  try {                                                                                         //     Начинаем блок try/catch
    const [user] = await query(                                                                 //     Ищем пользователя по токену и проверяем срок действия
      "SELECT id, email, username, registration_points_awarded FROM users WHERE confirmation_token = ? AND confirmation_token_expires > ?",
      [token, new Date()]
    );

    if (!user) {                                                                                //     Если пользователь не найден или токен истёк
      return res.status(400).json({ message: "Недействительный или истёкший токен." });        //     Возвращаем 400 — токен невалиден
    }

    await query(                                                                                //     Обновляем статус пользователя
      "UPDATE users SET confirmed = ?, confirmation_token = NULL, confirmation_token_expires = NULL WHERE id = ?",
      [true, user.id]
    );

    if (!user.registration_points_awarded) {                                                    //     Если бонус за регистрацию ещё не выдавался
      const REGISTRATION_BONUS = 200;                                                           //     Размер бонуса за регистрацию
      await awardPoints(user.id, REGISTRATION_BONUS, 'registration', {                          //     Начисляем баллы через сервис
        via: 'email'                                                                            //     В meta фиксируем, что подтверждение через email
      });
      await query(                                                                              //     Обновляем флаг, чтобы больше не начислять
        'UPDATE users SET registration_points_awarded = 1 WHERE id = ?',
        [user.id]
      );
    }

    const payload = {                                                                           //     Формируем payload для PASETO-токена авторизации
      id: user.id,
      email: user.email,
      username: user.username || user.email
    };
    const authToken = await V2.sign(payload, secretKey);                                        //     Подписываем payload секретным ключом и получаем токен

    res.cookie('token', authToken, {                                                            //     Устанавливаем httpOnly-cookie с токеном на домен serpmonn.ru
      httpOnly: true,                                                                           //     Cookie недоступна из JS
      secure: true,                                                                             //     Только по HTTPS
      sameSite: 'Lax',                                                                          //     Базовая защита от CSRF
      maxAge: 30 * 24 * 60 * 60 * 1000,                                                         //     Время жизни cookie — 30 дней
      domain: '.serpmonn.ru'                                                                    //     Действует для всех поддоменов serpmonn.ru
    });

    console.log('Подтверждение: пользователь', user.email, 'confirmed = 1, токен создан');      //     Логируем успешное подтверждение
    res.redirect('https://serpmonn.ru/frontend/profile/profile.html');                          //     Редиректим пользователя в профиль
  } catch (error) {                                                                             //     Обрабатываем ошибки
    console.error("Ошибка подтверждения:", error);                                              //     Логируем ошибку на сервере
    res.status(500).json({ message: "Ошибка сервера." });                                       //     Возвращаем 500 — внутренняя ошибка сервера
  }
};                                                     
                                                                                              
export const loginUser = async (req, res) => {                                                                  // Определяем функцию для входа пользователя
  const { email, password } = req.body;                                                                         // Извлекаем email и пароль из тела запроса
                                                                                              
  const queryStr = 'SELECT * FROM users WHERE email = ?';                                                       // Задаем SQL-запрос для поиска пользователя
  try {                                                                                                         // Начинаем блок обработки ошибок
    const results = await query(queryStr, [email]);                                                             // Выполняем запрос к базе данных
    if (results.length === 0) {                                                                                 // Проверяем, найден ли пользователь
      return res.status(401).json({ message: 'Неверный email или пароль' });                                    // Возвращаем ошибку
    }                                                                                         
                                                                                              
    const user = results[0];                                                                                    // Извлекаем первого найденного пользователя
    const isMatch = await compare(password, user.password_hash);                                                // Сравниваем введенный пароль с хешем
    if (!isMatch) {                                                                                             // Проверяем, совпадает ли пароль
      return res.status(401).json({ message: 'Неверный email или пароль' });                                    // Возвращаем ошибку
    }                                                                                         
                                                                                              
    const payload = { id: user.id, username: user.username, email: user.email };                                // Формируем данные для токена
    const token = await V2.sign(payload, secretKey);                                                            // Создаем авторизационный токен
                                                                                              
    res.cookie('token', token, {                                                                                // Устанавливаем cookie с токеном
      httpOnly: true,                                                                                           // Защищаем cookie от доступа через JS
      secure: true,                                                                                             // Устанавливаем только для HTTPS
      sameSite: 'Lax',                                                                                          // Устанавливаем политику SameSite для работы между страницами
      maxAge: 24 * 60 * 60 * 1000,                                                                              // Устанавливаем срок действия (1 день)
      domain: '.serpmonn.ru'                                                                                    // Ведущая точка для работы на всех поддоменах
    });                                                                                       
                                                                                              
    res.json({ message: 'Вход выполнен успешно' });                                                             // Отправляем успешный ответ клиенту
  } catch (error) {                                                                                             // Обрабатываем возможные ошибки
    res.status(500).json({ message: 'Ошибка при выполнении запроса', error });                                  // Возвращаем ошибку сервера
  }                                                                                         
};                                                                                           
                                                                                              
export const logoutUser = (req, res) => {                                                                       // Определяем функцию для выхода пользователя
  res.clearCookie('token', {                                                                                    // Удаляем cookie с токеном
    httpOnly: true,                                                                                             // Защищаем cookie от доступа через JS
    secure: true,                                                                                               // Устанавливаем только для HTTPS
    sameSite: 'Lax'                                                                                             // Устанавливаем политику SameSite для работы между страницами
  });                                                                                       
  res.json({ message: 'Выход выполнен успешно' });                                                              // Отправляем успешный ответ клиенту
};                                                                                           
                                                                                              
export default { registerUser, confirmEmail, confirmToken, loginUser, logoutUser };                             // Экспортируем все функции
