// Pagar Kristal (Ice Shard + Chain Lightning): every cd an ice shard flies out round the mage (piercing what it passes) and
// stabs into the ground as a crystal; at most maxCrystals stand, each for `life` s, the oldest shattering first. Crystals
// within `link` px of each other are wired together by lightning, and every `tick` s each wire zaps whatever stands across it.
import TUNING from '../../../data/tuning.js';
import { damageEnemy } from '../../enemies.js';
import { spawnProjectile, drawHalo } from '../../projectiles.js';
import { drawArc } from '../chainLightning.js';
import { sfx } from '../../../engine/audio.js';
import { fusionDmg, ready } from './index.js';

const K = TUNING.fusions.pagarKristal;
const MAX_ENEMY_R = 32, GOLDEN = 2.39996, FLAT = 0.75;      // grid margin; each throw turns this far round the mage; throws squashed like the view
const UP = 9, WIRE_UP = 8;                                  // fu_crystal drawn this far above its spot (it stands on it); wires strung this high
const GROW = 0.12, BLINK = 0.6, ZAP_ANIMS = 6;              // s a crystal takes to grow in; s it blinks before it goes; hit sparks per tick
const SHATTER = [['#ffffff', 4, 80], ['#a6f6ff', 6, 60]];   // palette w, c
const near = [];

function shatter(run, c) {
  run.fx.anim(c.x, c.y - UP, 'fx_shatter');
  for (const [col, n, s] of SHATTER) run.fx.burst(c.x, c.y - UP, col, n, s);
}

// The shard's end: it lodges where it lands (the oldest crystal makes room).
function lodge(run, p) {
  const cs = p.fence.crystals;
  if (cs.length >= K.maxCrystals) shatter(run, cs.shift());
  cs.push({ x: p.x, y: p.y, age: 0 });
  run.fx.anim(p.x, p.y, 'fx_iceHit');
  sfx('pagarKristal');
}

function throwShard(run, st, mods) {
  const pl = run.player, a = (st.turn = ((st.turn ?? 0) + GOLDEN) % (Math.PI * 2));
  const d = K.throwR * mods.area * (0.7 + 0.3 * Math.abs(Math.sin(a * 3.7))), ux = Math.cos(a), uy = Math.sin(a) * FLAT;
  const len = Math.hypot(ux, uy);
  spawnProjectile(run, { x: pl.x, y: pl.y, vx: ux / len * K.shardSpeed, vy: uy / len * K.shardSpeed, dmg: fusionDmg(run, K.shardDmg),
    radius: 3, pierce: Infinity, life: d * len / K.shardSpeed, sprite: 'iceShard_fly', glow: 'ice', onEnd: lodge, fence: st });
}

// Distance² from (px, py) to the segment a-b.
function segD2(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, k = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return (px - a.x - dx * k) ** 2 + (py - a.y - dy * k) ** 2;
}

function zap(run, cs) {
  const dmg = fusionDmg(run, K.tickDmg);
  let sparks = 0;
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const a = cs[i], b = cs[j], len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len > K.link) continue;
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
    if (ready(st, K.cd, mods, dt)) throwShard(run, st, mods);
    if ((st.tickIn = (st.tickIn ?? K.tick) - dt) <= 0) { st.tickIn += K.tick; zap(run, cs); }
  },
  // Over the smoke and the crowd, under the mage: the wires, then the posts holding them.
  drawTop(ctx, run, st, level, assets, cam) {
    const cs = st.crystals;
    if (!cs?.length) return;
    const seed = (run.time * 30) | 0, t = run.time * 1000;   // the wires re-crackle every other frame
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i], b = cs[j];
      if ((b.x - a.x) ** 2 + (b.y - a.y) ** 2 > K.link * K.link) continue;
      const ax = a.x - cam.x, ay = a.y - cam.y - WIRE_UP, bx = b.x - cam.x, by = b.y - cam.y - WIRE_UP;
      drawArc(ctx, ax, ay, bx, by, seed * 31 + i * 7 + j);
      drawArc(ctx, ax, ay - 2, bx, by - 2, seed * 17 + i * 5 + j * 3 + 1);   // a second strand: the fence crackles thick
      drawHalo(ctx, 'bolt', (ax + bx) / 2, (ay + by) / 2, 1.4, 0.7);
    }
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i], x = c.x - cam.x, y = c.y - cam.y - UP;
      if (c.age > K.life - BLINK && ((c.age * 12) | 0) % 2) continue;   // about to go: it blinks
      drawHalo(ctx, 'ice', x, y, 1.6, 0.8);
      assets.draw(ctx, 'fu_crystal', x, y, { t: t + i * 83, scale: Math.min(1, 0.4 + 0.6 * c.age / GROW) });
    }
  },
};
