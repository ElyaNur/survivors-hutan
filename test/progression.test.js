import { test } from 'node:test'; import assert from 'node:assert/strict';
import { createRng } from '../src/logic/rng.js';
import { CLASSES, PASSIVES } from '../src/data/classes.js';
import { xpToNext, gainXp, rollCards, applyCard, newlyUnlocked, recipeTags, passiveMods } from '../src/logic/progression.js';
const mage = CLASSES.mage;
const maxed = ids => Object.fromEntries(ids.map(i => [i, 5]));

test('xp curve', () => {
assert.equal(xpToNext(1), 5); assert.equal(xpToNext(2), 15); assert.equal(xpToNext(19), 185);
  assert.equal(xpToNext(20), 295); assert.equal(xpToNext(40), 2545);
});
test('gainXp handles multi-level and carries remainder', () => {
  const p = { level: 1, xp: 0 };
  assert.equal(gainXp(p, xpToNext(1) + xpToNext(2) + 1), 2);
  assert.deepEqual(p, { level: 3, xp: 1 });
});
test('rollCards never offers unowned skill with 4 owned', () => {
  const build = { skills: { fireball: 1, meteor: 2, iceShard: 3, frostNova: 4 }, passives: {}, ults: [] };
  for (let s = 0; s < 500; s++) for (const c of rollCards(build, mage, createRng(s)))
    if (c.kind === 'skill') assert.ok(build.skills[c.id], c.id);
});
test('rollCards: heal only when nothing eligible', () => {
  const build = { skills: maxed(mage.skills.slice(0, 4)), passives: maxed(PASSIVES.slice(0, 4)), ults: [] };
  assert.deepEqual(rollCards(build, mage, createRng(1)), [{ kind: 'heal' }]);
});
test('rollCards: exactly one eligible returns one card', () => {
  const build = { skills: maxed(mage.skills.slice(0, 4)), passives: maxed(PASSIVES.slice(0, 4)), ults: [] };
  build.skills.fireball = 4;
  assert.deepEqual(rollCards(build, mage, createRng(1)), [{ kind: 'skill', id: 'fireball', nextLevel: 5 }]);
});
test('rollCards: no repeated ids in one roll', () => {
  const build = { skills: { fireball: 1 }, passives: { focus: 2 }, ults: [] };
  for (let s = 0; s < 500; s++) {
    const cs = rollCards(build, mage, createRng(s));
    assert.equal(cs.length, 3);
    assert.equal(new Set(cs.map(c => c.id)).size, 3);
  }
});
test('recipes unlock once', () => {
  const build = { skills: { fireball: 5, meteor: 4 }, passives: {}, ults: [] };
  assert.deepEqual(newlyUnlocked(build, mage), []);
  applyCard(build, { kind: 'skill', id: 'meteor', nextLevel: 5 });
  assert.deepEqual(newlyUnlocked(build, mage), ['armageddon']);
  build.ults.push('armageddon');
  assert.deepEqual(newlyUnlocked(build, mage), []);
});
test('applyCard: passive sets level, heal is a no-op', () => {
  const build = { skills: {}, passives: {}, ults: [] };
  applyCard(build, { kind: 'passive', id: 'focus', nextLevel: 1 });
  applyCard(build, { kind: 'heal' });
  assert.deepEqual(build, { skills: {}, passives: { focus: 1 }, ults: [] });
});
test('recipeTags', () => assert.deepEqual(recipeTags(mage, 'fireball'), ['armageddon']));
test('passiveMods', () => {
  assert.ok(Math.abs(passiveMods({ passives: { focus: 2 } }).cooldown - 0.88) < 1e-9);
  const m = passiveMods({ passives: { vitality: 2, swiftness: 1 } });
  assert.equal(m.maxHp, 40); assert.ok(Math.abs(m.speed - 1.08) < 1e-9); assert.equal(m.xp, 1);
  assert.deepEqual(passiveMods({ passives: {} }), { maxHp: 0, speed: 1, cooldown: 1, magnet: 1, xp: 1, area: 1 });
});
