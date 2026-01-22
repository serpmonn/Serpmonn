// loadPageCount.js
document.addEventListener('DOMContentLoaded', function() {
    fetch('../about-project/page-count.json')
        .then(r => r.json())
        .then(data => {
            const el = document.getElementById('page-count');
            if (el) el.textContent = data.count.toLocaleString('ru-RU');
        })
        .catch(() => {
            const el = document.getElementById('page-count');
            if (el) el.textContent = 'Загрузка..';
        });
});