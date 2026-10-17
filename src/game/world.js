// World layout: pure logic (terrain, decor placement, camera). Drawing lives elsewhere.
export const WORLD_W = 1920, WORLD_H = 1080;
export const HUT = { x: 960, y: 540 }, SPAWN = { x: 960, y: 572 };
export const RIVER_W = 44, BRIDGE = { y0: 524, y1: 556 };
const VIEW_W = 480, VIEW_H = 270, EDGE = 64;

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
  x: Math.min(Math.max(p.x - VIEW_W / 2, 0), WORLD_W - VIEW_W),
  y: Math.min(Math.max(p.y - VIEW_H / 2, 0), WORLD_H - VIEW_H),
  w: VIEW_W, h: VIEW_H,
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
