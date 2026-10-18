// Fusions: the skills a finished pair of level-5 skills turns into (the two ingredients are consumed).
// Same shape as a skill ({ id, update(run, st, level, mods, dt), draw? }, level always 0); state in run.fusionState[id].
// drawTop?(same args): drawn over the fx layer (smoke, poofs, blasts) but under the mage, for what must read in a crowd.
// Each fires on its first update after the fusion, then every cd x mods.cooldown.
// Import fusions through this file (the fusion modules import these helpers back, same cycle trick as skills/index.js).
import '../index.js';                                        // enter the skill cycle through the registry first
import TUNING from '../../../data/tuning.js';
import { damageEnemy } from '../../enemies.js';
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
const PLACEHOLDER_HITS = 5;

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

// A stand-in until the real fusion lands: every cd, hits the nearest few enemies within r.
export function makePlaceholder(id) {
  return {
    id, placeholder: true,
    update(run, st, level, mods, dt) {
      const F = TUNING.fusions[id];
      if (!ready(st, F.cd, mods, dt)) return;
      const p = run.player, near = [];
      for (const e of run.enemies) { const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (!e.dead && d <= F.r * F.r) near.push([d, e]); }
      near.sort((a, b) => a[0] - b[0]);
      for (const [, e] of near.slice(0, PLACEHOLDER_HITS)) {
        run.fx.burst(e.x, e.y, '#ffffff', 4, 60);           // palette w
        damageEnemy(run, e, fusionDmg(run, F.dmg), { quiet: true });
      }
    },
  };
}

export const FUSIONS = { hujanNeraka, phoenix, supernova, bolaPlasma, cincinMatahari, kometEs, gletser, penghakimanLangit,
  lubangHitam, absoluteZero, pagarKristal, pusaranKristal, medanStatis, bentengEs, badaiPetir };
