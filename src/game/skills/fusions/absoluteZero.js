// Absolute Zero (Ice Shard + Frost Nova): ported from the v1 ultimate of the same name.
import TUNING from '../../../data/tuning.js';
import { camera } from '../../world.js';
import { damageEnemy } from '../../enemies.js';
import { sfx } from '../../../engine/audio.js';
import { ready, overlay } from './index.js';

const F = TUNING.fusions, FX = TUNING.fx, W = 480, H = 270;

// ---- Absolute Zero: every enemy in view freezes and turns brittle (takes frozenVulnMult x damage) for `freeze` s,
// and takes the blast. An ice wave rushes out of the mage across the screen; what dies on the ice shatters (enemies.js).
const AZ = F.absoluteZero;
const ICE_FLASH = ['#7cf0ff', 0.6], WAVE_T = 0.45, WAVE_R = 300, GLAZE = ['#a6f6ff', 0.14];   // palette e, c
const WAVE = [[0, 2, '#ffffff'], [3, 2, '#a6f6ff'], [7, 2, '#3ccfe0'], [12, 1, '#a6f6ff']];   // rings: [px behind the front, size, colour]

export default {
  id: 'absoluteZero',
  update(run, st, level, mods, dt) {
    if (!ready(st, AZ.cd, mods, dt)) return;
    const p = run.player, v = camera(p), until = run.time + AZ.freeze, fx = run.fx;
    st.at = run.time; st.x = p.x; st.y = p.y; sfx('ult');
    fx.flashScreen(ICE_FLASH[0], ICE_FLASH[1]);
    fx.shake(FX.shakeUlt.px, FX.shakeUlt.dur);
    fx.hitstop(FX.hitstopBig);
    for (const e of run.enemies) {
      if (e.dead || e.x < v.x || e.y < v.y || e.x >= v.x + v.w || e.y >= v.y + v.h) continue;
      e.frozenUntil = Math.max(e.frozenUntil, until); e.vulnerableUntil = until;
      fx.burst(e.x, e.y, '#a6f6ff', 2, 40);                 // palette c
      damageEnemy(run, e, AZ.hitDmg, { power: 0, quiet: true });   // ice holds it: no shove; the screen-wide blast prints sparingly
    }
  },
  draw(ctx, run, st, level, assets, cam) {
    if (st.at === undefined) return;
    const age = run.time - st.at;
    if (age < AZ.freeze) overlay(ctx, GLAZE[0], GLAZE[1] * (1 - age / AZ.freeze));   // the world glazed pale while it stays frozen
    if (age >= WAVE_T) return;
    const k = age / WAVE_T, front = WAVE_R * (1 - (1 - k) ** 2), cx = st.x - cam.x, cy = st.y - cam.y;
    ctx.globalAlpha = 1 - k * k;
    for (const [back, s, color] of WAVE) {                  // square-dot rings: crisp pixels, no anti-aliased arc
      const R = front - back;
      if (R <= 0) continue;
      ctx.fillStyle = color;
      const n = Math.ceil(2 * Math.PI * R / (back > 8 ? 4 : s));   // the trailing frost ring is dotted
      for (let i = 0; i < n; i++) {
        const a = i / n * 2 * Math.PI, x = Math.round(cx + Math.cos(a) * R), y = Math.round(cy + Math.sin(a) * R);
        if (x > -s && y > -s && x < W && y < H) ctx.fillRect(x, y, s, s);
      }
    }
    ctx.globalAlpha = 1;
  },
};
