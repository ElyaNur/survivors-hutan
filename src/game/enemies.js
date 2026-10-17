// Enemies: spawning, behaviours (chase / bat / wolf / witch), separation, contact damage, deaths, drawing.
import TUNING from '../data/tuning.js';
import { SCHEDULE } from '../data/spawns.js';
import { offscreenPoint } from '../logic/spawner.js';
import { hitEnemy, hurtPlayer, knockback, speedFactor } from '../logic/combat.js';
import { WORLD_W, WORLD_H, terrainSpeed, camera } from './world.js';
import { dropGem, dropHeart, dropMagnet } from './pickups.js';
import { spawnProjectile } from './projectiles.js';

export const BOUNDS = { w: WORLD_W, h: WORLD_H };
const BOSSES = new Set(SCHEDULE.bosses.map(b => b.type));
const ANIM = {};                                            // type -> walk anim name, built once (no per-frame strings)
for (const k in TUNING.enemies) ANIM[k] = k + '_walk';
ANIM.bat = 'bat_fly'; ANIM.wolf = 'wolf_run';
const FOOT = {};                                            // type -> px from sprite centre to its feet (y-sort)
const PUSH = 0.5;                                           // separation: share of an overlap resolved per frame
const BODY_OVERLAP = 0.9;                                   // enemies may sink this deep (share of r sum) into the mage
const WITCH_DEADBAND = 8;                                   // px around keepDist where the witch stands still
const CAST_LEAD = 0.4;                                      // s: witch_cast (4 frames @10fps) plays before the shot
const ORB = { x: 4, y: -3 };                                // staff orb offset from the witch's centre (sprite px)
const FX = TUNING.fx;
const SLOW_ALPHA = 0.7, FROST_ALPHA = 0.45;   // fx_frozen strength when slowed; white frost wash when frozen
const near = [];                                            // reused grid query buffer
const SHATTER = [['#ffffff', 3, 90], ['#a6f6ff', 5, 70], ['#3ccfe0', 3, 50]];   // ice burst on a shatter: [palette w/c/C, count, speed]

export function spawnEnemy(run, type, x, y) {
  const def = TUNING.enemies[type];
  const hp = BOSSES.has(type) ? def.hp : Math.round(def.hp * (1 + TUNING.enemyHpGrowthPerMin * Math.floor(run.time / 60)));
  const e = {
    type, def, x, y, hp, maxHp: hp, r: def.size / 2, dead: false, facing: 1, phase: run.rng.next() * Math.PI * 2,
    flashUntil: 0, frozenUntil: 0, slowUntil: 0, slowAmt: 0, vulnerableUntil: 0,
    dirX: 0, dirY: 0, aimAt: 0,                              // wolf: locked heading, next re-aim time
    shotAt: run.time + (def.shotEvery ?? 0), inRange: false, // witch
    foot: 0,                                                 // set by sortEnemies
  };
  run.enemies.push(e);
  return e;
}

// The one door for hurting an enemy (skills, auras, ults all call this): flash, shove, number, and the kill itself.
// opts: { fromX, fromY } shove source (default: the player), { power } shove px, { color } number colour (default by size of hit).
export function damageEnemy(run, e, dmg, { fromX = run.player.x, fromY = run.player.y, power = FX.knockback, color } = {}) {
  if (e.dead) return null;
  const hit = hitEnemy(e, dmg, run.time), fx = run.fx, big = hit.dealt >= FX.bigHit, nb = FX.numberBudget;
  run.numTokens = Math.min(nb.burst, run.numTokens + (run.time - run.numAt) * nb.rate); run.numAt = run.time;
  if (big || run.numTokens >= 1) {                         // small hits share a budget: mass hits don't bury the screen
    if (!big) run.numTokens--;
    fx.number(e.x + (Math.random() - 0.5) * 8, e.y - e.r - 6, hit.dealt, color ?? (big ? 'y' : 'w'));
  }
  if (hit.killed) killEnemy(run, e);
  else if (power) knockback(e, fromX, fromY, power);
  return hit;
}

