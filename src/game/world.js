// World layout (pure logic: terrain, decor placement, camera) and its rendering (browser only).
import { createRng } from '../logic/rng.js';
import { VIEW } from '../engine/view.js';
export const WORLD_W = 1920, WORLD_H = 1080;
export const HUT = { x: 960, y: 540 }, SPAWN = { x: 960, y: 572 };
export const RIVER_W = 44, BRIDGE = { y0: 524, y1: 556 };
const EDGE = 64;

export const riverX = y => 1480 + 36 * Math.sin(y / 95);
const inRiver = (x, y, pad = 0) => Math.abs(x - riverX(y)) < RIVER_W / 2 + pad;
export const onBridge = (x, y) => y >= BRIDGE.y0 && y <= BRIDGE.y1 && inRiver(x, y);
export const isWater = (x, y) => inRiver(x, y);
export const terrainSpeed = (x, y) => (isWater(x, y) && !onBridge(x, y) ? 0.45 : 1);

export const clampToWorld = (p, margin = 8) => ({
  x: Math.min(Math.max(p.x, margin), WORLD_W - margin),
  y: Math.min(Math.max(p.y, margin), WORLD_H - margin),
});

export const camera = p => ({
  x: Math.min(Math.max(p.x - VIEW.w / 2, 0), WORLD_W - VIEW.w),
  y: Math.min(Math.max(p.y - VIEW.h / 2, 0), WORLD_H - VIEW.h),
  w: VIEW.w, h: VIEW.h,
});

// Decor: dense tree wall within EDGE px of the world border, sparse scatter inside.
export function placeDecor(rng) {
  const out = [];
  const free = (x, y) =>
    Math.hypot(x - HUT.x, y - HUT.y) >= 80 &&   // hut clearance (test requires 70)
    !inRiver(x, y, 8) &&
    !(x >= 950 && x <= riverX(540) + 12 && y >= 522 && y <= 562); // hut -> bridge path
  for (let gx = 6; gx < WORLD_W; gx += 14)
    for (let gy = 6; gy < WORLD_H; gy += 14) {
      if (Math.min(gx, gy, WORLD_W - gx, WORLD_H - gy) >= EDGE) continue;
      const x = gx + rng.range(-4, 4), y = gy + rng.range(-4, 4);
      if (free(x, y)) out.push({ kind: 'tree', x, y });
    }
  const scatter = { tree: 45, bush: 40, rock: 25, flower: 90 };
  for (const kind in scatter)
    for (let n = 0; n < scatter[kind];) {
      const x = rng.range(EDGE, WORLD_W - EDGE), y = rng.range(EDGE, WORLD_H - EDGE);
      if (free(x, y)) { out.push({ kind, x, y }); n++; }
    }
  return out;
}

// ---- Rendering (browser). Sprite names come from the "world" sheet (art/world.px.js).
const GRASS = '#7fcf5c', LONG_GRASS = '#6ab84d';          // palette "g", "q"
const PATH_AT = { x: 930, y: 520 };                        // top-left of the "path" sprite
const BRIDGE_AT = { x: 1461, y: 549 };                     // centre of the "bridge" sprite (deck y 532..566)
const HUT_BASE = HUT.y + 20;                               // hut stands on this row
const SMOKE_AT = { x: 976, y: 509 };                       // "hut_smoke" centre: bottom puff on the chimney mouth
const BLADE = [0, 2, 1, 3, 0, 1, 0, 2, 2, 0, 1, 0, 3, 1, 0, 0, 2, 1];   // blade-tip heights along a patch's top edge
const TREES = ['tree_1', 'tree_1', 'tree_2', 'tree_2', 'tree_3'];   // oaks and pines, fewer apple trees
// ponytail: module state, one world per page; pass it explicitly if a second map ever exists
let flowers = [];                                          // set by buildGround, swayed by drawWorldTop

const hash = (x, y) => { const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return h - Math.floor(h); };
const variant = (o, n) => 1 + Math.floor(hash(o.x, o.y) * n);
// Draw with the sprite's bottom row on y (props stand on their base).
const drawOnBase = (ctx, assets, name, x, y, opt) => {
  const h = assets.size(name).h;
  assets.draw(ctx, name, x, y - (h - 1) + (h >> 1), opt);
};
const riverRow = y => {
  const a = Math.sin(y / 13) + Math.sin(y / 5.3) * 0.5, b = Math.sin(y / 9.1 + 2);
  return 'river_' + (a > 0.9 ? 2 : a < -0.9 ? 3 : b > 0.85 ? 4 : b < -0.85 ? 5 : 1);
};

