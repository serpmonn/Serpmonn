	export const updatePlayerPosition = (player, gameAreaRect, playerXPercent, playerYPercent) => {

            const playerX = (gameAreaRect.width * playerXPercent) / 100;                                        // Используем playerXPercent
            const playerY = (gameAreaRect.height * playerYPercent) / 100;                                       // Используем playerYPercent

            player.style.top = playerY + 'px';
            player.style.left = playerX + 'px';
        };
