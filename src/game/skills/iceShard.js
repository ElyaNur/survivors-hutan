// Ice Shard: a fan of shards at the nearest enemy; each pierces and slows what it passes through.
import { stat, nearestEnemy } from './index.js';
import { spawnProjectile } from '../projectiles.js';
import { applySlow } from '../../logic/combat.js';
import { sfx } from '../../engine/audio.js';

const ID = 'iceShard', DEG = Math.PI / 180;

function chill(run, p, e) {
  applySlow(e, p.slow, p.slowDur, run.time);
  run.fx.anim(p.x, p.y, 'fx_iceHit');
  run.fx.burst(p.x, p.y, '#a6f6ff', 4, 60);                 // palette c
}

export default {
  id: ID,
  update(run, st, level, mods, dt) {
    if ((st.cd = (st.cd ?? 0) - dt) > 0) return;
    const pl = run.player, range = stat(ID, 'range', level), e = nearestEnemy(run, pl.x, pl.y, range);
    if (!e) return;
    st.cd = stat(ID, 'cd', level) * mods.cooldown; sfx('ice');
    const n = stat(ID, 'shards', level), speed = stat(ID, 'speed', level), fan = stat(ID, 'fan', level) * DEG;
    const base = Math.atan2(e.y - pl.y, e.x - pl.x);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * fan;
      spawnProjectile(run, { x: pl.x, y: pl.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg: stat(ID, 'dmg', level),
        radius: stat(ID, 'size', level), pierce: stat(ID, 'pierce', level), life: range / speed, sprite: 'iceShard_fly', glow: 'ice',
        onHit: chill, slow: stat(ID, 'slow', level), slowDur: stat(ID, 'slowDur', level) });
    }
  },
};
