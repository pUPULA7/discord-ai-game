import Phaser from 'phaser';
import { createFrame, clearFrame, createFx, composite } from 'pixelfx';

// pixelfx（vendor/pixelfx）のエフェクトを Phaser の画面に重ねて描くレイヤー。
//
//   this.pfx = new PixelFxLayer(this);                       // create() で 1 回
//   import * as burst from 'pixelfx/fx/pickups/collect-burst';
//   this.pfx.play(burst, x, y, { palette: rampFrom(0xff004d) }); // ゲーム座標で再生
//
// - エフェクトは 1/SCALE の解像度（ドット絵）で描き、SCALE 倍に拡大して表示する
// - x, y はエフェクトの「原点」（多くは足元・地面）。ゲーム座標（800 × 600）で渡す
// - 再生が終わった one-shot は自動で消える。ループするエフェクトは返り値の stop() で止める
// - 毎フレームの更新はシーンの update イベントで自動。シーン終了時に片付ける
export const PIXEL_SCALE = 2;

let layerCount = 0;

export class PixelFxLayer {
  constructor(scene, { depth = 13, scale = PIXEL_SCALE } = {}) {
    this.scene = scene;
    this.scale = scale;
    this.w = Math.ceil(scene.scale.width / scale);
    this.h = Math.ceil(scene.scale.height / scale);
    this.frame = createFrame(this.w, this.h);
    this.effects = [];
    this.dirty = false;

    this.key = `pixelfx-layer-${layerCount++}`;
    this.texture = scene.textures.createCanvas(this.key, this.w, this.h);
    this.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.ctx = this.texture.getContext();
    this.imageData = this.ctx.createImageData(this.w, this.h);
    this.image = scene.add.image(0, 0, this.key).setOrigin(0).setScale(scale).setDepth(depth);

    this.onUpdate = (_time, delta) => this.update(delta / 1000);
    scene.events.on('update', this.onUpdate);
    scene.events.once('shutdown', () => this.destroy());
  }

  // エフェクトを再生する。返り値の stop() でループを止められる（0.3 秒でフェードアウト）
  play(mod, x, y, opts = {}) {
    const fx = createFx(mod, { ...opts, x: Math.round(x / this.scale), y: Math.round(y / this.scale) });
    const entry = { fx, behind: !!opts.behind };
    this.effects.push(entry);
    return { stop: () => fx.stop(), get done() { return fx.done(); } };
  }

  update(dt) {
    if (this.effects.length === 0) {
      // 何も再生していないときは描き直さない（最後に 1 回だけ消す）
      if (this.dirty) this.render();
      return;
    }
    this.effects.forEach((e) => e.fx.update(dt));
    this.effects = this.effects.filter((e) => !e.fx.done());
    this.render();
  }

  render() {
    clearFrame(this.frame);
    for (const layer of ['back', 'front']) this.effects.forEach((e) => e.fx.draw(this.frame, layer));
    composite(this.frame, this.imageData.data, null); // 背景は透明のまま
    this.ctx.putImageData(this.imageData, 0, 0);
    this.texture.refresh();
    this.dirty = this.effects.length > 0;
  }

  destroy() {
    this.scene.events.off('update', this.onUpdate);
    this.effects = [];
    this.image.destroy();
    this.scene.textures.remove(this.key);
  }
}

// 0xRRGGBB の色から、暗い → その色 → 白 のパレット（pixelfx の palette オプション用）を作る
export function rampFrom(color) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const mix = (t, to) => {
    const r = Math.round(c.red + (to.red - c.red) * t);
    const g = Math.round(c.green + (to.green - c.green) * t);
    const b = Math.round(c.blue + (to.blue - c.blue) * t);
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  const black = { red: 8, green: 4, blue: 20 };
  const white = { red: 255, green: 255, blue: 255 };
  return [mix(0.85, black), mix(0.65, black), mix(0.4, black), mix(0, black), mix(0.35, white), mix(0.7, white), '#ffffff'];
}
