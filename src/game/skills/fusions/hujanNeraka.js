// Hujan Neraka (Fireball + Meteor): ported from the v1 Armageddon ultimate.
import TUNING from '../../../data/tuning.js';
import { camera } from '../../world.js';
import { spawnArea } from '../../projectiles.js';
import { shedEmbers, drawIncoming } from '../meteor.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg, ready, envelope, overlay } from './index.js';

const F = TUNING.fusions, FX = TUNING.fx, H = 270;

// ---- Hujan Neraka: for dur, rate meteors/s rain on random points of the view, each after a short shadow.
// The sky burns red and the ground never stops shaking.
const ARM = F.hujanNeraka, TOTAL = ARM.rate * ARM.dur;
const SKY_BURN = ['#ff7a50', 0.7];                         // multiplied over the world: the grass goes scorched olive, not pink
const SKY = '#e8532e', SKY_BANDS = [[H, 0.1], [90, 0.12], [36, 0.12]];   // palette O wash; [band height from the top, alpha]: redder up high
const SKY_FADE = 0.4, SKY_PULSE = 0.12, GLOW_DUR = 0.5;
const BOOMS = [[0, 0, 1.6], [-0.5, -0.25, 1], [0.45, -0.3, 1], [0.1, 0.45, 1]];   // [dx, dy share of r, scale]
const SPARKS = [['#ffffff', 5, 170], ['#fff1a8', 8, 140], ['#ffd23f', 8, 100], ['#e8532e', 6, 70], ['#5d5a78', 5, 110]];   // palette w/y/Y/O/X

function boom(run, a) {
  const fx = run.fx;
  sfx('meteor');
  fx.shake(FX.shakeUlt.px, FX.shakeUlt.dur);
  for (const [dx, dy, s] of BOOMS) fx.anim(a.x + dx * a.r, a.y + dy * a.r, 'fx_explosion', { scale: s });
  for (const [c, n, s] of SPARKS) fx.burst(a.x, a.y, c, n, s * a.r / 28);
}
const armMeteor = a => a.onTrigger === boom;                // the pool resets onTrigger, so this never leaks into reuse

export default {
  id: 'hujanNeraka',
  update(run, st, level, mods, dt) {
    for (const a of run.areas) if (armMeteor(a) && !a.triggered) shedEmbers(run, a);
    if (ready(st, ARM.cd, mods, dt)) { st.t = 0; st.n = 0; sfx('ult'); run.fx.shake(FX.shakeUlt.px, FX.shakeUlt.dur); }
    if (st.t === undefined || st.t > ARM.dur + ARM.warn) return;
    const v = camera(run.player), want = Math.min(TOTAL, Math.floor(st.t * ARM.rate) + 1);   // exactly rate x dur, the first at once
    for (; st.n < want; st.n++)
      spawnArea(run, { x: v.x + run.rng.next() * v.w, y: v.y + run.rng.next() * v.h, r: ARM.r * mods.area, dmg: fusionDmg(run, ARM.dmg),
        delay: ARM.warn, glow: 'fire', glowDur: GLOW_DUR, quiet: true, onTrigger: boom });
    st.t += dt;
  },
  draw(ctx, run, st, level, assets, cam) {
    if (st.t === undefined) return;
    const k = envelope(st.t, ARM.dur + ARM.warn, SKY_FADE) * (1 - SKY_PULSE + SKY_PULSE * Math.sin(st.t * 9));
    overlay(ctx, SKY_BURN[0], SKY_BURN[1] * k, H, 'multiply');
    for (const [h, a] of SKY_BANDS) overlay(ctx, SKY, a * k, h);
    const t = run.time * 1000;
    for (const a of run.areas) if (armMeteor(a) && !a.triggered) drawIncoming(ctx, assets, a, a.x - cam.x, a.y - cam.y, t);
  },
};
