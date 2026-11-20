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

    // 背景：青空 + 流れる雲 + 緑の丘（地上。コードで描画）
    const g = this.add.graphics();
    g.fillGradientStyle(0x6ec6ff, 0x6ec6ff, 0xc9eeff, 0xc9eeff, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(680, 90, 34); // おひさま
    g.fillStyle(0xfff3a0, 1);
    g.fillCircle(680, 90, 28);
    g.fillStyle(0x8fd96c, 1);
    g.fillEllipse(170, height + 40, 620, 330);
    g.fillEllipse(640, height + 60, 700, 360);
    g.fillStyle(0x74c35a, 1);
    g.fillEllipse(400, height + 120, 1000, 330);
    // 草原の花
    const flowerColors = [0xffffff, 0xff9ebb, 0xffe14d];
    for (let i = 0; i < 40; i += 1) {
      const fx = Phaser.Math.Between(10, width - 10);
      const fy = Phaser.Math.Between(height - 110, height - 10);
      g.fillStyle(flowerColors[i % 3], 1);
      g.fillCircle(fx, fy, 3);
    }
    this.clouds = [];
    for (let i = 0; i < 6; i += 1) {
      const cx = Phaser.Math.Between(0, width);
      const cy = Phaser.Math.Between(30, 260);
      const s = Phaser.Math.FloatBetween(0.6, 1.2);
      const parts = [[-30, 6, 26], [0, -6, 32], [30, 6, 24], [0, 10, 28]].map(([dx, dy, r]) => this.add.circle(dx, dy, r, 0xffffff, 0.9));
      const cloud = this.add.container(cx, cy, parts).setScale(s);
      cloud.speed = Phaser.Math.FloatBetween(8, 24);
      this.clouds.push(cloud);
    }

    // ゲーム名
    const title = this.add.text(width / 2, height / 2 - 120, GAME_TITLE, {
      fontFamily: 'sans-serif', fontSize: '96px', fontStyle: 'bold', color: '#ffe27a',
      stroke: '#ff77a8', strokeThickness: 10,
    }).setOrigin(0.5).setShadow(0, 6, '#2e5a2a', 8, true, true);
    this.tweens.add({ targets: title, y: title.y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.text(width / 2, height / 2 - 40, 'モードをえらんでね！', {
      fontFamily: 'sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff', stroke: '#2e5a2a', strokeThickness: 5,
    }).setOrigin(0.5);

    // モードのボタン（15 秒モード / 時間無制限モード）
    const makeButton = (y, label, sub, color, hover, onPress) => {
      const btn = this.add.rectangle(width / 2, y, 300, 66, color)
        .setStrokeStyle(4, 0xffffff).setInteractive({ useHandCursor: true });
      const text = this.add.text(width / 2, y - 8, label, {
        fontFamily: 'sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#ffffff',
        stroke: '#33203a', strokeThickness: 5,
      }).setOrigin(0.5);
      const subText = this.add.text(width / 2, y + 20, sub, {
        fontFamily: 'sans-serif', fontSize: '13px', color: '#ffffff', stroke: '#33203a', strokeThickness: 3,
      }).setOrigin(0.5);
      this.tweens.add({ targets: [btn, text, subText], scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      btn.on('pointerover', () => btn.setFillStyle(hover));
      btn.on('pointerout', () => btn.setFillStyle(color));
      btn.on('pointerdown', onPress);
    };
    makeButton(height / 2 + 40, 'START（15 秒）', '15 秒でどれだけ敵をたおせるか！', 0xff77a8, 0xff99c0,
      () => this.startGame(false));
    makeButton(height / 2 + 125, '時間無制限', '時間切れなし・体力がなくなるまで遊べる', 0x3fae5a, 0x5cc977,
      () => this.startGame(true));

    this.add.text(width / 2, height - 30, 'クリック / タップでえらぶ　Enter: 15 秒モード　M: 時間無制限モード', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff', stroke: '#2e5a2a', strokeThickness: 4,
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ENTER', () => this.startGame(false));
    this.input.keyboard.on('keydown-M', () => this.startGame(true));
  }

  // 画面を切り替えて MainScene を始める（endless = true で時間無制限モード）
  startGame(endless) {
    if (this.starting) return;
    this.starting = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('MainScene', { endless });
    });
  }

  update(time, delta) {
    const { width } = this.scale;
    this.clouds.forEach((c) => {
      c.x += (c.speed * delta) / 1000;
      if (c.x > width + 80) c.x = -80;
    });
  }
}
