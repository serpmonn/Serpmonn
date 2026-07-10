// minesweeper.js - Основная игровая логика для игры "Сапёр"

// Основная функция игры, обернутая в IIFE для изоляции scope
(function() {
    'use strict'; // Строгий режим для лучшей производительности и отлова ошибок
    
    // Константы игры
    const SIZE = 10;         // Размер игрового поля (10x10 клеток)
    const MINES = 15;        // Количество мин на поле
    
    // Получаем ссылки на DOM элементы
    const boardEl = document.getElementById('board');        // Игровое поле
    const minesLeftEl = document.getElementById('minesLeft'); // Счетчик оставшихся мин
    const timeEl = document.getElementById('time');          // Таймер
    const bestEl = document.getElementById('best');          // Лучшее время
    const btnStart = document.getElementById('btnStart');    // Кнопка старта
    const btnReset = document.getElementById('btnReset');    // Кнопка сброса

    // Ключ для сохранения рекорда в localStorage
    const bestKey = 'mines_best_time_v1';

    function t(key, fallback) {
        return (window.i18n && window.i18n[key]) || fallback;
    }

    function formatTime(seconds) {
        return String(seconds) + t('timeSuffix', 's');
    }
    
    // Загружаем рекорд из localStorage или устанавливаем 0
    let bestSaved = parseInt(localStorage.getItem(bestKey) || '0', 10);
    bestEl.textContent = bestSaved > 0 ? formatTime(bestSaved) : t('noRecord', '—');

    // Переменные состояния игры
    let grid,        // Двумерный массив значений клеток (-1 = мина, 0-8 = количество мин вокруг)
        revealed,    // Двумерный массив открытых клеток (true/false)
        flagged,     // Двумерный массив клеток с флагами (true/false)
        mineMap,     // Двумерный массив расположения мин (true/false)
        minesPlaced, // Флаг размещения мин (false до первого клика)
        timerOn,     // Флаг работы таймера
        alive,       // Флаг жизни игрока (true = играет, false = проиграл)
        startTime,   // Время начала игры (для таймера)
        timer;       // Ссылка на интервал таймера

    /**
     * Сбрасывает состояние игры к начальным значениям
     */
    function reset() {
        // Инициализация массивов состояния игры
        grid = Array.from({length: SIZE}, () => Array(SIZE).fill(0));        // Все клетки пустые
        revealed = Array.from({length: SIZE}, () => Array(SIZE).fill(false)); // Все клетки закрыты
        flagged = Array.from({length: SIZE}, () => Array(SIZE).fill(false));  // Флагов нет
        mineMap = Array.from({length: SIZE}, () => Array(SIZE).fill(false));  // Мин нет
        
        // Сброс переменных состояния
        minesPlaced = false; // Мины еще не размещены
        timerOn = false;     // Таймер не запущен
        alive = true;        // Игрок жив
        startTime = 0;       // Время начала не установлено
        
        // Остановка таймера и сброс отображения
        clearInterval(timer);
        timeEl.textContent = '0';
        
        // Обновление счетчика мин
        minesLeftEl.textContent = String(MINES);
        
        // Отрисовка игрового поля
        render();
    }

    /**
     * Проверяет находится ли координата в пределах игрового поля
     * @param {number} x - X-координата
     * @param {number} y - Y-координата
     * @returns {boolean} true если координата в пределах поля
     */
    function inBounds(x, y) {
        return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
    }

    /**
     * Возвращает массив координат соседних клеток
     * @param {number} x - X-координата центральной клетки
     * @param {number} y - Y-координата центральной клетки
     * @returns {Array} Массив пар [x, y] соседних клеток
     */
    function getNeighbors(x, y) {
        const deltas = [-1, 0, 1]; // Возможные смещения по x и y
        const result = [];
        
        // Перебираем все возможные комбинации смещений
        for (const dx of deltas) {
            for (const dy of deltas) {
                // Пропускаем центральную клетку
                if (dx === 0 && dy === 0) continue;
                
                const nx = x + dx, ny = y + dy;
                // Добавляем только те клетки, которые в пределах поля
                if (inBounds(nx, ny)) {
                    result.push([nx, ny]);
                }
            }
        }
        
        return result;
    }

    /**
     * Размещает мины на поле, избегая первой нажатой клетки
     * @param {number} safeX - X-координата безопасной клетки
     * @param {number} safeY - Y-координата безопасной клетки
     */
    function placeMines(safeX, safeY) {
        let placed = 0;
        
        // Размещаем мины пока не достигнем нужного количества
        while (placed < MINES) {
            const x = Math.floor(Math.random() * SIZE);
            const y = Math.floor(Math.random() * SIZE);
            
            // Пропускаем безопасную клетку и уже занятые мины
            if ((x === safeX && y === safeY) || mineMap[x][y]) continue;
            
            mineMap[x][y] = true; // Размещаем мину
            placed++;             // Увеличиваем счетчик
        }
        
        // Заполняем числами - количество мин вокруг каждой клетки
        for (let x = 0; x < SIZE; x++) {
            for (let y = 0; y < SIZE; y++) {
                if (mineMap[x][y]) {
                    grid[x][y] = -1; // -1 означает мину
                    continue;
                }
                
                // Считаем количество мин в соседних клетках
                const count = getNeighbors(x, y).reduce((acc, [nx, ny]) => {
                    return acc + (mineMap[nx][ny] ? 1 : 0);
                }, 0);
                
                grid[x][y] = count; // 0..8 - количество мин вокруг
            }
        }
    }

    /**
     * Запускает игровой таймер
     */
    function startTimer() {
        startTime = Date.now(); // Запоминаем время начала
        
        // Останавливаем предыдущий таймер если был
        clearInterval(timer);
        
        // Запускаем новый таймер, обновляющий отображение каждую секунду
        timer = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            timeEl.textContent = String(elapsedSeconds);
        }, 1000);
        
        timerOn = true; // Устанавливаем флаг работы таймера
    }

    /**
     * Открывает клетку и обрабатывает последствия
     * @param {number} x - X-координата клетки
     * @param {number} y - Y-координата клетки
     */
    function reveal(x, y) {
        // Проверяем можно ли открыть клетку
        if (!alive || flagged[x][y] || revealed[x][y]) return;
        
        // Если мины еще не размещены - размещаем их (первый клик безопасен)
        if (!minesPlaced) {
            placeMines(x, y);
            minesPlaced = true;
            
            // Запускаем таймер если еще не запущен
            if (!timerOn) startTimer();
        }
        
        revealed[x][y] = true; // Отмечаем клетку как открытую
        
        // Если открыли мину - игра окончена
        if (grid[x][y] === -1) {
            alive = false;        // Игрок погиб
            clearInterval(timer); // Останавливаем таймер
            showMines();          // Показываем все мины
            showGameOverMessage(t('loseMessage', 'Boom!')); // Сообщение о поражении
            return;
        }
        
        // Если открыли пустую клетку (0) - открываем соседние клетки рекурсивно
        if (grid[x][y] === 0) {
            const queue = [[x, y]];           // Очередь клеток для обработки
            const visited = new Set([x + ',' + y]); // Множество посещенных клеток
            
            // Обрабатываем очередь пока она не пуста
            while (queue.length > 0) {
                const [cx, cy] = queue.shift(); // Берем клетку из начала очереди
                
                // Обрабатываем всех соседей
                for (const [nx, ny] of getNeighbors(cx, cy)) {
                    const key = nx + ',' + ny;
                    
                    // Пропускаем уже посещенные клетки
                    if (visited.has(key)) continue;
                    
                    // Пропускаем клетки с флагами
                    if (flagged[nx][ny]) continue;
                    
                    revealed[nx][ny] = true; // Открываем клетку
                    visited.add(key);        // Добавляем в посещенные
                    
                    // Если клетка тоже пустая - добавляем в очередь для дальнейшего раскрытия
                    if (grid[nx][ny] === 0) {
                        queue.push([nx, ny]);
                    }
                }
            }
        }
        
        // Перерисовываем все клетки чтобы отобразить массовое открытие
        render();
        
        // Проверяем победу
        if (checkWin()) {
            alive = false;        // Останавливаем игру
            clearInterval(timer); // Останавливаем таймер
            
            const finalTime = Math.floor((Date.now() - startTime) / 1000);
            
            // Обновляем рекорд если текущее время лучше
            if (bestSaved === 0 || finalTime < bestSaved) {
                bestSaved = finalTime;
                localStorage.setItem(bestKey, String(finalTime));
                bestEl.textContent = formatTime(finalTime);
            }
            
            showGameOverMessage(t('winMessage', 'You win!')); // Сообщение о победе
        }
    }

    /**
     * Переключает флаг на клетке
     * @param {number} x - X-координата клетки
     * @param {number} y - Y-координата клетки
     */
    function toggleFlag(x, y) {
        if (!alive) return; // Нельзя ставить флаги после проигрыша
        
        // Не позволяем ставить флажок на уже открытой клетке
        if (revealed[x][y]) return;
        
        flagged[x][y] = !flagged[x][y]; // Переключаем состояние флага
        
        // Обновляем счетчик оставшихся мин
        const flagsCount = flagged.flat().filter(Boolean).length;
        minesLeftEl.textContent = String(Math.max(MINES - flagsCount, 0));
        
        // Перерисовываем только измененную клетку для производительности
        renderCell(x, y);
    }

    /**
     * Проверяет выполнены ли условия победы
     * @returns {boolean} true если все безопасные клетки открыты
     */
    function checkWin() {
        // Проверяем все клетки - все безопасные должны быть открыты
        for (let x = 0; x < SIZE; x++) {
            for (let y = 0; y < SIZE; y++) {
                // Если клетка безопасна и не открыта - победа еще не достигнута
                if (grid[x][y] !== -1 && !revealed[x][y]) {
                    return false;
                }
            }
        }
        return true; // Все безопасные клетки открыты
    }

    /**
     * Показывает все мины на поле (при проигрыше)
     */
    function showMines() {
        for (let x = 0; x < SIZE; x++) {
            for (let y = 0; y < SIZE; y++) {
                if (mineMap[x][y]) {
                    const cellElement = getCellElement(x, y);
                    cellElement.classList.add('mine');
                    cellElement.textContent = '💣';
                }
            }
        }
    }

    /**
     * Показывает сообщение о результате игры
     * @param {string} text - Текст сообщения
     */
    function showGameOverMessage(text) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);border-radius:10px;';
        
        const message = document.createElement('div');
        message.style.cssText = 'background:#141821;border:1px solid #1f2632;color:#fff;padding:12px 16px;border-radius:8px;font-weight:700;';
        message.textContent = text;
        
        const container = boardEl.parentElement;
        container.style.position = 'relative';
        overlay.appendChild(message);
        container.appendChild(overlay);
        
        setTimeout(() => {
            overlay.remove();
            if (window.showFullScreenAd) {
                window.showFullScreenAd();
            }
        }, 1500);
    }

    /**
     * Возвращает DOM элемент клетки по координатам
     * @param {number} x - X-координата
     * @param {number} y - Y-координата
     * @returns {HTMLElement} Элемент клетки
     */
    function getCellElement(x, y) {
        return document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    }

    /**
     * Полностью перерисовывает игровое поле
     */
    function render() {
        boardEl.innerHTML = ''; // Очищаем поле
        
        // Создаем все клетки
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.setAttribute('data-x', String(x));
                cell.setAttribute('data-y', String(y));
                
                // Обработчик клика левой кнопкой мыши
                cell.addEventListener('click', (e) => {
                    e.preventDefault();
                    reveal(x, y);
                });
                
                // Обработчики для touch-устройств
                (function() {
                    let touchTimer;
                    
                    // При начале касания запускаем таймер для долгого тапа
                    cell.addEventListener('touchstart', (te) => {
                        te.preventDefault();
                        touchTimer = setTimeout(() => {
                            toggleFlag(x, y);
                            touchTimer = null;
                        }, 400);
                    }, { passive: false });
                    
                    // При окончании касания - если таймер не сработал, открываем клетку
                    cell.addEventListener('touchend', (te) => {
                        te.preventDefault();
                        if (touchTimer) {
                            clearTimeout(touchTimer);
                            touchTimer = null;
                            reveal(x, y);
                        }
                    }, { passive: false });
                })();
                
                // Обработчик правой кнопки мыши (контекстное меню)
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    toggleFlag(x, y);
                });
                
                // Обработчик Shift+клик для установки флага
                cell.addEventListener('mousedown', (e) => {
                    if (e.shiftKey) {
                        e.preventDefault();
                        toggleFlag(x, y);
                    }
                });

                // Применяем текущее состояние клетки
                if (flagged[x][y]) {
                    cell.classList.add('flag');
                    cell.textContent = '⚑';
                } else if (revealed[x][y]) {
                    cell.classList.add('open');
                    const value = grid[x][y];
                    if (value === -1) {
                        cell.classList.add('mine');
                        cell.textContent = '💣';
                    } else if (value > 0) {
                        cell.textContent = String(value);
                        cell.classList.add('n' + value);
                    }
                    // 0 остается пустым
                }

                boardEl.appendChild(cell);
            }
        }
    }

    /**
     * Перерисовывает отдельную клетку (для оптимизации)
     * @param {number} x - X-координата
     * @param {number} y - Y-координата
     */
    function renderCell(x, y) {
        const cell = getCellElement(x, y);
        if (!cell) return;
        
        // Обновляем классы клетки
        cell.classList.toggle('open', revealed[x][y]);
        cell.classList.toggle('flag', flagged[x][y]);
        
        // Обновляем содержимое в зависимости от состояния
        if (flagged[x][y]) {
            cell.textContent = '⚑';
            return;
        }
        
        if (!revealed[x][y]) {
            cell.textContent = '';
            return;
        }
        
        const value = grid[x][y];
        if (value === -1) {
            cell.classList.add('mine');
            cell.textContent = '💣';
            return;
        }
        
        if (value === 0) {
            cell.textContent = '';
            return;
        }
        
        cell.textContent = String(value);
        cell.classList.add('n' + value);
    }

    // Обработчики кнопок управления
    btnStart.addEventListener('click', () => {
        if (!timerOn) {
            startTimer();
        }
    });
    
    btnReset.addEventListener('click', () => {
        reset();
        // Убираем фокус с кнопки, чтобы ПРОБЕЛ не нажимал ее автоматически
        btnReset.blur();
    });
    
    // Обработчик клавиши R для быстрого рестарта
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'r') {
            reset();
        }
    });

    // Инициализация игры при загрузке
    reset();
})();