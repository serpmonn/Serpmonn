        import { generateCombinedBackground } from '/frontend/scripts/backgroundGenerator.js';

            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const player = {
                x: canvas.width / 2 - 25,
                y: canvas.height - 50,
                width: 50,
                height: 50,
                color: 'red',
                speed: 7,
                dx: 0,
                nickname: ''
            };

            const objects = [];
            const objectSize = 20;
            let objectSpeed = 2;
            let score = 0;
            let level = 1;
            let missedObjects = 0;
            let isPaused = false;
            let friction = 0.9;
            let lastTime = 0;

            function drawPlayer() {
                const playerColor = level % 2 === 0 ? 'green' : 'red'; // Меняем цвет на зелёный на чётных уровнях
                ctx.fillStyle = playerColor;
                ctx.fillRect(player.x, player.y, player.width, player.height);
            }

            function createObject() {
                const size = 20 + Math.random() * 40; // Random size from 20 до 60 пикселей
                const x = Math.random() * (canvas.width - size);
                const shapeTypes = ['square', 'circle', 'triangle', 'star']; // New list of shapes
                const shape = shapeTypes[Math.floor(Math.random() * shapeTypes.length)]; // Случайная форма
                const dx = (Math.random() - 0.5) * 4; // Random deviation по оси X
                objects.push({ x, y: 0, size, shape, color: 'blue', dx });
            }

            // Цвет объектов в зависимости от уровня
            function drawObject(obj) {
                ctx.beginPath();
                let objectColor;

                // Динамические цвета для объектов
                if (level < 5) {
                    objectColor = 'blue';
                } else if (level < 10) {
                    objectColor = 'orange';
                } else {
                    objectColor = 'purple';
                }

                ctx.fillStyle = objectColor;

                switch (obj.shape) {
                    case 'square':
                        ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                        break;
                    case 'circle':
                        ctx.arc(obj.x + obj.size / 2, obj.y + obj.size / 2, obj.size / 2, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case 'triangle':
                        ctx.moveTo(obj.x + obj.size / 2, obj.y); // Top vertex
                        ctx.lineTo(obj.x, obj.y + obj.size); // Left side
                        ctx.lineTo(obj.x + obj.size, obj.y + obj.size); // Right side
                        ctx.closePath();
                        ctx.fill();
                        break;
                    case 'star':
                        const centerX = obj.x + obj.size / 2;
                        const centerY = obj.y + obj.size / 2;
                        const spikes = 5;
                        const outerRadius = obj.size / 2;
                        const innerRadius = obj.size / 4;
                        let rot = (Math.PI / 2) * 3;
                        let step = Math.PI / spikes;

                        ctx.moveTo(centerX, centerY - outerRadius);
                        for (let i = 0; i < spikes; i++) {
                            ctx.lineTo(centerX + Math.cos(rot) * outerRadius, centerY + Math.sin(rot) * outerRadius);
                            rot += step;
                            ctx.lineTo(centerX + Math.cos(rot) * innerRadius, centerY + Math.sin(rot) * innerRadius);
                            rot += step;
                        }
                        ctx.closePath();
                        ctx.fill();
                        break;
                    default:
                        break;
                }

                ctx.fillStyle = 'black'; // Default color for other objects
            }

            function updateObjects(deltaTime) {
                objects.forEach(obj => {
                    obj.y += objectSpeed * (deltaTime / 16); // Update Y position
            
                    obj.x += obj.dx * (deltaTime / 16); // Update X position with deviation
            
                    // Limit X movement to keep objects within bounds
                    if (obj.x < 0) obj.x = 0;
                    if (obj.x + obj.size > canvas.width) obj.x = canvas.width - obj.size;
            
                    if (obj.y + obj.size > canvas.height) {
                        // If object reaches bottom and does not hit the player
                        objects.splice(objects.indexOf(obj), 1);
                        score++; // Increase score for passing object
                        document.getElementById('score').innerText = `Score: ${score}`;
                        if (score % 10 === 0) {
                            level++;
                            objectSpeed += 1; // Увеличиваем скорость падения объектов
                        }
                    }
            
                    if (
                        obj.x < player.x + player.width &&
                        obj.x + obj.size > player.x &&
                        obj.y < player.y + player.height &&
                        obj.y + obj.size > player.y
                    ) {
                        // Если объект касается игрока
                        objects.splice(objects.indexOf(obj), 1);
                        missedObjects++; // Увеличиваем счётчик пропусков при касании
                        document.getElementById('missed').innerText = `Misses: ${missedObjects}`;
                        if (missedObjects >= 10) {
                            endGame(); // Завершаем игру при достижении лимита пропусков
                        }
                    }
                });
            }

            function drawObjects() {
                objects.forEach(drawObject); // Добавлено: отрисовка каждого объекта
            }

            function clear() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            function update(timestamp) {
                    if (!lastTime) lastTime = timestamp;
                    const deltaTime = timestamp - lastTime;
                    lastTime = timestamp;

                    if (!isPaused) {
                        clear();
                        drawPlayer();
                        drawObjects();
                        updateObjects(deltaTime);
                        movePlayer(deltaTime);
                    }
                    requestAnimationFrame(update);
                }

            function movePlayer(deltaTime) {
                    player.dx *= friction;
                    player.x += player.dx * (deltaTime / 16); // Используем deltaTime для обновления позиции
                    if (player.x < 0) player.x = 0;
                    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
                }

            function keyDown(e) {
                if (e.key === 'ArrowRight' || e.key === 'Right') {
                    player.dx = player.speed;
                } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
                    player.dx = -player.speed;
                }
            }

            function keyUp(e) {
                if (e.key === 'ArrowRight' || e.key === 'Right' || e.key === 'ArrowLeft' || e.key === 'Left') {
                    player.dx = 0;
                }
            }

            document.addEventListener('keydown', keyDown);
            document.addEventListener('keyup', keyUp);

            // Touch controls
            canvas.addEventListener('touchstart', handleTouchStart);
            canvas.addEventListener('touchmove', handleTouchMove);

            let touchX = null;

            function handleTouchStart(e) {
                touchX = e.touches[0].clientX;
            }

            function handleTouchMove(e) {
                if (touchX !== null) {
                    const newTouchX = e.touches[0].clientX;
                    const dx = newTouchX - touchX;
                    player.x += dx;
                    touchX = newTouchX;
                }
            }

            canvas.addEventListener('touchend', () => {
                touchX = null;
            });

            function updateLeaderboard() {
                fetch('https://www.serpmonn.ru/backend/games/leaderboard')
                    .then(response => response.json())
                    .then(data => {
                        const leaderboardDiv = document.getElementById('leaderboard');
                        leaderboardDiv.innerHTML = 'Leaderboard:<br>' + data.map((entry, i) => `${i + 1}. ${entry.nickname}: ${entry.score}`).join('<br>');
                    });
            }

		function endGame() {

		    isPaused = true;                                                                            // Ставим игру на паузу, чтобы не было других действий в момент завершения игры

		    fetch('https://www.serpmonn.ru/add-score', {						                        // Отправляем результат игрока на сервер
		        method: 'POST',
		        headers: {
		            'Content-Type': 'application/json'
		        },
		        body: JSON.stringify({ nickname: player.nickname, score })
		    }).then(() => {

		        updateLeaderboard();

		        const adScript = document.createElement('script');                                          // Create script element for ads
	                adScript.src = "https://ad.mail.ru/static/ads-async.js";                                // Ad script path
	                adScript.async = true;                                                                  // Make it async
	                document.body.appendChild(adScript);                                                    // Append script to page

	                const adContainer = document.createElement('ins');                                      // Create ad container
	                adContainer.className = "mrg-tag";                                                      // Class for ad block
	                adContainer.setAttribute('data-ad-client', "ad-1844883");                               // ID клиента для рекламы
	                adContainer.setAttribute('data-ad-slot', "1844883");                                    // ID слота для показа рекламы

	                document.body.appendChild(adContainer);                                                 // Append ad container to page

	                const adInitScript = document.createElement('script');                                  // Init ad script to load ads
	                adInitScript.innerHTML = "(MRGtag = window.MRGtag || []).push({})";                     // Инициализация
	                document.body.appendChild(adInitScript);                                                // Добавляем на страницу

		        setTimeout(() => {									                                        // Wait before redirect
		            window.location.href = 'score_table.html';
		        }, 10000); 										                                            // 3 seconds for ad view
		    });
		}

        function restartGame() {
            score = 0;                                                                                      // Reset game parameters
            level = 1;
            missedObjects = 0;
            objectSpeed = 2;
            objects.length = 0;                                                                             // Clear objects array
            player.x = canvas.width / 2 - 25;                                                               // Reset player position
            player.dx = 0;
            isPaused = false;
            document.getElementById('score').innerText = `Score: ${score}`;
            document.getElementById('missed').innerText = `Misses: ${missedObjects}`;
            document.getElementById('pauseBtn').innerText = 'Pause';
            if (gameInterval) clearInterval(gameInterval);                                                  // Перезапуск интервала создания объектов
            gameInterval = setInterval(createObject, 1000);
        }

           fetch('https://www.serpmonn.ru/proxy/bannedWords')
            .then(response => response.json())
            .then(data => {

                function containsBannedWords(nickname) {                                                    // Функция для проверки никнейма на наличие запрещенных слов
                    for (let item of data) {
                        if (nickname.toLowerCase().includes(item.word)) {
                            return true;
                        }
                    }
                    return false;
           	}

           document.getElementById('nicknameForm').addEventListener('submit', function(e) {                 // Nickname form submit handler
                    e.preventDefault();
                    const nickname = document.getElementById('nickname').value;
                    if (containsBannedWords(nickname)) {
                        alert('Nickname contains banned words. Please choose another.');
                    } else {
                        player.nickname = nickname;
                        document.getElementById('nicknameForm').style.display = 'none';
                        setInterval(createObject, 1000);
                        requestAnimationFrame(update);                                                      // Запуск функции обновления
                    }
                });
           });

           // Script to close instruction
        document.getElementById('understandBtn').addEventListener('click', function() {
            document.getElementById('instructionOverlay').style.display = 'none';
            // Show name form after reading instruction
            document.getElementById('nicknameForm').style.display = 'block';
        });
        
        // Hide name form until instruction is read
        document.getElementById('nicknameForm').style.display = 'none';

	   document.addEventListener('DOMContentLoaded', () => {
	        generateCombinedBackground()
	            .catch(error => {
	                console.error('Task finished with error', error);
	            });
	    });

            document.getElementById('leaderboardBtn').addEventListener('click', function() {
                window.open('/frontend/games/redsquare2/score_table.html', '_blank');
            });

            document.getElementById('homeBtn').addEventListener('click', function() {
                window.location.href = 'https://www.serpmonn.ru';
            });

            document.getElementById('pauseBtn').addEventListener('click', function() {
                isPaused = !isPaused;
                document.getElementById('pauseBtn').innerText = isPaused ? 'Resume' : 'Pause';
            });

            document.getElementById('restartBtn').addEventListener('click', function() {
                restartGame();
            });

            window.addEventListener('pageshow', () => {
                requestAnimationFrame(() => {
                    document.body.style.paddingBottom = 'env(safe-area-inset-bottom)';                      // Force layout update
                    document.body.offsetHeight;                                                             // Trigger layout update
                });
            });

