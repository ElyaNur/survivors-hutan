import { test } from 'node:test'; import assert from 'node:assert/strict';
import TUNING from '../src/data/tuning.js';
import { createRun, updateRun } from '../src/game/run.js';
import { spawnEnemy, damageEnemy, updateEnemies } from '../src/game/enemies.js';
import { updateProjectiles } from '../src/game/projectiles.js';
import { createRng } from '../src/logic/rng.js';
import { createSpawner, spawnerUpdate } from '../src/logic/spawner.js';

const T = TUNING.enemies;
const noInput = { pressed: () => false, moveVector: () => ({ x: 0, y: 0 }) };
const setup = (type, dx = 100) => {
  const run = createRun('mage', 'fireball', 1), p = run.player;
  return { run, p, e: spawnEnemy(run, type, p.x + dx, p.y) };
};
const sum = (run, kind, k) => run.pickups.filter(q => q.kind === kind).reduce((s, q) => s + q[k], 0);

test('kingSlime: dies into 8 slimes, a 1-level chest and gems worth its 40 xp', () => {
  const { run, e } = setup('kingSlime');
  damageEnemy(run, e, 1e6);
  const slimes = run.enemies.filter(o => !o.dead && o.type === T.kingSlime.splitInto);
  assert.equal(slimes.length, T.kingSlime.splitCount);
  assert.ok(slimes.every(s => Math.hypot(s.x - e.x, s.y - e.y) <= e.r));          // around where it burst
  assert.equal(sum(run, 'chest', 'levels'), 1);
  assert.equal(run.pickups.filter(q => q.kind === 'chest').length, 1);
  assert.equal(sum(run, 'gem', 'xp'), T.kingSlime.xp);
});

test('orcChief: a 2-level chest and 60 xp of gems; the treant drops nothing', () => {
  const { run, e } = setup('orcChief');
  damageEnemy(run, e, 1e6);
  assert.equal(sum(run, 'chest', 'levels'), 2);
  assert.equal(sum(run, 'gem', 'xp'), T.orcChief.xp);
  const b = setup('treant');
  damageEnemy(b.run, b.e, 1e6);
  assert.equal(b.run.pickups.length, 0);
});

test('orcChief: walk -> windup (stands, locked on the player) -> charge (fast, straight) -> walk', () => {
  const { run, p, e } = setup('orcChief'), def = T.orcChief, dt = 1 / 60;
  assert.equal(e.state, 'walk');
  run.time = e.nextAt; updateEnemies(run, dt);
  assert.equal(e.state, 'windup');
  const x0 = e.x, y0 = e.y;
  assert.ok(e.dirX < -0.99);                                                      // aimed at the mage (to his left)
  p.y += 40;                                                                      // the mage steps aside...
  run.time += def.chargeWindup / 2; updateEnemies(run, dt);
  assert.equal(e.state, 'windup'); assert.equal(e.x, x0); assert.equal(e.y, y0);  // ...he holds still, aim kept
  run.time = e.stateUntil; updateEnemies(run, dt);
  assert.equal(e.state, 'charge');
  const x1 = e.x, y1 = e.y;
  updateEnemies(run, 0.1);
  assert.ok(x1 - e.x > def.speed * 0.1 * 2, 'charges much faster than he walks');
  assert.ok(Math.abs(e.y - y1) < 1e-9, 'in a straight line, not after the mage');
  run.time = e.stateUntil; updateEnemies(run, dt);
  assert.equal(e.state, 'walk');
  assert.ok(e.nextAt > run.time);
});

test('orcChief: no windup while he is too far away to be seen', () => {
  const { run, e } = setup('orcChief');
  e.x = run.player.x + T.orcChief.chargeRange + 50;
  run.time = e.nextAt; updateEnemies(run, 1 / 60);
  assert.equal(e.state, 'walk');
});

test('treant: roots warn under the mage and hurt only after rootWarn; goblins come on the summon beat', () => {
  const { run, p, e } = setup('treant', 150), def = T.treant;
  const hp0 = p.hp, px = p.x, py = p.y;
  run.time = e.nextAt; updateEnemies(run, 1 / 60);
  const roots = run.areas.find(a => a.hostile);
  assert.ok(roots, 'a warning area was placed');
  assert.equal(roots.x, px); assert.equal(roots.y, py); assert.equal(roots.r, def.rootR);
  assert.equal(roots.warnSprite, 'roots_warn'); assert.equal(roots.sprite, 'roots_hit');
  updateProjectiles(run, def.rootWarn - 0.05);
  assert.equal(p.hp, hp0, 'no damage during the warning');
  updateProjectiles(run, 0.1);
  assert.equal(p.hp, hp0 - def.rootDmg);
  run.time += 5; updateProjectiles(run, 1);                                       // no second bite from the same roots
  assert.equal(p.hp, hp0 - def.rootDmg);
  const n = run.enemies.length;
  run.time = e.summonAt; updateEnemies(run, 1 / 60);
  assert.equal(run.enemies.filter(o => o.type === def.summonType).length, def.summonCount);
  assert.equal(run.enemies.length, n + def.summonCount);
});

