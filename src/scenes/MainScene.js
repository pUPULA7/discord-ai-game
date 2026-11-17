import Phaser from 'phaser';

const PLAYER_SIZE = 32;
const PLAYER_SPEED = 200; // px/秒

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  create() {
    const { width, height } = this.scale;

    // プレイヤー（四角）
    this.player = this.add.rectangle(width / 2, height / 2, PLAYER_SIZE, PLAYER_SIZE, 0xffcc00);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    // 入力：矢印キー + WASD
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    this.add.text(12, 12, '矢印キー / WASD で移動', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffffff',
    });
  }

  update() {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    const vx = (right ? 1 : 0) - (left ? 1 : 0);
    const vy = (down ? 1 : 0) - (up ? 1 : 0);

    const velocity = new Phaser.Math.Vector2(vx, vy).normalize().scale(PLAYER_SPEED);
    this.player.body.setVelocity(velocity.x, velocity.y);
  }
}
