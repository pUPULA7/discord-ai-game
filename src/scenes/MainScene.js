import Phaser from 'phaser';
import { PixelFxLayer, PIXEL_SCALE, rampFrom } from '../fx/PixelFxLayer.js';
import * as collectBurst from 'pixelfx/fx/pickups/collect-burst';

const PLAYER_SIZE = 32;
const PLAYER_SPEED = 200; // px/秒
const PLAYER_DASH_SPEED = 400; // シフトを押している間の速さ（px/秒）
// 色ボタンで順番に切り替わるプレイヤーの色（1P は黄色、2P は青から始まる）
const PLAYER_COLORS = [0xffcc00, 0xff004d, 0x00e436, 0x29adff, 0xff77a8, 0xffffff];
const P2_START_COLOR_INDEX = 3;

// スマホ用タッチ UI の配置（ゲーム座標 800 × 600 基準）
const STICK_X = 120;
const STICK_Y = 480;
const STICK_RADIUS = 70; // スティックの土台の半径
const STICK_KNOB_RADIUS = 30;
const STICK_DEAD_ZONE = 10; // これより小さい傾きは無視（px）
const BUTTON_RADIUS = 44;
const COLOR_BUTTON = { x: 590, y: 510 };
const DASH_BUTTON = { x: 710, y: 430 };
const BEAM_BUTTON = { x: 710, y: 540 };

// ビーム
const BEAM_SPEED = 700; // px/秒
const BEAM_LENGTH = 28;
const BEAM_WIDTH = 6;
const BEAM_INTERVAL = 150; // 押しっぱなしのときの連射間隔（ミリ秒）

// ゲーム時間・スコア
const GAME_TIME = 15000; // 1 ゲームの時間（ミリ秒）
const SCORE_PER_ENEMY = 100; // 敵 1 体あたりのスコア

// 敵
const ENEMY_RADIUS = 16;
const ENEMY_SPEED = 70; // px/秒
const ENEMY_SPAWN_INTERVAL = 1500; // ミリ秒
const ENEMY_MAX = 8;
const ENEMY_COLOR = 0x8e44ad;

// アイテム（敵を倒すとドロップ。拾うと一定時間ビームが変化する。何種類でも重ねがけできる）
const ITEM_DROP_CHANCE = 0.35; // ドロップする確率
const ITEM_RADIUS = 13;
const ITEM_LIFETIME = 8000; // 地面に落ちてから消えるまで（ミリ秒）
const POWER_DURATION = 10000; // 拾ってから効果が続く時間（ミリ秒）
const ITEM_TYPES = {
  spread: { name: '散弾', mark: '散', color: 0xff9f1c, desc: '3 方向に発射' },
  homing: { name: 'ホーミング弾', mark: '追', color: 0x2ee6d6, desc: '近くの敵へ曲がる' },
  rapid: { name: '連射', mark: '連', color: 0xffe14d, desc: '連射が約 2 倍速' },
  big: { name: '巨大弾', mark: '巨', color: 0xff5e5e, desc: '弾が 2 倍の大きさ' },
  pierce: { name: '貫通弾', mark: '貫', color: 0xb8f35a, desc: '敵を倒しても消えない' },
  back: { name: 'うしろ撃ち', mark: '後', color: 0x9aa8ff, desc: '後ろにも発射' },
  ring: { name: '全方位', mark: '全', color: 0xffb3f0, desc: '8 方向に発射' },
  wave: { name: 'ウェーブ弾', mark: '波', color: 0x4dd2ff, desc: 'くねくね進む' },
  bounce: { name: 'はね返り弾', mark: '跳', color: 0x7cff9b, desc: '画面の端で 3 回はね返る' },
  fast: { name: '高速弾', mark: '速', color: 0xfff6a8, desc: '弾の速さ 1.8 倍' },
  explode: { name: '爆発弾', mark: '爆', color: 0xff7a2e, desc: '当たると周りも爆発' },
  split: { name: '分裂弾', mark: '裂', color: 0xd98cff, desc: '当たると 3 つに分裂' },
  side: { name: 'よこ撃ち', mark: '横', color: 0x8fe3c0, desc: '左右にも発射' },
  twin: { name: 'ツイン', mark: '双', color: 0x66b3ff, desc: '2 本並んで発射' },
  chain: { name: 'いなずま', mark: '雷', color: 0xfff23d, desc: '近くの敵 2 体に連鎖' },
  freeze: { name: 'こおり弾', mark: '氷', color: 0xbfefff, desc: '周りの敵を 3 秒凍らせる' },
  rainbow: { name: 'にじ色弾', mark: '虹', color: 0xff77a8, desc: '虹色 + 当たり判定 1.25 倍' },
  boomerang: { name: 'ブーメラン', mark: '戻', color: 0xe8c07a, desc: '途中で戻ってくる' },
  orbit: { name: 'えいせい', mark: '衛', color: 0xc6ff4d, desc: 'まわりを玉が 2 つ回る' },
  long: { name: 'ロングレーザー', mark: '長', color: 0xff4dd2, desc: 'ビームが 3 倍長い' },
  magnet: { name: '磁石', mark: '磁', color: 0xff3b3b, desc: 'アイテムを吸い寄せる' },
};
const ITEM_KEYS = Object.keys(ITEM_TYPES);
// 回復アイテム（ドロップしたアイテムのうち約 1/10 が回復アイテムになる。回復量 1〜3、大きいほど出にくい）
const HEAL_ITEM_CHANCE = 0.1;
const HEAL_ITEM_COLOR = 0xff5c8a;
const HEAL_WEIGHTS = [[1, 60], [2, 30], [3, 10]]; // [回復量, 重み]（1: 60% / 2: 30% / 3: 10%）
const SPREAD_ANGLES = [-16, 0, 16]; // 散弾の広がり（度）
const HOMING_SPEED = 520; // ホーミング弾の速さ（px/秒）
const HOMING_TURN_RATE = 6; // ホーミング弾が曲がる速さ（ラジアン/秒）
const RAPID_INTERVAL = 70; // 連射アイテム中の連射間隔（ミリ秒）
const FAST_MULT = 1.8;
const BIG_SCALE = 2;
const LONG_MULT = 3;
const RING_DIRS = 8;
const TWIN_OFFSET = 8; // ツインの左右のずれ（px）
const WAVE_AMP = 16; // ウェーブ弾の揺れ幅（px）
const WAVE_FREQ = 0.018; // ウェーブ弾の揺れの速さ（ラジアン/ミリ秒）
const BOUNCE_MAX = 3;
const EXPLODE_RADIUS = 70;
const SPLIT_ANGLES = [-35, 0, 35];
const CHAIN_RANGE = 170;
const CHAIN_JUMPS = 2;
const FREEZE_RADIUS = 100;
const FREEZE_TIME = 3000;
const BOOMERANG_TURN_TIME = 420; // 発射からこの時間で戻り始める（ミリ秒）
const BOOMERANG_TURN_RATE = 10; // 戻るときの曲がる速さ（ラジアン/秒）
const ORBIT_RADIUS = 48;
const ORBIT_COUNT = 2;
const ORBIT_SPEED = 0.006; // ラジアン/ミリ秒
const ORBIT_SIZE = 8;
const MAGNET_SPEED = 320; // 磁石で吸い寄せられるアイテムの速さ（px/秒）
const HURT_DISTANCE = ENEMY_RADIUS + 18; // 敵とこれより近いと「触れている」（痛そうな顔になる）
const MAX_BEAMS = 300; // 重ねがけで弾が増えすぎないための上限
const TEST_ENEMY_MAX = 30; // テストパネルの「敵+5」で出せる上限

// 体力（敵に触れると 1 ずつ減り、0 になるとダウン。全員ダウンでゲームオーバー）
const PLAYER_MAX_HP = 5;
const INVINCIBLE_TIME = 1500; // ダメージを受けたあと無敵になる時間（ミリ秒）
const KNOCKBACK_DIST = 60; // ダメージを受けたとき、触れていた敵を押し返す距離（px）
const HP_ROW_H = 24; // 体力ハートの行の高さ（「たおした敵」の下に 1P・2P の順で並ぶ）

// 必殺技
const SPECIAL_MAX = 10; // 敵をこの数たおすとゲージが満タンになり、必殺技が使える
const SPECIAL_CUTIN_TIME = 1300; // カットイン演出の長さ（ミリ秒）。この間は敵が止まる
const SPECIAL_NAME = 'ねこみみ 乱れ斬り！！';
const SPECIAL_BUTTON = { x: 590, y: 400 };
const GAUGE_X = 310; // 画面下中央の必殺ゲージの位置（1P が下、2P がその上）
const GAUGE_Y = 578;
const GAUGE_W = 150;
const GAUGE_H = 12;

