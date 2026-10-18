// Enemies: spawning, behaviours (chase / bat / wolf / witch / bosses), separation, contact damage, deaths, drawing.
import TUNING from '../data/tuning.js';
import { SCHEDULE } from '../data/spawns.js';
import { offscreenPoint } from '../logic/spawner.js';
import { hitEnemy, hurtPlayer, knockback, speedFactor } from '../logic/combat.js';
import { WORLD_W, WORLD_H, terrainSpeed, camera } from './world.js';
import { dropGem, dropHeart, dropMagnet, dropChest } from './pickups.js';
import { spawnProjectile, spawnArea } from './projectiles.js';
import { sfx } from '../engine/audio.js';

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
const ROOTS_T = 0.5, ATTACK_T = 0.625;                     // s: roots_hit and treant_attack anim lengths
const DUST_RATE = 20, DUST = '#d9c27a';                     // charging orc chief: dust puffs per s, colour (palette p)
const CHARGE_JOLT = { px: 1.5, dur: 0.15 };                 // shake as the chief bursts into his charge
// The treant's death: one big blast, then a 2 s fireworks of leaves and blossom over where he fell.
const WIN_COLORS = ['#46a24a', '#7fcf5c', '#c3ef84', '#b77a45', '#ff9f9a', '#ffd23f'];   // palette G g j n i Y
const WIN_FX = { hitstop: 0.25, shake: { px: 6, dur: 1.2 }, flash: { color: '#fff1a8', dur: 0.6 }, spread: 24 };

export function spawnEnemy(run, type, x, y) {
  const def = TUNING.enemies[type];
  const hp = BOSSES.has(type) ? def.hp : Math.round(def.hp * (1 + TUNING.enemyHpGrowthPerMin * Math.floor(run.time / 60)));
  const e = {
    type, def, x, y, hp, maxHp: hp, r: def.size / 2, dead: false, facing: 1, phase: run.rng.next() * Math.PI * 2,
    flashUntil: 0, frozenUntil: 0, slowUntil: 0, slowAmt: 0, vulnerableUntil: 0,
    dirX: 0, dirY: 0, aimAt: 0,                              // wolf: locked heading, next re-aim time
    shotAt: run.time + (def.shotEvery ?? 0), inRange: false, // witch
    foot: 0,                                                 // set by sortEnemies
    state: 'walk', stateUntil: 0, attackUntil: 0,            // bosses: orc chief walk/windup/charge, treant casting
    nextAt: run.time + (def.chargeEvery ?? def.rootEvery ?? 0), summonAt: run.time + (def.summonEvery ?? 0),
  };
  run.enemies.push(e);
  if (BOSSES.has(type)) { run.boss = e; sfx('bossRoar'); }                        // the HUD's health bar follows the newest boss
  return e;
}

// The one door for hurting an enemy (skills, auras, ults all call this): flash, shove, number, and the kill itself.
// opts: { fromX, fromY } shove source (default: the player), { power } shove px, { color } number colour (default by size of hit),
// { quiet } big hits share the small-hit budget too (mass AoE: an ult blast must not bury the crowd in numbers).
export function damageEnemy(run, e, dmg, { fromX = run.player.x, fromY = run.player.y, power = FX.knockback, color, quiet = false } = {}) {
  if (e.dead) return null;
  const hit = hitEnemy(e, dmg, run.time), fx = run.fx, big = hit.dealt >= FX.bigHit, nb = FX.numberBudget;
  run.numTokens = Math.min(nb.burst, run.numTokens + (run.time - run.numAt) * nb.rate); run.numAt = run.time;
  const loud = big && !quiet;
  if (loud || run.numTokens >= 1) {                        // small hits share a budget: mass hits don't bury the screen
    if (!loud) run.numTokens--;
    fx.number(e.x + (Math.random() - 0.5) * 8, e.y - e.r - 6, hit.dealt, color ?? (big ? 'y' : 'w'));
  }
  if (hit.killed) { sfx('die'); killEnemy(run, e); }
  else { sfx('hit'); if (power) knockback(e, fromX, fromY, power * (e.def.knock ?? 1)); }   // bosses barely budge
  return hit;
}

