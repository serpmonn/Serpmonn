import { formatScore } from './i18n.js';

export const loadProgress = ({ player, gameArea, gameAreaRect, scoreDisplay, levels, enemies, speed, level, updatePlayerPosition, createEnemies }) => {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        const playerXPercent = gameState.playerXPercent;
        const playerYPercent = gameState.playerYPercent;
        const score = gameState.score;
        speed = gameState.speed;
        level = gameState.level;
        const lives = gameState.lives;
        updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
        scoreDisplay.textContent = formatScore(score);
        createEnemies(levels[Math.min(level, levels.length) - 1].enemies, { speed, gameArea, enemies });
        return { playerXPercent, playerYPercent, score, speed, level, lives };
    }
    createEnemies(levels[0].enemies, { speed, gameArea, enemies });
    return { playerXPercent: 50, playerYPercent: 50, score: 0, speed: 3, level: 1, lives: 3 };
};
