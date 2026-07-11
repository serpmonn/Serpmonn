// loadStats.js — загружает статистику из JSON, обновляемых count-stats.mjs
document.addEventListener('DOMContentLoaded', function () {
    const BASE = '../about-project/';

    function loadCount(file, elementId, field = 'count') {
        fetch(BASE + file)
            .then(r => r.json())
            .then(data => {
                const el = document.getElementById(elementId);
                const value = data[field];
                if (el && typeof value === 'number') {
                    el.textContent = value.toLocaleString('ru-RU');
                }
            })
            .catch(() => {
                const el = document.getElementById(elementId);
                if (el) el.textContent = '—';
            });
    }

    loadCount('page-count.json', 'page-count');
    loadCount('tools-count.json', 'tools-count');
    loadCount('games-count.json', 'games-count');
    loadCount('partners-count.json', 'partners-count', 'total');
});
