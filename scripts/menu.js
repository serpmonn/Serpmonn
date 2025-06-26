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
}