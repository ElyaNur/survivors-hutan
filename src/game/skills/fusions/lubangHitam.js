// Lubang Hitam (Meteor + Orb Arcane): every cd a black hole opens on the densest crowd in view. For `pull` s it drags
// everything within r toward its core (spiralling in, faster near the middle; bosses by their knock share) and gnaws at
// it, then pinches shut and collapses in one big quiet blast that flings the survivors out.
import TUNING from '../../../data/tuning.js';
import { camera } from '../../world.js';
import { damageEnemy } from '../../enemies.js';
import { drawHalo } from '../../projectiles.js';
import { densestPoint } from '../index.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg, ready } from './index.js';

const L = TUNING.fusions.lubangHitam, FX = TUNING.fx;
const MAX_ENEMY_R = 32, ART_R = 80;                         // grid margin; fu_blackHole_well / _boom are drawn for r 80
const OPEN = 0.3, PINCH = 0.3;                              // s it takes to open; s at the end it shrinks before bursting
const INFALL = 36, INFALL_LAPS = 1.1, INFALL_TURN = 4;      // dust motes spiralling in: count, falls per s each, radians turned on the way
const INFALL_COLORS = ['#9b5de5', '#d87bff', '#d3b0ff', '#ffffff'];   // palette v z l w: rim to core
const FLASH = ['#d3b0ff', 0.3];                             // palette l
const SPARKS = [['#ffffff', 8, 200], ['#d3b0ff', 12, 160], ['#d87bff', 14, 120], ['#9b5de5', 10, 80], ['#ffd23f', 5, 140]];   // palette w/l/z/v/Y
const near = [];

function pull(run, st, dt) {
  const tick = (st.tickIn -= dt) <= 0, dmg = fusionDmg(run, L.tickDmg);
  if (tick) st.tickIn += L.tickEvery;
  near.length = 0;
  run.grid.query(st.x, st.y, st.r + MAX_ENEMY_R, near);
  for (const e of near) {
    const dx = st.x - e.x, dy = st.y - e.y, d = Math.hypot(dx, dy), knock = e.def.knock ?? 1;
    if (e.dead || d > st.r + e.r) continue;
    if (d > 1 && knock > 0) {                               // x1 at the rim, x2 at the core; never past the middle
      const s = Math.min(L.pullSpeed * knock * (2 - Math.min(1, d / st.r)) * dt, d - 1), ux = dx / d, uy = dy / d;
      e.x += (ux + uy * L.swirl) * s; e.y += (uy - ux * L.swirl) * s;   // inward plus a clockwise swirl (the disc's way round)
    }
    if (tick) damageEnemy(run, e, dmg, { power: 0, quiet: true });   // no shove: it would push them back out
  }
}

function collapse(run, st) {
  const fx = run.fx, dmg = fusionDmg(run, L.collapseDmg);
  near.length = 0;
  run.grid.query(st.x, st.y, st.r + MAX_ENEMY_R, near);
  for (const e of near) {
    if (e.dead || (e.x - st.x) ** 2 + (e.y - st.y) ** 2 > (st.r + e.r) ** 2) continue;
    damageEnemy(run, e, dmg, { fromX: st.x, fromY: st.y, power: L.blastPush, quiet: true });
  }
  sfx('lubangHitamBoom');
  fx.shake(FX.shakeUlt.px, FX.shakeUlt.dur);
  fx.hitstop(FX.hitstopBig);
  fx.flashScreen(FLASH[0], FLASH[1]);
  fx.anim(st.x, st.y, 'fu_blackHole_boom', { scale: st.r / ART_R });
  for (const [c, n, s] of SPARKS) fx.burst(st.x, st.y, c, n, s * st.r / ART_R);
}

export default {
  id: 'lubangHitam',
  update(run, st, level, mods, dt) {
    if (st.on && (st.t += dt) >= L.pull) { collapse(run, st); st.on = false; }
    else if (st.on) pull(run, st, dt);
    if (st.on || !ready(st, L.cd, mods, dt)) return;       // one hole at a time: the cd runs from the collapse
    const q = densestPoint(run, camera(run.player));
    st.on = true; st.t = 0; st.tickIn = L.tickEvery; st.x = q.x; st.y = q.y; st.r = L.r * mods.area;
    sfx('lubangHitam');
    run.fx.shake(FX.shakeMeteor.px, FX.shakeMeteor.dur);
  },
  // Above the actors: the well darkens the crowd it holds, the dust and the core sit on top of them.
  draw(ctx, run, st, level, assets, cam) {
    if (!st.on) return;
    const x = st.x - cam.x, y = st.y - cam.y, t = st.t;
    if (x < -st.r || y < -st.r || x > cam.w + st.r || y > cam.h + st.r) return;
    const grow = Math.min(1, t / OPEN), pinch = Math.max(0, (t - (L.pull - PINCH)) / PINCH), k = st.r / ART_R;
    assets.draw(ctx, 'fu_blackHole_well', x, y, { t: t * 1000, scale: k * (0.5 + 0.5 * grow), alpha: grow * (1 - pinch) });
    for (let i = 0; i < INFALL; i++) {                      // dust falling in on the swirl: no particles, no allocation
      const p = (t * INFALL_LAPS + i / INFALL * 7.13) % 1, d = st.r * (1 - p) ** 1.4 * grow, a = i * 2.39996 + p * INFALL_TURN;
      ctx.globalAlpha = Math.min(1, p * 5) * (1 - pinch);
      ctx.fillStyle = INFALL_COLORS[Math.min(3, (p * 4) | 0)];
      ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), p > 0.5 ? 1 : 2, 1);
    }
    ctx.globalAlpha = 1;
    const s = grow * (1 - 0.8 * pinch * pinch);
    drawHalo(ctx, 'arcane', x, y, 3.2 * s + 0.6 * pinch * Math.sin(t * 60) ** 2, 0.7 + 0.3 * pinch);   // the rim flickers as it pinches
    assets.draw(ctx, 'fu_blackHole', x, y, { t: t * 1000, scale: s });
  },
};
