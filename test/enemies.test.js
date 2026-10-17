import { test } from 'node:test'; import assert from 'node:assert/strict';
import TUNING from '../src/data/tuning.js';
import { createRun, updateRun } from '../src/game/run.js';
import { spawnEnemy, damageEnemy, updateEnemies } from '../src/game/enemies.js';
import { blinkHidden } from '../src/game/player.js';

const stubFx = () => {
  const log = [];
  const rec = k => (...a) => log.push([k, ...a]);
  return { log, number: rec('number'), anim: rec('anim'), burst: rec('burst'), hitstop: rec('hitstop'), flashScreen: rec('flash'), shake: rec('shake'),
    update() {}, frozen: () => false, offset: () => ({ x: 0, y: 0 }) };
};
const setup = type => {
  const run = createRun('mage', 'fireball', 1); run.fx = stubFx();
  const p = run.player, e = spawnEnemy(run, type, p.x + 50, p.y);
  return { run, p, e, log: run.fx.log };
};
const noInput = { pressed: () => false, moveVector: () => ({ x: 0, y: 0 }) };

test('damageEnemy: non-lethal hit flashes, shoves away from the player and prints the number', () => {
  const { run, p, e, log } = setup('slime');
  const x0 = e.x, hp0 = e.hp;
  const hit = damageEnemy(run, e, 2);
  assert.equal(hit.killed, false); assert.equal(e.hp, hp0 - 2);
  assert.ok(e.flashUntil > run.time);
  assert.equal(e.x - x0, TUNING.fx.knockback);                 // shoved directly away (player is to the left)
  assert.deepEqual(log.map(l => l[0]), ['number']);
  assert.equal(log[0][3], 2); assert.equal(log[0][4], 'w');
});
test('damageEnemy: knockback power and source come from opts; big hits print yellow', () => {
  const { run, p, e, log } = setup('orc');
  const y0 = e.y;
  damageEnemy(run, e, TUNING.fx.bigHit, { fromX: e.x, fromY: e.y + 10, power: 7 });
  assert.equal(e.y - y0, -7);
  assert.equal(log[0][4], 'y');
});
test('damageEnemy: kill drops a gem, counts a kill, fires poof + burst; the corpse is swept next update', () => {
  const { run, e, log } = setup('slime');
  const hit = damageEnemy(run, e, 999);
  assert.equal(hit.killed, true);
  assert.equal(run.kills, 1);
  assert.equal(run.pickups.filter(q => q.kind === 'gem').length, 1);
  assert.deepEqual(log.map(l => l[0]).sort(), ['anim', 'burst', 'number']);
  assert.equal(log.find(l => l[0] === 'anim')[3], 'fx_poof');
  assert.equal(log.find(l => l[0] === 'burst')[3], TUNING.fx.deathColor.slime);
  assert.equal(run.enemies.length, 1);                          // still listed, flagged dead
  updateEnemies(run, 1 / 60);
  assert.equal(run.enemies.length, 0);
  assert.equal(run.kills, 1);                                   // the sweep does not double count
});
test('damageEnemy: a dead enemy takes no further damage; a boss kill hitstops', () => {
  const { run, e, log } = setup('slime');
  damageEnemy(run, e, 999);
  const n = log.length;
  assert.equal(damageEnemy(run, e, 5), null);
  assert.equal(log.length, n); assert.equal(run.kills, 1);
  const b = spawnEnemy(run, 'kingSlime', 0, 0);
  damageEnemy(run, b, 1e6);
  assert.ok(log.some(l => l[0] === 'hitstop' && l[1] === TUNING.fx.hitstopBig));
  assert.equal(run.pickups.filter(q => q.kind === 'gem').length, 1);   // bosses drop no gem
});
test('contact hurt flashes the screen red once per iframe window', () => {
  const { run, p, e, log } = setup('slime');
  e.x = p.x; e.y = p.y;
  updateEnemies(run, 1 / 60); updateEnemies(run, 1 / 60);
  assert.equal(log.filter(l => l[0] === 'flash').length, 1);
  assert.equal(log.find(l => l[0] === 'flash')[1], TUNING.fx.flashHurt.color);
  assert.equal(p.hp, TUNING.player.hp - TUNING.enemies.slime.dmg);
});
test('hitstop: the world holds still but fx keep ticking and time does not advance', () => {
  const run = createRun('mage', 'fireball', 1), t0 = run.time;
  run.fx.hitstop(0.05);
  updateRun(run, 1 / 60, noInput);
  assert.equal(run.time, t0); assert.equal(run.fx.frozen(), true);
  for (let i = 0; i < 4; i++) updateRun(run, 1 / 60, noInput);
  assert.equal(run.fx.frozen(), false);
  const t1 = run.time; updateRun(run, 1 / 60, noInput);
  assert.ok(run.time > t1);
});
test('blinkHidden toggles every blink period only while iframes last', () => {
  const p = { iframesUntil: 1 }, b = TUNING.fx.blink;
  assert.equal(blinkHidden(p, 0.5 * b), false);
  assert.equal(blinkHidden(p, 1.5 * b), true);
  assert.equal(blinkHidden(p, 2.5 * b), false);
  assert.equal(blinkHidden(p, 1.5 * b + 1), false);              // iframes over: always drawn
});

test('damageEnemy: small-hit numbers are rate-limited under mass hits; big hits always print', () => {
  const { run, p, log } = setup('slime');
  const N = TUNING.fx.numberBudget;
  for (let i = 0; i < 100; i++) damageEnemy(run, spawnEnemy(run, 'orc', p.x + 50, p.y), 1);   // 100 small hits, one step
  const small = log.filter(l => l[0] === 'number').length;
  assert.ok(small >= 1 && small <= N.burst, `small ${small}`);
  damageEnemy(run, spawnEnemy(run, 'orc', p.x + 50, p.y), TUNING.fx.bigHit);
  assert.equal(log.filter(l => l[0] === 'number').length, small + 1);              // big hit ignores the budget
  run.time += 1;                                                                     // budget refills over time
  damageEnemy(run, spawnEnemy(run, 'orc', p.x + 50, p.y), 1);
  assert.equal(log.filter(l => l[0] === 'number').length, small + 2);
});
