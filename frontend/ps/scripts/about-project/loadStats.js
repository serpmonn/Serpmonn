// loadStats.js — загружает страницы и партнёров из JSON, записанных кроном
document.addEventListener('DOMContentLoaded', function () {
    const BASE = '../about-project/';

    // Страницы
    fetch(BASE + 'page-count.json')
        .then(r => r.json())
        .then(data => {
            const el = document.getElementById('page-count');
            if (el) el.textContent = data.count.toLocaleString('ru-RU');
        })
        .catch(() => {
            const el = document.getElementById('page-count');
            if (el) el.textContent = '—';
        });

    // Партнёры
    fetch(BASE + 'partners-count.json')
        .then(r => r.json())
        .then(data => {
            const el = document.getElementById('partners-count');
            if (el) el.textContent = data.total.toLocaleString('ru-RU');
        })
        .catch(() => {
            const el = document.getElementById('partners-count');
            if (el) el.textContent = '—';
        });
});
