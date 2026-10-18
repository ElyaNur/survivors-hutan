// Fusions: the skills a finished pair of level-5 skills turns into (the two ingredients are consumed).
// Same shape as a skill ({ id, update(run, st, level, mods, dt), draw? }, level always 0); state in run.fusionState[id].
// drawTop?(same args): drawn over the fx layer (smoke, poofs, blasts) but under the mage, for what must read in a crowd.
// Each fires on its first update after the fusion, then every cd x mods.cooldown.
// Import fusions through this file (the fusion modules import these helpers back, same cycle trick as skills/index.js).
import '../index.js';                                        // enter the skill cycle through the registry first
import TUNING from '../../../data/tuning.js';
import hujanNeraka from './hujanNeraka.js';
import absoluteZero from './absoluteZero.js';
import badaiPetir from './badaiPetir.js';
import phoenix from './phoenix.js';
import supernova from './supernova.js';
import bolaPlasma from './bolaPlasma.js';
import cincinMatahari from './cincinMatahari.js';
import kometEs from './kometEs.js';
import gletser from './gletser.js';
import penghakimanLangit from './penghakimanLangit.js';
import lubangHitam from './lubangHitam.js';
import pagarKristal from './pagarKristal.js';
import pusaranKristal from './pusaranKristal.js';
import medanStatis from './medanStatis.js';
import bentengEs from './bentengEs.js';

const W = 480, H = 270, PAD = 8;                            // overlays overfill the view by PAD (shake)

// Fusion damage grows with the enemies' hp, so a fusion found at minute 7 still bites at minute 18.
export function fusionDmg(run, base) { return base * (1 + TUNING.enemyHpGrowthPerMin * Math.floor(run.time / 60)); }

// True when the cooldown is up, and restarts it. A fresh st (just fused) is ready at once.
export function ready(st, cd, mods, dt) {
  if ((st.cd = (st.cd ?? 0) - dt) > 0) return false;
  st.cd = cd * mods.cooldown;
  return true;
}
// 0..1..0 over a cast that lasts dur: fades in and out over `fade` s.
export function envelope(t, dur, fade) { return Math.max(0, Math.min(1, t / fade, (dur - t) / fade)); }
export function overlay(ctx, color, alpha, h = H, blend = 'source-over') {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.globalCompositeOperation = blend;
  ctx.fillRect(-PAD, -PAD, W + 2 * PAD, h + PAD);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

export const FUSIONS = { hujanNeraka, phoenix, supernova, bolaPlasma, cincinMatahari, kometEs, gletser, penghakimanLangit,
  lubangHitam, absoluteZero, pagarKristal, pusaranKristal, medanStatis, bentengEs, badaiPetir };