// Kill bookkeeping, done at the moment of death; updateEnemies only sweeps the corpses out afterwards.
function killEnemy(run, e) {
  const fx = run.fx;
  run.kills++;
  if (BOSSES.has(e.type)) { killBoss(run, e); return; }
  if (!e.swarm) {                                           // swarm members drop nothing: the swarm is a test, not a feast
    dropGem(run, e.x, e.y, e.def.xp);
    if (run.rng.next() < TUNING.drops.heartChance) dropHeart(run, e.x + 4, e.y);
    if (run.rng.next() < TUNING.drops.magnetChance) dropMagnet(run, e.x - 4, e.y);
  }
  if (run.time < e.vulnerableUntil) {                       // died on Absolute Zero's ice: it shatters
    sfx('ice'); fx.anim(e.x, e.y, 'fx_shatter');
    for (const [c, n, sp] of SHATTER) fx.burst(e.x, e.y, c, n, sp);
    return;
  }
  fx.anim(e.x, e.y, 'fx_poof');
  fx.burst(e.x, e.y, FX.deathColor[e.type] ?? FX.deathColor.default, FX.deathBurst.count, FX.deathBurst.speed);
}

// Bosses: a ring of gems for their xp, their chest, the king slime's brood. The treant's fall wins the run.
function killBoss(run, e) {
  const fx = run.fx, def = e.def, color = FX.deathColor[e.type] ?? FX.deathColor.default;
  fx.hitstop(FX.hitstopBig, true);                          // a boss falling always lands, gap or not
  if (e.type === 'treant') {
    run.bossDead = true; run.ending = 'won'; run.endAt = run.time; run.endT = 0; run.endFx = 0; run.endX = e.x; run.endY = e.y;
    fx.hitstop(WIN_FX.hitstop); fx.shake(WIN_FX.shake.px, WIN_FX.shake.dur); fx.flashScreen(WIN_FX.flash.color, WIN_FX.flash.dur);
    fx.anim(e.x, e.y, 'fx_ultFlash', { scale: 2 });
    winBlast(run, e.x, e.y);
    return;
  }
  const n = Math.max(1, Math.ceil(def.xp / TUNING.drops.bossGemXp));
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    dropGem(run, e.x + Math.cos(a) * e.r * 0.7, e.y + Math.sin(a) * e.r * 0.5, def.xp / n);
  }
  if (def.chest) dropChest(run, e.x, e.y, def.chest);
  for (let i = 0; i < (def.splitCount ?? 0); i++) {         // the brood bursts out of where it stood
    const a = i / def.splitCount * Math.PI * 2;
    spawnEnemy(run, def.splitInto, e.x + Math.cos(a) * e.r * 0.6, e.y + Math.sin(a) * e.r * 0.6);
  }
  fx.shake(FX.shakeBoss.px, FX.shakeBoss.dur);
  fx.anim(e.x, e.y, 'fx_poof', { scale: 2 });
  fx.burst(e.x, e.y, color, FX.bossBurst.count, FX.bossBurst.speed);
  fx.burst(e.x, e.y, '#ffffff', FX.bossBurst.count >> 2, FX.bossBurst.speed);
}

// One beat of the treant's death fireworks, somewhere over where he fell.
export function winBlast(run, x, y) {
  const fx = run.fx, s = WIN_FX.spread;
  for (let i = 0; i < 2; i++) {
    const bx = x + (Math.random() - 0.5) * 2 * s, by = y + (Math.random() - 0.5) * 2 * s;
    fx.anim(bx, by, 'fx_explosion', { scale: 2 });
    fx.anim(bx, by, 'fx_poof', { scale: 2.5 });
    for (const c of WIN_COLORS) fx.burst(bx, by, c, 6, 130);
  }
  fx.shake(FX.shakeMeteor.px, FX.shakeMeteor.dur);
}

