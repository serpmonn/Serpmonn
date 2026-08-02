import { showGameFullscreenAd } from '/frontend/scripts/mail-ads-config.js';
import { createEnemies } from './createEnemies.js';
import { generateRandomKeyframes } from './generateRandomKeyframes.js';
import { updatePlayerPosition } from './updatePlayerPosition.js';
import { checkCollision } from './checkCollision.js';
import { loadProgress } from './loadProgress.js';
import { createBonus, checkBonusCollision } from './createBonus.js';
import { t, formatScore } from './i18n.js';

const MAX_LIVES = 3;
const INVINCIBLE_START_MS = 700;
const INVINCIBLE_HIT_MS = 1200;
const INVINCIBLE_LEVEL_MS = 900;
const COMBO_WINDOW_MS = 2800;
const BONUS_BASE = 10;
const SCORE_TICK_MS = 1250;
const MOVE_TICK_MS = 200;
const stepPercent = 1.5;

const gameArea = document.querySelector('.game-area');
let gameAreaRect = gameArea.getBoundingClientRect();
const player = document.getElementById('player');
const playerSize = () => player.getBoundingClientRect().width;
const scoreDisplay = document.getElementById('score');
const scoreValueEl = document.getElementById('scoreValue');
const levelValueEl = document.getElementById('levelValue');
const bestValueEl = document.getElementById('bestValue');
const livesValueEl = document.getElementById('livesValue');
const progressBar = document.getElementById('progressBar');
const comboDisplay = document.getElementById('comboDisplay');
const comboValueEl = document.getElementById('comboValue');
const pauseOverlay = document.getElementById('pauseOverlay');
const levelToast = document.getElementById('levelToast');
const restartButton = document.getElementById('restart');
const homeButton = document.getElementById('home');
const startButton = document.getElementById('start');
const pauseButton = document.getElementById('pauseBtn');
const soundButton = document.getElementById('soundBtn');
const keyframesStyle = document.createElement('style');
keyframesStyle.setAttribute('data-rs-keyframes', '1');
document.head.appendChild(keyframesStyle);
const styleSheet = keyframesStyle.sheet;

let isPaused = true;
let gameStarted = false;
let loopRunning = false;
let playerXPercent = 50;
let playerYPercent = 50;
let score = 0;
let speed = 3.2;
let level = 1;
let lives = MAX_LIVES;
let enemies = [];
let moveDirection = null;
let touchStartX = 0;
let touchStartY = 0;
let invincibleUntil = 0;
let combo = 0;
let lastBonusAt = 0;
let lastScoreAt = 0;
let lastMoveAt = 0;
let soundEnabled = localStorage.getItem('rsSound') !== '0';
let audioCtx = null;

const levels = [
    { speed: 3.2, enemies: 1, points: 40 },
    { speed: 2.8, enemies: 2, points: 100 },
    { speed: 2.4, enemies: 3, points: 180 },
    { speed: 2.0, enemies: 4, points: 280 },
    { speed: 1.7, enemies: 5, points: 400 }
];

const getBest = () => {
    const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
    return Number(highScores[0]) || 0;
};

const saveHighScore = () => {
    const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
    highScores.push(score);
    highScores.sort((a, b) => b - a);
    highScores.splice(5);
    localStorage.setItem('highScores', JSON.stringify(highScores));
    return highScores;
};

const ensureAudio = () => {
    if (!soundEnabled) return null;
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
};

const beep = (freq = 440, dur = 0.08, type = 'square', gain = 0.04) => {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur);
};

const play = {
    bonus: () => beep(740 + combo * 40, 0.07, 'square', 0.045),
    hit: () => beep(160, 0.18, 'sawtooth', 0.05),
    level: () => { beep(520, 0.08); setTimeout(() => beep(780, 0.1), 90); },
    win: () => { beep(523, 0.1); setTimeout(() => beep(659, 0.1), 100); setTimeout(() => beep(784, 0.16), 200); },
    lose: () => beep(110, 0.28, 'triangle', 0.05),
};

const setSoundUi = () => {
    soundButton.textContent = soundEnabled ? t('soundOn') : t('soundOff');
    soundButton.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
};

