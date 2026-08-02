export const updatePlayerPosition = (player, gameAreaRect, playerXPercent, playerYPercent) => {
    if (!player || !gameAreaRect?.width || !gameAreaRect?.height) return;
    const playerX = (gameAreaRect.width * playerXPercent) / 100;
    const playerY = (gameAreaRect.height * playerYPercent) / 100;
    player.style.transform = 'none';
    player.style.top = `${playerY}px`;
    player.style.left = `${playerX}px`;
};
