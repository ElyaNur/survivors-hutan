// Ultimates: the big, long-cooldown attacks a finished recipe unlocks (the ingredient skills keep firing).
// Same shape as a skill ({ id, update(run, st, level, mods, dt), draw? }, level unused); state in run.ultState[id].
// Each fires on its first update after the unlock, then every cd x mods.cooldown.
import './index.js';                                        // enter the skill cycle through the registry (see index.js)
import TUNING from '../../data/tuning.js';
import { camera } from '../world.js';
import { damageEnemy } from '../enemies.js';
import { spawnArea, drawHalo } from '../projectiles.js';
import { shedEmbers, drawIncoming } from './meteor.js';
import { strike, ageBolts, drawBolts } from './chainLightning.js';
import { sfx } from '../../engine/audio.js';

const U = TUNING.ults, FX = TUNING.fx, W = 480, H = 270, PAD = 8;   // overlays overfill the view by PAD (shake)

// True when the cooldown is up, and restarts it. A fresh st (just unlocked) is ready at once.
function ready(st, cd, mods, dt) {
  if ((st.cd = (st.cd ?? 0) - dt) > 0) return false;
  st.cd = cd * mods.cooldown;
  return true;
}
// 0..1..0 over a cast that lasts dur: fades in and out over `fade` s.
const envelope = (t, dur, fade) => Math.max(0, Math.min(1, t / fade, (dur - t) / fade));
function overlay(ctx, color, alpha, h = H, blend = 'source-over') {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.globalCompositeOperation = blend;
  ctx.fillRect(-PAD, -PAD, W + 2 * PAD, h + PAD);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

// ---- Armageddon: for dur, rate meteors/s rain on random points of the view, each after a short shadow.
// The sky burns red and the ground never stops shaking.
const ARM = U.armageddon, ARM_TOTAL = ARM.rate * ARM.dur;
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

const armageddon = {
  id: 'armageddon',
  update(run, st, level, mods, dt) {
    for (const a of run.areas) if (armMeteor(a) && !a.triggered) shedEmbers(run, a);
    if (ready(st, ARM.cd, mods, dt)) { st.t = 0; st.n = 0; sfx('ult'); run.fx.shake(FX.shakeUlt.px, FX.shakeUlt.dur); }
    if (st.t === undefined || st.t > ARM.dur + ARM.warn) return;
    const v = camera(run.player), want = Math.min(ARM_TOTAL, Math.floor(st.t * ARM.rate) + 1);   // exactly rate x dur, the first at once
    for (; st.n < want; st.n++)
      spawnArea(run, { x: v.x + run.rng.next() * v.w, y: v.y + run.rng.next() * v.h, r: ARM.r * mods.area, dmg: ARM.dmg,
        delay: ARM.warn, glow: 'fire', glowDur: GLOW_DUR, quiet: true, onTrigger: boom });
    st.t += dt;
  },
  draw(ctx, run, st, level, assets, cam) {
    if (st.t === undefined) return;
    const k = envelope(st.t, ARM.dur + ARM.warn, SKY_FADE) * (1 - SKY_PULSE + SKY_PULSE * Math.sin(st.t * 9));
    overlay(ctx, SKY_BURN[0], SKY_BURN[1] * k, H, 'multiply');
    for (const [h, a] of SKY_BANDS) overlay(ctx, SKY, a * k, h);
    const t = performance.now();
    for (const a of run.areas) if (armMeteor(a) && !a.triggered) drawIncoming(ctx, assets, a, a.x - cam.x, a.y - cam.y, t);
  },
};

// ---- Absolute Zero: every enemy in view freezes and turns brittle (takes frozenVulnMult x damage) for `freeze` s,
// and takes the blast. An ice wave rushes out of the mage across the screen; what dies on the ice shatters (enemies.js).
const AZ = U.absoluteZero;
const ICE_FLASH = ['#7cf0ff', 0.6], WAVE_T = 0.45, WAVE_R = 300, GLAZE = ['#a6f6ff', 0.14];   // palette e, c
const WAVE = [[0, 2, '#ffffff'], [3, 2, '#a6f6ff'], [7, 2, '#3ccfe0'], [12, 1, '#a6f6ff']];   // rings: [px behind the front, size, colour]

const absoluteZero = {
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

// ---- Badai Petir: a storm cloud follows the mage for dur and throws rate bolts/s at random enemies within range
// (each chains on like Petir Berantai). The sky darkens and lights up with every strike; orbs hit harder meanwhile
// (arcaneOrb.js reads st.active).
const BP = U.badaiPetir;
const CLOUD_Y = 58, FOLLOW = 6, CLOUD_SPREAD = 70, CLOUD_BASE = 6;   // px above the mage; follow rate /s; bolt start px
const FRONT = [[-34, 5, true, 370], [34, 3, false, 610], [0, 0, false, 0]];   // the storm front: [dx, dy, flip, anim desync ms], centre last
const DARK = ['#1d1a2f', 0.42], FADE = 0.5, LIT = 0.06, LIT_DARK = 0.3, LIT_GAP = 0.4;   // palette k; s lit after a strike, share of
                                                            // dark left; min s between lifts (<= 2.5 flashes/s: photosensitivity)

function randomNear(run, x, y, r) {                         // uniform pick within r (reservoir: no list built)
  let pick = null, n = 0;
  for (const e of run.enemies) if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= r * r && run.rng.next() * ++n < 1) pick = e;
  return pick;
}

const badaiPetir = {
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

export const ULTS = { armageddon, absoluteZero, badaiPetir };
