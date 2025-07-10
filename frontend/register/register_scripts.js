import { generateCombinedBackground } from '/scripts/backgroundGenerator.js';

document.getElementById("registerForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Сохраняем userId для email-подтверждения
            const userId = data.userId;
            sessionStorage.setItem('pendingUserId', userId); // Сохраняем userId для последующего использования
            // Сохраняем Telegram-ссылку
            const telegramConfirmLink = data.confirmLink;
            console.log("Ссылка для подтверждения через Telegram:", telegramConfirmLink);
            document.getElementById("telegramConfirmLink").href = telegramConfirmLink;

            // Показываем поп-ап с выбором метода
            document.getElementById("confirmPopup").style.display = "block";
        } else {
            document.getElementById("message").textContent = data.message;
            return;
        }
    } catch (error) {
        console.error("Ошибка регистрации:", error);
        document.getElementById("message").textContent = "Ошибка сервера.";
    }
});

// Обработка подтверждения через Email
document.getElementById("emailConfirmButton").addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const userId = sessionStorage.getItem('pendingUserId');

    try {
        const response = await fetch("/auth/confirm-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, userId }),
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById("message").textContent = "Письмо с подтверждением отправлено на ваш email!";
            document.getElementById("confirmPopup").style.display = "none";
            sessionStorage.removeItem('pendingUserId');
        } else {
            document.getElementById("message").textContent = data.message || "Ошибка при отправке письма.";
        }
    } catch (error) {
        console.error("Ошибка отправки email:", error);
        document.getElementById("message").textContent = "Ошибка сервера.";
    }
});

// Закрытие поп-апа
document.getElementById("closePopup").addEventListener("click", function () {
    document.getElementById("confirmPopup").style.display = "none";
});

document.addEventListener("DOMContentLoaded", () => {
    generateCombinedBackground();

    const passwordField = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");

    togglePassword.addEventListener("click", () => {
        const isPasswordVisible = passwordField.type === "text";
        passwordField.type = isPasswordVisible ? "password" : "text";
        togglePassword.textContent = isPasswordVisible ? "👁" : "🙈";
    });
});