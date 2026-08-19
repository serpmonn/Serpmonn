import { showGameFullscreenAd } from '/frontend/scripts/mail-ads-config.js';
import { t, formatScore, formatMissed } from './i18n.js';

const MAX_MISSES = 10;
const BASE_OBJECT_SPEED = 1.35;
const SPEED_PER_LEVEL = 0.18;
const MAX_OBJECT_SPEED = 4.8;
const SPAWN_START_MS = 1100;
const SPAWN_MIN_MS = 480;
const SPAWN_STEP_MS = 45;
const HIT_IFRAME_MS = 850;
const PLAYER_SPEED = 5.2;
const FRICTION = 0.88;

const stage = document.getElementById('gameStage');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const missedEl = document.getElementById('missed');
const scoreValueEl = document.getElementById('scoreValue');
const levelValueEl = document.getElementById('levelValue');
const missesValueEl = document.getElementById('missesValue');
const nickValueEl = document.getElementById('nickValue');
const pauseOverlay = document.getElementById('pauseOverlay');
const nicknameForm = document.getElementById('nicknameForm');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const soundBtn = document.getElementById('soundBtn');
const homeBtn = document.getElementById('homeBtn');

const player = {
    x: 0,
    y: 0,
    width: 44,
    height: 44,
    speed: PLAYER_SPEED,
    dx: 0,
    nickname: '',
};

const objects = [];
let objectSpeed = BASE_OBJECT_SPEED;
let score = 0;
let level = 1;
let missedObjects = 0;
let isPaused = false;
let gameStarted = false;
let loopRunning = false;
let lastTime = 0;
let gameInterval = null;
let invincibleUntil = 0;
let touchX = null;
let soundEnabled = localStorage.getItem('rs2Sound') !== '0';
let audioCtx = null;

const isVkMiniEmbed =
    Boolean(window.__SPN_VK_MINI__) ||
    /(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search) ||
    /vk_app_id=\d+/.test(window.location.search) ||
    document.documentElement.classList.contains('vk-mini-embed') ||
    document.body?.classList?.contains('vk-mini-embed') ||
    window.self !== window.top;

const ADD_SCORE_URL = '/add-score';
const BANNED_WORDS_URL = '/proxy/bannedWords';

function scoreTableUrl() {
    return window.i18n?.scoreTableUrl || '/frontend/games/redsquare2/score_table.html';
}

function openScoreTable(hash = 'redsquare2') {
    window.location.href = `${scoreTableUrl()}#${hash}`;
}

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
    const ctxA = ensureAudio();
    if (!ctxA) return;
    const osc = ctxA.createOscillator();
    const g = ctxA.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctxA.destination);
    const now = ctxA.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur);
};

const play = {
    dodge: () => beep(620, 0.05, 'square', 0.03),
    hit: () => beep(170, 0.16, 'sawtooth', 0.05),
    level: () => { beep(480, 0.07); setTimeout(() => beep(720, 0.09), 80); },
    lose: () => beep(110, 0.28, 'triangle', 0.05),
};

const setSoundUi = () => {
    soundBtn.textContent = soundEnabled ? t('soundOn') : t('soundOff');
    soundBtn.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
};

const spawnIntervalMs = () =>
    Math.max(SPAWN_MIN_MS, SPAWN_START_MS - (level - 1) * SPAWN_STEP_MS);

const currentObjectSpeed = () =>
    Math.min(MAX_OBJECT_SPEED, BASE_OBJECT_SPEED + (level - 1) * SPEED_PER_LEVEL);

const resizeCanvas = () => {
    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const prevW = canvas.width || w;
    const ratio = w / prevW;
    canvas.width = w;
    canvas.height = h;
    player.width = Math.max(34, Math.round(w * 0.09));
    player.height = player.width;
    player.y = h - player.height - 10;
    if (gameStarted) {
        player.x = Math.min(Math.max(0, player.x * ratio), w - player.width);
    } else {
        player.x = w / 2 - player.width / 2;
    }
};

