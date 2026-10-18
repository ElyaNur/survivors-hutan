// Phoenix Api-Es (Fireball + Ice Shard): a firebird loops round the mage. Its fire wing drops a burning trail on the outer
// side, its ice wing a slowing frost trail on the inner side. Every diveEvery s it dives through the densest crowd in view
// and blows up in fire and ice, then is reborn out of a burst of flame back on its loop.
import TUNING from '../../../data/tuning.js';
import { camera } from '../../world.js';
import { spawnArea, drawHalo } from '../../projectiles.js';
import { densestCell } from '../index.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg } from './index.js';

const P = TUNING.fusions.phoenix, FX = TUNING.fx, TAU = Math.PI * 2;
const FLAT = 0.6, ALT = 18;                                 // the loop seen from above (squashed); px the bird flies over its ground point
const REBORN = 0.4, NOVA_R = 36;                            // s it takes to flare back in; fx_frostNova's art radius
const DIVE = [[0.18, 0.12], [0.12, 0.25], [0.06, 0.45], [0, 1]];   // the diving bird and its afterimages: [s behind, alpha]
const SHADOW = [[-5, 10], [-8, 16], [-5, 10]];              // ground shadow rows: [x offset, width]
const BURN_FADE = 0.3, TUFT_UP = 5;                         // s a trail tuft fades out; px its sprite sits above the spot
const SPARKS = [['#ffffff', 8, 190], ['#fff1a8', 10, 150], ['#ff9a3c', 12, 110], ['#a6f6ff', 12, 150], ['#3ccfe0', 8, 100]];   // palette w/y/o/c/C
const REBIRTH = [['#fff1a8', 10, 90], ['#ff9a3c', 8, 70]];   // palette y/o
const EMBERS = 14;                                          // wing embers and frost flakes shed per s

// Trail spots are areas whose trigger is one of these (the pool resets onTrigger, so nothing leaks into reuse).
function fireTrail() {}
function iceTrail() {}

// Ground point and heading on the loop at angle a.
function onLoop(run, st, mods) {
  const pl = run.player, R = P.loopR * mods.area, c = Math.cos(st.a), s = Math.sin(st.a);
  st.x = pl.x + c * R; st.y = pl.y + s * R * FLAT; st.alt = ALT;
  st.hx = -s; st.hy = c * FLAT;
}

function reborn(run, st, mods) {
  onLoop(run, st, mods);
  st.born = 0; st.diving = false; st.diveIn = P.diveEvery * mods.cooldown;
  run.fx.anim(st.x, st.y - st.alt, 'fx_ultFlash');
  for (const [c, n, s] of REBIRTH) run.fx.burst(st.x, st.y - st.alt, c, n, s);
  sfx('phoenix');
}

// One spot under each wing, span px either side of the flight line: fire on the outer side, ice on the inner.
function dropTrails(run, st, mods) {
  const n = Math.hypot(st.hx, st.hy) || 1, ox = st.hy / n * P.span, oy = -st.hx / n * P.span, r = P.trailR * mods.area;
  spawnArea(run, { x: st.x + ox, y: st.y + oy, r, dmg: fusionDmg(run, P.burnDmg), dur: P.trailLife, tickEvery: P.trailTick,
    quiet: true, onTrigger: fireTrail });
  spawnArea(run, { x: st.x - ox, y: st.y - oy, r, slow: P.slow, slowDur: P.slowDur, dur: P.trailLife, tickEvery: P.trailTick,
    onTrigger: iceTrail });
}

function explode(run, st, mods) {
  const fx = run.fx, r = P.diveR * mods.area;
  spawnArea(run, { x: st.tx, y: st.ty, r, dmg: fusionDmg(run, P.diveDmg), slow: P.slow, slowDur: P.slowDur, glow: 'fire',
    glowDur: 0.5, quiet: true });
  sfx('phoenixBoom');
  fx.shake(FX.shakeUlt.px, FX.shakeUlt.dur * 0.6);
  fx.hitstop(FX.hitstopBig);
  fx.anim(st.tx, st.ty, 'fx_explosion', { scale: 2.4 });
  fx.anim(st.tx, st.ty, 'fx_frostNova', { scale: r / NOVA_R });
  for (const [c, n, s] of SPARKS) fx.burst(st.tx, st.ty, c, n, s * r / P.diveR);
}

