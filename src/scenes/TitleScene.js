import Phaser from 'phaser';

export const GAME_TITLE = 'ppl.io';

// タイトル画面：ゲーム名「ppl.io」と START ボタン。押すと MainScene（カウントダウン → 開始）へ
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const { width, height } = this.scale;
    this.starting = false;

    // 背景：紺 → むらさきのグラデーション + またたく星（コードで描画）
    const g = this.add.graphics();
    g.fillGradientStyle(0x060818, 0x060818, 0x3a1d5c, 0x3a1d5c, 1);
    g.fillRect(0, 0, width, height);
    this.stars = [];
    for (let i = 0; i < 90; i += 1) {
      const s = this.add.circle(
        Phaser.Math.Between(0, width), Phaser.Math.Between(0, height),
        Phaser.Math.FloatBetween(0.6, 2), 0xffffff, Phaser.Math.FloatBetween(0.3, 1),
      );
      s.speed = Phaser.Math.FloatBetween(6, 30);
      this.tweens.add({
        targets: s, alpha: 0.15, duration: Phaser.Math.Between(600, 1800), yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 1500),
      });
      this.stars.push(s);
    }

    // ゲーム名
    const title = this.add.text(width / 2, height / 2 - 90, GAME_TITLE, {
      fontFamily: 'sans-serif', fontSize: '96px', fontStyle: 'bold', color: '#ffe27a',
      stroke: '#ff77a8', strokeThickness: 10,
    }).setOrigin(0.5).setShadow(0, 6, '#000000', 8, true, true);
    this.tweens.add({ targets: title, y: title.y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.text(width / 2, height / 2 - 10, '15 秒でどれだけ敵をたおせるか！', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff',
    }).setOrigin(0.5);

    // START ボタン
    const btn = this.add.rectangle(width / 2, height / 2 + 90, 240, 72, 0xff77a8)
      .setStrokeStyle(4, 0xffffff).setInteractive({ useHandCursor: true });
    const label = this.add.text(width / 2, height / 2 + 90, 'START', {
      fontFamily: 'sans-serif', fontSize: '36px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#7a2050', strokeThickness: 5,
    }).setOrigin(0.5);
    this.tweens.add({ targets: [btn, label], scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    btn.on('pointerover', () => btn.setFillStyle(0xff99c0));
    btn.on('pointerout', () => btn.setFillStyle(0xff77a8));
    btn.on('pointerdown', () => this.startGame());

    this.add.text(width / 2, height / 2 + 150, 'クリック / タップ、または Enter キーでスタート', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#c8d0ff',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
  }

  // 画面を切り替えて MainScene を始める
  startGame() {
    if (this.starting) return;
    this.starting = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('MainScene');
    });
  }

  update(time, delta) {
    const { width } = this.scale;
    this.stars.forEach((s) => {
      s.x -= (s.speed * delta) / 1000;
      if (s.x < -2) s.x = width + 2;
    });
  }
}
