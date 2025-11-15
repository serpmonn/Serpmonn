// snake.js - Основная игровая логика для игры "Змейка"

// Основная функция игры, обернутая в IIFE для изоляции scope
(function() {
    'use strict'; // Строгий режим для лучшей производительности и отлова ошибок
    
    // Получаем ссылку на canvas и его контекст для отрисовки
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    
    // Константы игры
    const CELL_SIZE = 20;    // Размер одной клетки в пикселях
    const GRID_SIZE = 24;    // Размер игрового поля в клетках (24x24)
    
    // Устанавливаем физические размеры canvas
    canvas.width = canvas.height = GRID_SIZE * CELL_SIZE;

    // Получаем ссылки на DOM элементы для отображения статистики
    const scoreEl = document.getElementById('score');    // Элемент для отображения счета
    const bestEl = document.getElementById('best');      // Элемент для отображения рекорда
    const speedEl = document.getElementById('speed');    // Элемент для отображения скорости
    const btnStart = document.getElementById('btnStart'); // Кнопка старта игры
    const btnPause = document.getElementById('btnPause'); // Кнопка паузы
    const btnReset = document.getElementById('btnReset'); // Кнопка сброса игры

    // Ключ для сохранения рекорда в localStorage
    const bestKey = 'snake_best_score_v1';
    
    // Загружаем рекорд из localStorage или устанавливаем 0
    let best = parseInt(localStorage.getItem(bestKey) || '0', 10);
    bestEl.textContent = String(best);

    // Переменные состояния игры
    let snake,        // Массив сегментов змейки [{x, y}, ...]
        dir,          // Текущее направление движения {x, y}
        nextDir,      // Следующее направление движения (для плавного управления)
        food,         // Позиция еды {x, y}
        score,        // Текущий счет
        tickMs,       // Интервал между ходами в миллисекундах (определяет скорость)
        timer,        // Ссылка на игровой таймер
        paused,       // Флаг паузы
        alive;        // Флаг жизни змейки

    /**
     * Сбрасывает состояние игры к начальным значениям
     */
    function reset() {
        // Инициализация змейки в центре поля (3 сегмента)
        snake = [
            {x: 12, y: 12}, // Голова
            {x: 11, y: 12}, // Тело
            {x: 10, y: 12}  // Хвост
        ];
        
        // Начальное направление движения (вправо)
        dir = {x: 1, y: 0};
        nextDir = {x: 1, y: 0};
        
        // Создаем первую еду
        food = spawnFood();
        
        // Сброс счета и скорости
        score = 0;
        scoreEl.textContent = '0';
        tickMs = 140; // Начальная скорость (140ms между ходами)
        updateSpeedDisplay();
        
        // Сброс состояния игры
        paused = false;
        alive = true;
        
        // Запуск игрового цикла
        startGameLoop();
    }

    /**
     * Обновляет отображение текущей скорости игры
     */
    function updateSpeedDisplay() {
        // Вычисляем множитель скорости: 140ms -> 1x, 60ms -> 5x
        const multiplier = (160 - tickMs) / 20 + 1;
        speedEl.textContent = Math.max(1, Math.round(multiplier)) + 'x';
    }

    /**
     * Создает новую еду в случайном месте, не занятом змейкой
     * @returns {Object} Объект с координатами еды {x, y}
     */
    function spawnFood() {
        while (true) {
            // Генерируем случайные координаты
            const foodPos = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
            
            // Проверяем, что еда не появится на змейке
            if (!snake.some(segment => segment.x === foodPos.x && segment.y === foodPos.y)) {
                return foodPos;
            }
        }
    }

    /**
     * Запускает игровой цикл (таймер)
     */
    function startGameLoop() {
        stopGameLoop(); // Останавливаем предыдущий таймер если был
        timer = setInterval(step, tickMs);
    }

    /**
     * Останавливает игровой цикл
     */
    function stopGameLoop() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }

    /**
     * Выполняет один шаг игровой логики
     */
    function step() {
        // Если игра на паузе или змейка мертва - выходим из функции
        if (paused || !alive) return;
        
        // Обновляем направление движения
        dir = nextDir;
        
        // Создаем новую голову змейки
        const head = {
            x: snake[0].x + dir.x,
            y: snake[0].y + dir.y
        };

        // Обработка выхода за границы (телепортация через стены)
        head.x = (head.x + GRID_SIZE) % GRID_SIZE;
        head.y = (head.y + GRID_SIZE) % GRID_SIZE;

        // Проверка столкновения с собой
        if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            gameOver();
            return;
        }

        // Добавляем новую голову в начало массива
        snake.unshift(head);
        
        // Проверка съедания еды
        if (head.x === food.x && head.y === food.y) {
            // Увеличиваем счет
            score += 1;
            scoreEl.textContent = String(score);
            
            // Обновляем рекорд если нужно
            if (score > best) {
                best = score;
                localStorage.setItem(bestKey, String(best));
                bestEl.textContent = String(best);
            }
            
            // Создаем новую еду
            food = spawnFood();
            
            // Увеличиваем скорость (до определенного предела)
            if (tickMs > 70) {
                tickMs -= 5;
                updateSpeedDisplay();
                startGameLoop(); // Перезапускаем таймер с новой скоростью
            }
        } else {
            // Если еда не съедена - удаляем хвост
            snake.pop();
        }

        // Перерисовываем игровое поле
        draw();
    }

    /**
     * Отрисовывает игровое поле
     */
    function draw() {
        // Очищаем canvas - рисуем фон сетки
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid') || '#1b1b1d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Отрисовываем еду
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--food') || '#e74c3c';
        drawRoundedRect(ctx, food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE, 4, true);

        // Отрисовываем змейку
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--snake') || '#2ecc71';
        snake.forEach((segment, index) => {
            // Голова змейки рисуется с большим скруглением
            const radius = index === 0 ? 5 : 3;
            drawRoundedRect(ctx, segment.x * CELL_SIZE + 1, segment.y * CELL_SIZE + 1, 
                           CELL_SIZE - 2, CELL_SIZE - 2, radius, true);
        });
    }

    /**
     * Рисует прямоугольник со скругленными углами
     * @param {CanvasRenderingContext2D} ctx - Контекст canvas
     * @param {number} x - X-координата левого верхнего угла
     * @param {number} y - Y-координата левого верхнего угла
     * @param {number} width - Ширина прямоугольника
     * @param {number} height - Высота прямоугольника
     * @param {number} radius - Радиус скругления углов
     * @param {boolean} fill - Заполнять ли прямоугольник
     */
    function drawRoundedRect(ctx, x, y, width, height, radius, fill) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
        if (fill) ctx.fill();
    }

    /**
     * Показывает экран окончания игры
     */
    function gameOver() {
        alive = false;
        stopGameLoop();
        
        // Затемняем игровое поле
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Текст "Игра окончена"
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('Игра окончена', canvas.width / 2, canvas.height / 2 - 10);
        
        // Инструкция для рестарта
        ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('Нажмите R — заново', canvas.width / 2, canvas.height / 2 + 18);
    }

    /**
     * Устанавливает новое направление движения змейки
     * @param {number} newX - Новое направление по X (-1, 0, 1)
     * @param {number} newY - Новое направление по Y (-1, 0, 1)
     */
    function setDirection(newX, newY) {
        // Запрещаем разворот на 180 градусов
        if ((-newX === dir.x && newY === dir.y) || (newX === dir.x && -newY === dir.y)) return;
        nextDir = {x: newX, y: newY};
    }

    // Обработчики клавиатуры
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        
        // Управление стрелками и WASD
        if (key === 'arrowup' || key === 'w') setDirection(0, -1);
        else if (key === 'arrowdown' || key === 's') setDirection(0, 1);
        else if (key === 'arrowleft' || key === 'a') setDirection(-1, 0);
        else if (key === 'arrowright' || key === 'd') setDirection(1, 0);
        
        // Пробел - пауза/продолжение
        else if (key === ' ') {
            paused = !paused;
            if (!paused && alive) startGameLoop();
        }
        
        // R - рестарт
        else if (key === 'r') reset();
    });

    // Обработчики свайпов для мобильных устройств
    (function() {
        let startX = 0, startY = 0;
        
        // Запоминаем начальную точку касания
        canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
        }, { passive: true });
        
        // Определяем направление свайпа
        canvas.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            
            // Определяем основное направление свайпа
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Горизонтальный свайп
                if (deltaX > 15) setDirection(1, 0);   // Вправо
                else if (deltaX < -15) setDirection(-1, 0); // Влево
            } else {
                // Вертикальный свайп
                if (deltaY > 15) setDirection(0, 1);   // Вниз
                else if (deltaY < -15) setDirection(0, -1); // Вверх
            }
            
            // Сбрасываем начальные координаты
            startX = startY = 0;
        }, { passive: true });
    })();

    // Обработчики кнопок мобильного управления
    document.querySelectorAll('[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => {
            const direction = btn.getAttribute('data-dir');
            if (direction === 'up') setDirection(0, -1);
            if (direction === 'down') setDirection(0, 1);
            if (direction === 'left') setDirection(-1, 0);
            if (direction === 'right') setDirection(1, 0);
        });
    });

    // Обработчики кнопок управления
    btnStart.addEventListener('click', () => {
        if (!alive) reset();
        else paused = false;
        startGameLoop();
    });
    
    btnPause.addEventListener('click', () => {
        paused = !paused;
        if (!paused) startGameLoop();
        else stopGameLoop();
    });
    
    btnReset.addEventListener('click', () => reset());

    // Инициализация игры при загрузке
    reset();
    draw(); // Начальная отрисовка

})();