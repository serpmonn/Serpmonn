import { generateCombinedBackground } from '/frontend/scripts/backgroundGenerator.js';                                       // Импортируем функцию генерации фона из внешнего модуля
import { getFrontendPath } from '../scripts/locale-paths.js';

// ОБРАБОТЧИК ОТПРАВКИ ФОРМЫ ВХОДА
document.getElementById("loginForm").addEventListener("submit", async function(event) {                                      // Добавляем асинхронный обработчик события отправки формы
    event.preventDefault();                                                                                                  // Предотвращаем стандартную отправку формы (перезагрузку страницы)

    const email = document.getElementById("email").value.trim();                                                             // Получаем значение email из поля ввода и убираем пробелы по краям
    const password = document.getElementById("password").value;                                                              // Получаем значение пароля из поля ввода
    const messageElement = document.getElementById("message");                                                               // Получаем ссылку на элемент для вывода сообщений

    // ВАЛИДАЦИЯ ПОЛЕЙ ФОРМЫ
    if (email.length < 1) {                                                                                                  // Проверяем что поле email не пустое
        messageElement.textContent = "Email не может быть пустым.";                                                          // Устанавливаем текст сообщения об ошибке
        messageElement.style.color = "red";                                                                                  // Устанавливаем красный цвет текста для ошибки
        return;                                                                                                              // Прерываем выполнение функции если валидация не пройдена
    }

    if (password.length < 6) {                                                                                               // Проверяем что пароль содержит минимум 6 символов
        messageElement.textContent = "Пароль должен содержать минимум 6 символов.";                                          // Устанавливаем текст сообщения об ошибке
        messageElement.style.color = "red";                                                                                  // Устанавливаем красный цвет текста для ошибки
        return;                                                                                                              // Прерываем выполнение функции если валидация не пройдена
    }

    try {                                                                                                                    // Начало блока try для обработки возможных ошибок
        console.log('Отправка запроса на /auth/login');                                                                      // Логируем начало отправки запроса
        // ОТПРАВКА ЗАПРОСА НА СЕРВЕР
        const response = await fetch("/auth/login", {                                                                        // Отправляем асинхронный POST запрос на endpoint логина
            method: "POST",                                                                                                  // Указываем метод HTTP запроса - POST
            headers: {                                                                                                       // Устанавливаем заголовки запроса
                "Content-Type": "application/json"                                                                           // Указываем что отправляем данные в формате JSON
            },
            body: JSON.stringify({ email, password }),                                                                       // Преобразуем объект с данными в JSON строку
            credentials: 'include'                                                                                           // Включаем отправку cookies (для аутентификации)
        });

        console.log('Ответ /auth/login:', response.status, response.statusText);                                             // Логируем статус ответа от сервера
        // ОБРАБОТКА ОТВЕТА ОТ СЕРВЕРА
        const text = await response.text();                                                                                  // Получаем текст ответа от сервера
        const data = text ? JSON.parse(text) : {};                                                                           // Парсим JSON только если ответ не пустой
        
        console.log('Данные ответа:', data);                                                                                 // Логируем данные ответа для отладки
        
        messageElement.textContent = data.message || "Произошла ошибка";                                                     // Устанавливаем текст сообщения из ответа или по умолчанию
        messageElement.style.color = response.ok ? "green" : "red";                                                          // Устанавливаем зеленый цвет для успеха, красный для ошибки

        if (response.ok) {                                                                                                   // Проверяем успешен ли ответ (статус 200-299)
            console.log('Логин успешен, редирект на профиль');                                                               // Логируем успешный логин
            setTimeout(() => {                                                                                               // Устанавливаем задержку перед редиректом
                window.location.href = getFrontendPath('profile/profile.html');                                              // Перенаправляем пользователя на страницу профиля
            }, 1000);                                                                                                        // Задержка 1 секунда чтобы пользователь увидел сообщение
        }                                                                                                                   
    } catch (error) {                                                                                                        // Обработка ошибок в блоке try
        console.error('Ошибка при логине:', error);                                                                          // Логируем ошибку в консоль
        messageElement.textContent = "Ошибка соединения с сервером.";                                                        // Показываем пользователю сообщение об ошибке сети
        messageElement.style.color = "red";                                                                                  // Устанавливаем красный цвет текста
    }                                                                                                                       
});

// ИНИЦИАЛИЗАЦИЯ ПРИ ПОЛНОЙ ЗАГРУЗКЕ DOM
document.addEventListener("DOMContentLoaded", () => {                                                                        // Добавляем обработчик события полной загрузки DOM
    generateCombinedBackground();                                                                                            // Вызываем функцию генерации фона страницы

    const passwordField = document.getElementById("password");                                                               // Получаем ссылку на поле ввода пароля
    const togglePassword = document.getElementById("togglePassword");                                                        // Получаем ссылку на кнопку переключения видимости пароля

    if (togglePassword && passwordField) {                                                                                   // Проверяем что оба элемента существуют на странице
        togglePassword.addEventListener("click", () => {                                                                     // Добавляем обработчик клика на кнопку переключения
            const isPasswordVisible = passwordField.type === "text";                                                         // Проверяем текущий тип поля (текст или пароль)
            passwordField.type = isPasswordVisible ? "password" : "text";                                                    // Переключаем тип поля между password и text
            togglePassword.textContent = isPasswordVisible ? "👁" : "🙈";                                                    // Меняем иконку на кнопке в зависимости от состояния
        });                                                                                                                 
    }                                                                                                                       
});                                                                                                                         
