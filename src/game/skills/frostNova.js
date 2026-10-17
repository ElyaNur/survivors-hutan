// Frost Nova: every cooldown an ice ring bursts out of the mage, hurting and freezing everything within r.
import { stat, nearestEnemy } from './index.js';
import { spawnArea } from '../projectiles.js';
import { sfx } from '../../engine/audio.js';

const ID = 'frostNova';
const ART_R = 36, GLOW_DUR = 0.35;                          // fx_frostNova's ring ends at r 36 (Lv1); ground lit this long
const SPARKS = [['#ffffff', 6, 0.9], ['#a6f6ff', 10, 1.2], ['#3ccfe0', 8, 1.5]];   // [palette w/c/C, count, speed per px of r]

export default {
  id: ID,
  update(run, st, level, mods, dt) {
    if ((st.cd = (st.cd ?? 0) - dt) > 0) return;
    const pl = run.player, r = stat(ID, 'r', level) * mods.area;
    if (!nearestEnemy(run, pl.x, pl.y, r)) return;          // stays charged until something is close enough to catch
    st.cd = stat(ID, 'cd', level) * mods.cooldown; sfx('nova');
    spawnArea(run, { x: pl.x, y: pl.y, r, dmg: stat(ID, 'dmg', level), freeze: stat(ID, 'freeze', level), glow: 'ice', glowDur: GLOW_DUR });
    run.fx.anim(pl.x, pl.y, 'fx_frostNova', { scale: r / ART_R });
    for (const [c, n, s] of SPARKS) run.fx.burst(pl.x, pl.y, c, n, s * r);
  },
};
