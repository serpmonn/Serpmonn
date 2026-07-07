export const checkCollision = (player, enemies, endGame) => {
    const playerRect = player.getBoundingClientRect();
    for (const enemy of enemies) {
        const enemyRect = enemy.getBoundingClientRect();
        if (
            playerRect.left < enemyRect.right &&
            playerRect.right > enemyRect.left &&
            playerRect.top < enemyRect.bottom &&
            playerRect.bottom > enemyRect.top
        ) {
            player.classList.add('player-collision');
            setTimeout(() => player.classList.remove('player-collision'), 1500);
            endGame();
        }
    }
    const obstacles = document.querySelectorAll('.obstacle');
    for (const obstacle of obstacles) {
        const obstacleRect = obstacle.getBoundingClientRect();
        if (
            playerRect.left < obstacleRect.right &&
            playerRect.right > obstacleRect.left &&
            playerRect.top < obstacleRect.bottom &&
            playerRect.bottom > obstacleRect.top
        ) {
            player.classList.add('player-collision');
            setTimeout(() => player.classList.remove('player-collision'), 1500);
            endGame();
        }
    }
};