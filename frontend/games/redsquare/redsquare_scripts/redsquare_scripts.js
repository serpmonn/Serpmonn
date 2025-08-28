	import { generateCombinedBackground } from '/scripts/backgroundGenerator.js';
	import { createEnemies } from './createEnemies.js';
	import { generateRandomKeyframes } from './generateRandomKeyframes.js';
	import { updatePlayerPosition } from './updatePlayerPosition.js';
	import { checkCollision } from './checkCollision.js';
	import { loadProgress } from './loadProgress.js';

    const gameArea = document.querySelector('.game-area');
    const gameAreaRect = gameArea.getBoundingClientRect();
	const player = document.getElementById('player');
	const playerSize = player.getBoundingClientRect().width; 						                    // Получаем размер игрока
    const scoreDisplay = document.getElementById('score');
    const restartButton = document.getElementById('restart');
    const homeButton = document.getElementById('home');
    const startButton = document.getElementById('start');
    const stepPercent = 2; 											                                    // Шаг в процентах
	const moveInterval = 100; 										                                    // Интервал движения в миллисекундах
    const pauseButton = document.getElementById('pauseBtn');
	const styleSheet = document.styleSheets[0]; 								                        // 1-ая таблица стилей из link

        let isPaused = true;
        let playerXPercent = 50; 										                                // Начальные координаты в процентах (по горизонтали)
        let playerYPercent = 50; 										                                // Начальные координаты в процентах (по вертикали)
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

	const startGame = () => {
        const state = loadProgress({
            player,
            gameArea,
            gameAreaRect,
            scoreDisplay,
            levels,
            enemies,
            speed,
            level,
            updatePlayerPosition,
            createEnemies
        });

        playerXPercent = state.playerXPercent;                                                          // Обновляем локальные переменные из возвращённого состояния
        playerYPercent = state.playerYPercent;
        score = state.score;
        speed = state.speed;
        level = state.level;
        gameInterval = setInterval(() => checkCollision(player, enemies, endGame), 50);
        scoreInterval = setInterval(updateScore, 1000);
        generateRandomKeyframes({ styleSheet });
        ensurePlayerSafePosition();
    };

    // Скрипт для закрытия инструкции
    document.getElementById('understandBtn').addEventListener('click', function() {
        document.getElementById('instructionOverlay').style.display = 'none';
    });
    
    // Показываем кнопку "Начать игру" только после прочтения инструкции
    document.getElementById('start').style.display = 'none';
    document.getElementById('understandBtn').addEventListener('click', function() {
        document.getElementById('start').style.display = 'block';
    });

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
                        playerXPercent = Math.random() * 90;                                            // Используем проценты для координат
                        playerYPercent = Math.random() * 90;                                            // Используем проценты для координат
                        updatePlayerPosition();                                                         // Обновляем положение игрока
                        isSafe = false;
                        break;
                    }
                }
            }
    };

    const movePlayer = (direction) => {
        if (isPaused) return; 										                                    // Проверяем, не стоит ли игра на паузе

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
        updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent); 		            // Обновляем положение игрока
        checkCollision(player, enemies, endGame);
    };

    const obstacles = document.querySelectorAll('.obstacle');
            for (const obstacle of obstacles) {
                const obstacleRect = obstacle.getBoundingClientRect();
	const playerRect = player.getBoundingClientRect();                                  	            // Получаем размеры и координаты игрока
                if (
                    playerRect.left < obstacleRect.right &&
                    playerRect.right > obstacleRect.left &&
                    playerRect.top < obstacleRect.bottom &&
                    playerRect.bottom > obstacleRect.top
                ) {
                    endGame();
                }
            }

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
                createEnemies(levels[level - 1].enemies, { speed, gameArea, enemies });
            } else {
                alert('Ты прошёл все уровни! Поздравляем!');
                endGame();
            }
        };

        const saveProgress = () => {
	    const gameState = {
	        playerXPercent, 									                                        // Сохраняем в процентах
	        playerYPercent, 									                                        // Сохраняем в процентах
	        score,
	        speed,
	        level
	    };
	    localStorage.setItem('gameState', JSON.stringify(gameState));
	};

	const restartGame = () => {
            clearInterval(gameInterval);
            clearInterval(scoreInterval);
            playerXPercent = 50; 									                                    // Обновляем начальные координаты в процентах
            playerYPercent = 50; 									                                    // Обновляем начальные координаты в процентах
            score = 0;
            speed = 3;
            level = 1;
            enemies.forEach(enemy => enemy.remove());
            enemies = [];
            scoreDisplay.textContent = 'Очки: ' + score; 						                        // Обновляем текст счётчика
            isPaused = false; 										                                    // Снимаем паузу при перезапуске игры
            generateRandomKeyframes({ styleSheet }); 							                        // Генерируем новые случайные траектории движения
            createEnemies(levels[0].enemies, { speed, gameArea, enemies }); 				            // Передаём параметры
            updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent); 		        // Устанавливаем начальное положение игрока
            gameInterval = setInterval(() => checkCollision(player, enemies, endGame), 50);             // Вызываем функцию, передаём аргументы
            scoreInterval = setInterval(updateScore, 1000);
            ensurePlayerSafePosition();
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

	const endGame = () => {
            clearInterval(gameInterval);                                                                // Останавливаем интервалы, связанные с игрой
            clearInterval(scoreInterval);                                                               // Останавливаем интервалы, связанные с игрой

            isPaused = true;                                                                            // Ставим игру на паузу, чтобы не было других действий в момент завершения игры

            const modal = document.createElement('div');                                                // Создаём модальное окно для вывода очков
            modal.className = 'modal';                                                                  // Класс для модального окна
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>Твои очки: ${score}</h2>
                    <button id="okButton">Окей</button>
                </div>
            `;

            document.body.appendChild(modal);                                                           // Добавляем модальное окно на страницу

            document.getElementById('okButton').addEventListener('click', () => {                       // Когда пользователь нажмёт на кнопку "Окей", скрыть модальное окно и показать рекламу
                modal.remove();                                                                         // Удаляем модальное окно

            setTimeout(() => {                                                                          // Пауза перед показом рекламы (например, 3 секунды)
                const adScript = document.createElement('script');                                      // Создаём элемент для скрипта рекламы
                adScript.src = "https://ad.mail.ru/static/ads-async.js";                                // Путь к рекламному скрипту
                adScript.async = true;                                                                  // Делаем его асинхронным
                document.body.appendChild(adScript);                                                    // Добавляем скрипт на страницу

                const adContainer = document.createElement('ins');                                      // Создаём контейнер для рекламного блока
                adContainer.className = "mrg-tag";                                                      // Класс для рекламного блока
                adContainer.setAttribute('data-ad-client', "ad-1844881");                               // ID клиента для рекламы
                adContainer.setAttribute('data-ad-slot', "1844881");                                    // ID слота для показа рекламы

                document.body.appendChild(adContainer);                                                 // Добавляем рекламный контейнер на страницу

                const adInitScript = document.createElement('script');                                  // Инициализируем рекламный скрипт для загрузки рекламы
                adInitScript.innerHTML = "(MRGtag = window.MRGtag || []).push({})";                     // Инициализация
                document.body.appendChild(adInitScript);                                                // Добавляем на страницу
            }, 3000);                                                                                   // Задержка 3 секунды перед показом рекламы
        });
    };

	        startButton.addEventListener('click', () => {
	            startButton.style.display = 'none'; 							                        // Скрываем кнопку
	            isPaused = false; 										                                // Снимаем паузу при старте игры
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

        document.getElementById('up').addEventListener('mousedown', () => { startMoving('up'); try{navigator.vibrate&&navigator.vibrate(10)}catch(_){} });

        document.getElementById('up').addEventListener('mouseup', stopMoving, { passive: true });
        document.getElementById('up').addEventListener('touchstart', () => { startMoving('up'); try{navigator.vibrate&&navigator.vibrate(10)}catch(_){} }, { passive: true });

        document.getElementById('up').addEventListener('touchend', stopMoving, { passive: true });

        document.getElementById('down').addEventListener('mousedown', () => { startMoving('down'); try{navigator.vibrate&&navigator.vibrate(10)}catch(_){} });

        document.getElementById('down').addEventListener('mouseup', stopMoving, { passive: true });
        document.getElementById('down').addEventListener('touchstart', () => { startMoving('down'); try{navigator.vibrate&&navigator.vibrate(10)}catch(_){} }, { passive: true });

        document.getElementById('down').addEventListener('touchend', stopMoving, { passive: true });

        document.getElementById('left').addEventListener('mousedown', () => { startMoving('left'); try{navigator.vibrate&&navigator.vibrate(10)}catch(_){} });

        document.getElementById('left').addEventListener('mouseup', stopMoving, { passive: true });
        document.getElementById('left').addEventListener('touchstart', () => { startMoving('left'); try{navigator.vibrate&&navigator.vibrate(10)}catch(_){} }, { passive: true });

        document.getElementById('left').addEventListener('touchend', stopMoving, { passive: true });

        document.getElementById('right').addEventListener('mousedown', () => { startMoving('right'); try{navigator.vibrate&&navigator.vibrate(10)}catch(_){} });

        document.getElementById('right').addEventListener('mouseup', stopMoving, { passive: true });

        document.getElementById('right').addEventListener('touchstart', () => { startMoving('right'); try{navigator.vibrate&&navigator.vibrate(10)}catch(_){} }, { passive: true });

        document.getElementById('right').addEventListener('touchend', stopMoving, { passive: true });

        restartButton.addEventListener('click', restartGame);
        homeButton.addEventListener('click', () => {
            window.location.href = 'https://www.serpmonn.ru';
        });
