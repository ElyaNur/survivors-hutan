import { test } from 'node:test'; import assert from 'node:assert/strict';
import { hitEnemy, hurtPlayer, speedFactor } from '../src/logic/combat.js';
test('hitEnemy deals damage', () => {
  const e = { hp: 10 };
  assert.deepEqual(hitEnemy(e, 4, 0), { dealt: 4, killed: false });
  assert.equal(e.hp, 6);
});
test('vulnerable doubles damage', () => {
  assert.equal(hitEnemy({ hp: 10, vulnerableUntil: 5 }, 4, 1).dealt, 8);
});
test('kill reported once', () => {
  const e = { hp: 3 };
  assert.equal(hitEnemy(e, 5, 0).killed, true);
  assert.equal(hitEnemy(e, 5, 0).killed, false);
});
test('hurtPlayer respects iframes', () => {
  const p = { hp: 100, iframesUntil: 0 };
  assert.equal(hurtPlayer(p, 10, 1), true);
  assert.equal(hurtPlayer(p, 10, 1.3), false);
  assert.equal(p.hp, 90);
});
test('speedFactor', () => {
  assert.equal(speedFactor({ frozenUntil: 2 }, 1), 0);
  assert.equal(speedFactor({ slowUntil: 2, slowAmt: 0.3 }, 1), 0.7);
  assert.equal(speedFactor({}, 1), 1);
});
