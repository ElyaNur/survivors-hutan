// Arcane Orb: orbs circle the mage and hit what they touch; each enemy can only be hit every hitCd.
import { stat } from './index.js';
import { damageEnemy } from '../enemies.js';
import { drawHalo } from '../projectiles.js';

const ID = 'arcaneOrb', TAU = Math.PI * 2, MAX_ENEMY_R = 32;
const TRAIL = [[0.22, 2, '#d3b0ff'], [0.36, 2, '#d87bff'], [0.5, 1, '#d87bff'], [0.62, 1, '#9b5de5']];   // sparks behind each orb: [radians back, px, palette l/z/v]
const near = [];

export default {
  id: ID,
  update(run, st, level, mods, dt) {
    st.hits ??= new WeakMap();                              // enemy -> time it may be hit again
    const pl = run.player, now = run.time, n = stat(ID, 'orbs', level), R = stat(ID, 'orbitR', level) * mods.area;
    const r = stat(ID, 'size', level), dmg = stat(ID, 'dmg', level), hitCd = stat(ID, 'hitCd', level), push = stat(ID, 'push', level);
    st.angle = ((st.angle ?? 0) + stat(ID, 'rotSpeed', level) * dt) % TAU;
    st.n = n; st.R = R;                                     // for draw
    for (let i = 0; i < n; i++) {
      const a = st.angle + i * TAU / n, x = pl.x + Math.cos(a) * R, y = pl.y + Math.sin(a) * R;
      near.length = 0;
      run.grid.query(x, y, r + MAX_ENEMY_R, near);
      for (const e of near) {
        const reach = r + e.r;
        if (e.dead || (e.x - x) ** 2 + (e.y - y) ** 2 > reach * reach || (st.hits.get(e) ?? 0) > now) continue;
        st.hits.set(e, now + hitCd);
        damageEnemy(run, e, dmg, { fromX: x, fromY: y, power: push });
        run.fx.burst(e.x, e.y, '#d87bff', 3, 50);           // palette z
      }
    }
  },
  draw(ctx, run, st, level, assets, cam) {
    if (!st.n) return;
    const pl = run.player, cx = pl.x - cam.x, cy = pl.y - cam.y, t = performance.now();
    for (let i = 0; i < st.n; i++) {
      const a = st.angle + i * TAU / st.n;
      for (const [back, px, color] of TRAIL) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(cx + Math.cos(a - back) * st.R), Math.round(cy + Math.sin(a - back) * st.R), px, px);
      }
      const x = cx + Math.cos(a) * st.R, y = cy + Math.sin(a) * st.R;
      drawHalo(ctx, 'arcane', x, y);
      assets.draw(ctx, 'arcaneOrb', x, y, { t: t + i * 100 });
    }
  },
};
