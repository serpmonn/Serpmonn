import { generateCombinedBackground } from '/frontend/scripts/backgroundGenerator.js';
import { createEnemies } from './createEnemies.js';
import { generateRandomKeyframes } from './generateRandomKeyframes.js';
import { updatePlayerPosition } from './updatePlayerPosition.js';
import { checkCollision } from './checkCollision.js';
import { loadProgress } from './loadProgress.js';
import { createBonus, checkBonusCollision } from './createBonus.js';

const gameArea = document.querySelector('.game-area');
let gameAreaRect = gameArea.getBoundingClientRect();
const player = document.getElementById('player');
const playerSize = player.getBoundingClientRect().width;
const scoreDisplay = document.getElementById('score');
const restartButton = document.getElementById('restart');
const homeButton = document.getElementById('home');
const startButton = document.getElementById('start');
const pauseButton = document.getElementById('pauseBtn');
const styleSheet = document.styleSheets[0];
const stepPercent = 2;
let isPaused = true;
let playerXPercent = 50;
let playerYPercent = 50;
let score = 0;
let speed = 3;
let level = 1;
let enemies = [];
let moveDirection = null;
let touchStartX, touchStartY;

const levels = [
    { speed: 3, enemies: 1, points: 20 },
    { speed: 2.5, enemies: 2, points: 40 },
    { speed: 2, enemies: 3, points: 60 },
    { speed: 1.8, enemies: 4, points: 100 },
    { speed: 1.5, enemies: 5, points: 150 }
];

window.addEventListener('resize', () => {
    gameAreaRect = gameArea.getBoundingClientRect();
});

const saveHighScore = () => {
    const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
    highScores.push(score);
    highScores.sort((a, b) => b - a);
    highScores.splice(5);
    localStorage.setItem('highScores', JSON.stringify(highScores));
    return highScores;
};

const ensurePlayerSafePosition = () => {
    const obstacles = document.querySelectorAll('.obstacle');
    let isSafe = false;
    while (!isSafe) {
        isSafe = true;
        for (const obstacle of obstacles) {
            const obstacleRect = obstacle.getBoundingClientRect();
            const playerRect = player.getBoundingClientRect();
            if (
                playerRect.left < obstacleRect.right &&
                playerRect.right > obstacleRect.left &&
                playerRect.top < obstacleRect.bottom &&
                playerRect.bottom > obstacleRect.top
            ) {
                playerXPercent = Math.random() * 90;
                playerYPercent = Math.random() * 90;
                updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
                isSafe = false;
                break;
            }
        }
    }
};

const movePlayer = (direction) => {
    if (isPaused) return;
    switch (direction) {
        case 'up':
            playerYPercent = Math.max(0, playerYPercent - stepPercent);
            break;
        case 'down':
            playerYPercent = Math.min(100 - (playerSize / gameAreaRect.height) * 100, playerYPercent + stepPercent);
            break;
        case 'left':
            playerXPercent = Math.max(0, playerXPercent - stepPercent);
            break;
        case 'right':
            playerXPercent = Math.min(100 - (playerSize / gameAreaRect.width) * 100, playerXPercent + stepPercent);
            break;
    }
    updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
};

const updateScore = () => {
    score++;
    scoreDisplay.textContent = 'Очки: ' + score;
    if (score >= levels[level - 1].points) {
        nextLevel();
    }
    saveProgress();
};

const nextLevel = () => {
    level++;
    if (level <= levels.length) {
        speed = levels[level - 1].speed;
        enemies.forEach(enemy => enemy.remove());
        enemies = [];
        createEnemies(levels[level - 1].enemies, { speed, gameArea, enemies });
    } else {
        alert('Ты прошёл все уровни! Поздравляем!');
        endGame();
    }
};

const saveProgress = () => {
    const gameState = { playerXPercent, playerYPercent, score, speed, level };
    localStorage.setItem('gameState', JSON.stringify(gameState));
};

const startGame = () => {
    const state = loadProgress({
        player, gameArea, gameAreaRect, scoreDisplay, levels, enemies, speed, level, updatePlayerPosition, createEnemies
    });
    playerXPercent = state.playerXPercent;
    playerYPercent = state.playerYPercent;
    score = state.score;
    speed = state.speed;
    level = state.level;
    generateRandomKeyframes({ styleSheet });
    createBonus();
    ensurePlayerSafePosition();
    isPaused = false;
    requestAnimationFrame(gameLoop);
};

const endGame = () => {
    isPaused = true;
    const highScores = saveHighScore();
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Твои очки: ${score}</h2>
            <p>Лучший результат: ${highScores[0] || 0}</p>
            <button id="okButton">Окей</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('okButton').addEventListener('click', () => {
        modal.remove();
        setTimeout(() => {
            const adContainer = document.createElement('ins');
            adContainer.className = 'mrg-tag';
            adContainer.setAttribute('data-ad-client', 'ad-1844881');
            adContainer.setAttribute('data-ad-slot', '1844881');
            document.body.appendChild(adContainer);
            const adInitScript = document.createElement('script');
            adInitScript.innerHTML = '(MRGtag = window.MRGtag || []).push({})';
            document.body.appendChild(adInitScript);
        }, 3000);
    });
};

