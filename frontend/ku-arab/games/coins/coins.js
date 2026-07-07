// coins-game.js - Основная игровая логика для игры "Монетки"

// Основная функция игры, обернутая в IIFE для изоляции scope
(function() {
    'use strict'; // Строгий режим для лучшей производительности и отлова ошибок
    
    // Получаем ссылку на canvas и его контекст для отрисовки
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    
    // Константы игры
    const size = 24;  // Размер одной клетки в пикселях
    const cells = 20; // Размер игрового поля в клетках (20x20)
    
    // Устанавливаем размеры canvas в соответствии с размером поля
    canvas.width = canvas.height = size * cells;

    // Получаем ссылки на DOM элементы для отображения статистики
    const scoreEl = document.getElementById('score');    // Элемент для отображения счета
    const timeEl = document.getElementById('time');      // Элемент для отображения времени
    const bestEl = document.getElementById('best');      // Элемент для отображения рекорда
    const btnStart = document.getElementById('btnStart'); // Кнопка старта игры
    const btnReset = document.getElementById('btnReset'); // Кнопка сброса игры

    // Ключ для сохранения рекорда в localStorage
    const bestKey = 'coins_best_score_v1';
    
    // Загружаем рекорд из localStorage или устанавливаем 0
    let best = parseInt(localStorage.getItem(bestKey) || '0', 10);
    bestEl.textContent = String(best); // Отображаем рекорд

    // Переменные состояния игры
    let player,    // Объект игрока {x, y, vx, vy}
        coins,     // Массив монеток [{x, y}, ...]
        bads,      // Массив препятствий [{x, y}, ...]
        score,     // Текущий счет
        timeLeft,  // Оставшееся время
        secTimer,  // Таймер для отсчета секунд
        tickTimer, // Таймер для игровых тиков
        tickMs,    // Интервал между тиками в миллисекундах
        tickCount, // Счетчик тиков
        started,   // Флаг начала игры
        alive;     // Флаг жизни игрока

    /**
     * Сбрасывает состояние игры к начальным значениям
     */
    function reset() {
        // Инициализация игрока в центре поля
        player = { 
            x: Math.floor(cells / 2), // Позиция по X
            y: Math.floor(cells / 2), // Позиция по Y
            vx: 0, // Скорость по X
            vy: 0  // Скорость по Y
        };
        
        // Инициализация массивов
        coins = []; // Монетки
        bads = [];  // Препятствия
        
        // Сброс статистики
        score = 0;                    // Обнуляем счет
        scoreEl.textContent = '0';    // Обновляем отображение
        timeLeft = 60;                // Устанавливаем время 60 секунд
        timeEl.textContent = String(timeLeft); // Обновляем отображение
        
        // Настройка игрового процесса
        tickMs = 300;    // Интервал между ходами (300ms)
        tickCount = 0;   // Сброс счетчика тиков
        started = false; // Игра не начата
        alive = true;    // Игрок жив
        
        // Генерация начальных объектов
        spawnCoins(5); // Создаем 5 монеток
        spawnBads(2);  // Создаем 2 препятствия
        
        // Отрисовка начального состояния
        draw();
    }

    /**
     * Создает указанное количество монеток на свободных клетках
     * @param {number} n - Количество монеток для создания
     */
    function spawnCoins(n) {
        for (let i = 0; i < n; i++) {
            coins.push(randEmptyCell());
        }
    }

    /**
     * Создает указанное количество препятствий на свободных клетках
     * @param {number} n - Количество препятствий для создания
     */
    function spawnBads(n) {
        for (let i = 0; i < n; i++) {
            bads.push(randEmptyCell());
        }
    }

    /**
     * Возвращает случайную свободную клетку на игровом поле
     * @returns {Object} Объект с координатами {x, y}
     */
    function randEmptyCell() {
        // Бесконечный цикл пока не найдется свободная клетка
        while (true) {
            // Генерируем случайные координаты
            const p = {
                x: Math.floor(Math.random() * cells),
                y: Math.floor(Math.random() * cells)
            };
            
            // Проверяем что клетка не занята игроком
            if (p.x === player.x && p.y === player.y) continue;
            
            // Проверяем что клетка не занята монеткой
            if (coins.some(c => c.x === p.x && c.y === p.y)) continue;
            
            // Проверяем что клетка не занята препятствием
            if (bads.some(b => b.x === p.x && b.y === p.y)) continue;
            
            // Если все проверки пройдены - возвращаем клетку
            return p;
        }
    }

    /**
     * Запускает игровой процесс
     */
    function start() {
        // Если игра уже запущена - выходим
        if (started) return;
        
        started = true; // Устанавливаем флаг начала игры
        
        // Запускаем таймер для отсчета секунд
        secTimer = setInterval(() => {
            timeLeft -= 1; // Уменьшаем время
            timeEl.textContent = String(timeLeft); // Обновляем отображение
            
            // Если время вышло
            if (timeLeft <= 0) {
                alive = false; // Игрок проиграл
                stop();        // Останавливаем игру
                gameOver();    // Показываем экран окончания
            }
        }, 1000); // Интервал 1 секунда
        
        // Запускаем таймер для игровых тиков
        tickTimer = setInterval(() => {
            tickCount++; // Увеличиваем счетчик тиков
            step();      // Выполняем игровой шаг
            draw();      // Перерисовываем поле
        }, tickMs); // Интервал из настроек
    }

    /**
     * Останавливает игровые таймеры
     */
    function stop() {
        // Останавливаем таймер секунд если он запущен
        if (secTimer) {
            clearInterval(secTimer);
            secTimer = null;
        }
        
        // Останавливаем таймер тиков если он запущен
        if (tickTimer) {
            clearInterval(tickTimer);
            tickTimer = null;
        }
    }

    /**
     * Выполняет один шаг игровой логики
     */
    function step() {
        // Движение игрока по сетке (1 клетка за тик)
        // Используем модульную арифметику для телепортации через границы
        player.x = (player.x + player.vx + cells) % cells;
        player.y = (player.y + player.vy + cells) % cells;

        // Проверка сбора монеток
        // Проходим по монеткам с конца чтобы избежать проблем с индексами при удалении
        for (let i = coins.length - 1; i >= 0; i--) {
            // Если игрок на клетке с монеткой
            if (coins[i].x === player.x && coins[i].y === player.y) {
                coins.splice(i, 1); // Удаляем монетку
                score += 1;         // Увеличиваем счет
                scoreEl.textContent = String(score); // Обновляем отображение
                
                // Если установлен новый рекорд
                if (score > best) {
                    best = score; // Обновляем рекорд
                    localStorage.setItem(bestKey, String(best)); // Сохраняем в localStorage
                    bestEl.textContent = String(best); // Обновляем отображение
                }
            }
        }
        
        // Если монеток стало мало - создаем новые
        if (coins.length < 5) {
            spawnCoins(1);
        }

        // Проверка столкновения с препятствиями
        for (const b of bads) {
            // Если игрок на клетке с препятствием
            if (b.x === player.x && b.y === player.y) {
                alive = false; // Игрок проиграл
                stop();        // Останавливаем игру
                gameOver();    // Показываем экран окончания
                return;        // Выходим из функции
            }
        }

        // Движение препятствий - происходит реже (каждые 3 тика)
        if ((tickCount % 3) === 0) {
            // Каждое препятствие двигается в случайном направлении
            bads = bads.map(b => ({
                x: (b.x + (Math.random() < .5 ? -1 : 1) + cells) % cells,
                y: (b.y + (Math.random() < .5 ? -1 : 1) + cells) % cells
            }));
        }
    }

    /**
     * Отрисовывает игровое поле и все объекты
     */
    function draw() {
        // Очищаем canvas - заливаем фоном
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--board') || '#14171b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Отрисовываем сетку поля
        ctx.strokeStyle = 'rgba(255,255,255,.05)'; // Полупрозрачные белые линии
        ctx.lineWidth = 1; // Толщина линий
        
        // Вертикальные линии
        for (let i = 0; i <= cells; i++) {
            ctx.beginPath();
            ctx.moveTo(i * size, 0);
            ctx.lineTo(i * size, canvas.height);
            ctx.stroke();
        }
        
        // Горизонтальные линии
        for (let i = 0; i <= cells; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * size);
            ctx.lineTo(canvas.width, i * size);
            ctx.stroke();
        }

        // Отрисовываем монетки
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--coin') || '#ffd54f';
        for (const c of coins) {
            // Рисуем скругленный прямоугольник для монетки
            roundRect(ctx, c.x * size + 6, c.y * size + 6, size - 12, size - 12, 6, true);
        }

        // Отрисовываем препятствия
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bad') || '#e74c3c';
        for (const b of bads) {
            // Рисуем скругленный прямоугольник для препятствия
            roundRect(ctx, b.x * size + 4, b.y * size + 4, size - 8, size - 8, 4, true);
        }

        // Отрисовываем игрока
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--player') || '#ffcc00';
        roundRect(ctx, player.x * size + 3, player.y * size + 3, size - 6, size - 6, 6, true);
    }

    /**
     * Рисует скругленный прямоугольник на canvas
     * @param {CanvasRenderingContext2D} ctx - Контекст canvas
     * @param {number} x - Координата X левого верхнего угла
     * @param {number} y - Координата Y левого верхнего угла
     * @param {number} w - Ширина прямоугольника
     * @param {number} h - Высота прямоугольника
     * @param {number} r - Радиус скругления углов
     * @param {boolean} fill - Заливать ли фигуру
     */
    function roundRect(ctx, x, y, w, h, r, fill) {
        ctx.beginPath();
        // Начинаем с верхнего левого угла (после скругления)
        ctx.moveTo(x + r, y);
        // Верхняя грань и верхний правый угол
        ctx.arcTo(x + w, y, x + w, y + h, r);
        // Правая грань и нижний правый угол
        ctx.arcTo(x + w, y + h, x, y + h, r);
        // Нижняя грань и нижний левый угол
        ctx.arcTo(x, y + h, x, y, r);
        // Левая грань и верхний левый угол
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath(); // Замыкаем путь
        
        // Если нужно залить - заливаем
        if (fill) ctx.fill();
    }

    /**
     * Показывает экран окончания игры
     */
    function gameOver() {
        // Затемняем игровое поле полупрозрачным черным
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Настраиваем стиль текста
        ctx.fillStyle = '#fff';     // Белый цвет
        ctx.textAlign = 'center';   // Выравнивание по центру
        
        // Отрисовываем заголовок
        ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('Игра окончена', canvas.width / 2, canvas.height / 2 - 10);
        
        // Отрисовываем инструкцию
        ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('Нажмите R — заново', canvas.width / 2, canvas.height / 2 + 18);
        
        // Пытаемся показать рекламу
        try {
            if (window.showFullScreenAd) window.showFullScreenAd();
        } catch (_) {
            // Игнорируем ошибки при показе рекламы
        }
    }

    /**
     * Устанавливает направление движения игрока
     * @param {number} vx - Скорость по оси X (-1, 0, 1)
     * @param {number} vy - Скорость по оси Y (-1, 0, 1)
     */
    function setDir(vx, vy) {
        player.vx = vx;
        player.vy = vy;
    }

    // Обработчики клавиатуры для управления
    window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase(); // Приводим к нижнему регистру для удобства
        
        // Обработка клавиш управления
        if (k === 'arrowup' || k === 'w') setDir(0, -1);        // Вверх
        else if (k === 'arrowdown' || k === 's') setDir(0, 1);  // Вниз
        else if (k === 'arrowleft' || k === 'a') setDir(-1, 0); // Влево
        else if (k === 'arrowright' || k === 'd') setDir(1, 0); // Вправо
        else if (k === 'r') reset();                            // Перезапуск
    });

    // Мобильное управление: обработка свайпов
    (function() {
        let sx = 0, sy = 0; // Начальные координаты касания
        
        const el = canvas; // Элемент для обработки касаний
        
        // Обработка начала касания
        el.addEventListener('touchstart', (e) => {
            const t = e.touches[0]; // Первое касание
            sx = t.clientX; // Запоминаем начальную X координату
            sy = t.clientY; // Запоминаем начальную Y координату
        }, { passive: true }); // Пассивный обработчик для производительности
        
        // Обработка окончания касания
        el.addEventListener('touchend', (e) => {
            const t = e.changedTouches[0]; // Касание которое закончилось
            const dx = t.clientX - sx; // Разница по X
            const dy = t.clientY - sy; // Разница по Y
            
            // Определяем направление свайпа по большей разнице
            if (Math.abs(dx) > Math.abs(dy)) {
                // Горизонтальный свайп
                if (dx > 10) setDir(1, 0);   // Вправо
                else if (dx < -10) setDir(-1, 0); // Влево
            } else {
                // Вертикальный свайп
                if (dy > 10) setDir(0, 1);   // Вниз
                else if (dy < -10) setDir(0, -1); // Вверх
            }
            
            // Сбрасываем начальные координаты
            sx = sy = 0;
        }, { passive: true }); // Пассивный обработчик для производительности
    })();

    // Обработчики кнопок управления
    btnStart.addEventListener('click', start); // Запуск игры
    btnReset.addEventListener('click', reset); // Сброс игры

    // Инициализация игры при загрузке
    reset();

})(); // Конец IIFE