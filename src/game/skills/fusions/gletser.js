// Gletser (Meteor + Frost Nova): every cd a giant block of glacier ice drops just beyond the densest crowd in view, then
// slides straight across the view through it (toward the mage's side and on past it), running over each enemy on its lane
// once: a heavy hit, frozen solid, shoved off the lane. At the end of its run it shatters.
import TUNING from '../../../data/tuning.js';
import { camera } from '../../world.js';
import { damageEnemy } from '../../enemies.js';
import { spawnArea, drawHalo } from '../../projectiles.js';
import { densestCell } from '../index.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg, ready } from './index.js';

const G = TUNING.fusions.gletser, FX = TUNING.fx;
const MAX_ENEMY_R = 32, EDGE = 24;                          // grid margin; px the drop is kept inside the view
const LIFT = 10, FALL = 0.35, FROM_Y = -190;                // block drawn this far above its lane (it stands on it); s of the warn it is seen falling, from px above
const WARN_R = 28, NOVA_R = 36, SHATTER = 2.5;              // fu_iceWarn / fx_frostNova art radii; the shatter's scale
const RIME_GAP = 9, RIME_LIFE = 0.9, RIME_UP = 2;           // frost tufts left on its lane: px apart, s each lasts, px above the foot
const SPRAY = ['#ffffff', '#a6f6ff'];                       // palette w, c: snow thrown off its front
const LAND = [['#ffffff', 10, 150], ['#a6f6ff', 14, 120], ['#3ccfe0', 10, 80]];   // palette w/c/C
const near = [];

function land(run, st, mods) {
  const fx = run.fx, r = G.landR * mods.area;
  spawnArea(run, { x: st.x, y: st.y, r, dmg: fusionDmg(run, G.landDmg), freeze: G.freeze, glow: 'ice', glowDur: 0.4, quiet: true });
  sfx('gletser'); sfx('gletserSlide');
  fx.shake(FX.shakeUlt.px, FX.shakeUlt.dur * 0.6);
  fx.hitstop(FX.hitstopBig);
  fx.anim(st.x, st.y, 'fx_frostNova', { scale: r / NOVA_R });
  for (const [c, n, s] of LAND) fx.burst(st.x, st.y, c, n, s);
  st.phase = 'slide'; st.x0 = st.x; st.rimeT = 0;
}

// Moves the block step px and runs over what its swept footprint covers (each enemy once per run).
function slide(run, st, mods, step) {
  const x0 = st.x, x1 = st.x + st.dir * step, half = G.half * mods.area, dmg = fusionDmg(run, G.dmg);
  const HW = G.halfW, lo = Math.min(x0, x1) - HW, hi = Math.max(x0, x1) + HW;
  near.length = 0;
  run.grid.query((x0 + x1) / 2, st.y, HW + step / 2 + half + MAX_ENEMY_R, near);
  for (const e of near) {
    if (e.dead || st.hit.has(e) || Math.abs(e.y - st.y) > half + e.r || e.x < lo - e.r || e.x > hi + e.r) continue;
    st.hit.add(e);
    damageEnemy(run, e, dmg, { fromX: e.x, fromY: st.y, power: G.push, quiet: true });   // shoved straight off the lane
    e.frozenUntil = Math.max(e.frozenUntil, run.time + G.freeze);
    run.fx.burst(e.x, e.y, '#a6f6ff', 3, 60);               // palette c
  }
  st.x = x1;
  if (Math.random() < 0.8) run.fx.burst(x1 + st.dir * G.halfW, st.y + LIFT - 2, SPRAY[Math.random() < 0.5 ? 0 : 1], 2, 70);
  if ((st.left -= step) <= 0) {                             // the end of its run: it bursts apart
    st.phase = null;
    run.fx.anim(st.x, st.y - LIFT, 'fx_shatter', { scale: SHATTER });
    for (const [c, n, s] of LAND) run.fx.burst(st.x, st.y - LIFT, c, n, s * 0.8);
    sfx('ice');
  }
}

export default {
  id: 'gletser',
  update(run, st, level, mods, dt) {
    if (st.rimeT !== undefined) st.rimeT += dt;
    if (st.phase === 'fall' && (st.t += dt) >= G.warn) land(run, st, mods);
    else if (st.phase === 'slide') slide(run, st, mods, G.speed * dt);
    if (st.phase || !ready(st, G.cd, mods, dt)) return;    // one block at a time: the cd runs from the end of its run
    const v = camera(run.player), q = densestCell(run, v);
    if (!q) { st.cd = 0; return; }                          // stays charged until a crowd is in view
    st.dir = q.x >= run.player.x ? -1 : 1;                  // in from the crowd's side, across toward the other
    st.x = Math.min(Math.max(q.x - st.dir * G.land, v.x + EDGE), v.x + v.w - EDGE); st.y = q.y;
    st.phase = 'fall'; st.t = 0; st.left = G.slide; st.rimeT = undefined;   // the last run's rime is gone
    (st.hit ??= new Set()).clear();
  },
  // Above the actors: the warning while it falls; the frost it scrapes onto its lane, each tuft melting away behind it.
  draw(ctx, run, st, level, assets, cam) {
    if (st.phase === 'fall') {
      const r = G.landR * run.mods.area;
      assets.draw(ctx, 'fu_iceWarn', st.x - cam.x, st.y - cam.y, { t: st.t / G.warn * assets.animTotal('fu_iceWarn'), scale: r / WARN_R });
    }
    if (st.rimeT === undefined || st.rimeT > G.slide / G.speed + RIME_LIFE) return;
    const n = Math.floor(Math.abs(st.x - st.x0) / RIME_GAP), dir = Math.sign(st.x - st.x0), y = st.y - cam.y + LIFT - RIME_UP;
    for (let k = 0; k <= n; k++) {                          // tuft k was laid k gaps into the run
      const age = st.rimeT - k * RIME_GAP / G.speed;
      if (age >= RIME_LIFE) continue;
      assets.draw(ctx, 'fu_frost', st.x0 + dir * k * RIME_GAP - cam.x, y + (k % 2) * 3, { t: k * 170, alpha: Math.min(1, 2 * (1 - age / RIME_LIFE)) });
    }
  },
  // Over the smoke and the crowd, under the mage: the block itself, falling in, then sliding.
  drawTop(ctx, run, st, level, assets, cam) {
    if (!st.phase) return;
    const x = st.x - cam.x;
    let y = st.y - cam.y - LIFT;
    if (st.phase === 'fall') {
      const k = 1 - (G.warn - st.t) / Math.min(FALL, G.warn);   // a short warn shows all of the fall
      if (k <= 0) return;
      y += FROM_Y * (1 - k * k);
    }
    drawHalo(ctx, 'ice', x, y, 4.5, 0.8);
    assets.draw(ctx, 'fu_glacier', Math.round(x), Math.round(y), { t: run.time * 1000 });
  },
};