const gameLoop = () => {
    if (!isPaused) {
        checkCollision(player, enemies, endGame);
        checkBonusCollision();
        updateScore();
    }
    requestAnimationFrame(gameLoop);
};

const startMoving = (direction) => {
    moveDirection = direction;
    requestAnimationFrame(move);
};

const stopMoving = () => {
    moveDirection = null;
};

const move = () => {
    if (moveDirection) {
        movePlayer(moveDirection);
        requestAnimationFrame(move);
    }
};

document.getElementById('understandBtn').addEventListener('click', () => {
    document.getElementById('instructionOverlay').style.display = 'none';
    document.getElementById('start').style.display = 'block';
});

startButton.addEventListener('click', () => {
    startButton.style.display = 'none';
    startGame();
});

pauseButton.addEventListener('click', () => {
    const enemies = document.querySelectorAll('.enemy-fast, .enemy-slow');
    if (isPaused) {
        enemies.forEach(enemy => enemy.style.animationPlayState = 'running');
        pauseButton.textContent = 'Пауза';
    } else {
        enemies.forEach(enemy => enemy.style.animationPlayState = 'paused');
        pauseButton.textContent = 'Продолжить';
    }
    isPaused = !isPaused;
});

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            movePlayer('up');
            break;
        case 'ArrowDown':
            movePlayer('down');
            break;
        case 'ArrowLeft':
            movePlayer('left');
            break;
        case 'ArrowRight':
            movePlayer('right');
            break;
        case ' ':
            pauseButton.click();
            break;
        case 'Enter':
            restartButton.click();
            break;
    }
});

gameArea.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

gameArea.addEventListener('touchmove', (e) => {
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        movePlayer(deltaX > 0 ? 'right' : 'left');
    } else {
        movePlayer(deltaY > 0 ? 'down' : 'up');
    }
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.getElementById('up').addEventListener('mousedown', () => { startMoving('up'); try { navigator.vibrate && navigator.vibrate(10); } catch (_) {} });
document.getElementById('up').addEventListener('mouseup', stopMoving, { passive: true });
document.getElementById('up').addEventListener('touchstart', () => { startMoving('up'); try { navigator.vibrate && navigator.vibrate(10); } catch (_) {} }, { passive: true });
document.getElementById('up').addEventListener('touchend', stopMoving, { passive: true });

document.getElementById('down').addEventListener('mousedown', () => { startMoving('down'); try { navigator.vibrate && navigator.vibrate(10); } catch (_) {} });
document.getElementById('down').addEventListener('mouseup', stopMoving, { passive: true });
document.getElementById('down').addEventListener('touchstart', () => { startMoving('down'); try { navigator.vibrate && navigator.vibrate(10); } catch (_) {} }, { passive: true });
document.getElementById('down').addEventListener('touchend', stopMoving, { passive: true });

document.getElementById('left').addEventListener('mousedown', () => { startMoving('left'); try { navigator.vibrate && navigator.vibrate(10); } catch (_) {} });
document.getElementById('left').addEventListener('mouseup', stopMoving, { passive: true });
document.getElementById('left').addEventListener('touchstart', () => { startMoving('left'); try { navigator.vibrate && navigator.vibrate(10); } catch (_) {} }, { passive: true });
document.getElementById('left').addEventListener('touchend', stopMoving, { passive: true });

document.getElementById('right').addEventListener('mousedown', () => { startMoving('right'); try { navigator.vibrate && navigator.vibrate(10); } catch (_) {} });
document.getElementById('right').addEventListener('mouseup', stopMoving, { passive: true });
document.getElementById('right').addEventListener('touchstart', () => { startMoving('right'); try { navigator.vibrate && navigator.vibrate(10); } catch (_) {} }, { passive: true });
document.getElementById('right').addEventListener('touchend', stopMoving, { passive: true });

restartButton.addEventListener('click', () => {
    playerXPercent = 50;
    playerYPercent = 50;
    score = 0;
    speed = 3;
    level = 1;
    enemies.forEach(enemy => enemy.remove());
    enemies = [];
    scoreDisplay.textContent = 'Очки: ' + score;
    isPaused = false;
    generateRandomKeyframes({ styleSheet });
    createEnemies(levels[0].enemies, { speed, gameArea, enemies });
    updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
    createBonus();
    ensurePlayerSafePosition();
    requestAnimationFrame(gameLoop);
});

homeButton.addEventListener('click', () => {
    window.location.href = 'https://www.serpmonn.ru';
});

document.addEventListener('DOMContentLoaded', () => {
    generateCombinedBackground().catch(error => {
        console.error('Задача завершена с ошибкой', error);
    });
    const adScript = document.createElement('script');
    adScript.src = "https://ad.mail.ru/static/ads-async.js";
    adScript.async = true;
    document.body.appendChild(adScript);
});