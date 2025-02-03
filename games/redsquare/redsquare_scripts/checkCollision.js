	export const checkCollision = (player, enemies, endGame) => {
	    const playerRect = player.getBoundingClientRect(); 					// Получаем размеры и координаты игрока
	    for (const enemy of enemies) {
		 const enemyRect = enemy.getBoundingClientRect(); 				// Получаем размеры и координаты текущего врага
	        if (
	            playerRect.left < enemyRect.right &&
	            playerRect.right > enemyRect.left &&
	            playerRect.top < enemyRect.bottom &&
	            playerRect.bottom > enemyRect.top
	        ) {
	            endGame();
	        }
	    }
	};
