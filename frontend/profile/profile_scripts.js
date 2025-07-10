import { generateCombinedBackground } from '/scripts/backgroundGenerator.js';

document.addEventListener('DOMContentLoaded', () => {
    generateCombinedBackground(); // Запускаем генерацию фона

    async function getProfile() {
        const usernameField = document.getElementById('username');
        const emailField = document.getElementById('email');
        const messageField = document.getElementById('message');

        try {
            console.log('Отправка запроса /profile/info с credentials: include');
            const response = await fetch('https://www.serpmonn.ru/profile/info', {
                method: 'GET',
                credentials: 'include'
            });
            console.log('Ответ /profile/info:', response.status, response.statusText);

            const data = await response.json();
            if (response.ok) {
                usernameField.textContent = data.username || '';
                emailField.textContent = data.email || '';
                if (!data.confirmed) {
                    messageField.textContent = 'Подтвердите ваш аккаунт для создания почтового ящика';
                } else if (data.mailbox_created) {
                    messageField.textContent = 'Вы уже создали почтовый ящик';
                }
            } else {
                messageField.textContent = data.message || 'Ошибка получения профиля';
                if (response.status === 401) {
                    window.location.href = '/frontend/login/login.html';
                }
            }
        } catch (error) {
            console.error('Ошибка получения профиля:', error);
            messageField.textContent = 'Ошибка загрузки данных профиля. Попробуйте снова.';
        }
    }

    async function checkCreateMailboxStatus() {
        const messageField = document.getElementById('message');
        try {
            console.log('Отправка запроса /profile/get для проверки статуса');
            const response = await fetch('https://www.serpmonn.ru/profile/get', {
                method: 'GET',
                credentials: 'include'
            });
            console.log('Ответ /profile/get:', response.status, response.statusText);

            const data = await response.json();
            if (response.ok) {
                // Пользователь подтверждён и без ящика, можно перенаправить
                window.location.href = 'https://www.serpmonn.ru/frontend/profile/onnmail/onnmail.html';
            } else {
                messageField.textContent = data.message || 'Ошибка доступа';
                if (response.status === 401) {
                    window.location.href = '/frontend/login/login.html';
                }
            }
        } catch (error) {
            console.error('Ошибка проверки статуса:', error);
            messageField.textContent = 'Ошибка проверки статуса. Попробуйте снова.';
        }
    }

    getProfile();

    document.getElementById('profileForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const newUsername = document.getElementById('newUsername').value;
        const newEmail = document.getElementById('newEmail').value;
        const messageField = document.getElementById('message');

        try {
            console.log('Отправка запроса /profile/update');
            const response = await fetch('https://www.serpmonn.ru/profile/update', {
                method: 'POST', // Исправлено с PUT на POST, так как сервер ожидает POST
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    username: newUsername,
                    email: newEmail,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                messageField.textContent = data.message || 'Данные успешно обновлены!';
                document.getElementById('username').textContent = newUsername;
                document.getElementById('email').textContent = newEmail;
            } else {
                messageField.textContent = data.message || 'Ошибка обновления профиля';
            }
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            messageField.textContent = 'Произошла ошибка при обновлении данных.';
        }
    });

    document.getElementById('logoutButton').addEventListener('click', async () => {
        try {
            await fetch('https://www.serpmonn.ru/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = 'https://www.serpmonn.ru';
        } catch (error) {
            console.error('Ошибка выхода:', error);
            window.location.href = 'https://www.serpmonn.ru';
        }
    });

    document.getElementById('createOnnmailButton').addEventListener('click', () => {
        checkCreateMailboxStatus();
    });

    document.getElementById('loginOnnmailButton').addEventListener('click', () => {
        window.location.href = 'https://mail.serpmonn.ru';
    });
});