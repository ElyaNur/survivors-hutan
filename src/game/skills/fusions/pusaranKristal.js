// Pusaran Kristal (Ice Shard + Orb Arcane): the orbs become n ice pinwheel blades whirling round the mage in a vortex of
// frost. They cut what they touch (each enemy every hitCd), and each blade keeps spraying ice shards outward, flung along
// its spin, that pierce and slow like Ice Shard's. The blades take turns, so the spray is a steady stream.
import TUNING from '../../../data/tuning.js';
import { damageEnemy } from '../../enemies.js';
import { spawnProjectile, drawHalo } from '../../projectiles.js';
import { chill } from '../iceShard.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg } from './index.js';

const K = TUNING.fusions.pusaranKristal, TAU = Math.PI * 2, MAX_ENEMY_R = 32;
const DESYNC = 110;                                         // ms between the blades' spin frames
const TRAIL = [[0.36, 4, '#ffffff'], [0.48, 3, '#a6f6ff'], [0.6, 3, '#a6f6ff'], [0.72, 2, '#3ccfe0'], [0.85, 2, '#3ccfe0'], [0.98, 1, '#2f6fc4'], [1.1, 1, '#2f6fc4']];   // [radians back, px, palette w/c/c/C/C/B/B]
const MOTES = 36, MOTE_LAPS = 0.9, MOTE_TURN = 2.2, MOTE_IN = 0.45, MOTE_OUT = 1.9;   // frost spiralling out of the vortex: count, trips/s,
                                                            // radians turned on the way, from/to share of the orbit
const MOTE_COLORS = ['#ffffff', '#a6f6ff', '#3ccfe0', '#2f6fc4'], INK = '#1d1a2f';   // palette w c C B: in to out; palette k
const near = [];

function spray(run, st, x, y, a) {
  const d = a + K.twist, vx = Math.cos(d) * K.shardSpeed, vy = Math.sin(d) * K.shardSpeed;
  spawnProjectile(run, { x, y, vx, vy, dmg: fusionDmg(run, K.shardDmg), radius: K.shardSize, pierce: K.shardPierce,
    life: K.shardRange / K.shardSpeed, sprite: 'iceShard_fly', glow: 'ice', onHit: chill, slow: K.slow, slowDur: K.slowDur });
  st.sprayed++;
  sfx('pusaranKristal');
}

export default {
  id: 'pusaranKristal',
  update(run, st, level, mods, dt) {
    st.hits ??= new WeakMap();                              // enemy -> time it may be cut again
    st.sprayIn ??= Array.from({ length: K.n }, (_, i) => (i + 1) * K.sprayEvery / K.n);   // staggered turns
    st.sprayed ??= 0;
    const pl = run.player, now = run.time, R = K.orbitR * mods.area, dmg = fusionDmg(run, K.dmg);
    st.angle = ((st.angle ?? 0) + K.rotSpeed * dt) % TAU; st.R = R;
    for (let i = 0; i < K.n; i++) {
      const a = st.angle + i * TAU / K.n, x = pl.x + Math.cos(a) * R, y = pl.y + Math.sin(a) * R;
      near.length = 0;
      run.grid.query(x, y, K.size + MAX_ENEMY_R, near);
      for (const e of near) {
        const reach = K.size + e.r;
        if (e.dead || (e.x - x) ** 2 + (e.y - y) ** 2 > reach * reach || (st.hits.get(e) ?? 0) > now) continue;
        st.hits.set(e, now + K.hitCd);
        damageEnemy(run, e, dmg, { fromX: x, fromY: y, power: K.push });
        run.fx.burst(e.x, e.y, '#a6f6ff', 3, 50);           // palette c
      }
      if ((st.sprayIn[i] -= dt) <= 0) { st.sprayIn[i] += K.sprayEvery * mods.cooldown; spray(run, st, x, y, a); }
    }
  },
  // Over the fx layer, under the mage: the vortex (frost motes spiralling out), then the blades with their frost trails.
  drawTop(ctx, run, st, level, assets, cam) {
    if (!st.R) return;
    const pl = run.player, cx = pl.x - cam.x, cy = pl.y - cam.y, R = st.R, t = run.time;
    for (let i = 0; i < MOTES; i++) {                       // no particles, no allocation: each mote's place is a function of time
      const p = (t * MOTE_LAPS + i / MOTES * 7.13) % 1, d = R * (MOTE_IN + (MOTE_OUT - MOTE_IN) * p), a = i * 2.39996 + st.angle * 0.5 + p * MOTE_TURN;
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d), w = p < 0.5 ? 2 : 1;
      ctx.globalAlpha = Math.min(1, (1 - p) * 3);
      ctx.fillStyle = INK; ctx.fillRect(x, y + 1, w, 1);   // an ink underside: a pale mote still reads over mint slimes
      ctx.fillStyle = MOTE_COLORS[Math.min(3, (p * 4) | 0)]; ctx.fillRect(x, y, w, 1);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < K.n; i++) {
      const a = st.angle + i * TAU / K.n;
      for (const [back, px, color] of TRAIL) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(cx + Math.cos(a - back) * R) - (px >> 1), Math.round(cy + Math.sin(a - back) * R) - (px >> 1), px, px);
      }
      const x = Math.round(cx + Math.cos(a) * R), y = Math.round(cy + Math.sin(a) * R);
      drawHalo(ctx, 'ice', x, y, 2.4);
      assets.draw(ctx, 'fu_iceBlade', x, y, { t: t * 1000 + i * DESYNC });
    }
  },
};
