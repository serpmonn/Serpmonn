// menu.js
export function toggleMenu(event) {
    const menuButton = document.getElementById('menuButton');
    const menuContainer = document.getElementById('menuContainer');
    
    if (menuContainer.classList.contains('active')) {
        menuContainer.classList.remove('active');
        menuButton.innerHTML = '<span class="s">S</span><span class="n">n</span>';
        // Закрываем все подменю при закрытии главного меню
        document.querySelectorAll('.submenu-container').forEach(sub => {
            sub.classList.remove('active');
            const parent = document.querySelector(`[data-submenu="${sub.id}"]`);
            if (parent) parent.setAttribute('aria-expanded', 'false');
        });
    } else {
        menuContainer.classList.add('active');
        menuButton.innerHTML = '<span class="s">Serp</span><span class="n">monn</span>';
    }
}

export function toggleSubmenu(event, submenuId) {
    const submenu = document.getElementById(submenuId);
    const menuItem = event.currentTarget;
    if (submenu) {
        const parentSubmenu = menuItem.closest('.submenu-container');
        const isOpen = submenu.classList.contains('active') ? false : true;
        
        // Закрываем все подменю, кроме текущего и его родительских
        document.querySelectorAll('.submenu-container').forEach(sub => {
            if (sub !== submenu && (!parentSubmenu || !parentSubmenu.contains(sub))) {
                sub.classList.remove('active');
                const parent = document.querySelector(`[data-submenu="${sub.id}"]`);
                if (parent) parent.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Переключаем текущее подменю
        submenu.classList.toggle('active');
        menuItem.setAttribute('aria-expanded', isOpen);
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
    const menuSearch = document.getElementById('menuSearchContainer');
    if (menuSearch && document.querySelector('.main-search-container')) {
        menuSearch.classList.add('hidden');
    }

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

    // Обработчик переключения языка
    document.addEventListener('click', (e) => {
        const langLink = e.target.closest('[data-lang]');
        if (langLink) {
            e.preventDefault();
            const lang = langLink.dataset.lang;
            localStorage.setItem('spn_lang', lang);
            window.location.reload();
        }
    });
}