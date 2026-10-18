// Badai Petir (Petir Berantai + Orb Arcane): the storm is ported from the v1 ultimate of the same name; the orbs, consumed,
// become its storm core, circling the mage and striking the nearest enemy all the time, storm or not.
import TUNING from '../../../data/tuning.js';
import { drawHalo } from '../../projectiles.js';
import { strike, ageBolts, drawBolts } from '../chainLightning.js';
import { nearestEnemy } from '../index.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg, ready, envelope, overlay } from './index.js';

const F = TUNING.fusions, FX = TUNING.fx;

// ---- Badai Petir: a storm cloud follows the mage for dur and throws rate bolts/s at random enemies within range
// (each chains on like Petir Berantai). The sky darkens and lights up with every strike.
const BP = F.badaiPetir;
const CLOUD_Y = 58, FOLLOW = 6, CLOUD_SPREAD = 70, CLOUD_BASE = 6;   // px above the mage; follow rate /s; bolt start px
const FRONT = [[-34, 5, true, 370], [34, 3, false, 610], [0, 0, false, 0]];   // the storm front: [dx, dy, flip, anim desync ms], centre last
const DARK = ['#1d1a2f', 0.42], FADE = 0.5, LIT = 0.06, LIT_DARK = 0.3, LIT_GAP = 0.4;   // palette k; s lit after a strike, share of
                                                            // dark left; min s between lifts (<= 2.5 flashes/s: photosensitivity)
const CORE_TRAIL = [[0.3, 3, '#d3b0ff'], [0.45, 2, '#9b5de5'], [0.6, 2, '#9b5de5'], [0.75, 1, '#5a3a9e']];   // [radians back, px, palette l/v/v/V]

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
    st.angle = ((st.angle ?? 0) + BP.rotSpeed * dt) % (Math.PI * 2); st.R = BP.orbitR * mods.area;
    const kx = p.x + Math.cos(st.angle) * st.R, ky = p.y + Math.sin(st.angle) * st.R;
    if ((st.coreIn = (st.coreIn ?? 0) - dt) <= 0) {         // the core: stays charged until something is in reach
      const e = nearestEnemy(run, kx, ky, BP.coreRange);
      if (e) { st.coreIn = BP.coreEvery * mods.cooldown; strike(run, st.bolts, e, fusionDmg(run, BP.coreDmg), 0, 0, kx, ky); }
    }
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
      strike(run, st.bolts, e, fusionDmg(run, BP.dmg), BP.jumps, BP.jumpRange, st.cx + (run.rng.next() - 0.5) * CLOUD_SPREAD, st.cy + CLOUD_BASE);
      if (st.t - st.litAt >= LIT_GAP && run.fx.tryFlash()) st.litAt = st.t;
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
      const t = run.time * 1000;
      for (const [dx, dy, flip, d] of FRONT) assets.draw(ctx, 'stormCloud', x + dx, y + dy, { t: t + d, alpha: env, flip });
    }
    if (st.bolts) drawBolts(ctx, st.bolts, cam);
  },
  // Over the smoke and the crowd, under the mage: the storm core on its round.
  drawTop(ctx, run, st, level, assets, cam) {
    if (!st.R) return;
    const cx = run.player.x - cam.x, cy = run.player.y - cam.y, a = st.angle, R = st.R;
    for (const [back, px, color] of CORE_TRAIL) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(cx + Math.cos(a - back) * R) - (px >> 1), Math.round(cy + Math.sin(a - back) * R) - (px >> 1), px, px);
    }
    const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    drawHalo(ctx, 'bolt', x, y, 2.2);
    assets.draw(ctx, 'fu_stormCore', x, y, { t: run.time * 1000 });
  },
};
