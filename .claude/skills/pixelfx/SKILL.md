---
name: pixelfx
description: Make pixel art effects and sprite animations in code with the pixelfx library, which has 244 ready-made ones, acted out by a character who winds up, freezes on contact and recovers (fire, explosions, water, ice, lightning, sci-fi, melee, impacts, projectiles, spawn and death, arcane, holy, shadow, status, nature, weather, UI, pickups, transitions, critters) to drop into a game, recolor, export as sprite sheets or remix, plus a draft, render, look, refine loop that makes new ones look hand-animated. Use when someone wants pixel art VFX, sprite animations or sprite sheets, game juice, a specific effect ("a frost nova for my mage", "a coin pickup sparkle"), wants to use or export a pixelfx effect in Godot, Unity, Phaser or a canvas game, or wants their pixel effects to look better.
license: MIT
compatibility: Node 18 or newer. ffmpeg is optional (GIF and MP4 previews).
---

<!--
  Adapted from https://github.com/patch-gg/pixelfx/blob/5294518ce7c72e48b6100a744596e0acf57f2826/skills/pixelfx/SKILL.md
  (MIT License, see vendor/pixelfx/LICENSE). Changes for this project: uses the vendored copy in vendor/pixelfx,
  adds the Phaser usage via src/fx/PixelFxLayer.js, and removes the "Publish it on Patch" section
  (publishing to outside services is not allowed by this project's CLAUDE.md).
-->

# pixelfx

Pixel art effects as code. Each effect is one file, `src/fx/<category>/<name>.js`, that draws into two buffers:
**color** (pixels: opaque, dithered or truly translucent) and **light** (additive glow). No images, so an effect
can be played live, recolored, mirrored, reseeded and rendered to a sprite sheet for any engine.

The method is Hugo Duprez's ([How to make (good) pixel art effects with
Claude](https://www.spritefusion.com/blog/how-to-make-good-pixel-art-effects-with-claude)): code is clay, trust
your eyes, feed your references. One-shot prompts make mediocre effects. Drafts you render, look at and refine
make good ones.

## Before anything (this project)

This project vendors pixelfx at `vendor/pixelfx` (see `vendor/pixelfx/VENDORED.md`). Do not clone it again and do
not add it as an npm dependency.

1. Run every pixelfx tool from that folder: `cd vendor/pixelfx`, then `node tools/...`. No install step: the tools use
   only Node. Their output goes to `vendor/pixelfx/records/`, which is git-ignored: never commit it.
2. Check it runs: `node tools/render.mjs fire/torch` writes `records/fire/torch/contact.png`. Open that PNG with
   your image-reading tool. That contact sheet is how you see every effect from now on.
3. The project's `CLAUDE.md` rules win over anything in this skill.

## 1. Look for an existing effect first

`node tools/list.mjs <words>` searches ids, names, tags and descriptions (`node tools/list.mjs frost`,
`node tools/list.mjs slash loop`). `docs/CATALOG.md` lists everything by category. Render the candidates and
look at them before choosing. Most requests are an existing effect with different options:

- `palette`: the main ramp, dark to bright, as hex strings. Any `PAL` ramp in `src/core/color.js` (fire ember
  lava smoke dust ice water electric volt poison holy heal arcane shadow blood earth stone gold leaf wood metal
  bone neon cyber matrix candy night) or your own. A blue fire is `{"palette": PAL.ice}`.
- `seed` for a different but equivalent take; `flip` to face left; `angle` to rotate; `light` (0..1+) for glow
  strength; plus each effect's own knobs in its `meta.options` (size, count, radius, text, height...).
- Try options without editing code: `node tools/render.mjs fire/torch --opts '{"palette":["#102","#215","#43a","#8cf","#fff"]}'`.

## 2. Put it in the game

**In this project (Phaser 3):** use `src/fx/PixelFxLayer.js`, which already draws pixelfx effects over the game at
half resolution (one effect pixel = 2 game pixels). `MainScene` creates it as `this.pfx`.

```js
import * as frostNova from 'pixelfx/fx/ice/frost-nova';          // vite alias -> vendor/pixelfx/src/fx/ice/frost-nova.js
import { PIXEL_SCALE, rampFrom } from '../fx/PixelFxLayer.js';

this.pfx.play(frostNova, x, y);                                  // x, y = the effect's origin (usually the feet), in game coords
this.pfx.play(burst, x, y + 30 * PIXEL_SCALE, { palette: rampFrom(0xff004d) });  // shift by the effect's own offset; recolor
const loop = this.pfx.play(torch, x, y); loop.stop();            // loops run until stop()
```

Import only the effects you use (each one is bundled separately). Effects with an `actor` draw the stock character;
in this game prefer effects without one, or read their `act` timing for our own characters. Record every effect you
add in `GAME.md` (where and when it plays). The generic notes below still apply.


**Canvas or WebGL games in JS or TS** (plain canvas, Phaser, PixiJS, Kaplay, three.js): use the code directly. It
has no dependencies; copy `src/core` and the effect files you need, or depend on the repo.

```js
import { createFrame, clearFrame, createFx, composite } from "pixelfx";   // src/core/index.js
import * as frostNova from "pixelfx/fx/ice/frost-nova";                   // src/fx/ice/frost-nova.js

const frame = createFrame(320, 180);            // the game's pixel resolution; ox, oy scroll it with the camera
const img = new ImageData(320, 180);
const fx = createFx(frostNova, { x: hero.x, y: hero.y, flip: hero.facing < 0 });

// every tick
fx.update(dt);
clearFrame(frame);
fx.draw(frame, "back");    // what goes behind characters
drawCharacters();          // your own sprites, or draw them into frame.color yourself
fx.draw(frame, "front");
composite(frame, img.data, background);   // color over the background plus light; or null for transparent
ctx.putImageData(img, 0, 0);              // then scale the canvas up with image-rendering: pixelated
if (fx.done()) removeIt();               // one-shots end on their own; fx.stop() fades a loop out
```

Several effects can share one frame. In a WebGL engine, upload the composited RGBA to a texture each frame, or
render the effect to a sprite sheet once (below) and play it like any other animation.

**Any engine** (Godot, Unity, GameMaker, Defold, LÖVE, Bevy, Construct): export sprite sheets.
`node tools/render.mjs ice/frost-nova --sheet` writes `records/ice/frost-nova/frost-nova.png` (transparent
frames in a grid) and `frost-nova.json` (Aseprite-style frames, so Phaser's atlas loader, Godot and Unity Aseprite
importers and most tools read it; `meta.pixelfx` has fps, loop, frame size, columns and the pivot). Set the
pivot to `meta.pixelfx.pivot` (the effect's origin, e.g. the feet), import with nearest-neighbour filtering and no
compression, and play at `meta.pixelfx.fps`. Glow is baked into the sheet as color with alpha, which reads as
additive over dark scenes; for bright scenes, render a recolored version or keep the effect on a dark layer.

For the full library: `node tools/render.mjs <category> --sheet` does a whole category.

**A hit needs a body behind it.** An effect alone looks like a sticker. Effects with a character carry an `act`: when the body winds
up, when to freeze, how the target reacts. Use it whichever way the game is built:

- With the stock character: `createAct(slash, { x, y })` instead of `createFx`. `act.update(dt)`, `act.draw(frame)`, and throw the
  picture by `act.shake`. It holds still by itself during a freeze. `node tools/act.mjs <id> --sheet` bakes the lot into a sprite sheet.
- With the game's own character: read the timing, `slash.act` or `meta.pixelfx.act` in a sheet's JSON (`windup`, `recovery`, `hits`
  with `t` and `freeze`). Play the character's attack animation `windup` seconds before the effect, and at each hit stop updating
  everything, effect and characters both, for `freeze` seconds. Host-side hit-stop works on any effect, with or without an act.

`src/fx/moves/` has whole attacks chained from the effects, wind-up to recovery: start there when someone asks for a move, not an effect.

## 3. Make a new one

Read `docs/AUTHORING.md` first: it is the contract (meta, `draw(p, t, o)` for pure effects or `create(o)` for
simulated ones, local coordinates, seamless loops, ending empty), the toolkit, the painter API and the quality bar.
Then:

1. **Say it in one line** with art direction: what it is, how it moves, its palette, its timing. "A frost nova:
   crystals erupt in a ring from the feet outward, a white flash at the center, shards spin off, the floor stays
   frosted and fades."
2. **Find references** in the library: `node tools/list.mjs <words>`, then read the two or three closest effect
   files and borrow their techniques (`Particles` and `Bits` in `src/core/sim.js` for sparks, smoke and debris,
   `p.disc` for translucent volumes, `cycle` for seamless particles, `tileFbm` scrolls for flames and water). Look at
   the closest of [Hugo Duprez's effects](https://www.spritefusion.com/pixel-art-vfx) too: they are the quality bar.
   If his has more detail, light or life at the same size on screen, yours isn't done.
3. **Draft.** `node tools/new.mjs <category>/<name>` (add `--loop` for a loop) gives a working file. When the
   direction is open, write 3 to 5 genuinely different drafts (`<name>-a.js` .. `-e.js`), render them all
   (`node tools/render.mjs "<category>/<name>-*"`) and look at every contact sheet before choosing. Show the user
   the strongest two or three if they're around (`--gif` makes animations to share).
4. **Look, judge, fix.** Render, open `records/<id>/contact.png`, and judge like a picky pixel artist. Fix the
   worst thing, render again. Three rounds minimum; a showpiece takes more. `--all` shows every frame,
   `--mp4` shows motion at full speed.
5. **Act it out** if a character is involved: add `export const act` (see "Acts" in `docs/AUTHORING.md`), with a wind-up before t = 0,
   a pose change on the release frame, a freeze on contact and a recovery. `node tools/act.mjs <id>` shows consecutive 12 fps steps:
   judge motion from those and from `--mp4`, not from a contact sheet's samples.
6. **Check.** `node tools/check.mjs <id>` catches drawing outside the canvas, one-shots that don't end empty,
   loop seams, unseeded randomness and slow frames, and in an act: keys out of order, unknown pose fields and hands
   that teleport. Fix until it passes clean. Delete the drafts you didn't keep.

What to look for, and the usual fix:

| you see | fix |
|---|---|
| it reads as mush at 1x | fewer colors, a clear silhouette, one focal point, bigger shapes |
| speckle: lone noise pixels inside shapes | threshold noise less, quantize with `at()`, no noise on small shapes |
| floaty, no punch | fast in, slow out (`ease.outQuart`/`outExpo`), a 1 to 2 frame white hero frame, shorter total time |
| stiff or mechanical | vary every particle (size, speed, delay, life), add secondary motion (sparks, smoke, debris) |
| washed out | less glow (k 0.2 to 0.5), darker edge steps, keep white for the hottest core only |
| flat | light from one side: brighter top-left, darker bottom-right step; a darker ramp step at the base |
| smooth gradients, vector look | hard ramp steps in color; softness only in light and in translucent smoke |
| a checkerboard where smoke should be | `SMOKE`, `VAPOUR` or `DUST` particles, or `p.disc`: truly translucent, lit on top |
| seam when a loop wraps | `cycle`, `loopNoise(phase)`, whole-cell `tileNoise` scrolls, `sin(phase * TAU * n)` |
| a one-shot that pops off | let it shrink, dither out or fall away before t = duration |
| a great effect on a dead character | give it an act: wind-up, release pose, freeze on contact, a target that reacts, recovery |
| the act feels weightless | a wind-up the opposite way to the blow, a longer freeze (up to 0.2 s), a bigger silhouette change, shake |
| the hit lands out of sync | move the hit key to the effect's own constant, not to a time you eyeballed |
| he holds the weapon badly | keep a bend in the elbow, shafts in front of the chest; on a swing the blade lags the hand; arms reach about 15 px and don't stretch, so step the body in |
| his arms cross or the pose looks flat | he faces three-quarters towards us: for open arms the near hand goes left (`fx < 0`), far hand right, with `turn: 1`; `yaw` really turns him |

Directional effects face right, ground effects stand on y = 0, actor effects wrap `o.actor` (a 24 x 38 stock
character's mask and pixels), and nothing uses `Math.random`. Generic motifs are fine; never recreate a specific game's
sprites, characters or logos.

## 4. Native code instead of JS

If the game can't run JS and a sprite sheet isn't enough (an effect that follows a moving target, or needs
per-instance colors at runtime), port the effect. Pure effects are a function of time; simulated ones step the particles in
`src/core/sim.js`. Keep the two-buffer idea, the 4x4 Bayer threshold for dithered alpha and the palette ramp lookups.
Render the JS original and your port side by side to check they match.
