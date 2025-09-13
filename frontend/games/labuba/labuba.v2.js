/*
  Labuba v2 — moods, combo, daily seed, share
  Keys: arrows/WASD to move, Space to jump, M to change mood, R restart, S share
*/

(() => {
  const API_BASE = '';
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

  // Daily seed (UTC date)
  function getDailySeed() {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  const DAILY_SEED = getDailySeed();

  // PRNG based on seed string
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
    { key: 'fun', label: 'Весёлый', color: 0x6ee7ff, jump: 470, friction: 0.90, scoreMul: 1.0, hazardMul: 1.0 },
    { key: 'calm', label: 'Задумчивый', color: 0xa7f3d0, jump: 420, friction: 0.95, scoreMul: 1.1, hazardMul: 0.9 },
    { key: 'bold', label: 'Дерзкий', color: 0xfde68a, jump: 520, friction: 0.85, scoreMul: 1.2, hazardMul: 1.2 }
  ];

  class LabubaScene extends Phaser.Scene {
    constructor() { super('LabubaScene'); }

    preload() {}

    create() {
      this.score = 0;
      this.combo = 1;
      this.comboTime = 0;
      this.isGameOver = false;
      this.startTime = this.time.now;
      this.moodIndex = 0; // start with fun

      this.physics.world.setBounds(0, 0, width, height);
      sendEvent('game_start', { seed: DAILY_SEED });

      // player
      const playerSize = 22;
      this.player = this.add.rectangle(80, height - 80, playerSize, playerSize, MOODS[this.moodIndex].color);
      this.physics.add.existing(this.player);
      this.player.body.setCollideWorldBounds(true);
      this.player.body.setBounce(0.0);
      this.player.body.setGravityY(800);

      // ground
      const ground = this.add.rectangle(width/2, height - 20, width, 40, 0x1f2937);
      this.physics.add.existing(ground, true);
      this.physics.add.collider(this.player, ground);

      // obstacles group
      this.obstacles = this.physics.add.group();
      this.physics.add.collider(this.obstacles, ground);
      this.physics.add.overlap(this.player, this.obstacles, () => this.gameOver(), undefined, this);

      // controls
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

      // UI
      this.scoreText = this.add.text(12, 12, 'Score: 0', { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '16px', color: '#e5e7eb' }).setDepth(10);
      this.comboText = this.add.text(12, 34, 'Combo x1', { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '14px', color: '#93c5fd' }).setDepth(10);
      this.moodText = this.add.text(12, 54, 'Mood: Весёлый', { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '14px', color: '#d1fae5' }).setDepth(10);
      this.seedText = this.add.text(width - 12, 12, `Seed: ${DAILY_SEED}` , { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '12px', color: '#9ca3af' }).setOrigin(1,0).setDepth(10);

      // spawn obstacles by deterministic schedule using daily seed
      const baseDelay = 950 / MOODS[this.moodIndex].hazardMul;
      this.spawnTimer = this.time.addEvent({ delay: baseDelay, loop: true, callback: () => this.spawnObstacle() });

      // change mood
      this.input.keyboard.on('keydown-M', () => this.changeMood());
      // share
      this.input.keyboard.on('keydown-S', () => this.share());
      // restart
      this.input.keyboard.on('keydown-R', () => this.scene.restart());
    }

    changeMood() {
      if (this.isGameOver) return;
      this.moodIndex = (this.moodIndex + 1) % MOODS.length;
      const mood = MOODS[this.moodIndex];
      sendEvent('mood_switch', { mood: mood.key });
      this.player.fillColor = mood.color;
      this.moodText.setText(`Mood: ${mood.label}`);
      // adjust spawn rate
      if (this.spawnTimer) {
        this.spawnTimer.remove(false);
      }
      const newDelay = 950 / mood.hazardMul;
      this.spawnTimer = this.time.addEvent({ delay: newDelay, loop: true, callback: () => this.spawnObstacle() });
    }

    spawnObstacle() {
      if (this.isGameOver) return;
      // deterministic randomness
      const r1 = rand();
      const size = Math.floor(14 + r1 * 12);
      const x = width + size;
      const y = height - 40 - size/2;
      const rect = this.add.rectangle(x, y, size, size, 0xf43f5e);
      this.physics.add.existing(rect);
      const speed = 180 + Math.floor(rand() * 140);
      rect.body.setVelocityX(-Math.floor(speed * MOODS[this.moodIndex].hazardMul));
      rect.body.setAllowGravity(false);
      this.obstacles.add(rect);
      rect.update = () => { if (rect.x < -40) rect.destroy(); };
    }

    update(time, delta) {
      if (this.isGameOver) return;

      const mood = MOODS[this.moodIndex];
      const onGround = this.player.body.blocked.down;
      const moveLeft = this.cursors.left.isDown || this.keys.A.isDown;
      const moveRight = this.cursors.right.isDown || this.keys.D.isDown;
      const wantJump = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown;

      const moveSpeed = 220;
      if (moveLeft) this.player.body.setVelocityX(-moveSpeed);
      else if (moveRight) this.player.body.setVelocityX(moveSpeed);
      else this.player.body.setVelocityX(this.player.body.velocity.x * mood.friction);

      if (wantJump && onGround) this.player.body.setVelocityY(-mood.jump);

      // time-based base score
      const base = (time - this.startTime) / 100;
      // combo increases when player stays close to obstacles but not colliding
      this.comboTime += delta;
      if (this.comboTime > 1000) { // each sec boost combo a bit
        this.comboTime = 0;
        this.combo = Math.min(10, this.combo + 0.1);
      }
      this.score = Math.floor(base * this.combo * mood.scoreMul);
      this.scoreText.setText(`Score: ${this.score}`);
      this.comboText.setText(`Combo x${this.combo.toFixed(1)}`);

      this.obstacles.getChildren().forEach(o => o.update && o.update());
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