const updateHud = () => {
    scoreEl.textContent = formatScore(score);
    missedEl.textContent = formatMissed(missedObjects);
    scoreValueEl.textContent = String(score);
    levelValueEl.textContent = String(level);
    missesValueEl.textContent = `${missedObjects}/${MAX_MISSES}`;
    nickValueEl.textContent = player.nickname || '—';
};

const isInvincible = () => Date.now() < invincibleUntil;

const grantIframe = (ms = HIT_IFRAME_MS) => {
    invincibleUntil = Date.now() + ms;
};

const drawPlayer = () => {
    const color = level % 2 === 0 ? '#3dba7a' : '#f47059';
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffe0d8';
    ctx.lineWidth = 2;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.strokeRect(player.x + 0.5, player.y + 0.5, player.width - 1, player.height - 1);
};

const createObject = () => {
    if (!gameStarted || isPaused) return;
    const size = 18 + Math.random() * 34;
    const x = Math.random() * Math.max(1, canvas.width - size);
    const shapeTypes = ['square', 'circle', 'triangle', 'star'];
    const shape = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
    const dx = (Math.random() - 0.5) * 2.4;
    objects.push({ x, y: -size, size, shape, dx });
};

const objectColorForLevel = () => {
    if (level < 5) return '#5b8cff';
    if (level < 10) return '#e0a24a';
    return '#c084fc';
};

const drawObject = (obj) => {
    ctx.beginPath();
    ctx.fillStyle = objectColorForLevel();
    switch (obj.shape) {
        case 'square':
            ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
            break;
        case 'circle':
            ctx.arc(obj.x + obj.size / 2, obj.y + obj.size / 2, obj.size / 2, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'triangle':
            ctx.moveTo(obj.x + obj.size / 2, obj.y);
            ctx.lineTo(obj.x, obj.y + obj.size);
            ctx.lineTo(obj.x + obj.size, obj.y + obj.size);
            ctx.closePath();
            ctx.fill();
            break;
        case 'star': {
            const centerX = obj.x + obj.size / 2;
            const centerY = obj.y + obj.size / 2;
            const spikes = 5;
            const outerRadius = obj.size / 2;
            const innerRadius = obj.size / 4;
            let rot = (Math.PI / 2) * 3;
            const step = Math.PI / spikes;
            ctx.moveTo(centerX, centerY - outerRadius);
            for (let i = 0; i < spikes; i++) {
                ctx.lineTo(centerX + Math.cos(rot) * outerRadius, centerY + Math.sin(rot) * outerRadius);
                rot += step;
                ctx.lineTo(centerX + Math.cos(rot) * innerRadius, centerY + Math.sin(rot) * innerRadius);
                rot += step;
            }
            ctx.closePath();
            ctx.fill();
            break;
        }
        default:
            break;
    }
};

const maybeLevelUp = () => {
    const nextLevel = Math.floor(score / 10) + 1;
    if (nextLevel > level) {
        level = nextLevel;
        objectSpeed = currentObjectSpeed();
        play.level();
        restartSpawnTimer();
        updateHud();
    }
};

const updateObjects = (deltaTime) => {
    const scale = deltaTime / 16;
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        obj.y += objectSpeed * scale;
        obj.x += obj.dx * scale;
        if (obj.x < 0) obj.x = 0;
        if (obj.x + obj.size > canvas.width) obj.x = canvas.width - obj.size;

        // Упал на пол — промах (не поймали)
        if (obj.y + obj.size > canvas.height) {
            objects.splice(i, 1);
            missedObjects += 1;
            play.hit();
            updateHud();
            if (missedObjects >= MAX_MISSES) {
                endGame();
            }
            continue;
        }

        const hit =
            obj.x < player.x + player.width &&
            obj.x + obj.size > player.x &&
            obj.y < player.y + player.height &&
            obj.y + obj.size > player.y;

        // Поймали фигуру — очко
        if (hit) {
            objects.splice(i, 1);
            score += 1;
            play.dodge();
            updateHud();
            maybeLevelUp();
        }
    }
};

