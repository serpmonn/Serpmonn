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

    if (password.length < 8) {
        messageElement.textContent = "Пароль должен содержать минимум 8 символов.";
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

        // После успешного входа (если сервер вернул успешный ответ)
        if (response.ok) {
            window.location.href = "../profile/profile.html"; // Переход на страницу профиля или главную
        }
    } catch (error) {
        messageElement.textContent = "Ошибка соединения с сервером.";
        messageElement.style.color = "red";
    }
});