const renderLives = () => {
    livesValueEl.textContent = '●'.repeat(Math.max(0, lives)) + '○'.repeat(Math.max(0, MAX_LIVES - lives));
    livesValueEl.setAttribute('aria-label', String(lives));
};

const updateHud = () => {
    scoreDisplay.textContent = formatScore(score);
    scoreValueEl.textContent = String(score);
    levelValueEl.textContent = String(Math.min(level, levels.length));
    bestValueEl.textContent = String(Math.max(getBest(), score));
    renderLives();

    const idx = Math.min(level, levels.length) - 1;
    const prevThreshold = idx > 0 ? levels[idx - 1].points : 0;
    const nextThreshold = levels[Math.min(level, levels.length) - 1].points;
    const span = Math.max(1, nextThreshold - prevThreshold);
    const pct = level > levels.length
        ? 100
        : Math.min(100, Math.max(0, ((score - prevThreshold) / span) * 100));
    progressBar.style.width = `${pct}%`;

    if (combo > 1) {
        comboDisplay.hidden = false;
        comboValueEl.textContent = `${t('comboLabel') || 'Combo'} ×${combo}`;
    } else {
        comboDisplay.hidden = true;
    }
};

const grantInvincible = (ms = INVINCIBLE_HIT_MS) => {
    invincibleUntil = Date.now() + ms;
    player.classList.add('player-invincible');
    setTimeout(() => {
        if (Date.now() >= invincibleUntil) {
            player.classList.remove('player-invincible');
        }
    }, ms + 30);
};

const isInvincible = () => Date.now() < invincibleUntil;

const showToast = (text) => {
    levelToast.textContent = text;
    levelToast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { levelToast.hidden = true; }, 1400);
};

const setEnemyAnimState = (state) => {
    document.querySelectorAll('.enemy-fast, .enemy-slow').forEach((enemy) => {
        enemy.style.animationPlayState = state;
    });
};

const ensurePlayerSafePosition = () => {
    const obstacles = document.querySelectorAll('.obstacle');
    let isSafe = false;
    let guard = 0;
    while (!isSafe && guard++ < 40) {
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
                playerXPercent = 10 + Math.random() * 80;
                playerYPercent = 10 + Math.random() * 80;
                updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
                isSafe = false;
                break;
            }
        }
    }
};

window.addEventListener('resize', () => {
    gameAreaRect = gameArea.getBoundingClientRect();
});

const refreshGameAreaRect = () => {
    gameAreaRect = gameArea.getBoundingClientRect();
    return gameAreaRect;
};

const movePlayer = (direction, { force = false } = {}) => {
    if (isPaused || !gameStarted) return;
    const now = Date.now();
    if (!force && now - lastMoveAt < MOVE_TICK_MS) return;
    lastMoveAt = now;
    refreshGameAreaRect();
    if (!gameAreaRect.width || !gameAreaRect.height) return;
    const sizePctW = (playerSize() / gameAreaRect.width) * 100;
    const sizePctH = (playerSize() / gameAreaRect.height) * 100;
    switch (direction) {
        case 'up':
            playerYPercent = Math.max(0, playerYPercent - stepPercent);
            break;
        case 'down':
            playerYPercent = Math.min(100 - sizePctH, playerYPercent + stepPercent);
            break;
        case 'left':
            playerXPercent = Math.max(0, playerXPercent - stepPercent);
            break;
        case 'right':
            playerXPercent = Math.min(100 - sizePctW, playerXPercent + stepPercent);
            break;
    }
    updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
};

const saveProgress = () => {
    const gameState = { playerXPercent, playerYPercent, score, speed, level, lives };
    localStorage.setItem('gameState', JSON.stringify(gameState));
};

const collectBonus = () => {
    const now = Date.now();
    if (now - lastBonusAt <= COMBO_WINDOW_MS) combo += 1;
    else combo = 1;
    lastBonusAt = now;
    const gained = BONUS_BASE * combo;
    score += gained;
    play.bonus();
    updateHud();
    if (level <= levels.length && score >= levels[level - 1].points) {
        nextLevel();
    }
    saveProgress();
};

