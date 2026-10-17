// Pickups on the ground: XP gems, hearts, magnets, chests. Magnetised into the player, then applied.
import TUNING from '../data/tuning.js';
import { gainXp } from '../logic/progression.js';
import { sfx } from '../engine/audio.js';

const D = TUNING.drops;
const CHEST_LIFT = 3;                                    // chest_open (14x18) draws 3px higher so its body sits where the chest lay
// Desyncs the sparkle of neighbouring gems; fixed at drop so a flying gem doesn't flicker.
const phaseAt = (x, y) => (x * 37 + y * 17) % 1000;
const drop = (run, kind, x, y, xp = 0, levels = 0) =>
  run.pickups.push({ kind, x, y, xp, levels, pulled: false, t0: phaseAt(x, y) });

export function dropGem(run, x, y, xp) {
  drop(run, 'gem', x, y, xp);
  if (run.pickups.length > D.maxGems) mergeGems(run);   // fewer pickups than the cap -> fewer gems too
}
export const dropHeart = (run, x, y) => drop(run, 'heart', x, y);
export const dropMagnet = (run, x, y) => drop(run, 'magnet', x, y);
export const dropChest = (run, x, y, levels) => drop(run, 'chest', x, y, 0, levels);

// Over the cap: the gem farthest from the player folds its xp into the one nearest to him.
// One drop adds one gem, so one merge keeps the count at the cap.
function mergeGems(run) {
  const ps = run.pickups, p = run.player;
  let n = 0, far = -1, near = -1, farD = -1, nearD = Infinity;
  for (let i = 0; i < ps.length; i++) {
    const q = ps[i];
    if (q.kind !== 'gem') continue;
    n++;
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d > farD) { farD = d; far = i; }
    if (d < nearD) { nearD = d; near = i; }
  }
  if (n <= D.maxGems || far === near) return;
  ps[near].xp += ps[far].xp;
  ps[far] = ps[ps.length - 1]; ps.pop();
}

function collect(run, q) {
  const p = run.player;
  sfx(q.kind === 'chest' ? 'chest' : 'pickup');
  if (q.kind === 'gem') run.pendingLevelUps += gainXp(run.prog, q.xp * run.mods.xp);
  else if (q.kind === 'heart') p.hp = Math.min(p.maxHp, p.hp + D.heartHeal);
  else if (q.kind === 'chest') {                          // free levels, xp untouched; the cards wait for the lid
    run.pendingLevelUps += q.levels; run.prog.level += q.levels;
    run.levelUpAt = run.time + D.chestHold;
    run.fx.anim(q.x, q.y - CHEST_LIFT, 'chest_open');
    run.fx.burst(q.x, q.y - 4, '#ffd23f', 10, 50); run.fx.burst(q.x, q.y - 4, '#fff1a8', 6, 35);
  }
  else if (q.kind === 'magnet') for (const g of run.pickups) if (g.kind === 'gem') g.pulled = true;
}

export function updatePickups(run, dt) {
  const p = run.player, ps = run.pickups, reach = TUNING.player.magnet * run.mods.magnet, step = D.pullSpeed * dt;
  for (let i = ps.length - 1; i >= 0; i--) {             // swap-remove: the moved-in one was already updated
    const q = ps[i], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
    const chest = q.kind === 'chest';                     // chests stay put and open at a touch, beside him, not under him
    if (d < (chest ? D.chestReach : TUNING.player.pickup)) {
      collect(run, q);
      ps[i] = ps[ps.length - 1]; ps.pop();
      continue;
    }
    if (d < reach && !chest) q.pulled = true;
    if (q.pulled) { const k = Math.min(step, d) / d; q.x += dx * k; q.y += dy * k; }
  }
}

// ---- Drawing (browser)
const gemSprite = xp => { for (const t of D.gemTiers) if (xp >= t.minXp) return t.sprite; };

const opt = { t: 0 };                                     // reused: no per-pickup allocation
export function drawPickups(ctx, run, assets, cam, tMs) {
  for (const q of run.pickups) {
    const sx = q.x - cam.x, sy = q.y - cam.y;
    if (sx < -12 || sy < -12 || sx > cam.w + 12 || sy > cam.h + 12) continue;
    opt.t = tMs + q.t0;
    assets.draw(ctx, q.kind === 'gem' ? gemSprite(q.xp) : q.kind, sx, sy, opt);
  }
}
