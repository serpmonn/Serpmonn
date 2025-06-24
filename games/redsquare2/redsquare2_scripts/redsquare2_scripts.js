        import { generateCombinedBackground } from '../../../scripts/backgroundGenerator.js';

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
                const size = 20 + Math.random() * 40; // Случайный размер от 20 до 60 пикселей
                const x = Math.random() * (canvas.width - size);
                const shapeTypes = ['square', 'circle', 'triangle', 'star']; // Новый список форм
                const shape = shapeTypes[Math.floor(Math.random() * shapeTypes.length)]; // Случайная форма
                const dx = (Math.random() - 0.5) * 4; // Случайное отклонение по оси X
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
                        ctx.moveTo(obj.x + obj.size / 2, obj.y); // Вершина
                        ctx.lineTo(obj.x, obj.y + obj.size); // Левая сторона
                        ctx.lineTo(obj.x + obj.size, obj.y + obj.size); // Правая сторона
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

                ctx.fillStyle = 'black'; // Возвращаем цвет по умолчанию для других объектов
            }

            function updateObjects(deltaTime) {
                objects.forEach(obj => {
                    obj.y += objectSpeed * (deltaTime / 16); // Обновляем положение по оси Y
            
                    obj.x += obj.dx * (deltaTime / 16); // Обновляем положение по оси X с учетом отклонения
            
                    // Ограничиваем движение по оси X, чтобы объекты не выходили за границы экрана
                    if (obj.x < 0) obj.x = 0;
                    if (obj.x + obj.size > canvas.width) obj.x = canvas.width - obj.size;
            
                    if (obj.y + obj.size > canvas.height) {
                        // Если объект достиг нижней границы экрана и не был задет игроком
                        objects.splice(objects.indexOf(obj), 1);
                        score++; // Увеличиваем очки за пропуск объекта
                        document.getElementById('score').innerText = `Очки: ${score}`;
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
                        document.getElementById('missed').innerText = `Пропуски: ${missedObjects}`;
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
                fetch('https://www.serpmonn.ru/leaderboard')
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

		        const adScript = document.createElement('script');                                          // Создаём элемент для скрипта рекламы
	                adScript.src = "https://ad.mail.ru/static/ads-async.js";                                // Путь к рекламному скрипту
	                adScript.async = true;                                                                  // Делаем его асинхронным
	                document.body.appendChild(adScript);                                                    // Добавляем скрипт на страницу

	                const adContainer = document.createElement('ins');                                      // Создаём контейнер для рекламного блока
	                adContainer.className = "mrg-tag";                                                      // Класс для рекламного блока
	                adContainer.setAttribute('data-ad-client', "ad-1844883");                               // ID клиента для рекламы
	                adContainer.setAttribute('data-ad-slot', "1844883");                                    // ID слота для показа рекламы

	                document.body.appendChild(adContainer);                                                 // Добавляем рекламный контейнер на страницу

	                const adInitScript = document.createElement('script');                                  // Инициализируем рекламный скрипт для загрузки рекламы
	                adInitScript.innerHTML = "(MRGtag = window.MRGtag || []).push({})";                     // Инициализация
	                document.body.appendChild(adInitScript);                                                // Добавляем на страницу

		        setTimeout(() => {									                                        // Ждём некоторое время перед перенаправлением
		            window.location.href = 'score_table.html';
		        }, 10000); 										                                            // 3 секунды на просмотр рекламы
		    });
		}

        function restartGame() {
            score = 0;                                                                                      // Сброс игровых параметров
            level = 1;
            missedObjects = 0;
            objectSpeed = 2;
            objects.length = 0;                                                                             // Очистка массива объектов
            player.x = canvas.width / 2 - 25;                                                               // Сброс позиции игрока
            player.dx = 0;
            isPaused = false;
            document.getElementById('score').innerText = `Очки: ${score}`;
            document.getElementById('missed').innerText = `Пропуски: ${missedObjects}`;
            document.getElementById('pauseBtn').innerText = 'Пауза';
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

           document.getElementById('nicknameForm').addEventListener('submit', function(e) {                 // Обработчик отправки формы никнейма
                    e.preventDefault();
                    const nickname = document.getElementById('nickname').value;
                    if (containsBannedWords(nickname)) {
                        alert('Никнейм содержит запрещенные слова. Пожалуйста, выберите другой никнейм.');
                    } else {
                        player.nickname = nickname;
                        document.getElementById('nicknameForm').style.display = 'none';
                        setInterval(createObject, 1000);
                        requestAnimationFrame(update);                                                      // Запуск функции обновления
                    }
                });
           });

	   document.addEventListener('DOMContentLoaded', () => {
	        generateCombinedBackground()
	            .catch(error => {
	                console.error('Задача завершена с ошибкой', error);
	            });
	    });

            document.getElementById('leaderboardBtn').addEventListener('click', function() {
                window.open('score_table.html', '_blank');
            });

            document.getElementById('homeBtn').addEventListener('click', function() {
                window.location.href = 'https://www.serpmonn.ru';
            });

            document.getElementById('pauseBtn').addEventListener('click', function() {
                isPaused = !isPaused;
                document.getElementById('pauseBtn').innerText = isPaused ? 'Продолжить' : 'Пауза';
            });

            document.getElementById('restartBtn').addEventListener('click', function() {
                restartGame();
            });

            window.addEventListener('pageshow', () => {
                requestAnimationFrame(() => {
                    document.body.style.paddingBottom = 'env(safe-area-inset-bottom)';                      // Принудительное обновление макета
                    document.body.offsetHeight;                                                             // Триггер обновления макета
                });
            });