export default {
  id: 'phoenix',
  update(run, st, level, mods, dt) {
    if (st.a === undefined) { st.a = 0; st.dropIn = 0; reborn(run, st, mods); }   // the fusion fires: the bird is born
    st.born += dt;
    if (st.diving) {
      const k = Math.min(1, (st.t += dt) / P.diveTime), e = k * k;   // speeding up all the way down
      const x = st.x0 + (st.tx - st.x0) * e, y = st.y0 + (st.ty - st.y0) * e;
      st.hx = x - st.x; st.hy = y - st.y; st.x = x; st.y = y; st.alt = ALT * (1 - e);
      if (k >= 1) { explode(run, st, mods); reborn(run, st, mods); }
    } else {
      st.a = (st.a + P.loopSpeed * dt) % TAU;
      onLoop(run, st, mods);
      if ((st.diveIn -= dt) <= 0) {
        const q = densestCell(run, camera(run.player));
        if (q) { st.diving = true; st.t = 0; st.x0 = st.x; st.y0 = st.y; st.tx = q.x; st.ty = q.y; sfx('phoenixDive'); }
        else st.diveIn = 0;                                 // stays charged until a crowd is in view
      }
    }
    if ((st.dropIn -= dt) <= 0) { st.dropIn += P.trailEvery; dropTrails(run, st, mods); }
    if (Math.random() < EMBERS * dt) run.fx.burst(st.x, st.y - st.alt, Math.random() < 0.5 ? '#ff9a3c' : '#a6f6ff', 1, 24);   // palette o / c
  },
  // Above the actors, under the fx layer: the trails, a flame tuft or a frost tuft per spot, fading as it runs out.
  draw(ctx, run, st, level, assets, cam) {
    for (const a of run.areas) {
      const fire = a.onTrigger === fireTrail;
      if (!fire && a.onTrigger !== iceTrail) continue;
      const x = a.x - cam.x, y = a.y - cam.y;
      if (x < -16 || y < -16 || x > cam.w + 16 || y > cam.h + 16) continue;
      assets.draw(ctx, fire ? 'fx_burn' : 'fu_frost', x, y - TUFT_UP,
        { t: a.age * 1000 + a.x * 7, alpha: Math.min(1, (a.dur - a.age) / BURN_FADE), flip: (a.x | 0) % 2 === 1 });
    }
  },
  // Over the smoke and the crowd, under the mage: the bird always reads.
  drawTop(ctx, run, st, level, assets, cam) {
    if (st.a === undefined) return;
    const x = Math.round(st.x - cam.x), y = Math.round(st.y - cam.y), by = y - Math.round(st.alt);
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#1d1a2f';      // palette k: its shadow on the ground
    SHADOW.forEach(([ox, w], i) => ctx.fillRect(x + ox, y + i, w, 1));
    ctx.globalAlpha = 1;
    const grow = Math.min(1, st.born / REBORN), face = st.hx < 0 ? -1 : 1;
    drawHalo(ctx, 'fire', x - face * 3, by - 4, 2.6 * grow);
    drawHalo(ctx, 'ice', x + face * 4, by - 6, 1.8 * grow);
    if (!st.diving) { assets.draw(ctx, 'fu_phoenix', x, by, { t: run.time * 1000, flip: face < 0, scale: grow }); return; }
    const ang = Math.atan2(st.ty - st.y0 + ALT, Math.abs(st.tx - st.x0));   // nose down the dive, wings raised
    for (const [back, alpha] of DIVE) {
      const e = Math.max(0, st.t - back) / P.diveTime, k = e * e;
      const gx = st.x0 + (st.tx - st.x0) * k - cam.x, gy = st.y0 + (st.ty - st.y0) * k - cam.y - ALT * (1 - k);
      ctx.save(); ctx.translate(Math.round(gx), Math.round(gy)); ctx.scale(face, 1); ctx.rotate(ang);
      assets.draw(ctx, 'fu_phoenix', 0, 0, { alpha });
      ctx.restore();
    }
  },
};