test('treant: roots placed away from the mage miss him', () => {
  const { run, p, e } = setup('treant', 150);
  run.time = e.nextAt; updateEnemies(run, 1 / 60);
  p.x += T.treant.rootR + 20;                                                    // dodged
  const hp0 = p.hp;
  updateProjectiles(run, T.treant.rootWarn + 0.1);
  assert.equal(p.hp, hp0);
});

test('treant death: bossDead at once, run.state "won" 2 s later; the clock stops, the mage cannot be hurt', () => {
  const { run, p, e } = setup('treant', 150);
  run.time = 1234;
  damageEnemy(run, e, 1e6);
  assert.equal(run.bossDead, true); assert.equal(run.endAt, 1234); assert.equal(run.state, 'playing');
  for (let i = 0; i < 3; i++) updateRun(run, 0.5, noInput);
  assert.equal(run.state, 'playing');
  const hp0 = p.hp; spawnEnemy(run, 'orc', p.x, p.y); updateRun(run, 0.25, noInput);
  assert.equal(p.hp, hp0, 'no damage after the win');
  updateRun(run, 0.25, noInput);
  assert.equal(run.state, 'won');
  assert.equal(run.endAt, 1234);
});

test('hp <= 0: 1.5 s death, then run.state "lost"; level-ups wait forever', () => {
  const run = createRun('mage', 'fireball', 1);
  run.player.hp = 0; run.pendingLevelUps = 1;
  updateRun(run, 0.5, noInput);
  assert.equal(run.state, 'playing'); assert.ok(run.endAt !== null);
  const t0 = run.time;
  updateRun(run, 0.5, noInput); updateRun(run, 0.5, noInput);
  assert.equal(run.state, 'playing');
  updateRun(run, 0.5, noInput);
  assert.equal(run.state, 'lost');
  assert.equal(run.endAt, t0);
});

test('after the treant spawns, regular waves keep the minute-19 mix at half rate', () => {
  const count = (from) => {
    const sp = createSpawner(), rng = createRng(7), view = { x: 400, y: 400, w: 480, h: 270 }, types = {};
    sp.bi = 99; sp.ei = 99;                                                       // waves only
    let n = 0;
    for (let t = from; t < from + 59.95; t += 0.1) for (const s of spawnerUpdate(sp, t, 0.1, view, { w: 3000, h: 3000 }, rng, 0)) { n++; types[s.type] = 1; }
    return { n, types: Object.keys(types).sort().join() };
  };
  const before = count(1140), after = count(1200);
  assert.equal(after.types, before.types);
  const ratio = after.n / before.n;
  assert.ok(ratio > 0.4 && ratio < 0.6, `ratio ${ratio}`);
});

test('chest pickup plays chest_open and holds the level-up cards until it has opened', () => {
  const run = createRun('mage', 'fireball', 1), p = run.player, anims = [];
  const anim = run.fx.anim; run.fx.anim = (x, y, name, o) => { anims.push(name); anim(x, y, name, o); };
  run.pickups.push({ kind: 'chest', x: p.x, y: p.y, xp: 0, levels: 1, pulled: false, t0: 0 });
  updateRun(run, 1 / 60, noInput);
  assert.ok(anims.includes('chest_open'));
  assert.equal(run.pendingLevelUps, 1); assert.equal(run.state, 'playing');
  for (let i = 0; i < 60 && run.state === 'playing'; i++) updateRun(run, 1 / 60, noInput);
  assert.equal(run.state, 'levelup');
});

test('chests are never magnetised: one inside the magnet radius stays put until touched', () => {
  const run = createRun('mage', 'fireball', 1), p = run.player;
  const c = { kind: 'chest', x: p.x + TUNING.drops.chestReach + 4, y: p.y, xp: 0, levels: 1, pulled: false, t0: 0 };
  run.pickups.push(c);
  updateRun(run, 0.1, noInput);
  assert.equal(c.x, p.x + TUNING.drops.chestReach + 4); assert.equal(run.pendingLevelUps, 0);
  c.x = p.x + TUNING.drops.chestReach - 2;
  updateRun(run, 0.1, noInput);
  assert.equal(run.pendingLevelUps, 1);
});
