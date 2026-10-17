import TUNING from '../data/tuning.js';
import { CLASSES } from '../data/classes.js';
import { createRng } from '../logic/rng.js';
import { rollCards, applyCard, newlyUnlocked, passiveMods } from '../logic/progression.js';
import { SpatialGrid } from '../logic/grid.js';
import { SPAWN, camera, isWater, onBridge, placeDecor, buildGround, buildProps, propVisible, drawProp, drawWorldTop } from './world.js';
import { updatePlayer, blinkHidden } from './player.js';
import { createFx } from './fx.js';
import { createSpawner, spawnerUpdate } from '../logic/spawner.js';
import { updatePickups, drawPickups } from './pickups.js';
import { BOUNDS, spawnEnemy, updateEnemies, sortEnemies, drawEnemy, drawTelegraphs, winBlast } from './enemies.js';
import { updateProjectiles, drawAreas, drawProjectiles } from './projectiles.js';
import { SKILLS } from './skills/index.js';
import { ULTS } from './skills/ultimates.js';

export function createRun(classId, starterSkillId, seed, assets) {
  const build = { skills: { [starterSkillId]: 1 }, passives: {}, ults: [] };
  return {
    classDef: CLASSES[classId], time: 0, rng: createRng(seed), grid: new SpatialGrid(), spawner: createSpawner(), state: 'playing',
    player: { x: SPAWN.x, y: SPAWN.y, hp: TUNING.player.hp, maxHp: TUNING.player.hp, speed: TUNING.player.speed,
      iframesUntil: 0, facing: 1, moving: false },
    prog: { level: 1, xp: 0 }, build, mods: passiveMods(build), pendingLevelUps: 0, cards: null, newUlts: [],
    skillState: {}, ultState: {}, enemies: [], projectiles: [], areas: [], pickups: [], fx: createFx(assets), numTokens: TUNING.fx.numberBudget.burst, numAt: 0, kills: 0, bossDead: false, banner: null,
    levelUpAt: 0, boss: null,
    ending: null, endAt: null, endT: 0, endFx: 0, endX: 0, endY: 0,   // 'won' | 'lost': run.time it ended, s since; win fireworks
  };
}

const END_BEAT = 0.3, END_BEATS = 5;                       // win fireworks: one blast every beat, this many

