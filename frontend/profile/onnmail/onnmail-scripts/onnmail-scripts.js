const registerForm = document.getElementById('registerForm');                                                                // Получаем форму регистрации
const statusMessage = document.getElementById('statusMessage');                                                              // Получаем элемент для статуса
let csrfToken = '';                                                                                                         // Инициализируем переменную для CSRF-токена
(MRGtag = window.MRGtag || []).push({});

// Проверка статуса пользователя
const checkUserStatus = async () => {                                                                                        // Определяем функцию проверки статуса
    try {                                                                                                                    // Начинаем блок обработки ошибок
        console.log('Отправка запроса /profile/get на https://serpmonn.ru');                                                 // Логируем начало запроса
        const response = await fetch('https://serpmonn.ru/profile/get', {                                                     // Отправляем запрос на получение профиля
            credentials: 'include'                                                                                           // Включаем cookies в запрос
        });                                                                                                                 

        console.log('Ответ /profile/get:', response.status, response.statusText);                                             // Логируем статус ответа
        if (!response.ok) {                                                                                                  // Проверяем успешность ответа
            const data = await response.json();                                                                              // Получаем данные ответа
            if (response.status === 401) {                                                                                   // Проверяем статус 401
                statusMessage.textContent = data.message || 'Пожалуйста, войдите в аккаунт';                                 // Выводим сообщение
                window.location.href = '/frontend/login/login.html';                                                         // Перенаправляем на логин
                return false;                                                                                                // Прерываем выполнение
            }                                                                                                               
            if (response.status === 403) {                                                                                   // Проверяем статус 403
                statusMessage.textContent = data.message || 'Ошибка доступа';                                                // Выводим сообщение
                return false;                                                                                                // Прерываем выполнение
            }                                                                                                               
            throw new Error('Не авторизован');                                                                              // Выбрасываем ошибку
        }                                                                                                                   
        const data = await response.json();                                                                                  // Получаем данные ответа
        console.log('Данные профиля:', data);                                                                                 // Логируем данные профиля
        if (!data.confirmed) {                                                                                               // Проверяем, подтвержден ли аккаунт
            statusMessage.textContent = 'Подтвердите ваш аккаунт перед регистрацией почтового ящика';                         // Выводим сообщение
            return false;                                                                                                    // Прерываем выполнение
        }                                                                                                                   
        if (data.mailbox_created) {                                                                                          // Проверяем, создан ли почтовый ящик
            statusMessage.textContent = 'Вы уже создали почтовый ящик';                                                      // Выводим сообщение
            return false;                                                                                                    // Прерываем выполнение
        }                                                                                                                   
        registerForm.style.display = 'block';                                                                                // Показываем форму регистрации
        return true;                                                                                                         // Возвращаем успех
    } catch (error) {                                                                                                        // Обрабатываем возможные ошибки
        console.error('Ошибка проверки статуса:', error);                                                                    // Логируем ошибку
        statusMessage.textContent = 'Ошибка загрузки данных. Попробуйте снова.';                                             // Выводим сообщение об ошибке
        return false;                                                                                                        // Прерываем выполнение
    }                                                                                                                       
};

// Инициализация CSRF-токена
const initCSRFToken = async () => {                                                                                          // Определяем функцию получения CSRF-токена
    try {                                                                                                                    // Начинаем блок обработки ошибок
        console.log('Запрос CSRF-токена на https://serpmonn.ru/mail-api/csrf-token');                                             // Логируем начало запроса
        const response = await fetch('https://serpmonn.ru/mail-api/csrf-token', {                                                 // Отправляем запрос на CSRF-токен
            credentials: 'include'                                                                                           // Включаем cookies в запрос
        });                                                                                                                 

        console.log('Ответ /api/csrf-token:', response.status, response.statusText);                                          // Логируем статус ответа
        if (!response.ok) {                                                                                                  // Проверяем успешность ответа
            throw new Error(`Ошибка получения CSRF-токена: ${response.statusText}`);                                         // Выбрасываем ошибку
        }                                                                                                                   
        const data = await response.json();                                                                                  // Получаем данные ответа
        csrfToken = data.csrfToken;                                                                                          // Сохраняем CSRF-токен
        console.log('Получен CSRF-токен:', csrfToken);                                                                       // Логируем CSRF-токен
    } catch (error) {                                                                                                        // Обрабатываем возможные ошибки
        console.error('CSRF Token initialization failed:', error);                                                           // Логируем ошибку
        statusMessage.textContent = 'Ошибка загрузки формы. Попробуйте снова.';                                              // Выводим сообщение об ошибке
    }                                                                                                                       
};

