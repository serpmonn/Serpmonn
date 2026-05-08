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
                                                                                              
export const registerUser = async (req, res) => {                                                        // Определяем функцию для регистрации пользователя
  const errors = validationResult(req);                                                                  // Проверяем данные запроса на ошибки валидации
  if (!errors.isEmpty()) {                                                                               // Если есть ошибки валидации
    return res.status(400).json({ errors: errors.array() });                                             // Возвращаем клиенту список ошибок и выходим
  }

  const { username, email, password, ref } = req.body;                                                   // Берём из тела запроса логин, почту, пароль и реф-код (username пригласившего)

  try {                                                                                                  // Начинаем основной блок try/catch для обработки ошибок
    const [usernameExists] = await query(                                                                // Делаем запрос к БД: есть ли уже такой username
      "SELECT id FROM users WHERE username = ?", 
      [username]
    );
    if (usernameExists && usernameExists.id) {                                                           // Если запись с таким username уже нашлась
      return res.status(400).json({ message: "Имя пользователя уже используется!" });                    // Отправляем ошибку о занятости логина
    }

    const [emailExists] = await query(                                                                   // Проверяем, занят ли email
      "SELECT id FROM users WHERE email = ?", 
      [email]
    );
    if (emailExists && emailExists.id) {                                                                 // Если в БД уже есть пользователь с этим email
      return res.status(400).json({ message: "Email уже используется!" });                               // Возвращаем ошибку о занятости email
    }

    const passwordHash = await hash(password, 10);                          // Хешируем пароль с солью (10 раундов)
    const userId = uuidv4();                                                // Генерируем уникальный UUID для нового пользователя
    const telegramConfirmLink = `https://t.me/SerpmonnConfirmBot?startapp=${userId}`; // Собираем ссылку на подтверждение через Telegram

    await query(                                                            // Выполняем SQL-запрос вставки нового пользователя
      "INSERT INTO users (id, username, email, password_hash, confirmed) VALUES (?, ?, ?, ?, ?)", // SQL для создания записи в users
      [userId, username, email, passwordHash, false]                        // Передаём значения полей: id, логин, почта, хеш, confirmed = false
    );

    const REGISTRATION_BASE_BONUS = 50;                                     // Константа: размер базового бонуса за сам факт регистрации
    await awardPoints(                                                      // Вызываем сервис начисления баллов
      userId,                                                               // Кому начисляем: новому пользователю
      REGISTRATION_BASE_BONUS,                                              // Сколько баллов начислить
      'registration_signup',                                                // Тип операции в системе баллов (за регистрацию)
      { via: 'signup' }                                                     // Доп. данные (meta): источник — обычная регистрация
    );

    // ===== РЕФЕРАЛКА: ref = username пригласившего =====
    if (ref) {                                                              // Если в запросе был передан реф-код (username пригласившего)
      try {                                                                 // Отдельный try, чтобы не уронить всю регистрацию из-за рефералки
        const [referrer] = await query(                                     // Ищем пользователя-реферера по его username
          "SELECT id FROM users WHERE username = ?",
          [ref]
        );

        if (referrer && referrer.id && referrer.id !== userId) {            // Если реферер найден и это не тот же самый новый пользователь
          const [freshUser] = await query(                                  // Получаем свежую запись нового пользователя
            "SELECT referred_by FROM users WHERE id = ?",
            [userId]
          );

          if (!freshUser.referred_by) {                                     // Проверяем, что у нового ещё не указан реферер
            const REFERRER_BONUS = 500;                                     // Сколько баллов дать пригласившему
            const REFEREE_BONUS = 150;                                      // Сколько баллов дать приглашённому

            await query(                                                    // Обновляем запись нового пользователя
              "UPDATE users SET referred_by = ? WHERE id = ?",              // Сохраняем, кем он был приглашён
              [referrer.id, userId]
            );

            await awardPoints(                                              // Начисляем бонус пригласившему (рефереру)
              referrer.id,                                                  // id пригласившего пользователя
              REFERRER_BONUS,                                               // размер бонуса рефереру
              'referral_referrer',                                          // тип транзакции — бонус рефереру
              { referee_id: userId, via: 'signup' }                         // meta: кого пригласил и откуда начисление
            );

            await awardPoints(                                              // Начисляем бонус приглашённому
              userId,                                                       // id нового пользователя
              REFEREE_BONUS,                                                // размер бонуса приглашённому
              'referral_referee',                                           // тип транзакции — бонус приглашённому
              { referrer_id: referrer.id, via: 'signup' }                   // meta: кто пригласил и откуда начисление
            );
          }
        }
      } catch (refErr) {                                                    // Ловим ошибки, связанные только с рефералкой
        console.error('Ошибка обработки рефералки при регистрации:', refErr); // Пишем ошибку в лог
        // Не прерываем регистрацию: если рефералка сломалась, новый пользователь всё равно создаётся
      }
    }
    // ===== конец блока рефералки =====

    res.status(200).json({                                                  // Возвращаем успешный ответ клиенту
      success: true,                                                        // Флаг успеха регистрации
      message: "Регистрация успешна! Выберите способ подтверждения.",       // Текст сообщения для пользователя
      userId: userId,                                                       // Отдаём клиенту id нового пользователя
      confirmLink: telegramConfirmLink                                      // Отдаём ссылку для подтверждения через Telegram
    });
  } catch (error) {                                                         // Ловим любые ошибки из основного блока try
    console.error("Ошибка регистрации:", error);                            // Логируем ошибку на сервере
    res.status(500).json({ message: "Ошибка сервера." });                   // Возвращаем клиенту 500 и сообщение об ошибке сервера
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
