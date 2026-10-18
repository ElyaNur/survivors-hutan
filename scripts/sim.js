// Headless balance simulator: runs the real game logic (createRun / updateRun / chooseCard) with no DOM and no assets,
// driven by a simple bot. Usage:
//   node scripts/sim.js --plan "fireball+meteor,iceShard+frostNova" --seeds 5      (several plans: --plan "a+b,c+d|a+b|none"; a plan is an ordered list of fusion pairs, or none)
//   node scripts/sim.js --partitions --seeds 3      (all 15 three-pair builds: win rate each, then a per-fusion average and weakest/strongest)
//   options: --seeds N (default 5), --start S (first seed, default 1), --max SECONDS (default 1500: the boss gets 5 min after 20:00), --verbose (one line per run), --trace (hp / level / position every 20 s), --god (immortal),
//            --nofuse (reach each planned pair at Lv5 but never take the fusion card: the "fusion beats its ingredients" control)
// Bot: steers to the safest of 16 headings (away from the crowd, circling, off walls and water, towards gems and chests);
// card picks follow the plan: the current pair's two skills to Lv5, then passives; its fusion card is taken (never an unplanned one), then the next pair.
// The starter is the first pair's first skill. `none` picks cards at random but never a fusion card (a build without fusions).
// Level / fusion-minute columns average only the runs that got that far. A run still alive at --max counts as lost.
// Not a human: it never dodges perfectly, but it never mis-picks a card. Use it to compare numbers, not to predict win rates.
import { createRun, updateRun, chooseCard } from '../src/game/run.js';
import { CLASSES } from '../src/data/classes.js';
import { fusionFor } from '../src/logic/progression.js';
import { createRng } from '../src/logic/rng.js';
import { SCHEDULE } from '../src/data/spawns.js';
import { WORLD_W, WORLD_H, terrainSpeed } from '../src/game/world.js';

const DT = 1 / 60, DECIDE_EVERY = 4;   // bot re-decides at 15 Hz, like a human's reaction rate
const PASSIVE_ORDER = ['vitality', 'focus', 'wisdom', 'amplify', 'swiftness', 'magnet'];

// ---- Bot: card picking
// The pair being built: the first planned pair not yet fused (with --nofuse: not yet at Lv5 both).
const pairDone = (p, b) => nofuse ? b.skills[p[0]] === 5 && b.skills[p[1]] === 5 : b.fusions.includes(fusionFor(CLASSES.mage, p[0], p[1]).id);

function pickCard(run, plan, rng) {
  const cards = run.cards, b = run.build, pair = plan.find(p => !pairDone(p, b));
  const rest = cards.filter(c => c.kind !== 'fusion');              // an unplanned fusion card is never taken (unless it is all there is)
  if (!plan.length) return rng.pick(rest.length ? rest : cards);    // plan none: random, never a fusion
  if (pair) {
    const f = cards.find(c => c.kind === 'fusion' && fusionFor(CLASSES.mage, pair[0], pair[1]).id === c.id);
    if (f) return f;
    for (const id of pair) { const c = cards.find(c => c.kind === 'skill' && c.id === id); if (c) return c; }
  }
  for (const id of PASSIVE_ORDER) { const c = cards.find(c => c.kind === 'passive' && c.id === id); if (c) return c; }
  return rest.find(c => c.kind === 'skill') ?? rest[0] ?? cards[0];
}

// ---- Bot: movement
// Danger of standing at (x, y): enemies' contact damage fading out to RANGE px, hostile shots and root circles as hard walls.
const RANGE = 70, BOSS_RANGE = 30, BOSS_RING = 110;   // bosses are slow: keep close enough for the skills to reach
const BOSSES = new Set(SCHEDULE.bosses.map(b => b.type));
function danger(x, y, near, run) {
  let d = 0;
  for (const e of near) {
    const k = 1 - Math.hypot(e.x - x, e.y - y) / ((BOSSES.has(e.type) ? BOSS_RANGE : RANGE) + e.r);
    if (k > 0) d += k * k * e.def.dmg;
  }
  for (const q of run.projectiles) if (q.hostile && Math.hypot(q.x + q.vx * 0.4 - x, q.y + q.vy * 0.4 - y) < q.radius + 14) d += 60;
  for (const a of run.areas) if (a.hostile && Math.hypot(a.x - x, a.y - y) < a.r + 14) d += 80;
  return d;
}

