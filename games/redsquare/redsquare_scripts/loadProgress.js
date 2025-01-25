	export const loadProgress = ({ player, gameAreaRect, scoreDisplay, levels, enemies, speed, level, updatePlayerPosition, createEnemies }) => {
	    const savedState = localStorage.getItem('gameState');
	    if (savedState) {
	        const gameState = JSON.parse(savedState);

	        // Загружаем состояние
	        const playerXPercent = gameState.playerXPercent;
	        const playerYPercent = gameState.playerYPercent;
	        const score = gameState.score;
	        speed = gameState.speed;
	        level = gameState.level;

	        // Обновляем положение игрока
	        updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);

	        // Обновляем отображение очков
	        scoreDisplay.textContent = 'Очки: ' + score;

	        // Создаём врагов для текущего уровня
	        createEnemies(levels[level - 1].enemies, { speed, gameArea: gameAreaRect, enemies });

	        return { playerXPercent, playerYPercent, score, speed, level }; // Возвращаем новое состояние
	    } else {
	        // Если сохранённое состояние отсутствует, создаём врагов для первого уровня
	        createEnemies(levels[0].enemies, { speed, gameArea: gameAreaRect, enemies });

	        return { playerXPercent: 50, playerYPercent: 50, score: 0, speed: 3, level: 1 };
	    }
	};

