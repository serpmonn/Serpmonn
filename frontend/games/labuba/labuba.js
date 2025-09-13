/*
  Labuba prototype — minimal Phaser 3 scene
  - Short session arcade
  - Keyboard controls: arrows/WASD, Space for jump, R to restart
  - Tracks score by survival time
  - On game over, posts score to leaderboard API (if reachable)
*/

(() => {
  const API_BASE = 'https://serpmonn.ru:3000'; // leaderboard-server.mjs default

  function postScore(nickname, score) {
    try {
      return fetch(`${API_BASE}/add-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, score })
      }).catch(() => {});
    } catch {}
  }

  const width = Math.min(800, Math.max(360, Math.floor(window.innerWidth)));
  const height = Math.min(600, Math.max(480, Math.floor(window.innerHeight)));

  class LabubaScene extends Phaser.Scene {
    constructor() { super('LabubaScene'); }

    preload() {
      // simple shapes; no assets for now
    }

    create() {
      this.score = 0;
      this.isGameOver = false;
      this.startTime = this.time.now;

      this.physics.world.setBounds(0, 0, width, height);

      // player
      const playerSize = 22;
      this.player = this.add.rectangle(80, height - 80, playerSize, playerSize, 0x6ee7ff);
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
        SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE
      });

      // score text
      this.scoreText = this.add.text(12, 12, 'Score: 0', { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: '16px', color: '#e5e7eb' }).setDepth(10);

      // spawn obstacles
      this.spawnTimer = this.time.addEvent({ delay: 900, loop: true, callback: () => this.spawnObstacle() });

      // restart on R
      this.input.keyboard.on('keydown-R', () => this.scene.restart());
    }

    spawnObstacle() {
      if (this.isGameOver) return;
      const size = Phaser.Math.Between(14, 26);
      const x = width + size;
      const y = height - 40 - size/2;
      const rect = this.add.rectangle(x, y, size, size, 0xf43f5e);
      this.physics.add.existing(rect);
      rect.body.setVelocityX(-Phaser.Math.Between(180, 300));
      rect.body.setAllowGravity(false);
      this.obstacles.add(rect);

      // cleanup when off-screen
      rect.update = () => {
        if (rect.x < -40) rect.destroy();
      };
    }

    update(time, delta) {
      if (this.isGameOver) return;

      const onGround = this.player.body.blocked.down;
      const moveLeft = this.cursors.left.isDown || this.keys.A.isDown;
      const moveRight = this.cursors.right.isDown || this.keys.D.isDown;
      const wantJump = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown;

      const moveSpeed = 220;
      if (moveLeft) this.player.body.setVelocityX(-moveSpeed);
      else if (moveRight) this.player.body.setVelocityX(moveSpeed);
      else this.player.body.setVelocityX(0);

      if (wantJump && onGround) this.player.body.setVelocityY(-420);

      // update score by time survived
      this.score = Math.floor((time - this.startTime) / 100);
      this.scoreText.setText(`Score: ${this.score}`);

      // tick obstacles for cleanup
      this.obstacles.getChildren().forEach(o => o.update && o.update());
    }

    gameOver() {
      if (this.isGameOver) return;
      this.isGameOver = true;
      this.spawnTimer.remove(false);
      const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.55).setDepth(20);
      const final = this.add.text(width/2, height/2 - 10, `Game Over\nScore: ${this.score}`, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5).setDepth(21);
      const hint = this.add.text(width/2, height/2 + 40, 'Press R to restart', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        fontSize: '14px',
        color: '#d1d5db'
      }).setOrigin(0.5).setDepth(21);

      // fire-and-forget leaderboard write
      const nickname = `Labuba#${(Math.random()*1e6|0).toString(36)}`;
      postScore(nickname, this.score);
    }
  }

  const config = {
    type: Phaser.AUTO,
    parent: 'game-root',
    width,
    height,
    backgroundColor: '#0d0f14',
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [LabubaScene]
  };

  window.addEventListener('load', () => {
    new Phaser.Game(config);
  });
})();

