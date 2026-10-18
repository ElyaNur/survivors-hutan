// Cincin Matahari (Fireball + Orb Arcane): the orbs become n small suns circling the mage. They burn what they touch
// (each enemy every hitCd), and each sun throws a fireball every fireEvery s: at the nearest enemy on its outer side,
// else straight out. The suns take turns, so the ring fires a steady stream instead of volleys.
import TUNING from '../../../data/tuning.js';
import { damageEnemy } from '../../enemies.js';
import { spawnProjectile, drawHalo } from '../../projectiles.js';
import { boom } from '../fireball.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg } from './index.js';

const C = TUNING.fusions.cincinMatahari, TAU = Math.PI * 2, MAX_ENEMY_R = 32;
const SHOT_R = 4, HALO = 1.8, DESYNC = 170;                 // shot hit radius px; sun halo scale; ms between the suns' flicker
const TRAIL = [[0.16, 2, '#fff1a8'], [0.28, 2, '#ffd23f'], [0.4, 2, '#ff9a3c'], [0.52, 1, '#ff9a3c'], [0.64, 1, '#e8532e']];   // [radians back, px, palette y/Y/o/o/O]
const EMBERS = 8, EMBER = ['#ffd23f', '#ff9a3c'];           // embers shed per s per sun (palette Y, o)
const RING_DOTS = 48, RING = ['#ffd23f', 0.3], RING_TURN = -0.3;   // the faint golden orbit: dots, colour + alpha, share of the suns' spin
const near = [];

// ponytail: linear scan, n shots per fireEvery over <= 400 enemies; grid if suns or fire rate grow a lot.
function outerTarget(run, x, y, ox, oy) {
  let best = null, bd = C.shotRange * C.shotRange;
  for (const e of run.enemies) {
    const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
    if (!e.dead && dx * ox + dy * oy > 0 && d < bd) { bd = d; best = e; }
  }
  return best;
}

function shoot(run, mods, x, y, ox, oy) {
  const e = outerTarget(run, x, y, ox, oy), a = e ? Math.atan2(e.y - y, e.x - x) : Math.atan2(oy, ox);
  spawnProjectile(run, { x, y, vx: Math.cos(a) * C.shotSpeed, vy: Math.sin(a) * C.shotSpeed, dmg: 0, radius: SHOT_R,
    life: C.shotRange / C.shotSpeed, sprite: 'fireball_fly', glow: 'fire', onHit: boom,
    boomR: C.boomR * mods.area, boomDmg: fusionDmg(run, C.shotDmg) });
  run.fx.burst(x, y, '#fff1a8', 3, 50);                     // palette y: the sun spits
  sfx('cincinMatahari');
}

export default {
  id: 'cincinMatahari',
  update(run, st, level, mods, dt) {
    st.hits ??= new WeakMap();                              // enemy -> time it may burn again
    st.fireIn ??= Array.from({ length: C.n }, (_, i) => (i + 1) * C.fireEvery / C.n);   // staggered turns
    const pl = run.player, now = run.time, R = C.orbitR * mods.area, dmg = fusionDmg(run, C.dmg);
    st.angle = ((st.angle ?? 0) + C.rotSpeed * dt) % TAU; st.R = R;
    for (let i = 0; i < C.n; i++) {
      const a = st.angle + i * TAU / C.n, ox = Math.cos(a), oy = Math.sin(a), x = pl.x + ox * R, y = pl.y + oy * R;
      near.length = 0;
      run.grid.query(x, y, C.size + MAX_ENEMY_R, near);
      for (const e of near) {
        const reach = C.size + e.r;
        if (e.dead || (e.x - x) ** 2 + (e.y - y) ** 2 > reach * reach || (st.hits.get(e) ?? 0) > now) continue;
        st.hits.set(e, now + C.hitCd);
        damageEnemy(run, e, dmg, { fromX: x, fromY: y, power: C.push });
        run.fx.burst(e.x, e.y, '#ff9a3c', 3, 50);           // palette o
      }
      if ((st.fireIn[i] -= dt) <= 0) { st.fireIn[i] += C.fireEvery * mods.cooldown; shoot(run, mods, x, y, ox, oy); }
      if (Math.random() < EMBERS * dt) run.fx.burst(x, y, EMBER[i & 1], 1, 16);
    }
  },
  draw(ctx, run, st, level, assets, cam) {
    if (!st.R) return;
    const pl = run.player, cx = pl.x - cam.x, cy = pl.y - cam.y, R = st.R, t = performance.now();
    ctx.globalAlpha = RING[1]; ctx.fillStyle = RING[0];
    for (let k = 0; k < RING_DOTS; k++) {
      const a = k * TAU / RING_DOTS + st.angle * RING_TURN;
      ctx.fillRect(Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R), 1, 1);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < C.n; i++) {
      const a = st.angle + i * TAU / C.n;
      for (const [back, px, color] of TRAIL) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(cx + Math.cos(a - back) * R) - (px >> 1), Math.round(cy + Math.sin(a - back) * R) - (px >> 1), px, px);
      }
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      drawHalo(ctx, 'fire', x, y, HALO);
      assets.draw(ctx, 'fu_sun', x, y, { t: t + i * DESYNC });
    }
  },
};
