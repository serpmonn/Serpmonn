document.getElementById("registerForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const messageElement = document.getElementById("message");

    // Валидация полей
    if (username.length < 1) {
        messageElement.textContent = "Имя пользователя должно содержать минимум 1 символ.";
        messageElement.style.color = "red";
        return;
    }

    if (username.length > 255) {
        messageElement.textContent = "Имя пользователя не может превышать 255 символов.";
        messageElement.style.color = "red";
        return;
    }

    if (password.length < 8) {
        messageElement.textContent = "Пароль должен содержать минимум 8 символов.";
        messageElement.style.color = "red";
        return;
    }

    if (password.length > 255) {
        messageElement.textContent = "Пароль не может превышать 255 символов.";
        messageElement.style.color = "red";
        return;
    }

    try {
        const response = await fetch("https://serpmonn.ru/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, email, password }),
	    credentials: "include"
        });

        const data = await response.json();
        messageElement.textContent = data.message;
        messageElement.style.color = response.ok ? "green" : "red";

        if (response.ok) {                                                                      // Если регистрация успешна, перенаправляем на страницу логина
            setTimeout(() => {
                window.location.href = "../login/login.html";                                   // Переход на страницу логина
            }, 2000);                                                                           // Ожидание 2 секунды перед редиректом
        }
    } catch (error) {
        messageElement.textContent = "Ошибка соединения с сервером.";
        messageElement.style.color = "red";
    }
});

