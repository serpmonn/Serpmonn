export const loadProgress = ({ player, gameArea, gameAreaRect, scoreDisplay, levels, enemies, speed, level, updatePlayerPosition, createEnemies }) => {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        const playerXPercent = gameState.playerXPercent;
        const playerYPercent = gameState.playerYPercent;
        const score = gameState.score;
        speed = gameState.speed;
        level = gameState.level;
        updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
        scoreDisplay.textContent = 'Очки: ' + score;
        createEnemies(levels[level - 1].enemies, { speed, gameArea, enemies });
        return { playerXPercent, playerYPercent, score, speed, level };
    } else {
        createEnemies(levels[0].enemies, { speed, gameArea, enemies });
        return { playerXPercent: 50, playerYPercent: 50, score: 0, speed: 3, level: 1 };
    }
};