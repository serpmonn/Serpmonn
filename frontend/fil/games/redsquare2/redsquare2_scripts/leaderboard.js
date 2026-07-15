export function loadLeaderboard() {
    // Загружаем данные с сервера и обновляем таблицу
    console.log('🔄 Загружаем таблицу лидеров...');
    fetch('https://www.serpmonn.ru/backend/games/redsquare2/leaderboard')
        .then(response => {
            console.log('📡 Ответ сервера:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('📊 Получены данные:', data);
            const leaderboardBody = document.getElementById('leaderboardBody');

            leaderboardBody.replaceChildren();

            data.forEach((entry, index) => {
                const row = document.createElement('tr');
                const rank = document.createElement('td');
                rank.textContent = String(index + 1);
                const nick = document.createElement('td');
                nick.textContent = String(entry.nickname ?? '');
                const score = document.createElement('td');
                score.textContent = String(entry.score ?? '');
                row.append(rank, nick, score);
                leaderboardBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке данных:', error);
        });
}

document.addEventListener('DOMContentLoaded', () => {
    loadLeaderboard();
});
