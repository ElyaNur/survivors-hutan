import TUNING from '../data/tuning.js';
import { CLASSES } from '../data/classes.js';
import { createRng } from '../logic/rng.js';
import { SpatialGrid } from '../logic/grid.js';
import { SPAWN, camera, isWater, onBridge, placeDecor, buildGround, buildProps, propVisible, drawProp, drawWorldTop } from './world.js';
import { updatePlayer } from './player.js';

export function createRun(classId, starterSkillId, seed) {
  return {
    classDef: CLASSES[classId], time: 0, rng: createRng(seed), grid: new SpatialGrid(), state: 'playing',
    player: { x: SPAWN.x, y: SPAWN.y, hp: TUNING.player.hp, maxHp: TUNING.player.hp, speed: TUNING.player.speed,
      iframesUntil: 0, facing: 1, moving: false },
    prog: { level: 1, xp: 0 }, build: { skills: { [starterSkillId]: 1 }, passives: {}, ults: [] }, pendingLevelUps: 0,
    skillState: {}, ultState: {}, enemies: [], projectiles: [], areas: [], pickups: [], fx: null, kills: 0, bossDead: false,
  };
}

export function updateRun(run, dt, input) {
  if (run.state !== 'playing') return;
  run.time += dt;
  updatePlayer(run.player, dt, input);
  run.grid.clear();
  for (const e of run.enemies) run.grid.insert(e);
}

// The map is the same every run (fixed seed), so it is built once per page, on first draw.
const WORLD_SEED = 1;
let world = null;
function getWorld(assets) {
  if (!world) { const decor = placeDecor(createRng(WORLD_SEED)); world = { ground: buildGround(assets, decor), props: buildProps(decor) }; }
  return world;
}

export function drawRun(ctx, run, assets) {
  const c = camera(run.player), cam = { ...c, x: Math.round(c.x), y: Math.round(c.y) }, p = run.player, t = performance.now();
  const w = getWorld(assets);
  ctx.drawImage(w.ground, cam.x, cam.y, cam.w, cam.h, 0, 0, cam.w, cam.h);
  drawWorldTop(ctx, assets, cam, t);
  // y-sort: props whose base is above the player's feet go behind, the rest in front
  const feet = p.y + 12;                                     // mage sprite is 26 tall, drawn centred
  let drawn = false;
  const wading = isWater(p.x, p.y) && !onBridge(p.x, p.y);
  const drawPlayer = () => {
    const sx = p.x - cam.x, sy = p.y - cam.y;
    if (wading) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cam.w, Math.round(sy) + 8); ctx.clip(); }   // feet under water
    assets.draw(ctx, p.moving ? 'mage_walk' : 'mage_idle', sx, sy, { flip: p.facing < 0, t });
    if (wading) { ctx.restore(); assets.draw(ctx, 'water_wade', sx, sy + 8, { t }); }
  };
  for (const o of w.props) {
    if (!propVisible(o, cam)) continue;
    if (!drawn && o.y > feet) { drawPlayer(); drawn = true; }
    // a prop in front that covers the player turns see-through, so the forest wall never hides him
    drawProp(ctx, assets, o, cam, drawn && Math.abs(o.x - p.x) < 16 && o.y - feet < 36 ? 0.5 : 1);
  }
  if (!drawn) drawPlayer();
}
