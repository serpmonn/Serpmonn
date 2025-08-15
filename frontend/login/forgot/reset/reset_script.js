import { generateCombinedBackground } from '/scripts/backgroundGenerator.js';

document.addEventListener("DOMContentLoaded", () => {
    generateCombinedBackground();

    const form = document.getElementById("resetForm");
    const message = document.getElementById("message");

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
        message.textContent = "Недействительная или отсутствующая ссылка.";
        message.style.color = "red";
        form.style.display = "none";
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const password = document.getElementById("password").value;
        const confirm = document.getElementById("confirm").value;

        if (password.length < 6) {
            message.textContent = "Пароль должен содержать минимум 6 символов.";
            message.style.color = "red";
            return;
        }

        if (password !== confirm) {
            message.textContent = "Пароли не совпадают.";
            message.style.color = "red";
            return;
        }

        try {
            const res = await fetch("https://serpmonn.ru/auth-api/reset", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ token, newPassword: password })
            });

            const data = await res.json();
            message.textContent = data.message;
            message.style.color = res.ok ? "green" : "red";

            if (res.ok) {
                setTimeout(() => {
                    window.location.href = "/frontend/login/login.html";
                }, 2000);
            }
        } catch (err) {
            message.textContent = "Ошибка соединения с сервером.";
            message.style.color = "red";
        }
    });
});