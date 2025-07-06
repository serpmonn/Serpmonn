import { generateCombinedBackground } from '../../scripts/backgroundGenerator.js';

document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const messageElement = document.getElementById("message");

    // Валидация полей
    if (email.length < 1) {
        messageElement.textContent = "Email не может быть пустым.";
        messageElement.style.color = "red";
        return;
    }

    if (password.length < 6) {
        messageElement.textContent = "Пароль должен содержать минимум 6 символов.";
        messageElement.style.color = "red";
        return;
    }

    try {
        const response = await fetch("https://serpmonn.ru/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        messageElement.textContent = data.message;
        messageElement.style.color = response.ok ? "green" : "red";

        if (response.ok) {                                                                                  // После успешного входа (если сервер вернул успешный ответ)
            window.location.href = "../profile/profile.html";                                               // Переход на страницу профиля или главную
        }
    } catch (error) {
        messageElement.textContent = "Ошибка соединения с сервером.";
        messageElement.style.color = "red";
    }
});

document.addEventListener("DOMContentLoaded", () => {

    generateCombinedBackground();                                                                           // Запускаем генерацию фона
    
    const passwordField = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");

    togglePassword.addEventListener("click", () => {
        const isPasswordVisible = passwordField.type === "text";
        passwordField.type = isPasswordVisible ? "password" : "text";
        togglePassword.textContent = isPasswordVisible ? "👁" : "🙈";
    });

});