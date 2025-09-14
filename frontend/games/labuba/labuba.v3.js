/*
  Labuba v3 — gameplay upgrades
  - Near-miss combo (stay close to hazards to build multiplier)
  - Pointer controls: left/right zones to move, center to jump
  - Extra obstacle types (basic, tall, vertical mover)
  - Boss phase after 45s: sweeping hazard
  - Keeps analytics and leaderboard writes
*/

// Определяем глобальные переменные для использования в разных функциях
let width, height, DAILY_SEED, rand, MOODS;

// Функции для работы с аналитикой и лидербордом
const ANALYTICS_BASE = '/api/analytics/game';

function postScore(nickname, score) {
    try {
        return fetch(`/add-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, score, gameId: 'labuba' })
        }).catch(() => {});
    } catch {}
}

function sendEvent(type, payload) {
    try {
        fetch(`${ANALYTICS_BASE}/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: 'labuba', type, ...payload })
        }).catch(() => {});
    } catch {}
}

function getDailySeed() {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

// PRNG from seed
function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function hashCode(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
}

// Geometry helpers
function getRectBounds(obj) {
    if (obj.body) {
        const b = obj.body;
        return {
            left: b.position.x,
            right: b.position.x + b.width,
            top: b.position.y,
            bottom: b.position.y + b.height
        };
    }
    if (obj.getBounds) {
        const gb = obj.getBounds();
        return { left: gb.x, right: gb.x + gb.width, top: gb.y, bottom: gb.y + gb.height };
    }
    const w = obj.width || 0, h = obj.height || 0;
    return { left: obj.x - w/2, right: obj.x + w/2, top: obj.y - h/2, bottom: obj.y + h/2 };
}

function rectsOverlap(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function distanceRectToRect(a, b) {
    // returns 0 if overlapping
    const dx = Math.max(b.left - a.right, a.left - b.right, 0);
    const dy = Math.max(b.top - a.bottom, a.top - b.bottom, 0);
    if (dx === 0 && dy === 0) return 0;
    return Math.hypot(dx, dy);
}

class LabubaScene extends Phaser.Scene {
    constructor() { 
        super('LabubaScene');
        this.__sinceLastSpawn = 0;
        this.__spawnCount = 0;
    }

    preload() {
        // Create 1x1 texture for physics images
        const buffer = new ArrayBuffer(4);
        const view = new Uint32Array(buffer);
        view[0] = 0xffffffff; // White pixel
        this.textures.addBase64('lbpx', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    }

    create() {
        this.score = 0;
        this.combo = 1;
        this.comboNearMs = 0;
        this.isGameOver = false;
        this.startTime = this.time.now;
        this.moodIndex = 0;
        this.bossSpawned = false;

        // Physics world and camera bounds
        this.physics.world.setBounds(0, 0, width, height);
        this.cameras.main.setBounds(0, 0, width, height);
        sendEvent('game_start', { seed: DAILY_SEED });

        // Player — spawn at left bottom platform edge
        const playerSize = 22;
        // Исправленная позиция спавна - ближе к левому краю и над землей
        const playerX = 60; // Отступ от левого края
        const playerY = height - 60; // Отступ от нижнего края (над землей)
        
        this.player = this.physics.add.image(playerX, playerY, 'lbpx')
            .setDisplaySize(playerSize, playerSize)
            .setTint(MOODS[this.moodIndex].color);
            
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.0);
        this.player.body.setGravityY(800);
        // Slightly shrink player's body for fair collisions
        this.player.body.setSize(Math.max(4, playerSize - 4), Math.max(4, playerSize - 4), true);

        // Ground - увеличим высоту земли для лучшей видимости
        const groundHeight = 60;
        const ground = this.add.rectangle(width/2, height - groundHeight/2, width, groundHeight, 0x1f2937);
        this.physics.add.existing(ground, true);
        this.physics.add.collider(this.player, ground);

        // Obstacles (non-physics; manual movement and AABB collisions)
        this.obstacles = this.add.group();

        // Boss group
        this.bossGroup = this.physics.add.group();
        this.physics.add.overlap(this.player, this.bossGroup, () => this.gameOver(), null, this);

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D,
            R: Phaser.Input.Keyboard.KeyCodes.R,
            M: Phaser.Input.Keyboard.KeyCodes.M,
            SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
            SKEY: Phaser.Input.Keyboard.KeyCodes.S
        });

        // Pointer zones: left/right move, center jump
        this.pointerLeft = false;
        this.pointerRight = false;
        this.input.on('pointerdown', (p) => {
            if (p.x < width * 0.35) {
                this.pointerLeft = true;
            } else if (p.x > width * 0.65) {
                this.pointerRight = true;
            } else {
                if (this.player.body.blocked.down) this.player.body.setVelocityY(-MOODS[this.moodIndex].jump);
            }
        });
        this.input.on('pointerup', () => { this.pointerLeft = false; this.pointerRight = false; });

        // UI
        this.scoreText = this.add.text(12, 12, 'Score: 0', { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '16px', color: '#e5e7eb' }).setDepth(10);
        this.comboText = this.add.text(12, 34, 'Combo x1', { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '14px', color: '#93c5fd' }).setDepth(10);
        this.moodText = this.add.text(12, 54, 'Mood: Весёлый', { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '14px', color: '#d1fae5' }).setDepth(10);
        this.seedText = this.add.text(width - 12, 12, `Seed: ${DAILY_SEED}` , { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '12px', color: '#9ca3af' }).setOrigin(1,0).setDepth(10);
        this.debugText = this.add.text(width - 12, 28, '', { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '12px', color: '#94a3b8' }).setOrigin(1,0).setDepth(10);

        // Spawner
        const baseDelay = 900 / MOODS[this.moodIndex].hazardMul;
        this.spawnTimer = this.time.addEvent({ delay: baseDelay, loop: true, callback: this.spawnObstacle, callbackScope: this });
        // ensure immediate first obstacle
        this.spawnObstacle();

        // Keys handlers
        this.input.keyboard.on('keydown-M', () => this.changeMood());
        this.input.keyboard.on('keydown-S', () => this.share());
        this.input.keyboard.on('keydown-R', () => this.scene.restart());
    }

    changeMood() {
        if (this.isGameOver) return;
        this.moodIndex = (this.moodIndex + 1) % MOODS.length;
        const mood = MOODS[this.moodIndex];
        sendEvent('mood_switch', { mood: mood.key });
        this.player.setTint(mood.color);
        this.moodText.setText(`Mood: ${mood.label}`);
        if (this.spawnTimer) this.spawnTimer.remove(false);
        const newDelay = 900 / mood.hazardMul;
        this.spawnTimer = this.time.addEvent({ delay: newDelay, loop: true, callback: this.spawnObstacle, callbackScope: this });
    }

    spawnObstacle() {
        if (this.isGameOver) return;
        this.__sinceLastSpawn = 0;
        this.__spawnCount = (this.__spawnCount || 0) + 1;
        this.__sinceLastSpawn = 0;
        
        // Stable basic obstacle only (leftward constant motion)
        const s = Math.floor(18 + rand() * 10);
        const sizeW = s, sizeH = s;
        const y = height - 80 - s/2; // Отступ от земли увеличен
        const rect = this.add.rectangle(width + s/2, y, sizeW, sizeH, 0xf43f5e); // Спавн за пределами экрана справа
        rect.setDepth(5);
        rect.__vx = -240; // px/s
        rect.__kind = 'basic';
        this.obstacles.add(rect);
    }

    spawnBoss() {
        this.bossSpawned = true;
        const w = 120, h = 16;
        const y = height - 110;
        const boss = this.add.rectangle(width + w/2, y, w, h, 0x22d3ee);
        this.physics.add.existing(boss);
        boss.body.setAllowGravity(false);
        boss.body.setVelocityX(-220);
        boss.__phase = 0;
        boss.update = () => {
            boss.__phase += 0.03;
            // gently follow player vertical band
            const targetY = Math.max(100, Math.min(height - 80, this.player.y - 40 + Math.sin(boss.__phase) * 30));
            boss.y += (targetY - boss.y) * 0.04;
            if (boss.x < -80) boss.destroy();
        };
        this.bossGroup.add(boss);
        const txt = this.add.text(width/2, 80, 'BOSS!', { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '20px', color: '#67e8f9' }).setOrigin(0.5).setDepth(12);
        this.tweens.add({ targets: txt, alpha: 0, duration: 1200, ease: 'Sine.easeOut', onComplete: () => txt.destroy() });
    }

    update(time, delta) {
        if (this.isGameOver) return;

        const mood = MOODS[this.moodIndex];
        const onGround = this.player.body.blocked.down;
        const moveLeft = this.cursors.left.isDown || this.keys.A.isDown || this.pointerLeft;
        const moveRight = this.cursors.right.isDown || this.keys.D.isDown || this.pointerRight;
        const wantJump = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown;

        const moveSpeed = 220;
        if (moveLeft && !moveRight) this.player.body.setVelocityX(-moveSpeed);
        else if (moveRight && !moveLeft) this.player.body.setVelocityX(moveSpeed);
        else this.player.body.setVelocityX(this.player.body.velocity.x * mood.friction);

        if (wantJump && onGround) this.player.body.setVelocityY(-mood.jump);

        // Boss phase trigger at ~45s
        const elapsed = (time - this.startTime) / 1000;
        if (!this.bossSpawned && elapsed >= 45) this.spawnBoss();

        // Near-miss combo: measure closest distance to obstacles/boss
        const pRect = getRectBounds(this.player);
        let minDist = Infinity;
        this.obstacles.getChildren().forEach(o => {
            const d = distanceRectToRect(pRect, getRectBounds(o));
            if (d < minDist) minDist = d;
        });
        this.bossGroup.getChildren().forEach(o => {
            const d = distanceRectToRect(pRect, getRectBounds(o));
            if (d < minDist) minDist = d;
        });

        const NEAR_DIST = 18; // pixels
        if (minDist <= NEAR_DIST && minDist > 0) {
            this.comboNearMs += delta;
            if (this.comboNearMs >= 300) { // every 300ms near-miss gives small boost
                this.comboNearMs = 0;
                this.combo = Math.min(15, this.combo + 0.15);
            }
        } else {
            // gentle decay if far
            this.comboNearMs = 0;
            if (this.combo > 1) this.combo = Math.max(1, this.combo - delta * 0.0008);
        }

        // Score
        const base = (time - this.startTime) / 100; // time based
        this.score = Math.floor(base * this.combo * mood.scoreMul);
        this.scoreText.setText(`Score: ${this.score}`);
        this.comboText.setText(`Combo x${this.combo.toFixed(1)}`);

        // Manual movement for non-physics obstacles
        this.obstacles.getChildren().forEach(o => {
            if (o.__vx) o.x += (o.__vx * delta) / 1000;
            // Remove obstacles that are off-screen
            if (o.x + o.width/2 < 0) o.destroy();
        });
        
        this.bossGroup.getChildren().forEach(o => {
            if (o.update) o.update();
        });
        
        if (this.debugText) {
            const nObs = this.obstacles.getChildren().length;
            const nBoss = this.bossGroup.getChildren().length;
            const sample = this.obstacles.getChildren()[0];
            const sx = sample ? Math.round(sample.x) : '-';
            this.debugText.setText(`Obs:${nObs} Boss:${nBoss} x:${sx}`);
        }

        // AABB collisions between player display bounds and obstacles rectangles
        const pb = this.player.getBounds();
        const paddedPb = { 
            x: pb.x + 2, 
            y: pb.y + 2, 
            width: pb.width - 4, 
            height: pb.height - 4 
        };
        
        for (const o of this.obstacles.getChildren()) {
            if (!o.active) continue;
            
            const ob = { 
                x: o.x - o.width/2 + 2, 
                y: o.y - o.height/2 + 2, 
                width: o.width - 4, 
                height: o.height - 4 
            };
            
            const overlap = !(paddedPb.x + paddedPb.width < ob.x || 
                            paddedPb.x > ob.x + ob.width || 
                            paddedPb.y + paddedPb.height < ob.y || 
                            paddedPb.y > ob.y + ob.height);
                            
            if (overlap) { 
                this.gameOver(); 
                break; 
            }
        }

        // Fallback spawner: if no obstacles exist for >2s, force a spawn
        this.__sinceLastSpawn = (this.__sinceLastSpawn || 0) + delta;
        if (this.obstacles.getChildren().length === 0 && this.__sinceLastSpawn > 2000) {
            this.__sinceLastSpawn = 0;
            this.spawnObstacle();
        }
    }

    share() {
        const url = `${window.location.origin}${window.location.pathname}`;
        const text = `Я набрал(а) ${this.score} в Лабубе! Сид дня ${DAILY_SEED}. Попробуй побить мой результат →`;
        if (navigator.share) {
            navigator.share({ title: 'Лабуба — челлендж дня', text, url }).catch(() => {});
        } else {
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
            window.open(shareUrl, '_blank');
        }
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        if (this.spawnTimer) this.spawnTimer.remove(false);
        
        // Stop player movement
        this.player.body.setVelocity(0, 0);
        this.player.body.moves = false;
        
        const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.55).setDepth(20);
        const final = this.add.text(width/2, height/2 - 24, `Game Over`, {
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '22px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5).setDepth(21);
        const scoreT = this.add.text(width/2, height/2 + 2, `Score: ${this.score}\nSeed: ${DAILY_SEED}`, {
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '16px', color: '#e5e7eb', align: 'center'
        }).setOrigin(0.5).setDepth(21);
        const hint = this.add.text(width/2, height/2 + 50, 'R — рестарт • S — поделиться', {
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '14px', color: '#d1d5db'
        }).setOrigin(0.5).setDepth(21);

        const nickname = `Labuba#${(Math.random()*1e6|0).toString(36)}`;
        postScore(nickname, this.score);
        sendEvent('session_end', { score: this.score, seed: DAILY_SEED });
    }
}

// Инициализация игры после загрузки страницы
window.addEventListener('load', () => {
    // Вычисляем размеры игрового поля
    width = Math.min(800, Math.max(360, Math.floor(window.innerWidth)));
    height = Math.min(600, Math.max(480, Math.floor(window.innerHeight)));
    
    // Определяем сид для дня
    DAILY_SEED = getDailySeed();
    
    // Инициализируем генератор случайных чисел
    rand = mulberry32(hashCode(DAILY_SEED));
    
    // Настройки настроений
    MOODS = [
        { key: 'fun',  label: 'Весёлый',   color: 0x6ee7ff, jump: 470, friction: 0.90, scoreMul: 1.0, hazardMul: 1.0 },
        { key: 'calm', label: 'Задумчивый', color: 0xa7f3d0, jump: 420, friction: 0.95, scoreMul: 1.1, hazardMul: 0.9 },
        { key: 'bold', label: 'Дерзкий',    color: 0xfde68a, jump: 520, friction: 0.85, scoreMul: 1.2, hazardMul: 1.2 }
    ];
    
    // Конфигурация Phaser
    const config = {
        type: Phaser.AUTO,
        parent: 'game-root',
        width,
        height,
        backgroundColor: '#0d0f14',
        physics: { 
            default: 'arcade', 
            arcade: { 
                gravity: { y: 800 }, 
                debug: false 
            } 
        },
        scene: [LabubaScene]
    };
    
    // Создаем игру
    const game = new Phaser.Game(config);
    
    // Скрываем индикатор загрузки после готовности игры
    game.events.on('ready', () => {
        document.querySelector('.loading').style.display = 'none';
    });
});