// Contact and shots hurt the mage through here so a landed hit flashes the screen red. Nothing hurts him
// once the run is ending (won or dying).
export function hurtMage(run, dmg) {
  if (run.ending || run.godMode || !hurtPlayer(run.player, dmg, run.time)) return;   // godMode: debug.js (F7)
  sfx('hurt');
  run.fx.flashScreen(FX.flashHurt.color, FX.flashHurt.dur);
  run.fx.shake(FX.shakeHurt.px, FX.shakeHurt.dur);
}

function fire(run, e, def) {
  const p = run.player, x = e.x + ORB.x * e.facing, y = e.y + ORB.y;
  const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
  spawnProjectile(run, { x, y, vx: dx / d * def.shotSpeed, vy: dy / d * def.shotSpeed, dmg: def.shotDmg,
    radius: def.shotSize / 2, life: def.shotLife, sprite: 'witchShot_fly', hostile: true, glow: 'hex' });
}

// Roots break the ground: a jolt and a spray of earth, hit or miss.
function rootsBurst(run, a) {
  run.fx.shake(1.5, 0.12);
  run.fx.burst(a.x, a.y, '#6b4030', 10, 70);
  run.fx.burst(a.x, a.y, '#b09a5c', 6, 50);
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
    } else if (e.type === 'orcChief') {                     // walk, then (on screen) windup 0.8 s -> straight charge
      if (sf === 0) { e.stateUntil += dt; e.nextAt += dt; }   // frozen: his clocks stop too (no unseen charge on thaw)
      if (e.state === 'walk') {
        if (sf > 0 && now >= e.nextAt && d < def.chargeRange) {        // aim locks now: the telegraph shows the exact lane
          e.state = 'windup'; e.stateUntil = now + def.chargeWindup; e.nextAt = now + def.chargeEvery;
          e.dirX = ux; e.dirY = uy; e.facing = ux < 0 ? -1 : 1;
        }
      } else if (now >= e.stateUntil) {
        if (e.state === 'windup') {
          e.state = 'charge'; e.stateUntil = now + def.chargeDur;
          run.fx.shake(CHARGE_JOLT.px, CHARGE_JOLT.dur);
        } else e.state = 'walk';
      }
      if (e.state === 'windup') { mx = 0; my = 0; }
      else if (e.state === 'charge') {
        mx = e.dirX; my = e.dirY;
        if (Math.floor(now * DUST_RATE) !== Math.floor((now - dt) * DUST_RATE))
          run.fx.burst(e.x - e.dirX * e.r * 0.5, e.y + e.r * 0.7, DUST, 2, 30);
      }
    } else if (e.type === 'treant') {                       // slow; roots under the mage, goblins on a beat
      if (now >= e.nextAt) {
        e.nextAt = now + def.rootEvery; e.attackUntil = now + ATTACK_T;
        spawnArea(run, { x: p.x, y: p.y, r: def.rootR, dmg: def.rootDmg, delay: def.rootWarn, dur: ROOTS_T, tickEvery: Infinity,
          hostile: true, warnSprite: 'roots_warn', sprite: 'roots_hit', onTrigger: rootsBurst });
      }
      if (now >= e.summonAt) {
        e.summonAt = now + def.summonEvery;
        for (let i = 0; i < def.summonCount; i++) {
          const a = i / def.summonCount * Math.PI * 2, gx = e.x + Math.cos(a) * (e.r + 10), gy = e.y + Math.sin(a) * (e.r + 10);
          spawnEnemy(run, def.summonType, gx, gy);
          run.fx.anim(gx, gy, 'fx_poof');
        }
      }
      if (now < e.attackUntil) { mx = 0; my = 0; }          // plants himself while he calls the roots
    }
    const speed = e.state === 'charge' ? def.chargeSpeed : def.speed;
    const v = speed * sf * (e.type === 'bat' ? 1 : terrainSpeed(e.x, e.y)) * dt;   // bats fly over water
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
  const m = e.r + 24;                                      // cull margin: half the sprite and a bit (treant 64 px)
  if (sx < -m || sy < -m || sx > cam.w + m || sy > cam.h + m) return;
  const flip = e.facing < 0, flash = now < e.flashUntil;
  const name = ANIM[e.type], t = (now < e.frozenUntil ? 0 : tMs) + e.phase * 1000;   // phase desyncs the crowd; frozen = stopped
  if (e.type === 'witch' && e.inRange && e.shotAt - now < CAST_LEAD)
    assets.draw(ctx, 'witch_cast', sx, sy, { flip, flash, t: (CAST_LEAD - (e.shotAt - now)) * 1000 });
  else if (e.state === 'windup')                           // shudders on the spot, flushing red (in the art)
    assets.draw(ctx, 'orcChief_windup', sx + (Math.floor(tMs / 40) % 2 ? 1 : -1), sy, { flip, flash, t: tMs });
  else if (e.state === 'charge') assets.draw(ctx, 'orcChief_charge', sx, sy, { flip, flash, t: tMs });
  else if (now < e.attackUntil) assets.draw(ctx, 'treant_attack', sx, sy, { flip, flash, t: (now - e.attackUntil + ATTACK_T) * 1000 });
  else assets.draw(ctx, name, sx, sy, { flip, flash, t });
  if (now < e.frozenUntil) {                               // frozen: frosted pale all over, ice at the feet
    if (assets.has(name)) assets.draw(ctx, name, sx, sy, { flip, flash: true, t, alpha: FROST_ALPHA });
    assets.draw(ctx, 'fx_frozen', sx, sy, { t: tMs + e.phase * 1000 });   // glints keep twinkling
  } else if (now < e.slowUntil) assets.draw(ctx, 'fx_frozen', sx, sy, { t, alpha: SLOW_ALPHA });   // slowed: lighter crust
}

