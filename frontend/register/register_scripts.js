import { generateCombinedBackground } from '/frontend/scripts/backgroundGenerator.js';

// ЧИТАЕМ РЕФЕРАЛЬНЫЙ КОД ИЗ URL (?ref=...)
const urlParams = new URLSearchParams(window.location.search);
const referralUsername = urlParams.get('ref') || null;

// ОБРАБОТЧИК ОТПРАВКИ ФОРМЫ РЕГИСТРАЦИИ
document.getElementById("registerForm").addEventListener("submit", async function (event) {
    event.preventDefault();                                                                              // Предотвращаем стандартную отправку формы

    const username = document.getElementById("username").value;                                         // Получаем значение имени пользователя из формы
    const email = document.getElementById("email").value;                                               // Получаем значение email из формы
    const password = document.getElementById("password").value;                                         // Получаем значение пароля из формы

    try {
        // Отправляем POST запрос на сервер для регистрации пользователя
        const response = await fetch("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username,
                email,
                password,
                ref: referralUsername                                                                   // реф-код, если был в URL
            }),
        });

        // Проверяем, есть ли тело ответа перед парсингом JSON
        const text = await response.text();                                                             // Получаем текст ответа от сервера
        const data = text ? JSON.parse(text) : {};                                                      // Парсим JSON только если есть содержимое

        if (response.ok) {                                                                              // Если ответ успешный (статус 200-299)
            // Сохраняем userId для email-подтверждения
            const userId = data.userId;                                                                 // Получаем ID пользователя из ответа
            sessionStorage.setItem('pendingUserId', userId);                                            // Сохраняем ID в sessionStorage для последующего использования
            // Сохраняем Telegram-ссылку
            const telegramConfirmLink = data.confirmLink;                                               // Получаем ссылку для подтверждения через Telegram
            console.log("Ссылка для подтверждения через Telegram:", telegramConfirmLink);               // Логируем ссылку для отладки
            document.getElementById("telegramConfirmLink").href = telegramConfirmLink;                 // Устанавливаем ссылку для кнопки Telegram

            // Показываем поп-ап с выбором метода
            document.getElementById("confirmPopup").style.display = "block";                           // Отображаем попап выбора способа подтверждения
        } else {                                                                                        // Если ответ с ошибкой
            document.getElementById("message").textContent = data.message || "Ошибка регистрации";     // Показываем сообщение об ошибке
            return;                                                                                     // Прерываем выполнение функции
        }
    } catch (error) {                                                                                   // Обработка ошибок при выполнении запроса
        console.error("Ошибка регистрации:", error);                                                    // Логируем ошибку в консоль
        document.getElementById("message").textContent = "Ошибка сервера.";                            // Показываем общее сообщение об ошибке
    }
});

// ОБРАБОТКА ПОДТВЕРЖДЕНИЯ ЧЕРЕЗ TELEGRAM - УНИВЕРСАЛЬНОЕ РЕШЕНИЕ
document.getElementById("telegramConfirmLink").addEventListener("click", function (e) {                 
    e.preventDefault();
    
    const userId = sessionStorage.getItem('pendingUserId');
    if (!userId) {
        alert("Ошибка: ID пользователя не найден. Пройдите регистрацию заново.");
        return;
    }

    // ОПРЕДЕЛЯЕМ ТИП УСТРОЙСТВА
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let telegramLink;
    
    if (isMobile) {
        // ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ - используем tg:// схему (откроет Telegram App)
        telegramLink = `tg://resolve?domain=SerpmonnConfirmBot&start=${userId}`;
        console.log("📱 Мобильное устройство - открываем Telegram App:", telegramLink);
    } else {
        // ДЛЯ ПК - ИСПОЛЬЗУЕМ ПРЯМУЮ ССЫЛКУ НА ВАШУ HTML СТРАНИЦУ
        telegramLink = `https://www.serpmonn.ru/frontend/telegram-app/confirm.html?startapp=${userId}`;
        console.log("💻 Десктопное устройство - открываем Web App страницу:", telegramLink);
    }
    
    console.log("🎯 Открываем Telegram подтверждение для UserID:", userId);
    
    // УМНОЕ ОТКРЫТИЕ ССЫЛКИ
    if (isMobile) {
        // НА МОБИЛЬНЫХ: пробуем открыть Telegram App
        window.location.href = telegramLink;
        
        // Fallback на Web версию
        setTimeout(() => {
            const webFallbackLink = `https://t.me/SerpmonnConfirmBot?startapp=${userId}`;
            console.log("🔄 Fallback: открываем Web версию", webFallbackLink);
            window.open(webFallbackLink, '_blank');
        }, 1000);
        
        document.getElementById("message").textContent = "Открываем Telegram App для подтверждения. Нажмите START и подтвердите аккаунт.";
    } else {
        // НА ПК: открываем вашу HTML страницу в НОВОЙ ВКЛАДКЕ
        window.open(telegramLink, '_blank');
        
        document.getElementById("message").innerHTML = `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 10px 0;">
                <strong>Открыта страница подтверждения аккаунта</strong>
                <p>Если страница не открылась автоматически, <a href="${telegramLink}" target="_blank">нажмите здесь</a></p>
                <p>После подтверждения вернитесь на эту страницу</p>
            </div>
        `;
    }
    
    // Скрываем попап после нажатия
    document.getElementById("confirmPopup").style.display = "none";
});

