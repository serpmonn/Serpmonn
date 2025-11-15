// fifteen.js - Основная игровая логика для игры "Пятнашки"

// Основная функция игры, обернутая в IIFE для изоляции scope
(function() {
    'use strict'; // Строгий режим для лучшей производительности и отлова ошибок
    
    // Получаем ссылки на DOM элементы
    const gameBoard = document.getElementById('game');           // Игровое поле
    const movesEl = document.getElementById('moves');            // Счетчик ходов
    const timeEl = document.getElementById('time');              // Таймер
    const bestEl = document.getElementById('best');              // Рекорд
    const btnNewGame = document.getElementById('btnNewGame');    // Кнопка новой игры
    const btnReset = document.getElementById('btnReset');        // Кнопка сброса
    const solvedMessage = document.getElementById('solvedMessage'); // Сообщение о победе

    // Константы игры
    const BOARD_SIZE = 4;        // Размер поля 4x4
    const TOTAL_TILES = BOARD_SIZE * BOARD_SIZE - 1; // Всего плиток (15)
    
    // Ключ для сохранения рекорда в localStorage
    const bestKey = 'fifteen_best_score_v1';
    
    // Переменные состояния игры
    let tiles = [];              // Массив плиток
    let emptyIndex = 15;         // Индекс пустой плитки (последняя позиция)
    let moves = 0;               // Счетчик ходов
    let time = 0;                // Время в секундах
    let timer = null;            // Ссылка на таймер
    let gameStarted = false;     // Флаг начала игры
    let gameSolved = false;      // Флаг решения головоломки (переименовано для избежания конфликта)

    // Загружаем рекорд из localStorage или устанавливаем 0
    let best = parseInt(localStorage.getItem(bestKey) || '0', 10);
    bestEl.textContent = String(best); // Отображаем рекорд

    /**
     * Инициализирует игровое поле и начинает новую игру
     */
    function initGame() {
        // Создаем массив чисел от 1 до 15
        tiles = Array.from({ length: TOTAL_TILES }, (_, i) => i + 1);
        tiles.push(0); // Добавляем 0 для пустой плитки
        
        // Перемешиваем плитки до тех пор, пока головоломка будет решаемой
        do {
            shuffleTiles();
        } while (!isSolvable() || isSolved());
        
        moves = 0;               // Сбрасываем счетчик ходов
        movesEl.textContent = '0'; // Обновляем отображение
        time = 0;                // Сбрасываем время
        timeEl.textContent = '0'; // Обновляем отображение
        gameStarted = false;     // Игра еще не начата
        gameSolved = false;      // Сбрасываем флаг решения (исправлено)
        solvedMessage.style.display = 'none'; // Скрываем сообщение о победе
        
        // Находим индекс пустой плитки
        emptyIndex = tiles.indexOf(0);
        
        // Отрисовываем игровое поле
        renderBoard();
        
        // Останавливаем предыдущий таймер если он был
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }

    /**
     * Перемешивает плитки случайным образом
     */
    function shuffleTiles() {
        // Алгоритм Фишера-Йетса для случайного перемешивания
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; // Меняем местами
        }
    }

    /**
     * Проверяет, является ли текущая расстановка плиток решаемой
     * @returns {boolean} true если головоломка решаема
     */
    function isSolvable() {
        let inversions = 0;
        
        // Считаем количество инверсий (пар плиток в неправильном порядке)
        for (let i = 0; i < tiles.length; i++) {
            for (let j = i + 1; j < tiles.length; j++) {
                // Игнорируем пустую плитку
                if (tiles[i] !== 0 && tiles[j] !== 0 && tiles[i] > tiles[j]) {
                    inversions++;
                }
            }
        }
        
        // Для поля 4x4 головоломка решаема если:
        // - пустая плитка в четной строке снизу и количество инверсий нечетное, ИЛИ
        // - пустая плитка в нечетной строке снизу и количество инверсий четное
        const emptyRowFromBottom = BOARD_SIZE - Math.floor(emptyIndex / BOARD_SIZE);
        return (emptyRowFromBottom % 2 === 0) === (inversions % 2 === 1);
    }

    /**
     * Проверяет, решена ли головоломка
     * @returns {boolean} true если головоломка решена
     */
    function isSolved() {
        // Проверяем что все плитки стоят по порядку, а последняя - пустая
        for (let i = 0; i < TOTAL_TILES; i++) {
            if (tiles[i] !== i + 1) {
                return false;
            }
        }
        return tiles[TOTAL_TILES] === 0; // Последняя плитка должна быть пустой
    }

    /**
     * Отрисовывает игровое поле на основе текущего состояния tiles
     */
    function renderBoard() {
        // Очищаем игровое поле
        gameBoard.innerHTML = '';
        
        // Создаем плитки
        tiles.forEach((value, index) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            
            // Если плитка не пустая - добавляем номер
            if (value !== 0) {
                tile.textContent = value;
                tile.dataset.value = value;
                tile.dataset.index = index;
                
                // Добавляем обработчики событий
                tile.addEventListener('click', () => moveTile(index));
                tile.addEventListener('touchstart', handleTouchStart, { passive: false });
                tile.addEventListener('touchmove', handleTouchMove, { passive: false });
                tile.addEventListener('touchend', handleTouchEnd);
                
                // Добавляем поддержку клавиатуры
                tile.setAttribute('tabindex', '0');
                tile.addEventListener('keydown', (e) => {
                    if (['Enter', ' '].includes(e.key)) {
                        moveTile(index);
                    }
                });
            } else {
                // Пустая плитка
                tile.className += ' empty';
            }
            
            // Добавляем класс solved если головоломка решена
            if (gameSolved && value !== 0) { // Исправлено: gameSolved вместо isSolved
                tile.className += ' solved';
            }
            
            gameBoard.appendChild(tile);
        });
    }

    /**
     * Перемещает плитку если это возможно
     * @param {number} index - Индекс перемещаемой плитки
     */
    function moveTile(index) {
        // Если игра не начата - начинаем
        if (!gameStarted && !gameSolved) { // Исправлено: gameSolved вместо isSolved
            startGame();
        }
        
        // Если головоломка уже решена - ничего не делаем
        if (gameSolved) return; // Исправлено: gameSolved вместо isSolved
        
        // Проверяем можно ли переместить плитку (должна быть соседней с пустой)
        if (canMove(index)) {
            // Меняем местами плитку и пустую клетку
            [tiles[index], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[index]];
            emptyIndex = index; // Обновляем индекс пустой плитки
            moves++; // Увеличиваем счетчик ходов
            movesEl.textContent = String(moves); // Обновляем отображение
            
            // Перерисовываем поле
            renderBoard();
            
            // Проверяем решена ли головоломка
            checkSolution();
        }
    }

    /**
     * Проверяет можно ли переместить плитку на пустое место
     * @param {number} index - Индекс проверяемой плитки
     * @returns {boolean} true если плитку можно переместить
     */
    function canMove(index) {
        const row = Math.floor(index / BOARD_SIZE);
        const col = index % BOARD_SIZE;
        const emptyRow = Math.floor(emptyIndex / BOARD_SIZE);
        const emptyCol = emptyIndex % BOARD_SIZE;
        
        // Плитку можно переместить если она находится рядом с пустой клеткой
        return (Math.abs(row - emptyRow) === 1 && col === emptyCol) || 
               (Math.abs(col - emptyCol) === 1 && row === emptyRow);
    }

    /**
     * Запускает игровой таймер
     */
    function startGame() {
        gameStarted = true;
        timer = setInterval(() => {
            time++;
            timeEl.textContent = String(time);
        }, 1000);
    }

    /**
     * Проверяет решена ли головоломка и обрабатывает победу
     */
    function checkSolution() {
        if (isSolved()) {
            gameSolved = true; // Исправлено: gameSolved вместо isSolved
            
            // Останавливаем таймер
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            
            // Обновляем рекорд если нужно
            if (moves < best || best === 0) {
                best = moves;
                localStorage.setItem(bestKey, String(best));
                bestEl.textContent = String(best);
            }
            
            // Показываем сообщение о победе
            solvedMessage.style.display = 'block';
            
            // Показываем рекламу
            try {
                if (window.showFullScreenAd) window.showFullScreenAd();
            } catch (_) {
                // Игнорируем ошибки при показе рекламы
            }
        }
    }

    // Переменные для обработки касаний
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartIndex = -1;

    /**
     * Обработчик начала касания
     * @param {TouchEvent} e - Событие касания
     */
    function handleTouchStart(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartIndex = parseInt(e.target.dataset.index);
        e.preventDefault();
    }

    /**
     * Обработчик движения касания
     * @param {TouchEvent} e - Событие касания
     */
    function handleTouchMove(e) {
        e.preventDefault(); // Предотвращаем скроллинг
    }

    /**
     * Обработчик окончания касания
     * @param {TouchEvent} e - Событие касания
     */
    function handleTouchEnd(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        // Определяем направление свайпа
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
            // Горизонтальный свайп
            if (dx > 0) {
                // Свайп вправо - ищем плитку слева от пустой
                const targetIndex = emptyIndex - 1;
                if (targetIndex >= 0 && Math.floor(targetIndex / BOARD_SIZE) === Math.floor(emptyIndex / BOARD_SIZE)) {
                    moveTile(targetIndex);
                }
            } else {
                // Свайп влево - ищем плитку справа от пустой
                const targetIndex = emptyIndex + 1;
                if (targetIndex < tiles.length && Math.floor(targetIndex / BOARD_SIZE) === Math.floor(emptyIndex / BOARD_SIZE)) {
                    moveTile(targetIndex);
                }
            }
        } else if (Math.abs(dy) > 10) {
            // Вертикальный свайп
            if (dy > 0) {
                // Свайп вниз - ищем плитку сверху от пустой
                const targetIndex = emptyIndex - BOARD_SIZE;
                if (targetIndex >= 0) {
                    moveTile(targetIndex);
                }
            } else {
                // Свайп вверх - ищем плитку снизу от пустой
                const targetIndex = emptyIndex + BOARD_SIZE;
                if (targetIndex < tiles.length) {
                    moveTile(targetIndex);
                }
            }
        }
    }

    /**
     * Обработчик нажатий клавиш клавиатуры
     * @param {KeyboardEvent} e - Событие клавиатуры
     */
    function handleKeyDown(e) {
        if (gameSolved) return; // Исправлено: gameSolved вместо isSolved
        
        let targetIndex = -1;
        const row = Math.floor(emptyIndex / BOARD_SIZE);
        const col = emptyIndex % BOARD_SIZE;
        
        // Определяем какая плитка должна двигаться в зависимости от нажатой клавиши
        switch(e.key) {
            case 'ArrowUp':
                // Двигаем плитку снизу вверх
                targetIndex = emptyIndex + BOARD_SIZE;
                break;
            case 'ArrowDown':
                // Двигаем плитку сверху вниз
                targetIndex = emptyIndex - BOARD_SIZE;
                break;
            case 'ArrowLeft':
                // Двигаем плитку справа налево
                targetIndex = emptyIndex + 1;
                break;
            case 'ArrowRight':
                // Двигаем плитку слева направо
                targetIndex = emptyIndex - 1;
                break;
            case 'w':
            case 'W':
                // WASD управление - вверх
                targetIndex = emptyIndex + BOARD_SIZE;
                break;
            case 's':
            case 'S':
                // WASD управление - вниз
                targetIndex = emptyIndex - BOARD_SIZE;
                break;
            case 'a':
            case 'A':
                // WASD управление - влево
                targetIndex = emptyIndex + 1;
                break;
            case 'd':
            case 'D':
                // WASD управление - вправо
                targetIndex = emptyIndex - 1;
                break;
        }
        
        // Если нашли валидную плитку для перемещения - перемещаем
        if (targetIndex >= 0 && targetIndex < tiles.length && canMove(targetIndex)) {
            if (!gameStarted && !gameSolved) { // Исправлено: gameSolved вместо isSolved
                startGame();
            }
            moveTile(targetIndex);
        }
    }

    // Обработчики кнопок управления
    btnNewGame.addEventListener('click', initGame); // Новая игра
    btnReset.addEventListener('click', initGame);   // Сброс игры

    // Обработчик клавиатуры для управления стрелками и WASD
    window.addEventListener('keydown', handleKeyDown);

    // Инициализация игры при загрузке
    initGame();

})(); // Конец IIFE