	export const loadProgress = ({ player, gameArea, gameAreaRect, scoreDisplay, levels, enemies, speed, level, updatePlayerPosition, createEnemies }) => {
	    const savedState = localStorage.getItem('gameState');
	    if (savedState) {
	        const gameState = JSON.parse(savedState);

	        const playerXPercent = gameState.playerXPercent;																							        // Загружаем состояние
	        const playerYPercent = gameState.playerYPercent;
	        const score = gameState.score;
	        speed = gameState.speed;
	        level = gameState.level;

	        updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);																			// Обновляем положение игрока

	        scoreDisplay.textContent = 'Очки: ' + score;																										// Обновляем отображение очков

	        createEnemies(levels[level - 1].enemies, { speed, gameArea, enemies });																				// Создаём врагов для текущего уровня

	        return { playerXPercent, playerYPercent, score, speed, level }; 																					// Возвращаем новое состояние
	    } else {
	        createEnemies(levels[0].enemies, { speed, gameArea, enemies });																						// Если сохранённое состояние отсутствует, создаём врагов для первого уровня

	        return { playerXPercent: 50, playerYPercent: 50, score: 0, speed: 3, level: 1 };
	    }
	};

