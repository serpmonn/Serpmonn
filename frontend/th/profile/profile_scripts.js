import { generateCombinedBackground } from '../scripts/backgroundGenerator.js';                                                				// Импорт генератора фона

document.addEventListener('DOMContentLoaded', () => {                                                                         				// После загрузки DOM
    generateCombinedBackground();                                                                                             				// Генерация фона

    async function getProfile() {                                                                                             				// Получение профиля
        const usernameField = document.getElementById('username');                                                            				// Поле имени
        const emailField = document.getElementById('email');                                                                  				// Поле email
        const messageField = document.getElementById('message');                                                              				// Поле сообщений

        try {
            const response = await fetch('/profile/info', {                                                                   				// Запрос профиля
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();                                                                               				// Данные ответа
            if (response.ok) {                                                                                                				// Успешный ответ
                usernameField.textContent = data.username || '';                                                              				// Установка имени
                emailField.textContent = data.email || '';                                                                    				// Установка email
                // === Тариф и лимиты ===
                const planNameEl = document.getElementById('planName');
                const planStatusEl = document.getElementById('planStatus');
                const planQuotaEl = document.getElementById('planQuota');
                const planHintEl = document.getElementById('planHint');

                const plan = data.plan || 'free';

                if (plan === 'pro') {
                    planNameEl.textContent = 'Pro';

                    if (data.is_pro_active) {
                        const until = data.pro_until
                            ? new Date(data.pro_until).toLocaleDateString('ru-RU')
                            : '';

                        planStatusEl.textContent = until
                            ? `Pro активен до ${until}.`
                            : 'Pro активен.';

                        if (data.quotas && data.quotas.pro_monthly) {
                            const q = data.quotas.pro_monthly;
                            planQuotaEl.textContent =
                                `Использовано ${q.used} из ${q.limit} запросов в этом месяце (${q.month_key}). ` +
                                `Осталось ${q.remaining} запросов.`;
                        } else {
                            planQuotaEl.textContent = 'Месячный лимит Pro: до 2000 запросов.';
                        }

                        planHintEl.innerHTML =
                            'После окончания срока вы автоматически вернётесь на бесплатный тариф. ' +
                            'Подробнее — на <a href="/frontend/tariffs/tariffs.html">странице тарифов</a>.';
                    } else {
                        planStatusEl.textContent =
                            'Pro привязан к аккаунту, но сейчас не активен (срок действия закончился).';
                        planQuotaEl.textContent =
                            'Сейчас действует бесплатный дневной лимит — до 15 запросов в день.';
                        planHintEl.innerHTML =
                            'Продлить Pro можно будет на <a href="/frontend/tariffs/index.html">странице тарифов</a>, когда оплата станет доступна.';
                    }
                } else {
                    // Free
                    planNameEl.textContent = 'Free';
                    planStatusEl.textContent =
                        'Доступен бесплатный тариф с ограничением по числу запросов.';

                    if (data.quotas && data.quotas.free_daily) {
                        const q = data.quotas.free_daily;
                        planQuotaEl.textContent =
                            `Для авторизованных пользователей доступно до ${q.limit} запросов в день. ` +
                            'Счётчик обновляется каждый день.';
                    } else {
                        planQuotaEl.textContent =
                            'Для авторизованных пользователей доступно до 15 запросов в день.';
                    }

                    planHintEl.innerHTML =
                        'Тариф Pro с увеличенным лимитом будет доступен позже на ' +
                        '<a href="/frontend/tariffs/index.html">странице тарифов</a>.';
                }
                if (!data.confirmed) {                                                                                        				// Не подтвержден
                    messageField.textContent = 'Подтвердите ваш аккаунт для создания почтового ящика';                         				// Сообщение
                } else if (data.mailbox_created) {                                                                            				// Почта создана
                    messageField.textContent = 'Вы уже создали почтовый ящик';                                                 				// Сообщение
                }
            } else {                                                                                                          				// Ошибка
                messageField.textContent = data.message || 'Ошибка получения профиля';                                        				// Сообщение ошибки
                if (response.status === 401) {                                                                                				// Не авторизован
                    window.location.href = '../login/login.html';                                                             				// Редирект на логин
                }
            }
        } catch (error) {                                                                                                     				// Сетевая ошибка
            console.error('Ошибка получения профиля:', error);                                                                				// Лог ошибки
            messageField.textContent = 'Ошибка загрузки данных профиля. Попробуйте снова.';                                   				// Сообщение
        }
    }

    async function checkCreateMailboxStatus() {                                                                               				// Проверка статуса почты
        const messageField = document.getElementById('message');                                                              				// Поле сообщений
        try {
            const response = await fetch('/profile/get', {                                                                    				// Запрос статуса
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();                                                                               				// Данные ответа
            if (response.ok) {                                                                                                				// Успех
                window.location.href = './onnmail/onnmail.html';                                                              				// Редирект на страницу создания почты
            } else {                                                                                                          				// Ошибка
                messageField.textContent = data.message || 'Ошибка доступа';                                                  				// Сообщение
                if (response.status === 401) {                                                                                				// Не авторизован
                    window.location.href = '../login/login.html';                                                             				// Редирект на логин
                }
            }
        } catch (error) {                                                                                                     				// Сетевая ошибка
            console.error('Ошибка проверки статуса:', error);                                                                 				// Лог ошибки
            messageField.textContent = 'Ошибка проверки статуса. Попробуйте снова.';                                          				// Сообщение
        }
    }

    getProfile();                                                                                                             				// Загрузка профиля

    document.getElementById('profileForm').addEventListener('submit', async (event) => {                                     				// Отправка формы
        event.preventDefault();                                                                                               				// Отмена отправки
        const newUsername = document.getElementById('newUsername').value;                                                     				// Новое имя
        const newEmail = document.getElementById('newEmail').value;                                                          	 			// Новый email
        const messageField = document.getElementById('message');                                                              				// Поле сообщений

        try {
            const response = await fetch('/profile/update', {                                                                 				// Запрос обновления
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    username: newUsername,
                    email: newEmail,
                }),
            });

            const data = await response.json();                                                                               				// Данные ответа
            if (response.ok) {                                                                                                				// Успех
                messageField.textContent = data.message || 'Данные успешно обновлены!';                                       				// Сообщение
                document.getElementById('username').textContent = newUsername;                                                				// Обновление имени
                document.getElementById('email').textContent = newEmail;                                                      				// Обновление email
            } else {                                                                                                          				// Ошибка
                messageField.textContent = data.message || 'Ошибка обновления профиля';                                       				// Сообщение
            }
        } catch (error) {                                                                                                     				// Сетевая ошибка
            console.error('Ошибка обновления профиля:', error);                                                               				// Лог ошибки
            messageField.textContent = 'Произошла ошибка при обновлении данных.';                                             				// Сообщение
        }
    });

    document.getElementById('logoutButton').addEventListener('click', async () => {                                          				// Выход
        try {
            await fetch('/auth/logout', {                                                                                     				// Запрос выхода
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '/';                                                                                       				// Редирект на главную
        } catch (error) {                                                                                                    	 			// Ошибка
            console.error('Ошибка выхода:', error);                                                                           				// Лог ошибки
            window.location.href = '/';                                                                                       				// Редирект на главную
        }
    });

    document.getElementById('createOnnmailButton').addEventListener('click', () => {                                         				// Создание почты
        checkCreateMailboxStatus();                                                                                           				// Проверка статуса
    });

    document.getElementById('loginOnnmailButton').addEventListener('click', () => {                                          				// Вход в почту
        window.location.href = 'https://serpmonn.ru/mail/';                                                                   				// Редирект на почту
    });
});

// Отслеживание недавно использованных инструментов
(function(){                                                                                                                 				// Изолированный скоуп
    const recent = JSON.parse(localStorage.getItem('serp_tools_recent')||'[]');                                              				// Получение массива

    const cont = document.getElementById('recentTools');                                                                     				// Контейнер
    if (recent.length) {                                                                                                     				// Если есть данные
        const wrap = document.createElement('div');                                                                          				// Обертка
        wrap.innerHTML = '<strong>Недавно использованные:</strong>';                                                         				// Заголовок
        const ul = document.createElement('ul');                                                                             				// Список
        recent.slice(0,5).forEach(item=>{                                                                                    				// Первые 5 элементов
            const li=document.createElement('li');                                                                           				// Элемент списка
            const a=document.createElement('a');                                                                             				// Ссылка
            a.href=item.href;                                                                                                				// URL
            a.textContent=item.title;                                                                                        				// Текст
            li.appendChild(a);                                                                                               				// Добавление ссылки
            ul.appendChild(li);                                                                                              				// Добавление элемента
        });
        wrap.appendChild(ul);                                                                                                				// Добавление списка
        cont.appendChild(wrap);                                                                                              				// Добавление в контейнер
    }

    function trackClicks(sel){                                                                                               				// Отслеживание кликов
        document.querySelectorAll(sel).forEach(a=>{                                                                          				// Все ссылки
            a.addEventListener('click', ()=>{                                                                                				// Слушатель клика
                const arr = JSON.parse(localStorage.getItem('serp_tools_recent')||'[]');                                     				// Получение массива
                arr.unshift({ title:a.textContent.trim(), href:a.getAttribute('href') });                                    				// Добавление элемента
                // Удаление дубликатов и ограничение до 10
                localStorage.setItem('serp_tools_recent', JSON.stringify(arr.filter((v,i,self)=>self.findIndex(x=>x.href===v.href)===i).slice(0,10))); 	// Сохранение
            });
        });
    }
    trackClicks('.tools-grid a');                                                                                            				// Трекинг ссылок
})();
