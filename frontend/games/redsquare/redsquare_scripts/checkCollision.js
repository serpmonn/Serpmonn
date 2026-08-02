export const checkCollision = (player, enemies, onHit, { invincible = false } = {}) => {
    if (invincible) return false;
    const playerRect = player.getBoundingClientRect();
    for (const enemy of enemies) {
        const enemyRect = enemy.getBoundingClientRect();
        if (
            playerRect.left < enemyRect.right &&
            playerRect.right > enemyRect.left &&
            playerRect.top < enemyRect.bottom &&
            playerRect.bottom > enemyRect.top
        ) {
            onHit();
            return true;
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
            onHit();
            return true;
        }
    }
    return false;
};
