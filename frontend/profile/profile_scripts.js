document.addEventListener('DOMContentLoaded', () => {
	async function getProfile() {
	    try {
	        const response = await fetch("https://serpmonn.ru/profile/get", {
	            method: "GET",
	            credentials: "include" 										// ⬅️ ВАЖНО для куки
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

		// Обработчик для отправки формы с новыми данными
	    document.getElementById("profileForm").addEventListener("submit", async (event) => {
	        event.preventDefault(); 										// Предотвращаем стандартное поведение формы (перезагрузку страницы)

	        const newUsername = document.getElementById("newUsername").value;
	        const newEmail = document.getElementById("newEmail").value;

	        try {
	            const response = await fetch("https://serpmonn.ru/profile/put", {
	                method: "PUT",
	                headers: {
	                    "Content-Type": "application/json",
	                },
	                credentials: "include", 									// Важно для куки
	                body: JSON.stringify({
	                    newUsername: newUsername,
	                    newEmail: newEmail,
	                }),
	            });

	            const data = await response.json();
	            if (response.ok) {
	                document.getElementById("message").textContent = "Данные успешно обновлены!";
	                // Обновим профиль на странице
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
	        credentials: 'include' 											// ⬅️ ВАЖНО для куки
	    });

	    window.location.href = "https://serpmonn.ru"; 								// Перенаправление на главную страницу
	});
});
