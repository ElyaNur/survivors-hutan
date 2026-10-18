// Penghakiman Langit (Meteor + Chain Lightning): every cd the sky darkens and `pillars` rune marks light up under random
// enemies in view. One after another, a pillar of lightning slams down on each mark (dmg within r), and from its foot a
// bolt chains on through `jumps` more enemies, like Petir Berantai.
import TUNING from '../../../data/tuning.js';
import { spawnArea } from '../../projectiles.js';
import { strike, ageBolts, drawBolts, drawArc } from '../chainLightning.js';
import { nearestEnemy, randomOnScreenEnemy } from '../index.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg, ready, envelope, overlay } from './index.js';

const L = TUNING.fusions.penghakimanLangit, FX = TUNING.fx;
const WARN_R = 22, HIT_R = 12;                              // fu_skyWarn is drawn for r 22; fu_pillarHit's ring for r 12
const LIFE = 0.3, TOP = -12;                                // s a pillar stands; screen y it comes down from (above the view)
const COLUMN = [[19, '#9b5de5', 0.4], [11, '#d3b0ff', 0.75], [5, '#ffffff', 1]];   // the shaft: [px wide, palette v/l/w, alpha]
const DARK = ['#1d1a2f', 0.3], DARK_FADE = 0.15;            // palette k: the sky darkens over the cast
const SPARKS = [['#ffffff', 8, 140], ['#fff1a8', 10, 110], ['#d3b0ff', 8, 90]];   // palette w/y/l

// A pillar lands: its area has hit everything within r; the bolt chains on from the nearest enemy to its foot.
function land(run, a) {
  const fx = run.fx;
  sfx('penghakimanLangit');
  fx.shake(FX.shakeMeteor.px, FX.shakeMeteor.dur);
  fx.anim(a.x, a.y, 'fu_pillarHit', { scale: Math.max(1, a.r / HIT_R * 0.6) });
  for (const [c, n, s] of SPARKS) fx.burst(a.x, a.y, c, n, s);
  const first = nearestEnemy(run, a.x, a.y, L.jumpRange);
  if (first) strike(run, a.sky.bolts, first, fusionDmg(run, L.chainDmg), L.jumps, L.jumpRange, a.x, a.y, true);
}
const mine = a => a.onTrigger === land;                     // the pool resets onTrigger, so this never leaks into reuse

export default {
  id: 'penghakimanLangit',
  update(run, st, level, mods, dt) {
    ageBolts(st.bolts ??= [], dt);
    st.t = (st.t ?? Infinity) + dt;
    if (!ready(st, L.cd, mods, dt)) return;
    // ponytail: pillars + 1 full enemy scans per cast (randomOnScreenEnemy), and per landing nearestEnemy + chainTargets' scans:
    // ~35 passes over <= 400 enemies every cd s. Build the on-screen list once per cast if cd ever drops well under a second.
    if (!randomOnScreenEnemy(run, run.rng)) { st.cd = 0; return; }   // stays charged until something is in view
    const r = L.r * mods.area, dmg = fusionDmg(run, L.dmg);
    for (let i = 0; i < L.pillars; i++) {
      const e = randomOnScreenEnemy(run, run.rng);
      spawnArea(run, { x: e.x, y: e.y, r, dmg, delay: L.warn + i * L.stagger, glow: 'bolt', glowDur: LIFE + 0.3, quiet: true,
        onTrigger: land, sky: st });
    }
    st.t = 0;
    sfx('penghakimanLangitCall');
  },
  // Above the actors: the sky darkening over the cast, the marks under the enemies.
  draw(ctx, run, st, level, assets, cam) {
    const dur = L.warn + (L.pillars - 1) * L.stagger + LIFE;
    if (st.t < dur) overlay(ctx, DARK[0], DARK[1] * envelope(st.t, dur, DARK_FADE));
    for (const a of run.areas) if (mine(a) && !a.triggered)
      assets.draw(ctx, 'fu_skyWarn', a.x - cam.x, a.y - cam.y, { t: a.age / a.delay * assets.animTotal('fu_skyWarn'), scale: a.r / WARN_R });
  },
  // Over the smoke and the crowd, under the mage: the pillars, then the chains running off them.
  drawTop(ctx, run, st, level, assets, cam) {
    const seed = (run.time * 30) | 0;
    for (const a of run.areas) {
      if (!mine(a) || !a.triggered || a.age - a.delay >= LIFE) continue;
      const k = (a.age - a.delay) / LIFE, x = Math.round(a.x - cam.x), y = Math.round(a.y - cam.y), thin = 1 - 0.7 * k * k;
      for (const [w, color, alpha] of COLUMN) {             // the shaft, thinning as it fades
        const ww = Math.max(1, Math.round(w * thin)) | 1;
        ctx.globalAlpha = alpha * (1 - 0.5 * k); ctx.fillStyle = color;
        ctx.fillRect(x - (ww >> 1), TOP, ww, y - TOP);
      }
      ctx.globalAlpha = 1;
      drawArc(ctx, x - 3, TOP, x, y, seed * 31 + (a.x | 0));   // lightning crawling down it
      if (k < 0.5) drawArc(ctx, x + 3, TOP, x, y, seed * 17 + (a.y | 0));
    }
    if (st.bolts) drawBolts(ctx, st.bolts, cam);
  },
};