function makeBot(seed) {
  const rng = createRng(seed * 7919 + 1);
  let heading = { x: 0, y: 0 }, tick = 0, spin = 1;
  const dirs = Array.from({ length: 16 }, (_, i) => ({ x: Math.cos(i / 16 * 2 * Math.PI), y: Math.sin(i / 16 * 2 * Math.PI) }));
  return {
    rng,
    input: { moveVector: () => heading, pressed: () => false },
    steer(run) {
      if (tick++ % DECIDE_EVERY) return;
      const p = run.player, step = p.speed * 0.6, near = [];
      let cx = 0, cy = 0;
      for (const e of run.enemies) {
        if (e.dead || Math.abs(e.x - p.x) > 220 || Math.abs(e.y - p.y) > 220) continue;
        near.push(e);
        if (Math.hypot(e.x - p.x, e.y - p.y) < 90) { cx += e.x; cy += e.y; }
      }
      const crowd = near.filter(e => Math.hypot(e.x - p.x, e.y - p.y) < 90).length;
      // kite: when pressed, bias to a tangent around the crowd's centroid (circle instead of running into a wall)
      const away = crowd ? norm(p.x - cx / crowd, p.y - cy / crowd) : null;
      if (rng.next() < 0.004) spin = -spin;
      let gem = null, gd = 200;
      for (const q of run.pickups) {
        if (q.kind === 'heart' && p.hp > p.maxHp * 0.8) continue;
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < (q.kind === 'chest' ? 260 : gd) && (!gem || q.kind === 'chest')) { gem = q; gd = d; }
      }
      const boss = run.boss && !run.boss.dead ? run.boss : null;
      let best = -Infinity, pick = dirs[0];
      for (const d of dirs) {
        const x = p.x + d.x * step, y = p.y + d.y * step;
        let s = -danger(x, y, near, run) * 3;
        if (x < 40 || y < 40 || x > WORLD_W - 40 || y > WORLD_H - 40) s -= 40;                // the forest wall
        s -= Math.max(0, 200 - Math.min(x, WORLD_W - x, y, WORLD_H - y)) / 200 * 14;            // soft push off the edges
        s -= (1 - terrainSpeed(x, y)) * 25;                                                    // river: slow, so a trap
        s -= Math.hypot(x - WORLD_W / 2, y - WORLD_H / 2) / 120;                               // prefer open ground in the middle
        if (away) s += (d.x * away.x + d.y * away.y) * 4 + (d.x * -away.y * spin + d.y * away.x * spin) * 3;
        if (boss && crowd < 4) s -= Math.abs(Math.hypot(boss.x - x, boss.y - y) - BOSS_RING) / 40 * 3;   // hunt the boss when the crowd is thin
        if (gem) s += (1 - Math.hypot(gem.x - x, gem.y - y) / (gd + step)) * (crowd > 2 ? 3 : gem.kind === 'chest' ? 14 : 10);
        s += (d.x * heading.x + d.y * heading.y) * 1.5;                                        // do not jitter
        if (s > best) { best = s; pick = d; }
      }
      heading = pick;
    },
  };
}
const norm = (x, y) => { const d = Math.hypot(x, y) || 1; return { x: x / d, y: y / d }; };

// ---- One run
function simulate(plan, seed, maxT) {
  for (const p of plan) if (!fusionFor(CLASSES.mage, p[0], p[1])) throw new Error(`unknown fusion pair "${p.join('+')}"`);
  const bot = makeBot(seed);
  let mr = createRng(seed + 99).next;   // visual fx use Math.random: seed it so runs reproduce
  Math.random = () => mr();
  const starter = plan.length ? plan[0][0] : bot.rng.pick(CLASSES.mage.skills);
  const run = createRun('mage', starter, seed);
  run.godMode = god;   // --god: cannot die, to read the xp pacing apart from survival
  const r = { seed, levels: {}, fusions: [], minHp: 1, minHpAt: 0, hpLow: {}, peak: 0 };
  let nextMark = 300, fusionCount = 0;
  for (let guard = 0; run.state === 'playing' || run.state === 'levelup'; guard++) {
    if (run.time >= maxT || guard > maxT * 60 * 3) { run.state = 'timeout'; break; }
    if (run.state === 'levelup') { chooseCard(run, pickCard(run, plan, bot.rng)); continue; }
    bot.steer(run);
    updateRun(run, DT, bot.input);
    if (run.build.fusions.length > fusionCount) r.fusions.push(Math.round(run.time)), fusionCount = run.build.fusions.length;
    const hp = run.player.hp / run.player.maxHp, m = Math.floor(run.time / 60);
    if (hp < r.minHp) { r.minHp = hp; r.minHpAt = run.time; }
    r.hpLow[m] = Math.min(r.hpLow[m] ?? 1, hp);
    if (run.enemies.length > r.peak) r.peak = run.enemies.length;
    if (trace && guard % 600 === 0) console.log(`  t${(run.time / 60).toFixed(1)}m hp ${run.player.hp.toFixed(0)}/${run.player.maxHp} lv${run.prog.level} alive ${run.enemies.length} kills ${run.kills}${run.boss && !run.boss.dead ? ` boss ${run.boss.type} ${run.boss.hp}/${run.boss.maxHp}` : ''} at ${run.player.x.toFixed(0)},${run.player.y.toFixed(0)} ${Object.entries(run.build.skills).map(([k, v]) => k + v)}`);
    if (run.time >= nextMark) { r.levels[nextMark / 60] = run.prog.level; nextMark += 300; }
  }
  r.killers = {};
  for (const e of run.enemies) if (Math.hypot(e.x - run.player.x, e.y - run.player.y) < 40) r.killers[e.type] = (r.killers[e.type] ?? 0) + 1;
  r.state = run.state; r.time = run.time; r.kills = run.kills; r.level = run.prog.level;
  r.skills = Object.entries(run.build.skills).map(([k, v]) => k + v).join(' ');
  return r;
}

