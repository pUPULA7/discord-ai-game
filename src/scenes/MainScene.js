import Phaser from 'phaser';

const PLAYER_SIZE = 32;
const PLAYER_SPEED = 200; // px/秒
const PLAYER_DASH_SPEED = 400; // 左シフトを押している間の速さ（px/秒）
// スペースキーで順番に切り替わるプレイヤーの色（最初は黄色）
const PLAYER_COLORS = [0xffcc00, 0xff004d, 0x00e436, 0x29adff, 0xff77a8, 0xffffff];

// スマホ用タッチ UI の配置（ゲーム座標 800 × 600 基準）
const STICK_X = 120;
const STICK_Y = 480;
const STICK_RADIUS = 70; // スティックの土台の半径
const STICK_KNOB_RADIUS = 30;
const STICK_DEAD_ZONE = 10; // これより小さい傾きは無視（px）
const BUTTON_RADIUS = 44;
const COLOR_BUTTON = { x: 590, y: 510 };
const DASH_BUTTON = { x: 710, y: 430 };

// スマホ・タブレットなどタッチ操作の端末かどうか
function isTouchDevice(game) {
  const coarse = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(pointer: coarse)').matches;
  return Boolean(coarse || !game.device.os.desktop);
}

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
      this.nextColor();
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

    this.isTouch = isTouchDevice(this.game);
    const helpText = this.isTouch
      ? '左下のスティックで移動　「加速」を押している間は加速　「色」で色チェンジ'
      : '矢印キー / WASD で移動　左シフトで加速　スペースで色チェンジ';

    // スマホのときだけタッチ操作 UI を出す
    this.stickVector = new Phaser.Math.Vector2(0, 0);
    this.touchDashDown = false;
    if (this.isTouch) this.createTouchControls();

    this.add.text(12, 12, helpText, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: 776, useAdvancedWrap: true },
    });
  }

  // 色を次に切り替える（スペースキー・「色」ボタン共通）
  nextColor() {
    this.colorIndex = (this.colorIndex + 1) % PLAYER_COLORS.length;
    this.player.setFillStyle(PLAYER_COLORS[this.colorIndex]);
  }

  // スマホ用：バーチャルスティック + 「色」「加速」ボタン
  createTouchControls() {
    // 指 2 本以上の同時操作（移動しながら加速など）に対応
    this.input.addPointer(2);

    const depth = 100;
    this.add.circle(STICK_X, STICK_Y, STICK_RADIUS, 0xffffff, 0.15)
      .setStrokeStyle(3, 0xffffff, 0.4).setDepth(depth);
    this.stickKnob = this.add.circle(STICK_X, STICK_Y, STICK_KNOB_RADIUS, 0xffffff, 0.45)
      .setDepth(depth + 1);
    this.stickPointerId = null;

    const makeButton = ({ x, y }, label) => {
      const btn = this.add.circle(x, y, BUTTON_RADIUS, 0xffffff, 0.2)
        .setStrokeStyle(3, 0xffffff, 0.5).setDepth(depth).setInteractive();
      this.add.text(x, y, label, { fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff' })
        .setOrigin(0.5).setDepth(depth + 1);
      return btn;
    };

    const colorBtn = makeButton(COLOR_BUTTON, '色');
    colorBtn.on('pointerdown', () => {
      colorBtn.setFillStyle(0xffffff, 0.45);
      this.nextColor();
    });
    const releaseColor = () => colorBtn.setFillStyle(0xffffff, 0.2);
    colorBtn.on('pointerup', releaseColor);
    colorBtn.on('pointerout', releaseColor);

    const dashBtn = makeButton(DASH_BUTTON, '加速');
    this.dashPointerId = null;
    dashBtn.on('pointerdown', (pointer) => {
      this.dashPointerId = pointer.id;
      this.touchDashDown = true;
      dashBtn.setFillStyle(0xffffff, 0.45);
    });
    this.dashBtn = dashBtn;

    // スティック：画面の左半分（ボタン以外）を触ると反応
    this.input.on('pointerdown', (pointer, over) => {
      if (this.stickPointerId !== null || over.length > 0) return;
      if (pointer.x > this.scale.width / 2) return;
      this.stickPointerId = pointer.id;
      this.updateStick(pointer);
    });
    this.input.on('pointermove', (pointer) => {
      if (pointer.id === this.stickPointerId) this.updateStick(pointer);
    });
    const release = (pointer) => {
      if (pointer.id === this.stickPointerId) this.resetStick();
      if (pointer.id === this.dashPointerId) this.releaseDash();
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.game.events.on(Phaser.Core.Events.BLUR, () => {
      this.resetStick();
      this.releaseDash();
    });
  }

  updateStick(pointer) {
    const dx = pointer.x - STICK_X;
    const dy = pointer.y - STICK_Y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, STICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    this.stickKnob.setPosition(STICK_X + Math.cos(angle) * clamped, STICK_Y + Math.sin(angle) * clamped);
    if (dist < STICK_DEAD_ZONE) this.stickVector.set(0, 0);
    else this.stickVector.set(Math.cos(angle), Math.sin(angle));
  }

  resetStick() {
    this.stickPointerId = null;
    this.stickVector.set(0, 0);
    if (this.stickKnob) this.stickKnob.setPosition(STICK_X, STICK_Y);
  }

  releaseDash() {
    this.dashPointerId = null;
    this.touchDashDown = false;
    if (this.dashBtn) this.dashBtn.setFillStyle(0xffffff, 0.2);
  }

  update() {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    let vx = (right ? 1 : 0) - (left ? 1 : 0);
    let vy = (down ? 1 : 0) - (up ? 1 : 0);
    // キー入力がないときはタッチのスティックの向きを使う
    if (vx === 0 && vy === 0) {
      vx = this.stickVector.x;
      vy = this.stickVector.y;
    }

    const dash = this.leftShiftDown || this.touchDashDown;
    const speed = dash ? PLAYER_DASH_SPEED : PLAYER_SPEED;
    const velocity = new Phaser.Math.Vector2(vx, vy).normalize().scale(speed);
    this.player.body.setVelocity(velocity.x, velocity.y);
  }
}
