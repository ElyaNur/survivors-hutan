// Benteng Es (Frost Nova + Orb Arcane): the orbs become a tight wall of ice blocks turning round the mage. Whatever touches
// it is hurt (each enemy every hitCd), frozen to the spot and shoved back. Every burstEvery s the wall blasts outward to
// burstR, hitting each enemy once as its blocks pass, then shatters and grows back round the mage. One burst at a time:
// the cd runs from its end.
import TUNING from '../../../data/tuning.js';
import { damageEnemy } from '../../enemies.js';
import { drawHalo } from '../../projectiles.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg, ready } from './index.js';

const K = TUNING.fusions.bentengEs, FX = TUNING.fx, TAU = Math.PI * 2, MAX_ENEMY_R = 32;
const BLOCKS = 12, SPIN = 0.7, UP = 7, GROW = 0.3;          // ice blocks in the wall; rad/s it turns; px fu_iceWall stands above its spot; s it takes to grow back
const GROUND = [[1, '#1d1a2f'], [0, '#a6f6ff']];            // the frost line the wall stands on: [px down, palette k/c]
const FRONT = [[2, '#1d1a2f'], [1, '#ffffff'], [0, '#ffffff'], [-1, '#a6f6ff'], [-2, '#a6f6ff'], [-3, '#3ccfe0'], [-5, '#3ccfe0']];   // the burst
                                                            // front, a frost band: [px out, palette k/w/w/c/c/C/C]
const CHIPS = 40, CHIP = ['#ffffff', '#a6f6ff', '#3ccfe0'];  // ice chips flung along the front (palette w c C), and their colours
const TRAIL = [[4, 3, '#ffffff'], [8, 2, '#a6f6ff'], [13, 2, '#3ccfe0'], [19, 1, '#2f6fc4']];   // behind a flying block: [px back, px, palette w/c/C/B]
const SPARKS = [['#ffffff', 10, 150], ['#a6f6ff', 14, 120], ['#3ccfe0', 8, 90]];   // palette w/c/C
const near = [];

