// Skill registry and the helpers skills share. Import skills through this file (the skill modules
// import these helpers back; entering the cycle here is what makes SKILLS see them all).
import TUNING from '../../data/tuning.js';
import { camera } from '../world.js';
import fireball from './fireball.js';
import iceShard from './iceShard.js';
import arcaneOrb from './arcaneOrb.js';
import meteor from './meteor.js';
import frostNova from './frostNova.js';
import chainLightning from './chainLightning.js';

// Each skill: { id, update(run, st, level, mods, dt), draw?(ctx, run, st, level, assets, cam) }.
export const SKILLS = { fireball, meteor, iceShard, frostNova, chainLightning, arcaneOrb };

// TUNING.skills[id][key] at level 1..5: a 5-array, {base, perLv}, or a plain number.
export function stat(id, key, level) {
  const v = TUNING.skills[id][key];
  return Array.isArray(v) ? v[level - 1] : typeof v === 'object' ? v.base + v.perLv * (level - 1) : v;
}

const inView = (e, v) => e.x >= v.x && e.y >= v.y && e.x < v.x + v.w && e.y < v.y + v.h;

// ponytail: linear scan, a few casts per second over <= 400 enemies; use run.grid if casts get hot.
export function nearestEnemy(run, x, y, maxR) {
  let best = null, bd = maxR * maxR;
  for (const e of run.enemies) {
    if (e.dead) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// Centre of the 32 px cell holding the most enemies in view (ties: the one nearer the player), skipping
// cells whose centre is within minD of a point in `avoid` (several meteors at once); null when none.
const CELL = 32, counts = new Map();
function tooClose(pts, x, y, d) {
  for (const q of pts) if ((q.x - x) ** 2 + (q.y - y) ** 2 < d * d) return true;
  return false;
}
export function densestCell(run, view, avoid = [], minD = 0) {
  const p = run.player;
  let bestN = 0, bestD = 0, bx = 0, by = 0;
  counts.clear();
  for (const e of run.enemies) {
    if (e.dead || !inView(e, view)) continue;
    const cx = Math.floor(e.x / CELL), cy = Math.floor(e.y / CELL), mx = (cx + 0.5) * CELL, my = (cy + 0.5) * CELL;
    if (avoid.length && tooClose(avoid, mx, my, minD)) continue;
    const k = cx * 100003 + cy, n = (counts.get(k) ?? 0) + 1;
    counts.set(k, n);
    const d = (mx - p.x) ** 2 + (my - p.y) ** 2;
    if (n > bestN || (n === bestN && d < bestD)) { bestN = n; bestD = d; bx = mx; by = my; }
  }
  return bestN ? { x: bx, y: by } : null;
}

// densestCell, or the player position when the view is empty.
export const densestPoint = (run, view) => densestCell(run, view) ?? { x: run.player.x, y: run.player.y };

// Uniform pick among on-screen enemies (reservoir sampling: no list built), or null.
export function randomOnScreenEnemy(run, rng) {
  const v = camera(run.player);
  let pick = null, n = 0;
  for (const e of run.enemies) if (!e.dead && inView(e, v) && rng.next() * ++n < 1) pick = e;
  return pick;
}
