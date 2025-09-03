class Game2048 {
    constructor() {
        this.board = Array(16).fill(0);
        this.score = 0;
        this.best = parseInt(localStorage.getItem('2048-best')) || 0;
        this.history = [];
        this.init();
    }

    init() {
        this.createBoard();
        this.addRandomTile();
        this.addRandomTile();
        this.updateDisplay();
        this.setupEventListeners();
    }

    createBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';
        
        for (let i = 0; i < 16; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.index = i;
            boardElement.appendChild(tile);
        }
    }

    addRandomTile() {
        const emptyCells = this.board.reduce((acc, cell, index) => {
            if (cell === 0) acc.push(index);
            return acc;
        }, []);

        if (emptyCells.length > 0) {
            const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.board[randomIndex] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    updateDisplay() {
        const tiles = document.querySelectorAll('.tile');
        
        tiles.forEach((tile, index) => {
            const value = this.board[index];
            tile.textContent = value || '';
            tile.className = `tile${value ? ` tile-${value}` : ''}`;
        });

        document.getElementById('score').textContent = this.score;
        document.getElementById('best').textContent = this.best;
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                this.handleKeyPress(e.key);
            }
        });

        // Swipes for mobile devices
        let startX, startY;
        const board = document.getElementById('board');

        board.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        board.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) this.handleKeyPress('ArrowRight');
                else this.handleKeyPress('ArrowLeft');
            } else {
                if (deltaY > 0) this.handleKeyPress('ArrowDown');
                else this.handleKeyPress('ArrowUp');
            }
            
            startX = startY = null;
        });

        // Control buttons
        document.getElementById('new-game').addEventListener('click', () => {
            this.newGame();
        });

        document.getElementById('undo').addEventListener('click', () => {
            this.undo();
        });
    }

    handleKeyPress(key) {
        this.saveState();
        
        let moved = false;
        
        switch (key) {
            case 'ArrowUp':
                moved = this.moveUp();
                break;
            case 'ArrowDown':
                moved = this.moveDown();
                break;
            case 'ArrowLeft':
                moved = this.moveLeft();
                break;
            case 'ArrowRight':
                moved = this.moveRight();
                break;
        }

        if (moved) {
            this.addRandomTile();
            this.updateDisplay();
            
            // Vibration on mobile
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }

            if (this.isGameOver()) {
                setTimeout(() => {
                    alert('Game over! Your score: ' + this.score);
                }, 100);
            }
        }
    }

    moveLeft() {
        return this.moveRows(row => row);
    }

    moveRight() {
        return this.moveRows(row => row.reverse());
    }

    moveUp() {
        return this.moveColumns(col => col);
    }

    moveDown() {
        return this.moveColumns(col => col.reverse());
    }

    moveRows(getRow) {
        let moved = false;
        
        for (let i = 0; i < 4; i++) {
            const row = this.getRow(i);
            const originalRow = [...row];
            const mergedRow = this.mergeLine(getRow(row));
            
            if (JSON.stringify(originalRow) !== JSON.stringify(mergedRow)) {
                moved = true;
                this.setRow(i, mergedRow);
            }
        }
        
        return moved;
    }

    moveColumns(getColumn) {
        let moved = false;
        
        for (let i = 0; i < 4; i++) {
            const column = this.getColumn(i);
            const originalColumn = [...column];
            const mergedColumn = this.mergeLine(getColumn(column));
            
            if (JSON.stringify(originalColumn) !== JSON.stringify(mergedColumn)) {
                moved = true;
                this.setColumn(i, mergedColumn);
            }
        }
        
        return moved;
    }

    getRow(rowIndex) {
        const row = [];
        for (let j = 0; j < 4; j++) {
            row.push(this.board[rowIndex * 4 + j]);
        }
        return row;
    }

    setRow(rowIndex, values) {
        for (let j = 0; j < 4; j++) {
            this.board[rowIndex * 4 + j] = values[j];
        }
    }

    getColumn(colIndex) {
        const column = [];
        for (let i = 0; i < 4; i++) {
            column.push(this.board[i * 4 + colIndex]);
        }
        return column;
    }

    setColumn(colIndex, values) {
        for (let i = 0; i < 4; i++) {
            this.board[i * 4 + colIndex] = values[i];
        }
    }

    mergeLine(line) {
        // Remove zeros
        let filtered = line.filter(cell => cell !== 0);
        
        // Merge equal numbers
        for (let i = 0; i < filtered.length - 1; i++) {
            if (filtered[i] === filtered[i + 1]) {
                filtered[i] *= 2;
                this.score += filtered[i];
                filtered.splice(i + 1, 1);
            }
        }
        
        // Pad with zeros to the end
        while (filtered.length < 4) {
            filtered.push(0);
        }
        
        return filtered;
    }

    saveState() {
        this.history.push({
            board: [...this.board],
            score: this.score
        });
        
        if (this.history.length > 10) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history.length > 0) {
            const previousState = this.history.pop();
            this.board = previousState.board;
            this.score = previousState.score;
            this.updateDisplay();
        }
    }

    newGame() {
        this.board = Array(16).fill(0);
        this.score = 0;
        this.history = [];
        this.addRandomTile();
        this.addRandomTile();
        this.updateDisplay();
    }

    isGameOver() {
        // Check if there are empty cells
        if (this.board.includes(0)) return false;
        
        // Check merge possibility horizontally
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.board[i * 4 + j] === this.board[i * 4 + j + 1]) {
                    return false;
                }
            }
        }
        
        // Check merge possibility vertically
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.board[i * 4 + j] === this.board[(i + 1) * 4 + j]) {
                    return false;
                }
            }
        }
        
        return true;
    }
}

// Game initialization
document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});

// Save best score
window.addEventListener('beforeunload', () => {
    const game = window.game2048;
    if (game && game.score > game.best) {
        localStorage.setItem('2048-best', game.score);
    }
});