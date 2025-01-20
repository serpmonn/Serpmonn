export function toggleMenu(event) {
    var menuButton = document.getElementById('menuButton');
    var menuContainer = document.getElementById('menuContainer');
    if (menuContainer.style.display === 'block') {
        menuContainer.style.display = 'none';
        menuButton.innerHTML = '<span class="s">S</span><span class="n">n</span>';
        menuButton.style.width = 'auto';
    } else {
        menuContainer.style.display = 'block';
        menuButton.innerHTML = '<span class="s">Serp</span><span class="n">monn</span>';
        menuButton.style.width = 'auto';
    }
}

export function toggleSubmenu(event, submenuId) {
    var submenu = document.getElementById(submenuId);
    if (submenu) {
        if (submenu.style.display === 'block') {
            submenu.style.display = 'none';
        } else {
            submenu.style.display = 'block';
        }
    } else {
        console.error(`Submenu with ID ${submenuId} not found.`);
    }
}

