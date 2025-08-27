// Исправленный импорт
import { initMenu } from './menu.js';

// Загружаем меню ПЕРВЫМ делом
fetch('/menu.html')                                                                     // Путь из папки about-project
    .then(response => {
        if (!response.ok) throw new Error('Меню не найдено');
        return response.text();
    })
    .then(html => {
        document.body.insertAdjacentHTML('afterbegin', html);
        
        // Только после вставки меню проверяем поиск
        if (document.querySelector('.gcse-searchbox-only') && !window.__gcse) {
            const script = document.createElement('script');
            script.src = 'https://cse.google.com/cse.js?cx=97e62541ff5274a28';
            script.async = true;
            document.body.appendChild(script);
        }
        // Глобально подключаем доступность, чтобы пункт "Доступность" работал везде
        (function ensureA11y(){
            const id = 'spn-a11y-loader';
            if (!document.getElementById(id)) {
                const s = document.createElement('script');
                s.id = id;
                s.src = '/scripts/accessibility.js';
                s.defer = true;
                document.body.appendChild(s);
            }
        })();
        
        initMenu();
    })
    .catch(err => console.error('Ошибка загрузки меню:', err));