import { generateCombinedBackground } from '/scripts/backgroundGenerator.js';

document.addEventListener("DOMContentLoaded", () => {
    generateCombinedBackground();

    const form = document.getElementById("forgotForm");
    const message = document.getElementById("message");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        if (!email) {
            message.textContent = "Введите email.";
            message.style.color = "red";
            return;
        }

        try {
            const res = await fetch("https://serpmonn.ru/auth-api/forgot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            message.textContent = data.message;
            message.style.color = res.ok ? "green" : "red";
        } catch (err) {
            message.textContent = "Ошибка соединения с сервером.";
            message.style.color = "red";
        }
    });
});