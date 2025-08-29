const cookieConsent = document.getElementById('cookie-consent');
const acceptCookiesButton = document.getElementById('accept-cookies');
const declineCookiesButton = document.getElementById('decline-cookies');

export function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
}

document.addEventListener('DOMContentLoaded', () => {

    if (cookieConsent && acceptCookiesButton && declineCookiesButton) {                             // Проверяем, было ли ранее принято использование куки
        const cookiesAccepted = getCookie('cookies_accepted');
        console.log("Проверка куки 'cookies_accepted':", cookiesAccepted);

        if (!cookiesAccepted) {                                                                     // Если куки не было принято, отображаем уведомление
            cookieConsent.style.display = 'block';
        }

        acceptCookiesButton.addEventListener('click', () => {                                       // Обрабатываем событие клика по кнопке "Принять куки"
            setCookie('cookies_accepted', 'true', 365);                                             // Устанавливаем куки с флагом принятия на 365 дней
            console.log("Куки 'cookies_accepted' установлено");

            cookieConsent.style.display = 'none';                                                   // Скрываем уведомление
            console.log("Политика принята, уведомление скрыто.");
        });

        declineCookiesButton.addEventListener('click', () => {                                      // Обрабатываем событие клика по кнопке "Отклонить куки"
            cookieConsent.style.display = 'none';                                                   // Скрываем уведомление
            console.log("Политика отклонена, уведомление скрыто.");
        });
    }
});