// 点 (px, py) と線分 (ax, ay)-(bx, by) の距離
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

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

    // 背景（星空・星雲・惑星・流れ星）
    this.createBackground();

    // pixelfx のドット絵エフェクトを重ねるレイヤー（キャラより手前・UI より奥）
    this.pfx = new PixelFxLayer(this);

    // 1P（最初からいる）。2P は 2P 用のキーを押すと参加する
    this.players = [this.createPlayer(0, width / 2, height / 2, 0)];
    this.beams = [];
    this.enemies = [];
    this.items = [];

    // 入力：1P は 矢印キー + WASD / 2P は IJKL
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.p2Keys = this.input.keyboard.addKeys('I,J,K,L,U,O');
    this.beamKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    // 必殺技：X キー = 1P / P キー = 2P（ゲージが満タンのときだけ）
    this.cutinActive = false;
    this.gameOver = false;
    this.countdownActive = true; // 3, 2, 1 のカウントダウン中は動けない・敵も出ない
    this.timeLeft = GAME_TIME;
    this.physics.resume(); // リトライ直後（ゲームオーバーで止めた物理を戻す）
    this.input.keyboard.on('keydown-X', (event) => {
      if (!event.repeat) this.trySpecial(this.players[0]);
    });
    this.input.keyboard.on('keydown-P', (event) => {
      if (event.repeat) return;
      if (!this.players[1]) { this.joinP2(); return; } // 最初の 1 回は参加だけ
      this.trySpecial(this.players[1]);
    });

    // スペースキー：1P の色を切り替える / O キー：2P の色を切り替える
    this.input.keyboard.on('keydown-SPACE', (event) => {
      if (event.repeat) return; // 押しっぱなしでは連続で変えない
      this.nextColor(this.players[0]);
    });
    this.input.keyboard.on('keydown-O', (event) => {
      if (event.repeat) return;
      if (!this.players[1]) { this.joinP2(); return; } // 最初の 1 回は参加だけ
      this.nextColor(this.players[1]);
    });

    // シフトキー：押している間だけ速く動く（左シフト = 1P、右シフト = 2P）
    this.input.keyboard.on('keydown', (event) => {
      if (event.code === 'ShiftLeft') this.players[0].shiftDown = true;
      if (event.code === 'ShiftRight') this.joinP2().shiftDown = true;
      if (['KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyU'].includes(event.code)) this.joinP2();
    });
    this.input.keyboard.on('keyup', (event) => {
      if (event.code === 'ShiftLeft') this.players[0].shiftDown = false;
      if (event.code === 'ShiftRight' && this.players[1]) this.players[1].shiftDown = false;
    });
    // ウィンドウからフォーカスが外れたら押しっぱなし扱いを解除
    const onBlur = () => {
      this.players.forEach((p) => { p.shiftDown = false; });
      this.touchBeamDown = false;
    };
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    // リトライ（シーンの再スタート）のときにゲーム全体のイベントを外す
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.BLUR, onBlur));

    this.touchBeamDown = false;

    this.isTouch = isTouchDevice(this.game);
    const helpText = this.isTouch
      ? '左下のスティックで移動　「加速」を押している間は加速　「色」で色チェンジ　「ビーム」で発射　「必殺」で必殺技'
      : '1P: 矢印キー / WASD で移動　左シフトで加速　スペースで色チェンジ　Z でビーム　X で必殺技\n'
        + '2P: IJKL で移動　右シフトで加速　O で色チェンジ　U でビーム　P で必殺技（押すと参加）';

    // スマホのときだけタッチ操作 UI を出す（1P を操作）
    this.stickVector = new Phaser.Math.Vector2(0, 0);
    this.touchDashDown = false;
    if (this.isTouch) this.createTouchControls();

    const help = this.add.text(12, 12, helpText, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      lineSpacing: 4,
      wordWrap: { width: 600, useAdvancedWrap: true }, // 右上の のこり時間 と重ならない幅
    }).setDepth(50);
    this.scoreText = this.add.text(12, help.y + help.height + 6, '', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffe27a',
    }).setDepth(50);
    this.updateScoreText();
    this.powerText = this.add.text(12, this.scoreText.y + 22, '', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#ffffff',
      stroke: '#0b1030',
      strokeThickness: 3,
      wordWrap: { width: 776, useAdvancedWrap: true },
    }).setDepth(50);

    // 必殺ゲージ（画面下）とカットイン演出の準備
    this.createSpecialUI();

    // 体力ハート（「たおした敵」の下）・ダメージ時の赤いフラッシュ
    this.createHpUI();

    // テスト用パネル（右上の「テスト」ボタン / T キー）
    this.createTestUI();

    // 敵：一定間隔で画面の端から出てくる
    this.time.addEvent({
      delay: ENEMY_SPAWN_INTERVAL,
      loop: true,
      callback: () => {
        if (this.enemies.length < ENEMY_MAX && !this.cutinActive && !this.gameOver && !this.countdownActive) this.spawnEnemy();
      },
    });

    // のこり時間・スコア（右上）とカウントダウン
    this.createTimerUI();
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.startCountdown();
  }

  // 右上（テストボタンの下）に のこり時間 と SCORE を出す
  createTimerUI() {
    const font = { fontFamily: 'sans-serif', stroke: '#0b1030', strokeThickness: 4 };
    this.timerText = this.add.text(788, 46, '', {
      ...font, fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(1, 0).setDepth(50);
    this.totalScoreText = this.add.text(788, 78, '', {
      ...font, fontSize: '20px', fontStyle: 'bold', color: '#ffe27a',
    }).setOrigin(1, 0).setDepth(50);
    this.updateTimerUI();
  }

  totalScore() {
    return this.players.reduce((sum, p) => sum + p.score, 0) * SCORE_PER_ENEMY;
  }

  updateTimerUI() {
    if (!this.timerText) return;
    const sec = Math.max(0, this.timeLeft) / 1000;
    this.timerText.setText(`のこり ${sec.toFixed(1)} 秒`);
    this.timerText.setColor(sec <= 5 ? '#ff4466' : '#ffffff');
    this.totalScoreText.setText(`SCORE ${this.totalScore()}`);
  }

  // 画面中央に 3 → 2 → 1 → START! を出してからゲーム開始
  startCountdown() {
    const { width, height } = this.scale;
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35).setDepth(250);
    const text = this.add.text(width / 2, height / 2, '', {
      fontFamily: 'sans-serif', fontSize: '140px', fontStyle: 'bold', color: '#ffe27a',
      stroke: '#ff77a8', strokeThickness: 12,
    }).setOrigin(0.5).setDepth(251);
    const show = (label, color) => {
      text.setText(label).setColor(color).setScale(1.8).setAlpha(1);
      this.tweens.add({ targets: text, scale: 1, duration: 350, ease: 'Back.Out' });
      this.tweens.add({ targets: text, alpha: 0, duration: 250, delay: 700 });
    };
    ['3', '2', '1'].forEach((n, i) => this.time.delayedCall(i * 1000, () => show(n, '#ffe27a')));
    this.time.delayedCall(3000, () => {
      show('START!', '#7affb0');
      this.countdownActive = false;
      this.tweens.add({ targets: shade, alpha: 0, duration: 300, onComplete: () => shade.destroy() });
      this.time.delayedCall(1000, () => text.destroy());
    });
  }

  // プレイヤーを 1 人作る（当たり判定の四角 + 可愛いキャラの見た目）
  createPlayer(index, x, y, colorIndex) {
    // 当たり判定（32 × 32 の四角。見た目は可愛いキャラで、こちらは非表示）
    const rect = this.add.rectangle(x, y, PLAYER_SIZE, PLAYER_SIZE, PLAYER_COLORS[colorIndex]);
    rect.setVisible(false);
    this.physics.add.existing(rect);
    rect.body.setCollideWorldBounds(true);
    const player = {
      index,
      rect,
      colorIndex,
      cute: null,
      facing: 0, // 顔の向き（-1 左 〜 1 右）
      aimDir: new Phaser.Math.Vector2(index === 1 ? -1 : 1, 0), // 1P は右、2P は左向きから
      lastBeamTime: -Infinity,
      shiftDown: false,
      dash: false,
      score: 0,
      special: 0, // 必殺ゲージ（0〜SPECIAL_MAX）
      hp: PLAYER_MAX_HP, // 体力（0 でダウン）
      invincibleUntil: 0, // この時刻までは無敵（ダメージ直後）
      down: false, // 体力 0 でダウン中
      label: null,
      powers: {}, // 持っているアイテム効果 { 種類: 効果が切れる時刻 }（重ねがけ可。テストで付けたものは Infinity）
      sats: null, // えいせいの玉
    };
    player.cute = this.createCuteCharacter(x, y, PLAYER_COLORS[colorIndex]);
    // 2 人で遊んでいるときに見分けられるよう頭の上に「1P」「2P」を出す
    player.label = this.add.text(x, y - 34, `${index + 1}P`, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#1d1d33',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11).setVisible(index > 0);
    return player;
  }

  // 2P を参加させる（まだいなければ作る）。2P を返す
  joinP2() {
    if (this.players[1]) return this.players[1];
    const { width, height } = this.scale;
    const p2 = this.createPlayer(1, width / 2 + 80, height / 2, P2_START_COLOR_INDEX);
    this.players.push(p2);
    this.players[0].label.setVisible(true);
    this.updateSpecialUI();
    this.updateHpUI();
    this.tweens.add({ targets: p2.cute.container, scale: { from: 0, to: 1 }, duration: 300, ease: 'Back.Out' });
    this.updateScoreText();
    return p2;
  }

  // 可愛いキャラの見た目を作る（耳・まるい体・キラキラの目・ほっぺ・にっこり口）
  createCuteCharacter(x, y, color) {
    const outline = 0x1d1d33;
    const c = this.add.container(x, y).setDepth(10);

    // 足元の影
    const shadow = this.add.ellipse(0, 19, 30, 8, 0x000000, 0.25);
    // ねこみみ（体と同じ色）
    const earL = this.add.triangle(-10, -12, -7, 6, 7, 6, -3, -8, color).setStrokeStyle(2, outline);
    const earR = this.add.triangle(10, -12, -7, 6, 7, 6, 3, -8, color).setStrokeStyle(2, outline);
    const earInL = this.add.triangle(-10, -11, -3, 4, 3, 4, -1.5, -3, 0xff9ebb);
    const earInR = this.add.triangle(10, -11, -3, 4, 3, 4, 1.5, -3, 0xff9ebb);
    // まるい体
    const body = this.add.circle(0, 0, 18, color).setStrokeStyle(2, outline);
    // 体のツヤ
    const shine = this.add.ellipse(-8, -9, 8, 5, 0xffffff, 0.55).setAngle(-30);

    // 顔（目・ほっぺ・口）はまとめて動かせるように別コンテナに
    const face = this.add.container(0, 2);
    const eyeL = this.add.ellipse(-7, -2, 6, 8, outline);
    const eyeR = this.add.ellipse(7, -2, 6, 8, outline);
    const hiL = this.add.circle(-6, -4, 1.6, 0xffffff);
    const hiR = this.add.circle(8, -4, 1.6, 0xffffff);
    const cheekL = this.add.ellipse(-12, 5, 7, 4, 0xff6f91, 0.7);
    const cheekR = this.add.ellipse(12, 5, 7, 4, 0xff6f91, 0.7);
    const mouth = this.add.graphics();
    mouth.lineStyle(2, outline, 1);
    mouth.beginPath();
    mouth.arc(-2, 4, 2, 0, Math.PI, false);
    mouth.strokePath();
    mouth.beginPath();
    mouth.arc(2, 4, 2, 0, Math.PI, false);
    mouth.strokePath();
    // 敵に触れている間の痛そうな顔（ぎゅっとつぶった ＞＜ の目・への字の口・汗）。ふだんは非表示
    const hurt = this.add.graphics();
    hurt.lineStyle(2.2, outline, 1);
    hurt.beginPath();
    hurt.moveTo(-10, -5); hurt.lineTo(-5, -2); hurt.lineTo(-10, 1);
    hurt.moveTo(10, -5); hurt.lineTo(5, -2); hurt.lineTo(10, 1);
    hurt.strokePath();
    hurt.fillStyle(outline, 1);
    hurt.fillEllipse(0, 6, 7, 5);
    hurt.fillStyle(0xff6f91, 1);
    hurt.fillEllipse(0, 7.5, 4, 2);
    const sweat = this.add.graphics();
    sweat.fillStyle(0x7fd8ff, 0.95);
    sweat.fillCircle(15, -10, 3);
    sweat.fillTriangle(12.4, -11.5, 17.6, -11.5, 15, -17);
    const hurtFace = this.add.container(0, 0, [hurt, sweat]).setVisible(false);
    face.add([cheekL, cheekR, eyeL, eyeR, hiL, hiR, mouth, hurtFace]);

    c.add([shadow, earL, earR, earInL, earInR, body, shine, face]);

    const cute = {
      container: c, body, ears: [earL, earR], face, eyes: [eyeL, eyeR], highlights: [hiL, hiR],
      mouth, cheeks: [cheekL, cheekR], hurtFace, sweat, hurt: false,
    };

    // ときどきまばたき
    this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        cute.eyes.forEach((e) => { e.scaleY = 0.15; });
        cute.highlights.forEach((h) => h.setVisible(false));
        this.time.delayedCall(120, () => {
          cute.eyes.forEach((e) => { e.scaleY = 1; });
          cute.highlights.forEach((h) => h.setVisible(true));
        });
      },
    });
    return cute;
  }

  // 色を次に切り替える（スペース / O キー・「色」ボタン共通）
  nextColor(player) {
    player.colorIndex = (player.colorIndex + 1) % PLAYER_COLORS.length;
    const color = PLAYER_COLORS[player.colorIndex];
    player.rect.setFillStyle(color);
    player.cute.body.setFillStyle(color);
    player.cute.ears.forEach((ear) => ear.setFillStyle(color));
    // 色が変わったらぴょこっと弾む
    this.tweens.add({ targets: player.cute.body, scale: { from: 1.2, to: 1 }, duration: 200, ease: 'Back.Out' });
    // 新しい色のキラッ（pixelfx の collect-burst。原点は光の中心の 30 ドット下なので、その分ずらす）
    this.pfx.play(collectBurst, player.rect.x, player.rect.y + 30 * PIXEL_SCALE, { palette: rampFrom(color) });
  }

  // 見た目のキャラを当たり判定の位置に合わせ、動きに応じてぴょこぴょこさせる
  updateCuteCharacter(player, vx, vy, time) {
    const { container, face } = player.cute;
    container.setPosition(player.rect.x, player.rect.y);
    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      // 歩くたびに弾む（上下 + ちょっと潰れる）
      const t = time * (player.dash ? 0.03 : 0.02) + player.index;
      const hop = Math.abs(Math.sin(t));
      container.y -= hop * 4;
      container.scaleX = 1 + (1 - hop) * 0.08;
      container.scaleY = 1 - (1 - hop) * 0.08;
      container.angle = Math.sin(t) * 6;
    } else {
      // 止まっているときはゆっくり呼吸
      const b = Math.sin(time * 0.004 + player.index) * 0.03;
      container.scaleX = 1 - b;
      container.scaleY = 1 + b;
      container.angle = 0;
    }
    // 進む方向に顔を向ける
    const targetFacing = vx === 0 ? 0 : Math.sign(vx);
    player.facing += (targetFacing - player.facing) * 0.2;
    face.x = player.facing * 3;
    face.y = 2 + (vy > 0 ? 1.5 : vy < 0 ? -1.5 : 0);
    // 敵に触れている間は痛そうな顔 + ぷるぷる震える
    const touching = this.enemies.filter((e) => !e.dead
      && Phaser.Math.Distance.Between(e.x, e.y, player.rect.x, player.rect.y) < HURT_DISTANCE);
    if (touching.length && !player.down) this.damagePlayer(player, touching, time);
    const hurt = player.down || touching.length > 0;
    this.setHurtFace(player.cute, hurt);
    // 無敵中はチカチカ点滅（ダメージを受けた合図）
    if (player.down) container.setAlpha(0.4);
    else if (time < player.invincibleUntil) container.setAlpha(Math.floor(time / 80) % 2 ? 0.25 : 1);
    else container.setAlpha(1);
    if (hurt && !player.down) {
      container.x += Math.sin(time * 0.09) * 1.5;
      player.cute.sweat.y = Math.sin(time * 0.012) * 1.5;
    }
    player.label.setPosition(player.rect.x, container.y - 34);
  }

  // ふつうの顔 ⇔ 痛そうな顔 の切り替え
  setHurtFace(cute, hurt) {
    if (cute.hurt === hurt) return;
    cute.hurt = hurt;
    cute.hurtFace.setVisible(hurt);
    cute.mouth.setVisible(!hurt);
    cute.eyes.forEach((e) => e.setVisible(!hurt));
    cute.highlights.forEach((h) => h.setAlpha(hurt ? 0 : 1));
    cute.cheeks.forEach((ch) => ch.setFillStyle(hurt ? 0xff3355 : 0xff6f91, hurt ? 0.9 : 0.7));
    if (hurt) this.tweens.add({ targets: cute.body, scale: { from: 0.85, to: 1 }, duration: 160, ease: 'Back.Out' });
  }

  // スマホ用：バーチャルスティック + 「色」「加速」「ビーム」ボタン（1P を操作）
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
      this.nextColor(this.players[0]);
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

    const beamBtn = makeButton(BEAM_BUTTON, 'ビーム');
    this.beamPointerId = null;
    beamBtn.on('pointerdown', (pointer) => {
      this.beamPointerId = pointer.id;
      this.touchBeamDown = true;
      beamBtn.setFillStyle(0xffffff, 0.45);
    });
    this.beamBtn = beamBtn;

    const specialBtn = makeButton(SPECIAL_BUTTON, '必殺');
    specialBtn.on('pointerdown', () => this.trySpecial(this.players[0]));
    this.specialBtn = specialBtn;

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
      if (pointer.id === this.beamPointerId) this.releaseBeam();
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    const onBlur = () => {
      this.resetStick();
      this.releaseDash();
      this.releaseBeam();
    };
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.BLUR, onBlur));
  }

  releaseBeam() {
    this.beamPointerId = null;
    this.touchBeamDown = false;
    if (this.beamBtn) this.beamBtn.setFillStyle(0xffffff, 0.2);
  }

  hasPower(player, type) {
    return player.powers[type] !== undefined;
  }

  // ビームを撃つ（持っているアイテム効果をすべて重ねて反映する）
  fireBeam(player) {
    if (player.down || this.gameOver || this.countdownActive) return;
    const has = (t) => this.hasPower(player, t);
    const base = Math.atan2(player.aimDir.y, player.aimDir.x);
    // 撃つ向き：全方位 > （正面 + うしろ + よこ）。散弾はそれぞれを 3 方向に広げる
    let dirs;
    if (has('ring')) {
      dirs = Array.from({ length: RING_DIRS }, (_, i) => base + (Math.PI * 2 * i) / RING_DIRS);
    } else {
      dirs = [base];
      if (has('back')) dirs.push(base + Math.PI);
      if (has('side')) dirs.push(base - Math.PI / 2, base + Math.PI / 2);
    }
    if (has('spread')) dirs = dirs.flatMap((a) => SPREAD_ANGLES.map((d) => a + Phaser.Math.DegToRad(d)));
    const offsets = has('twin') ? [-TWIN_OFFSET, TWIN_OFFSET] : [0];
    const opts = this.beamOptions(player);
    dirs.forEach((a) => offsets.forEach((o) => {
      if (this.beams.length < MAX_BEAMS) this.createBeam(player, a, opts, o);
    }));
    // 発射の反動でキャラがちょっと縮む
    this.tweens.add({ targets: player.cute.body, scale: { from: 0.9, to: 1 }, duration: 120 });
  }

  // 1 本ごとのビームの性質（アイテム効果の組み合わせ）
  beamOptions(player) {
    const has = (t) => this.hasPower(player, t);
    const homing = has('homing');
    return {
      homing,
      pierce: has('pierce'),
      wave: has('wave'),
      bounce: has('bounce'),
      explode: has('explode'),
      split: has('split'),
      chain: has('chain'),
      freeze: has('freeze'),
      rainbow: has('rainbow'),
      boomerang: has('boomerang'),
      scale: has('big') ? BIG_SCALE : 1,
      length: has('long') ? BEAM_LENGTH * LONG_MULT : BEAM_LENGTH,
      speed: (homing ? HOMING_SPEED : BEAM_SPEED) * (has('fast') ? FAST_MULT : 1),
    };
  }

  // ビームを 1 本作る（そのプレイヤーの今の色・指定した向き）
  // offset: 進行方向に対して横にずらす量 / x, y: 発射位置（省略時はプレイヤーの前）
  createBeam(player, angle, opts, offset = 0, x = null, y = null) {
    const color = PLAYER_COLORS[player.colorIndex];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const startX = x ?? player.rect.x + cos * 22 - sin * offset;
    const startY = y ?? player.rect.y + sin * 22 + cos * offset;
    const len = opts.length;
    // 外側のぼんやり光 + 白い芯 + 効果ごとの先端の玉
    const glow = this.add.rectangle(0, 0, len + 8, BEAM_WIDTH + 8, color, 0.35);
    const parts = [glow, this.add.rectangle(0, 0, len, BEAM_WIDTH, 0xffffff)];
    const tips = ['homing', 'explode', 'freeze', 'chain', 'split'].filter((t) => opts[t]);
    tips.forEach((t, i) => {
      parts.push(this.add.circle(len / 2 - i * 7, 0, i === 0 ? 5 : 3.5, ITEM_TYPES[t].color));
    });
    const beam = this.add.container(startX, startY, parts)
      .setRotation(angle).setScale(opts.scale).setDepth(9);
    beam.glow = glow;
    beam.opts = opts;
    beam.bx = startX; // ウェーブの揺れを除いた本来の位置
    beam.by = startY;
    beam.vx = cos * opts.speed;
    beam.vy = sin * opts.speed;
    beam.age = 0;
    beam.bounces = 0;
    beam.returning = false;
    beam.owner = player;
    this.beams.push(beam);
    return beam;
  }

  // ビームの向きを target のほうへ少しずつ曲げる
  turnBeamToward(beam, tx, ty, rate, delta) {
    const current = Math.atan2(beam.vy, beam.vx);
    const wanted = Math.atan2(ty - beam.by, tx - beam.bx);
    const diff = Phaser.Math.Angle.Wrap(wanted - current);
    const maxTurn = rate * delta / 1000;
    const next = current + Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
    beam.vx = Math.cos(next) * beam.opts.speed;
    beam.vy = Math.sin(next) * beam.opts.speed;
  }

  // ホーミング弾：いちばん近い敵のほうへ少しずつ曲がる
  steerHomingBeam(beam, delta) {
    let target = null;
    let best = Infinity;
    this.enemies.forEach((enemy) => {
      if (enemy.dead) return;
      const d = Phaser.Math.Distance.Between(beam.bx, beam.by, enemy.x, enemy.y);
      if (d < best) { best = d; target = enemy; }
    });
    if (target) this.turnBeamToward(beam, target.x, target.y, HOMING_TURN_RATE, delta);
  }

  updateBeams(time, delta) {
    const firingByPlayer = [
      this.beamKey.isDown || this.touchBeamDown,
      this.p2Keys.U.isDown,
    ];
    this.players.forEach((player) => {
      const interval = this.hasPower(player, 'rapid') ? RAPID_INTERVAL : BEAM_INTERVAL;
      if (firingByPlayer[player.index] && time - player.lastBeamTime >= interval) {
        player.lastBeamTime = time;
        this.fireBeam(player);
      }
    });
    // 分裂弾などで途中に増えたビームは this.beams に入るので、あとで合流させる
    const list = this.beams;
    this.beams = [];
    const alive = list.filter((beam) => this.updateBeam(beam, time, delta));
    this.beams = alive.concat(this.beams);
  }

  // ビーム 1 本を動かす。消えたら false を返す
  updateBeam(beam, time, delta) {
    const o = beam.opts;
    const { width, height } = this.scale;
    beam.age += delta;
    if (o.boomerang && !beam.returning && beam.age >= BOOMERANG_TURN_TIME) beam.returning = true;
    if (beam.returning) {
      const owner = beam.owner;
      this.turnBeamToward(beam, owner.rect.x, owner.rect.y, BOOMERANG_TURN_RATE, delta);
      if (Phaser.Math.Distance.Between(beam.bx, beam.by, owner.rect.x, owner.rect.y) < 24) {
        beam.destroy();
        return false;
      }
    } else if (o.homing) {
      this.steerHomingBeam(beam, delta);
    }
    beam.bx += beam.vx * delta / 1000;
    beam.by += beam.vy * delta / 1000;
    // はね返り弾：画面の端で向きを反転
    if (o.bounce && beam.bounces < BOUNCE_MAX) {
      if ((beam.bx < 0 && beam.vx < 0) || (beam.bx > width && beam.vx > 0)) { beam.vx = -beam.vx; beam.bounces += 1; }
      if ((beam.by < 0 && beam.vy < 0) || (beam.by > height && beam.vy > 0)) { beam.vy = -beam.vy; beam.bounces += 1; }
    }
    const ang = Math.atan2(beam.vy, beam.vx);
    let x = beam.bx;
    let y = beam.by;
    if (o.wave) {
      const w = Math.sin(beam.age * WAVE_FREQ) * WAVE_AMP;
      x -= Math.sin(ang) * w;
      y += Math.cos(ang) * w;
    }
    beam.setPosition(x, y);
    beam.rotation = ang;
    if (o.rainbow) {
      const hue = (time * 0.001 + beam.age * 0.002) % 1;
      beam.glow.setFillStyle(Phaser.Display.Color.HSVToRGB(hue, 1, 1).color, 0.6);
    }

    const margin = o.length * o.scale + 10;
    const out = beam.bx < -margin || beam.bx > width + margin || beam.by < -margin || beam.by > height + margin;
    // ブーメランは画面外に出ても戻ってくる（念のため 4 秒で消える）
    if ((out && !o.boomerang) || (o.boomerang && beam.age > 4000)) {
      beam.destroy();
      return false;
    }
    // 当たり判定：ビームの線分と敵の中心の距離（ふつうのビームは今までどおり半径 敵 + 14 の円）
    const hs = o.scale * (o.rainbow ? 1.25 : 1);
    const reach = (BEAM_LENGTH / 2) * hs;
    const seg = Math.max(0, (o.length * o.scale) / 2 - reach);
    const ax = x - Math.cos(ang) * seg;
    const ay = y - Math.sin(ang) * seg;
    const bx = x + Math.cos(ang) * seg;
    const by = y + Math.sin(ang) * seg;
    const hit = this.enemies.find((enemy) => !enemy.dead
      && distToSegment(enemy.x, enemy.y, ax, ay, bx, by) < ENEMY_RADIUS + reach);
    if (hit) {
      this.beamHit(beam, hit, x, y, ang);
      if (!o.pierce) {
        beam.destroy();
        return false;
      }
    }
    return true;
  }

  // ビームが敵に当たったとき（爆発・いなずま・こおり・分裂もここで起こす）
  beamHit(beam, enemy, x, y, ang) {
    const o = beam.opts;
    const owner = beam.owner;
    const ex = enemy.x;
    const ey = enemy.y;
    this.defeatEnemy(enemy, owner);
    if (o.explode) this.explodeAt(ex, ey, owner);
    if (o.chain) this.chainFrom(ex, ey, owner);
    if (o.freeze) this.freezeAround(ex, ey);
    if (o.split && this.beams.length < MAX_BEAMS) {
      const child = { ...o, split: false, boomerang: false, scale: o.scale * 0.6 };
      SPLIT_ANGLES.forEach((d) => this.createBeam(owner, ang + Phaser.Math.DegToRad(d), child, 0, x, y));
    }
  }

  // 爆発弾：まわりの敵もまとめて倒す
  explodeAt(x, y, owner) {
    const boom = this.add.circle(x, y, EXPLODE_RADIUS, ITEM_TYPES.explode.color, 0.45).setDepth(9);
    boom.setStrokeStyle(3, 0xffe27a);
    this.tweens.add({
      targets: boom, scale: { from: 0.3, to: 1 }, alpha: 0, duration: 320, onComplete: () => boom.destroy(),
    });
    this.enemies.filter((e) => !e.dead && Phaser.Math.Distance.Between(x, y, e.x, e.y) < EXPLODE_RADIUS + ENEMY_RADIUS)
      .forEach((e) => this.defeatEnemy(e, owner));
  }

  // いなずま：近くの敵へ次々に連鎖する
  chainFrom(x, y, owner) {
    let fx = x;
    let fy = y;
    for (let i = 0; i < CHAIN_JUMPS; i += 1) {
      let target = null;
      let best = CHAIN_RANGE;
      this.enemies.forEach((e) => {
        if (e.dead) return;
        const d = Phaser.Math.Distance.Between(fx, fy, e.x, e.y);
        if (d < best) { best = d; target = e; }
      });
      if (!target) return;
      // ギザギザの稲妻
      const g = this.add.graphics().setDepth(9);
      g.lineStyle(3, ITEM_TYPES.chain.color, 1);
      g.beginPath();
      g.moveTo(fx, fy);
      const steps = 5;
      for (let s = 1; s < steps; s += 1) {
        const t = s / steps;
        g.lineTo(fx + (target.x - fx) * t + Phaser.Math.Between(-8, 8), fy + (target.y - fy) * t + Phaser.Math.Between(-8, 8));
      }
      g.lineTo(target.x, target.y);
      g.strokePath();
      this.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() });
      fx = target.x;
      fy = target.y;
      this.defeatEnemy(target, owner);
    }
  }

  // こおり弾：まわりの敵をしばらく止める
  freezeAround(x, y) {
    const ring = this.add.circle(x, y, FREEZE_RADIUS, ITEM_TYPES.freeze.color, 0.25).setDepth(9);
    this.tweens.add({
      targets: ring, scale: { from: 0.4, to: 1 }, alpha: 0, duration: 400, onComplete: () => ring.destroy(),
    });
    const until = this.time.now + FREEZE_TIME;
    this.enemies.forEach((e) => {
      if (!e.dead && Phaser.Math.Distance.Between(x, y, e.x, e.y) < FREEZE_RADIUS + ENEMY_RADIUS) {
        e.frozenUntil = until;
        e.ice.setVisible(true);
      }
    });
  }

  // えいせい：プレイヤーのまわりを回る玉。触れた敵を倒す
  updateSatellites(time) {
    this.players.forEach((p) => {
      const active = this.hasPower(p, 'orbit');
      if (!active) {
        if (p.sats) { p.sats.forEach((s) => s.destroy()); p.sats = null; }
        return;
      }
      if (!p.sats) {
        p.sats = Array.from({ length: ORBIT_COUNT }, () => this.add.container(p.rect.x, p.rect.y, [
          this.add.circle(0, 0, ORBIT_SIZE + 5, ITEM_TYPES.orbit.color, 0.3),
          this.add.circle(0, 0, ORBIT_SIZE, ITEM_TYPES.orbit.color).setStrokeStyle(2, 0xffffff),
        ]).setDepth(9));
      }
      p.sats.forEach((s, i) => {
        const a = time * ORBIT_SPEED + (Math.PI * 2 * i) / ORBIT_COUNT;
        s.setPosition(p.rect.x + Math.cos(a) * ORBIT_RADIUS, p.rect.y + Math.sin(a) * ORBIT_RADIUS);
        this.enemies.filter((e) => !e.dead && Phaser.Math.Distance.Between(s.x, s.y, e.x, e.y) < ENEMY_RADIUS + ORBIT_SIZE)
          .forEach((e) => this.defeatEnemy(e, p));
      });
    });
  }

  // 敵を 1 体、画面のランダムな端から出す（むらさきのトゲトゲおばけ）
  spawnEnemy() {
    const { width, height } = this.scale;
    const m = ENEMY_RADIUS + 4;
    const side = Phaser.Math.Between(0, 3);
    const x = side === 0 ? -m : side === 1 ? width + m : Phaser.Math.Between(0, width);
    const y = side === 2 ? -m : side === 3 ? height + m : Phaser.Math.Between(0, height);

    const outline = 0x1d1d33;
    const spikes = this.add.star(0, 0, 8, ENEMY_RADIUS - 2, ENEMY_RADIUS + 5, 0x5b2c83).setStrokeStyle(2, outline);
    const body = this.add.circle(0, 0, ENEMY_RADIUS, ENEMY_COLOR).setStrokeStyle(2, outline);
    const eyeL = this.add.ellipse(-6, -2, 7, 9, 0xffffff);
    const eyeR = this.add.ellipse(6, -2, 7, 9, 0xffffff);
    const pupilL = this.add.circle(-5, -1, 2.2, 0xff004d);
    const pupilR = this.add.circle(5, -1, 2.2, 0xff004d);
    // つり上がったまゆ毛
    const brows = this.add.graphics();
    brows.lineStyle(2, outline, 1);
    brows.lineBetween(-10, -9, -3, -6);
    brows.lineBetween(10, -9, 3, -6);
    const mouth = this.add.graphics();
    mouth.lineStyle(2, outline, 1);
    mouth.beginPath();
    mouth.moveTo(-5, 8);
    mouth.lineTo(-2, 6);
    mouth.lineTo(1, 8);
    mouth.lineTo(4, 6);
    mouth.strokePath();
    // こおり弾で凍ったときの氷（ふだんは非表示）
    const ice = this.add.circle(0, 0, ENEMY_RADIUS + 5, 0xbfefff, 0.55)
      .setStrokeStyle(2, 0xffffff).setVisible(false);

    const enemy = this.add.container(x, y, [spikes, body, eyeL, eyeR, pupilL, pupilR, brows, mouth, ice]).setDepth(8);
    enemy.spikes = spikes;
    enemy.pupils = [pupilL, pupilR];
    enemy.ice = ice;
    enemy.frozenUntil = 0;
    enemy.wobble = Math.random() * Math.PI * 2;
    enemy.dead = false;
    this.enemies.push(enemy);
  }

  // 敵をやっつける（ポンッとはじけて消える）
  defeatEnemy(enemy, byPlayer) {
    if (enemy.dead) return;
    enemy.dead = true;
    this.enemies = this.enemies.filter((e) => e !== enemy);
    if (byPlayer) {
      byPlayer.score += 1;
      this.updateScoreText();
      // 必殺技でたおした分はゲージに入らない（連発防止）
      if (!enemy.bySpecial) this.addSpecial(byPlayer, 1);
    }
    // ときどきアイテムを落とす（21 種類からランダム）
    if (Math.random() < ITEM_DROP_CHANCE) {
      if (Math.random() < HEAL_ITEM_CHANCE) this.spawnItem(enemy.x, enemy.y, 'heal', this.rollHealAmount());
      else this.spawnItem(enemy.x, enemy.y, Phaser.Utils.Array.GetRandom(ITEM_KEYS));
    }
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8;
      const dot = this.add.circle(enemy.x, enemy.y, 4, i % 2 ? ENEMY_COLOR : 0xffffff).setDepth(9);
      this.tweens.add({
        targets: dot,
        x: enemy.x + Math.cos(a) * 30,
        y: enemy.y + Math.sin(a) * 30,
        alpha: 0,
        scale: 0.3,
        duration: 300,
        onComplete: () => dot.destroy(),
      });
    }
    this.tweens.add({
      targets: enemy,
      scale: 1.4,
      alpha: 0,
      duration: 150,
      onComplete: () => enemy.destroy(),
    });
  }

  // 敵はいちばん近いプレイヤーにふらふら近づいてくる（凍っている間は止まる）
  updateEnemies(time, delta) {
    if (this.cutinActive) return; // カットイン中は敵も止まる
    this.enemies.forEach((enemy) => {
      const frozen = enemy.frozenUntil > time;
      if (!frozen && enemy.ice.visible) enemy.ice.setVisible(false);
      if (frozen) return;
      let target = null;
      let best = Infinity;
      this.players.forEach((p) => {
        if (p.down) return; // ダウンしたプレイヤーは狙わない
        const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, p.rect.x, p.rect.y);
        if (d < best) { best = d; target = p; }
      });
      if (!target || best < 1) return;
      const angle = Math.atan2(target.rect.y - enemy.y, target.rect.x - enemy.x)
        + Math.sin(time * 0.003 + enemy.wobble) * 0.6;
      // くっつきすぎないよう、プレイヤーの近くでは止まる
      if (best > PLAYER_SIZE) {
        enemy.x += Math.cos(angle) * ENEMY_SPEED * delta / 1000;
        enemy.y += Math.sin(angle) * ENEMY_SPEED * delta / 1000;
      }
      enemy.spikes.angle += delta * 0.09;
      enemy.scaleY = 1 + Math.sin(time * 0.008 + enemy.wobble) * 0.06;
      // 目でプレイヤーをにらむ
      const ex = Math.cos(angle) * 1.5;
      const ey = Math.sin(angle) * 1.5;
      enemy.pupils[0].setPosition(-6 + ex, -2 + ey);
      enemy.pupils[1].setPosition(6 + ex, -2 + ey);
    });
  }

  // アイテムを置く（画面内に収める）。ふわふわ浮いて、時間がたつと点滅して消える
  // 回復量を決める（1: 60% / 2: 30% / 3: 10%）
  rollHealAmount() {
    const total = HEAL_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
    let r = Math.random() * total;
    for (const [amount, w] of HEAL_WEIGHTS) {
      if (r < w) return amount;
      r -= w;
    }
    return 1;
  }

  spawnItem(x, y, type, heal = 0) {
    const { width, height } = this.scale;
    const ix = Phaser.Math.Clamp(x, ITEM_RADIUS + 4, width - ITEM_RADIUS - 4);
    const iy = Phaser.Math.Clamp(y, ITEM_RADIUS + 4, height - ITEM_RADIUS - 4);
    const isHeal = type === 'heal';
    const color = isHeal ? HEAL_ITEM_COLOR : ITEM_TYPES[type].color;
    const glow = this.add.circle(0, 0, ITEM_RADIUS + 6, color, 0.3);
    const parts = [glow];
    if (isHeal) {
      // 白い丸の中にハート + 回復量の数字
      parts.push(this.add.circle(0, 0, ITEM_RADIUS, 0xffffff).setStrokeStyle(2, color));
      parts.push(this.add.image(0, -1, 'heart').setTint(color).setScale(0.95));
      parts.push(this.add.text(0, -2, `${heal}`, {
        fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5));
    } else {
      parts.push(this.add.circle(0, 0, ITEM_RADIUS, color).setStrokeStyle(2, 0xffffff));
      parts.push(this.add.text(0, 0, ITEM_TYPES[type].mark, {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#1d1d33',
      }).setOrigin(0.5));
    }
    const inner = this.add.container(0, 0, parts);
    const item = this.add.container(ix, iy, [inner]).setDepth(7);
    item.type = type;
    item.heal = heal;
    item.expireAt = this.time.now + ITEM_LIFETIME;
    item.inner = inner;
    this.tweens.add({ targets: inner, y: -4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: glow, scale: 1.25, alpha: 0.12, duration: 700, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: item, scale: { from: 0, to: 1 }, duration: 250, ease: 'Back.Out' });
    this.items.push(item);
  }

  // アイテムを拾う判定・消える判定・効果時間の管理
  updateItems(time, delta) {
    // 磁石を持っているプレイヤーがいれば、落ちているアイテムがいちばん近い持ち主へ吸い寄せられる
    const magnets = this.players.filter((p) => this.hasPower(p, 'magnet'));
    if (magnets.length) {
      this.items.forEach((item) => {
        let target = null;
        let best = Infinity;
        magnets.forEach((p) => {
          const d = Phaser.Math.Distance.Between(item.x, item.y, p.rect.x, p.rect.y);
          if (d < best) { best = d; target = p; }
        });
        if (best < 1) return;
        const step = Math.min(best, MAGNET_SPEED * delta / 1000);
        item.x += (target.rect.x - item.x) / best * step;
        item.y += (target.rect.y - item.y) / best * step;
      });
    }
    this.items = this.items.filter((item) => {
      const picker = this.players.find((p) => !p.down && Phaser.Math.Distance.Between(p.rect.x, p.rect.y, item.x, item.y)
        < ITEM_RADIUS + PLAYER_SIZE / 2 + 2);
      if (picker) {
        this.pickUpItem(picker, item, time);
        return false;
      }
      const left = item.expireAt - time;
      if (left <= 0) {
        item.destroy();
        return false;
      }
      // 残り 2 秒で点滅
      item.setAlpha(left < 2000 && Math.floor(left / 120) % 2 === 0 ? 0.3 : 1);
      return true;
    });
    // 時間が切れた効果だけ外す（ほかの効果は残る）
    this.players.forEach((p) => {
      Object.keys(p.powers).forEach((t) => { if (time >= p.powers[t]) delete p.powers[t]; });
    });
    this.updatePowerText(time);
    if (this.testPanel && this.testPanel.visible) this.refreshTestPanel();
  }

  pickUpItem(player, item, time) {
    if (item.type === 'heal') {
      this.healPlayer(player, item);
      return;
    }
    const def = ITEM_TYPES[item.type];
    // 重ねがけ：持っている効果はそのまま。同じ種類なら残り時間が 10 秒に戻る（テストで付けた無制限はそのまま）
    if (player.powers[item.type] !== Infinity) player.powers[item.type] = time + POWER_DURATION;
    const { x, y } = item;
    item.destroy();
    // キラッと光る演出 + 「散弾!」などの文字
    const ring = this.add.circle(x, y, ITEM_RADIUS, def.color, 0).setStrokeStyle(3, def.color).setDepth(9);
    this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
    const hex = `#${def.color.toString(16).padStart(6, '0')}`;
    const pop = this.add.text(x, y - 20, `${def.name}!`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: hex,
      stroke: '#1d1d33',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(12);
    this.tweens.add({ targets: pop, y: y - 50, alpha: 0, duration: 900, onComplete: () => pop.destroy() });
    this.tweens.add({ targets: player.cute.body, scale: { from: 1.25, to: 1 }, duration: 250, ease: 'Back.Out' });
  }

  updatePowerText(time) {
    const parts = this.players
      .filter((p) => Object.keys(p.powers).length > 0)
      .map((p) => {
        const who = this.players.length > 1 ? `${p.index + 1}P: ` : '';
        const compact = Object.keys(p.powers).length > 4;
        const list = ITEM_KEYS.filter((t) => this.hasPower(p, t)).map((t) => {
          const until = p.powers[t];
          const left = until === Infinity ? '∞' : `${Math.ceil((until - time) / 1000)}秒`;
          // 4 つより多いときは文字（散・追…）だけにして短くする
          return compact ? `${ITEM_TYPES[t].mark}${left}` : `${ITEM_TYPES[t].name} ${left}`;
        });
        return `${who}${list.join(compact ? ' ' : '・')}`;
      });
    const text = parts.length ? `アイテム効果中　${parts.join('　')}` : '';
    if (text !== this.powerText.text) this.powerText.setText(text);
  }

  // テスト用：右上の「テスト」ボタン / T キーで、アイテム効果を自由に ON/OFF できるパネルを開く
  createTestUI() {
    const font = { fontFamily: 'sans-serif', color: '#ffffff' };
    const toggleBtn = this.add.rectangle(748, 22, 92, 30, 0x000000, 0.4)
      .setStrokeStyle(2, 0xffffff, 0.6).setDepth(150).setInteractive({ useHandCursor: true });
    this.add.text(748, 22, this.isTouch ? 'テスト' : 'テスト(T)', { ...font, fontSize: '14px' })
      .setOrigin(0.5).setDepth(151);
    toggleBtn.on('pointerdown', () => this.toggleTestPanel());
    this.input.keyboard.on('keydown-T', (event) => { if (!event.repeat) this.toggleTestPanel(); });
    this.input.keyboard.on('keydown-ESC', () => { if (this.testPanel.visible) this.toggleTestPanel(); });

    const panel = this.add.container(0, 0).setDepth(200).setVisible(false);
    // 背景（パネルの上を触ってもスティックが反応しないよう入力を受け止める）
    const bg = this.add.rectangle(400, 290, 780, 420, 0x0b1030, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.5).setInteractive();
    const title = this.add.text(400, 100, 'テストモード　タップ / クリックで効果を ON・OFF（時間無制限・重ねがけOK）', {
      ...font, fontSize: '16px', fontStyle: 'bold',
    }).setOrigin(0.5);
    panel.add([bg, title]);

    const makeBtn = (x, y, w, h, color, onTap) => {
      const r = this.add.rectangle(x, y, w, h, 0x1d2b53, 0.95)
        .setStrokeStyle(2, color).setInteractive({ useHandCursor: true });
      r.on('pointerdown', onTap);
      panel.add(r);
      return r;
    };

    this.testButtons = {};
    ITEM_KEYS.forEach((type, i) => {
      const def = ITEM_TYPES[type];
      const x = 100 + (i % 5) * 150;
      const y = 140 + Math.floor(i / 5) * 50;
      const r = makeBtn(x, y, 140, 44, def.color, () => this.toggleTestPower(type));
      const orb = this.add.circle(x - 51, y, 12, def.color).setStrokeStyle(2, 0xffffff);
      const mark = this.add.text(x - 51, y, def.mark, {
        ...font, fontSize: '13px', fontStyle: 'bold', color: '#1d1d33',
      }).setOrigin(0.5);
      const name = this.add.text(x + 10, y - 8, def.name, { ...font, fontSize: '13px' }).setOrigin(0.5);
      const desc = this.add.text(x + 10, y + 10, def.desc, { ...font, fontSize: '9px', color: '#c9d4ff' }).setOrigin(0.5);
      panel.add([orb, mark, name, desc]);
      this.testButtons[type] = { rect: r, color: def.color };
    });

    const bottom = [
      { label: '全部ON', color: 0x00e436, tap: () => this.setAllTestPowers(true) },
      { label: '全部OFF', color: 0xff004d, tap: () => this.setAllTestPowers(false) },
      { label: '敵 +5', color: 0x8e44ad, tap: () => this.spawnTestEnemies(5) },
      { label: '必殺MAX', color: 0xffcc00, tap: () => this.players.forEach((p) => this.addSpecial(p, SPECIAL_MAX)) },
      { label: '体力MAX', color: 0xff3b5c, tap: () => this.healAll() },
      { label: '閉じる', color: 0xffffff, tap: () => this.toggleTestPanel() },
    ];
    bottom.forEach((b, i) => {
      const x = 75 + i * 130;
      makeBtn(x, 400, 120, 40, b.color, b.tap);
      panel.add(this.add.text(x, 400, b.label, { ...font, fontSize: '16px', fontStyle: 'bold' }).setOrigin(0.5));
    });
    panel.add(this.add.text(400, 455, '効果は参加中のプレイヤー全員に付きます。T / Esc / 「閉じる」でパネルを閉じて遊べます', {
      ...font, fontSize: '12px', color: '#c9d4ff',
    }).setOrigin(0.5));
    this.testPanel = panel;
  }

  toggleTestPanel() {
    this.testPanel.setVisible(!this.testPanel.visible);
    if (this.testPanel.visible) this.refreshTestPanel();
  }

  // ON/OFF：1P が持っていれば全員から外す、持っていなければ全員に無制限で付ける
  toggleTestPower(type) {
    const on = !this.hasPower(this.players[0], type);
    this.players.forEach((p) => {
      if (on) p.powers[type] = Infinity;
      else delete p.powers[type];
    });
    this.refreshTestPanel();
  }

  setAllTestPowers(on) {
    this.players.forEach((p) => {
      ITEM_KEYS.forEach((t) => {
        if (on) p.powers[t] = Infinity;
        else delete p.powers[t];
      });
    });
    this.refreshTestPanel();
  }

  spawnTestEnemies(n) {
    for (let i = 0; i < n && this.enemies.length < TEST_ENEMY_MAX; i += 1) this.spawnEnemy();
  }

  refreshTestPanel() {
    const p = this.players[0];
    ITEM_KEYS.forEach((t) => {
      const { rect, color } = this.testButtons[t];
      const on = this.hasPower(p, t);
      if (rect.isOn !== on) {
        rect.isOn = on;
        rect.setFillStyle(on ? color : 0x1d2b53, on ? 0.55 : 0.95);
        rect.setStrokeStyle(on ? 4 : 2, on ? 0xffffff : color);
      }
    });
  }


  // 背景：夜空のグラデーション + 星雲 + 遠くの惑星 + またたく星（3 層でゆっくり流れる）+ ときどき流れ星
  createBackground() {
    const { width, height } = this.scale;
    if (!this.textures.exists('bg-sky')) {
      const tex = this.textures.createCanvas('bg-sky', width, height);
      const ctx = tex.getContext();
      // 夜空のグラデーション（上は深い紺、下はむらさき寄り）
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#0b1030');
      sky.addColorStop(0.55, '#1d2b53');
      sky.addColorStop(1, '#3a1f5d');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);
      // 星雲（ぼんやりした色の雲）
      const nebula = (x, y, r, color) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      };
      nebula(180, 160, 260, 'rgba(255, 119, 168, 0.22)');
      nebula(620, 420, 300, 'rgba(41, 173, 255, 0.2)');
      nebula(420, 260, 200, 'rgba(131, 118, 156, 0.18)');
      nebula(720, 90, 160, 'rgba(0, 228, 54, 0.08)');
      // 遠くの惑星（輪っか付き）
      const px = 655;
      const py = 150;
      const pr = 46;
      const planet = ctx.createRadialGradient(px - 16, py - 16, 6, px, py, pr);
      planet.addColorStop(0, '#ffd59e');
      planet.addColorStop(0.6, '#e07a5f');
      planet.addColorStop(1, '#7a2e4a');
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = 'rgba(255, 226, 180, 0.5)';
      ctx.lineWidth = 5;
      ctx.beginPath(); // 輪っか（奥側）
      ctx.ellipse(px, py, pr * 1.9, pr * 0.45, -0.35, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = planet;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath(); // 輪っか（手前側）
      ctx.ellipse(px, py, pr * 1.9, pr * 0.45, -0.35, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
      // 小さな月
      ctx.fillStyle = 'rgba(220, 230, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(110, 470, 14, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
    }
    this.add.image(0, 0, 'bg-sky').setOrigin(0).setDepth(-20);

    // またたく星（奥ほど小さく遅い）
    const layers = [
      { count: 70, size: [0.6, 1.2], speed: 4, alpha: 0.5 },
      { count: 40, size: [1, 1.8], speed: 9, alpha: 0.75 },
      { count: 18, size: [1.6, 2.4], speed: 16, alpha: 1 },
    ];
    const starColors = [0xffffff, 0xfff1c1, 0xc2e5ff, 0xffd6e8];
    this.bgStars = [];
    layers.forEach((layer, li) => {
      for (let i = 0; i < layer.count; i += 1) {
        const star = this.add.circle(
          Math.random() * width,
          Math.random() * height,
          Phaser.Math.FloatBetween(layer.size[0], layer.size[1]),
          Phaser.Utils.Array.GetRandom(starColors),
          layer.alpha,
        ).setDepth(-19 + li);
        star.speed = layer.speed;
        this.tweens.add({
          targets: star,
          alpha: layer.alpha * 0.25,
          duration: Phaser.Math.Between(700, 2200),
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, 2000),
          ease: 'Sine.InOut',
        });
        this.bgStars.push(star);
      }
    });
    // 大きめのキラキラ星（十字の光）
    for (let i = 0; i < 6; i += 1) {
      const sparkle = this.add.star(
        Phaser.Math.Between(30, width - 30),
        Phaser.Math.Between(30, height - 30),
        4, 1.2, 7, 0xffffff, 0.9,
      ).setDepth(-16);
      this.tweens.add({
        targets: sparkle,
        scale: { from: 0.4, to: 1.1 },
        alpha: { from: 0.3, to: 1 },
        angle: 45,
        duration: Phaser.Math.Between(900, 1600),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1500),
      });
    }

    // ときどき流れ星
    this.time.addEvent({
      delay: 3500,
      loop: true,
      callback: () => { if (Math.random() < 0.7) this.shootingStar(); },
    });
  }

  shootingStar() {
    const { width, height } = this.scale;
    const x = Phaser.Math.Between(width * 0.2, width);
    const y = Phaser.Math.Between(0, height * 0.4);
    const tail = this.add.rectangle(0, 0, 70, 2, 0xffffff, 0.8).setOrigin(0, 0.5);
    const head = this.add.circle(0, 0, 2.5, 0xffffff);
    const s = this.add.container(x, y, [tail, head]).setAngle(150).setDepth(-15).setAlpha(0);
    const dist = Phaser.Math.Between(220, 360);
    this.tweens.add({
      targets: s,
      x: x - Math.cos(Phaser.Math.DegToRad(30)) * dist,
      y: y + Math.sin(Phaser.Math.DegToRad(30)) * dist,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Quad.In',
      onComplete: () => s.destroy(),
    });
  }

  updateBackground(delta) {
    const { width } = this.scale;
    this.bgStars.forEach((star) => {
      star.x -= star.speed * delta / 1000;
      if (star.x < -3) star.x = width + 3;
    });
  }

  // 必殺ゲージ（画面下の中央）と、カットイン演出用の部品を作っておく
  createSpecialUI() {
    const font = { fontFamily: 'sans-serif', color: '#ffffff', stroke: '#0b1030', strokeThickness: 3 };
    this.gauges = [0, 1].map((i) => {
      const y = GAUGE_Y - i * 22;
      const label = this.add.text(GAUGE_X - 8, y, '', { ...font, fontSize: '13px', fontStyle: 'bold' })
        .setOrigin(1, 0.5).setDepth(50);
      const frame = this.add.rectangle(GAUGE_X, y, GAUGE_W, GAUGE_H, 0x0b1030, 0.75)
        .setOrigin(0, 0.5).setStrokeStyle(2, 0xffffff, 0.8).setDepth(50);
      const fill = this.add.rectangle(GAUGE_X + 2, y, 0, GAUGE_H - 4, 0xffcc00)
        .setOrigin(0, 0.5).setDepth(51);
      const ticks = this.add.graphics().setDepth(52);
      ticks.lineStyle(1, 0x0b1030, 0.6);
      for (let k = 1; k < SPECIAL_MAX; k += 1) {
        const tx = GAUGE_X + (GAUGE_W * k) / SPECIAL_MAX;
        ticks.lineBetween(tx, y - GAUGE_H / 2 + 2, tx, y + GAUGE_H / 2 - 2);
      }
      const ready = this.add.text(GAUGE_X + GAUGE_W + 4, y, '', { ...font, fontSize: '12px', fontStyle: 'bold', color: '#ffe27a' })
        .setOrigin(0, 0.5).setDepth(52);
      return { label, frame, fill, ticks, ready, shown: null };
    });

    // カットイン（必殺技を使った瞬間に画面を横切る帯 + キャラの大きな顔 + 技名）
    const { width, height } = this.scale;
    const ci = this.add.container(0, 0).setDepth(300).setVisible(false);
    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);
    const band = this.add.polygon(0, 0, [0, 190, width, 130, width, 410, 0, 470], 0xffcc00).setOrigin(0, 0);
    const bandEdge = this.add.graphics();
    bandEdge.lineStyle(6, 0xffffff, 1);
    bandEdge.lineBetween(0, 190, width, 130);
    bandEdge.lineBetween(0, 470, width, 410);
    const lines = this.add.graphics(); // 集中線っぽいスピード線
    // カットインに出てくる水着の女の子（コードで描画。水着の色はプレイヤーの色）
    const girl = this.add.graphics();
    const portrait = { container: this.add.container(0, 0, [girl]), girl };
    const title = this.add.text(width - 40, 250, '必殺！', {
      fontFamily: 'sans-serif', fontSize: '56px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#1d1d33', strokeThickness: 8,
    }).setOrigin(1, 0.5);
    const name = this.add.text(width - 40, 330, SPECIAL_NAME, {
      fontFamily: 'sans-serif', fontSize: '38px', fontStyle: 'bold', color: '#ffe27a',
      stroke: '#1d1d33', strokeThickness: 7,
    }).setOrigin(1, 0.5);
    const who = this.add.text(width - 40, 385, '', {
      fontFamily: 'sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#1d1d33', strokeThickness: 5,
    }).setOrigin(1, 0.5);
    ci.add([dim, band, lines, bandEdge, portrait.container, title, name, who]);
    this.cutin = { container: ci, dim, band, lines, portrait, title, name, who };
    this.updateSpecialUI();
  }

  addSpecial(player, n) {
    const before = player.special;
    player.special = Math.min(SPECIAL_MAX, player.special + n);
    if (before < SPECIAL_MAX && player.special === SPECIAL_MAX) {
      // 満タンになったらゲージがぷるんと弾む
      const g = this.gauges[player.index];
      this.tweens.add({ targets: [g.frame, g.fill], scaleY: { from: 1.8, to: 1 }, duration: 300, ease: 'Back.Out' });
    }
    this.updateSpecialUI();
  }

  updateSpecialUI(time = 0) {
    if (!this.gauges) return;
    this.gauges.forEach((g, i) => {
      const p = this.players[i];
      const visible = !!p;
      [g.label, g.frame, g.fill, g.ticks, g.ready].forEach((o) => o.setVisible(visible));
      if (!p) return;
      const full = p.special >= SPECIAL_MAX;
      const ok = this.isTouch && i === 0 ? '発動OK!' : `${i === 0 ? 'X' : 'P'}で発動!`;
      g.label.setText(this.players.length > 1 ? `${i + 1}P 必殺` : '必殺');
      const w = ((GAUGE_W - 4) * p.special) / SPECIAL_MAX;
      if (g.fill.width !== w) g.fill.setSize(w, GAUGE_H - 4);
      if (full) {
        // 満タン：虹色にきらきら + 「OK!」
        const color = Phaser.Display.Color.HSVToRGB((time / 1200 + i * 0.5) % 1, 0.75, 1).color;
        g.fill.setFillStyle(color);
        g.ready.setText(ok);
        g.ready.setAlpha(0.6 + Math.sin(time * 0.012) * 0.4);
      } else {
        g.fill.setFillStyle(PLAYER_COLORS[p.colorIndex]);
        g.ready.setText(`${p.special}/${SPECIAL_MAX}`);
        g.ready.setAlpha(1);
      }
    });
    if (this.specialBtn) {
      const ready = this.players[0].special >= SPECIAL_MAX;
      this.specialBtn.setFillStyle(ready ? 0xffcc00 : 0xffffff, ready ? 0.35 + Math.sin(time * 0.012) * 0.15 : 0.2);
    }
  }

  // 回復アイテム：体力が 1〜3 回復（最大 5 まで）
  healPlayer(player, item) {
    const { x, y } = item;
    const before = player.hp;
    player.hp = Math.min(PLAYER_MAX_HP, player.hp + item.heal);
    const gained = player.hp - before;
    item.destroy();
    const ring = this.add.circle(x, y, ITEM_RADIUS, HEAL_ITEM_COLOR, 0).setStrokeStyle(3, HEAL_ITEM_COLOR).setDepth(9);
    this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
    // 自機：やさしく光ってぷにっと弾む + 小さなハートが舞い上がる
    const px = player.rect.x;
    const py = player.rect.y;
    const glow = this.add.circle(px, py, 26, 0x7dffb0, 0.6).setDepth(12);
    this.tweens.add({ targets: glow, scale: 1.8, alpha: 0, duration: 420, onComplete: () => glow.destroy() });
    this.tweens.add({ targets: player.cute.body, scale: { from: 1.25, to: 1 }, duration: 300, ease: 'Back.Out' });
    for (let k = 0; k < 4; k += 1) {
      const h = this.add.image(px + Phaser.Math.Between(-18, 18), py, 'heart').setTint(0xff5c8a).setScale(0.6).setDepth(12);
      this.tweens.add({
        targets: h, y: py - 40 - k * 8, alpha: 0, duration: 700, delay: k * 70, onComplete: () => h.destroy(),
      });
    }
    const pop = this.add.text(x, y - 20, gained > 0 ? `体力 +${gained}!` : '体力MAX!', {
      fontFamily: 'sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ff7aa0',
      stroke: '#ffffff', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: pop, y: y - 50, alpha: 0, duration: 900, onComplete: () => pop.destroy() });
    // UI：増えたハートがぽんっと出てくる
    this.updateHpUI();
    const row = this.hpRows && this.hpRows[player.index];
    if (row) {
      for (let k = before; k < player.hp; k += 1) {
        const heart = row.hearts[k];
        this.tweens.killTweensOf(heart);
        this.tweens.add({ targets: heart, scale: { from: 1.8, to: 1 }, duration: 350, delay: (k - before) * 80, ease: 'Back.Out' });
      }
    }
  }

  // ゲージが満タンなら必殺技を発動（カットイン → 画面の敵を全部やっつける）
  trySpecial(player) {
    if (!player || player.down || this.gameOver || this.countdownActive || this.cutinActive || player.special < SPECIAL_MAX) return;
    player.special = 0;
    this.updateSpecialUI();
    this.cutinActive = true;
    this.playCutin(player, () => this.specialBlast(player));
  }

  playCutin(player, onDone) {
    const { width } = this.scale;
    const c = this.cutin;
    const color = PLAYER_COLORS[player.colorIndex];
    c.band.setFillStyle(color);
    this.drawSwimsuitGirl(c.portrait.girl, color);
    c.who.setText(this.players.length > 1 ? `${player.index + 1}P の必殺技` : '');
    // スピード線
    c.lines.clear();
    c.lines.lineStyle(3, 0xffffff, 0.55);
    for (let k = 0; k < 18; k += 1) {
      const y = Phaser.Math.Between(150, 450);
      const x = Phaser.Math.Between(0, width);
      c.lines.lineBetween(x, y, x + Phaser.Math.Between(60, 180), y - 10);
    }
    c.container.setVisible(true);
    c.dim.setAlpha(0);
    c.band.x = width; c.lines.x = width;
    c.portrait.container.setPosition(-200, 300).setAngle(-6);
    [c.title, c.name, c.who].forEach((t) => { t.setAlpha(0); t.x = width + 200; });
    this.tweens.add({ targets: c.dim, alpha: 1, duration: 150 });
    this.tweens.add({ targets: [c.band, c.lines], x: 0, duration: 220, ease: 'Cubic.Out' });
    this.tweens.add({ targets: c.lines, x: -120, duration: 800, delay: 220 });
    this.tweens.add({ targets: c.portrait.container, x: 165, duration: 320, delay: 120, ease: 'Back.Out' });
    this.tweens.add({ targets: c.portrait.container, x: 190, duration: 550, delay: 440 });
    [c.title, c.name, c.who].forEach((t, k) => {
      this.tweens.add({ targets: t, x: width - 40, alpha: 1, duration: 260, delay: 220 + k * 120, ease: 'Back.Out' });
    });
    this.cameras.main.shake(SPECIAL_CUTIN_TIME * 0.4, 0.004);
    // 帯ごと画面の外へ抜けていく
    this.time.delayedCall(SPECIAL_CUTIN_TIME - 260, () => {
      this.tweens.add({ targets: [c.band, c.lines, c.portrait.container, c.title, c.name, c.who], x: `-=${width + 300}`, duration: 260, ease: 'Cubic.In' });
      this.tweens.add({ targets: c.dim, alpha: 0, duration: 260 });
    });
    this.time.delayedCall(SPECIAL_CUTIN_TIME, () => {
      c.container.setVisible(false);
      onDone();
    });
  }

  // カットイン用：アニメ調の美少女（大きなキラキラ瞳・とがったあご・つやのある髪・ねこみみカチューシャ・
  // フリルのワンピース水着・浮き輪・ウインクでピース）。すべてコードで描画するオリジナルデザイン
  drawSwimsuitGirl(g, suitColor) {
    const line = 0x2a1830;
    const skin = 0xfff0e6;
    const skinShade = 0xf6cdbd;
    const hair = 0xf2a7c3; // パステルピンクの髪
    const hairDark = 0xd5779e;
    const hairLight = 0xffe3ee;
    // 2 次ベジェ曲線の点列
    const bez = (p0, p1, p2, n = 10) => {
      const pts = [];
      for (let k = 0; k <= n; k += 1) {
        const t = k / n;
        const u = 1 - t;
        pts.push({ x: u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], y: u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1] });
      }
      return pts;
    };
    const shape = (pts, fill, stroke = line, width = 3) => {
      g.fillStyle(fill, 1);
      g.fillPoints(pts, true);
      if (stroke !== null) {
        g.lineStyle(width, stroke, 1);
        g.strokePoints(pts, true);
      }
    };
    // 毛束（根元 → 先端がとがる）
    const lock = (x0, y0, cx, cy, x1, y1, w, fill = hair) => {
      const left = bez([x0 - w, y0], [cx - w * 0.6, cy], [x1, y1]);
      const right = bez([x1, y1], [cx + w * 0.6, cy], [x0 + w, y0]);
      shape([...left, ...right], fill);
    };
    g.clear();

    // うしろ髪とツインテール（ふんわり流れる長い毛束）
    lock(-70, -80, -150, 20, -110, 175, 34);
    lock(-80, -70, -120, 40, -70, 165, 22, hairDark);
    lock(70, -80, 150, 20, 110, 175, 34);
    lock(80, -70, 120, 40, 70, 165, 22, hairDark);
    g.lineStyle(4, line, 1);
    g.fillStyle(hair, 1);
    g.fillCircle(0, -62, 80); g.strokeCircle(0, -62, 80);
    lock(-40, -40, -66, 40, -50, 70, 26); // 顔の横のうしろ髪
    lock(40, -40, 66, 40, 50, 70, 26);
    // リボンの髪ゴム
    [-1, 1].forEach((s) => {
      const bx = s * 78;
      g.fillStyle(0xff4f8b, 1);
      g.lineStyle(3, line, 1);
      g.fillTriangle(bx, -76, bx - s * 26, -96, bx - s * 22, -58);
      g.strokeTriangle(bx, -76, bx - s * 26, -96, bx - s * 22, -58);
      g.fillTriangle(bx, -76, bx + s * 22, -98, bx + s * 26, -60);
      g.strokeTriangle(bx, -76, bx + s * 22, -98, bx + s * 26, -60);
      g.fillCircle(bx, -76, 8); g.strokeCircle(bx, -76, 8);
    });

    // ねこみみカチューシャ（プレイヤーの色）
    g.lineStyle(4, line, 1);
    g.fillStyle(suitColor, 1);
    g.fillTriangle(-68, -112, -28, -136, -76, -178); g.strokeTriangle(-68, -112, -28, -136, -76, -178);
    g.fillTriangle(68, -112, 28, -136, 76, -178); g.strokeTriangle(68, -112, 28, -136, 76, -178);
    g.fillStyle(0xffc2d6, 1);
    g.fillTriangle(-62, -122, -40, -136, -70, -162);
    g.fillTriangle(62, -122, 40, -136, 70, -162);

    // 首・肩・腕（ほっそり）
    g.fillStyle(skin, 1);
    g.lineStyle(3, line, 1);
    g.fillRect(-12, 6, 24, 34);
    g.fillStyle(skinShade, 1); g.fillRect(-12, 6, 24, 8); // あごの影
    g.fillStyle(skin, 1);
    g.fillEllipse(0, 72, 132, 70); g.strokeEllipse(0, 72, 132, 70);
    g.lineBetween(-12, 22, -12, 40); g.lineBetween(12, 22, 12, 40);
    g.fillEllipse(-66, 104, 26, 84); g.strokeEllipse(-66, 104, 26, 84);
    g.lineStyle(2, skinShade, 1);
    g.lineBetween(-22, 50, -6, 56); g.lineBetween(22, 50, 6, 56); // 鎖骨
    // ワンピース水着（細い肩ひも + フリル + 胸元のリボン）
    g.fillStyle(suitColor, 1);
    g.lineStyle(3, line, 1);
    g.fillRect(-40, 44, 8, 28); g.fillRect(32, 44, 8, 28);
    g.fillRoundedRect(-52, 66, 104, 96, 24); g.strokeRoundedRect(-52, 66, 104, 96, 24);
    g.fillStyle(0xffffff, 1);
    for (let k = 0; k < 7; k += 1) g.fillCircle(-46 + k * 15.3, 68, 8.5);
    g.fillStyle(0xff4f8b, 1);
    g.fillTriangle(0, 88, -16, 78, -16, 98); g.fillTriangle(0, 88, 16, 78, 16, 98);
    g.fillCircle(0, 88, 6);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(-2, 86, 2.5);
    // 浮き輪（赤白しま）
    g.lineStyle(26, 0xffffff, 1);
    g.strokeEllipse(0, 150, 190, 60);
    g.lineStyle(26, 0xff004d, 1);
    for (let k = 0; k < 4; k += 1) {
      const a0 = (Math.PI / 2) * k;
      g.beginPath();
      for (let t = 0; t <= 8; t += 1) {
        const a = a0 + (t / 8) * (Math.PI / 4);
        const px = Math.cos(a) * 95;
        const py = 150 + Math.sin(a) * 30;
        if (t === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }
    g.lineStyle(4, 0xffffff, 0.7);
    g.beginPath(); g.arc(0, 150, 80, Math.PI * 1.15, Math.PI * 1.45); g.strokePath();

    // 顔（ほおはふっくら、あごは小さくとがったアニメ顔）
    const face = [];
    for (let k = 0; k <= 16; k += 1) {
      const a = Math.PI + (Math.PI * k) / 16;
      face.push({ x: Math.cos(a) * 60, y: -46 + Math.sin(a) * 60 });
    }
    face.push(...bez([60, -46], [60, -6], [26, 12], 8).slice(1));
    face.push(...bez([26, 12], [8, 24], [0, 26], 4).slice(1));
    face.push(...bez([0, 26], [-8, 24], [-26, 12], 4).slice(1));
    face.push(...bez([-26, 12], [-60, -6], [-60, -46], 8).slice(1));
    shape(face, skin, line, 4);

    // ほっぺ（ピンクのぼかし + 斜線）
    g.fillStyle(0xff8fb1, 0.35);
    g.fillEllipse(-36, -4, 30, 14); g.fillEllipse(36, -4, 30, 14);
    g.lineStyle(2, 0xff6f9c, 0.8);
    [-1, 1].forEach((s) => {
      for (let k = 0; k < 3; k += 1) {
        const bx = s * 36 + (k - 1) * 7;
        g.lineBetween(bx - 2, -1, bx + 3, -8);
      }
    });

    // 左目：大きなキラキラ瞳
    const ex = -25;
    const ey = -24;
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(ex, ey + 2, 34, 38);
    g.fillStyle(0x3b1f6e, 1); g.fillEllipse(ex + 2, ey + 3, 26, 36); // 瞳のふち（濃い紫）
    g.fillStyle(0x7a45d8, 1); g.fillEllipse(ex + 2, ey + 5, 21, 30);
    g.fillStyle(0xb48cff, 1); g.fillEllipse(ex + 2, ey + 11, 17, 16); // 下側を明るく
    g.fillStyle(0xe2d2ff, 1); g.fillEllipse(ex + 2, ey + 15, 11, 7);
    g.fillStyle(0x24103f, 1); g.fillEllipse(ex + 2, ey + 1, 10, 14); // ひとみ
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(ex - 4, ey - 6, 11, 13); // 大きなハイライト
    g.fillCircle(ex + 7, ey + 12, 3); // 小さなハイライト
    g.fillCircle(ex - 3, ey + 14, 1.6);
    g.fillTriangle(ex + 8, ey - 5, ex + 10, ey - 9, ex + 12, ey - 5); // きらっ
    g.fillTriangle(ex + 8, ey - 5, ex + 10, ey - 1, ex + 12, ey - 5);
    // 上まつげ（太いアイライン + はね上がり）
    const lash = bez([ex - 19, ey - 4], [ex - 2, ey - 26], [ex + 19, ey - 10], 10);
    g.lineStyle(6, line, 1); g.strokePoints(lash, false);
    g.fillStyle(line, 1);
    g.fillTriangle(ex - 19, ey - 4, ex - 27, ey - 6, ex - 16, ey - 12);
    g.fillTriangle(ex - 15, ey - 11, ex - 24, ey - 16, ex - 10, ey - 15);
    g.fillTriangle(ex + 19, ey - 10, ex + 24, ey - 6, ex + 15, ey - 13);
    g.lineStyle(2, line, 1);
    g.strokePoints(bez([ex - 10, ey + 20], [ex + 2, ey + 25], [ex + 13, ey + 19], 6), false); // 下まつげ
    g.lineStyle(2.5, hairDark, 1);
    g.strokePoints(bez([ex - 16, ey - 34], [ex - 2, ey - 41], [ex + 13, ey - 35], 6), false); // まゆ

    // 右目：ウインク（にっこり閉じた目 + まつげ）
    const wx = 25;
    const wy = -20;
    g.lineStyle(5, line, 1);
    g.strokePoints(bez([wx - 17, wy - 2], [wx, wy - 16], [wx + 17, wy - 2], 10), false);
    g.lineStyle(3, line, 1);
    g.lineBetween(wx + 15, wy - 4, wx + 23, wy - 9);
    g.lineBetween(wx + 10, wy - 9, wx + 15, wy - 15);
    g.lineStyle(2.5, hairDark, 1);
    g.strokePoints(bez([wx - 13, wy - 38], [wx + 2, wy - 44], [wx + 16, wy - 37], 6), false);

    // 小さな鼻と、あーんと開いた小さな口
    g.lineStyle(2, 0xd99a8c, 1);
    g.lineBetween(1, -6, -1, -2);
    const mouth = [...bez([-9, 6], [0, 9], [9, 6], 6), ...bez([9, 6], [0, 22], [-9, 6], 8).slice(1)];
    shape(mouth, 0xc2405f, line, 2.5);
    g.fillStyle(0xff8fa8, 1); g.fillEllipse(0, 13, 9, 5); // 舌

    // 前髪（とがった毛束を重ねる）+ 顔のよこの触覚
    g.fillStyle(hair, 1);
    g.fillEllipse(0, -96, 128, 46);
    lock(-48, -96, -66, -50, -58, 4, 12); // 顔まわりの長い毛
    lock(48, -96, 66, -50, 58, 4, 12);
    lock(-40, -104, -52, -76, -46, -44, 14);
    lock(-18, -110, -26, -80, -30, -50, 14);
    lock(4, -112, 0, -84, -6, -54, 13);
    lock(22, -110, 26, -82, 18, -50, 14);
    lock(44, -104, 52, -78, 44, -46, 14);
    // ふちどりの外側の髪の線（頭の丸み）
    g.lineStyle(4, line, 1);
    g.beginPath(); g.arc(0, -62, 80, Math.PI * 1.08, Math.PI * 1.92); g.strokePath();
    // 天使の輪（つやのハイライト）
    g.lineStyle(6, hairLight, 0.95);
    g.beginPath(); g.arc(0, -62, 66, Math.PI * 1.2, Math.PI * 1.38); g.strokePath();
    g.beginPath(); g.arc(0, -62, 66, Math.PI * 1.55, Math.PI * 1.78); g.strokePath();
    // アホ毛
    g.lineStyle(4, line, 1);
    const ahoge = bez([4, -140], [30, -170], [10, -184], 8);
    g.strokePoints(ahoge, false);
    g.lineStyle(2, hair, 1);
    g.strokePoints(ahoge, false);

    // ひまわりの髪かざり
    g.fillStyle(0xffcc00, 1);
    g.lineStyle(2, line, 1);
    for (let k = 0; k < 8; k += 1) {
      const a = (Math.PI * 2 * k) / 8;
      g.fillCircle(58 + Math.cos(a) * 10, -104 + Math.sin(a) * 10, 6.5);
    }
    g.fillStyle(0xab5236, 1); g.fillCircle(58, -104, 7); g.strokeCircle(58, -104, 7);

    // ピースサイン（ほっそりした指）
    g.fillStyle(skin, 1);
    g.lineStyle(3, line, 1);
    g.fillRoundedRect(74, -66, 11, 40, 5); g.strokeRoundedRect(74, -66, 11, 40, 5);
    g.fillRoundedRect(89, -62, 11, 38, 5); g.strokeRoundedRect(89, -62, 11, 38, 5);
    g.fillCircle(86, -18, 16); g.strokeCircle(86, -18, 16);
    g.fillEllipse(94, 14, 24, 50); g.strokeEllipse(94, 14, 24, 50);

    // キラキラ
    g.fillStyle(0xffffff, 1);
    [[-118, -140, 10], [124, -118, 8], [-112, 72, 7], [118, 60, 5]].forEach(([sx, sy, r]) => {
      g.fillTriangle(sx - r, sy, sx + r, sy, sx, sy - r * 2.2);
      g.fillTriangle(sx - r, sy, sx + r, sy, sx, sy + r * 2.2);
      g.fillTriangle(sx, sy - r, sx, sy + r, sx - r * 2.2, sy);
      g.fillTriangle(sx, sy - r, sx, sy + r, sx + r * 2.2, sy);
    });
  }

  // 斬撃 1 本（細長い三日月形の光が一瞬で走り、すっと消える）
  slashLine(x, y, angle, length, thick, color, delay = 0) {
    const c = this.add.container(x, y).setDepth(25).setRotation(angle).setVisible(false);
    const g = this.add.graphics();
    const half = length / 2;
    const lens = (w, col, alpha) => {
      g.fillStyle(col, alpha);
      g.beginPath();
      g.moveTo(-half, 0);
      for (let t = 0; t <= 12; t += 1) {
        const px = -half + (length * t) / 12;
        g.lineTo(px, -Math.sin((Math.PI * t) / 12) * w);
      }
      for (let t = 12; t >= 0; t -= 1) {
        const px = -half + (length * t) / 12;
        g.lineTo(px, Math.sin((Math.PI * t) / 12) * w * 0.35);
      }
      g.closePath();
      g.fillPath();
    };
    lens(thick * 1.8, color, 0.55);
    lens(thick, 0xffffff, 1);
    c.add(g);
    c.scaleX = 0;
    this.time.delayedCall(delay, () => {
      c.setVisible(true);
      this.tweens.add({ targets: c, scaleX: 1, duration: 90, ease: 'Cubic.Out' });
      this.tweens.add({
        targets: c, scaleY: 0, alpha: 0, duration: 260, delay: 110, ease: 'Cubic.In',
        onComplete: () => c.destroy(),
      });
    });
  }

  // 必殺技の本体：画面を何度も斬り裂く斬撃で、画面上の敵を全部やっつける
  specialBlast(player) {
    const { width, height } = this.scale;
    const color = PLAYER_COLORS[player.colorIndex];
    this.cameras.main.flash(200, 255, 255, 255);
    this.cameras.main.shake(450, 0.01);
    const diag = Math.hypot(width, height);
    // 画面を横切る大きな斬撃（乱れ斬り → 最後に X 字）
    for (let k = 0; k < 6; k += 1) {
      const angle = Phaser.Math.FloatBetween(-0.9, 0.9) + (k % 2 ? Math.PI / 2 : 0);
      this.slashLine(
        width / 2 + Phaser.Math.Between(-160, 160), height / 2 + Phaser.Math.Between(-120, 120),
        angle, diag * 1.1, 16, color, k * 55,
      );
    }
    [0.6, -0.6].forEach((a, k) => this.slashLine(width / 2, height / 2, a, diag * 1.2, 18, color, 380 + k * 70));
    this.time.delayedCall(380, () => this.cameras.main.flash(120, 255, 255, 255));
    // 敵は 1 体ずつ斬られて、まっぷたつになってはじける
    const targets = this.enemies.slice();
    targets.forEach((e, i) => {
      e.bySpecial = true;
      const delay = Math.min(480, 60 + i * 35);
      this.time.delayedCall(delay, () => {
        if (e.dead) return;
        const angle = Phaser.Math.FloatBetween(0, Math.PI);
        this.slashLine(e.x, e.y, angle, 90, 7, color);
        this.splitEnemy(e, angle);
        this.defeatEnemy(e, player);
      });
    });
    this.time.delayedCall(560, () => { this.cutinActive = false; });
  }

  // 斬られた敵の半分ずつが左右に飛んでいく演出
  splitEnemy(e, angle) {
    const deg = Phaser.Math.RadToDeg(angle);
    [-1, 1].forEach((side) => {
      const start = side < 0 ? deg + 180 : deg;
      const halfArc = this.add.arc(e.x, e.y, ENEMY_RADIUS, start, start + 180, false, ENEMY_COLOR)
        .setStrokeStyle(2, 0x1d1d33).setDepth(9);
      const nx = Math.cos(angle + (Math.PI / 2) * side);
      const ny = Math.sin(angle + (Math.PI / 2) * side);
      this.tweens.add({
        targets: halfArc, x: e.x + nx * 26, y: e.y + ny * 26, angle: side * 25, alpha: 0,
        duration: 420, ease: 'Cubic.Out', onComplete: () => halfArc.destroy(),
      });
    });
  }

  // 体力の表示（右上にハート）と、ダメージ時に画面のふちが赤く光る演出
  createHpUI() {
    // ハートのテクスチャ（白で描いて色はティントで変える）
    if (!this.textures.exists('heart')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(6, 6, 6);
      g.fillCircle(16, 6, 6);
      g.fillTriangle(0.5, 8.5, 21.5, 8.5, 11, 20);
      g.generateTexture('heart', 22, 21);
      g.destroy();
    }
    this.hpTop = this.scoreText.y + 22;
    this.hpRows = [0, 1].map((i) => {
      const y = this.hpTop + 10 + i * HP_ROW_H;
      const label = this.add.text(12, y, '', {
        fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#ffffff',
        stroke: '#0b1030', strokeThickness: 3,
      }).setOrigin(0, 0.5).setDepth(50);
      const hearts = [];
      for (let h = 0; h < PLAYER_MAX_HP; h += 1) {
        hearts.push(this.add.image(92 + h * 25, y, 'heart').setDepth(50));
      }
      return { label, hearts };
    });
    const { width, height } = this.scale;
    // 画面のふちの赤いフラッシュ（ダメージ時に一瞬光る）
    this.damageFlash = this.add.graphics().setDepth(140).setAlpha(0);
    for (let k = 0; k < 6; k += 1) {
      const t = 6 + k * 6;
      this.damageFlash.lineStyle(12, 0xff0033, 0.5 - k * 0.07);
      this.damageFlash.strokeRect(t, t, width - t * 2, height - t * 2);
    }
    this.updateHpUI();
  }

  updateHpUI() {
    if (!this.hpRows) return;
    this.hpRows.forEach((row, i) => {
      const p = this.players[i];
      row.label.setVisible(!!p);
      row.hearts.forEach((h, k) => {
        h.setVisible(!!p);
        if (!p) return;
        const full = k < p.hp;
        h.setTint(full ? 0xff3b5c : 0x3a3f5c);
        h.setAlpha(full ? 1 : 0.7);
      });
      if (p) row.label.setText(this.players.length > 1 ? `${i + 1}P 体力` : '体力');
    });
    // アイテム効果の表示はハートの下に
    if (this.powerText) this.powerText.setY(this.hpTop + this.players.length * HP_ROW_H + 2);
  }

  // 敵に触れたら体力 -1（直後は少し無敵。触れていた敵は押し返す）
  damagePlayer(player, touching, time) {
    if (this.cutinActive || time < player.invincibleUntil) return; // 必殺技の演出中・無敵中はダメージ無し
    player.hp = Math.max(0, player.hp - 1);
    player.invincibleUntil = time + INVINCIBLE_TIME;
    const { x, y } = player.rect;
    // 触れていた敵を押し返す（1 回の接触で 1 ダメージにするため）
    touching.forEach((e) => {
      const a = Math.atan2(e.y - y, e.x - x);
      this.tweens.add({
        targets: e, x: e.x + Math.cos(a) * KNOCKBACK_DIST, y: e.y + Math.sin(a) * KNOCKBACK_DIST,
        duration: 220, ease: 'Quad.Out',
      });
    });
    // 自機：赤く光ってぎゅっと縮む + 「-1」
    const body = player.cute.body;
    const flash = this.add.circle(x, y, 26, 0xff2244, 0.75).setDepth(12);
    this.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 320, onComplete: () => flash.destroy() });
    this.tweens.add({ targets: body, scale: { from: 0.7, to: 1 }, duration: 260, ease: 'Back.Out' });
    const pop = this.add.text(x, y - 28, '-1', {
      fontFamily: 'sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ff4466',
      stroke: '#ffffff', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: pop, y: y - 60, alpha: 0, duration: 700, onComplete: () => pop.destroy() });
    // 画面：ゆれる + ふちが赤く光る
    this.cameras.main.shake(180, 0.008);
    this.damageFlash.setAlpha(1);
    this.tweens.killTweensOf(this.damageFlash);
    this.tweens.add({ targets: this.damageFlash, alpha: 0, duration: 450 });
    // UI：減ったハートが弾けて、残りのハートがぷるっと震える
    this.updateHpUI();
    const row = this.hpRows[player.index];
    const lost = row.hearts[player.hp];
    if (lost) {
      const ghost = this.add.image(lost.x, lost.y, 'heart').setTint(0xff3b5c).setDepth(51);
      this.tweens.add({ targets: ghost, scale: 2.2, alpha: 0, duration: 450, onComplete: () => ghost.destroy() });
    }
    row.hearts.forEach((h) => {
      this.tweens.killTweensOf(h);
      h.setScale(1);
      this.tweens.add({ targets: h, scale: { from: 1.35, to: 1 }, duration: 300, ease: 'Back.Out' });
    });
    this.tweens.add({ targets: row.label, x: { from: row.label.x - 4, to: row.label.x }, duration: 200, ease: 'Bounce.Out' });

    if (player.hp <= 0) {
      player.down = true;
      player.rect.body.setVelocity(0, 0);
      player.cute.container.setAlpha(0.4);
      if (this.players.every((p) => p.down)) this.triggerGameOver();
    }
  }

  // テスト用：全員の体力を満タンに（ダウンしていても復活）
  healAll() {
    this.players.forEach((p) => { p.hp = PLAYER_MAX_HP; p.down = false; });
    this.updateHpUI();
  }

  // 全員の体力が 0 → ゲームオーバー / 時間切れ → TIME UP（R キー / タップ / クリックでリトライ）
  triggerGameOver(timeUp = false) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.physics.pause();
    if (this.testPanel && this.testPanel.visible) this.toggleTestPanel();
    this.releaseBeam();
    this.cameras.main.shake(300, 0.012);
    const { width, height } = this.scale;
    const font = { fontFamily: 'sans-serif', color: '#ffffff' };
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(300).setAlpha(0);
    const title = this.add.text(width / 2, height / 2 - 90, timeUp ? 'TIME UP!' : 'GAME OVER', {
      ...font, fontSize: '64px', fontStyle: 'bold', color: timeUp ? '#7affb0' : '#ff4466', stroke: '#ffffff', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(301).setScale(0.3);
    this.updateTimerUI();
    const scoreLine = this.add.text(width / 2, height / 2 - 20, `SCORE ${this.totalScore()}`, {
      ...font, fontSize: '44px', fontStyle: 'bold', color: '#ffe27a', stroke: '#0b1030', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(301).setAlpha(0);
    const scores = this.players.map((p) => (this.players.length > 1 ? `${p.index + 1}P: ${p.score}` : `${p.score}`));
    const result = this.add.text(width / 2, height / 2 + 35, `たおした敵　${scores.join('　')}`, {
      ...font, fontSize: '22px', color: '#ffe27a',
    }).setOrigin(0.5).setDepth(301).setAlpha(0);
    const retry = this.add.text(width / 2, height / 2 + 80,
      this.isTouch ? 'タップでリトライ' : 'R キー / クリックでリトライ', {
        ...font, fontSize: '20px',
      }).setOrigin(0.5).setDepth(301).setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 400 });
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.Out' });
    this.tweens.add({ targets: [scoreLine, result, retry], alpha: 1, duration: 400, delay: 400 });
    this.tweens.add({ targets: retry, alpha: 0.35, duration: 600, delay: 900, yoyo: true, repeat: -1 });
    // すぐ押しっぱなしの操作でリトライしてしまわないよう、少し待ってから受け付ける
    this.time.delayedCall(800, () => {
      const restart = () => this.scene.restart();
      this.input.keyboard.once('keydown-R', restart);
      shade.setInteractive();
      shade.once('pointerdown', restart);
    });
  }

  updateScoreText() {
    if (!this.scoreText) return;
    const parts = this.players.map((p) => (this.players.length > 1 ? `${p.index + 1}P: ${p.score}` : `${p.score}`));
    this.scoreText.setText(`たおした敵　${parts.join('　')}`);
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

  // プレイヤーごとの移動入力（-1〜1 の向き）
  readMove(player) {
    if (player.index === 0) {
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
      return { vx, vy, dash: player.shiftDown || this.touchDashDown };
    }
    const k = this.p2Keys;
    return {
      vx: (k.L.isDown ? 1 : 0) - (k.J.isDown ? 1 : 0),
      vy: (k.K.isDown ? 1 : 0) - (k.I.isDown ? 1 : 0),
      dash: player.shiftDown,
    };
  }

  update(time, delta) {
    if (this.gameOver) {
      // ゲームオーバー中は背景だけ動かす
      this.updateBackground(delta);
      return;
    }
    if (this.countdownActive) {
      // カウントダウン中はその場で待つ（キャラのアニメと背景だけ動かす）
      this.players.forEach((player) => {
        player.rect.body.setVelocity(0, 0);
        this.updateCuteCharacter(player, 0, 0, time);
      });
      this.updateBackground(delta);
      this.updateSpecialUI(time);
      return;
    }
    // のこり時間（必殺技の演出中は止める）。0 になったら TIME UP
    if (!this.cutinActive) this.timeLeft -= delta;
    this.updateTimerUI();
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.triggerGameOver(true);
      return;
    }
    this.players.forEach((player) => {
      if (player.down) {
        player.rect.body.setVelocity(0, 0);
        this.updateCuteCharacter(player, 0, 0, time);
        return;
      }
      const { vx, vy, dash } = this.readMove(player);
      player.dash = dash;
      const speed = dash ? PLAYER_DASH_SPEED : PLAYER_SPEED;
      const velocity = new Phaser.Math.Vector2(vx, vy).normalize().scale(speed);
      player.rect.body.setVelocity(velocity.x, velocity.y);
      this.updateCuteCharacter(player, vx, vy, time);
      // 動いている向きをビームの向きとして覚えておく
      if (vx !== 0 || vy !== 0) player.aimDir.set(vx, vy).normalize();
    });
    this.updateBeams(time, delta);
    this.updateEnemies(time, delta);
    this.updateSatellites(time);
    this.updateItems(time, delta);
    this.updateBackground(delta);
    this.updateSpecialUI(time);
  }
}
