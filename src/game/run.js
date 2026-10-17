import TUNING from '../data/tuning.js';
import { CLASSES } from '../data/classes.js';
import { createRng } from '../logic/rng.js';
import { rollCards, applyCard, newlyUnlocked, passiveMods } from '../logic/progression.js';
import { SpatialGrid } from '../logic/grid.js';
import { SPAWN, camera, isWater, onBridge, placeDecor, buildGround, buildProps, propVisible, drawProp, drawWorldTop } from './world.js';
import { updatePlayer } from './player.js';
import { createSpawner, spawnerUpdate } from '../logic/spawner.js';
import { updatePickups, drawPickups } from './pickups.js';
import { BOUNDS, spawnEnemy, updateEnemies, updateEnemyShots, sortEnemies, drawEnemy, drawEnemyShots } from './enemies.js';

export function createRun(classId, starterSkillId, seed) {
  const build = { skills: { [starterSkillId]: 1 }, passives: {}, ults: [] };
  return {
    classDef: CLASSES[classId], time: 0, rng: createRng(seed), grid: new SpatialGrid(), spawner: createSpawner(), state: 'playing',
    player: { x: SPAWN.x, y: SPAWN.y, hp: TUNING.player.hp, maxHp: TUNING.player.hp, speed: TUNING.player.speed,
      iframesUntil: 0, facing: 1, moving: false },
    prog: { level: 1, xp: 0 }, build, mods: passiveMods(build), pendingLevelUps: 0, cards: null, newUlts: [],
    skillState: {}, ultState: {}, enemies: [], projectiles: [], areas: [], pickups: [], fx: null, kills: 0, bossDead: false, banner: null,
  };
}

export function updateRun(run, dt, input) {
  if (run.state !== 'playing') return;
  if (run.pendingLevelUps > 0) { run.cards = rollCards(run.build, run.classDef, run.rng); run.state = 'levelup'; return; }
  if (input.pressed('KeyT')) run.time += 60;   // TEMP-DEBUG: jump one minute ahead to see later enemy types
  run.time += dt;
  updatePlayer(run.player, dt, input);
  run.grid.clear();
  for (const e of run.enemies) run.grid.insert(e);
  for (const s of spawnerUpdate(run.spawner, run.time, dt, camera(run.player), BOUNDS, run.rng, run.enemies.length))
    spawnEnemy(run, s.type, s.x, s.y);
  updateEnemies(run, dt);
  updateEnemyShots(run, dt);
  updatePickups(run, dt);
}

// Applies a level-up card; rolls the next one while level-ups are pending, else back to play.
export function chooseCard(run, card) {
  const p = run.player;
  applyCard(run.build, card);
  if (card.kind === 'heal') p.hp = Math.min(p.maxHp, p.hp + TUNING.healCard);
  else if (card.kind === 'passive') applyPassives(run);
  else for (const u of newlyUnlocked(run.build, run.classDef)) { run.build.ults.push(u); run.newUlts.push(u); }
  run.pendingLevelUps--;
  if (run.pendingLevelUps > 0) run.cards = rollCards(run.build, run.classDef, run.rng);
  else { run.cards = null; run.state = 'playing'; }
}

function applyPassives(run) {
  const m = run.mods = passiveMods(run.build), p = run.player, maxHp = TUNING.player.hp + m.maxHp;
  p.hp += maxHp - p.maxHp;                                 // vitality raises current hp by the same amount
  p.maxHp = maxHp;
  p.speed = TUNING.player.speed * m.speed;
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
  drawPickups(ctx, run, assets, cam, t);                   // on the ground, under every actor
  // y-sort: props, enemies and the player by the row their feet stand on
  const feet = p.y + 12;                                     // mage sprite is 26 tall, drawn centred
  const es = sortEnemies(run, assets);
  let drawn = false, ei = 0;
  const wading = isWater(p.x, p.y) && !onBridge(p.x, p.y);
  const drawPlayer = () => {
    const sx = p.x - cam.x, sy = p.y - cam.y;
    if (wading) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cam.w, Math.round(sy) + 8); ctx.clip(); }   // feet under water
    assets.draw(ctx, p.moving ? 'mage_walk' : 'mage_idle', sx, sy, { flip: p.facing < 0, t });
    if (wading) { ctx.restore(); assets.draw(ctx, 'water_wade', sx, sy + 8, { t }); }
  };
  // draws every actor (player, enemies) whose feet are above row y
  const actorsTo = y => {
    for (;;) {
      const ey = ei < es.length ? es[ei].y + es[ei].foot : Infinity, py = drawn ? Infinity : feet;
      if (Math.min(ey, py) >= y) return;
      if (py <= ey) { drawPlayer(); drawn = true; } else drawEnemy(ctx, assets, es[ei++], cam, t, run.time);
    }
  };
  for (const o of w.props) {
    if (!propVisible(o, cam)) continue;
    actorsTo(o.y);
    // a prop in front that covers the player turns see-through, so the forest wall never hides him
    drawProp(ctx, assets, o, cam, drawn && Math.abs(o.x - p.x) < 16 && o.y - feet < 36 ? 0.5 : 1);
  }
  actorsTo(Infinity);
  drawEnemyShots(ctx, run, assets, cam, t);
}
