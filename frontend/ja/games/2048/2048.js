class Game2048 {                                                                                                            /* Основной класс игры 2048 */
    constructor() {                                                                                                         /* Конструктор класса */
        this.board = Array(16).fill(0);                                                                                    /* Игровое поле 4x4 (16 клеток) */
        this.score = 0;                                                                                                     /* Текущий счет */
        this.best = parseInt(localStorage.getItem('2048-best')) || 0;                                                       /* Лучший счет из localStorage */
        this.history = [];                                                                                                  /* История ходов для отмены */
        this.init();                                                                                                        /* Инициализация игры */
    }

    init() {                                                                                                                /* Метод инициализации */
        this.createBoard();                                                                                                 /* Создание игрового поля в DOM */
        this.addRandomTile();                                                                                               /* Добавление первой случайной плитки */
        this.addRandomTile();                                                                                               /* Добавление второй случайной плитки */
        this.updateDisplay();                                                                                               /* Обновление отображения */
        this.setupEventListeners();                                                                                         /* Настройка обработчиков событий */
    }

    createBoard() {                                                                                                         /* Создание игрового поля в DOM */
        const boardElement = document.getElementById('board');                                                              /* Получение элемента поля */
        boardElement.innerHTML = '';                                                                                        /* Очистка поля */
        
        for (let i = 0; i < 16; i++) {                                                                                     /* Создание 16 плиток */
            const tile = document.createElement('div');                                                                     /* Создание элемента плитки */
            tile.className = 'tile';                                                                                        /* Базовый класс плитки */
            tile.dataset.index = i;                                                                                         /* Сохранение индекса в data-атрибуте */
            boardElement.appendChild(tile);                                                                                 /* Добавление плитки на поле */
        }
    }

    addRandomTile() {                                                                                                       /* Добавление случайной плитки */
        const emptyCells = this.board.reduce((acc, cell, index) => {                                                        /* Поиск пустых клеток */
            if (cell === 0) acc.push(index);                                                                                /* Добавление индекса пустой клетки */
            return acc;
        }, []);

        if (emptyCells.length > 0) {                                                                                        /* Если есть пустые клетки */
            const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];                                  /* Случайный индекс пустой клетки */
            this.board[randomIndex] = Math.random() < 0.9 ? 2 : 4;                                                          /* 90% вероятность 2, 10% - 4 */
        }
    }

    updateDisplay() {                                                                                                       /* Обновление отображения игры */
        const tiles = document.querySelectorAll('.tile');                                                                   /* Все плитки на поле */
        
        tiles.forEach((tile, index) => {                                                                                    /* Обновление каждой плитки */
            const value = this.board[index];                                                                                /* Значение плитки из массива */
            tile.textContent = value || '';                                                                                 /* Установка текста (пусто для 0) */
            tile.className = `tile${value ? ` tile-${value}` : ''}`;                                                        /* Установка классов в зависимости от значения */
        });

        document.getElementById('score').textContent = this.score;                                                          /* Обновление текущего счета */
        document.getElementById('best').textContent = this.best;                                                            /* Обновление лучшего счета */
    }

    updateBestScore() {                                                                                                     /* Обновление лучшего счета */
        if (this.score > this.best) {                                                                                       /* Если текущий счет больше лучшего */
            this.best = this.score;                                                                                         /* Обновление лучшего счета */
            localStorage.setItem('2048-best', this.best);                                                                   /* Сохранение в localStorage */
        }
    }

    setupEventListeners() {                                                                                                 /* Настройка обработчиков событий */
        document.addEventListener('keydown', (e) => {                                                                       /* Обработчик клавиатуры */
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {                                      /* Проверка стрелок */
                e.preventDefault();                                                                                         /* Предотвращение стандартного поведения */
                this.handleKeyPress(e.key);                                                                                 /* Обработка нажатия */
            }
        });

        // Свайпы для мобильных устройств
        let startX, startY;                                                                                                 /* Начальные координаты касания */
        const board = document.getElementById('board');                                                                     /* Элемент игрового поля */

        board.addEventListener('touchstart', (e) => {                                                                       /* Начало касания */
            startX = e.touches[0].clientX;                                                                                  /* Сохранение X координаты */
            startY = e.touches[0].clientY;                                                                                  /* Сохранение Y координаты */
        });

        board.addEventListener('touchend', (e) => {                                                                         /* Конец касания */
            if (!startX || !startY) return;                                                                                 /* Проверка наличия начальных координат */

            const endX = e.changedTouches[0].clientX;                                                                       /* Конечная X координата */
            const endY = e.changedTouches[0].clientY;                                                                       /* Конечная Y координата */
            
            const deltaX = endX - startX;                                                                                   /* Разница по X */
            const deltaY = endY - startY;                                                                                   /* Разница по Y */
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {                                                                      /* Горизонтальный свайп */
                if (deltaX > 0) this.handleKeyPress('ArrowRight');                                                          /* Свайп вправо */
                else this.handleKeyPress('ArrowLeft');                                                                      /* Свайп влево */
            } else {                                                                                                        /* Вертикальный свайп */
                if (deltaY > 0) this.handleKeyPress('ArrowDown');                                                           /* Свайп вниз */
                else this.handleKeyPress('ArrowUp');                                                                        /* Свайп вверх */
            }
            
            startX = startY = null;                                                                                         /* Сброс координат */
        });

        // Кнопки управления
        document.getElementById('new-game').addEventListener('click', () => {                                               /* Кнопка новой игры */
            this.newGame();                                                                                                 /* Начало новой игры */
        });

        document.getElementById('undo').addEventListener('click', () => {                                                   /* Кнопка отмены хода */
            this.undo();                                                                                                    /* Отмена последнего хода */
        });
    }

    handleKeyPress(key) {                                                                                                   /* Обработка нажатия клавиши/свайпа */
        this.saveState();                                                                                                   /* Сохранение текущего состояния */
        
        let moved = false;                                                                                                  /* Флаг движения плиток */
        
        switch (key) {                                                                                                      /* Определение направления */
            case 'ArrowUp':
                moved = this.moveUp();                                                                                      /* Движение вверх */
                break;
            case 'ArrowDown':
                moved = this.moveDown();                                                                                    /* Движение вниз */
                break;
            case 'ArrowLeft':
                moved = this.moveLeft();                                                                                    /* Движение влево */
                break;
            case 'ArrowRight':
                moved = this.moveRight();                                                                                   /* Движение вправо */
                break;
        }

        if (moved) {                                                                                                        /* Если было движение плиток */
            this.addRandomTile();                                                                                           /* Добавление новой плитки */
            this.updateDisplay();                                                                                           /* Обновление отображения */
            this.updateBestScore();                                                                                         /* Обновление лучшего счета */
            
            // Вибрация на мобильных
            if (navigator.vibrate) {                                                                                        /* Проверка поддержки вибрации */
                navigator.vibrate(50);                                                                                      /* Короткая вибрация */
            }

            if (this.isGameOver()) {                                                                                        /* Проверка окончания игры */
                setTimeout(() => {                                                                                          /* Задержка для плавности */
                    alert('Игра окончена! Ваш счёт: ' + this.score);                                                        /* Сообщение об окончании */
                    if (window.showFullScreenAd) { window.showFullScreenAd(); }                                             /* Показ рекламы если доступно */
                }, 100);
            }
        }
    }

    // ✅ ИСПРАВЛЕННЫЕ МЕТОДЫ ДВИЖЕНИЯ
    moveLeft() {                                                                                                            /* Движение влево */
        return this.moveRows(row => ({ 
            input: row, 
            output: this.mergeLine(row)                                                                                     /* Объединение слева направо */
        }));
    }

    moveRight() {                                                                                                           /* Движение вправо */
        return this.moveRows(row => ({ 
            input: row, 
            output: this.mergeLine([...row].reverse()).reverse()                                                            /* ✅ Разворачиваем, объединяем, возвращаем обратно */
        }));
    }

    moveUp() {                                                                                                              /* Движение вверх */
        return this.moveColumns(col => ({ 
            input: col, 
            output: this.mergeLine(col)                                                                                     /* Объединение сверху вниз */
        }));
    }

    moveDown() {                                                                                                            /* Движение вниз */
        return this.moveColumns(col => ({ 
            input: col, 
            output: this.mergeLine([...col].reverse()).reverse()                                                            /* ✅ Разворачиваем, объединяем, возвращаем обратно */
        }));
    }

    moveRows(transform) {                                                                                                   /* Обработка движения по строкам */
        let moved = false;                                                                                                  /* Флаг движения */
        
        for (let i = 0; i < 4; i++) {                                                                                      /* Перебор всех строк */
            const row = this.getRow(i);                                                                                     /* Получение строки */
            const result = transform(row);                                                                                  /* Применение трансформации к строке */
            
            if (JSON.stringify(result.input) !== JSON.stringify(result.output)) {                                           /* Проверка изменений */
                moved = true;                                                                                               /* Установка флага движения */
                this.setRow(i, result.output);                                                                              /* Обновление строки */
            }
        }
        
        return moved;                                                                                                       /* Возврат результата */
    }

    moveColumns(transform) {                                                                                                /* Обработка движения по колонкам */
        let moved = false;                                                                                                  /* Флаг движения */
        
        for (let i = 0; i < 4; i++) {                                                                                      /* Перебор всех колонок */
            const column = this.getColumn(i);                                                                               /* Получение колонки */
            const result = transform(column);                                                                               /* Применение трансформации к колонке */
            
            if (JSON.stringify(result.input) !== JSON.stringify(result.output)) {                                           /* Проверка изменений */
                moved = true;                                                                                               /* Установка флага движения */
                this.setColumn(i, result.output);                                                                           /* Обновление колонки */
            }
        }
        
        return moved;                                                                                                       /* Возврат результата */
    }

    getRow(rowIndex) {                                                                                                      /* Получение строки по индексу */
        const row = [];                                                                                                     /* Массив для строки */
        for (let j = 0; j < 4; j++) {                                                                                      /* Перебор колонок в строке */
            row.push(this.board[rowIndex * 4 + j]);                                                                         /* Добавление значения в строку */
        }
        return row;                                                                                                         /* Возврат строки */
    }

    setRow(rowIndex, values) {                                                                                              /* Установка значений строки */
        for (let j = 0; j < 4; j++) {                                                                                      /* Перебор колонок в строке */
            this.board[rowIndex * 4 + j] = values[j];                                                                       /* Установка значения */
        }
    }

    getColumn(colIndex) {                                                                                                   /* Получение колонки по индексу */
        const column = [];                                                                                                  /* Массив для колонки */
        for (let i = 0; i < 4; i++) {                                                                                      /* Перебор строк в колонке */
            column.push(this.board[i * 4 + colIndex]);                                                                      /* Добавление значения в колонку */
        }
        return column;                                                                                                      /* Возврат колонки */
    }

    setColumn(colIndex, values) {                                                                                           /* Установка значений колонки */
        for (let i = 0; i < 4; i++) {                                                                                      /* Перебор строк в колонке */
            this.board[i * 4 + colIndex] = values[i];                                                                       /* Установка значения */
        }
    }

    mergeLine(line) {                                                                                                       /* Объединение плиток в линии */
        // Удаляем нули
        let filtered = line.filter(cell => cell !== 0);                                                                     /* Фильтрация пустых клеток */
        
        // Объединяем одинаковые числа
        for (let i = 0; i < filtered.length - 1; i++) {                                                                    /* Перебор плиток в линии */
            if (filtered[i] === filtered[i + 1]) {                                                                          /* Если соседние плитки одинаковы */
                filtered[i] *= 2;                                                                                           /* Удвоение значения */
                this.score += filtered[i];                                                                                  /* Добавление к счету */
                filtered.splice(i + 1, 1);                                                                                  /* Удаление объединенной плитки */
            }
        }
        
        // Добавляем нули в конец
        while (filtered.length < 4) {                                                                                       /* Добивание линии до 4 элементов */
            filtered.push(0);                                                                                               /* Добавление пустой клетки */
        }
        
        return filtered;                                                                                                    /* Возврат обработанной линии */
    }

    saveState() {                                                                                                           /* Сохранение состояния для отмены */
        this.history.push({                                                                                                 /* Добавление в историю */
            board: [...this.board],                                                                                         /* Копия игрового поля */
            score: this.score                                                                                               /* Текущий счет */
        });
        
        if (this.history.length > 10) {                                                                                     /* Ограничение истории */
            this.history.shift();                                                                                           /* Удаление самого старого состояния */
        }
    }

    undo() {                                                                                                                /* Отмена последнего хода */
        if (this.history.length > 0) {                                                                                      /* Если есть история */
            const previousState = this.history.pop();                                                                       /* Извлечение предыдущего состояния */
            this.board = previousState.board;                                                                               /* Восстановление поля */
            this.score = previousState.score;                                                                               /* Восстановление счета */
            this.updateDisplay();                                                                                           /* Обновление отображения */
        }
    }

    newGame() {                                                                                                             /* Начало новой игры */
        this.board = Array(16).fill(0);                                                                                    /* Сброс игрового поля */
        this.score = 0;                                                                                                     /* Сброс счета */
        this.history = [];                                                                                                  /* Очистка истории */
        this.addRandomTile();                                                                                               /* Добавление первой плитки */
        this.addRandomTile();                                                                                               /* Добавление второй плитки */
        this.updateDisplay();                                                                                               /* Обновление отображения */
    }

    isGameOver() {                                                                                                          /* Проверка окончания игры */
        // Проверяем, есть ли пустые клетки
        if (this.board.includes(0)) return false;                                                                           /* Если есть пустые клетки - игра продолжается */
        
        // Проверяем возможность объединения по горизонтали
        for (let i = 0; i < 4; i++) {                                                                                      /* Перебор строк */
            for (let j = 0; j < 3; j++) {                                                                                  /* Перебор колонок кроме последней */
                if (this.board[i * 4 + j] === this.board[i * 4 + j + 1]) {                                                  /* Если соседние плитки одинаковы */
                    return false;                                                                                           /* Игра продолжается */
                }
            }
        }
        
        // Проверяем возможность объединения по вертикали
        for (let i = 0; i < 3; i++) {                                                                                      /* Перебор строк кроме последней */
            for (let j = 0; j < 4; j++) {                                                                                  /* Перебор колонок */
                if (this.board[i * 4 + j] === this.board[(i + 1) * 4 + j]) {                                                /* Если плитки сверху и снизу одинаковы */
                    return false;                                                                                           /* Игра продолжается */
                }
            }
        }
        
        return true;                                                                                                        /* Игра окончена */
    }
}

// Инициализация игры
document.addEventListener('DOMContentLoaded', () => {                                                                       /* После загрузки DOM */
    window.game2048 = new Game2048();                                                                                       /* Создание экземпляра игры */
});

// Сохранение лучшего счёта при закрытии
window.addEventListener('beforeunload', () => {                                                                             /* Перед закрытием страницы */
    if (window.game2048) {                                                                                                  /* Если игра существует */
        localStorage.setItem('2048-best', window.game2048.best);                                                            /* Сохранение лучшего счета */
    }
});