// Pagar Kristal (Ice Shard + Chain Lightning): every cd an ice shard flies out round the mage (piercing what it passes) and
// stabs into the ground as a crystal; at most maxCrystals stand, each for `life` s, the oldest shattering first. Each crystal
// is wired by lightning to its `neighbours` nearest within `link` px, and every `tick` s each wire zaps whatever stands across it.
import TUNING from '../../../data/tuning.js';
import { damageEnemy } from '../../enemies.js';
import { spawnProjectile, drawHalo } from '../../projectiles.js';
import { drawArc } from '../chainLightning.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg, ready } from './index.js';

const K = TUNING.fusions.pagarKristal;
const MAX_ENEMY_R = 32, GOLDEN = 2.39996;                   // grid margin; each throw turns this far round the mage
const UP = 9, WIRE_UP = 8;                                  // fu_crystal drawn this far above its spot (it stands on it); wires strung this high
const GROW = 0.12, BLINK = 0.6, ZAP_ANIMS = 6;              // s a crystal takes to grow in; s it blinks before it goes; hit sparks per tick
const SHATTER = [['#ffffff', 4, 80], ['#a6f6ff', 6, 60]];   // palette w, c
const CORE = [[1, '#ffffff']];                              // palette w: the second strand, a bare white core
const near = [], best = [], bestD = [];

function shatter(run, c) {
  run.fx.anim(c.x, c.y - UP, 'fx_shatter');
  for (const [col, n, s] of SHATTER) run.fx.burst(c.x, c.y - UP, col, n, s);
}

// The shard's end: it lodges where it lands (the oldest crystal makes room).
function lodge(run, p) {
  const cs = p.fence.crystals;
  if (cs.length >= K.maxCrystals) shatter(run, cs.shift());
  cs.push({ x: p.x, y: p.y, age: 0 });
  wireUp(p.fence);
  run.fx.anim(p.x, p.y, 'fx_iceHit');
  sfx('pagarKristal');
}

function throwShard(run, st, mods) {
  const pl = run.player, a = (st.turn = ((st.turn ?? 0) + GOLDEN) % (Math.PI * 2));
  const d = K.throwR * mods.area * (1 - K.throwSpread + K.throwSpread * Math.abs(Math.sin(a * 3.7))), ux = Math.cos(a), uy = Math.sin(a) * K.flat;
  const len = Math.hypot(ux, uy);
  spawnProjectile(run, { x: pl.x, y: pl.y, vx: ux / len * K.shardSpeed, vy: uy / len * K.shardSpeed, dmg: fusionDmg(run, K.shardDmg),
    radius: K.shardSize, pierce: Infinity, life: d * len / K.shardSpeed, sprite: 'iceShard_fly', glow: 'ice', onEnd: lodge, fence: st });
}

// st.links (flat a, b, a, b... crystals): each crystal to its K.neighbours nearest within link, no pair twice. The zap and the
// drawn wires both read it, so what hurts is what shows. ponytail: O(n² K) per rebuild, fine for maxCrystals ~20.
function wireUp(st) {
  const cs = st.crystals, ls = st.links ??= [], L2 = K.link * K.link;
  ls.length = 0;
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i];
    best.length = 0; bestD.length = 0;
    for (let j = 0; j < cs.length; j++) {                    // insertion into the K nearest so far (nearest first)
      const d = (cs[j].x - a.x) ** 2 + (cs[j].y - a.y) ** 2;
      if (j === i || d > L2 || (best.length === K.neighbours && d >= bestD[best.length - 1])) continue;
      let k = Math.min(best.length, K.neighbours - 1);
      for (; k > 0 && bestD[k - 1] > d; k--) { best[k] = best[k - 1]; bestD[k] = bestD[k - 1]; }
      best[k] = cs[j]; bestD[k] = d;
    }
    for (const b of best) {
      let dup = false;
      for (let k = 0; k < ls.length; k += 2) if (ls[k] === b && ls[k + 1] === a) { dup = true; break; }
      if (!dup) ls.push(a, b);
    }
  }
}

// Distance² from (px, py) to the segment a-b.
function segD2(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, k = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return (px - a.x - dx * k) ** 2 + (py - a.y - dy * k) ** 2;
}

function zap(run, ls) {
  const dmg = fusionDmg(run, K.tickDmg);
  let sparks = 0;
  for (let i = 0; i < ls.length; i += 2) {
    const a = ls[i], b = ls[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
    near.length = 0;
    run.grid.query((a.x + b.x) / 2, (a.y + b.y) / 2, len / 2 + K.wire + MAX_ENEMY_R, near);
    for (const e of near) {
      if (e.dead || segD2(e.x, e.y, a, b) > (e.r + K.wire) ** 2) continue;
      damageEnemy(run, e, dmg, { power: 0, quiet: true });  // no shove: the fence holds them on the wire
      if (sparks++ < ZAP_ANIMS) run.fx.anim(e.x, e.y, 'fx_lightningHit');
      else run.fx.burst(e.x, e.y, '#fff1a8', 2, 50);        // palette y
    }
  }
  if (sparks) sfx('pagarKristalZap');
}

export default {
  id: 'pagarKristal',
  update(run, st, level, mods, dt) {
    const cs = st.crystals ??= [];
    for (let i = cs.length - 1; i >= 0; i--) if ((cs[i].age += dt) >= K.life) shatter(run, cs.splice(i, 1)[0]);
    wireUp(st);
    if (ready(st, K.cd, mods, dt)) throwShard(run, st, mods);
    if ((st.tickIn = (st.tickIn ?? K.tick) - dt) <= 0) { st.tickIn += K.tick; zap(run, st.links); }
  },
  // Over the smoke and the crowd, under the mage: the wires, then the posts holding them.
  drawTop(ctx, run, st, level, assets, cam) {
    const cs = st.crystals, ls = st.links;
    if (!cs?.length || !ls) return;
    const seed = (run.time * 30) | 0, t = run.time * 1000;   // the wires re-crackle every other frame
    for (let i = 0; i < ls.length; i += 2) {
      const a = ls[i], b = ls[i + 1], ax = a.x - cam.x, ay = a.y - cam.y - WIRE_UP, bx = b.x - cam.x, by = b.y - cam.y - WIRE_UP;
      drawArc(ctx, ax, ay, bx, by, seed * 31 + i * 7);
      drawArc(ctx, ax, ay - 2, bx, by - 2, seed * 17 + i * 5 + 1, CORE);   // a second, white strand: the fence crackles thick
    }
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i], x = c.x - cam.x, y = c.y - cam.y - UP;
      if (c.age > K.life - BLINK && ((c.age * 12) | 0) % 2) continue;   // about to go: it blinks
      drawHalo(ctx, 'ice', x, y, 1.6, 0.8);
      assets.draw(ctx, 'fu_crystal', x, y, { t: t + i * 83, scale: Math.min(1, 0.4 + 0.6 * c.age / GROW) });
    }
  },
};
