// flappy.js - Основная игровая логика для игры "Flappy Bird"

// Основная функция игры, обернутая в IIFE для изоляции scope
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

    // Параметры игры
    const gap = 60;
    const pipeWidth = 26;
    const floorY = H - 20;
    const gravity = 0.35;
    const flapVel = -5.2;
    const pipeSpeed = 1.8;

    // DOM элементы
    const scoreEl = document.getElementById('score');
    const bestEl = document.getElementById('best');
    const btnStart = document.getElementById('btnStart');
    const btnReset = document.getElementById('btnReset');

    // Рекорд
    const bestKey = 'flappy_best_score_v1';

    function t(key, fallback) {
        return (window.i18n && window.i18n[key]) || fallback;
    }

    function tVar(key, fallback, score) {
        return t(key, fallback).replace('{score}', String(score));
    }

    let best = parseInt(localStorage.getItem(bestKey) || '0', 10);
    bestEl.textContent = String(best);

    // Переменные состояния игры
    let bird, pipes, score, alive, started, gameActive;
    let resetButtonClicked = false; // Флаг для отслеживания нажатия кнопки "Заново"

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
        
        spawnPipe();
        updateScore();
    }

    /**
     * Начинает игровой процесс
     */
    function startGame() {
        started = true;
        gameActive = true;
        alive = true;
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

        // Отрисовываем трубы
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--pipe') || '#2ecc71';
        for (const p of pipes) {
            ctx.fillRect(p.x, 0, pipeWidth, p.top);
            ctx.fillRect(p.x, p.top + gap, pipeWidth, H - (p.top + gap));
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
        ctx.fillText(t('welcomeTitle', 'Flappy Bird'), W / 2, H / 2 - 50);

        // Инструкция
        ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText(t('welcomeLine1', 'Press SPACE or CLICK'), W / 2, H / 2 - 15);
        ctx.fillText(t('welcomeLine2', 'or the START button'), W / 2, H / 2 + 0);
        ctx.fillText(t('welcomeLine3', 'to begin playing'), W / 2, H / 2 + 15);

        // Рекорд
        ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillStyle = '#f1c40f';
        ctx.fillText(tVar('yourBest', 'Your best: {score}', best), W / 2, H / 2 + 40);
    }

    /**
     * Создает новую трубу
     */
    function spawnPipe() {
        const topH = 30 + Math.floor(Math.random() * (H - gap - 80));
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

        // Обработка труб
        for (let i = 0; i < pipes.length; i++) {
            const p = pipes[i];
            p.x -= pipeSpeed;
            
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
        if (pipes.length === 0 || pipes[pipes.length - 1].x < W - 110) {
            spawnPipe();
        }

        // Проверка столкновений с трубами
        for (const p of pipes) {
            const topRect = { x: p.x, y: 0, w: pipeWidth, h: p.top };
            const botRect = { x: p.x, y: p.top + gap, w: pipeWidth, h: H - (p.top + gap) };
            
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
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#6dd5fa');
        grad.addColorStop(1, '#2980b9');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--pipe') || '#2ecc71';
        for (const p of pipes) {
            ctx.fillRect(p.x, 0, pipeWidth, p.top);
            ctx.fillRect(p.x, p.top + gap, pipeWidth, H - (p.top + gap));
        }

        ctx.fillStyle = '#1f2a38';
        ctx.fillRect(0, floorY, W, H - floorY);

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bird') || '#f1c40f';
        ctx.beginPath();
        ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(String(score), 8, 18);
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
        ctx.fillText(t('gameOver', 'Game over!'), W / 2, H / 2 - 50);

        ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText(tVar('yourScore', 'Your score: {score}', score), W / 2, H / 2 - 20);

        if (score === best && score > 0) {
            ctx.fillStyle = '#f1c40f';
            ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
            ctx.fillText(t('newRecord', '🎉 New record! 🎉'), W / 2, H / 2 + 5);
            ctx.fillStyle = '#fff';
        }

        ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText(t('restartLine1', 'Press SPACE, R'), W / 2, H / 2 + 35);
        ctx.fillText(t('restartLine2', 'or RESTART button'), W / 2, H / 2 + 50);
        ctx.fillText(t('restartLine3', 'to play again'), W / 2, H / 2 + 65);

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
        
        // Сбрасываем флаг нажатия кнопки "Заново"
        resetButtonClicked = false;
        
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