function touch(run, st) {
  const pl = run.player, now = run.time, dmg = fusionDmg(run, K.dmg);
  near.length = 0;
  run.grid.query(pl.x, pl.y, st.R + K.thick + MAX_ENEMY_R, near);
  for (const e of near) {
    const reach = st.R + K.thick + e.r;                     // the wall and everything inside it
    if (e.dead || (e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 > reach * reach || (st.hits.get(e) ?? 0) > now) continue;
    st.hits.set(e, now + K.hitCd);
    damageEnemy(run, e, dmg, { fromX: pl.x, fromY: pl.y, power: K.push });
    if (!e.dead) e.frozenUntil = Math.max(e.frozenUntil, now + K.freeze);
    run.fx.burst(e.x, e.y, '#a6f6ff', 3, 50);               // palette c
  }
}

function burst(run, st, mods) {
  const pl = run.player, fx = run.fx;
  st.on = true; st.t = 0; st.front = st.R; st.BR = K.burstR * mods.area;
  (st.hit ??= new Set()).clear();
  sfx('bentengEs');
  fx.shake(FX.shakeMeteor.px * 1.5, FX.shakeMeteor.dur * 2);
  fx.hitstop(FX.hitstopBig);
  for (const [c, n, s] of SPARKS) fx.burst(pl.x, pl.y, c, n, s);
}

// The blocks fly out to front: everything it has reached is hit once.
function sweep(run, st) {
  const pl = run.player, F = st.front, dmg = fusionDmg(run, K.burstDmg), until = run.time + K.burstFreeze;
  near.length = 0;
  run.grid.query(pl.x, pl.y, F + MAX_ENEMY_R, near);
  for (const e of near) {
    if (e.dead || st.hit.has(e) || (e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 > (F + e.r) ** 2) continue;
    st.hit.add(e);
    damageEnemy(run, e, dmg, { fromX: pl.x, fromY: pl.y, power: K.burstPush, quiet: true });
    if (!e.dead) e.frozenUntil = Math.max(e.frozenUntil, until);
  }
}

// At burstR every block shatters; the wall grows back round the mage.
function shatter(run, st) {
  const pl = run.player, fx = run.fx;
  for (let i = 0; i < BLOCKS; i++) {
    const a = st.angle + i * TAU / BLOCKS, x = pl.x + Math.cos(a) * st.front, y = pl.y + Math.sin(a) * st.front - UP;
    fx.anim(x, y, 'fx_shatter');
    fx.burst(x, y, '#a6f6ff', 4, 60);                       // palette c
  }
  st.on = false; st.grownAt = run.time;
  sfx('bentengEsRise');
}

export default {
  id: 'bentengEs',
  update(run, st, level, mods, dt) {
    st.hits ??= new WeakMap();                              // enemy -> time the wall may bite it again
    st.grownAt ??= run.time;                                // grows in on the pick
    st.cd ??= K.burstEvery * mods.cooldown;                 // the first burst waits a full turn
    st.R = K.ringR * mods.area; st.angle = ((st.angle ?? 0) + SPIN * dt) % TAU;
    if (st.on) {
      const k = Math.min(1, (st.t += dt) / K.burstTime);
      st.front = st.R + (st.BR - st.R) * (1 - (1 - k) ** 2);   // blasts out fast, slowing as it spreads
      sweep(run, st);
      if (k >= 1) shatter(run, st);
      return;
    }
    touch(run, st);
    if (ready(st, K.burstEvery, mods, dt)) burst(run, st, mods);
  },
  // Over the smoke and the crowd, under the mage: the wall on its frost line, or its blocks flying out on a crisp front.
  drawTop(ctx, run, st, level, assets, cam) {
    if (!st.R) return;
    const pl = run.player, cx = pl.x - cam.x, cy = pl.y - cam.y, t = run.time * 1000, w = cam.w, h = cam.h;
    if (st.on) {
      const F = st.front, k = st.t / K.burstTime;
      ctx.globalAlpha = 1 - 0.4 * k;
      for (const [dr, color] of FRONT) {                    // the front: crisp 1 px dots
        const r = F + dr;
        ctx.fillStyle = color;
        for (let a = 0; a < TAU; a += 1 / r) {
          const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
          if (x >= 0 && y >= 0 && x < w && y < h) ctx.fillRect(x, y, 1, 1);
        }
      }
      for (let i = 0; i < CHIPS; i++) {                     // chips tumbling just ahead of and behind the front
        const a = st.angle * 2 + i * 2.39996, r = F + ((i * 7) % 13) - 6, px = 1 + (i % 3 === 0);
        ctx.fillStyle = CHIP[i % 3];
        ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r) - (i % 5), px, px);
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < BLOCKS; i++) {
        const a = st.angle + i * TAU / BLOCKS, ux = Math.cos(a), uy = Math.sin(a), x = cx + ux * F, y = cy + uy * F;
        for (const [back, px, color] of TRAIL) {
          ctx.fillStyle = color;
          ctx.fillRect(Math.round(x - ux * back) - (px >> 1), Math.round(y - uy * back - UP) - (px >> 1), px, px);
        }
        drawHalo(ctx, 'ice', x, y - UP, 2);
        assets.draw(ctx, 'fu_iceWall', x, y - UP, { t: t + i * 130, scale: 1.5 });
      }
      return;
    }
    const R = st.R, grow = Math.min(1, (run.time - st.grownAt) / GROW);
    for (const [dy, color] of GROUND) {                     // the frost line under the wall
      ctx.fillStyle = color;
      for (let a = 0; a < TAU; a += 1 / R) ctx.fillRect(Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R) + dy, 1, 1);
    }
    for (let back = 1; back >= 0; back--) for (let i = 0; i < BLOCKS; i++) {   // the far half first, so the near blocks stand in front
      const a = st.angle + i * TAU / BLOCKS, s = Math.sin(a);
      if ((s < 0) !== (back === 1)) continue;
      const x = cx + Math.cos(a) * R, y = cy + s * R;
      if (i % 2 === 0) drawHalo(ctx, 'ice', x, y - UP, 1.3, 0.7);
      assets.draw(ctx, 'fu_iceWall', x, y - UP * grow, { t: t + i * 130, scale: 0.4 + 0.6 * grow });
    }
  },
};
