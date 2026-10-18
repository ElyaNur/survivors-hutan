// Badai Petir (Petir Berantai + Orb Arcane): ported from the v1 ultimate of the same name.
import TUNING from '../../../data/tuning.js';
import { drawHalo } from '../../projectiles.js';
import { strike, ageBolts, drawBolts } from '../chainLightning.js';
import { sfx } from '../../../engine/audio.js';
import { ready, envelope, overlay } from './index.js';

const F = TUNING.fusions, FX = TUNING.fx;

// ---- Badai Petir: a storm cloud follows the mage for dur and throws rate bolts/s at random enemies within range
// (each chains on like Petir Berantai). The sky darkens and lights up with every strike.
const BP = F.badaiPetir;
const CLOUD_Y = 58, FOLLOW = 6, CLOUD_SPREAD = 70, CLOUD_BASE = 6;   // px above the mage; follow rate /s; bolt start px
const FRONT = [[-34, 5, true, 370], [34, 3, false, 610], [0, 0, false, 0]];   // the storm front: [dx, dy, flip, anim desync ms], centre last
const DARK = ['#1d1a2f', 0.42], FADE = 0.5, LIT = 0.06, LIT_DARK = 0.3, LIT_GAP = 0.4;   // palette k; s lit after a strike, share of
                                                            // dark left; min s between lifts (<= 2.5 flashes/s: photosensitivity)

function randomNear(run, x, y, r) {                         // uniform pick within r (reservoir: no list built)
  let pick = null, n = 0;
  for (const e of run.enemies) if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= r * r && run.rng.next() * ++n < 1) pick = e;
  return pick;
}

export default {
  id: 'badaiPetir',
  update(run, st, level, mods, dt) {
    ageBolts(st.bolts ??= [], dt);
    const p = run.player;
    if (ready(st, BP.cd, mods, dt)) {
      st.active = true; st.t = 0; st.acc = 1; st.litAt = -LIT_GAP; st.cx = p.x; st.cy = p.y - CLOUD_Y;   // acc 1: first bolt at once
      sfx('ult');
      run.fx.shake(FX.shakeUlt.px, FX.shakeUlt.dur);
    }
    if (!st.active) return;
    const f = Math.min(1, FOLLOW * dt);
    st.cx += (p.x - st.cx) * f; st.cy += (p.y - CLOUD_Y - st.cy) * f;
    for (st.acc += BP.rate * dt; st.acc >= 1; st.acc--) {
      const e = randomNear(run, p.x, p.y, BP.range);
      if (!e) break;
      strike(run, st.bolts, e, BP.dmg, BP.jumps, BP.jumpRange, st.cx + (run.rng.next() - 0.5) * CLOUD_SPREAD, st.cy + CLOUD_BASE);
      if (st.t - st.litAt >= LIT_GAP) st.litAt = st.t;
      run.fx.shake(FX.shakeMeteor.px, FX.shakeMeteor.dur);
    }
    st.acc = Math.min(st.acc, 1);                           // nothing in range: don't bank a volley
    if ((st.t += dt) >= BP.dur) st.active = false;
  },
  draw(ctx, run, st, level, assets, cam) {
    if (st.active) {
      const env = envelope(st.t, BP.dur, FADE), lit = st.t - st.litAt < LIT, x = st.cx - cam.x, y = st.cy - cam.y;
      overlay(ctx, DARK[0], DARK[1] * env * (lit ? LIT_DARK : 1));
      if (lit) drawHalo(ctx, 'bolt', x, y + CLOUD_BASE, 4, env);
      const t = performance.now();
      for (const [dx, dy, flip, d] of FRONT) assets.draw(ctx, 'stormCloud', x + dx, y + dy, { t: t + d, alpha: env, flip });
    }
    if (st.bolts) drawBolts(ctx, st.bolts, cam);
  },
};
