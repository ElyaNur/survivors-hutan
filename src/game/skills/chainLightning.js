// Chain Lightning (Petir Berantai): a bolt from the sky strikes a random on-screen enemy, then jumps to the
// nearest enemy it has not hit yet within jumpRange, up to `jumps` times. `strikes` bolts per cast.
import { stat, randomOnScreenEnemy } from './index.js';
import { damageEnemy } from '../enemies.js';
import { drawHalo } from '../projectiles.js';

const ID = 'chainLightning';
const LIFE = 0.12, SKY = 90, SKY_DRIFT = 24;                // bolt shown s; it enters this far above the first target, leaning
const JAG = 7, JAG_AMP = 3;                                 // px per kink, max sideways kink px
const LAYERS = [[3, '#9b5de5'], [2, '#fff1a8'], [1, '#ffffff']];   // [px, palette v/y/w]: violet edge, yellow body, white core
const SPARKS = [['#fff1a8', 4, 70], ['#d3b0ff', 2, 50]];   // [palette y/l, count, speed] per target

// Targets in hit order: first, then each jump to the nearest live, not-yet-hit enemy within range of the last.
// ponytail: linear scan per jump (<= 7 jumps x 400 enemies, a few casts/s); use run.grid if it ever shows in a profile.
export function chainTargets(run, first, jumps, range) {
  const out = [first];
  for (let j = 0; j < jumps; j++) {
    const from = out[out.length - 1];
    let best = null, bd = range * range;
    for (const e of run.enemies) {
      if (e.dead || out.includes(e)) continue;
      const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
      if (d <= bd) { bd = d; best = e; }
    }
    if (!best) break;
    out.push(best);
  }
  return out;
}

// One bolt from (fromX, fromY), then every target's position at the strike (the dead don't drag it away).
// bolts: the caller's pool (aged by ageBolts, drawn by drawBolts). Badai Petir strikes through here too.
export function strike(run, bolts, first, dmg, jumps, range, fromX, fromY) {
  const ts = chainTargets(run, first, jumps, range);
  const b = bolts.find(o => o.age >= LIFE) ?? (bolts.push({ xs: [], ys: [] }), bolts[bolts.length - 1]);
  b.age = 0; b.n = ts.length + 1;
  b.xs[0] = fromX; b.ys[0] = fromY;
  ts.forEach((e, i) => {
    b.xs[i + 1] = e.x; b.ys[i + 1] = e.y;
    damageEnemy(run, e, dmg, { fromX: b.xs[i], fromY: b.ys[i] });
    run.fx.anim(e.x, e.y, 'fx_lightningHit');
    for (const [c, n, s] of SPARKS) run.fx.burst(e.x, e.y, c, n, s);
  });
}

// Square-brush pixel line (crisp, unlike stroke()).
function pxLine(ctx, x0, y0, x1, y1, w) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0, o = w >> 1;
  for (let i = 0; i <= n; i++) {
    const k = n ? i / n : 0;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * k) - o, Math.round(y0 + (y1 - y0) * k) - o, w, w);
  }
}

// Kinked path from point i to i+1, re-kinked every frame so the bolt crackles. Each layer reuses the same kinks
// (seeded per frame), so the violet edge always wraps the white core.
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
function drawSegment(ctx, x0, y0, x1, y1, w, s) {
  seed = s;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, n = Math.max(1, Math.round(len / JAG));
  const nx = -dy / len, ny = dx / len;
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const k = i / n, off = i < n ? rand() * 2 * JAG_AMP : 0;
    const qx = x0 + dx * k + nx * off, qy = y0 + dy * k + ny * off;
    pxLine(ctx, px, py, qx, qy, w);
    px = qx; py = qy;
  }
}

export function ageBolts(bolts, dt) { for (const b of bolts) b.age += dt; }

export function drawBolts(ctx, bolts, cam) {
  const frameSeed = (performance.now() / 16) | 0;
  for (const b of bolts) {
    if (b.age >= LIFE) continue;
    ctx.globalAlpha = 1 - 0.5 * b.age / LIFE;
    for (const [w, color] of LAYERS) {
      if (w === 3 && b.age > LIFE * 0.6) continue;         // the violet edge goes first
      ctx.fillStyle = color;
      for (let i = 0; i + 1 < b.n; i++)
        drawSegment(ctx, b.xs[i] - cam.x, b.ys[i] - cam.y, b.xs[i + 1] - cam.x, b.ys[i + 1] - cam.y, w, frameSeed * 31 + i * 7 + 1);
    }
    ctx.globalAlpha = 1;
    for (let i = 1; i < b.n; i++) drawHalo(ctx, 'bolt', b.xs[i] - cam.x, b.ys[i] - cam.y, 1, 1 - b.age / LIFE);
  }
}

function cast(run, st, e, level) {
  strike(run, st.bolts, e, stat(ID, 'dmg', level), stat(ID, 'jumps', level), stat(ID, 'jumpRange', level),
    e.x + (run.rng.next() - 0.5) * 2 * SKY_DRIFT, e.y - SKY);   // from the sky above it, leaning
}

export default {
  id: ID,
  update(run, st, level, mods, dt) {
    ageBolts(st.bolts ??= [], dt);
    if ((st.cd = (st.cd ?? 0) - dt) > 0) return;
    const first = randomOnScreenEnemy(run, run.rng);
    if (!first) return;                                     // stays charged until something is on screen
    st.cd = stat(ID, 'cd', level) * mods.cooldown;
    cast(run, st, first, level);
    for (let i = 1; i < stat(ID, 'strikes', level); i++) { const e = randomOnScreenEnemy(run, run.rng); if (e) cast(run, st, e, level); }
  },
  draw(ctx, run, st, level, assets, cam) { if (st.bolts) drawBolts(ctx, st.bolts, cam); },
};
