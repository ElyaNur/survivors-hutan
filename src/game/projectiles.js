// Projectiles (player spells and enemy shots) and areas (explosions, novas, burning ground).
// Both live in pooled objects: spawn takes one from the free list, the end gives it back.
import TUNING from '../data/tuning.js';
import { applySlow } from '../logic/combat.js';
import { damageEnemy, hurtMage } from './enemies.js';

const MAX_ENEMY_R = 32;                                     // biggest enemy radius (treant): grid query margin
const PLAYER_R = TUNING.player.size / 2;
const near = [];                                            // reused grid query buffer
const freeShots = [], freeAreas = [];

const SHOT = { x: 0, y: 0, vx: 0, vy: 0, dmg: 0, radius: 2, pierce: 1, life: 1, sprite: '', hostile: false, glow: '',
  onHit: null, onEnd: null };
// spawnProjectile(run, {x, y, vx, vy, dmg, radius, pierce = 1, life, sprite, hostile = false, glow?, onHit?(run, p, e), onEnd?(run, p)})
// Extra fields (e.g. a fireball's boomR) ride along on the projectile for its callbacks.
// dmg 0 = the projectile itself deals nothing (its onHit does the damage).
export function spawnProjectile(run, opts) {
  const p = Object.assign(freeShots.pop() ?? { hit: [] }, SHOT, opts);
  p.hit.length = 0;                                         // enemies already pierced: never hit twice
  run.projectiles.push(p);
  return p;
}

const AREA = { x: 0, y: 0, r: 0, dmg: 0, delay: 0, dur: 0, tickEvery: 0.5, freeze: 0, slow: 0, slowDur: 1, sprite: '', warnSprite: '',
  glow: '', glowDur: 0, quiet: false, hostile: false, onTrigger: null };
// spawnArea(run, {x, y, r, dmg, delay = 0, dur = 0, tickEvery = 0.5, freeze = 0, slow = 0, slowDur = 1, sprite?, warnSprite?,
//   glow?, glowDur?, quiet?, onTrigger?(run, a)}): after `delay` hits every enemy within r, then ticks every tickEvery for `dur`
// (onTrigger may change a.dmg for the ticks). hostile: hurts the mage (within r + his radius) instead of enemies. quiet: its hits print through the number budget (damageEnemy). glow: halo key lit on the ground for glowDur after the trigger, fading out.
export function spawnArea(run, opts) {
  const a = Object.assign(freeAreas.pop() ?? {}, AREA, opts);
  a.age = 0; a.triggered = false; a.nextTick = 0;
  run.areas.push(a);
  return a;
}

function applyArea(run, a) {
  if (a.hostile) {                                          // boss attack: only the mage
    const pl = run.player, reach = a.r + PLAYER_R;
    if ((pl.x - a.x) ** 2 + (pl.y - a.y) ** 2 <= reach * reach) hurtMage(run, a.dmg);
    return;
  }
  const now = run.time;
  near.length = 0;
  run.grid.query(a.x, a.y, a.r + MAX_ENEMY_R, near);
  for (const e of near) {
    if (e.dead) continue;
    const reach = a.r + e.r;
    if ((e.x - a.x) ** 2 + (e.y - a.y) ** 2 > reach * reach) continue;
    if (a.dmg > 0) damageEnemy(run, e, a.dmg, { fromX: a.x, fromY: a.y, quiet: a.quiet });
    if (a.freeze) e.frozenUntil = Math.max(e.frozenUntil, now + a.freeze);
    if (a.slow) applySlow(e, a.slow, a.slowDur, now);
  }
}

function endShot(run, ps, i) {
  const p = ps[i];
  p.onEnd?.(run, p);
  p.onHit = p.onEnd = null;
  ps[i] = ps[ps.length - 1]; ps.pop();                     // swap-remove, order doesn't matter
  freeShots.push(p);
}