const clear = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const movePlayer = (deltaTime) => {
    player.dx *= FRICTION;
    if (Math.abs(player.dx) < 0.05) player.dx = 0;
    player.x += player.dx * (deltaTime / 16);
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
};

const update = (timestamp) => {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = Math.min(48, timestamp - lastTime);
    lastTime = timestamp;

    if (gameStarted && !isPaused) {
        clear();
        drawPlayer();
        objects.forEach(drawObject);
        updateObjects(deltaTime);
        movePlayer(deltaTime);
    } else if (gameStarted && isPaused) {
        clear();
        drawPlayer();
        objects.forEach(drawObject);
    }
    requestAnimationFrame(update);
};

const keyDown = (e) => {
    if (!gameStarted || isPaused) return;
    if (e.key === 'ArrowRight' || e.key === 'Right') {
        e.preventDefault();
        player.dx = player.speed;
    } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
        e.preventDefault();
        player.dx = -player.speed;
    } else if (e.key === ' ') {
        e.preventDefault();
        pauseBtn.click();
    }
};

const keyUp = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'Right' || e.key === 'ArrowLeft' || e.key === 'Left') {
        player.dx = 0;
    }
};

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

canvas.addEventListener('touchstart', (e) => {
    touchX = e.touches[0].clientX;
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
    if (!gameStarted || isPaused || touchX === null) return;
    e.preventDefault();
    const newTouchX = e.touches[0].clientX;
    player.x += newTouchX - touchX;
    touchX = newTouchX;
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
}, { passive: false });

canvas.addEventListener('touchend', () => { touchX = null; }, { passive: true });

const restartSpawnTimer = () => {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(createObject, spawnIntervalMs());
};

