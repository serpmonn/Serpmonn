let debounceTimeout;

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const message = document.createElement('p');
        message.textContent = 'Код скопирован!';
        message.className = 'copy-message';
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 2000);
    });
}

function filterPromos() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categorySelect').value;
    const cards = document.querySelectorAll('.promo-card');
    let visibleCount = 0;
    cards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const cardCategory = card.dataset.category;
        if ((title.includes(search) || search === '') && (cardCategory === category || category === '')) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    let message = document.querySelector('.no-results');
    if (!message) {
        message = document.createElement('p');
        message.className = 'no-results';
        document.getElementById('catalog').prepend(message);
    }
    message.textContent = visibleCount === 0 ? 'Ничего не найдено' : '';
}

let sortAscending = true;
function sortByExpiry() {
    const grid = document.getElementById('catalog');
    const cards = Array.from(grid.children);
    cards.sort((a, b) => {
        const dateA = new Date(a.dataset.expiry);
        const dateB = new Date(b.dataset.expiry);
        return sortAscending ? dateA - dateB : dateB - dateA;
    });
    cards.forEach(card => grid.appendChild(card));
    sortAscending = !sortAscending;
}

document.querySelector('.bonus form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[name="email"]').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const messageEl = document.createElement('p');
    messageEl.className = 'message';
    
    if (!emailRegex.test(email)) {
        messageEl.textContent = 'Пожалуйста, введите корректный email';
        messageEl.style.color = '#ff5252';
        e.target.appendChild(messageEl);
        setTimeout(() => messageEl.remove(), 3000);
        return;
    }

    try {
        const response = await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `email=${encodeURIComponent(email)}`
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const result = await response.json();
        messageEl.textContent = result.message || 'Спасибо за подписку!';
        messageEl.style.color = '#28a745';
        e.target.appendChild(messageEl);
        e.target.reset();
        setTimeout(() => messageEl.remove(), 3000);
    } catch (error) {
        messageEl.textContent = error.message.includes('HTTP error') 
            ? `Ошибка сервера: ${error.message}` 
            : 'Ошибка при подписке. Попробуйте позже.';
        messageEl.style.color = '#ff5252';
        e.target.appendChild(messageEl);
        setTimeout(() => messageEl.remove(), 3000);
    }
});

document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(filterPromos, 300);
});