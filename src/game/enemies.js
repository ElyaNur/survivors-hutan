// Enemies: spawning, behaviours (chase / bat / wolf / witch), separation, contact damage, deaths, drawing.
import TUNING from '../data/tuning.js';
import { SCHEDULE } from '../data/spawns.js';
import { offscreenPoint } from '../logic/spawner.js';
import { hurtPlayer, speedFactor } from '../logic/combat.js';
import { WORLD_W, WORLD_H, terrainSpeed, camera } from './world.js';
import { dropGem, dropHeart, dropMagnet } from './pickups.js';

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
const near = [];                                            // reused grid query buffer

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

function fire(run, e, def) {
  const p = run.player, x = e.x + ORB.x * e.facing, y = e.y + ORB.y;
  const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
  run.projectiles.push({ x, y, vx: dx / d * def.shotSpeed, vy: dy / d * def.shotSpeed, dmg: def.shotDmg,
    radius: def.shotSize / 2, pierce: 1, life: def.shotLife, sprite: 'witchShot_fly', hostile: true });
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
      hurtPlayer(p, def.dmg, now);
      const ex = e.x - p.x, ey = e.y - p.y, de = Math.hypot(ex, ey) || 1, keep = touch * BODY_OVERLAP;
      if (de < keep) { e.x = p.x + ex / de * keep; e.y = p.y + ey / de * keep; }
    }
  }
  for (let i = es.length - 1; i >= 0; i--) {                // deaths: swap-remove, order doesn't matter
    const e = es[i];
    if (!e.dead) continue;
    if (!BOSSES.has(e.type)) {                              // bosses drop chests (Task 12)
      dropGem(run, e.x, e.y, e.def.xp);
      if (run.rng.next() < TUNING.drops.heartChance) dropHeart(run, e.x + 4, e.y);
      if (run.rng.next() < TUNING.drops.magnetChance) dropMagnet(run, e.x - 4, e.y);
    }
    run.kills++;
    if (run.fx) run.fx.anim(e.x, e.y, 'fx_poof');
    es[i] = es[es.length - 1]; es.pop();
  }
}

// ponytail: hostile shots only; Task 10's updateProjectiles takes this over.
export function updateEnemyShots(run, dt) {
  const p = run.player, pr = TUNING.player.size / 2, ps = run.projectiles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const s = ps[i];
    if (!s.hostile) continue;
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    const hit = Math.hypot(s.x - p.x, s.y - p.y) < s.radius + pr;
    if (hit) hurtPlayer(p, s.dmg, run.time);
    if (hit || s.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); }
  }
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
  const sx = e.x - cam.x, sy = e.y - cam.y;
  if (sx < -40 || sy < -40 || sx > cam.w + 40 || sy > cam.h + 40) return;
  const flip = e.facing < 0, flash = now < e.flashUntil;
  if (e.type === 'witch' && e.inRange && e.shotAt - now < CAST_LEAD)
    return assets.draw(ctx, 'witch_cast', sx, sy, { flip, flash, t: (CAST_LEAD - (e.shotAt - now)) * 1000 });
  const name = ANIM[e.type], t = tMs + e.phase * 1000;   // phase desyncs the crowd
  if (assets.has(name)) return assets.draw(ctx, name, sx, sy, { flip, flash, t });
  // ponytail: bosses get their art in Task 12; until then a scaled slime stands in
  const s = Math.max(1, Math.round(e.def.size / 14));
  ctx.save(); ctx.translate(Math.round(sx), Math.round(sy)); ctx.scale(s, s);
  assets.draw(ctx, 'slime_walk', 0, 0, { flip, flash, t });
  ctx.restore();
}

// Banded magenta halo, built once: the sprite's own glow can't spill onto the ground, this does.
const HALO_R = 8, HALO_BANDS = [[4, 0.45], [6, 0.25], [HALO_R, 0.12]];   // [radius px, alpha]
let halo = null;
function shotHalo() {
  const n = HALO_R * 2 + 1, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const g = cv.getContext('2d'), img = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const band = HALO_BANDS.find(([r]) => Math.hypot(x - HALO_R, y - HALO_R) <= r + 0.3);
    if (!band) continue;
    const i = (y * n + x) * 4;
    img.data.set([255, 90, 217, Math.round(band[1] * 255)], i);   // palette "m"
  }
  g.putImageData(img, 0, 0);
  return cv;
}

export function drawEnemyShots(ctx, run, assets, cam, tMs) {
  halo ??= shotHalo();
  for (const s of run.projectiles) {
    if (!s.hostile) continue;
    const x = Math.round(s.x - cam.x), y = Math.round(s.y - cam.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(halo, x - HALO_R, y - HALO_R);
    ctx.globalCompositeOperation = 'source-over';
    assets.draw(ctx, s.sprite, x, y, { t: tMs });
  }
}