// Ground level, under the actors: the orc chief's charge lane while he winds up. It covers exactly the path his
// body will sweep (width 2r, length speed x duration), fills up as the charge nears and blinks its edges.
export const chargeLane = (e, def = e.def) => Math.round(def.chargeSpeed * def.chargeDur + e.r);   // centre travel + his body in front
const LANE = { fill: '#e2585e', edge: '#ff9f9a', edgeDim: '#a3324a', chevron: '#fff1a8' };   // palette r i R y
export function drawTelegraphs(ctx, run, cam) {
  const now = run.time;
  for (const e of run.enemies) {
    if (e.dead || e.state !== 'windup') continue;
    const def = e.def, L = chargeLane(e, def), w = Math.round(e.r);
    const k = Math.min(1, 1 - (e.stateUntil - now) / def.chargeWindup), blink = Math.floor(now * 10) % 2 === 0;
    ctx.save();
    ctx.translate(Math.round(e.x - cam.x), Math.round(e.y - cam.y)); ctx.rotate(Math.atan2(e.dirY, e.dirX));
    ctx.fillStyle = LANE.fill;
    ctx.globalAlpha = 0.18; ctx.fillRect(0, -w, L, w * 2);
    ctx.globalAlpha = 0.3; ctx.fillRect(0, -w, Math.round(L * k), w * 2);   // how close he is to going
    ctx.globalAlpha = 1; ctx.fillStyle = blink ? LANE.edge : LANE.edgeDim;
    ctx.fillRect(0, -w, L, 1); ctx.fillRect(0, w - 1, L, 1); ctx.fillRect(L - 1, -w, 1, w * 2);
    ctx.fillStyle = LANE.chevron;
    for (let x = 14 + Math.floor(k * 16) % 16; x < L - 4; x += 16)     // chevrons marching along the lane
      for (let i = 0; i < 4; i++) { ctx.fillRect(x + i, -4 + i, 1, 1); ctx.fillRect(x + i, 3 - i, 1, 1); }
    ctx.restore();
  }
}