const updateScoreTick = (now = Date.now()) => {
    if (now - lastScoreAt < SCORE_TICK_MS) return;
    lastScoreAt = now;
    score += 1;
    if (now - lastBonusAt > COMBO_WINDOW_MS) combo = 0;
    updateHud();
    if (level <= levels.length && score >= levels[level - 1].points) {
        nextLevel();
    }
    saveProgress();
};

const nextLevel = () => {
    level += 1;
    if (level <= levels.length) {
        speed = levels[level - 1].speed;
        enemies.forEach((enemy) => enemy.remove());
        enemies = [];
        createEnemies(levels[level - 1].enemies, { speed, gameArea, enemies });
        grantInvincible(INVINCIBLE_LEVEL_MS);
        play.level();
        showToast(`${t('levelUp') || 'Level'} ${level}`);
        updateHud();
    } else {
        play.win();
        endGame({ won: true });
    }
};

const onPlayerHit = () => {
    if (isInvincible() || isPaused || !gameStarted) return;
    lives -= 1;
    play.hit();
    player.classList.add('player-collision');
    setTimeout(() => player.classList.remove('player-collision'), 500);
    combo = 0;
    updateHud();
    if (lives <= 0) {
        play.lose();
        endGame({ won: false });
        return;
    }
    grantInvincible();
    ensurePlayerSafePosition();
    saveProgress();
};

const showResultModal = ({ won }) => {
    const highScores = saveHighScore();
    bestValueEl.textContent = String(highScores[0] || 0);
    const existing = document.querySelector('.modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.className = 'modal';
    const title = won ? t('allLevelsComplete') : (t('gameOverTitle') || 'Game over');
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${title}</h2>
            <p>${t('modalYourScore')} ${score}</p>
            <p>${t('modalBestResult')} ${highScores[0] || 0}</p>
            <button type="button" id="okButton">${t('modalOk')}</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('okButton').addEventListener('click', () => {
        modal.remove();
        setTimeout(() => showGameFullscreenAd(), 500);
    });
};

const endGame = ({ won = false } = {}) => {
    isPaused = true;
    gameStarted = false;
    setEnemyAnimState('paused');
    pauseOverlay.hidden = true;
    pauseButton.hidden = true;
    startButton.hidden = true;
    restartButton.hidden = false;
    localStorage.removeItem('gameState');
    showResultModal({ won });
};

const startGame = () => {
    refreshGameAreaRect();
    const state = loadProgress({
        player, gameArea, gameAreaRect, scoreDisplay, levels, enemies, speed, level, updatePlayerPosition, createEnemies
    });
    playerXPercent = state.playerXPercent;
    playerYPercent = state.playerYPercent;
    score = state.score;
    speed = state.speed;
    level = state.level;
    lives = Number(state.lives) > 0 ? Number(state.lives) : MAX_LIVES;
    combo = 0;
    generateRandomKeyframes({ styleSheet });
    document.querySelectorAll('.bonus').forEach((b) => b.remove());
    createBonus();
    updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
    ensurePlayerSafePosition();
    grantInvincible(INVINCIBLE_START_MS);
    isPaused = false;
    gameStarted = true;
    lastScoreAt = Date.now();
    lastMoveAt = 0;
    pauseOverlay.hidden = true;
    pauseButton.hidden = false;
    restartButton.hidden = false;
    pauseButton.textContent = t('pause');
    updateHud();
    setEnemyAnimState('running');
    ensureAudio();
    if (!loopRunning) {
        loopRunning = true;
        requestAnimationFrame(gameLoop);
    }
};

const resetRun = () => {
    localStorage.removeItem('gameState');
    refreshGameAreaRect();
    playerXPercent = 50;
    playerYPercent = 50;
    score = 0;
    speed = levels[0].speed;
    level = 1;
    lives = MAX_LIVES;
    combo = 0;
    lastScoreAt = Date.now();
    lastMoveAt = 0;
    enemies.forEach((enemy) => enemy.remove());
    enemies = [];
    document.querySelectorAll('.bonus').forEach((b) => b.remove());
    generateRandomKeyframes({ styleSheet });
    createEnemies(levels[0].enemies, { speed, gameArea, enemies });
    updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
    createBonus();
    ensurePlayerSafePosition();
    grantInvincible(INVINCIBLE_START_MS);
    isPaused = false;
    gameStarted = true;
    pauseOverlay.hidden = true;
    pauseButton.hidden = false;
    restartButton.hidden = false;
    startButton.hidden = true;
    pauseButton.textContent = t('pause');
    updateHud();
    setEnemyAnimState('running');
    ensureAudio();
    if (!loopRunning) {
        loopRunning = true;
        requestAnimationFrame(gameLoop);
    }
};

const gameLoop = () => {
    if (!isPaused && gameStarted) {
        const now = Date.now();
        checkCollision(player, enemies, onPlayerHit, { invincible: isInvincible() });
        checkBonusCollision(collectBonus);
        updateScoreTick(now);
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

const bindPad = (id, direction) => {
    const el = document.getElementById(id);
    if (!el) return;
    const start = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.button != null && e.button !== 0) return;
        try { el.setPointerCapture?.(e.pointerId); } catch (_) {}
        startMoving(direction);
        try { navigator.vibrate && navigator.vibrate(10); } catch (_) {}
    };
    const stop = (e) => {
        if (e) e.preventDefault();
        stopMoving();
    };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('pointerleave', (e) => {
        if (el.hasPointerCapture?.(e.pointerId)) stop(e);
    });
    // Fallback for older browsers
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', stop, { passive: false });
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', stop);
};

document.getElementById('understandBtn').addEventListener('click', () => {
    document.getElementById('instructionOverlay').style.display = 'none';
    startButton.hidden = false;
});

startButton.addEventListener('click', () => {
    startButton.hidden = true;
    const hasSave = Boolean(localStorage.getItem('gameState'));
    if (hasSave) startGame();
    else resetRun();
});

pauseButton.addEventListener('click', () => {
    if (!gameStarted) return;
    if (isPaused) {
        setEnemyAnimState('running');
        pauseButton.textContent = t('pause');
        pauseOverlay.hidden = true;
        isPaused = false;
    } else {
        setEnemyAnimState('paused');
        pauseButton.textContent = t('resume');
        pauseOverlay.hidden = false;
        isPaused = true;
    }
});

soundButton.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('rsSound', soundEnabled ? '1' : '0');
    setSoundUi();
    if (soundEnabled) ensureAudio();
});

