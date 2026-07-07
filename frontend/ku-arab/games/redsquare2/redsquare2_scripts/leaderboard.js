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

            leaderboardBody.innerHTML = ''; // Очистка таблицы перед обновлением

            data.forEach((entry, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${index + 1}</td><td>${entry.nickname}</td><td>${entry.score}</td>`;

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

