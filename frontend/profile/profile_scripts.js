import { generateCombinedBackground } from '../../scripts/backgroundGenerator.js';

document.addEventListener('DOMContentLoaded', () => {

	generateCombinedBackground();                                                                           				// Запускаем генерацию фона
	
	async function getProfile() {
	    try {
	        const response = await fetch("https://serpmonn.ru/profile/get", {
	            method: "GET",
	            credentials: "include" 																						// ⬅  ВАЖНО для куки
	        });

	        const data = await response.json();
	        if (response.ok) {
	            document.getElementById("username").textContent = data.username;
	            document.getElementById("email").textContent = data.email;
	        } else {
	            document.getElementById("message").textContent = "Ошибка: " + data.message;
	        }
	    } catch (error) {
	        console.error("Ошибка получения профиля:", error);
	    }
	}

	getProfile();

	    document.getElementById("profileForm").addEventListener("submit", async (event) => {								// Обработчик для отправки формы с новыми данными
	        event.preventDefault(); 																						// Предотвращаем стандартное поведение формы (перезагрузку страницы)

	        const newUsername = document.getElementById("newUsername").value;
	        const newEmail = document.getElementById("newEmail").value;

	        try {
	            const response = await fetch("https://serpmonn.ru/profile/put", {
	                method: "PUT",
	                headers: {
	                    "Content-Type": "application/json",
	                },
	                credentials: "include", 																				// Важно для куки
	                body: JSON.stringify({
	                    username: newUsername,
	                    email: newEmail,
	                }),
	            });

	            const data = await response.json();
	            if (response.ok) {
	                document.getElementById("message").textContent = "Данные успешно обновлены!";
	                document.getElementById("username").textContent = data.username;
	                document.getElementById("email").textContent = data.email;
	            } else {
	                document.getElementById("message").textContent = "Ошибка: " + data.message;
	            }
	        } catch (error) {
	            console.error("Ошибка обновления профиля:", error);
	            document.getElementById("message").textContent = "Произошла ошибка при обновлении данных.";
	        }
	    });

	document.getElementById("logoutButton").addEventListener("click", async () => {
	    await fetch('https://serpmonn.ru/auth/logout', {
	        method: 'POST',
	        credentials: 'include' 																							// ⬅  ВАЖНО для куки
	    });

	    window.location.href = "https://serpmonn.ru"; 																		// Перенаправление на главную страницу
	});

	document.getElementById("createOnnmailButton").addEventListener("click", () => {
		window.location.href = "https://serpmonn.ru/frontend/onnmail/auth.html";
	});
	
	document.getElementById("loginOnnmailButton").addEventListener("click", () => {
		window.location.href = "https://mail.serpmonn.ru";
	});
});