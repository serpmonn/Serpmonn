// games.js - Функциональность страницы игр Serpmonn

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = document.querySelectorAll('.card');

    // === 1. Анимация появления ===
    cards.forEach((card, i) => {
        if (reducedMotion) {
            card.style.opacity = '1';
            card.style.transform = 'none';
            return;
        }
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'opacity .5s ease, transform .5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + i * 50);
    });

    // === 2. Клик по карточке (БЕЗ debounce) ===
    const handleCardAction = (card) => {
        const link = card.querySelector('a.btn');
        if (link) {
            window.open(link.href, '_blank', 'noopener');
        }
    };

    cards.forEach(card => {
        card.setAttribute('tabindex', '0');

        card.addEventListener('click', (e) => {
            if (!e.target.closest('a.btn')) {
                e.preventDefault();
                handleCardAction(card);
            }
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardAction(card);
            }
        });
    });

    // === 3. Стили фокуса ===
    const style = document.createElement('style');
    style.textContent = `
        .card:focus-visible { outline: 2px solid #dc3545; outline-offset: 2px; }
        .card a.btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    `;
    document.head.appendChild(style);

    // === 4. ФИЛЬТР: источник (Serpmonn/партнёры) или платформа (веб/ПК/моб.) ===
    const filterButtons = document.querySelectorAll('.filter-btn');
    const groups = document.querySelectorAll('.games-group');
    const GROUP_FILTERS = new Set(['serpmonn', 'partners']);
    const PLATFORM_FILTERS = new Set(['web', 'pc', 'mobile']);

    const applyFilter = (filter) => {
        groups.forEach(section => {
            const group = section.dataset.group;
            const platforms = section.querySelectorAll('.platform-block');

            if (filter === 'all') {
                section.classList.remove('hidden');
                platforms.forEach(p => p.classList.remove('hidden'));
                return;
            }

            if (GROUP_FILTERS.has(filter)) {
                section.classList.toggle('hidden', group !== filter);
                platforms.forEach(p => p.classList.remove('hidden'));
                return;
            }

            if (PLATFORM_FILTERS.has(filter)) {
                let anyVisible = false;
                platforms.forEach(p => {
                    const match = p.dataset.platform === filter;
                    p.classList.toggle('hidden', !match);
                    if (match) anyVisible = true;
                });
                section.classList.toggle('hidden', !anyVisible);
            }
        });
    };

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;

            filterButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            applyFilter(filter);
        });
    });

    // === 6. Аналитика ===
    document.querySelectorAll('.card a.btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.card');
            const nameEl = card.querySelector('h2 span[itemprop="name"], h2 span:last-child');
            const gameName = nameEl ? nameEl.textContent.trim() : '';
            const groupTitle = card.closest('.games-group')?.querySelector('.group-title')?.textContent.trim() || '';
            const platformTitle = card.closest('.platform-block')?.querySelector('.platform-title')?.textContent.trim() || '';

            if (window.ym) {
                window.ym(104905836, 'reachGoal', 'game_click', {
                    game_name: gameName,
                    game_category: groupTitle,
                    game_platform: platformTitle
                });
            }
        });
    });
});