export function loadLeaderboard() {
    // Загружаем данные с сервера и обновляем таблицу
    console.log('🔄 Loading leaderboard...');
    fetch('https://www.serpmonn.ru/backend/games/redsquare2/leaderboard')
        .then(response => {
            console.log('📡 Server response:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('📊 Data received:', data);
            const leaderboardBody = document.getElementById('leaderboardBody');

            leaderboardBody.innerHTML = ''; // Clear table before update

            data.forEach((entry, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${index + 1}</td><td>${entry.nickname}</td><td>${entry.score}</td>`;

                leaderboardBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading data:', error);
        });
}

document.addEventListener('DOMContentLoaded', () => {
    loadLeaderboard();
});

