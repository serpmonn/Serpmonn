import { generateCombinedBackground } from '../../scripts/backgroundGenerator.js';

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

            const telegramConfirmLink = data.confirmLink;										// Устанавливаем ссылку на Telegram-бота

            console.log("Ссылка для подтверждения через Telegram:", telegramConfirmLink);						// Логируем ссылку в консоль для проверки
            document.getElementById("telegramConfirmLink").href = telegramConfirmLink; 							// присваиваем ссылку

            document.getElementById("telegramPopup").style.display = "block";								// Показываем pop-up
        } else {
            document.getElementById("message").textContent = data.message;
		return;
        }
    } catch (error) {
        console.error("Ошибка регистрации:", error);
        document.getElementById("message").textContent = "Ошибка сервера.";
    }
});

document.getElementById("closePopup").addEventListener("click", function () {								// Закрытие pop-up
    document.getElementById("telegramPopup").style.display = "none";
});

document.addEventListener("DOMContentLoaded", () => {

    generateCombinedBackground();                                                               					// Запускаем генерацию фона

    const passwordField = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");

    togglePassword.addEventListener("click", () => {
        const isPasswordVisible = passwordField.type === "text";
        passwordField.type = isPasswordVisible ? "password" : "text";
        togglePassword.textContent = isPasswordVisible ? "👁" : "🙈";
    });
});
