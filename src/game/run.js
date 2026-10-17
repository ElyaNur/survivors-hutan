import TUNING from '../data/tuning.js';
import { CLASSES } from '../data/classes.js';
import { createRng } from '../logic/rng.js';
import { SpatialGrid } from '../logic/grid.js';
import { SPAWN, camera } from './world.js';
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

export function drawRun(ctx, run, assets) {
  const cam = camera(run.player), p = run.player;
  ctx.fillStyle = '#4a7a3a'; ctx.fillRect(0, 0, cam.w, cam.h);   // placeholder until ground art exists
  assets.draw(ctx, p.moving ? 'mage_walk' : 'mage_idle', p.x - cam.x, p.y - cam.y, { flip: p.facing < 0, t: performance.now() });
}