document.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
    }
    switch (event.key) {
        case 'ArrowUp':
            movePlayer('up', { force: true });
            break;
        case 'ArrowDown':
            movePlayer('down', { force: true });
            break;
        case 'ArrowLeft':
            movePlayer('left', { force: true });
            break;
        case 'ArrowRight':
            movePlayer('right', { force: true });
            break;
        case ' ':
            pauseButton.click();
            break;
        case 'Enter':
            if (!startButton.hidden) startButton.click();
            else restartButton.click();
            break;
    }
});

gameArea.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

gameArea.addEventListener('touchmove', (e) => {
    if (!gameStarted || isPaused) return;
    e.preventDefault();
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        movePlayer(deltaX > 0 ? 'right' : 'left');
    } else {
        movePlayer(deltaY > 0 ? 'down' : 'up');
    }
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: false });

bindPad('up', 'up');
bindPad('down', 'down');
bindPad('left', 'left');
bindPad('right', 'right');

restartButton.addEventListener('click', () => {
    resetRun();
});

homeButton.addEventListener('click', () => {
    const isVkMiniEmbed =
        Boolean(window.__SPN_VK_MINI__) ||
        /(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search) ||
        /vk_app_id=\d+/.test(window.location.search) ||
        document.documentElement.classList.contains('vk-mini-embed') ||
        document.body?.classList?.contains('vk-mini-embed') ||
        window.self !== window.top;
    if (isVkMiniEmbed) {
        try {
            window.parent.postMessage({ type: 'spn-vk-mini-close-viewer' }, window.location.origin);
        } catch (_) {}
        return;
    }
    window.location.href = '/frontend/games/games.html';
});

setSoundUi();
updateHud();
startButton.hidden = true;
pauseButton.hidden = true;
restartButton.hidden = true;
