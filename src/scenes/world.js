// 地上のマップ（3 × 3 のエリア）。各エリアの背景はコードで Canvas に描く
//
// - 画面 1 枚 = 1 エリア（800 × 600）。プレイヤーが画面の端から出ると、となりのエリアへ移動する
// - となりがある方向には土の道が続いていて、端に矢印が出る。マップの外側の端は木の柵（砂浜は海）
// - 背景は 1 回描いたらテクスチャ（`area-<x>-<y>`）として使い回す

export const WORLD_COLS = 3;
export const WORLD_ROWS = 3;
export const START_AREA = { x: 1, y: 1 };

// AREAS[y][x]
export const AREAS = [
  [
    { name: 'きのこの森', ground: '#4e8f3f', dark: '#3f7a33', light: '#5ea24c', deco: 'forest' },
    { name: 'お花畑', ground: '#7ccb5b', dark: '#69b54c', light: '#8fd96c', deco: 'flowers' },
    { name: 'ごつごつ岩山', ground: '#9fae6a', dark: '#8a9858', light: '#b2bf7c', deco: 'rocks' },
  ],
  [
    { name: 'しずかな湖', ground: '#6cbf58', dark: '#5aa94a', light: '#7fd06a', deco: 'pond' },
    { name: 'はじまりの草原', ground: '#74c35a', dark: '#63ad4c', light: '#86d26b', deco: 'meadow' },
    { name: 'ひだまりの丘', ground: '#8ccf5e', dark: '#79ba50', light: '#9edd70', deco: 'hill' },
  ],
  [
    { name: 'さらさら砂浜', ground: '#ead39a', dark: '#dcc185', light: '#f5e3b2', deco: 'beach' },
    { name: 'ひまわり畑', ground: '#7fc457', dark: '#6cae49', light: '#92d469', deco: 'sunflower' },
    { name: 'こもれびの林', ground: '#5fa84a', dark: '#4f923d', light: '#70b95a', deco: 'woods' },
  ],
];

export function areaAt(x, y) {
  if (x < 0 || y < 0 || x >= WORLD_COLS || y >= WORLD_ROWS) return null;
  return AREAS[y][x];
}

export function areaTextureKey(x, y) {
  return `area-${x}-${y}`;
}

// 決まった並びの乱数（エリアごとに毎回同じ見た目にする）
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PATH_W = 76; // 道の幅

// エリアの背景テクスチャを作る（まだ無ければ）。キーを返す
export function ensureAreaTexture(scene, ax, ay) {
  const key = areaTextureKey(ax, ay);
  if (scene.textures.exists(key)) return key;
  const { width: w, height: h } = scene.scale;
  const tex = scene.textures.createCanvas(key, w, h);
  drawArea(tex.getContext(), ax, ay, w, h);
  tex.refresh();
  return key;
}