// Static ground, painted once: grass, prop shadows, path, river, bridge, and every flat detail.
export function buildGround(assets, decor) {
  const cv = document.createElement('canvas'); cv.width = WORLD_W; cv.height = WORLD_H;
  const g = cv.getContext('2d');
  g.fillStyle = GRASS; g.fillRect(0, 0, WORLD_W, WORLD_H);
  // Long-grass clumps: clusters of flat ellipses, denser where the ground is damp (near the river),
  // none where people walk (around the hut). The top edge of each clump is fringed with blade tips.
  const patch = new Uint8Array(WORLD_W * WORLD_H), prng = createRng(77);
  for (let n = 0; n < 520; n++) {
    const cx = prng.range(0, WORLD_W), cy = prng.range(0, WORLD_H);
    const damp = Math.abs(cx - riverX(cy)) < 220;
    if (Math.hypot(cx - HUT.x, cy - HUT.y) < 130 || (!damp && prng.next() < 0.3)) continue;
    for (let k = prng.int(2, 5); k > 0; k--) {
      const ex = cx + prng.range(-26, 26), ey = cy + prng.range(-8, 8), rx = prng.range(9, 26), ry = rx * prng.range(0.35, 0.5);
      for (let y = Math.max(0, Math.ceil(ey - ry)); y <= Math.min(WORLD_H - 1, ey + ry); y++) {
        const half = rx * Math.sqrt(1 - ((y - ey) / ry) ** 2);
        for (let x = Math.max(0, Math.round(ex - half)); x <= Math.min(WORLD_W - 1, Math.round(ex + half)); x++) patch[y * WORLD_W + x] = 1;
      }
    }
  }
  g.fillStyle = LONG_GRASS;
  for (let y = 0; y < WORLD_H; y++)
    for (let x = 0; x < WORLD_W; x++) {
      if (!patch[y * WORLD_W + x]) continue;
      let len = 1;
      while (x + len < WORLD_W && patch[y * WORLD_W + x + len]) len++;
      g.fillRect(x, y, len, 1);
      if (y > 3) for (let i = x; i < x + len; i++)
        if (!patch[(y - 1) * WORLD_W + i]) g.fillRect(i, y - BLADE[i % BLADE.length], 1, BLADE[i % BLADE.length]);
      x += len;
    }
  for (const o of decor) {
    if (o.kind === 'tree') assets.draw(g, 'shadow_tree', o.x + 2, o.y);
    if (o.kind === 'bush') assets.draw(g, 'shadow_bush', o.x + 1, o.y);
  }
  assets.draw(g, 'shadow_hut', HUT.x + 4, HUT_BASE - 1);
  const p = assets.size('path');
  assets.draw(g, 'path', PATH_AT.x + (p.w >> 1), PATH_AT.y + (p.h >> 1));
  for (let y = 0; y < WORLD_H; y++) assets.draw(g, riverRow(y), riverX(y), y);

  // Flat detail goes only on grass (pixel check), so nothing lands on sand, water or the bridge.
  const px = g.getImageData(0, 0, WORLD_W, WORLD_H).data;
  const onGrass = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return false;
    const i = (y * WORLD_W + x) * 4;
    return px[i + 1] > 150 && px[i + 2] < 120;               // grass greens, not sand/water
  };
  const isLong = (x, y) => px[(Math.round(y) * WORLD_W + Math.round(x)) * 4] < 120;   // long grass or shade
  const rng = createRng(4242);
  const put = (name, x, y) => {
    if (onGrass(x, y)) drawOnBase(g, assets, name.startsWith('grass') && isLong(x, y) ? name.replace('grass', 'tall') : name, x, y);
  };
  // reeds and lily pads where the water is calm, near the banks; rocks mark where the river leaves
  for (let y = 8; y < WORLD_H; y += rng.int(14, 30)) {
    if (y > BRIDGE.y0 - 12 && y < BRIDGE.y1 + 20) continue;
    const side = rng.next() < 0.5 ? -1 : 1, x = riverX(y) + side * rng.range(23, 26);
    drawOnBase(g, assets, 'reed', Math.round(x), y, { flip: side > 0 });
    if (rng.next() < 0.4) drawOnBase(g, assets, 'lily', Math.round(riverX(y) + side * rng.range(10, 16)), y + rng.int(4, 10));
  }
  for (const y of [14, 30, 52, 1030, 1050, 1068])
    for (const side of [-1, 1]) drawOnBase(g, assets, rng.pick(['rock_1', 'rock_2']), Math.round(riverX(y) + side * rng.range(30, 34)), y);
  // tufts: grass grows thick around the bases of things nobody walks over
  for (const o of decor) {
    if (o.kind === 'flower') continue;
    if (o.kind === 'rock') drawOnBase(g, assets, 'rock_' + variant(o, 2), Math.round(o.x), Math.round(o.y));
    for (let k = 0; k < 2; k++) put('grass_' + rng.int(1, 3), o.x + rng.range(-9, 9), o.y + rng.range(0, 4));
  }
  // meadow: sparse tufts, daisies in small patches
  for (let n = 0; n < 900; n++) put('grass_' + rng.int(1, 3), rng.range(0, WORLD_W), rng.range(0, WORLD_H));
  for (let n = 0; n < 70; n++) {
    const cx = rng.range(64, WORLD_W - 64), cy = rng.range(64, WORLD_H - 64);
    for (let k = rng.int(3, 6); k > 0; k--) put('daisy', cx + rng.range(-10, 10), cy + rng.range(-6, 6));
  }
  // woodcutter's corner by the hut
  drawOnBase(g, assets, 'woodpile', HUT.x - 34, HUT_BASE - 2);
  drawOnBase(g, assets, 'stump_axe', HUT.x - 46, HUT_BASE + 18);
  for (const [dx, dy] of [[-150, -60], [130, -95], [-110, 120], [190, 70], [-250, 30], [60, 150]]) put('stump', HUT.x + dx, HUT.y + dy);
  for (let y = BRIDGE_AT.y + 23; y < BRIDGE_AT.y + 26; y++) assets.draw(g, 'river_shade', riverX(y), y);   // bridge's shade on the water
  assets.draw(g, 'bridge', BRIDGE_AT.x, BRIDGE_AT.y);
  flowers = decor.filter(o => o.kind === 'flower').map(o => ({ name: 'flower_' + variant(o, 3), x: Math.round(o.x), y: Math.round(o.y), t0: hash(o.y, o.x) * 4000 }));
  return cv;
}

