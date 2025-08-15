	export function loadLeaderboard() {							// Загружаем данные с сервера и обновляем таблицу
	    fetch('https://www.serpmonn.ru/leaderboard')
	        .then(response => response.json())
	        .then(data => {
	            const leaderboardBody = document.getElementById('leaderboardBody');
	            leaderboardBody.innerHTML = ''; 						// Очистка таблицы перед обновлением
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

