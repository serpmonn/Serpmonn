import { generateCombinedBackground } from '../../scripts/backgroundGenerator.js';

document.addEventListener('DOMContentLoaded', () => {

	generateCombinedBackground();                                                                           				// Запускаем генерацию фона

	// Проверяем, есть ли у пользователя почта
	checkMailboxStatus();
	
	document.getElementById('create-mail-btn').addEventListener('click', function() {
		document.getElementById('mail-form').style.display = 'block';
		this.style.display = 'none';
	});
	
	document.getElementById('submit-mail').addEventListener('click', function() {
		createMailbox();
	});
	
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
});

function checkMailboxStatus() {
	// Здесь запрос к вашему API для проверки наличия почты
	fetch('/api/check-mailbox')
		.then(response => response.json())
		.then(data => {
			if (data.hasMailbox) {
				document.getElementById('mail-status').innerHTML = `
					<p>Ваш почтовый ящик: ${data.email} 
						<a href="https://mail.serpmonn.ru/SOGo" target="_blank">Открыть</a>
					</p>`;
				document.getElementById('create-mail-btn').style.display = 'none';
			}
		});
}

function createMailbox() {
	const password = document.getElementById('mail-password').value;
	const recaptchaResponse = grecaptcha.getResponse();
	
	if (!recaptchaResponse) {
		document.getElementById('mail-message').textContent = 'Пройдите проверку reCAPTCHA';
		return;
	}

	fetch('/api/create-mailbox', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			password: password,
			recaptcha: recaptchaResponse
		})
	})
	.then(response => response.json())
	.then(data => {
		if (data.success) {
			document.getElementById('mail-message').textContent = 'Почтовый ящик успешно создан!';
			document.getElementById('mail-form').style.display = 'none';
			checkMailboxStatus(); // Обновляем статус
		} else {
			document.getElementById('mail-message').textContent = 'Ошибка: ' + data.error;
		}
	})
	.catch((error) => {
		document.getElementById('mail-message').textContent = 'Ошибка сети';
	});
}
