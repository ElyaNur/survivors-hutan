import { test } from 'node:test'; import assert from 'node:assert/strict';
import { stat, densestPoint } from '../src/game/skills/index.js';

test('stat reads arrays, {base, perLv} and plain numbers', () => {
  assert.equal(stat('fireball', 'count', 3), 2);
  assert.ok(Math.abs(stat('frostNova', 'cd', 5) - 2.8) < 1e-9);
  assert.equal(stat('arcaneOrb', 'orbs', 5), 6);
  assert.equal(stat('fireball', 'cd', 4), 1.2);
});

const at = (x, y) => ({ x, y, dead: false });
const view = { x: 0, y: 0, w: 480, h: 480 };

test('densestPoint finds the cluster', () => {
  const run = { player: { x: 50, y: 50 }, enemies: [at(100, 100), ...[0, 1, 2, 3, 4].map(i => at(298 + i, 300 + i))] };
  const q = densestPoint(run, view);
  assert.ok(Math.hypot(q.x - 300, q.y - 300) < 32, JSON.stringify(q));
});

test('densestPoint on an empty view returns the player position', () => {
  const run = { player: { x: 50, y: 60 }, enemies: [at(1000, 1000)] };
  assert.deepEqual({ ...densestPoint(run, view) }, { x: 50, y: 60 });
});

import { createRun } from '../src/game/run.js';
import { spawnEnemy } from '../src/game/enemies.js';
import { spawnProjectile, spawnArea, updateProjectiles } from '../src/game/projectiles.js';
const quietFx = { number() {}, anim() {}, burst() {}, hitstop() {}, flashScreen() {}, shake() {} };

test('projectiles: pierce caps hits, never the same enemy twice; hostile shots hurt the mage', () => {
  const run = createRun('mage', 'fireball', 1); run.fx = quietFx;
  const p = run.player, es = [0, 1, 2].map(i => spawnEnemy(run, 'orc', p.x + 40 + i, p.y));
  for (const e of es) run.grid.insert(e);
  spawnProjectile(run, { x: p.x + 40, y: p.y, vx: 1, vy: 0, dmg: 5, radius: 3, pierce: 2, life: 1, sprite: 's' });
  for (let i = 0; i < 5; i++) updateProjectiles(run, 0.01);
  assert.equal(es.filter(e => e.hp < e.maxHp).length, 2);
  assert.equal(run.projectiles.length, 0);
  const hp = p.hp;
  spawnProjectile(run, { x: p.x, y: p.y, vx: 0, vy: 0, dmg: 7, radius: 3, life: 1, sprite: 's', hostile: true });
  updateProjectiles(run, 0.01);
  assert.equal(p.hp, hp - 7);
});

test('areas: trigger after delay, then tick for dur, then go away', () => {
  const run = createRun('mage', 'fireball', 1); run.fx = quietFx;
  const p = run.player, e = spawnEnemy(run, 'orc', p.x + 100, p.y); run.grid.insert(e);
  spawnArea(run, { x: e.x, y: e.y, r: 10, dmg: 1, delay: 0.5, dur: 1, tickEvery: 0.5, freeze: 2 });
  updateProjectiles(run, 0.4); assert.equal(e.hp, e.maxHp);
  updateProjectiles(run, 0.2); assert.equal(e.hp, e.maxHp - 1); assert.ok(e.frozenUntil > run.time);
  for (let i = 0; i < 20; i++) updateProjectiles(run, 0.1);
  assert.equal(e.hp, e.maxHp - 3); assert.equal(run.areas.length, 0);
});
