import { setCookie, getCookie } from './cookies.js';
import { handleInstallApp, setupInstallEvent, setupInstallAppButton } from './install.js';
import { loadNews } from './news.js';
import { loadBackgroundImage, createPuzzlePieces, updatePuzzlePieces } from './background.js';
import { toggleMenu, toggleSubmenu } from './menu.js';

console.log('JavaScript файл подключен и работает.');

let deferredPrompt;
var menuContainer = document.getElementById('menuContainer');
var menuButton = document.getElementById('menuButton');

document.addEventListener('DOMContentLoaded', () => {
    Promise.all([loadNews(), loadBackgroundImage()]);
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

// Закрытие меню при клике вне его области
document.addEventListener('click', function(event) {
    if (!menuContainer.contains(event.target) && !menuButton.contains(event.target)) {
        menuContainer.style.display = 'none';
        menuButton.innerHTML = '<span class="s">S</span><span class="n">n</span>';
        menuButton.style.width = 'auto';
    }
});

// Закрытие инструкций при клике вне области
    document.addEventListener('click', (event) => {
        if (!installInstructions.contains(event.target) && event.target !== installAppButton) {
            installInstructions.style.display = 'none';
        }
    });

window.addEventListener('beforeinstallprompt', (e) => {
    // Сохраняем событие
    deferredPrompt = e;
    e.prompt();
});