// ОБРАБОТКА ПОДТВЕРЖДЕНИЯ ЧЕРЕЗ EMAIL
document.getElementById("emailConfirmButton").addEventListener("click", async () => {                   // Обработчик кнопки подтверждения email
    const email = document.getElementById("email").value;                                               // Получаем email из формы
    const userId = sessionStorage.getItem('pendingUserId');                                             // Получаем сохраненный ID пользователя
    const button = document.getElementById("emailConfirmButton");                                       // Получаем ссылку на кнопку

    // Отключаем кнопку, чтобы предотвратить повторные клики
    button.disabled = true;                                                                             // Блокируем кнопку от повторных нажатий

    try {
        // Отправляем запрос на подтверждение email
        const response = await fetch("/auth/confirm-email", {                                           // Относительный путь к API подтверждения email
            method: "POST",                                                                             // Метод HTTP запроса
            headers: { "Content-Type": "application/json" },                                            // Заголовок указывающий тип данных JSON
            body: JSON.stringify({ email, userId }),                                                    // Преобразуем данные в JSON строку
        });

        // Проверяем, есть ли тело ответа перед парсингом JSON
        const text = await response.text();                                                             // Получаем текст ответа от сервера
        const data = text ? JSON.parse(text) : {};                                                      // Парсим JSON только если есть содержимое

        if (response.ok) {                                                                              // Если ответ успешный
            document.getElementById("message").textContent = "Письмо с подтверждением отправлено на ваш email!"; // Сообщение об успешной отправке
            document.getElementById("confirmPopup").style.display = "none";                             // Скрываем попап подтверждения
            sessionStorage.removeItem('pendingUserId');                                                 // Удаляем сохраненный ID пользователя
        } else {                                                                                        // Если ответ с ошибкой
            document.getElementById("message").textContent = data.message || "Ошибка при отправке письма."; // Показываем сообщение об ошибке
        }
    } catch (error) {                                                                                   // Обработка ошибок при выполнении запроса
        console.error("Ошибка отправки email:", error);                                                 // Логируем ошибку в консоль
        document.getElementById("message").textContent = "Ошибка сервера.";                             // Показываем общее сообщение об ошибке
    } finally {                                                                                         // Блок выполняется всегда, независимо от результата
        // Включаем кнопку обратно после завершения запроса
        button.disabled = false;                                                                        // Разблокируем кнопку после завершения операции
    }
});

// ЗАКРЫТИЕ ПОП-АПА
document.getElementById("closePopup").addEventListener("click", function () {                           // Обработчик закрытия попапа подтверждения
    document.getElementById("confirmPopup").style.display = "none";                                     // Скрываем попап при клике на кнопку закрытия
});

// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ DOM
document.addEventListener("DOMContentLoaded", () => {                                                   // Обработчик полной загрузки DOM дерева
    generateCombinedBackground();                                                                       // Генерируем комбинированный фон для страницы

    const passwordField = document.getElementById("password");                                          // Получаем поле ввода пароля
    const togglePassword = document.getElementById("togglePassword");                                   // Получаем кнопку переключения видимости пароля

    // Обработчик клика по кнопке показа/скрытия пароля
    togglePassword.addEventListener("click", () => {                                                    // Обработчик клика по кнопке показа/скрытия пароля
        const isPasswordVisible = passwordField.type === "text";                                        // Проверяем, видим ли пароль в данный момент
        passwordField.type = isPasswordVisible ? "password" : "text";                                   // Переключаем тип поля между password и text
        togglePassword.textContent = isPasswordVisible ? "👁" : "🙈";                                  // Меняем иконку на открытый/закрытый глаз
    });
});