// ---- CLI
const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i < 0 ? def : (process.argv[i + 1] ?? true); };
const seeds = +arg('seeds', 5), start = +arg('start', 1), maxT = +arg('max', 1500);
const nofuse = process.argv.includes('--nofuse'), verbose = process.argv.includes('--verbose'), trace = process.argv.includes('--trace'), god = process.argv.includes('--god');
const label = plan => plan.map(p => p.join('+')).join(',') || 'none';
const fmt = s => s == null ? '-' : (s / 60).toFixed(1);

function report(plan, brief) {
  const results = [];
  for (let i = 0; i < seeds; i++) {
    const r = simulate(plan, start + i, maxT);
    results.push(r);
    if (verbose) console.log(`seed ${r.seed}: ${r.state} @${fmt(r.time)}m lv${r.level} [L5m ${r.levels[5]} L10m ${r.levels[10]} L15m ${r.levels[15]} L20m ${r.levels[20]}] fusions@${r.fusions.map(fmt).join(',') || '-'}m minHp ${(Math.max(0, r.minHp) * 100).toFixed(0)}%@${fmt(r.minHpAt)}m kills ${r.kills} peak ${r.peak} | ${r.skills}${r.state === 'lost' ? ' | killers ' + JSON.stringify(r.killers) : ''}`);
  }
  const wins = results.filter(r => r.state === 'won').length, avg = f => results.reduce((s, r) => s + f(r), 0) / results.length;
  const lv = m => { const v = results.map(r => r.levels[m]).filter(Boolean); return v.length ? (v.reduce((a, b) => a + b) / v.length).toFixed(1) : '-'; };
  const fus = n => { const v = results.map(r => r.fusions[n]).filter(x => x != null); return v.length ? `${fmt(v.reduce((a, b) => a + b) / v.length)}m (${v.length}/${results.length})` : '-'; };
  const early = Math.min(...results.map(r => Math.min(...[0, 1].map(m => r.hpLow[m] ?? 1))));
  if (brief) { console.log(`plan ${label(plan)} | win ${wins}/${seeds} (${(wins / seeds * 100).toFixed(0)}%)`); return wins / seeds; }
  console.log(`plan ${label(plan)} | ${seeds} seeds | win ${wins}/${seeds} (${(wins / seeds * 100).toFixed(0)}%) | avg survival ${fmt(avg(r => r.time))}m`);
  console.log(`  level @5/10/15/20m: ${[5, 10, 15, 20].map(lv).join(' / ')} | fusion1 ${fus(0)} | fusion2 ${fus(1)} | fusion3 ${fus(2)}`);
  console.log(`  min hp ${(Math.max(0, Math.min(...results.map(r => r.minHp))) * 100).toFixed(0)}% (minutes 0-2: ${(Math.max(0, early) * 100).toFixed(0)}%) | avg kills ${avg(r => r.kills).toFixed(0)} | peak alive ${Math.max(...results.map(r => r.peak))}`);
}
// --plan "a+b,c+d|a+b|none": several plans in one go, separated by |; a plan is comma-separated pairs
const parse = str => str.split(',').filter(x => x && x !== 'none').map(x => x.split('+'));
// all perfect matchings of the skills (15 for 6): pair the first with each other, recurse on the rest
const matchings = ([a, ...r]) => !a ? [[]] : r.flatMap((b, i) => matchings(r.filter((_, j) => j !== i)).map(m => [[a, b], ...m]));
if (process.argv.includes('--partitions')) {
  const rates = new Map();   // fusion id -> win rates of the builds containing it
  for (const m of matchings(CLASSES.mage.skills)) {
    const w = report(m, true);
    for (const p of m) { const id = fusionFor(CLASSES.mage, p[0], p[1]).id; rates.set(id, [...(rates.get(id) ?? []), w]); }
  }
  const tab = [...rates].map(([id, v]) => [id, v.reduce((a, b) => a + b) / v.length]).sort((a, b) => b[1] - a[1]);
  for (const [id, w] of tab) console.log(`${id.padEnd(18)} ${(w * 100).toFixed(0)}%`);
  console.log(`weakest/strongest = ${tab[0][1] ? (tab.at(-1)[1] / tab[0][1]).toFixed(2) : "n/a (no wins)"}`);
} else for (const p of String(arg('plan', 'none')).split('|')) report(parse(p));
