export const createEnemies = (num, { speed, gameArea, enemies }) => {
    for (let i = 1; i <= num; i++) {
        const enemy = document.createElement('div');
        const isFast = Math.random() > 0.5;
        enemy.classList.add(isFast ? 'enemy-fast' : 'enemy-slow');
        enemy.id = `enemy${i}`;
        enemy.style.animationDuration = `${speed * (isFast ? 0.7 : 1.3)}s`;
        enemy.style.animationName = `move${i}`;
        gameArea.appendChild(enemy);
        enemies.push(enemy);
    }
};