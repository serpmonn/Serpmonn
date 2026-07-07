// breakout-game.js - Основная игровая логика Арканоида

(function() {
    'use strict';
    
    // Константы игры
    const W = 240, H = 320, SCALE = 2;
    const rows = 5, cols = 8, brickW = 24, brickH = 10, gap = 4;
    const bestKey = 'breakout_best_v1';
    
    // Инициализация canvas
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    ctx.scale(SCALE, SCALE);
    
    // Игровые объекты
    const paddle = { w: 48, h: 8, x: (W - 48) / 2, y: H - 20, speed: 4, vx: 0 };
    const ballInit = { x: W / 2, y: H / 2, r: 4, vx: 2.6, vy: -2.4 };
    let ball = { ...ballInit };
    
    // Позиционирование блоков
    const offsetX = (W - (cols * brickW + (cols - 1) * gap)) / 2;
    const offsetY = 30;
    let bricks = [];
    
    // Состояние игры
    let best = parseInt(localStorage.getItem(bestKey) || '0', 10);
    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const bestEl = document.getElementById('best');
    bestEl.textContent = String(best);
    let score = 0, lives = 3, running = false;
    let raf;

    /**
     * Создает новый набор блоков
     */
    function resetBricks() {
        bricks = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                bricks.push({
                    x: offsetX + c * (brickW + gap),
                    y: offsetY + r * (brickH + gap),
                    w: brickW, h: brickH, alive: true, v: rows - r // ценность блока
                });
            }
        }
    }

    /**
     * Сбрасывает состояние игры
     * @param {boolean} all - полный сброс (с жизнями и очками)
     */
    function reset(all = true) {
        if (all) {
            score = 0;
            lives = 3;
        }
        ball = { ...ballInit };
        paddle.x = (W - paddle.w) / 2;
        paddle.vx = 0;
        resetBricks();
        scoreEl.textContent = String(score);
        livesEl.textContent = String(lives);
        running = false;
        draw();
    }

    /**
     * Запускает игру
     */
    function start() {
        running = true;
    }

    /**
     * Ставит игру на паузу
     */
    function pause() {
        running = false;
    }

    /**
     * Обновляет игровое состояние
     */
    function update() {
        if (!running) return;

        // Движение платформы
        paddle.x += paddle.vx;
        if (paddle.x < 4) paddle.x = 4;
        if (paddle.x + paddle.w > W - 4) paddle.x = W - 4 - paddle.w;

        // Движение мяча
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Коллизия со стенами
        if (ball.x - ball.r < 0) {
            ball.x = ball.r;
            ball.vx *= -1;
        }
        if (ball.x + ball.r > W) {
            ball.x = W - ball.r;
            ball.vx *= -1;
        }
        if (ball.y - ball.r < 0) {
            ball.y = ball.r;
            ball.vy *= -1;
        }

        // Падение мяча
        if (ball.y - ball.r > H) {
            lives -= 1;
            livesEl.textContent = String(lives);
            running = false;
            if (lives <= 0) {
                gameOver();
                return;
            }
            ball = { ...ballInit };
        }

        // Коллизия с платформой
        if (ball.y + ball.r >= paddle.y && 
            ball.y - ball.r <= paddle.y + paddle.h && 
            ball.x >= paddle.x && 
            ball.x <= paddle.x + paddle.w) {
            
            ball.y = paddle.y - ball.r;
            ball.vy *= -1;
            
            // Эффект от места удара
            const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
            ball.vx = 3.2 * hit;
        }

        // Коллизия с блоками
        for (const b of bricks) {
            if (!b.alive) continue;
            
            if (ball.x + ball.r > b.x && 
                ball.x - ball.r < b.x + b.w && 
                ball.y + ball.r > b.y && 
                ball.y - ball.r < b.y + b.h) {
                
                b.alive = false;
                score += b.v;
                scoreEl.textContent = String(score);
                
                // Обновление рекорда
                if (score > best) {
                    best = score;
                    localStorage.setItem(bestKey, String(best));
                    bestEl.textContent = String(best);
                }
                
                // Отскок мяча
                ball.vy *= -1;
                break;
            }
        }

        // Проверка победы
        if (bricks.every(b => !b.alive)) {
            running = false;
            win();
        }
    }

    /**
     * Отрисовывает игровое поле
     */
    function draw() {
        // Фон с градиентом
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#1d2735');
        grad.addColorStop(1, '#0e131b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Отрисовка блоков
        for (const b of bricks) {
            if (!b.alive) continue;
            
            let brickColor;
            if (b.v >= 3) {
                brickColor = getComputedStyle(document.documentElement).getPropertyValue('--brick1') || '#2ecc71';
            } else if (b.v === 2) {
                brickColor = getComputedStyle(document.documentElement).getPropertyValue('--brick2') || '#3498db';
            } else {
                brickColor = getComputedStyle(document.documentElement).getPropertyValue('--brick3') || '#9b59b6';
            }
            
            ctx.fillStyle = brickColor;
            ctx.fillRect(b.x, b.y, b.w, b.h);
        }

        // Платформа
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--paddle') || '#dc3545';
        ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

        // Мяч
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ball') || '#f1c40f';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();

        // HUD - очки
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(String(score), 8, 20);
    }

    /**
     * Обрабатывает окончание игры
     */
    function gameOver() {
        draw();
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('Игра окончена', W / 2, H / 2 - 10);
        ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('Нажмите R — заново', W / 2, H / 2 + 18);
        
        // Показ рекламы
        try {
            if (window.showFullScreenAd) window.showFullScreenAd();
        } catch (_) {}
    }

    /**
     * Обрабатывает победу
     */
    function win() {
        draw();
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('Победа!', W / 2, H / 2 - 10);
        ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('Нажмите R — заново', W / 2, H / 2 + 18);
        
        // Показ рекламы
        try {
            if (window.showFullScreenAd) window.showFullScreenAd();
        } catch (_) {}
    }

    /**
     * Игровой цикл
     */
    function loop() {
        update();
        draw();
        raf = requestAnimationFrame(loop);
    }

    /**
     * Управление движением платформы
     */
    function setPaddle(vx) {
        paddle.vx = vx;
    }

    // Инициализация управления
    function initControls() {
        // Клавиатура
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'a') setPaddle(-paddle.speed);
            else if (k === 'arrowright' || k === 'd') setPaddle(paddle.speed);
            else if (k === ' ') running ? pause() : start();
            else if (k === 'r') reset();
        });

        window.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'a' || k === 'arrowright' || k === 'd') setPaddle(0);
        });

        // Кнопки интерфейса
        document.getElementById('btnStart').addEventListener('click', () => running ? pause() : start());
        document.getElementById('btnReset').addEventListener('click', reset);

        // Сенсорное управление
        initTouchControls();
    }

    /**
     * Инициализация сенсорного управления
     */
    function initTouchControls() {
        let touching = false;
        
        canvas.addEventListener('touchstart', (e) => {
            touching = true;
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = (e.touches[0].clientX - rect.left) / (rect.width / W);
            paddle.x = Math.max(4, Math.min(x, W - paddle.w - 4));
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            if (!touching) return;
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = (e.touches[0].clientX - rect.left) / (rect.width / W);
            paddle.x = Math.max(4, Math.min(x, W - paddle.w - 4));
        }, { passive: false });

        canvas.addEventListener('touchend', () => {
            touching = false;
        });
    }

    // Запуск игры
    reset();
    draw();
    initControls();
    loop();
})();