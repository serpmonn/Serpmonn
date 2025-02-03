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
                ctx.fillStyle = player.color;
                ctx.fillRect(player.x, player.y, player.width, player.height);
            }

            function createObject() {
                const size = 20 + Math.random() * 40; // Случайный размер от 10 до 40 пикселей
                const x = Math.random() * (canvas.width - size);
                const shape = Math.random() < 0.5 ? 'square' : 'circle'; // Случайная форма: квадрат или круг
                objects.push({ x, y: 0, size, shape, color: 'blue' });
            }

            function drawObjects() {
                    objects.forEach(obj => {
                        ctx.fillStyle = obj.color;
                        if (obj.shape === 'square') {
                            ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                        } else if (obj.shape === 'circle') {
                            ctx.beginPath();
                            ctx.arc(obj.x + obj.size / 2, obj.y + obj.size / 2, obj.size / 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    });
            }

            function updateObjects(deltaTime) {
		    objects.forEach(obj => {
		        obj.y += objectSpeed * (deltaTime / 16); // Используем deltaTime для обновления позиции
		        if (obj.y + objectSize > canvas.height) {
		            // Если объект достиг нижней границы экрана и не был задет игроком
		            objects.splice(objects.indexOf(obj), 1);
		            score++; // Увеличиваем очки за пропуск объекта
		            document.getElementById('score').innerText = `Очки: ${score}`;
		            if (score % 10 === 0) {
		                level++;
		                objectSpeed += 1; // Увеличиваем сложность
		            }
		        }
		        if (
		            obj.x < player.x + player.width &&
		            obj.x + objectSize > player.x &&
		            obj.y < player.y + player.height &&
		            obj.y + objectSize > player.y
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

		    fetch('https://www.serpmonn.ru/add-score', {						// Отправляем результат игрока на сервер
		        method: 'POST',
		        headers: {
		            'Content-Type': 'application/json'
		        },
		        body: JSON.stringify({ nickname: player.nickname, score })
		    }).then(() => {

		        updateLeaderboard();

		        const adScript = document.createElement('script');                                      // Создаём элемент для скрипта рекламы
	                adScript.src = "https://ad.mail.ru/static/ads-async.js";                                // Путь к рекламному скрипту
	                adScript.async = true;                                                                  // Делаем его асинхронным
	                document.body.appendChild(adScript);                                                    // Добавляем скрипт на страницу

	                const adContainer = document.createElement('ins');                                      // Создаём контейнер для рекламного блока
	                adContainer.className = "mrg-tag";                                                      // Класс для рекламного блока
	                adContainer.setAttribute('data-ad-client', "ad-1764986");                               // ID клиента для рекламы
	                adContainer.setAttribute('data-ad-slot', "1764986");                                    // ID слота для показа рекламы

	                document.body.appendChild(adContainer);                                                 // Добавляем рекламный контейнер на страницу

	                const adInitScript = document.createElement('script');                                  // Инициализируем рекламный скрипт для загрузки рекламы
	                adInitScript.innerHTML = "(MRGtag = window.MRGtag || []).push({})";                     // Инициализация
	                document.body.appendChild(adInitScript);                                                // Добавляем на страницу

		        setTimeout(() => {									// Ждём некоторое время перед перенаправлением
		            window.location.href = 'score_table.html';
		        }, 10000); 										// 3 секунды на просмотр рекламы
		    });
		}

           fetch('https://www.serpmonn.ru/proxy/bannedWords')
            .then(response => response.json())
            .then(data => {
                // Функция для проверки никнейма на наличие запрещенных слов
                function containsBannedWords(nickname) {
                    for (let item of data) {
                        if (nickname.toLowerCase().includes(item.word)) {
                            return true;
                        }
                    }
                    return false;
           	}

                // Обработчик отправки формы никнейма
           document.getElementById('nicknameForm').addEventListener('submit', function(e) {
                    e.preventDefault();
                    const nickname = document.getElementById('nickname').value;
                    if (containsBannedWords(nickname)) {
                        alert('Никнейм содержит запрещенные слова. Пожалуйста, выберите другой никнейм.');
                    } else {
                        player.nickname = nickname;
                        document.getElementById('nicknameForm').style.display = 'none';
                        setInterval(createObject, 1000);
                        requestAnimationFrame(update); // Запуск функции обновления
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

            window.addEventListener('pageshow', () => {
                requestAnimationFrame(() => {
                    document.body.style.paddingBottom = 'env(safe-area-inset-bottom)';
                    // Принудительное обновление макета
                    document.body.offsetHeight; // Триггер обновления макета
                });
            });