export function updateRun(run, dt, input) {
  if (run.state !== 'playing') return;
  if (!run.ending && run.player.hp <= 0) {                 // he falls: before any level-up card can open
    run.ending = 'lost'; run.endAt = run.time; run.endT = 0; run.fx.update(dt); return;
  }
  if (run.ending) {                                        // wall-clock (hitstop doesn't stretch it)
    run.endT += dt;
    if (run.endT >= TUNING.endDelay[run.ending]) { run.state = run.ending; return; }
    if (run.ending === 'lost') { run.fx.update(dt); return; }   // the world holds still while he falls
    for (; run.endFx < END_BEATS && run.endT >= (run.endFx + 1) * END_BEAT; run.endFx++) winBlast(run, run.endX, run.endY);
  } else if (run.pendingLevelUps > 0 && run.time >= run.levelUpAt) {
    run.cards = rollCards(run.build, run.classDef, run.rng); run.state = 'levelup'; return;
  }
  const wasFrozen = run.fx.frozen();                       // hitstop: the world holds still, fx keep counting down
  run.fx.update(dt);
  if (wasFrozen) return;
  run.time += dt;
  updatePlayer(run.player, dt, input);
  run.grid.clear();
  for (const e of run.enemies) run.grid.insert(e);
  if (!run.ending) for (const s of spawnerUpdate(run.spawner, run.time, dt, camera(run.player), BOUNDS, run.rng, run.enemies.length))
    spawnEnemy(run, s.type, s.x, s.y);
  updateEnemies(run, dt);
  const sk = run.build.skills;
  for (const id in sk) SKILLS[id].update(run, run.skillState[id] ??= {}, sk[id], run.mods, dt);
  for (const id of run.build.ults) ULTS[id].update(run, run.ultState[id] ??= {}, 0, run.mods, dt);   // fresh state fires at once
  updateProjectiles(run, dt);
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

const OUTLINE_ALPHA = 0.8, OVERLAP_X = 6, OVERLAP_Y = 10;   // mage outline strength; an enemy within r + this (px) of him counts as overlapping
const HURT_T = 0.2;                                          // s: mage_hurt shows this long after a landed hit
// The map is the same every run (fixed seed), so it is built once per page, on first draw.
const WORLD_SEED = 1;
let world = null;
function getWorld(assets) {
  if (!world) { const decor = placeDecor(createRng(WORLD_SEED)); world = { ground: buildGround(assets, decor), props: buildProps(decor) }; }
  return world;
}

export function drawRun(ctx, run, assets) {
  const c = camera(run.player), shake = run.fx.offset(), p = run.player, t = performance.now();
  const cam = { ...c, x: Math.round(c.x + shake.x), y: Math.round(c.y + shake.y) };   // shake moves the world, never the HUD
  const w = getWorld(assets);
  ctx.drawImage(w.ground, cam.x, cam.y, cam.w, cam.h, 0, 0, cam.w, cam.h);
  drawWorldTop(ctx, assets, cam, t);
  drawPickups(ctx, run, assets, cam, t);                   // on the ground, under every actor
  drawAreas(ctx, run, assets, cam);
  drawTelegraphs(ctx, run, cam);
  // y-sort: props, enemies and the player by the row their feet stand on
  const feet = p.y + 12;                                     // mage sprite is 26 tall, drawn centred
  const es = sortEnemies(run, assets);
  let drawn = false, ei = 0;
  const wading = isWater(p.x, p.y) && !onBridge(p.x, p.y);
  const dying = run.ending === 'lost';
  const hidden = !dying && blinkHidden(p, run.time);         // iframes: blink (not while he falls)
  const hurt = run.time < p.iframesUntil - TUNING.player.iframes + HURT_T;
  const pose = dying ? 'mage_death' : hurt ? 'mage_hurt' : p.moving ? 'mage_walk' : 'mage_idle';
  const pt = dying ? Math.min(run.endT * 1000, assets.animTotal('mage_death') - 1) : t;   // death plays once and holds
  let covered = false;                                       // an enemy was drawn over the mage
  const drawPlayer = (ox = 0, oy = 0, outline = false) => {
    if (hidden) return;
    const sx = p.x - cam.x + ox, sy = p.y - cam.y + oy;
    if (wading) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cam.w, Math.round(sy) + 8); ctx.clip(); }   // feet under water
    assets.draw(ctx, pose, sx, sy, { flip: p.facing < 0, t: pt, flash: outline, alpha: outline ? OUTLINE_ALPHA : 1 });
    if (wading) { ctx.restore(); if (!outline) assets.draw(ctx, 'water_wade', sx, sy + 8, { t }); }
  };
  // draws every actor (player, enemies) whose feet are above row y
  const actorsTo = y => {
    for (;;) {
      const ey = ei < es.length ? es[ei].y + es[ei].foot : Infinity, py = drawn ? Infinity : feet;
      if (Math.min(ey, py) >= y) return;
      if (py <= ey) { drawPlayer(); drawn = true; }
      else {
        const e = es[ei++];
        if (drawn && Math.abs(e.x - p.x) < e.r + OVERLAP_X && Math.abs(e.y - p.y) < e.r + OVERLAP_Y) covered = true;   // sized: a 64 px treant counts too
        drawEnemy(ctx, assets, e, cam, t, run.time);
      }
    }
  };
  for (const o of w.props) {
    if (!propVisible(o, cam)) continue;
    actorsTo(o.y);
    // a prop in front that covers the player turns see-through, so the forest wall never hides him
    drawProp(ctx, assets, o, cam, drawn && Math.abs(o.x - p.x) < 16 && o.y - feet < 36 ? 0.5 : 1);
  }
  actorsTo(Infinity);
  const sk = run.build.skills;
  for (const id in sk) SKILLS[id].draw?.(ctx, run, run.skillState[id] ??= {}, sk[id], assets, cam);
  for (const id of run.build.ults) ULTS[id].draw(ctx, run, run.ultState[id] ??= {}, 0, assets, cam);   // skies, rocks, cloud: still under the mage
  drawProjectiles(ctx, run, assets, cam, t);
  // Above every actor, below the HUD. The mage is drawn again over spells and blasts (only numbers and the hurt
  // flash go over him): the player's anchor never drowns. Crowd over him: a 1px light outline first.
  run.fx.draw(ctx, cam, assets, () => {
    if (covered) { drawPlayer(-1, 0, true); drawPlayer(1, 0, true); drawPlayer(0, -1, true); drawPlayer(0, 1, true); }
    drawPlayer();
  });
}