// Kill bookkeeping, done at the moment of death; updateEnemies only sweeps the corpses out afterwards.
function killEnemy(run, e) {
  const fx = run.fx, boss = BOSSES.has(e.type);
  if (!boss) {                                              // bosses drop chests (Task 12)
    dropGem(run, e.x, e.y, e.def.xp);
    if (run.rng.next() < TUNING.drops.heartChance) dropHeart(run, e.x + 4, e.y);
    if (run.rng.next() < TUNING.drops.magnetChance) dropMagnet(run, e.x - 4, e.y);
  } else fx.hitstop(FX.hitstopBig);
  run.kills++;
  if (run.time < e.vulnerableUntil) {                       // died on Absolute Zero's ice: it shatters
    fx.anim(e.x, e.y, 'fx_shatter');
    for (const [c, n, sp] of SHATTER) fx.burst(e.x, e.y, c, n, sp);
    return;
  }
  fx.anim(e.x, e.y, 'fx_poof');
  fx.burst(e.x, e.y, FX.deathColor[e.type] ?? FX.deathColor.default, FX.deathBurst.count, FX.deathBurst.speed);
}

// Contact and shots hurt the mage through here so a landed hit flashes the screen red.
export function hurtMage(run, dmg) {
  if (!hurtPlayer(run.player, dmg, run.time)) return;
  run.fx.flashScreen(FX.flashHurt.color, FX.flashHurt.dur);
  run.fx.shake(FX.shakeHurt.px, FX.shakeHurt.dur);
}

function fire(run, e, def) {
  const p = run.player, x = e.x + ORB.x * e.facing, y = e.y + ORB.y;
  const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
  spawnProjectile(run, { x, y, vx: dx / d * def.shotSpeed, vy: dy / d * def.shotSpeed, dmg: def.shotDmg,
    radius: def.shotSize / 2, life: def.shotLife, sprite: 'witchShot_fly', hostile: true, glow: 'hex' });
}

export function updateEnemies(run, dt) {
  const p = run.player, now = run.time, es = run.enemies, pr = TUNING.player.size / 2;
  let view = null;
  for (const e of es) {
    if (e.dead) continue;
    const def = e.def, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (d > TUNING.enemyCullDist) {                         // fell far behind: bring it back into play
      const q = offscreenPoint(view ??= camera(p), BOUNDS, run.rng);
      e.x = q.x; e.y = q.y; e.aimAt = 0;
      continue;
    }
    const ux = dx / d, uy = dy / d, sf = speedFactor(e, now);
    let mx = ux, my = uy;
    if (e.type === 'bat') {                                 // weave across the heading
      const w = Math.sin(now * def.wobbleRate + e.phase) * def.wobble;
      mx = ux - uy * w; my = uy + ux * w;
    } else if (e.type === 'wolf') {                         // straight line at where the player was
      if (now >= e.aimAt) { e.dirX = ux; e.dirY = uy; e.aimAt = now + def.reaim; }
      mx = e.dirX; my = e.dirY;
    } else if (e.type === 'witch') {                        // hold range, shoot
      const k = d > def.keepDist + WITCH_DEADBAND ? 1 : d < def.keepDist - WITCH_DEADBAND ? -1 : 0;
      mx = ux * k; my = uy * k;
      e.facing = ux < 0 ? -1 : 1;
      e.inRange = d < def.shotRange;
      if (!e.inRange || sf === 0) e.shotAt = Math.max(e.shotAt, now + CAST_LEAD);   // re-entering range: wind up first
      else if (now >= e.shotAt) { fire(run, e, def); e.shotAt = now + def.shotEvery; }
    }
    const v = def.speed * sf * (e.type === 'bat' ? 1 : terrainSpeed(e.x, e.y)) * dt;   // bats fly over water
    e.x = Math.min(Math.max(e.x + mx * v, 0), WORLD_W);
    e.y = Math.min(Math.max(e.y + my * v, 0), WORLD_H);
    if (e.type !== 'witch' && mx) e.facing = mx < 0 ? -1 : 1;

    // Separation: push overlapping pairs apart, the smaller one more. The bigger of a pair always finds
    // the other (query radius 2r >= r + r_other), so bosses plough through crowds.
    near.length = 0;
    run.grid.query(e.x, e.y, e.r * 2, near);
    for (const o of near) {
      if (o === e || o.dead) continue;
      const ox = e.x - o.x, oy = e.y - o.y, min = e.r + o.r, dd = ox * ox + oy * oy;
      if (dd >= min * min) continue;
      if (dd < 0.01) { e.x += Math.cos(e.phase); e.y += Math.sin(e.phase); continue; }   // exact stack: split
      const dist = Math.sqrt(dd), k = (min - dist) / dist * PUSH * 0.5;
      const we = o.r * o.r / (e.r * e.r + o.r * o.r);       // e's share of the push
      e.x += ox * k * we; e.y += oy * k * we;
      o.x -= ox * k * (1 - we); o.y -= oy * k * (1 - we);
    }
    const touch = e.r + pr;
    if (d < touch) {                                        // contact: hurt, and keep the mage visible in the crowd
      hurtMage(run, def.dmg);
      const ex = e.x - p.x, ey = e.y - p.y, de = Math.hypot(ex, ey) || 1, keep = touch * BODY_OVERLAP;
      if (de < keep) { e.x = p.x + ex / de * keep; e.y = p.y + ey / de * keep; }
    }
  }
  for (let i = es.length - 1; i >= 0; i--)                  // sweep corpses: swap-remove, order doesn't matter
    if (es[i].dead) { es[i] = es[es.length - 1]; es.pop(); }
}

