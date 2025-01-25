	import { generateCombinedBackground } from '../../../scripts/backgroundGenerator.js';

	const player = document.getElementById('player');
	const playerSize = player.getBoundingClientRect().width; // Получаем размер игрока
        const scoreDisplay = document.getElementById('score');
        const restartButton = document.getElementById('restart');
        const homeButton = document.getElementById('home');
        const startButton = document.getElementById('start');
        const stepPercent = 2; 											// Шаг в процентах
	const moveInterval = 100; 										// Интервал движения в миллисекундах
        const pauseButton = document.getElementById('pauseBtn');
	const gameArea = document.querySelector('.game-area');
	const gameAreaRect = gameArea.getBoundingClientRect();

        let isPaused = true;
        let playerXPercent = 50; 										// Начальные координаты в процентах (по горизонтали)
        let playerYPercent = 50; 										// Начальные координаты в процентах (по вертикали)
        let score = 0;
        let speed = 3;
        let level = 1;
        let enemies = [];
        let gameInterval;
        let scoreInterval;
        let moveDirection = null;

        const levels = [
            { speed: 3, enemies: 1, points: 20 },
            { speed: 2.5, enemies: 2, points: 40 },
            { speed: 2, enemies: 3, points: 60 }
        ];

        const createEnemies = (num) => {
            for (let i = 1; i <= num; i++) {
                const enemy = document.createElement('div');
                enemy.classList.add('enemy');
                enemy.id = `enemy${i}`;
                enemy.style.animationDuration = `${speed}s`;
                enemy.style.animationName = `move${i}`;
                gameArea.appendChild(enemy);
                enemies.push(enemy);
            }
        };

        const generateRandomKeyframes = () => {
            const styleSheet = document.styleSheets[0];
            for (let i = 1; i <= 3; i++) {
                const keyframes = `
                    @keyframes move${i} {
                        0% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
                        25% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
                        50% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
                        75% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
                        100% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
                    }
                `;
                styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
            }
        };

        const updatePlayerPosition = () => {

	    const playerX = (gameAreaRect.width * playerXPercent) / 100; // Используем playerXPercent
	    const playerY = (gameAreaRect.height * playerYPercent) / 100; // Используем playerYPercent

	    player.style.top = playerY + 'px';
	    player.style.left = playerX + 'px';
	};


        const movePlayer = (direction) => {
            if (isPaused) return; // Проверяем, не стоит ли игра на паузе

            switch(direction) {
                case 'up':
                    playerYPercent = Math.max(0, playerYPercent - stepPercent);
                    break;
                case 'down':
                    playerYPercent = Math.min(100 - (playerSize / gameAreaRect.height) * 100, playerYPercent + stepPercent);
                    break;
                case 'left':
                    playerXPercent = Math.max(0, playerXPercent - stepPercent);
                    break;
                case 'right':
                    playerXPercent = Math.min(100 - (playerSize / gameAreaRect.width) * 100, playerXPercent + stepPercent);
                    break;
            }
            updatePlayerPosition(); // Обновляем положение игрока
            checkCollision();
        };

	const checkCollision = () => {
            const playerRect = player.getBoundingClientRect();
            for (const enemy of enemies) {
                const enemyRect = enemy.getBoundingClientRect();
                if (
                    playerRect.left < enemyRect.right &&
                    playerRect.right > enemyRect.left &&
                    playerRect.top < enemyRect.bottom &&
                    playerRect.bottom > enemyRect.top
                ) {
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
                    endGame();
                }
            }
        };

        const updateScore = () => {
            score++;
            scoreDisplay.textContent = 'Очки: ' + score;
            if (score >= levels[level - 1].points) {
                nextLevel();
            }
            saveProgress();
        };

        const nextLevel = () => {
            level++;
            if (level <= levels.length) {
                speed = levels[level - 1].speed;
                enemies.forEach(enemy => enemy.remove());
                enemies = [];
                createEnemies(levels[level - 1].enemies);
            } else {
                alert('Ты прошёл все уровни! Поздравляем!');
                endGame();
            }
        };

        const saveProgress = () => {
	    const gameState = {
	        playerXPercent, // Сохраняем в процентах
	        playerYPercent, // Сохраняем в процентах
	        score,
	        speed,
	        level
	    };
	    localStorage.setItem('gameState', JSON.stringify(gameState));
	};


        const loadProgress = () => {
	    const savedState = localStorage.getItem('gameState');
	    if (savedState) {
	        const gameState = JSON.parse(savedState);
	        playerXPercent = gameState.playerXPercent; // Загружаем из сохранённого состояния
	        playerYPercent = gameState.playerYPercent; // Загружаем из сохранённого состояния
	        score = gameState.score;
	        speed = gameState.speed;
	        level = gameState.level;

	        updatePlayerPosition(); // Обновляем положение игрока
	        scoreDisplay.textContent = 'Очки: ' + score;
	        createEnemies(levels[level - 1].enemies);
	    } else {
	        createEnemies(levels[0].enemies);
	    }
	};

        const endGame = () => {
	    clearInterval(gameInterval);								// Останавливаем интервалы, связанные с игрой
	    clearInterval(scoreInterval);								// Останавливаем интервалы, связанные с игрой

	    isPaused = true;										// Ставим игру на паузу, чтобы не было других действий в момент завершения игры

	    const modal = document.createElement('div');						// Создаём модальное окно для вывода очков
	    modal.className = 'modal';  								// Класс для модального окна
	    modal.innerHTML = `
	        <div class="modal-content">
	            <h2>Твои очки: ${score}</h2>
	            <button id="okButton">Окей</button>
	        </div>
	    `;

	    document.body.appendChild(modal);								// Добавляем модальное окно на страницу

	    document.getElementById('okButton').addEventListener('click', () => {			// Когда пользователь нажмёт на кнопку "Окей", скрыть модальное окно и показать рекламу
	        modal.remove();										// Удаляем модальное окно

	    setTimeout(() => {										// Пауза перед показом рекламы (например, 3 секунды)
	        const adScript = document.createElement('script');					// Создаём элемент для скрипта рекламы
	        adScript.src = "https://ad.mail.ru/static/ads-async.js"; 				// Путь к рекламному скрипту
	        adScript.async = true; 									// Делаем его асинхронным
	        document.body.appendChild(adScript); 							// Добавляем скрипт на страницу

	        const adContainer = document.createElement('ins');					// Создаём контейнер для рекламного блока
	        adContainer.className = "mrg-tag"; 							// Класс для рекламного блока
	        adContainer.setAttribute('data-ad-client', "ad-1752235"); 				// ID клиента для рекламы
	        adContainer.setAttribute('data-ad-slot', "1752235"); 					// ID слота для показа рекламы

	        document.body.appendChild(adContainer);							// Добавляем рекламный контейнер на страницу

	        const adInitScript = document.createElement('script');					// Инициализируем рекламный скрипт для загрузки рекламы
	        adInitScript.innerHTML = "(MRGtag = window.MRGtag || []).push({})"; 			// Инициализация
	        document.body.appendChild(adInitScript); 						// Добавляем на страницу
	    }, 3000); 											// Задержка 3 секунды перед показом рекламы
	});
	};


        const startGame = () => {
            gameInterval = setInterval(checkCollision, 50);
            scoreInterval = setInterval(updateScore, 1000);
            generateRandomKeyframes();
            loadProgress();
            ensurePlayerSafePosition();
        };

	const restartGame = () => {
            clearInterval(gameInterval);
            clearInterval(scoreInterval);
            playerXPercent = 50; // Обновляем начальные координаты в процентах
            playerYPercent = 50; // Обновляем начальные координаты в процентах
            score = 0;
            speed = 3;
            level = 1;
            enemies.forEach(enemy => enemy.remove());
            enemies = [];
            scoreDisplay.textContent = 'Очки: ' + score; // Обновляем текст счётчика
            isPaused = false; // Снимаем паузу при перезапуске игры
            generateRandomKeyframes(); // Генерируем новые случайные траектории движения
            createEnemies(levels[0].enemies);
            updatePlayerPosition(); // Устанавливаем начальное положение игрока
            gameInterval = setInterval(checkCollision, 50);
            scoreInterval = setInterval(updateScore, 1000);
            ensurePlayerSafePosition();
        };

        const ensurePlayerSafePosition = () => {
            const obstacles = document.querySelectorAll('.obstacle');
            let isSafe = false;
            while (!isSafe) {
                isSafe = true;
                for (const obstacle of obstacles) {
                    const obstacleRect = obstacle.getBoundingClientRect();
                    const playerRect = player.getBoundingClientRect();
                    if (
                        playerRect.left < obstacleRect.right &&
                        playerRect.right > obstacleRect.left &&
                        playerRect.top < obstacleRect.bottom &&
                        playerRect.bottom > obstacleRect.top
                    ) {
                        playerXPercent = Math.random() * 90; // Используем проценты для координат
                        playerYPercent = Math.random() * 90; // Используем проценты для координат
                        updatePlayerPosition(); // Обновляем положение игрока
                        isSafe = false;
                        break;
                    }
                }
            }
        };

        const startMoving = (direction) => {
            moveDirection = direction;
            requestAnimationFrame(move);
        };

        const stopMoving = () => {
            moveDirection = null;
        };

        const move = () => {
            if (moveDirection) {
                movePlayer(moveDirection);
                requestAnimationFrame(move);
            }
        };

        startButton.addEventListener('click', () => {
            startButton.style.display = 'none'; // Скрываем кнопку
            isPaused = false; // Снимаем паузу при старте игры
            startGame();
        });

        pauseButton.addEventListener('click', () => {
            const enemies = document.querySelectorAll('.enemy');
            if (isPaused) {
                gameInterval = setInterval(checkCollision, 50);
                scoreInterval = setInterval(updateScore, 1000);
                enemies.forEach(enemy => enemy.style.animationPlayState = 'running');
                pauseButton.textContent = 'Пауза';
            } else {
                clearInterval(gameInterval);
                clearInterval(scoreInterval);
                enemies.forEach(enemy => enemy.style.animationPlayState = 'paused');
                pauseButton.textContent = 'Продолжить';
            }
            isPaused = !isPaused;
        });

	document.addEventListener('DOMContentLoaded', () => {
	    generateCombinedBackground()
	        .catch(error => {
	            console.error('Задача завершена с ошибкой', error);
	        });
	});

        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'ArrowUp':
                    movePlayer('up');
                    break;
                case 'ArrowDown':
                    movePlayer('down');
                    break;
                case 'ArrowLeft':
                    movePlayer('left');
                    break;
                case 'ArrowRight':
                    movePlayer('right');
                    break;
            }
        });

        document.getElementById('up').addEventListener('mousedown', () => startMoving('up'));
        document.getElementById('up').addEventListener('mouseup', stopMoving);
        document.getElementById('up').addEventListener('touchstart', () => startMoving('up'));
        document.getElementById('up').addEventListener('touchend', stopMoving);

        document.getElementById('down').addEventListener('mousedown', () => startMoving('down'));
        document.getElementById('down').addEventListener('mouseup', stopMoving);
        document.getElementById('down').addEventListener('touchstart', () => startMoving('down'));
        document.getElementById('down').addEventListener('touchend', stopMoving);

        document.getElementById('left').addEventListener('mousedown', () => startMoving('left'));
        document.getElementById('left').addEventListener('mouseup', stopMoving);
        document.getElementById('left').addEventListener('touchstart', () => startMoving('left'));
        document.getElementById('left').addEventListener('touchend', stopMoving);

        document.getElementById('right').addEventListener('mousedown', () => startMoving('right'));
        document.getElementById('right').addEventListener('mouseup', stopMoving);
        document.getElementById('right').addEventListener('touchstart', () => startMoving('right'));
        document.getElementById('right').addEventListener('touchend', stopMoving);

        restartButton.addEventListener('click', restartGame);
        homeButton.addEventListener('click', () => {
            window.location.href = 'https://www.serpmonn.ru';
        });
