import { generateCombinedBackground } from '/scripts/backgroundGenerator.js';                                                // Импортируем функцию для генерации фона

document.getElementById("loginForm").addEventListener("submit", async function(event) {                                      // Добавляем обработчик события submit формы
    event.preventDefault();                                                                                                  // Предотвращаем стандартное поведение формы

    const email = document.getElementById("email").value.trim();                                                             // Получаем email из формы
    const password = document.getElementById("password").value;                                                              // Получаем пароль из формы
    const messageElement = document.getElementById("message");                                                               // Получаем элемент для сообщений

    // Валидация полей
    if (email.length < 1) {                                                                                                  // Проверяем, заполнен ли email
        messageElement.textContent = "Email не может быть пустым.";                                                          // Выводим сообщение об ошибке
        messageElement.style.color = "red";                                                                                  // Устанавливаем красный цвет текста
        return;                                                                                                              // Прерываем выполнение
    }                                                                                                                       

    if (password.length < 6) {                                                                                               // Проверяем длину пароля
        messageElement.textContent = "Пароль должен содержать минимум 6 символов.";                                          // Выводим сообщение об ошибке
        messageElement.style.color = "red";                                                                                  // Устанавливаем красный цвет текста
        return;                                                                                                              // Прерываем выполнение
    }                                                                                                                       

    try {                                                                                                                    // Начинаем блок обработки ошибок
        console.log('Отправка запроса на https://serpmonn.ru/auth/login');                                                   // Логируем начало запроса
        const response = await fetch("https://serpmonn.ru/auth/login", {                                                     // Отправляем запрос на логин
            method: "POST",                                                                                                  // Указываем метод POST
            headers: {                                                                                                       // Устанавливаем заголовки
                "Content-Type": "application/json"                                                                           // Указываем тип содержимого
            },                                                                                                              
            body: JSON.stringify({ email, password }),                                                                       // Передаем данные в формате JSON
            credentials: 'include'                                                                                           // Включаем cookies в запрос
        });                                                                                                                 

        console.log('Ответ /auth/login:', response.status, response.statusText);                                             // Логируем статус ответа
        const data = await response.json();                                                                                  // Получаем данные ответа
        console.log('Данные ответа:', data);                                                                                 // Логируем данные ответа
        messageElement.textContent = data.message;                                                                           // Выводим сообщение от сервера
        messageElement.style.color = response.ok ? "green" : "red";                                                          // Устанавливаем цвет текста

        if (response.ok) {                                                                                                   // Проверяем успешность ответа
            console.log('Логин успешен, редирект на: ../profile/profile.html');                                              // Логируем успешный логин
            window.location.href = "../profile/profile.html";                                                                // Перенаправляем на страницу профиля
        }                                                                                                                   
    } catch (error) {                                                                                                        // Обрабатываем возможные ошибки
        console.error('Ошибка при логине:', error);                                                                          // Логируем ошибку
        messageElement.textContent = "Ошибка соединения с сервером.";                                                        // Выводим сообщение об ошибке
        messageElement.style.color = "red";                                                                                  // Устанавливаем красный цвет текста
    }                                                                                                                       
});

document.addEventListener("DOMContentLoaded", () => {                                                                        // Добавляем обработчик загрузки DOM
    generateCombinedBackground();                                                                                            // Генерируем фон страницы

    const passwordField = document.getElementById("password");                                                               // Получаем поле пароля
    const togglePassword = document.getElementById("togglePassword");                                                        // Получаем кнопку переключения видимости

    togglePassword.addEventListener("click", () => {                                                                         // Добавляем обработчик клика
        const isPasswordVisible = passwordField.type === "text";                                                             // Проверяем текущий тип поля
        passwordField.type = isPasswordVisible ? "password" : "text";                                                        // Переключаем тип поля
        togglePassword.textContent = isPasswordVisible ? "👁" : "🙈";                                                        // Обновляем текст кнопки
    });                                                                                                                     
});