// Обработка регистрации
const handleRegister = async (e) => {                                                                                        // Определяем функцию обработки регистрации
    e.preventDefault();                                                                                                      // Предотвращаем стандартное поведение формы
    const username = document.getElementById('username').value.trim();                                                       // Получаем имя пользователя
    const emailLocalPart = document.getElementById('emailLocalPart').value.trim().toLowerCase();                            // Получаем локальную часть email
    const password = document.getElementById('password').value;                                                              // Получаем пароль
    const passwordConfirm = document.getElementById('passwordConfirm').value;                                                // Получаем подтверждение пароля
    const messageEl = document.getElementById('registerMessage');                                                            // Получаем элемент для сообщений

    messageEl.textContent = '';                                                                                              // Очищаем сообщения об ошибках

    // Валидация
    if (password !== passwordConfirm) {                                                                                      // Проверяем совпадение паролей
        messageEl.textContent = 'Пароли не совпадают!';                                                                     // Выводим сообщение об ошибке
        return;                                                                                                              // Прерываем выполнение
    }                                                                                                                       
    if (!emailLocalPart || !username || !password) {                                                                         // Проверяем заполненность полей
        messageEl.textContent = 'Заполните все поля!';                                                                      // Выводим сообщение об ошибке
        return;                                                                                                              // Прерываем выполнение
    }                                                                                                                       
    if (!/^[a-z0-9._%+-]+$/.test(emailLocalPart)) {                                                                         // Проверяем формат emailLocalPart
        messageEl.textContent = 'Логин может содержать только латинские буквы, цифры и символы ._%+-';                       // Выводим сообщение об ошибке
        return;                                                                                                              // Прерываем выполнение
    }                                                                                                                       
    if (password.length < 8) {                                                                                              // Проверяем длину пароля
        messageEl.textContent = 'Пароль должен содержать минимум 8 символов';                                               // Выводим сообщение об ошибке
        return;                                                                                                              // Прерываем выполнение
    }                                                                                                                       

    try {                                                                                                                    // Начинаем блок обработки ошибок
        console.log('Отправка запроса /mail-api/create-mailbox на https://serpmonn.ru');                                      // Логируем начало запроса
        const response = await fetch('https://serpmonn.ru/mail-api/create-mailbox', {                                         // Отправляем запрос на создание почты
            method: 'POST',                                                                                                  // Указываем метод POST
            headers: {                                                                                                       // Устанавливаем заголовки
                'Content-Type': 'application/json',                                                                         // Указываем тип содержимого
                'X-CSRF-Token': csrfToken                                                                                   // Передаем CSRF-токен
            },                                                                                                              
            credentials: 'include',                                                                                          // Включаем cookies в запрос
            body: JSON.stringify({ username, emailLocalPart, password })                                                     // Передаем данные в формате JSON
        });                                                                                                                 

        console.log('Ответ /mail-api/create-mailbox:', response.status, response.statusText);                                 // Логируем статус ответа
        const data = await response.json();                                                                                  // Получаем данные ответа
        console.log('Данные ответа:', data);                                                                                  // Логируем данные ответа

        if (!response.ok) {                                                                                                  // Проверяем успешность ответа
            messageEl.textContent = data.message || 'Ошибка регистрации';                                                    // Выводим сообщение об ошибке
            messageEl.style.color = 'red';                                                                                   // Устанавливаем красный цвет текста
            return;                                                                                                          // Прерываем выполнение
        }                                                                                                                   

        // Успешная регистрация - редирект на Mailcow
        console.log('Регистрация успешна, редирект на https://mail.serpmonn.ru');                                            // Логируем успешную регистрацию
        window.location.href = 'https://mail.serpmonn.ru';                                                                   // Перенаправляем на Mailcow
    } catch (error) {                                                                                                        // Обрабатываем возможные ошибки
        console.error('Ошибка регистрации:', error);                                                                         // Логируем ошибку
        messageEl.textContent = error.message.includes('already exists')                                                     // Проверяем тип ошибки
            ? 'Почтовый ящик уже существует'                                                                                // Выводим сообщение о существующем ящике
            : error.message;                                                                                                 // Выводим общее сообщение об ошибке
        messageEl.style.color = 'red';                                                                                   // Устанавливаем красный цвет текста
    }                                                                                                                       
};

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {                                                                  // Добавляем обработчик загрузки DOM
    await initCSRFToken();                                                                                                  // Инициализируем CSRF-токен
    const canRegister = await checkUserStatus();                                                                            // Проверяем статус пользователя
    if (canRegister) {                                                                                                      // Проверяем возможность регистрации
        registerForm.addEventListener('submit', handleRegister);                                                             // Добавляем обработчик submit формы
    }                                                                                                                       
});