// Moves and resolves every projectile and area. Hostile shots hit the mage, the rest hit enemies.
export function updateProjectiles(run, dt) {
  const ps = run.projectiles, pl = run.player;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.hostile) {
      const reach = p.radius + PLAYER_R;
      if ((p.x - pl.x) ** 2 + (p.y - pl.y) ** 2 < reach * reach) { hurtMage(run, p.dmg); p.pierce = 0; }
    } else {
      near.length = 0;
      run.grid.query(p.x, p.y, p.radius + MAX_ENEMY_R, near);
      for (const e of near) {
        if (e.dead || p.hit.includes(e)) continue;
        const reach = p.radius + e.r;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > reach * reach) continue;
        p.hit.push(e);
        if (p.dmg > 0) damageEnemy(run, e, p.dmg, { fromX: p.x - p.vx, fromY: p.y - p.vy });   // shove along the flight
        p.onHit?.(run, p, e);
        if (--p.pierce <= 0) break;
      }
    }
    if (p.pierce <= 0 || p.life <= 0) endShot(run, ps, i);
  }
  const as = run.areas;
  for (let i = as.length - 1; i >= 0; i--) {
    const a = as[i];
    a.age += dt;
    if (!a.triggered) {
      if (a.age < a.delay) continue;
      a.triggered = true; a.nextTick = a.delay + a.tickEvery;   // ticks on a fixed beat: dur 1, every 0.5 = 2 ticks
      applyArea(run, a);
      a.onTrigger?.(run, a);
    } else if (a.age >= a.nextTick && a.nextTick <= a.delay + a.dur + 1e-6) { a.nextTick += a.tickEvery; applyArea(run, a); }
    if (a.age >= a.delay + Math.max(a.dur, a.glowDur)) { a.onTrigger = null; as[i] = as[as.length - 1]; as.pop(); freeAreas.push(a); }
  }
}

// ---- Drawing (browser)
// Banded halos, built once per colour: pxl's glow only lights the sprite's own pixels, these spill onto
// the ground. Drawn with 'lighter' so they add light instead of painting a disc.
const HALOS = {                                             // key -> [r, g, b, radius px] (palette colours)
  fire: [255, 120, 40, 9], ice: [124, 240, 255, 7], arcane: [216, 123, 255, 9], hex: [255, 90, 217, 8], bolt: [255, 241, 168, 8],
};
const HALO_TINT = 0.5;                                      // share of the halo first painted normally: 'lighter' alone
                                                            // only brightens the grass to lime, this gives it the hue
const AREA_GLOW = 0.7;                                      // peak strength of an area's ground light
const HALO_BANDS = [[0.5, 0.45], [0.75, 0.25], [1, 0.12]];   // [share of radius, alpha]
const haloCache = {};
function haloImage(key) {
  const [r, g, b, R] = HALOS[key], n = R * 2 + 1, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const c = cv.getContext('2d'), img = c.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const band = HALO_BANDS.find(([k]) => Math.hypot(x - R, y - R) <= k * R + 0.3);
    if (band) img.data.set([r, g, b, Math.round(band[1] * 255)], (y * n + x) * 4);
  }
  c.putImageData(img, 0, 0);
  return cv;
}

// Additive halo centred at screen x,y; scale > 1 grows it (chunky bands, on purpose).
export function drawHalo(ctx, key, x, y, scale = 1, alpha = 1) {
  const img = haloCache[key] ??= haloImage(key), s = Math.round(img.width * scale), hx = Math.round(x - s / 2), hy = Math.round(y - s / 2);
  ctx.globalAlpha = alpha * HALO_TINT; ctx.drawImage(img, hx, hy, s, s);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
  ctx.drawImage(img, hx, hy, s, s);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

const onScreen = (x, y, cam, m) => x > -m && y > -m && x < cam.w + m && y < cam.h + m;

// Ground level, under the actors: warnings, lit ground, area sprites.
export function drawAreas(ctx, run, assets, cam) {
  for (const a of run.areas) {
    const x = a.x - cam.x, y = a.y - cam.y;
    if (!onScreen(x, y, cam, a.r + 16)) continue;
    if (!a.triggered) { if (a.warnSprite) assets.draw(ctx, a.warnSprite, x, y, { t: a.age * 1000 }); continue; }
    const age = a.age - a.delay;
    if (a.glow && age < a.glowDur) drawHalo(ctx, a.glow, x, y, a.r / HALOS[a.glow][3], AREA_GLOW * (1 - age / a.glowDur));
    if (a.sprite && age < a.dur) assets.draw(ctx, a.sprite, x, y, { t: age * 1000 });
  }
}

// Above the actors: halo, then the sprite turned to its flight direction.
export function drawProjectiles(ctx, run, assets, cam, tMs) {
  for (const p of run.projectiles) {
    const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y);
    if (!onScreen(x, y, cam, 16)) continue;
    if (p.glow) drawHalo(ctx, p.glow, x, y);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(p.vy, p.vx));
    assets.draw(ctx, p.sprite, 0, 0, { t: tMs });
    ctx.restore();
  }
}