// Tall things, y-sorted by base row: trees, bushes and the hut. Drawn per frame with the actors.
export function buildProps(decor) {
  const props = decor.filter(o => o.kind === 'tree' || o.kind === 'bush').map(o => ({
    name: o.kind === 'tree' ? TREES[variant(o, TREES.length) - 1] : 'bush_' + variant(o, 2), x: Math.round(o.x), y: Math.round(o.y), flip: hash(o.y, o.x) < 0.5,
  }));
  props.push({ name: 'hut', x: HUT.x, y: HUT_BASE, flip: false });
  return props.sort((a, b) => a.y - b.y);
}
export const propVisible = (o, cam) => o.x > cam.x - 24 && o.x < cam.x + cam.w + 24 && o.y > cam.y - 2 && o.y < cam.y + cam.h + 44;
export const drawProp = (ctx, assets, o, cam, alpha = 1) => drawOnBase(ctx, assets, o.name, o.x - cam.x, o.y - cam.y, { flip: o.flip, alpha });

// Live layer over the ground (under props and actors): swaying flowers, river glints, chimney smoke.
export function drawWorldTop(ctx, assets, cam, t) {
  for (const f of flowers)
    if (f.x > cam.x - 8 && f.x < cam.x + cam.w + 8 && f.y > cam.y - 2 && f.y < cam.y + cam.h + 10)
      drawOnBase(ctx, assets, f.name, f.x - cam.x, f.y - cam.y, { t: t + f.t0 });
  if (cam.x + cam.w > 1420 && cam.x < 1540) {
    const gap = 18, drift = t * 0.012;                      // ripples ride the current south
    for (let k = 0; k < WORLD_H / gap; k++) {
      const y = (k * gap + drift) % WORLD_H;
      if (y < cam.y - 4 || y > cam.y + cam.h + 4 || (y > BRIDGE.y0 + 2 && y < BRIDGE.y1 + 16)) continue;
      assets.draw(ctx, 'water_shimmer', riverX(y) + (hash(k, 7) - 0.5) * 30 - cam.x, y - cam.y, { t: t + hash(7, k) * 1000 });
    }
  }
  if (Math.abs(SMOKE_AT.x - cam.x - cam.w / 2) < cam.w && Math.abs(SMOKE_AT.y - cam.y - cam.h / 2) < cam.h)
    assets.draw(ctx, 'hut_smoke', SMOKE_AT.x - cam.x, SMOKE_AT.y - cam.y, { t });
}
