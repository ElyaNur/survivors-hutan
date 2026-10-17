// Meteor: a shadow marks the densest crowd in view, the rock falls in out of the sky, the blast hits
// everything within r and leaves the ground burning (burnDps for `burn` s). `count` meteors land on distinct crowds.
import TUNING from '../../data/tuning.js';
import { stat, densestCell } from './index.js';
import { spawnArea, drawHalo } from '../projectiles.js';
import { camera } from '../world.js';
import { sfx } from '../../engine/audio.js';

const ID = 'meteor', FX = TUNING.fx;
const WARN_R = 28;                                          // meteor_warn is drawn for r 28 (Lv1)
const FALL = 0.35, FROM_X = 60, FROM_Y = -170;              // s of the warning the rock is visible; where it falls from (px)
const SPACING = 1.5;                                        // several meteors: centres at least this many r apart
const TUFT_REACH = 0.85, GOLDEN = 2.39996, TUFT_DESYNC = 173;   // share of r; sunflower spread
const BURN_FADE = 0.3;                                      // fade-out s (TUNING.fx.burn: how see-through and how dense the tufts are)
const MAGE_CLEAR = 12;                                      // px around the mage left free of tufts, so fire never buries him
const BOOMS = [[0, 0, 2], [-0.55, -0.2, 1], [0.5, -0.35, 1], [0.1, 0.5, 1]];   // explosions: [dx, dy share of r, scale]
const SPARKS = [['#ffffff', 6, 180], ['#fff1a8', 12, 150], ['#ffd23f', 12, 110], ['#e8532e', 10, 80], ['#5d5a78', 8, 120]];   // palette w/y/Y/O/X (debris)

// Impact: the blast already hit (the area's own trigger); from here on the area is the burning ground.
function impact(run, a) {
  const fx = run.fx;
  sfx('meteor');
  a.dmg = a.burnDmg;
  fx.shake(FX.shakeMeteor.px, FX.shakeMeteor.dur);
  fx.hitstop(FX.hitstopBig);
  for (const [dx, dy, s] of BOOMS) fx.anim(a.x + dx * a.r, a.y + dy * a.r, 'fx_explosion', { scale: s });
  for (const [c, n, s] of SPARKS) fx.burst(a.x, a.y, c, n, s * a.r / WARN_R);
}

// Meteor areas are the ones whose trigger is ours (the pool resets onTrigger; a flag field would leak into reuse).
const mine = a => a.onTrigger === impact;
// How far along its fall a meteor's rock is (0..1, squared below so it speeds up); <= 0 = still out of sight.
// A warning shorter than FALL (Armageddon's) shows the rock for all of it.
const fallK = a => 1 - (a.delay - a.age) / Math.min(FALL, a.delay);
const ANG = Math.atan2(-FROM_Y, -FROM_X);

// Shared with Armageddon: embers off a falling rock, and the warning shadow + the rock itself (screen x, y).
export function shedEmbers(run, a) {
  const k = fallK(a);
  if (k > 0) run.fx.burst(a.x + FROM_X * (1 - k * k), a.y + FROM_Y * (1 - k * k), k < 0.5 ? '#ffd23f' : '#e8532e', 1, 20);
}
export function drawIncoming(ctx, assets, a, x, y, t) {
  assets.draw(ctx, 'meteor_warn', x, y, { t: a.age / a.delay * assets.animTotal('meteor_warn'), scale: a.r / WARN_R });   // one pass per warning
  const k = fallK(a);
  if (k <= 0) return;
  const rx = Math.round(x + FROM_X * (1 - k * k)), ry = Math.round(y + FROM_Y * (1 - k * k));
  drawHalo(ctx, 'fire', rx, ry, 1.6);
  ctx.save(); ctx.translate(rx, ry); ctx.rotate(ANG);
  assets.draw(ctx, 'meteor_fall', 0, 0, { t });
  ctx.restore();
}

export default {
  id: ID,
  update(run, st, level, mods, dt) {
    for (const a of run.areas) if (mine(a) && !a.triggered) shedEmbers(run, a);   // embers shed by the falling rocks
    if ((st.cd = (st.cd ?? 0) - dt) > 0) return;
    const view = camera(run.player), r = stat(ID, 'r', level) * mods.area, picks = [];
    for (let i = 0; i < stat(ID, 'count', level); i++) {
      const q = densestCell(run, view, picks, r * SPACING);
      if (!q) break;
      picks.push(q);
    }
    if (!picks.length) return;                              // stays charged until something is in view
    st.cd = stat(ID, 'cd', level) * mods.cooldown;
    const burn = stat(ID, 'burn', level), tick = stat(ID, 'burnTick', level);
    for (const q of picks)
      spawnArea(run, { x: q.x, y: q.y, r, dmg: stat(ID, 'dmg', level), delay: stat(ID, 'warn', level), dur: burn, tickEvery: tick,
        burnDmg: stat(ID, 'burnDps', level) * tick, tufts: Math.round(Math.PI * r * r / FX.burn.tuftArea),
        glow: 'fire', glowDur: burn, quiet: true, onTrigger: impact });   // quiet: a blast on a crowd prints sparingly
  },
  // Above the actors, so a crowd never hides them: the shadow (it falls on the monsters too), the rock, the fire
  // they stand in. The ground glow under them is the area's own (drawAreas).
  draw(ctx, run, st, level, assets, cam) {
    const t = performance.now(), px = run.player.x - cam.x, py = run.player.y - cam.y;
    for (const a of run.areas) {
      if (!mine(a)) continue;
      const x = a.x - cam.x, y = a.y - cam.y;
      if (a.triggered) {
        const age = a.age - a.delay;
        if (age >= a.dur) continue;
        const alpha = FX.burn.alpha * Math.min(1, (a.dur - age) / BURN_FADE);
        for (let k = 0; k < a.tufts; k++) {                 // sunflower spiral: even cover, no clumps, no allocation
          const d = a.r * TUFT_REACH * Math.sqrt((k + 0.5) / a.tufts), g = k * GOLDEN, tx = x + Math.cos(g) * d, ty = y + Math.sin(g) * d;
          if (Math.abs(tx - px) < MAGE_CLEAR && Math.abs(ty - py) < MAGE_CLEAR) continue;
          assets.draw(ctx, 'fx_burn', tx, ty, { t: age * 1000 + k * TUFT_DESYNC, alpha, flip: k % 2 === 1 });
        }
        continue;
      }
      drawIncoming(ctx, assets, a, x, y, t);
    }
  },
};
