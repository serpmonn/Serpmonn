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
  if (!cookieConsent || !acceptCookiesButton || !declineCookiesButton) return;

  const cookiesAccepted = getCookie('cookies_accepted');

  // Если куки ещё не приняты — показываем баннер
  if (!cookiesAccepted) {
    cookieConsent.style.display = 'block';
  }

  acceptCookiesButton.addEventListener('click', () => {
    setCookie('cookies_accepted', 'true', 365);
    cookieConsent.style.display = 'none';

    // Опционально: короткое визуальное подтверждение для пользователя
    // showCookiesToast('Куки приняты');
  });

  declineCookiesButton.addEventListener('click', () => {
    cookieConsent.style.display = 'none';
    // Здесь можно добавить логику для "отклонить" (например, не грузить аналитики)
  });
});