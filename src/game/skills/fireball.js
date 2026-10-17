// Fireball: balls at the nearest enemy (fanned when several), each blows up on the first hit.
import { stat, nearestEnemy } from './index.js';
import { spawnProjectile, spawnArea } from '../projectiles.js';
import { sfx } from '../../engine/audio.js';

const ID = 'fireball', DEG = Math.PI / 180;
const ART_R = 12, GLOW_DUR = 0.2;                           // fx_explosion is 24 px across; ground lit this long
const SPARKS = [['#fff1a8', 6, 120], ['#ffd23f', 8, 90], ['#e8532e', 6, 50]];   // [palette y/Y/O, count, speed]

// The ball itself deals nothing: the blast hits its target and everything around it.
function boom(run, p) {
  const fx = run.fx;
  spawnArea(run, { x: p.x, y: p.y, r: p.boomR, dmg: p.boomDmg, glow: 'fire', glowDur: GLOW_DUR });
  fx.anim(p.x, p.y, 'fx_explosion', { scale: Math.max(1, p.boomR / ART_R) });
  for (const [c, n, s] of SPARKS) fx.burst(p.x, p.y, c, n, s);
}

export default {
  id: ID,
  update(run, st, level, mods, dt) {
    if ((st.cd = (st.cd ?? 0) - dt) > 0) return;
    const pl = run.player, range = stat(ID, 'range', level), e = nearestEnemy(run, pl.x, pl.y, range);
    if (!e) return;                                         // stays charged until something is in range
    st.cd = stat(ID, 'cd', level) * mods.cooldown; sfx('fireball');
    const n = stat(ID, 'count', level), speed = stat(ID, 'speed', level), spread = stat(ID, 'spread', level) * DEG;
    const base = Math.atan2(e.y - pl.y, e.x - pl.x), boomR = stat(ID, 'boomR', level) * mods.area, boomDmg = stat(ID, 'dmg', level);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * spread;
      spawnProjectile(run, { x: pl.x, y: pl.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg: 0,
        radius: stat(ID, 'size', level), life: range / speed, sprite: 'fireball_fly', glow: 'fire', onHit: boom, boomR, boomDmg });
    }
  },
};
