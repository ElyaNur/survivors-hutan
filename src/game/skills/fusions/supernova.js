// Supernova (Fireball + Frost Nova): every cd the mage flares like a dying star and a ring of star-fire rushes out of him to
// r, burning each enemy once as its front passes. Behind the front it lays rings of burning ground that die out from the
// inside, so the blast leaves a spreading wake of fire. One ring at a time: the cd runs from its end.
import TUNING from '../../../data/tuning.js';
import { damageEnemy } from '../../enemies.js';
import { spawnArea, drawHalo } from '../../projectiles.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg, ready } from './index.js';

const S = TUNING.fusions.supernova, FX = TUNING.fx, TAU = Math.PI * 2;
const MAX_ENEMY_R = 32;                                     // grid margin
const TONGUE = 8, TONGUE_UP = 7;                            // px between flame tongues round the ring; px fu_novaFlame's middle sits above its root
const TUFT_UP = 4, BURN_FADE = 0.3;                         // px fu_starfire sits above its spot; s a burning spot fades out
const EDGE = [[1, '#1d1a2f'], [0, '#ffffff'], [-1, '#a6f6ff']];   // the front: [px out from R, palette k/w/c]: ink line, white edge, ice-white inside
const SPARKS = [['#ffffff', 14, 160], ['#a6f6ff', 10, 130], ['#fff1a8', 16, 120], ['#ff9a3c', 12, 90]];   // palette w/c/y/o
const near = [];

function starfire() {}                                      // the burning spots' trigger: marks them as ours (the pool resets it)

function cast(run, st, mods) {
  const pl = run.player, fx = run.fx;
  st.on = true; st.t = 0; st.R = 0; st.laid = 0; st.Rmax = S.r * mods.area; st.x = pl.x; st.y = pl.y;
  (st.hit ??= new Set()).clear();
  sfx('supernova');
  fx.shake(FX.shakeUlt.px, FX.shakeUlt.dur * 0.6);
  fx.hitstop(FX.hitstopBig);
  fx.flashScreen('#fff1a8', 0.12);
  fx.anim(pl.x, pl.y, 'fx_ultFlash', { scale: 1.5 });
  for (const [c, n, s] of SPARKS) fx.burst(pl.x, pl.y, c, n, s);
}

// The front moves out to R: everything it has reached is hit once. ponytail: the query is the whole disc (<= one crowd,
// for expand s per cast); an annulus test would skip the inside if it ever shows in a profile.
function sweep(run, st) {
  const dmg = fusionDmg(run, S.dmg);
  near.length = 0;
  run.grid.query(st.x, st.y, st.R + MAX_ENEMY_R, near);
  for (const e of near) {
    if (e.dead || st.hit.has(e) || (e.x - st.x) ** 2 + (e.y - st.y) ** 2 > (st.R + e.r) ** 2) continue;
    st.hit.add(e);
    damageEnemy(run, e, dmg, { fromX: st.x, fromY: st.y, quiet: true });   // flung outward by the blast
  }
}

// Every burnGap px of its run, a ring of burning spots burnGap apart, each ring turned a little from the last. A ring is laid
// once the front is a spot's radius past it, so the fire never reaches ahead of the front.
function layBurn(run, st, mods) {
  const dmg = fusionDmg(run, S.burnDmg), r = S.burnR * mods.area;
  while ((st.laid + 1) * S.burnGap + r <= st.R) {
    const rr = ++st.laid * S.burnGap, n = Math.max(3, Math.round(TAU * rr / S.burnGap));
    for (let i = 0; i < n; i++) {
      const a = st.laid * 0.7 + i * TAU / n;
      spawnArea(run, { x: st.x + Math.cos(a) * rr, y: st.y + Math.sin(a) * rr, r, dmg, dur: S.burnLife, tickEvery: S.burnTick,
        quiet: true, onTrigger: starfire });
    }
  }
}

export default {
  id: 'supernova',
  update(run, st, level, mods, dt) {
    if (st.on) {
      const k = Math.min(1, (st.t += dt) / S.expand);
      st.R = st.Rmax * (1 - (1 - k) ** 2);                  // bursts out fast, slowing as it spreads
      if (st.t - dt < S.expand) { sweep(run, st); layBurn(run, st, mods); }
      if (st.t >= S.expand + S.fade) st.on = false;
      return;
    }
    if (ready(st, S.cd, mods, dt)) cast(run, st, mods);
  },
  // Above the actors, under the fx layer: the burning ground, two star-fire tufts per spot, fading as it runs out.
  draw(ctx, run, st, level, assets, cam) {
    for (const a of run.areas) {
      if (a.onTrigger !== starfire) continue;
      const x = a.x - cam.x, y = a.y - cam.y;
      if (x < -16 || y < -16 || x > cam.w + 16 || y > cam.h + 16) continue;
      const alpha = Math.min(1, (a.dur - a.age) / BURN_FADE), t = a.age * 1000 + a.x * 7;
      assets.draw(ctx, 'fu_starfire', x - 4, y - TUFT_UP, { t, alpha });
      assets.draw(ctx, 'fu_starfire', x + 4, y - TUFT_UP + 3, { t: t + 230, alpha, flip: true });
    }
  },
  // Over the smoke and the crowd, under the mage: the ring itself, a wall of star-fire on a crisp white front.
  drawTop(ctx, run, st, level, assets, cam) {
    if (!st.on) return;
    const cx = st.x - cam.x, cy = st.y - cam.y, R = st.R, w = cam.w, h = cam.h;
    const fade = Math.min(1, (S.expand + S.fade - st.t) / S.fade), t = run.time * 1000;
    if (st.t < 0.2) drawHalo(ctx, 'fire', cx, cy, 5 * (1 - st.t / 0.2) + 1);   // the star's flare at the mage
    if (R < 2) return;
    ctx.globalAlpha = fade;
    for (const [dr, color] of EDGE) {                       // the front, a run of 1 px dots (crisp, unlike arc())
      const r = R + dr;
      ctx.fillStyle = color;
      for (let a = 0; a < TAU; a += 1 / r) {
        const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
        if (x >= 0 && y >= 0 && x < w && y < h) ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    const n = Math.max(6, Math.round(TAU * R / TONGUE));
    for (let i = 0; i < n; i++) {                           // the flame wall, each tongue rooted on the front
      const a = i * TAU / n, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R - TONGUE_UP;
      if (x < -8 || y < -12 || x > w + 8 || y > h + 12) continue;
      assets.draw(ctx, 'fu_novaFlame', Math.round(x), Math.round(y), { t: t + i * 97, alpha: fade, flip: i % 2 === 1 });
    }
  },
};
