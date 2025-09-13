/*
  Labuba v3 — gameplay upgrades
  - Near-miss combo (stay close to hazards to build multiplier)
  - Pointer controls: left/right zones to move, center to jump
  - Extra obstacle types (basic, tall, vertical mover)
  - Boss phase after 45s: sweeping hazard
  - Keeps analytics and leaderboard writes
*/

(() => {
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
  const DAILY_SEED = getDailySeed();

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
  const rand = mulberry32(hashCode(DAILY_SEED));

  const width = Math.min(800, Math.max(360, Math.floor(window.innerWidth)));
  const height = Math.min(600, Math.max(480, Math.floor(window.innerHeight)));

  const MOODS = [
    { key: 'fun',  label: 'Весёлый',   color: 0x6ee7ff, jump: 470, friction: 0.90, scoreMul: 1.0, hazardMul: 1.0 },
    { key: 'calm', label: 'Задумчивый', color: 0xa7f3d0, jump: 420, friction: 0.95, scoreMul: 1.1, hazardMul: 0.9 },
    { key: 'bold', label: 'Дерзкий',    color: 0xfde68a, jump: 520, friction: 0.85, scoreMul: 1.2, hazardMul: 1.2 }
  ];

  // Geometry helpers
  function getRectBounds(obj) {
    const b = obj.body;
    if (!b) return { left: obj.x, right: obj.x, top: obj.y, bottom: obj.y };
    const w = obj.width || (b.width ?? 0);
    const h = obj.height || (b.height ?? 0);
    return {
      left: obj.x - w/2,
      right: obj.x + w/2,
      top: obj.y - h/2,
      bottom: obj.y + h/2
    };
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
    constructor() { super('LabubaScene'); }

    preload() {}

    create() {
      this.score = 0;
      this.combo = 1;
      this.comboNearMs = 0;
      this.isGameOver = false;
      this.startTime = this.time.now;
      this.moodIndex = 0;
      this.bossSpawned = false;

      this.physics.world.setBounds(0, 0, width, height);
      sendEvent('game_start', { seed: DAILY_SEED });

      // Player
      const playerSize = 22;
      this.player = this.add.rectangle(80, height - 80, playerSize, playerSize, MOODS[this.moodIndex].color);
      this.physics.add.existing(this.player);
      this.player.body.setCollideWorldBounds(true);
      this.player.body.setBounce(0.0);
      this.player.body.setGravityY(800);

      // Ground
      const ground = this.add.rectangle(width/2, height - 20, width, 40, 0x1f2937);
      this.physics.add.existing(ground, true);
      this.physics.add.collider(this.player, ground);

      // Obstacles
      this.obstacles = this.physics.add.group();
      this.physics.add.collider(this.obstacles, ground);
      this.physics.add.overlap(this.player, this.obstacles, () => this.gameOver(), undefined, this);

      // Boss group
      this.bossGroup = this.physics.add.group();
      this.physics.add.overlap(this.player, this.bossGroup, () => this.gameOver(), undefined, this);

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
      this.player.fillColor = mood.color;
      this.moodText.setText(`Mood: ${mood.label}`);
      if (this.spawnTimer) this.spawnTimer.remove(false);
      const newDelay = 900 / mood.hazardMul;
      this.spawnTimer = this.time.addEvent({ delay: newDelay, loop: true, callback: this.spawnObstacle, callbackScope: this });
    }

    spawnObstacle() {
      if (this.isGameOver) return;
      this.__sinceLastSpawn = 0;
      this.__spawnCount = (this.__spawnCount || 0) + 1;
      try { console.log('[Labuba] spawn', this.__spawnCount); } catch {}
      this.__sinceLastSpawn = 0;
      const r = rand();
      const type = r < 0.5 ? 'basic' : (r < 0.8 ? 'tall' : 'mover');
      let rect, sizeW, sizeH, speed;
      if (type === 'basic') {
        const s = Math.floor(14 + rand() * 14);
        sizeW = s; sizeH = s;
        rect = this.add.rectangle(width + s, height - 40 - s/2, sizeW, sizeH, 0xf43f5e);
        speed = 180 + Math.floor(rand() * 140);
      } else if (type === 'tall') {
        sizeW = 18; sizeH = 40 + Math.floor(rand() * 30);
        rect = this.add.rectangle(width + sizeW, height - 40 - sizeH/2, sizeW, sizeH, 0xef4444);
        speed = 200 + Math.floor(rand() * 120);
      } else { // mover vertical
        sizeW = 22; sizeH = 22;
        const baseY = height - 70 - Math.floor(rand() * 80);
        rect = this.add.rectangle(width + sizeW, baseY, sizeW, sizeH, 0xf97316);
        rect.__vyAmp = 32 + Math.floor(rand() * 24);
        rect.__vyPhase = rand() * Math.PI * 2;
        speed = 200 + Math.floor(rand() * 120);
      }
      this.physics.add.existing(rect);
      rect.body.setVelocityX(-Math.floor(speed * MOODS[this.moodIndex].hazardMul));
      rect.body.setAllowGravity(false);
      rect.__kind = type;
      rect.update = () => {
        if (rect.__kind === 'mover') {
          rect.__vyPhase += 0.06;
          rect.y += Math.sin(rect.__vyPhase) * 1.8;
        }
        if (rect.x < -60) rect.destroy();
      };
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

      this.obstacles.getChildren().forEach(o => o.update && o.update());
      this.bossGroup.getChildren().forEach(o => o.update && o.update());
      if (this.debugText) {
        const nObs = this.obstacles.getChildren().length;
        const nBoss = this.bossGroup.getChildren().length;
        this.debugText.setText(`Obs:${nObs} Boss:${nBoss}`);
      }

      // Fallback spawner: if no obstacles exist for >2s, force a spawn
      this.__sinceLastSpawn = (this.__sinceLastSpawn || 0) + delta;
      if (this.obstacles.getChildren().length === 0 && this.__sinceLastSpawn > 2000) {
        this.__sinceLastSpawn = 0;
        this.spawnObstacle();
      }
    }

    share() {
      const url = `${location.origin}/frontend/games/labuba/index.html`;
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

  const config = {
    type: Phaser.AUTO,
    parent: 'game-root',
    width,
    height,
    backgroundColor: '#0d0f14',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: [LabubaScene]
  };

  window.addEventListener('load', () => { new Phaser.Game(config); });
})();

