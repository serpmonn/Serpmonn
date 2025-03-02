import { setCookie, getCookie } from './cookies.js';
import { handleInstallApp, setupInstallEvent, setupInstallAppButton } from './install.js';
import { loadNews } from './news.js';
import { generateCombinedBackground } from './backgroundGenerator.js';
import { toggleMenu, toggleSubmenu } from './menu.js';

console.log('JavaScript файл подключен и работает.');

let deferredPrompt;
var menuContainer = document.getElementById('menuContainer');
var menuButton = document.getElementById('menuButton');

document.addEventListener('DOMContentLoaded', () => {
    Promise.allSettled([loadNews(), generateCombinedBackground()])
        .then(results => {
            results.forEach(result => {
                if (result.status === 'rejected') {
                    console.error('Ошибка:', result.reason);
                }
            });
        });
});

document.getElementById("news-container").addEventListener("click", function () {
    this.classList.toggle("expanded");
});

document.getElementById('menuButton').addEventListener('click', function(event) {
    event.stopPropagation();
    toggleMenu(event);
});

document.querySelectorAll('.menu-item').forEach(function(item) {
    item.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        const submenuId = item.getAttribute('data-submenu');
        if (submenuId) {
            toggleSubmenu(event, submenuId);
        } else if (item.id === 'installAppButton') {
            handleInstallApp();
        }
    });
});

document.addEventListener('click', function(event) {                                                                    // Закрытие меню при клике вне его области
    if (!menuContainer.contains(event.target) && !menuButton.contains(event.target)) {
        menuContainer.style.display = 'none';
        menuButton.innerHTML = '<span class="s">S</span><span class="n">n</span>';
        menuButton.style.width = 'auto';
    }
});

document.addEventListener('click', (event) => {                                                                     // Закрытие инструкций при клике вне области
    if (!installInstructions.contains(event.target) && event.target !== installAppButton) {
        installInstructions.style.display = 'none';
    }
});

window.addEventListener('beforeinstallprompt', (e) => {
    deferredPrompt = e;                                                                                                 // Сохраняем событие
    e.prompt();
});

