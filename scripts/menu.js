// menu.js
export function toggleMenu(event) {
    const menuButton = document.getElementById('menuButton');
    const menuContainer = document.getElementById('menuContainer');
    
    if (menuContainer.style.display === 'block') {
        menuContainer.style.display = 'none';
        menuButton.innerHTML = '<span class="s">S</span><span class="n">n</span>';
    } else {
        menuContainer.style.display = 'block';
        menuButton.innerHTML = '<span class="s">Serp</span><span class="n">monn</span>';
    }
}

export function toggleSubmenu(event, submenuId) {
    const submenu = document.getElementById(submenuId);
    if (submenu) {
        submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
    }
}

export function initPWA() {
    let deferredPrompt;
    const installAppButton = document.getElementById('installAppButton');
    const pwaInstructions = document.getElementById('pwaInstructions');
    const closeInstructionsBtn = document.getElementById('closePWAInstructions');
    const confirmInstallBtn = document.getElementById('confirmPWAInstall');

    if (installAppButton && pwaInstructions) {
        installAppButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            pwaInstructions.style.display = 'flex';
        });
    }

    if (closeInstructionsBtn) {
        closeInstructionsBtn.addEventListener('click', () => {
            pwaInstructions.style.display = 'none';
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (confirmInstallBtn) {
            confirmInstallBtn.style.display = 'block';
        }
    });

    if (confirmInstallBtn) {
        confirmInstallBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    pwaInstructions.style.display = 'none';
                }
            }
        });
    }

    // Для iOS (который не поддерживает beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && confirmInstallBtn) {
        confirmInstallBtn.style.display = 'none';
        const iosNote = document.createElement('p');
        iosNote.textContent = 'В iOS используйте меню "Поделиться" → "На экран Домой"';
        iosNote.style.marginTop = '10px';
        confirmInstallBtn.after(iosNote);
    }
}

export function initMenu() {
    // Скрываем поиск в меню, если на странице уже есть основной поиск
    const menuSearch = document.getElementById('menuSearchContainer');
    if (menuSearch && document.querySelector('.main-search-container')) {
        menuSearch.classList.add('hidden');
    }
    // Остальная логика меню...
    const menuButton = document.getElementById('menuButton');
    if (menuButton) {
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu(e);
        });
    }

    document.querySelectorAll('.menu-item[data-submenu]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSubmenu(e, item.getAttribute('data-submenu'));
        });
    });

    document.addEventListener('click', (e) => {
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer && !menuContainer.contains(e.target) && e.target !== menuButton) {
            menuContainer.style.display = 'none';
            menuButton.innerHTML = '<span class="s">S</span><span class="n">n</span>';
        }
    });

    // Инициализация PWA
    initPWA();
}