// ---- Drawing (browser)
const footY = e => e.y + e.foot;
const byFoot = (a, b) => footY(a) - footY(b);

// Sorts run.enemies by feet row (in place) for the y-sort with props and the player.
export function sortEnemies(run, assets) {
  for (const e of run.enemies) {
    if (FOOT[e.type] === undefined) FOOT[e.type] = assets.has(ANIM[e.type]) ? assets.size(ANIM[e.type]).h >> 1 : e.r;
    e.foot = FOOT[e.type];
  }
  return run.enemies.sort(byFoot);
}

export function drawEnemy(ctx, assets, e, cam, tMs, now) {
  if (e.dead) return;                                      // killed this step: the poof has taken over
  const sx = e.x - cam.x, sy = e.y - cam.y;
  if (sx < -40 || sy < -40 || sx > cam.w + 40 || sy > cam.h + 40) return;
  const flip = e.facing < 0, flash = now < e.flashUntil;
  const name = ANIM[e.type], t = (now < e.frozenUntil ? 0 : tMs) + e.phase * 1000;   // phase desyncs the crowd; frozen = stopped
  if (e.type === 'witch' && e.inRange && e.shotAt - now < CAST_LEAD)
    assets.draw(ctx, 'witch_cast', sx, sy, { flip, flash, t: (CAST_LEAD - (e.shotAt - now)) * 1000 });
  else if (assets.has(name)) assets.draw(ctx, name, sx, sy, { flip, flash, t });
  else {   // ponytail: bosses get their art in Task 12; until then a scaled slime stands in
    const s = Math.max(1, Math.round(e.def.size / 14));
    ctx.save(); ctx.translate(Math.round(sx), Math.round(sy)); ctx.scale(s, s);
    assets.draw(ctx, 'slime_walk', 0, 0, { flip, flash, t });
    ctx.restore();
  }
  if (now < e.frozenUntil) {                               // frozen: frosted pale all over, ice at the feet
    if (assets.has(name)) assets.draw(ctx, name, sx, sy, { flip, flash: true, t, alpha: FROST_ALPHA });
    assets.draw(ctx, 'fx_frozen', sx, sy, { t: tMs + e.phase * 1000 });   // glints keep twinkling
  } else if (now < e.slowUntil) assets.draw(ctx, 'fx_frozen', sx, sy, { t, alpha: SLOW_ALPHA });   // slowed: lighter crust
}
