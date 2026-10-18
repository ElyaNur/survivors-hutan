// Medan Statis (Frost Nova + Chain Lightning): a field of static crackles round the mage. Every pulse it lashes everything
// inside r and locks it in ice for a moment; then every frozen enemy in view, frozen by anything, conducts: a bolt jumps from
// it to its nearest unfrozen neighbour within arc. Ice carries the field out past its rim.
import TUNING from '../../../data/tuning.js';
import { camera } from '../../world.js';
import { damageEnemy } from '../../enemies.js';
import { drawHalo } from '../../projectiles.js';
import { drawArc } from '../chainLightning.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg, ready } from './index.js';

const M = TUNING.fusions.medanStatis, TAU = Math.PI * 2, MAX_ENEMY_R = 32;
const ART_R = 56, NODES = 4, SPIN = 0.9, RIM = 18, RIM_LIT = 0.6;   // fu_staticField is drawn for r 56; nodes riding the rim, rad/s;
                                                            // chords crackling round the rim, share lit each frame
const FLASH = 0.18, ARC_LIFE = 0.16, MAX_ARCS = 32, ZAP_ANIMS = 8;   // s the pulse front runs out; s the arcs show; arcs drawn per pulse
                                                            // (the rest only hit); hit sparks per pulse
const STATIC = [[3, '#2b3486'], [2, '#7cf0ff'], [1, '#ffffff']];   // palette M edge, e body, w core: icy static, not Petir's violet and gold
const FRONT = [[1, '#1d1a2f'], [0, '#ffffff'], [-1, '#7cf0ff']];   // the pulse front: [px out, palette k/w/e]
const near = [];

function addArc(st, x0, y0, x1, y1) {
  if (st.n >= MAX_ARCS) return;
  const a = st.arcs[st.n++];
  a[0] = x0; a[1] = y0; a[2] = x1; a[3] = y1;
}

// ponytail: one pass over every enemy per pulse, plus a grid query per frozen one in view (<= 400, about once a second);
// keep a list of the frozen if pulses ever get much faster.
function conduct(run, st) {
  const v = camera(run.player), now = run.time, dmg = fusionDmg(run, M.arcDmg), fx = run.fx, A2 = M.arc * M.arc;
  let hits = 0;
  for (const f of run.enemies) {
    if (f.dead || f.frozenUntil <= now || f.x < v.x || f.y < v.y || f.x >= v.x + v.w || f.y >= v.y + v.h) continue;
    let best = null, bd = A2;
    near.length = 0;
    run.grid.query(f.x, f.y, M.arc, near);
    for (const e of near) {
      if (e.dead || e.frozenUntil > now) continue;
      const d = (e.x - f.x) ** 2 + (e.y - f.y) ** 2;
      if (d <= bd) { bd = d; best = e; }
    }
    if (!best) continue;
    addArc(st, f.x, f.y, best.x, best.y);
    damageEnemy(run, best, dmg, { fromX: f.x, fromY: f.y, quiet: true });
    if (hits++ < ZAP_ANIMS) fx.anim(best.x, best.y, 'fx_lightningHit');
    else fx.burst(best.x, best.y, '#7cf0ff', 2, 40);        // palette e
  }
  if (hits) sfx('medanStatisArc');
}

function pulse(run, st) {
  const pl = run.player, R = st.R, until = run.time + M.freeze, dmg = fusionDmg(run, M.dmg), fx = run.fx;
  st.at = run.time; st.n = 0;
  let hits = 0;
  near.length = 0;
  run.grid.query(pl.x, pl.y, R + MAX_ENEMY_R, near);
  for (const e of near) {
    if (e.dead || (e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 > (R + e.r) ** 2) continue;
    if (hits++ % 3 === 0 && st.n < ZAP_ANIMS) { addArc(st, pl.x, pl.y, e.x, e.y); fx.anim(e.x, e.y, 'fx_lightningHit'); }   // every third: lashes spread round
    else fx.burst(e.x, e.y, '#ffffff', 2, 40);              // palette w
    damageEnemy(run, e, dmg, { power: 0, quiet: true });    // the shock locks them: no shove
    if (!e.dead) e.frozenUntil = Math.max(e.frozenUntil, until);
  }
  if (hits) sfx('medanStatis');
  conduct(run, st);
}

export default {
  id: 'medanStatis',
  update(run, st, level, mods, dt) {
    st.arcs ??= Array.from({ length: MAX_ARCS }, () => [0, 0, 0, 0]);
    st.R = M.r * mods.area; st.angle = ((st.angle ?? 0) + SPIN * dt) % TAU;
    if (ready(st, M.pulse, mods, dt)) pulse(run, st);
  },
  // Over the smoke and the crowd, under the mage: the field and its crackling rim, the nodes riding it, the pulse and its bolts.
  drawTop(ctx, run, st, level, assets, cam) {
    if (!st.R) return;
    const pl = run.player, cx = pl.x - cam.x, cy = pl.y - cam.y, R = st.R, t = run.time, seed = (t * 30) | 0;
    const age = t - (st.at ?? -1), kick = age < FLASH ? 1 - age / FLASH : 0;
    assets.draw(ctx, 'fu_staticField', cx, cy, { t: t * 1000, scale: R / ART_R, alpha: 0.85 + 0.15 * kick });
    for (let i = 0; i < RIM; i++) {                         // the rim crackles: a flickering ring of short static arcs
      if (((seed * 7 + i * 13) * 2654435761 >>> 0) / 4294967296 > RIM_LIT + 0.4 * kick) continue;
      const a0 = i * TAU / RIM - st.angle * 0.3, a1 = a0 + TAU / RIM;
      drawArc(ctx, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, cx + Math.cos(a1) * R, cy + Math.sin(a1) * R, seed * 31 + i, STATIC);
    }
    if (kick > 0) {                                         // the pulse front rushing out to the rim, crisp 1 px dots
      const r0 = R * (1 - kick * kick);
      ctx.globalAlpha = kick;
      for (const [dr, color] of FRONT) {
        const r = r0 + dr;
        if (r < 2) continue;
        ctx.fillStyle = color;
        for (let a = 0; a < TAU; a += 1 / r) ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
      }
      ctx.globalAlpha = 1;
      drawHalo(ctx, 'ice', cx, cy, 1 + 3 * kick);
    }
    for (let i = 0; i < NODES; i++) {
      const a = st.angle + i * TAU / NODES, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      drawHalo(ctx, 'ice', x, y, 1.8);
      assets.draw(ctx, 'fu_staticNode', x, y, { t: t * 1000 + i * 90 });
    }
    if (age < ARC_LIFE) for (let i = 0; i < st.n; i++) {    // this pulse's bolts: lashes from the mage, then the conductors' jumps
      const a = st.arcs[i];
      drawArc(ctx, a[0] - cam.x, a[1] - cam.y - 4, a[2] - cam.x, a[3] - cam.y - 4, seed * 17 + i * 5, STATIC);
    }
  },
};