const showResultModal = (finalScore) => {
    const existing = document.querySelector('.rs2-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.className = 'rs2-modal';
    modal.innerHTML = `
      <div class="rs2-modal-content">
        <h2>${t('gameOverTitle') || 'Игра окончена'}</h2>
        <p>${t('modalYourScore') || 'Твои очки:'} ${finalScore}</p>
        <div class="rs2-modal-actions">
          <button type="button" id="rs2LbBtn">${t('lbTitle') || 'Таблица лидеров'}</button>
          <button type="button" id="rs2RestartBtn">${t('lbRestart') || 'Играть снова'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#rs2LbBtn').addEventListener('click', () => {
        modal.remove();
        openScoreTable('redsquare2');
    });
    modal.querySelector('#rs2RestartBtn').addEventListener('click', () => {
        modal.remove();
        restartGame();
    });
};

function endGame() {
    isPaused = true;
    gameStarted = false;
    pauseOverlay.hidden = true;
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = null;
    play.lose();
    const finalScore = score;
    pauseBtn.hidden = true;

    const afterSubmit = () => {
        showResultModal(finalScore);
        if (!isVkMiniEmbed) {
            setTimeout(() => showGameFullscreenAd(), 400);
        }
    };

    fetch(ADD_SCORE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: player.nickname, score: finalScore, gameId: 'redsquare2' }),
    })
        .then(() => afterSubmit())
        .catch(() => afterSubmit());
}

function restartGame() {
    if (!player.nickname) {
        nicknameForm.hidden = false;
        return;
    }
    score = 0;
    level = 1;
    missedObjects = 0;
    objectSpeed = BASE_OBJECT_SPEED;
    objects.length = 0;
    resizeCanvas();
    player.x = canvas.width / 2 - player.width / 2;
    player.dx = 0;
    isPaused = false;
    gameStarted = true;
    invincibleUntil = 0;
    pauseOverlay.hidden = true;
    pauseBtn.hidden = false;
    restartBtn.hidden = false;
    pauseBtn.textContent = t('pause');
    updateHud();
    restartSpawnTimer();
    ensureAudio();
    if (!loopRunning) {
        loopRunning = true;
        lastTime = 0;
        requestAnimationFrame(update);
    }
}

const startGameWithNickname = (nickname) => {
    player.nickname = nickname;
    nicknameForm.hidden = true;
    updateHud();
    restartGame();
};

fetch(BANNED_WORDS_URL)
    .then((response) => response.json())
    .then((data) => {
        const containsBannedWords = (nickname) => {
            for (const item of data) {
                if (nickname.toLowerCase().includes(item.word)) return true;
            }
            return false;
        };

        nicknameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nickname = document.getElementById('nickname').value.trim();
            if (!nickname) return;
            if (containsBannedWords(nickname)) {
                alert(t('bannedNicknameAlert'));
                return;
            }
            startGameWithNickname(nickname);
        });
    })
    .catch(() => {
        nicknameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nickname = document.getElementById('nickname').value.trim();
            if (!nickname) return;
            startGameWithNickname(nickname);
        });
    });

const instructionOverlay = document.getElementById('instructionOverlay');
const understandBtn = document.getElementById('understandBtn');

const dismissInstruction = (e) => {
    if (typeof window.__rs2DismissInstruction === 'function') {
        window.__rs2DismissInstruction(e);
    } else if (instructionOverlay && !instructionOverlay.classList.contains('is-hidden')) {
        instructionOverlay.classList.add('is-hidden');
        instructionOverlay.hidden = true;
        instructionOverlay.style.cssText = 'display:none!important;pointer-events:none!important';
        instructionOverlay.setAttribute('aria-hidden', 'true');
        nicknameForm.hidden = false;
    }
    requestAnimationFrame(() => {
        resizeCanvas();
        try {
            window.dispatchEvent(new Event('resize'));
        } catch (_) {}
    });
};

const lockVkArcadeLayout = () => {
    if (!isVkMiniEmbed) return;
    const html = document.documentElement;
    const body = document.body;
    html.classList.add('vk-mini-embed');
    body.classList.add('vk-mini-embed');
    window.__SPN_VK_MINI__ = true;
    ['height', 'min-height', 'max-height'].forEach((prop) => {
        html.style.setProperty(prop, '100%', 'important');
        body.style.setProperty(prop, '100%', 'important');
    });
    html.style.setProperty('overflow', 'hidden', 'important');
    body.style.setProperty('overflow', 'hidden', 'important');
    body.style.setProperty('position', 'relative', 'important');
    body.style.setProperty('touch-action', 'manipulation', 'important');
};

lockVkArcadeLayout();
[50, 200, 600, 1200].forEach((ms) => setTimeout(lockVkArcadeLayout, ms));

if (understandBtn) {
    understandBtn.addEventListener('click', dismissInstruction, true);
    understandBtn.addEventListener('touchend', dismissInstruction, { capture: true, passive: false });
}
if (instructionOverlay) {
    instructionOverlay.addEventListener('click', (e) => {
        if (e.target === instructionOverlay) dismissInstruction(e);
    }, true);
}

leaderboardBtn.addEventListener('click', () => {
    openScoreTable('redsquare2');
});

homeBtn.addEventListener('click', () => {
    if (isVkMiniEmbed) {
        try {
            window.parent.postMessage({ type: 'spn-vk-mini-close-viewer' }, window.location.origin);
        } catch (_) {}
        return;
    }
    window.location.href = '/frontend/games/games.html';
});

pauseBtn.addEventListener('click', () => {
    if (!gameStarted) return;
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? t('resume') : t('pause');
    pauseOverlay.hidden = !isPaused;
});

restartBtn.addEventListener('click', () => {
    restartGame();
});

soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('rs2Sound', soundEnabled ? '1' : '0');
    setSoundUi();
    if (soundEnabled) ensureAudio();
});

window.addEventListener('resize', () => {
    resizeCanvas();
    if (gameStarted) {
        clear();
        drawPlayer();
        objects.forEach(drawObject);
    }
});

if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => resizeCanvas()).observe(stage);
}

setSoundUi();
resizeCanvas();
updateHud();
nicknameForm.hidden = true;
pauseBtn.hidden = true;
restartBtn.hidden = true;
