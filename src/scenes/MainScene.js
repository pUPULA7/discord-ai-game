import Phaser from 'phaser';

const PLAYER_SIZE = 32;
const PLAYER_SPEED = 200; // px/秒
const PLAYER_DASH_SPEED = 400; // 左シフトを押している間の速さ（px/秒）
// スペースキーで順番に切り替わるプレイヤーの色（最初は黄色）
const PLAYER_COLORS = [0xffcc00, 0xff004d, 0x00e436, 0x29adff, 0xff77a8, 0xffffff];

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  create() {
    const { width, height } = this.scale;

    // プレイヤー（四角）
    this.player = this.add.rectangle(width / 2, height / 2, PLAYER_SIZE, PLAYER_SIZE, PLAYER_COLORS[0]);
    this.colorIndex = 0;
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    // 入力：矢印キー + WASD
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // スペースキー：押すたびに色を切り替える
    this.input.keyboard.on('keydown-SPACE', (event) => {
      if (event.repeat) return; // 押しっぱなしでは連続で変えない
      this.colorIndex = (this.colorIndex + 1) % PLAYER_COLORS.length;
      this.player.setFillStyle(PLAYER_COLORS[this.colorIndex]);
    });

    // 左シフトキー：押している間だけ速く動く（右シフトは対象外）
    this.leftShiftDown = false;
    this.input.keyboard.on('keydown', (event) => {
      if (event.code === 'ShiftLeft') this.leftShiftDown = true;
    });
    this.input.keyboard.on('keyup', (event) => {
      if (event.code === 'ShiftLeft') this.leftShiftDown = false;
    });
    // ウィンドウからフォーカスが外れたら押しっぱなし扱いを解除
    this.game.events.on(Phaser.Core.Events.BLUR, () => {
      this.leftShiftDown = false;
    });

    this.add.text(12, 12, '矢印キー / WASD で移動　左シフトで加速　スペースで色チェンジ', {
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

    const speed = this.leftShiftDown ? PLAYER_DASH_SPEED : PLAYER_SPEED;
    const velocity = new Phaser.Math.Vector2(vx, vy).normalize().scale(speed);
    this.player.body.setVelocity(velocity.x, velocity.y);
  }
}
