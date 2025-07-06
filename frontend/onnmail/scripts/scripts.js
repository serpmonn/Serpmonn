const registerForm = document.getElementById('registerForm');
let csrfToken = '';

// Инициализация CSRF токена
const initCSRFToken = async () => {
  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    });
    const data = await response.json();
    csrfToken = data.csrfToken;
  } catch (error) {
    console.error('CSRF Token initialization failed:', error);
  }
};

// Валидация email
const validateEmail = (email) => {
  return email.endsWith('@onnmail.ru');
};

// Обработка регистрации
const handleRegister = async (e) => {
  e.preventDefault();
  const username = registerForm.querySelector('input[type="text"]').value.trim();
  const emailLocalPart = registerForm.querySelector('.email-suffix input').value.trim().toLowerCase();
  const password = registerForm.querySelectorAll('input[type="password"]')[0].value;
  const passwordConfirm = registerForm.querySelectorAll('input[type="password"]')[1].value;
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
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify({ username, emailLocalPart, password })
    });

    const data = await response.json();

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка регистрации');
    }
    
    // Успешная регистрация - редирект на Mailcow
    window.location.href = 'https://mail.serpmonn.ru';
  } catch (error) {
    messageEl.textContent = error.message.includes('already exists') 
      ? 'Почтовый ящик уже существует' 
      : 'Ошибка при регистрации';
    messageEl.style.color = 'red';
  }
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  initCSRFToken();
  registerForm.addEventListener('submit', handleRegister);
});