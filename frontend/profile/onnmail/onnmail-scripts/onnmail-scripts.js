const registerForm = document.getElementById('registerForm');
const statusMessage = document.getElementById('statusMessage');
let csrfToken = '';

// Проверка статуса пользователя
const checkUserStatus = async () => {
    try {
        console.log('Отправка запроса /profile/get с credentials: include');
        const response = await fetch('https://www.serpmonn.ru/profile/get', {
            credentials: 'include'
        });
        console.log('Ответ /profile/get:', response.status, response.statusText);
        if (!response.ok) {
            const data = await response.json();
            if (response.status === 401) {
                statusMessage.textContent = data.message || 'Пожалуйста, войдите в аккаунт';
                window.location.href = '/frontend/login/login.html';
                return false;
            }
            if (response.status === 403) {
                statusMessage.textContent = data.message || 'Ошибка доступа';
                return false;
            }
            throw new Error('Не авторизован');
        }
        const data = await response.json();
        console.log('Данные профиля:', data);
        if (!data.confirmed) {
            statusMessage.textContent = 'Подтвердите ваш аккаунт перед регистрацией почтового ящика';
            return false;
        }
        if (data.mailbox_created) {
            statusMessage.textContent = 'Вы уже создали почтовый ящик';
            return false;
        }
        registerForm.style.display = 'block';
        return true;
    } catch (error) {
        console.error('Ошибка проверки статуса:', error);
        statusMessage.textContent = 'Ошибка загрузки данных. Попробуйте снова.';
        return false;
    }
};

// Инициализация CSRF токена
const initCSRFToken = async () => {
    try {
        console.log('Запрос CSRF-токена на /api/csrf-token');
        const response = await fetch('https://www.serpmonn.ru/api/csrf-token', {
            credentials: 'include'
        });
        console.log('Ответ /api/csrf-token:', response.status, response.statusText);
        if (!response.ok) {
            throw new Error(`Ошибка получения CSRF-токена: ${response.statusText}`);
        }
        const data = await response.json();
        csrfToken = data.csrfToken;
    } catch (error) {
        console.error('CSRF Token initialization failed:', error);
        statusMessage.textContent = 'Ошибка загрузки формы. Попробуйте снова.';
    }
};

// Обработка регистрации
const handleRegister = async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const emailLocalPart = document.getElementById('emailLocalPart').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    const messageEl = document.getElementById('registerMessage');
    messageEl.textContent = '';

    // Валидация
    if (password !== passwordConfirm) {
        messageEl.textContent = 'Пароли не совпадают!';
        return;
    }
    if (!emailLocalPart || !username || !password) {
        messageEl.textContent = 'Заполните все поля!';
        return;
    }
    if (!/^[a-z0-9._%+-]+$/.test(emailLocalPart)) {
        messageEl.textContent = 'Логин может содержать только латинские буквы, цифры и символы ._%+-';
        return;
    }
    if (password.length < 8) {
        messageEl.textContent = 'Пароль должен содержать минимум 8 символов';
        return;
    }

    try {
        console.log('Отправка запроса /mail-api/create-mailbox');
        const response = await fetch('https://serpmonn.ru/mail-api/create-mailbox', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ username, emailLocalPart, password })
        });

        console.log('Ответ /mail-api/create-mailbox:', response.status, response.statusText);
        const data = await response.json();

        if (!response.ok) {
            messageEl.textContent = data.message || 'Ошибка регистрации';
            messageEl.style.color = 'red';
            return;
        }
        
        // Успешная регистрация - редирект на Mailcow
        window.location.href = 'https://mail.serpmonn.ru';
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        messageEl.textContent = error.message.includes('already exists') 
            ? 'Почтовый ящик уже существует' 
            : error.message;
        messageEl.style.color = 'red';
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    await initCSRFToken();
    const canRegister = await checkUserStatus();
    if (canRegister) {
        registerForm.addEventListener('submit', handleRegister);
    }
});