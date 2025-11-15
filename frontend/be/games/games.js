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

    // === 4. ФИЛЬТР ПК/ВЕБ ===
    const filterButtons = document.querySelectorAll('.filter-btn');
    const grids = document.querySelectorAll('.grid');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;

            filterButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            grids.forEach(grid => {
                const category = grid.dataset.category;
                if (filter === 'all' || filter === category) {
                    grid.classList.remove('hidden');
                } else {
                    grid.classList.add('hidden');
                }
            });
        });
    });

// === 5. Обработка рекламы ===
const adContainer = document.querySelector('.ad-leaderboard');
if (adContainer) {
    let adVisible = false;

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.tagName === 'IFRAME') {
                    const src = node.src || '';
                    if (src.includes('mail.ru') || src.includes('mrg-tag') || node.offsetHeight > 0) {
                        adVisible = true;
                        adContainer.style.display = 'flex';
                        observer.disconnect();
                        return;
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
        if (!adVisible) {
            const iframe = document.querySelector('iframe[src*="mail.ru"], iframe[src*="mrg"]');
            if (!iframe || iframe.offsetHeight === 0) {
                adContainer.style.display = 'none';
            }
        }
        observer.disconnect();
    }, 6000);
}

    // === 6. Аналитика ===
    document.querySelectorAll('.card a.btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.card');
            const gameName = card.querySelector('h2 span').textContent.trim();
            const category = card.closest('section').querySelector('.category-title').textContent.trim();

            if (window.ym) {
                window.ym(104905836, 'reachGoal', 'game_click', {
                    game_name: gameName,
                    game_category: category
                });
            }
        });
    });
});