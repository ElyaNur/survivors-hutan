import { test } from 'node:test'; import assert from 'node:assert/strict';
import TUNING from '../src/data/tuning.js';
import { passiveMods, xpToNext } from '../src/logic/progression.js';
import { dropGem, dropHeart, dropMagnet, dropChest, updatePickups } from '../src/game/pickups.js';
import { createRun, updateRun, chooseCard } from '../src/game/run.js';

const newRun = () => createRun('mage', 'fireball', 1);
const gems = run => run.pickups.filter(q => q.kind === 'gem');
const noInput = { pressed: () => false, moveVector: () => ({ x: 0, y: 0 }) };

test('gem pickup gains xp scaled by mods.xp and counts every level', () => {
  const run = newRun(), p = run.player;
  run.mods = passiveMods({ passives: { wisdom: 5 } });          // xp x1.5
  dropGem(run, p.x, p.y, (xpToNext(1) + xpToNext(2) + 1) / 1.5);   // level 1 -> 3, 1 left over after the x1.5
  updatePickups(run, 0.016);
  assert.equal(run.pickups.length, 0);
  assert.equal(run.prog.level, 3);
  assert.ok(Math.abs(run.prog.xp - 1) < 1e-9);
  assert.equal(run.pendingLevelUps, 2);
});

test('magnet radius pulls nearby pickups only; magnet item pulls every gem', () => {
  const run = newRun(), p = run.player;
  dropGem(run, p.x + 20, p.y, 1); dropGem(run, p.x + 200, p.y, 1);
  updatePickups(run, 0.1);
  const [near, far] = run.pickups;
  assert.ok(near.x < p.x + 20, 'near gem pulled');
  assert.equal(far.x, p.x + 200, 'far gem untouched');
  dropMagnet(run, p.x, p.y);
  updatePickups(run, 0.1);
  assert.ok(far.x < p.x + 200, 'far gem pulled after magnet');
});

test('heart heals capped at maxHp; chest adds its levels', () => {
  const run = newRun(), p = run.player;
  p.hp = p.maxHp - 10; dropHeart(run, p.x, p.y); dropChest(run, p.x, p.y, 3);
  updatePickups(run, 0.016);
  assert.equal(p.hp, p.maxHp);
  assert.equal(run.pendingLevelUps, 3);
});

test('gem merge keeps count bounded and total xp', () => {
  const run = newRun(), p = run.player, max = TUNING.drops.maxGems;
  let total = 0;
  for (let i = 0; i < max + 50; i++) { const xp = 1 + (i % 4); total += xp; dropGem(run, p.x + 100 + i, p.y, xp); }
  assert.equal(gems(run).length, max);
  assert.equal(gems(run).reduce((s, g) => s + g.xp, 0), total);
  assert.ok(Math.max(...gems(run).map(g => g.x)) < p.x + 100 + max + 50 - 1, 'farthest gems were merged away');
});

test('pending level-ups switch to levelup with a card roll', () => {
  const run = newRun();
  run.pendingLevelUps = 2;
  const t = run.time;
  updateRun(run, 0.016, noInput);
  assert.equal(run.state, 'levelup');
  assert.ok(run.cards.length >= 1);
  assert.equal(run.time, t, 'world paused');
});

test('chooseCard decrements, re-rolls while pending, and a fusion card fuses once', () => {
  const run = newRun();
  run.build.skills = { fireball: 5, meteor: 5 };
  run.pendingLevelUps = 2; run.state = 'levelup';
  chooseCard(run, { kind: 'fusion', id: 'hujanNeraka', a: 'fireball', b: 'meteor' });
  assert.deepEqual(run.build.fusions, ['hujanNeraka']);
  assert.deepEqual(run.build.skills, {});
  assert.deepEqual(run.newFusions, [{ id: 'hujanNeraka', first: true }]);
  assert.equal(run.pendingLevelUps, 1);
  assert.equal(run.state, 'levelup');
  assert.ok(run.cards.length >= 1);
  assert.ok(run.cards.every(c => c.kind !== 'fusion'), 'the ingredients are gone: no fusion card left');
  chooseCard(run, { kind: 'heal' });
  assert.equal(run.pendingLevelUps, 0);
  assert.equal(run.state, 'playing');
});

test('chooseCard applies passives and heals', () => {
  const run = newRun(), p = run.player;
  run.pendingLevelUps = 3; p.hp = 50;
  chooseCard(run, { kind: 'passive', id: 'vitality', nextLevel: 1 });
  assert.equal(p.maxHp, TUNING.player.hp + 20);
  assert.equal(p.hp, 70);
  chooseCard(run, { kind: 'passive', id: 'swiftness', nextLevel: 1 });
  assert.equal(p.speed, TUNING.player.speed * 1.08);
  chooseCard(run, { kind: 'heal' });
  assert.equal(p.hp, 70 + TUNING.healCard);
  p.hp = p.maxHp - 5; run.pendingLevelUps = 1;
  chooseCard(run, { kind: 'heal' });
  assert.equal(p.hp, p.maxHp);
});

test('R13: chest levels also raise the level number; xp unchanged', () => {
  const run = newRun(), p = run.player;
  run.prog.xp = 3;
  dropChest(run, p.x, p.y, 2);
  updatePickups(run, 0.016);
  assert.deepEqual(run.prog, { level: 3, xp: 3 });
  assert.equal(run.pendingLevelUps, 2);
});
