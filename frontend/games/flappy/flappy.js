// flappy.js - Основная игровая логика для игры "Flappy Bird"

(function() {
    'use strict';
    
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    
    // Константы игры
    const W = 240;
    const H = 320;
    const SCALE = 2;
    
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    ctx.scale(SCALE, SCALE);

    // Параметры игры (БАЗОВЫЕ значения)
    const BASE_GAP = 60;          // Базовый зазор между трубами
    const BASE_PIPE_SPEED = 1.8;  // Базовая скорость труб
    const BASE_PIPE_SPACING = 180; // Увеличенное базовое расстояние между трубами (было 110)
    const pipeWidth = 26;
    const floorY = H - 20;
    const gravity = 0.35;
    const flapVel = -5.2;

    // DOM элементы
    const scoreEl = document.getElementById('score');
    const bestEl = document.getElementById('best');
    const btnStart = document.getElementById('btnStart');
    const btnReset = document.getElementById('btnReset');

    // Рекорд
    const bestKey = 'flappy_best_score_v1';
    let best = parseInt(localStorage.getItem(bestKey) || '0', 10);
    bestEl.textContent = String(best);

    // Переменные состояния игры
    let bird, pipes, score, alive, started, gameActive;
    let gameTime = 0;             // Время игры в кадрах
    let startDelay = 90;          // Увеличенная задержка перед появлением первой трубы (90 кадров = ~1.5 секунд)
    let difficultyLevel = 0;      // Уровень сложности

    /**
     * Рассчитывает текущую сложность на основе счета и времени
     */
    function calculateDifficulty() {
        // Сложность увеличивается медленнее: каждые 8 очков (было 5)
        const scoreDifficulty = Math.floor(score / 8);
        
        // Сложность увеличивается медленнее со временем: каждые 30 секунд (было 20)
        const timeDifficulty = Math.floor(gameTime / 1800); // 1800 кадров = 30 секунд
        
        return scoreDifficulty + timeDifficulty;
    }

    /**
     * Получает текущие параметры игры с учетом сложности
     */
    function getGameParameters() {
        difficultyLevel = calculateDifficulty();
        
        // Уменьшаем зазор между трубами медленнее (минимально 45)
        const currentGap = Math.max(BASE_GAP - difficultyLevel * 1.5, 45);
        
        // Увеличиваем скорость труб медленнее (максимально 3.2)
        const currentPipeSpeed = Math.min(BASE_PIPE_SPEED + difficultyLevel * 0.08, 3.2);
        
        // Уменьшаем расстояние между трубами, но начинаем с большего значения
        // На уровне 0: 180, на высоких уровнях: минимально 95
        const currentPipeSpacing = Math.max(BASE_PIPE_SPACING - difficultyLevel * 5, 95);
        
        return {
            gap: currentGap,
            pipeSpeed: currentPipeSpeed,
            pipeSpacing: currentPipeSpacing
        };
    }

    /**
     * Сбрасывает состояние игры к начальным значениям
     */
    function reset() {
        bird = {
            x: 40,
            y: H / 2,
            vy: 0,
            r: 6
        };
        
        pipes = [];
        score = 0;
        alive = true;
        started = false;
        gameActive = false;
        gameTime = 0;
        difficultyLevel = 0;
        
        updateScore();
    }

    /**
     * Начинает игровой процесс
     */
    function startGame() {
        started = true;
        gameActive = true;
        alive = true;
        startDelay = 90; // Сбрасываем задержку при новом старте
    }

    /**
     * Полный рестарт игры (сброс + старт)
     */
    function fullRestart() {
        closeAdIfOpen();
        reset();
        startGame();
    }

    /**
     * Показывает экран приветствия перед началом игры
     */
    function drawWelcomeScreen() {
        // Очищаем canvas
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#6dd5fa');
        grad.addColorStop(1, '#2980b9');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Отрисовываем трубы (если они есть)
        const params = getGameParameters();
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--pipe') || '#2ecc71';
        for (const p of pipes) {
            ctx.fillRect(p.x, 0, pipeWidth, p.top);
            ctx.fillRect(p.x, p.top + params.gap, pipeWidth, H - (p.top + params.gap));
        }

        // Отрисовываем землю
        ctx.fillStyle = '#1f2a38';
        ctx.fillRect(0, floorY, W, H - floorY);

        // Отрисовываем птицу
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bird') || '#f1c40f';
        ctx.beginPath();
        ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
        ctx.fill();

        // Затемняем экран для текста
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, W, H);

        // Заголовок
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 18px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('Flappy Bird', W / 2, H / 2 - 50);

        // Инструкция
        ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('Нажмите ПРОБЕЛ, КЛИК', W / 2, H / 2 - 15);
        ctx.fillText('или кнопку СТАРТ', W / 2, H / 2 + 0);
        ctx.fillText('чтобы начать играть', W / 2, H / 2 + 15);

        // Рекорд
        ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillStyle = '#f1c40f';
        ctx.fillText(`Ваш рекорд: ${best}`, W / 2, H / 2 + 40);
    }

    /**
     * Создает новую трубу
     */
    function spawnPipe() {
        const params = getGameParameters();
        const topH = 30 + Math.floor(Math.random() * (H - params.gap - 80));
        pipes.push({
            x: W + 20,
            top: topH,
            passed: false
        });
    }

    /**
     * Выполняет один шаг игровой логики
     */
    function step() {
        if (!gameActive || !alive) return;
        
        // Увеличиваем счетчик времени
        gameTime++;
        
        // Физика птицы
        bird.vy += gravity;
        bird.y += bird.vy;

        // Проверка столкновения с полом и потолком
        if (bird.y + bird.r > floorY) {
            bird.y = floorY - bird.r;
            alive = false;
            showGameOver();
            return;
        }
        if (bird.y - bird.r < 0) {
            bird.y = bird.r;
            bird.vy = 0;
        }

        // Получаем текущие параметры игры
        const params = getGameParameters();
        
        // Обработка труб
        for (let i = 0; i < pipes.length; i++) {
            const p = pipes[i];
            p.x -= params.pipeSpeed;
            
            if (!p.passed && p.x + pipeWidth < bird.x) {
                p.passed = true;
                score += 1;
                updateScore();
                
                if (score > best) {
                    best = score;
                    localStorage.setItem(bestKey, String(best));
                    bestEl.textContent = String(best);
                    
                    if (window.flappyNotifications) {
                        window.flappyNotifications.showNewRecordNotification(score);
                    }
                }
            }
        }
        
        // Удаляем трубы
        if (pipes.length && pipes[0].x + pipeWidth < -10) {
            pipes.shift();
        }
        
        // Создаем новую трубу
        if (pipes.length === 0) {
            // Первая труба появляется с увеличенной задержкой
            if (gameTime > startDelay) {
                spawnPipe();
            }
        } else if (pipes[pipes.length - 1].x < W - params.pipeSpacing) {
            // Последующие трубы с учетом увеличенного расстояния
            spawnPipe();
        }

        // Проверка столкновений с трубами
        for (const p of pipes) {
            const topRect = { x: p.x, y: 0, w: pipeWidth, h: p.top };
            const botRect = { x: p.x, y: p.top + params.gap, w: pipeWidth, h: H - (p.top + params.gap) };
            
            if (circleRectCollide(bird.x, bird.y, bird.r, topRect) || 
                circleRectCollide(bird.x, bird.y, bird.r, botRect)) {
                alive = false;
                showGameOver();
                return;
            }
        }

        drawGame();
    }

    /**
     * Проверяет столкновение круга с прямоугольником
     */
    function circleRectCollide(cx, cy, cr, r) {
        const testX = Math.max(r.x, Math.min(cx, r.x + r.w));
        const testY = Math.max(r.y, Math.min(cy, r.y + r.h));
        const dx = cx - testX;
        const dy = cy - testY;
        return dx * dx + dy * dy <= cr * cr;
    }

    /**
     * Отрисовывает игровой процесс
     */
    function drawGame() {
        const params = getGameParameters();
        
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#6dd5fa');
        grad.addColorStop(1, '#2980b9');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--pipe') || '#2ecc71';
        for (const p of pipes) {
            ctx.fillRect(p.x, 0, pipeWidth, p.top);
            ctx.fillRect(p.x, p.top + params.gap, pipeWidth, H - (p.top + params.gap));
        }

        ctx.fillStyle = '#1f2a38';
        ctx.fillRect(0, floorY, W, H - floorY);

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bird') || '#f1c40f';
        ctx.beginPath();
        ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
        ctx.fill();

        // Отображение счета и уровня сложности
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(String(score), 8, 18);
        
        // Показываем уровень сложности (только если он > 0)
        if (difficultyLevel > 0) {
            ctx.fillStyle = '#f1c40f';
            ctx.font = '10px system-ui, -apple-system, Segoe UI, Roboto, Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`Ур. ${difficultyLevel}`, W - 8, 18);
        }
    }

    /**
     * Обновляет отображение счета
     */
    function updateScore() {
        scoreEl.textContent = String(score);
    }

    /**
     * Закрывает рекламу если она открыта
     */
    function closeAdIfOpen() {
        const adOverlay = document.getElementById('game-ad-overlay');
        if (adOverlay) {
            adOverlay.remove();
        }
    }

    /**
     * Показывает экран окончания игры
     */
    function showGameOver() {
        gameActive = false;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, W, H);
        
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 18px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('Игра окончена!', W / 2, H / 2 - 50);

        ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText(`Ваш счёт: ${score}`, W / 2, H / 2 - 20);
        
        // Показываем достигнутый уровень сложности
        if (difficultyLevel > 0) {
            ctx.fillText(`Уровень сложности: ${difficultyLevel}`, W / 2, H / 2 + 5);
        }

        if (score === best && score > 0) {
            ctx.fillStyle = '#f1c40f';
            ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
            ctx.fillText('🎉 Новый рекорд! 🎉', W / 2, H / 2 + (difficultyLevel > 0 ? 25 : 5));
            ctx.fillStyle = '#fff';
        }

        ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        const yOffset = difficultyLevel > 0 ? 10 : 0;
        ctx.fillText('Нажмите ПРОБЕЛ, R/К', W / 2, H / 2 + 35 + yOffset);
        ctx.fillText('или кнопку ЗАНОВО', W / 2, H / 2 + 50 + yOffset);
        ctx.fillText('чтобы играть снова', W / 2, H / 2 + 65 + yOffset);

        // Умный показ рекламы
        try {
            if (window.showFullScreenAd) {
                if (score === best && score > 15 && Math.random() < 0.4) {
                    setTimeout(() => window.showFullScreenAd(), 1000);
                } else if (Math.random() < 0.25) {
                    setTimeout(() => window.showFullScreenAd(), 1000);
                } else if (score > 20 && Math.random() < 0.6) {
                    setTimeout(() => window.showFullScreenAd(), 1000);
                }
            }
        } catch (_) {}
    }

    /**
     * Обрабатывает взмах крыльев
     */
    function flap() {
        if (gameActive && alive) {
            bird.vy = flapVel;
        }
    }

    /**
     * Обрабатывает начало игры
     */
    function handleGameStart() {
        closeAdIfOpen();
        
        if (!started) {
            startGame();
        } else if (!gameActive) {
            fullRestart();
        }
    }

    // Обработчики управления
    canvas.addEventListener('mousedown', (e) => {
        if (!started || !gameActive) {
            handleGameStart();
        } else {
            flap();
        }
    });
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!started || !gameActive) {
            handleGameStart();
        } else {
            flap();
        }
    }, { passive: false });
    
    window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        
        // Закрываем рекламу при любом нажатии клавиш управления
        closeAdIfOpen();
        
        if (k === ' ') {
            // Предотвращаем действие по умолчанию для ПРОБЕЛА
            e.preventDefault();
            
            if (!started || !gameActive) {
                handleGameStart();
            } else {
                flap();
            }
        }
        
        if ((k === 'r' || k === 'к') && (!started || !gameActive)) {
            fullRestart();
        }
    });
    
    // Обработчики кнопок управления
    btnStart.addEventListener('click', () => {
        fullRestart();
    });
    
    btnReset.addEventListener('click', () => {
        closeAdIfOpen();
        reset();
        // Убираем фокус с кнопки, чтобы ПРОБЕЛ не нажимал ее автоматически
        btnReset.blur();
    });

    /**
     * Основной игровой цикл
     */
    function loop() {
        if (gameActive) {
            step();
        } else if (!started) {
            drawWelcomeScreen();
        }
        requestAnimationFrame(loop);
    }

    // Инициализация игры
    reset();
    loop();

})();