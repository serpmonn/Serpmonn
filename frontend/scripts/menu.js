export function toggleMenu(event) {
    const menuButton = document.getElementById('menuButton');
    const menuContainer = document.getElementById('menuContainer');
    
    if (menuContainer.classList.contains('active')) {
        menuContainer.classList.remove('active');
        menuButton.innerHTML = '<span class="s">S</span><span class="n">n</span>';
        menuContainer.setAttribute('aria-hidden', 'true');
        menuButton.setAttribute('aria-expanded', 'false');
        
        // Закрываем все подменю при закрытии главного меню
        document.querySelectorAll('.submenu-container').forEach(sub => {
            sub.classList.remove('active');
            sub.setAttribute('aria-hidden', 'true');
            const parent = document.querySelector(`[data-submenu="${sub.id}"]`);
            if (parent) {
                parent.setAttribute('aria-expanded', 'false');
                parent.setAttribute('aria-hidden', 'true');
            }
        });
    } else {
        menuContainer.classList.add('active');
        menuButton.innerHTML = '<span class="s">Serp</span><span class="n">monn</span>';
        menuContainer.setAttribute('aria-hidden', 'false');
        menuButton.setAttribute('aria-expanded', 'true');
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
                sub.setAttribute('aria-hidden', 'true');
                const parent = document.querySelector(`[data-submenu="${sub.id}"]`);
                if (parent) {
                    parent.setAttribute('aria-expanded', 'false');
                    parent.setAttribute('aria-hidden', 'true');
                }
            }
        });
        
        // Переключаем текущее подменю
        submenu.classList.toggle('active');
        submenu.setAttribute('aria-hidden', submenu.classList.contains('active') ? 'false' : 'true');
        menuItem.setAttribute('aria-expanded', isOpen);
        menuItem.setAttribute('aria-hidden', 'false');
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
            pwaInstructions.setAttribute('aria-hidden', 'false');
        });
    }

    if (closeInstructionsBtn) {
        closeInstructionsBtn.addEventListener('click', () => {
            pwaInstructions.style.display = 'none';
            pwaInstructions.setAttribute('aria-hidden', 'true');
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
                    pwaInstructions.setAttribute('aria-hidden', 'true');
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
        menuSearch.setAttribute('aria-hidden', 'true');
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
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSubmenu({ currentTarget: item }, item.getAttribute('data-submenu'));
            }
        });
    });

    // Обработчик переключения языка
    document.addEventListener('click', (e) => {
        const langLink = e.target.closest('[data-lang]');
        if (langLink) {
            e.preventDefault();
            const lang = langLink.dataset.lang;
            localStorage.setItem('spn_lang', lang);
            // Навигация на языкозависимый URL для SEO
            const current = new URL(window.location.href);
            const inEn = current.pathname.startsWith('/frontend/en');
            if (lang === 'en') {
                if (!inEn) {
                    const target = current.pathname === '/frontend/main.html' || current.pathname === '/' ? '/frontend/en/' : '/frontend/en/';
                    window.location.href = target;
                } else {
                    window.location.reload();
                }
            } else {
                if (inEn) {
                    window.location.href = '/';
                } else {
                    window.location.reload();
                }
            }
        }
    });

    // Обработчики для кнопок доступности
    document.addEventListener('click', (e) => {
        const toggle = e.target.closest('.a11y-toggle');
        if (toggle) {
            e.preventDefault();
            const setting = toggle.dataset.setting;
            if (setting && window.toggleA11ySetting) {
                window.toggleA11ySetting(setting);
            }
        }
    });
    document.addEventListener('keydown', (e) => {
        const toggle = e.target.closest && e.target.closest('.a11y-toggle');
        if (toggle && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            const setting = toggle.dataset.setting;
            if (setting && window.toggleA11ySetting) {
                window.toggleA11ySetting(setting);
            }
        }
    });

    // Закрытие меню при клике вне его области
    document.addEventListener('click', (e) => {
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer && menuContainer.classList.contains('active')) {
            // Проверяем, что клик не внутри меню и не на кнопку меню
            if (!menuContainer.contains(e.target) && e.target !== menuButton) {
                menuContainer.classList.remove('active');
                menuContainer.setAttribute('aria-hidden', 'true');
                menuButton.innerHTML = '<span class="s">S</span><span class="n">n</span>';
                menuButton.setAttribute('aria-expanded', 'false');
                
                // Закрываем все подменю
                document.querySelectorAll('.submenu-container').forEach(sub => {
                    sub.classList.remove('active');
                    sub.setAttribute('aria-hidden', 'true');
                    const parent = document.querySelector(`[data-submenu="${sub.id}"]`);
                    if (parent) {
                        parent.setAttribute('aria-expanded', 'false');
                        parent.setAttribute('aria-hidden', 'true');
                    }
                });
            }
        }
    });

    // Инициализация PWA
    initPWA();
    
    // Инициализация доступности
    if (window.initA11y) {
        window.initA11y();
    }
}