function drawArea(ctx, ax, ay, w, h) {
  const area = AREAS[ay][ax];
  const rnd = seeded((ax + 1) * 7919 + (ay + 1) * 104729);
  const R = (a, b) => a + rnd() * (b - a);
  const cx = w / 2;
  const cy = h / 2;
  const n = {
    left: !!areaAt(ax - 1, ay), right: !!areaAt(ax + 1, ay),
    up: !!areaAt(ax, ay - 1), down: !!areaAt(ax, ay + 1),
  };
  const sandy = area.deco === 'beach';

  // 地面 + 色むら
  ctx.fillStyle = area.ground;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = rnd() < 0.5 ? area.dark : area.light;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(R(0, w), R(0, h), R(30, 90), R(14, 40), R(0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 道（となりのエリアへ続く方向だけ。中央の広場から伸びる）
  const pathColor = sandy ? '#d9bd7e' : '#c9a66b';
  const pathEdge = sandy ? '#c8a96a' : '#a8844f';
  const rects = [];
  if (n.left) rects.push([0, cy - PATH_W / 2, cx, PATH_W]);
  if (n.right) rects.push([cx, cy - PATH_W / 2, w - cx, PATH_W]);
  if (n.up) rects.push([cx - PATH_W / 2, 0, PATH_W, cy]);
  if (n.down) rects.push([cx - PATH_W / 2, cy, PATH_W, h - cy]);
  const onPath = (x, y, pad = 0) => rects.some(([rx, ry, rw, rh]) => x > rx - pad && x < rx + rw + pad
    && y > ry - pad && y < ry + rh + pad) || Math.hypot(x - cx, y - cy) < 70 + pad;
  ctx.fillStyle = pathEdge;
  rects.forEach(([x, y, rw, rh]) => ctx.fillRect(x - 4, y - 4, rw + 8, rh + 8));
  ctx.beginPath(); ctx.arc(cx, cy, 74, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = pathColor;
  rects.forEach(([x, y, rw, rh]) => ctx.fillRect(x, y, rw, rh));
  ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.fill();
  // 道の小石
  ctx.fillStyle = 'rgba(120, 90, 50, 0.35)';
  for (let i = 0; i < 70; i += 1) {
    const x = R(0, w); const y = R(0, h);
    if (onPath(x, y, -6)) { ctx.beginPath(); ctx.arc(x, y, R(1.5, 3), 0, Math.PI * 2); ctx.fill(); }
  }

  // 草むら（ちょんちょん）
  if (!sandy) {
    ctx.strokeStyle = area.dark;
    ctx.lineWidth = 2;
    for (let i = 0; i < 160; i += 1) {
      const x = R(0, w); const y = R(0, h);
      if (onPath(x, y, 6)) continue;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 5); ctx.lineTo(x, y + 2); ctx.lineTo(x + 4, y - 5);
      ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 2);
      ctx.stroke();
    }
  }

  // デコレーション（道の上には置かない）
  const place = (count, pad, fn) => {
    let tries = 0;
    let made = 0;
    while (made < count && tries < count * 20) {
      tries += 1;
      const x = R(20, w - 20); const y = R(20, h - 20);
      if (onPath(x, y, pad)) continue;
      fn(x, y);
      made += 1;
    }
  };
  const flower = (x, y, color, s = 1) => {
    ctx.fillStyle = color;
    for (let k = 0; k < 5; k += 1) {
      const a = (Math.PI * 2 * k) / 5;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * 3.2 * s, y + Math.sin(a) * 3.2 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath(); ctx.arc(x, y, 2 * s, 0, Math.PI * 2); ctx.fill();
  };
  const tree = (x, y, s = 1, leaf = '#2f7a35', leaf2 = '#3f9443') => {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(x, y + 26 * s, 30 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(x - 6 * s, y, 12 * s, 26 * s);
    ctx.fillStyle = leaf;
    [[0, -14, 26], [-16, -2, 18], [16, -2, 18], [0, 2, 20]].forEach(([dx, dy, r]) => {
      ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = leaf2;
    ctx.beginPath(); ctx.arc(x - 6 * s, y - 20 * s, 12 * s, 0, Math.PI * 2); ctx.fill();
  };
  const bush = (x, y) => {
    ctx.fillStyle = area.dark;
    [[-10, 0, 11], [10, 0, 11], [0, -6, 13]].forEach(([dx, dy, r]) => {
      ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(x - 3, y - 10, 5, 0, Math.PI * 2); ctx.fill();
  };
  const rock = (x, y, s = 1) => {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x, y + 9 * s, 20 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8d8a80';
    ctx.beginPath();
    ctx.moveTo(x - 18 * s, y + 8 * s); ctx.lineTo(x - 12 * s, y - 8 * s); ctx.lineTo(x + 2 * s, y - 14 * s);
    ctx.lineTo(x + 16 * s, y - 4 * s); ctx.lineTo(x + 18 * s, y + 8 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b3b0a6';
    ctx.beginPath();
    ctx.moveTo(x - 10 * s, y - 6 * s); ctx.lineTo(x + 2 * s, y - 12 * s); ctx.lineTo(x + 6 * s, y - 2 * s); ctx.closePath(); ctx.fill();
  };
  const mushroom = (x, y) => {
    ctx.fillStyle = '#f3e6c8';
    ctx.fillRect(x - 3, y - 2, 6, 9);
    ctx.fillStyle = '#e8453c';
    ctx.beginPath(); ctx.arc(x, y - 2, 9, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffffff';
    [[-4, -6], [3, -8], [5, -4]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.6, 0, Math.PI * 2); ctx.fill(); });
  };
  const sunflower = (x, y) => {
    ctx.strokeStyle = '#3f8a2e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 22); ctx.stroke();
    ctx.fillStyle = '#4f9a38';
    ctx.beginPath(); ctx.ellipse(x + 6, y + 14, 6, 3, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd21f';
    for (let k = 0; k < 10; k += 1) {
      const a = (Math.PI * 2 * k) / 10;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 5, 2.6, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#7a4a1e';
    ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill();
  };

  switch (area.deco) {
    case 'meadow':
      place(10, 40, bush);
      place(40, 10, (x, y) => flower(x, y, ['#ffffff', '#ffb3d1', '#fff27a'][Math.floor(rnd() * 3)], 0.8));
      break;
    case 'flowers':
      place(160, 8, (x, y) => flower(x, y, ['#ff77a8', '#ffffff', '#ffb000', '#b98cff', '#ff5c5c', '#7ad7ff'][Math.floor(rnd() * 6)], R(0.8, 1.3)));
      place(5, 40, bush);
      break;
    case 'forest':
      place(14, 60, (x, y) => tree(x, y, R(0.9, 1.3), '#25632c', '#307a37'));
      place(26, 14, mushroom);
      break;
    case 'woods':
      place(10, 60, (x, y) => tree(x, y, R(0.8, 1.15)));
      ctx.fillStyle = 'rgba(255, 245, 190, 0.18)'; // こもれび
      for (let i = 0; i < 12; i += 1) { ctx.beginPath(); ctx.ellipse(R(0, w), R(0, h), R(20, 50), R(10, 24), 0, 0, Math.PI * 2); ctx.fill(); }
      place(40, 6, (x, y) => { ctx.fillStyle = ['#d98c2e', '#c45a2a', '#e8b53a'][Math.floor(rnd() * 3)]; ctx.beginPath(); ctx.ellipse(x, y, 4, 2, R(0, 3), 0, Math.PI * 2); ctx.fill(); });
      break;
    case 'rocks':
      place(16, 40, (x, y) => rock(x, y, R(0.7, 1.6)));
      place(30, 6, (x, y) => { ctx.fillStyle = '#7c7a70'; ctx.beginPath(); ctx.arc(x, y, R(2, 4), 0, Math.PI * 2); ctx.fill(); });
      break;
    case 'hill':
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let i = 0; i < 6; i += 1) { ctx.beginPath(); ctx.ellipse(R(0, w), R(0, h), R(90, 160), R(40, 70), 0, 0, Math.PI * 2); ctx.fill(); }
      place(8, 40, bush);
      place(6, 40, (x, y) => rock(x, y, 0.6));
      place(30, 10, (x, y) => flower(x, y, '#fff27a', 0.7));
      break;
    case 'sunflower':
      place(60, 18, sunflower);
      break;
    case 'pond': {
      // 左側に池（端の柵側）
      const px = 190; const py = 170;
      ctx.fillStyle = '#4a9fd8';
      ctx.beginPath(); ctx.ellipse(px, py, 140, 85, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6ec0f0';
      ctx.beginPath(); ctx.ellipse(px - 10, py - 8, 112, 62, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i += 1) { ctx.beginPath(); ctx.ellipse(px + R(-70, 70), py + R(-35, 35), R(10, 22), 3, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#3f9a45';
      for (let i = 0; i < 5; i += 1) { ctx.beginPath(); ctx.arc(px + R(-80, 80), py + R(-40, 40), 7, 0.3, Math.PI * 2 - 0.3); ctx.fill(); }
      ctx.strokeStyle = '#3b7a2a'; ctx.lineWidth = 2;
      for (let i = 0; i < 14; i += 1) {
        const a = R(0, Math.PI * 2); const x = px + Math.cos(a) * 140; const y = py + Math.sin(a) * 85;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + R(-3, 3), y - R(12, 22)); ctx.stroke();
      }
      place(8, 40, bush);
      break;
    }
    case 'beach':
      place(18, 10, (x, y) => { ctx.fillStyle = ['#ffd1dc', '#fff4e0', '#ffc28a'][Math.floor(rnd() * 3)]; ctx.beginPath(); ctx.arc(x, y, 4, Math.PI, 0); ctx.fill(); });
      place(4, 50, (x, y) => rock(x, y, 0.8));
      break;
    default:
      break;
  }

  // マップの外側の端：柵（砂浜の下と左は海）
  const fence = (x1, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.floor(len / 40);
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 4;
    [-4, 4].forEach((off) => {
      const horizontal = y1 === y2;
      ctx.beginPath();
      ctx.moveTo(x1 + (horizontal ? 0 : off), y1 + (horizontal ? off : 0));
      ctx.lineTo(x2 + (horizontal ? 0 : off), y2 + (horizontal ? off : 0));
      ctx.stroke();
    });
    ctx.fillStyle = '#a8703a';
    for (let i = 0; i <= steps; i += 1) {
      const x = x1 + ((x2 - x1) * i) / steps; const y = y1 + ((y2 - y1) * i) / steps;
      ctx.fillRect(x - 4, y - 9, 8, 18);
    }
  };
  const sea = (side) => {
    ctx.fillStyle = '#3aa0e0';
    if (side === 'down') ctx.fillRect(0, h - 26, w, 26);
    if (side === 'left') ctx.fillRect(0, 0, 26, h);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 30; i += 1) {
      if (side === 'down') ctx.fillRect(i * 28, h - 28 + Math.sin(i) * 2, 16, 3);
      if (side === 'left') ctx.fillRect(24 + Math.sin(i) * 2, i * 22, 3, 12);
    }
  };
  [['left', [6, 0, 6, h]], ['right', [w - 6, 0, w - 6, h]], ['up', [0, 6, w, 6]], ['down', [0, h - 6, w, h - 6]]]
    .forEach(([side, line]) => {
      if (n[side]) return;
      if (sandy && (side === 'down' || side === 'left')) sea(side);
      else fence(...line);
    });

  // となりのエリアがある方向の端に矢印
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  const arrow = (x, y, dx, dy) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * 14, y + dy * 14);
    ctx.lineTo(x - dy * 14 - dx * 6, y + dx * 14 - dy * 6);
    ctx.lineTo(x + dy * 14 - dx * 6, y - dx * 14 - dy * 6);
    ctx.closePath();
    ctx.fill();
  };
  if (n.left) arrow(22, cy, -1, 0);
  if (n.right) arrow(w - 22, cy, 1, 0);
  if (n.up) arrow(cx, 22, 0, -1);
  if (n.down) arrow(cx, h - 22, 0, 1);
}
