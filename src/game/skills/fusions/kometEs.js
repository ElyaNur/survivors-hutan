// Komet Es (Meteor + Ice Shard): every cd an ice comet streaks down onto the densest crowd in view. Its impact hits and
// freezes everything within r; its head sticks in the ice for `shatter` s, cracking, then bursts into `shards` ice shards
// flying out in every direction, each piercing and slowing what it passes.
import TUNING from '../../../data/tuning.js';
import { camera } from '../../world.js';
import { spawnArea, spawnProjectile, drawHalo } from '../../projectiles.js';
import { applySlow } from '../../../logic/combat.js';
import { densestCell } from '../index.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg, ready } from './index.js';

const K = TUNING.fusions.kometEs, FX = TUNING.fx, TAU = Math.PI * 2;
const WARN_R = 28, NOVA_R = 36;                             // fu_iceWarn / fx_frostNova art radii
const FALL = 0.4, FROM_X = 80, FROM_Y = -200, ANG = Math.atan2(-FROM_Y, -FROM_X);   // s of the warning the comet is seen; where it falls from
const CORE_UP = 6, SHARD_R = 3, HEAD = 14;                  // fu_comet_core drawn this far above the spot; shard hit radius; fu_comet's head, px ahead of its middle
const IMPACT = [['#ffffff', 10, 170], ['#a6f6ff', 16, 130], ['#3ccfe0', 12, 90], ['#2f6fc4', 6, 60]];   // palette w/c/C/B
const BURST = [['#ffffff', 8, 140], ['#a6f6ff', 10, 110]];  // palette w, c

const fallK = a => 1 - (a.delay - a.age) / FALL;            // 0..1 along its fall; <= 0 still out of sight

function impact(run, a) {
  const fx = run.fx;
  sfx('kometEs');
  fx.shake(FX.shakeUlt.px, FX.shakeUlt.dur * 0.5);
  fx.hitstop(FX.hitstopBig);
  fx.flashScreen('#a6f6ff', 0.15);
  fx.anim(a.x, a.y, 'fx_frostNova', { scale: a.r / NOVA_R });
  for (const [c, n, s] of IMPACT) fx.burst(a.x, a.y, c, n, s * a.r / K.r);
}
const mine = a => a.onTrigger === impact;                   // the pool resets onTrigger, so this never leaks into reuse

function chill(run, p, e) {
  applySlow(e, K.slow, K.slowDur, run.time);
  run.fx.anim(p.x, p.y, 'fx_iceHit');
}

// The head bursts: shards out in every direction, evenly spaced from a turned start.
function burst(run, a) {
  const fx = run.fx, dmg = fusionDmg(run, K.shardDmg), a0 = a.x * 0.37;
  for (let i = 0; i < K.shards; i++) {
    const ang = a0 + i * TAU / K.shards;
    spawnProjectile(run, { x: a.x, y: a.y, vx: Math.cos(ang) * K.shardSpeed, vy: Math.sin(ang) * K.shardSpeed, dmg, radius: SHARD_R,
      pierce: K.shardPierce, life: K.shardRange / K.shardSpeed, sprite: 'iceShard_fly', glow: 'ice', onHit: chill });
  }
  fx.anim(a.x, a.y - CORE_UP, 'fx_shatter', { scale: 2 });
  for (const [c, n, s] of BURST) fx.burst(a.x, a.y - CORE_UP, c, n, s);
  sfx('kometEsBurst');
}

export default {
  id: 'kometEs',
  update(run, st, level, mods, dt) {
    for (const a of run.areas) {
      if (!mine(a)) continue;
      if (!a.triggered) { const k = fallK(a); if (k > 0) run.fx.burst(a.x + FROM_X * (1 - k * k), a.y + FROM_Y * (1 - k * k), '#a6f6ff', 1, 20); }
      else if (!a.burst && a.age - a.delay >= K.shatter) { a.burst = true; burst(run, a); }
    }
    if (!ready(st, K.cd, mods, dt)) return;
    const q = densestCell(run, camera(run.player));
    if (!q) { st.cd = 0; return; }                          // stays charged until a crowd is in view
    spawnArea(run, { x: q.x, y: q.y, r: K.r * mods.area, dmg: fusionDmg(run, K.dmg), delay: K.warn, freeze: K.freeze,
      glow: 'ice', glowDur: K.shatter + 0.2, quiet: true, onTrigger: impact, burst: false });   // lives on (glow) until the head bursts
  },
  // Above the actors: the warnings.
  draw(ctx, run, st, level, assets, cam) {
    for (const a of run.areas) if (mine(a) && !a.triggered)
      assets.draw(ctx, 'fu_iceWarn', a.x - cam.x, a.y - cam.y, { t: a.age / a.delay * assets.animTotal('fu_iceWarn'), scale: a.r / WARN_R });
  },
  // Over the smoke and the crowd, under the mage: the falling comet, then its head stuck in the ice.
  drawTop(ctx, run, st, level, assets, cam) {
    for (const a of run.areas) {
      if (!mine(a)) continue;
      const x = a.x - cam.x, y = a.y - cam.y;
      if (a.triggered) {
        if (a.burst) continue;
        drawHalo(ctx, 'ice', x, y - CORE_UP, 3);
        const n = assets.animTotal('fu_comet_core');
        assets.draw(ctx, 'fu_comet_core', x, y - CORE_UP, { t: Math.min(n - 1, (a.age - a.delay) / K.shatter * n) });
        continue;
      }
      const k = fallK(a);
      if (k <= 0) continue;
      const cx = Math.round(x + FROM_X * (1 - k * k)), cy = Math.round(y + FROM_Y * (1 - k * k));
      drawHalo(ctx, 'ice', cx, cy, 2.4);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ANG);
      assets.draw(ctx, 'fu_comet', -HEAD, 0, { t: run.time * 1000 });   // the head (not the sprite's middle) on the fall line
      ctx.restore();
    }
  },
};
