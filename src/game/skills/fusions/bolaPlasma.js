// Bola Plasma (Fireball + Chain Lightning): every cd a big ball of plasma leaves the mage and drifts slowly to the densest
// crowd in view. Every zapEvery s on the way it lashes out with lightning at everything within zapR; at the end it pops in
// a blast of fire and lightning. One ball at a time: the cd runs from the pop.
import TUNING from '../../../data/tuning.js';
import { camera } from '../../world.js';
import { damageEnemy } from '../../enemies.js';
import { spawnArea, drawHalo } from '../../projectiles.js';
import { drawArc } from '../chainLightning.js';
import { densestCell } from '../index.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg, ready } from './index.js';

const B = TUNING.fusions.bolaPlasma, FX = TUNING.fx, TAU = Math.PI * 2;
const MAX_ENEMY_R = 32, UP = 14;                            // grid margin; px the ball floats over its ground point
const ARC_LIFE = 0.14, ARCS = 10;                           // s a zap's arc shows; most arcs drawn per zap (the rest just spark)
const CRACKLE = 3, CRACKLE_R = 19, CRACKLE_LEN = 10;         // short arcs licking off its skin each frame: count, from px, length px
const POP_LIFE = 0.22, POP_RAYS = 10;                       // s the pop's lightning rays show; how many
const POP = [['#ffffff', 12, 170], ['#fff1a8', 14, 140], ['#d3b0ff', 14, 120], ['#ff9a3c', 12, 100], ['#9b5de5', 8, 80]];   // palette w/y/l/o/v
const near = [];

// Lightning to everything within zapR. Arc ends are kept in a fixed pool (no allocation per zap).
function zap(run, st, mods) {
  const dmg = fusionDmg(run, B.zapDmg), r = B.zapR * mods.area;
  let n = 0;
  near.length = 0;
  run.grid.query(st.x, st.y, r + MAX_ENEMY_R, near);
  for (const e of near) {
    if (e.dead || (e.x - st.x) ** 2 + (e.y - st.y) ** 2 > (r + e.r) ** 2) continue;
    damageEnemy(run, e, dmg, { fromX: st.x, fromY: st.y, power: 0, quiet: true });   // no shove: it would scatter the crowd off its path
    if (n < ARCS) { st.ax[n] = e.x; st.ay[n] = e.y; run.fx.anim(e.x, e.y, 'fx_lightningHit'); }
    else run.fx.burst(e.x, e.y, '#fff1a8', 2, 50);           // palette y
    n++;
  }
  st.arcs = Math.min(n, ARCS); st.arcT = 0;
  if (n) sfx('bolaPlasmaZap');
}

function pop(run, st, mods) {
  const fx = run.fx, r = B.popR * mods.area;
  spawnArea(run, { x: st.x, y: st.y, r, dmg: fusionDmg(run, B.popDmg), glow: 'fire', glowDur: 0.4, quiet: true });
  sfx('bolaPlasmaPop');
  fx.shake(FX.shakeUlt.px, FX.shakeUlt.dur * 0.5);
  fx.hitstop(FX.hitstopBig);
  fx.anim(st.x, st.y, 'fx_explosion', { scale: r / 12 * 0.8 });
  fx.anim(st.x, st.y, 'fx_lightningHit', { scale: 3 });
  for (const [c, n, s] of POP) fx.burst(st.x, st.y, c, n, s * r / B.popR);
  st.on = false; st.popT = 0; st.popR = r;
}

export default {
  id: 'bolaPlasma',
  update(run, st, level, mods, dt) {
    st.ax ??= []; st.ay ??= [];
    st.arcT = (st.arcT ?? ARC_LIFE) + dt; st.popT = (st.popT ?? POP_LIFE) + dt;
    if (st.on) {
      const dx = st.tx - st.x, dy = st.ty - st.y, d = Math.hypot(dx, dy), s = B.speed * dt;
      if (d <= s) { st.x = st.tx; st.y = st.ty; } else { st.x += dx / d * s; st.y += dy / d * s; }
      if ((st.zapIn -= dt) <= 0) { st.zapIn += B.zapEvery; zap(run, st, mods); }
      if (d <= s) pop(run, st, mods);
      return;
    }
    if (!ready(st, B.cd, mods, dt)) return;
    const q = densestCell(run, camera(run.player));
    if (!q) { st.cd = 0; return; }                          // stays charged until a crowd is in view
    st.on = true; st.x = run.player.x; st.y = run.player.y; st.tx = q.x; st.ty = q.y; st.zapIn = B.zapEvery; st.born = run.time;
    sfx('bolaPlasma');
  },
  // Over the smoke and the crowd, under the mage: the ball, its zaps, and the pop's rays.
  drawTop(ctx, run, st, level, assets, cam) {
    const seed = (run.time * 30) | 0;                       // re-kinked every other frame: it crackles
    if (st.popT < POP_LIFE) {
      const x = st.x - cam.x, y = st.y - cam.y, k = st.popT / POP_LIFE, r = st.popR * (0.4 + 0.6 * k);
      for (let i = 0; i < POP_RAYS; i++) {
        const a = i * TAU / POP_RAYS + st.x * 0.1;
        drawArc(ctx, x, y - UP, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, seed * 13 + i * 7);
      }
    }
    if (!st.on) return;
    const x = Math.round(st.x - cam.x), y = Math.round(st.y - cam.y - UP);
    if (st.arcT < ARC_LIFE) for (let i = 0; i < st.arcs; i++) drawArc(ctx, x, y, st.ax[i] - cam.x, st.ay[i] - cam.y, seed * 31 + i * 7);
    const grow = Math.min(1, (run.time - st.born) / 0.25);
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#1d1a2f';      // palette k: its shadow on the ground
    ctx.fillRect(x - 9, y + UP + 4, 18, 2); ctx.fillRect(x - 6, y + UP + 6, 12, 1);
    ctx.globalAlpha = 1;
    drawHalo(ctx, 'arcane', x, y, 4.2 * grow);
    drawHalo(ctx, 'fire', x, y, 2.2 * grow);
    for (let i = 0; i < CRACKLE; i++) {                     // lightning licking off its skin
      const a = (seed * 2.39996 + i * 2.1) % TAU, r0 = CRACKLE_R * grow;
      drawArc(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a + 0.3) * (r0 + CRACKLE_LEN), y + Math.sin(a + 0.3) * (r0 + CRACKLE_LEN), seed * 7 + i);
    }
    assets.draw(ctx, 'fu_plasma', x, y, { t: run.time * 1000, scale: grow });
  },
};
