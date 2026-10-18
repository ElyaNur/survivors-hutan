import { test } from 'node:test'; import assert from 'node:assert/strict';
import { createRng } from '../src/logic/rng.js';
import TUNING from '../src/data/tuning.js';
import { CLASSES, PASSIVES, NAMES } from '../src/data/classes.js';
import { xpToNext, gainXp, rollCards, applyCard, fusionFor, eligibleFusions, consumedSkills, passiveMods } from '../src/logic/progression.js';
const mage = CLASSES.mage;
const maxed = ids => Object.fromEntries(ids.map(i => [i, 5]));

test('xp curve', () => {
assert.equal(xpToNext(1), 5); assert.equal(xpToNext(2), 15); assert.equal(xpToNext(19), 185);
  assert.equal(xpToNext(20), 255); assert.equal(xpToNext(40), 1745);
});
test('gainXp handles multi-level and carries remainder', () => {
  const p = { level: 1, xp: 0 };
  assert.equal(gainXp(p, xpToNext(1) + xpToNext(2) + 1), 2);
  assert.deepEqual(p, { level: 3, xp: 1 });
});
test('rollCards never offers unowned skill with 4 owned', () => {
  const build = { skills: { fireball: 1, meteor: 2, iceShard: 3, frostNova: 4 }, passives: {}, fusions: [] };
  for (let s = 0; s < 500; s++) for (const c of rollCards(build, mage, createRng(s)))
    if (c.kind === 'skill') assert.ok(build.skills[c.id], c.id);
});
test('rollCards: heal only when nothing eligible', () => {
  const build = { skills: {}, passives: maxed(PASSIVES.slice(0, 4)), fusions: ['hujanNeraka', 'absoluteZero', 'badaiPetir'] };
  assert.deepEqual(rollCards(build, mage, createRng(1)), [{ kind: 'heal' }]);
});
test('rollCards: exactly one eligible returns one card', () => {
  const build = { skills: { fireball: 4, meteor: 5 }, passives: maxed(PASSIVES.slice(0, 4)), fusions: ['absoluteZero', 'badaiPetir'] };
  assert.deepEqual(rollCards(build, mage, createRng(1)), [{ kind: 'skill', id: 'fireball', nextLevel: 5 }]);
});
test('rollCards: no repeated ids in one roll', () => {
  const build = { skills: { fireball: 1 }, passives: { focus: 2 }, fusions: [] };
  for (let s = 0; s < 500; s++) {
    const cs = rollCards(build, mage, createRng(s));
    assert.equal(cs.length, 3);
    assert.equal(new Set(cs.map(c => c.id)).size, 3);
  }
});
test('applyCard: passive sets level, heal is a no-op', () => {
  const build = { skills: {}, passives: {}, fusions: [] };
  applyCard(build, { kind: 'passive', id: 'focus', nextLevel: 1 });
  applyCard(build, { kind: 'heal' });
  assert.deepEqual(build, { skills: {}, passives: { focus: 1 }, fusions: [] });
});
test('fusionFor is order-insensitive; all 15 pairs covered, named', () => {
  assert.equal(fusionFor(mage, 'meteor', 'arcaneOrb').id, 'lubangHitam');
  assert.equal(fusionFor(mage, 'arcaneOrb', 'meteor').id, 'lubangHitam');
  assert.equal(mage.fusions.length, 15);
  const seen = new Set();
  for (const x of mage.skills) for (const y of mage.skills) if (x < y) seen.add(fusionFor(mage, x, y).id);
  assert.equal(seen.size, 15);
  for (const f of mage.fusions) assert.ok(NAMES[f.id].name && NAMES[f.id].desc, f.id);
  assert.equal(NAMES.armageddon, undefined);
});
test('eligibleFusions needs both skills at level 5', () => {
  const b = skills => ({ skills, passives: {}, fusions: [] });
  assert.deepEqual(eligibleFusions(b({ fireball: 5, meteor: 5, iceShard: 4 }), mage).map(c => c.id), ['hujanNeraka']);
  assert.equal(eligibleFusions(b({ fireball: 5, meteor: 5, iceShard: 5 }), mage).length, 3);
  assert.deepEqual(eligibleFusions(b({ fireball: 5, meteor: 5 }), mage)[0], { kind: 'fusion', id: 'hujanNeraka', a: 'fireball', b: 'meteor' });
});
test('rollCards: guaranteed fusion card, at varying positions', () => {
  const idx = new Set();
  for (let s = 0; s < 500; s++) {
    const cs = rollCards({ skills: { fireball: 5, meteor: 5 }, passives: {}, fusions: [] }, mage, createRng(s));
    const i = cs.findIndex(c => c.kind === 'fusion');
    assert.ok(i >= 0, 'seed ' + s); idx.add(i);
  }
  assert.ok(idx.size > 1);
});
test('applyCard fusion consumes ingredients', () => {
  const build = { skills: { fireball: 5, meteor: 5, iceShard: 2 }, passives: {}, fusions: [] };
  applyCard(build, { kind: 'fusion', id: 'hujanNeraka', a: 'fireball', b: 'meteor' });
  assert.deepEqual(build.skills, { iceShard: 2 }); assert.deepEqual(build.fusions, ['hujanNeraka']);
  assert.deepEqual([...consumedSkills(build, mage)].sort(), ['fireball', 'meteor']);
});
test('fusion occupies a slot; consumed skills never return', () => {
  const full = { skills: { iceShard: 2, frostNova: 1, chainLightning: 1 }, passives: {}, fusions: ['hujanNeraka'] };
  for (let s = 0; s < 500; s++) for (const c of rollCards(full, mage, createRng(s)))
    if (c.kind === 'skill') assert.ok(full.skills[c.id], c.id);
  const free = { skills: { iceShard: 2 }, passives: {}, fusions: ['hujanNeraka'] };
  for (let s = 0; s < 500; s++) for (const c of rollCards(free, mage, createRng(s)))
    assert.ok(c.id !== 'fireball' && c.id !== 'meteor', c.id);
});
test('chest sequence: fuse then roll again', () => {
  const build = { skills: { fireball: 5, meteor: 5 }, passives: {}, fusions: [] };
  const card = rollCards(build, mage, createRng(3)).find(c => c.kind === 'fusion');
  applyCard(build, card);
  for (let s = 0; s < 200; s++) for (const c of rollCards(build, mage, createRng(s)))
    assert.ok(!['fireball', 'meteor', 'hujanNeraka'].includes(c.id), c.id);
});
test('passiveMods', () => {
  assert.ok(Math.abs(passiveMods({ passives: { focus: 2 } }).cooldown - 0.88) < 1e-9);
  const m = passiveMods({ passives: { vitality: 2, swiftness: 1 } });
  assert.equal(m.maxHp, 40); assert.ok(Math.abs(m.speed - 1.08) < 1e-9); assert.equal(m.xp, 1);
  assert.deepEqual(passiveMods({ passives: {} }), { maxHp: 0, speed: 1, cooldown: 1, magnet: 1, xp: 1, area: 1 });
});
test('rollCards: a held skill\'s next level is drawn heldSkillWeight x as often as another card', () => {
  const build = { skills: { fireball: 2 }, passives: {}, fusions: [] }, n = {};
  for (let s = 0; s < 4000; s++) for (const c of rollCards(build, mage, createRng(s))) n[c.id] = (n[c.id] ?? 0) + 1;
  const w = TUNING.cards.heldSkillWeight, k = n.fireball / ((n.meteor + n.focus) / 2);   // vs a new skill and a passive (weight 1)
  assert.ok(w > 1.5 && Math.abs(k - w) < 0.6 * (w - 1), `held x${k.toFixed(2)}, want about x${w}`);
});
